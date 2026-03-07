/**
 * POST /api/payments/incoming/complete
 *
 * Complete (close) an incoming payment so no further funds are accepted.
 * Use to close a donation round once the target is met.
 *
 * Corresponds to example step 13.
 *
 * Request body:
 * {
 *   url: string   // incoming payment URL to complete
 * }
 *
 * Success response (200):
 * { payment: { id, completed, receivedAmount, ... } }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  completeIncomingPayment,
  getIncomingPaymentGrant,
} from "@/lib/open-payments";
import { chWrite } from "@/lib/clickhouse";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { url?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const accessToken = await getIncomingPaymentGrant();
    const payment = await completeIncomingPayment({
      url: body.url,
      accessToken,
    });

    await chWrite("INSERT INTO events_log", [
      {
        event_type: "STATE_TRANSITION",
        service: "payments",
        payload: JSON.stringify({
          action: "complete_incoming_payment",
          payment_id: payment.id,
          completed: payment.completed,
          received_amount: payment.receivedAmount?.value,
        }),
        error: null,
      },
    ]).catch(console.error);

    return NextResponse.json({ payment });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    return NextResponse.json(
      { error: "Failed to complete incoming payment.", detail: message },
      { status: 502 },
    );
  }
}
