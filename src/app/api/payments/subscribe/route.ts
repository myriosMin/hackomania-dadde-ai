/**
 * POST /api/payments/subscribe
 *
 * Step 3c — Subscription / Recurring Contribution Flow
 *
 * Creates a recurring outgoing-payment grant (subscription pledge) from the
 * donor's wallet to the community fund. Round-up micro-donations are tracked
 * separately and deducted from the pledge amount at interval end.
 *
 * The response includes the IDP redirect URL — the frontend MUST redirect the
 * user to it so they can approve the recurring payment at their IDP.
 *
 * Request body:
 * {
 *   senderWalletAddress: string,   // donor's ILP wallet URL
 *   pledgeAmount:        string,   // total pledge per interval, in base units
 *   assetCode:           string,   // e.g. "USD"
 *   assetScale:          number,   // e.g. 2
 *   interval?:           string,   // ISO 8601 repeating interval
 *                                  // default: "R/2026-03-01T00:00:00Z/P1M" (monthly)
 *   redirectUrl:         string,   // return URL after IDP consent
 * }
 *
 * Success response (200):
 * {
 *   redirectUrl:    string,   // IDP consent URL
 *   continueToken:  string,
 *   continueUri:    string
 * }
 *
 * Error responses:
 *   400 — validation error
 *   502 — grant request failed
 *   503 — Open Payments not configured
 */

import { NextRequest, NextResponse } from "next/server";
import { initiateSubscription } from "@/lib/open-payments";
import { chWrite } from "@/lib/clickhouse";
import { hashWalletAddress } from "@/lib/open-payments";

export const runtime = "nodejs";

/** Default monthly interval starting from current month */
function defaultInterval(): string {
  const now = new Date();
  // Start of current month in UTC
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  return `R/${start}/P1M`;
}

export async function POST(req: NextRequest) {
  // ── Parse & Validate ──────────────────────────────────────────────────────
  let body: {
    senderWalletAddress?: string;
    pledgeAmount?: string;
    assetCode?: string;
    assetScale?: number;
    interval?: string;
    redirectUrl?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { senderWalletAddress, pledgeAmount, assetCode, assetScale, redirectUrl } = body;
  const interval = body.interval ?? defaultInterval();

  const fieldErrors: string[] = [];
  // senderWalletAddress is optional — defaults to SENDER_WALLET_ADDRESS env var
  if (!pledgeAmount) fieldErrors.push("pledgeAmount is required");
  if (!assetCode) fieldErrors.push("assetCode is required");
  if (assetScale === undefined || assetScale === null) fieldErrors.push("assetScale is required");
  if (!redirectUrl) fieldErrors.push("redirectUrl is required");

  if (fieldErrors.length > 0) {
    return NextResponse.json({ errors: fieldErrors }, { status: 400 });
  }

  // Validate wallet address format only if provided
  if (senderWalletAddress) {
    try {
      new URL(senderWalletAddress);
    } catch {
      return NextResponse.json(
        { error: "senderWalletAddress must be a valid URL" },
        { status: 400 },
      );
    }
  }

  // Validate interval format (must start with R/ or be a valid ISO 8601 repeating interval)
  if (!interval.startsWith("R/") && !interval.startsWith("R0/")) {
    return NextResponse.json(
      { error: "interval must be a valid ISO 8601 repeating interval starting with R/ e.g. R/2026-03-01T00:00:00Z/P1M" },
      { status: 400 },
    );
  }

  // ── Initiate Subscription ─────────────────────────────────────────────────
  try {
    const result = await initiateSubscription({
      senderWalletAddress: senderWalletAddress ?? undefined,
      pledgeAmount: pledgeAmount!,
      assetCode: assetCode!,
      assetScale: assetScale!,
      interval,
      redirectUrl: redirectUrl!,
    });

    // Fire-and-forget — return the redirect URL immediately, log in background
    const resolvedSender = senderWalletAddress ?? process.env.SENDER_WALLET_ADDRESS ?? "unknown";
    chWrite("INSERT INTO events_log", [
      {
        event_type: "API_CALL",
        service: "payments",
        payload: JSON.stringify({
          action: "initiate_subscription",
          sender_wallet_hash: hashWalletAddress(resolvedSender),
          pledge_amount: pledgeAmount,
          asset_code: assetCode,
          interval,
        }),
        error: null,
      },
    ]).catch(console.error);

    chWrite("INSERT INTO transactions", [
      {
        type: "SUBSCRIPTION",
        amount: Number(pledgeAmount) / Math.pow(10, assetScale!),
        currency: assetCode,
        sender_wallet_hash: hashWalletAddress(resolvedSender),
        recipient_wallet_hash: hashWalletAddress(process.env.OPEN_PAYMENTS_WALLET_ADDRESS ?? "fund"),
        disaster_event_id: null,
        open_payments_payment_id: null,
        status: "PENDING",
        metadata: JSON.stringify({ interval, continue_uri: result.continueUri }),
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
        payload: JSON.stringify({ action: "initiate_subscription", sender_wallet_address: senderWalletAddress }),
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
      { error: "Subscription initiation failed. Please try again.", detail: message },
      { status: 502 },
    );
  }
}
