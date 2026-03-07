/**
 * POST /api/payments/token/revoke
 *
 * Permanently revoke an access token. Use when a donor cancels their
 * subscription, or after a one-off payout token has been used.
 *
 * Corresponds to example step 16.
 *
 * Request body:
 * {
 *   manageUrl:   string,  // token's manage URL
 *   accessToken: string   // token value to revoke
 * }
 *
 * Success response (204): empty
 */

import { NextRequest, NextResponse } from "next/server";
import { revokeToken } from "@/lib/open-payments";
import { chWrite } from "@/lib/clickhouse";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { manageUrl?: string; accessToken?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { manageUrl, accessToken } = body;

  if (!manageUrl || !accessToken) {
    return NextResponse.json(
      { error: "manageUrl and accessToken are required" },
      { status: 400 },
    );
  }

  try {
    await revokeToken({ manageUrl, accessToken });

    await chWrite("INSERT INTO events_log", [
      {
        event_type: "STATE_TRANSITION",
        service: "payments",
        payload: JSON.stringify({
          action: "revoke_token",
          manage_url: manageUrl,
        }),
        error: null,
      },
    ]).catch(console.error);

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    return NextResponse.json(
      { error: "Failed to revoke token.", detail: message },
      { status: 502 },
    );
  }
}
