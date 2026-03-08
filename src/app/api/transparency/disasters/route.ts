import { NextResponse } from "next/server";
import { chQuery } from "@/lib/clickhouse";

/**
 * GET /api/transparency/disasters
 * Returns disaster events with aggregated fund allocation.
 * Never exposes individual recipient data.
 */
export async function GET() {
  try {
    // All disaster events with status
    const disasters = await chQuery<{
      id: string;
      name: string;
      type: string;
      severity: string;
      region: string;
      country: string;
      status: string;
      description: string;
      source: string;
      started_at: string;
      resolved_at: string;
      created_at: string;
    }>(`
      SELECT *
      FROM disaster_events
      ORDER BY created_at DESC
      LIMIT 100
    `);

    // Fund allocation per disaster from fund_metrics
    const fundAllocation = await chQuery<{
      disaster_event_id: string;
      transaction_type: string;
      total_amount: string;
      transaction_count: string;
    }>(`
      SELECT
        disaster_event_id,
        transaction_type,
        sum(total_amount)       AS total_amount,
        sum(transaction_count)  AS transaction_count
      FROM fund_metrics
      WHERE disaster_event_id != ''
      GROUP BY disaster_event_id, transaction_type
      ORDER BY total_amount DESC
    `);

    // Claims per disaster (aggregate counts only)
    const claimsByDisaster = await chQuery<{
      disaster_event_id: string;
      status: string;
      count: string;
    }>(`
      SELECT
        disaster_event_id,
        status,
        sum(claim_count) AS count
      FROM claim_metrics
      WHERE disaster_event_id != ''
      GROUP BY disaster_event_id, status
    `);

    // Disaster type distribution
    const typeDistribution = await chQuery<{
      type: string;
      count: string;
    }>(`
      SELECT type, count() AS count
      FROM disaster_events
      GROUP BY type
      ORDER BY count DESC
    `);

    // Region distribution
    const regionDistribution = await chQuery<{
      region: string;
      count: string;
    }>(`
      SELECT region, count() AS count
      FROM disaster_events
      GROUP BY region
      ORDER BY count DESC
    `);

    // Build fund allocation map
    const allocationMap: Record<string, { contributed: number; payedOut: number; txCount: number }> = {};
    for (const row of fundAllocation) {
      if (!allocationMap[row.disaster_event_id]) {
        allocationMap[row.disaster_event_id] = { contributed: 0, payedOut: 0, txCount: 0 };
      }
      const amount = parseFloat(row.total_amount) || 0;
      const count = parseInt(row.transaction_count) || 0;
      if (row.transaction_type === "PAYOUT") {
        allocationMap[row.disaster_event_id].payedOut += amount;
      } else {
        allocationMap[row.disaster_event_id].contributed += amount;
      }
      allocationMap[row.disaster_event_id].txCount += count;
    }

    // Build claims map
    const claimsMap: Record<string, Record<string, number>> = {};
    for (const row of claimsByDisaster) {
      if (!claimsMap[row.disaster_event_id]) {
        claimsMap[row.disaster_event_id] = {};
      }
      claimsMap[row.disaster_event_id][row.status] = parseInt(row.count) || 0;
    }

    return NextResponse.json({
      disasters: disasters.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        severity: parseInt(d.severity),
        region: d.region,
        country: d.country,
        status: d.status,
        description: d.description,
        source: d.source,
        startedAt: d.started_at,
        resolvedAt: d.resolved_at,
        createdAt: d.created_at,
        funding: allocationMap[d.id] ?? { contributed: 0, payedOut: 0, txCount: 0 },
        claims: claimsMap[d.id] ?? {},
      })),
      typeDistribution: typeDistribution.map((t) => ({
        type: t.type,
        count: parseInt(t.count),
      })),
      regionDistribution: regionDistribution.map((r) => ({
        region: r.region,
        count: parseInt(r.count),
      })),
      totals: {
        active: disasters.filter((d) => d.status === "ACTIVE").length,
        resolved: disasters.filter((d) => d.status === "RESOLVED").length,
        total: disasters.length,
      },
    });
  } catch (err) {
    console.error("[transparency/disasters] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch disaster data", cached: true },
      { status: 503 }
    );
  }
}
