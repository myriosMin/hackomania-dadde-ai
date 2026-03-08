/**
 * POST /api/disasters/check
 *
 * Manual trigger (or cron) to scan for new disasters via the AI agent.
 * The agent checks GDACS, USGS, ReliefWeb, and Google News, then stores
 * any newly verified disasters in ClickHouse disaster_events.
 *
 * GET /api/disasters
 *
 * List active disasters from ClickHouse.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { chQuery, chWrite } from "@/lib/clickhouse";
import crypto from "crypto";

export const runtime = "nodejs";

const AGENT_URL = process.env.AGENT_URL ?? "http://localhost:8000";

// GET — list disasters
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "ACTIVE";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10), 100);

  try {
    const disasters = await chQuery<{
      id: string;
      name: string;
      type: string;
      severity: number;
      region: string;
      country: string;
      status: string;
      description: string;
      source: string;
      started_at: string;
      created_at: string;
    }>(
      `SELECT id, name, type, severity, region, country, status, description, source, started_at, created_at ` +
        `FROM disaster_events WHERE status = '${status}' ` +
        `ORDER BY started_at DESC LIMIT ${limit}`
    );

    return NextResponse.json({ disasters, total: disasters.length });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch disasters", detail: String(err) },
      { status: 500 }
    );
  }
}

// POST — trigger disaster news check
export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  let body: { regions?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    // Use defaults
  }

  const regions = body.regions ?? ["Southeast Asia", "Asia", "Global"];

  try {
    // Call the Python agent
    const agentRes = await fetch(`${AGENT_URL}/check-disaster-news`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regions }),
    });

    if (!agentRes.ok) {
      throw new Error(`Agent returned ${agentRes.status}`);
    }

    const agentData = await agentRes.json();
    const newDisasters = agentData.new_disasters ?? [];

    // For each verified disaster, insert into disaster_events if not already there
    const inserted: string[] = [];
    for (const d of newDisasters) {
      if (!d.disaster_verified) continue;

      const details = d.disaster_details ?? {};
      const name = details.name ?? `Disaster in ${details.region ?? "Unknown"}`;

      // Check if similar disaster exists
      const existing = await chQuery<{ id: string }>(
        `SELECT id FROM disaster_events ` +
          `WHERE name = '${name.replace(/'/g, "\\'")}' ` +
          `AND started_at >= now() - INTERVAL 7 DAY LIMIT 1`
      );

      if (existing.length > 0) continue;

      const disasterId = crypto.randomUUID();
      await chWrite("INSERT INTO disaster_events", [
        {
          id: disasterId,
          name,
          type: (details.type ?? "OTHER").toUpperCase(),
          severity: details.severity ?? 3,
          region: details.region ?? "",
          country: details.country ?? "",
          status: "ACTIVE",
          description: d.reasoning ?? "",
          source: (d.sources_checked ?? []).join(", ") || "AI_SCAN",
          started_at: details.date ?? new Date().toISOString().replace("T", " ").slice(0, 19),
          created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
        },
      ]);
      inserted.push(disasterId);
    }

    // Log event
    await chWrite("INSERT INTO events_log", [
      {
        id: crypto.randomUUID(),
        event_type: "DISASTER_SCAN",
        service: "ai",
        payload: JSON.stringify({
          regions,
          found: newDisasters.length,
          inserted: inserted.length,
        }),
        created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
      },
    ]);

    return NextResponse.json({
      message: `Scan complete. Found ${newDisasters.length} event(s), inserted ${inserted.length} new disaster(s).`,
      newDisasters,
      insertedIds: inserted,
      agentText: agentData.agent_text ?? "",
    });
  } catch (err) {
    console.error("[disasters/check] Agent call failed:", err);
    return NextResponse.json(
      { error: "Disaster check failed", detail: String(err) },
      { status: 502 }
    );
  }
}
