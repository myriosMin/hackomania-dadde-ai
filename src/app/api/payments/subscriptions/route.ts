/**
 * GET  /api/payments/subscriptions — List all active subscriptions
 *
 * Response:
 * {
 *   subscriptions: Array<{
 *     id, senderWalletAddress, pledgeAmount, assetCode, assetScale,
 *     interval, intervalMs, lastPaymentAt, nextPaymentAt, createdAt, status
 *   }>
 * }
 */

import { NextResponse } from "next/server";
import {
  getActiveSubscriptions,
  cancelActiveSubscription,
} from "@/lib/open-payments";

export const runtime = "nodejs";

/** GET — list active subscriptions */
export async function GET() {
  // Return ALL subscriptions (active, paused, cancelled) so the UI can show history
  const subs = getActiveSubscriptions(); // only returns ACTIVE ones
  const mapped = subs.map((s) => ({
    id: s.id,
    senderWalletAddress: s.senderWalletAddress,
    pledgeAmount: s.pledgeAmount,
    assetCode: s.assetCode,
    assetScale: s.assetScale,
    interval: s.interval,
    intervalMs: s.intervalMs,
    lastPaymentAt: s.lastPaymentAt ? new Date(s.lastPaymentAt).toISOString() : null,
    nextPaymentAt: new Date(s.nextPaymentAt).toISOString(),
    createdAt: new Date(s.createdAt).toISOString(),
    status: s.status,
  }));

  return NextResponse.json({ subscriptions: mapped });
}

/** DELETE — cancel a subscription by id (in query param or body) */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  let id = searchParams.get("id");

  if (!id) {
    try {
      const body = await req.json();
      id = body.id;
    } catch {
      // no body
    }
  }
  if (!id) {
    return NextResponse.json({ error: "Missing subscription id" }, { status: 400 });
  }

  const cancelled = cancelActiveSubscription(id);
  if (!cancelled) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, id });
}
