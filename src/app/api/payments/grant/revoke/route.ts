/**
 * POST /api/payments/grant/revoke
 *
 * Cancel (revoke) a grant entirely so no future tokens can be issued.
 * Use when a donor cancels their recurring subscription pledge — revoke the
 * grant so the platform can never charge them again without new consent.
 *
 * Corresponds to example step 17.
 *
 * Request body:
 * {
 *   continueUri:         string,  // grant's continue URI
 *   continueAccessToken: string   // grant's continue access token
 * }
 *
 * Success response (204): empty
 */

import { NextRequest, NextResponse } from "next/server";
import { revokeGrant } from "@/lib/open-payments";
import { chWrite } from "@/lib/clickhouse";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { continueUri?: string; continueAccessToken?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { continueUri, continueAccessToken } = body;

  if (!continueUri || !continueAccessToken) {
    return NextResponse.json(
      { error: "continueUri and continueAccessToken are required" },
      { status: 400 },
    );
  }

  try {
    await revokeGrant({ continueUri, continueAccessToken });

    await chWrite("INSERT INTO events_log", [
      {
        event_type: "STATE_TRANSITION",
        service: "payments",
        payload: JSON.stringify({
          action: "revoke_grant",
          continue_uri: continueUri,
        }),
        error: null,
      },
    ]).catch(console.error);

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    return NextResponse.json(
      { error: "Failed to revoke grant.", detail: message },
      { status: 502 },
    );
  }
}
