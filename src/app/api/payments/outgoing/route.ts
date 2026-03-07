/**
 * GET /api/payments/outgoing
 *
 * List outgoing payments from the fund wallet, or get a specific one by URL.
 *
 * Query parameters:
 *   url          — (optional) specific outgoing payment URL to fetch
 *   first        — (optional) page size, default 20
 *   cursor       — (optional) pagination cursor
 *
 * Corresponds to example steps 9 (get) and 10 (list).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getOutgoingPayment,
  listOutgoingPayments,
  getOutgoingPaymentGrant,
} from "@/lib/open-payments";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const first = searchParams.get("first");
  const cursor = searchParams.get("cursor");

  try {
    const accessToken = await getOutgoingPaymentGrant();

    // Fetch a specific outgoing payment
    if (url) {
      const payment = await getOutgoingPayment({ url, accessToken });
      return NextResponse.json({ payment });
    }

    // List outgoing payments
    const result = await listOutgoingPayments({
      accessToken,
      first: first ? parseInt(first, 10) : 20,
      cursor: cursor ?? undefined,
    });

    return NextResponse.json({
      payments: result.result ?? [],
      pagination: result.pagination ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isConfigError = message.includes("Missing Open Payments");

    if (isConfigError) {
      return NextResponse.json(
        { error: "Open Payments is not configured." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch outgoing payments.", detail: message },
      { status: 502 },
    );
  }
}
