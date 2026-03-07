/**
 * GET /api/payments/callback
 *
 * IDP Redirect Callback — Step 3a (Steps 4–6)
 *
 * The Open Payments IDP redirects the user back here after they approve or
 * deny the outgoing-payment grant consent.
 *
 * Query parameters (added by the IDP):
 *   interact_ref   — the interaction reference to continue the grant
 *   hash           — integrity hash from the IDP (optional, for verification)
 *   error          — "access_denied" if the user cancelled
 *
 * Query parameters set by the platform during grant initiation:
 *   state          — unique key to look up pending grant continuation data
 *   return_url     — where to send the user after completion
 *
 * On success: redirect to return_url?status=success&payment_id=<id>
 * On cancel:  redirect to return_url?status=cancelled
 * On error:   redirect to return_url?status=error&message=<msg>
 */

import { NextRequest, NextResponse } from "next/server";
import { completeContribution, getPendingGrant, deletePendingGrant } from "@/lib/open-payments";
import { chWrite } from "@/lib/clickhouse";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  console.log("[Callback] Hit! Full URL:", req.url);
  console.log("[Callback] All params:", Object.fromEntries(searchParams.entries()));

  const interactRef = searchParams.get("interact_ref");
  const error = searchParams.get("error");
  const stateKey = searchParams.get("state");
  const returnUrl = searchParams.get("return_url") ?? "/";

  console.log("[Callback] interactRef:", interactRef, "error:", error, "state:", stateKey, "return_url:", returnUrl);

  // ── User cancelled at IDP ─────────────────────────────────────────────────
  if (error === "access_denied" || (!interactRef && !error)) {
    await chWrite("INSERT INTO events_log", [
      {
        event_type: "STATE_TRANSITION",
        service: "payments",
        payload: JSON.stringify({ action: "contribution_cancelled", state: stateKey }),
        error: "User denied IDP consent",
      },
    ]).catch(console.error);

    if (stateKey) deletePendingGrant(stateKey);

    return NextResponse.redirect(
      new URL(`${returnUrl}?status=cancelled`, req.url),
    );
  }

  // ── Look up pending grant state ───────────────────────────────────────────
  if (!stateKey) {
    console.error("[Callback] Missing state parameter");
    return NextResponse.redirect(
      new URL(`${returnUrl}?status=error&message=Missing+state+parameter`, req.url),
    );
  }

  const pendingGrant = getPendingGrant(stateKey);
  if (!pendingGrant) {
    console.error("[Callback] No pending grant found for state:", stateKey);
    return NextResponse.redirect(
      new URL(`${returnUrl}?status=error&message=Grant+session+expired.+Please+try+again.`, req.url),
    );
  }
  console.log("[Callback] Found pending grant:", { ...pendingGrant, continueToken: "***" });

  // ── Complete contribution ─────────────────────────────────────────────────
  try {
    const { paymentId } = await completeContribution({
      senderWalletAddress: pendingGrant.senderWalletAddress,
      continueToken: pendingGrant.continueToken,
      continueUri: pendingGrant.continueUri,
      interactRef: interactRef!,
      incomingPaymentUrl: pendingGrant.incomingPaymentUrl,
      amount: pendingGrant.amount,
      assetCode: pendingGrant.assetCode,
      assetScale: pendingGrant.assetScale,
      disasterEventId: pendingGrant.disasterEventId,
    });

    // Clean up the pending grant
    deletePendingGrant(stateKey);

    const successUrl = new URL(`${returnUrl}?status=success&payment_id=${encodeURIComponent(paymentId)}`, req.url);
    console.log("[Callback] Success! Redirecting to:", successUrl.toString());
    return NextResponse.redirect(successUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Callback] completeContribution error:", err);

    await chWrite("INSERT INTO events_log", [
      {
        event_type: "ERROR",
        service: "payments",
        payload: JSON.stringify({
          action: "complete_contribution",
          sender_wallet: pendingGrant.senderWalletAddress,
          amount: pendingGrant.amount,
        }),
        error: message,
      },
    ]).catch(console.error);

    return NextResponse.redirect(
      new URL(
        `${returnUrl}?status=error&message=${encodeURIComponent("Payment failed. Please try again.")}`,
        req.url,
      ),
    );
  }
}
