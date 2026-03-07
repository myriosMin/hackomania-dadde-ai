/**
 * POST /api/payments/token/rotate
 *
 * Rotate an access token — generates a new value without invalidating the
 * underlying grant. Use for long-lived subscription tokens to keep recurring
 * pledge grants secure.
 *
 * Corresponds to example step 15.
 *
 * Request body:
 * {
 *   manageUrl:   string,  // token's manage URL (from grant response)
 *   accessToken: string   // current token value
 * }
 *
 * Success response (200):
 * {
 *   accessToken: string,  // new token value
 *   manageUrl:   string,  // new manage URL
 *   expiresIn:   number | null
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { rotateToken } from "@/lib/open-payments";
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
    const result = await rotateToken({ manageUrl, accessToken });

    await chWrite("INSERT INTO events_log", [
      {
        event_type: "STATE_TRANSITION",
        service: "payments",
        payload: JSON.stringify({
          action: "rotate_token",
          new_manage_url: result.access_token.manage,
        }),
        error: null,
      },
    ]).catch(console.error);

    return NextResponse.json({
      accessToken: result.access_token.value,
      manageUrl: result.access_token.manage,
      expiresIn: result.access_token.expires_in ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    return NextResponse.json(
      { error: "Failed to rotate token.", detail: message },
      { status: 502 },
    );
  }
}
