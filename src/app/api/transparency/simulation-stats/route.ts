import { NextResponse } from "next/server";
import { chQuery } from "@/lib/clickhouse";

/**
 * GET /api/transparency/simulation-stats
 *
 * Returns real-time table row counts from ClickHouse to prove
 * the velocity simulation is working during the demo.
 * Used by the dashboard to show live record counts updating.
 */
export async function GET() {
  try {
    // Get row counts for all key tables in one query
    const tables = [
      "transactions",
      "disaster_events",
      "claims",
      "ai_inferences",
      "governance_votes",
      "events_log",
      "fund_metrics",
      "claim_metrics",
      "community_rules",
    ];

    const counts: Record<string, number> = {};
    for (const table of tables) {
      try {
        const rows = await chQuery<{ count: string }>(`SELECT count() AS count FROM ${table}`);
        counts[table] = parseInt(rows[0]?.count || "0");
      } catch {
        counts[table] = 0;
      }
    }

    // Get recent insert velocity (last 60 seconds)
    const recentTx = await chQuery<{ count: string }>(`
      SELECT count() AS count FROM transactions 
      WHERE created_at >= now() - INTERVAL 60 SECOND
    `).catch(() => [{ count: "0" }]);

    const recentEvents = await chQuery<{ count: string }>(`
      SELECT count() AS count FROM events_log
      WHERE created_at >= now() - INTERVAL 60 SECOND
    `).catch(() => [{ count: "0" }]);

    // Get total fund balance snapshot
    const fundBalance = await chQuery<{ balance: string }>(`
      SELECT 
        sum(CASE WHEN type IN ('CONTRIBUTION', 'ROUND_UP', 'SUBSCRIPTION') THEN amount ELSE -amount END) AS balance
      FROM transactions
      WHERE status = 'COMPLETED'
    `).catch(() => [{ balance: "0" }]);

    const totalRecords = Object.values(counts).reduce((sum, c) => sum + c, 0);

    return NextResponse.json({
      tableCounts: counts,
      totalRecords,
      velocity: {
        transactionsLast60s: parseInt(recentTx[0]?.count || "0"),
        eventsLast60s: parseInt(recentEvents[0]?.count || "0"),
      },
      fundBalance: parseFloat(fundBalance[0]?.balance || "0"),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[transparency/simulation-stats] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch simulation stats", tableCounts: {}, totalRecords: 0 },
      { status: 503 }
    );
  }
}
