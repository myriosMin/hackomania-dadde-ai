/**
 * POST /api/payments/contribute
 *
 * Step 3a — Contribution Flow (Inbound)
 *
 * 1. Validates the request body.
 * 2. Creates an incoming payment on the fund's wallet.
 * 3. Requests an interactive outgoing-payment grant from the donor's auth server.
 * 4. Returns the IDP redirect URL — the frontend must redirect the user to it.
 *
 * The caller must store { continueToken, continueUri, incomingPaymentUrl } in
 * a short-lived server-side session (or cookie) so the callback route can
 * complete the flow once the user returns from the IDP.
 *
 * Request body:
 * {
 *   senderWalletAddress: string,   // e.g. "https://ilp.interledger-test.dev/donor"
 *   amount:              string,   // in base units, e.g. "500" = $5.00 when assetScale=2
 *   assetCode:           string,   // e.g. "USD"
 *   assetScale:          number,   // e.g. 2
 *   redirectUrl:         string,   // full URL to return to after IDP consent
 *   disasterEventId?:    string    // optional UUID
 * }
 *
 * Success response (200):
 * {
 *   redirectUrl:          string,  // IDP consent URL — redirect the user here
 *   continueToken:        string,
 *   continueUri:          string,
 *   incomingPaymentUrl:   string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { initiateContribution } from "@/lib/open-payments";
import { chWrite } from "@/lib/clickhouse";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // ── Parse & Validate ──────────────────────────────────────────────────────
  let body: {
    senderWalletAddress?: string;
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

  const { senderWalletAddress, amount, assetCode, assetScale, redirectUrl, disasterEventId } = body;

  const fieldErrors: string[] = [];
  // senderWalletAddress is optional — defaults to SENDER_WALLET_ADDRESS env var
  if (!amount) fieldErrors.push("amount is required");
  if (!assetCode) fieldErrors.push("assetCode is required");
  if (assetScale === undefined || assetScale === null) fieldErrors.push("assetScale is required");
  // redirectUrl is optional — omitting it skips the IDP redirect (test wallet path)

  if (fieldErrors.length > 0) {
    return NextResponse.json({ errors: fieldErrors }, { status: 400 });
  }

  // Validate wallet address format only if explicitly provided
  if (senderWalletAddress) {
    try {
      new URL(senderWalletAddress);
    } catch {
      return NextResponse.json(
        { error: "senderWalletAddress must be a valid URL (e.g. http://ilp.interledger-test.dev/alice)" },
        { status: 400 },
      );
    }
  }

  // ── Initiate Contribution ─────────────────────────────────────────────────
  try {
    const result = await initiateContribution({
      senderWalletAddress: senderWalletAddress ?? undefined,
      amount: amount!,
      assetCode: assetCode!,
      assetScale: assetScale!,
      redirectUrl: redirectUrl ?? undefined,
      disasterEventId,
    });

    // Log the initiation event
    await chWrite("INSERT INTO events_log", [
      {
        event_type: "API_CALL",
        service: "payments",
        payload: JSON.stringify({
          action: "initiate_contribution",
          sender_wallet_address: senderWalletAddress,
          amount,
          assetCode,
          disaster_event_id: disasterEventId ?? null,
          completed: result.completed,
        }),
        error: null,
      },
    ]);

    // Test wallet: full flow completed server-side (non-interactive grant)
    if (result.completed) {
      return NextResponse.json({ completed: true, paymentId: result.paymentId });
    }

    // Production wallet: requires IDP redirect
    return NextResponse.json({
      completed: false,
      redirectUrl: result.redirectUrl,
      continueToken: result.continueToken,
      continueUri: result.continueUri,
      incomingPaymentUrl: result.incomingPaymentUrl,
    });
  } catch (err) {
    // Log the full error details to the server console for debugging
    console.error("[Contribute] Payment initiation error:", err);
    if (err && typeof err === "object" && "description" in err) {
      console.error("[Contribute] SDK error description:", (err as Record<string, unknown>).description);
    }
    if (err && typeof err === "object" && "response" in err) {
      const resp = (err as Record<string, unknown>).response;
      console.error("[Contribute] SDK response:", JSON.stringify(resp, null, 2));
    }

    const message = err instanceof Error ? err.message : String(err);
    const isConfigError = message.includes("Missing Open Payments");

    // Log the error
    await chWrite("INSERT INTO events_log", [
      {
        event_type: "ERROR",
        service: "payments",
        payload: JSON.stringify({ action: "initiate_contribution", sender_wallet_address: senderWalletAddress }),
        error: message,
      },
    ]).catch(console.error);

    if (isConfigError) {
      return NextResponse.json(
        { error: "Open Payments is not configured. Set OPEN_PAYMENTS_* environment variables." },
        { status: 503 },
      );
    }

    // Grant creation fail → return clear error with retry hint
    return NextResponse.json(
      { error: "Payment initiation failed. Please try again.", detail: message },
      { status: 502 },
    );
  }
}
