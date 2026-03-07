/**
 * GET  /api/payments/process-subscriptions — Process all due recurring subscriptions
 * POST /api/payments/process-subscriptions — Same, but via POST (for external cron)
 *
 * Iterates through active subscriptions and creates payments for any that are
 * past their next-payment-at timestamp. Also returns status of all active subs.
 *
 * Response:
 * {
 *   processed: number,
 *   errors: string[],
 *   activeSubscriptions: Array<{ id, interval, lastPaymentAt, nextPaymentAt, status }>
 * }
 */

import { NextResponse } from "next/server";
import {
  processSubscriptions,
  getActiveSubscriptions,
} from "@/lib/open-payments";

export const runtime = "nodejs";

async function handler() {
  try {
    const result = await processSubscriptions();
    const subs = getActiveSubscriptions().map((s) => ({
      id: s.id,
      senderWalletAddress: s.senderWalletAddress,
      pledgeAmount: s.pledgeAmount,
      assetCode: s.assetCode,
      interval: s.interval,
      intervalMs: s.intervalMs,
      lastPaymentAt: s.lastPaymentAt
        ? new Date(s.lastPaymentAt).toISOString()
        : null,
      nextPaymentAt: new Date(s.nextPaymentAt).toISOString(),
      status: s.status,
    }));

    return NextResponse.json({
      processed: result.processed,
      errors: result.errors,
      activeSubscriptions: subs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ProcessSubscriptions] Error:", err);
    return NextResponse.json(
      { error: "Failed to process subscriptions", detail: message },
      { status: 500 },
    );
  }
}

export const GET = handler;
export const POST = handler;
