import { NextResponse } from "next/server";
import { getClickHouseClient } from "@/lib/clickhouse";

/**
 * GET /api/health/clickhouse
 *
 * Verifies ClickHouse connectivity and returns a summary of table row counts
 * for the core schema tables. Used by monitoring and during the demo to prove
 * the live ClickHouse connection.
 *
 * Response shape:
 *   { status: "ok" | "error", latencyMs: number, tables?: Record<string,number>, error?: string }
 */
export async function GET() {
  const start = Date.now();

  try {
    const client = getClickHouseClient();

    // Lightweight ping — verifies network path and auth
    await client.ping();

    // Fetch row counts for all core schema tables in a single query
    const tables = [
      "events_log",
      "transactions",
      "ai_inferences",
      "governance_votes",
      "governance_proposals",
      "community_rules",
      "fund_metrics",
      "claim_metrics",
      "disaster_events",
      "claims",
    ] as const;

    const countQuery = tables
      .map((t) => `SELECT '${t}' AS tbl, count() AS cnt FROM ${t}`)
      .join("\nUNION ALL\n");

    type CountRow = { tbl: string; cnt: string };
    const result = await client.query({
      query: countQuery,
      format: "JSONEachRow",
    });
    const rows = await result.json<CountRow>();

    const tableCounts: Record<string, number> = {};
    for (const row of rows) {
      tableCounts[row.tbl] = Number(row.cnt);
    }

    return NextResponse.json({
      status: "ok",
      latencyMs: Date.now() - start,
      tables: tableCounts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        status: "error",
        latencyMs: Date.now() - start,
        error: message,
      },
      { status: 503 },
    );
  }
}
