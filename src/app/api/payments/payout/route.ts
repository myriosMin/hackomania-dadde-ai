/**
 * POST /api/payments/payout
 *
 * Step 3b — Payout Flow (Outbound) — Phase 1: Initiate
 *
 * Initiates an approved payout from the community fund to a receiver's wallet.
 * Because the Interledger test wallet requires interactive (human-approved)
 * grants for ALL outgoing payments — even for the platform's own collector
 * wallet — this route cannot complete the payment directly. Instead it:
 *
 *   1. Validates the request & checks fund balance.
 *   2. Creates the receiver's incoming payment and a quote.
 *   3. Requests an interactive outgoing-payment grant from the collector's
 *      auth server.
 *   4. Returns the IDP redirect URL for the admin/collector to approve.
 *   5. On approval the IDP calls GET /api/payments/callback which completes
 *      the payment via `completePayout`.
 *
 * This MUST only be called from the admin approval flow after a Collector
 * has reviewed and approved the claim in the admin dashboard.
 *
 * Request body:
 * {
 *   claimId:               string,   // UUID of the claim
 *   receiverWalletAddress: string,   // receiver's ILP wallet URL
 *   amount:                string,   // payout amount in base units (receiver currency)
 *   assetCode:             string,   // hint — actual currency resolved from wallet
 *   assetScale:            number,   // hint — actual scale resolved from wallet
 *   redirectUrl?:          string,   // where to send the admin after IDP approval
 *   disasterEventId?:      string
 * }
 *
 * Success response (200):
 * {
 *   redirectUrl:   string,   // IDP consent URL — redirect the admin here
 *   continueToken: string,
 *   continueUri:   string
 * }
 *
 * Error responses:
 *   400 — validation error
 *   402 — insufficient funds
 *   502 — payout initiation failed
 *   503 — Open Payments not configured
 */

import { NextRequest, NextResponse } from "next/server";
import { initiatePayout } from "@/lib/open-payments";
import { chWrite, chQuery } from "@/lib/clickhouse";

export const runtime = "nodejs";

interface FundBalance {
  available: number;
}

/**
 * Fetch available fund balance from ClickHouse.
 */
async function getFundBalance(): Promise<number> {
  try {
    const rows = await chQuery<FundBalance>(`
      SELECT
        (SUM(CASE WHEN type = 'CONTRIBUTION' AND status = 'COMPLETED' THEN amount ELSE 0 END) -
         SUM(CASE WHEN type = 'PAYOUT'       AND status = 'COMPLETED' THEN amount ELSE 0 END)
        ) AS available
      FROM transactions
    `);
    return rows[0]?.available ?? 0;
  } catch (err) {
    console.error("[Payout] Failed to read fund balance:", err);
    return 0;
  }
}

export async function POST(req: NextRequest) {
  // ── Parse & Validate ──────────────────────────────────────────────────────
  let body: {
    claimId?: string;
    receiverWalletAddress?: string;
    amount?: string;
    assetCode?: string;
    assetScale?: number;
    redirectUrl?: string;
    disasterEventId?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { claimId, receiverWalletAddress, amount, assetCode, assetScale, redirectUrl, disasterEventId } = body;

  const fieldErrors: string[] = [];
  if (!claimId) fieldErrors.push("claimId is required");
  if (!receiverWalletAddress) fieldErrors.push("receiverWalletAddress is required");
  if (!amount) fieldErrors.push("amount is required");
  if (!assetCode) fieldErrors.push("assetCode is required");
  if (assetScale === undefined || assetScale === null) fieldErrors.push("assetScale is required");

  if (fieldErrors.length > 0) {
    return NextResponse.json({ errors: fieldErrors }, { status: 400 });
  }

  try {
    new URL(receiverWalletAddress!);
  } catch {
    return NextResponse.json(
      { error: "receiverWalletAddress must be a valid URL" },
      { status: 400 },
    );
  }

  // ── Fund Balance Check ────────────────────────────────────────────────────
  // NOTE: amount is in the receiver's currency; fund balance is in the
  // collector's currency. For same-currency wallets this is exact; for
  // cross-currency it is a rough guard. The real enforcement is the grant limit.
  const payoutAmount = Number(amount) / Math.pow(10, assetScale!);
  const fundBalance = await getFundBalance();

  if (fundBalance > 0 && payoutAmount > fundBalance) {
    await chWrite("INSERT INTO events_log", [
      {
        event_type: "STATE_TRANSITION",
        service: "payments",
        payload: JSON.stringify({
          action: "payout_rejected",
          claim_id: claimId,
          reason: "insufficient_funds",
          requested_amount: payoutAmount,
          available_balance: fundBalance,
        }),
        error: "INSUFFICIENT_FUNDS",
      },
    ]).catch(console.error);

    return NextResponse.json(
      {
        error: "Insufficient fund balance",
        detail: `Requested ${payoutAmount} ${assetCode} but only ${fundBalance} is available.`,
        code: "INSUFFICIENT_FUNDS",
      },
      { status: 402 },
    );
  }

  // ── Initiate Payout ───────────────────────────────────────────────────────
  try {
    const result = await initiatePayout({
      claimId: claimId!,
      receiverWalletAddress: receiverWalletAddress!,
      amount: amount!,
      assetCode: assetCode!,
      assetScale: assetScale!,
      redirectUrl: redirectUrl ?? `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/admin`,
      disasterEventId,
    });

    await chWrite("INSERT INTO events_log", [
      {
        event_type: "API_CALL",
        service: "payments",
        payload: JSON.stringify({
          action: "initiate_payout",
          claim_id: claimId,
          receiver_wallet: receiverWalletAddress,
          amount,
        }),
      },
    ]).catch(console.error);

    return NextResponse.json({
      redirectUrl: result.redirectUrl,
      continueToken: result.continueToken,
      continueUri: result.continueUri,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isConfigError = message.includes("Missing Open Payments");

    await chWrite("INSERT INTO events_log", [
      {
        event_type: "ERROR",
        service: "payments",
        payload: JSON.stringify({ action: "initiate_payout", claim_id: claimId }),
        error: message,
      },
    ]).catch(console.error);

    if (isConfigError) {
      return NextResponse.json(
        { error: "Open Payments is not configured. Set OPEN_PAYMENTS_* environment variables." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Payout initiation failed.", detail: message },
      { status: 502 },
    );
  }
}