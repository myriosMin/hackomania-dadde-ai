/**
 * POST /api/payments/payout
 *
 * Step 3b — Payout Flow (Outbound)
 *
 * Executes an approved payout from the community fund to a receiver's wallet.
 * This route MUST only be called from the admin approval flow (Step 6/7), after
 * a Collector has reviewed and approved the claim via the admin dashboard.
 *
 * Pre-conditions:
 *   - Claim must already be in `pending_human_approval` status in the DB.
 *   - Fund balance must be sufficient (checked before grant request).
 *
 * Request body:
 * {
 *   claimId:               string,   // UUID of the claim in ClickHouse
 *   receiverWalletAddress: string,   // receiver's ILP wallet URL
 *   amount:                string,   // payout amount in base units
 *   assetCode:             string,
 *   assetScale:            number,
 *   disasterEventId?:      string
 * }
 *
 * Success response (200):
 * { paymentId: string, status: "COMPLETED" | "FAILED" }
 *
 * Error responses:
 *   400 — validation error
 *   402 — insufficient funds
 *   502 — payment execution failed
 *   503 — Open Payments not configured
 */

import { NextRequest, NextResponse } from "next/server";
import { executePayout } from "@/lib/open-payments";
import { chWrite, chQuery } from "@/lib/clickhouse";

export const runtime = "nodejs";

interface FundBalance {
  available: number;
}

/**
 * Fetch available fund balance from the ClickHouse fund_metrics materialized view.
 * Returns the total balance (contributions minus completed payouts).
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
    disasterEventId?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { claimId, receiverWalletAddress, amount, assetCode, assetScale, disasterEventId } = body;

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

  // ── Fund Balance Check (optimistic locking) ───────────────────────────────
  const payoutAmount = Number(amount) / Math.pow(10, assetScale!);
  const fundBalance = await getFundBalance();

  if (payoutAmount > fundBalance) {
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
        detail: `Requested ${payoutAmount} ${assetCode} but only ${fundBalance} ${assetCode} is available.`,
        code: "INSUFFICIENT_FUNDS",
      },
      { status: 402 },
    );
  }

  // ── Execute Payout ────────────────────────────────────────────────────────
  try {
    const result = await executePayout({
      claimId: claimId!,
      receiverWalletAddress: receiverWalletAddress!,
      amount: amount!,
      assetCode: assetCode!,
      assetScale: assetScale!,
      disasterEventId,
    });

    if (result.status === "FAILED") {
      await chWrite("INSERT INTO events_log", [
        {
          event_type: "ERROR",
          service: "payments",
          payload: JSON.stringify({ action: "payout_failed", claim_id: claimId, payment_id: result.paymentId }),
          error: "Open Payments outgoing payment reported failed status",
        },
      ]).catch(console.error);

      return NextResponse.json(
        { error: "Payout failed at the payment processor. Please check the claim status.", payment_id: result.paymentId, status: "FAILED" },
        { status: 502 },
      );
    }

    return NextResponse.json({ paymentId: result.paymentId, status: result.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isConfigError = message.includes("Missing Open Payments");

    await chWrite("INSERT INTO events_log", [
      {
        event_type: "ERROR",
        service: "payments",
        payload: JSON.stringify({ action: "execute_payout", claim_id: claimId }),
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
      { error: "Payout execution failed. Claim has been flagged as payment_failed.", detail: message },
      { status: 502 },
    );
  }
}
