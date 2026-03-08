/**
 * GET /api/claims
 *
 * List claims for the admin dashboard.
 * Supports filtering by status.
 *
 * Query params:
 *   status — comma-separated statuses to filter (e.g. "PENDING_HUMAN_APPROVAL,NEEDS_REVIEW,ESCALATED")
 *   limit  — max rows (default 50)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { chQuery } from "@/lib/clickhouse";

export const runtime = "nodejs";

interface ClaimRow {
  id: string;
  claimant_id_hash: string;
  disaster_event_id: string;
  description: string;
  ai_recommendation: string | null;
  ai_recommendation_confidence: number | null;
  status: string;
  payout_amount: number | null;
  reviewer_id_hash: string | null;
  reviewed_at: string | null;
  metadata: string;
  created_at: string;
  updated_at: string;
}

export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

  let whereClause = "1 = 1";
  if (statusFilter) {
    const statuses = statusFilter
      .split(",")
      .map((s) => `'${s.trim()}'`)
      .join(",");
    whereClause = `status IN (${statuses})`;
  }

  try {
    const claims = await chQuery<ClaimRow>(
      `SELECT id, claimant_id_hash, disaster_event_id, description, ` +
        `ai_recommendation, ai_recommendation_confidence, status, ` +
        `payout_amount, reviewer_id_hash, reviewed_at, metadata, ` +
        `created_at, updated_at ` +
        `FROM claims WHERE ${whereClause} ` +
        `ORDER BY created_at DESC LIMIT ${limit}`
    );

    // Also fetch disaster event names for display
    const eventIds = [...new Set(claims.map((c) => c.disaster_event_id).filter(Boolean))];
    let eventMap: Record<string, { name: string; type: string; severity: number; region: string }> = {};
    if (eventIds.length > 0) {
      const idList = eventIds.map((id) => `'${id}'`).join(",");
      const events = await chQuery<{
        id: string;
        name: string;
        type: string;
        severity: number;
        region: string;
      }>(`SELECT id, name, type, severity, region FROM disaster_events WHERE id IN (${idList})`);
      for (const e of events) {
        eventMap[e.id] = { name: e.name, type: e.type, severity: e.severity, region: e.region };
      }
    }

    // Parse metadata and enrich with disaster info
    const enriched = claims.map((c) => {
      let metadata = {};
      try {
        metadata = JSON.parse(c.metadata || "{}");
      } catch {
        // keep empty
      }
      return {
        ...c,
        metadata,
        disaster: eventMap[c.disaster_event_id] ?? null,
      };
    });

    return NextResponse.json({ claims: enriched, total: enriched.length });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch claims", detail: String(err) },
      { status: 500 }
    );
  }
}
