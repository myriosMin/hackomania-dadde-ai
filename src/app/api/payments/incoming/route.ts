/**
 * GET /api/payments/incoming
 *
 * List incoming payments on the fund wallet, or get a specific one by URL.
 *
 * Query parameters:
 *   url          — (optional) specific incoming payment URL to fetch
 *   first        — (optional) page size, default 20
 *   cursor       — (optional) pagination cursor
 *
 * Corresponds to example steps 11 (list) and 12 (get).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getIncomingPayment,
  listIncomingPayments,
  getIncomingPaymentGrant,
} from "@/lib/open-payments";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const first = searchParams.get("first");
  const cursor = searchParams.get("cursor");

  try {
    const accessToken = await getIncomingPaymentGrant();

    // Fetch a specific incoming payment
    if (url) {
      const payment = await getIncomingPayment({ url, accessToken });
      return NextResponse.json({ payment });
    }

    // List incoming payments
    const result = await listIncomingPayments({
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
      { error: "Failed to fetch incoming payments.", detail: message },
      { status: 502 },
    );
  }
}
