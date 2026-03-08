import { NextResponse } from "next/server";
import { chQuery } from "@/lib/clickhouse";

/**
 * GET /api/transparency/activity
 * Returns recent system activity — anonymized transaction feed.
 * Never exposes wallet addresses or recipient identities.
 */
export async function GET() {
  try {
    // Recent completed transactions (anonymized — no wallet hashes returned)
    const recentTransactions = await chQuery<{
      type: string;
      amount: string;
      currency: string;
      status: string;
      disaster_event_id: string;
      created_at: string;
    }>(`
      SELECT
        type,
        amount,
        currency,
        status,
        ifNull(toString(disaster_event_id), '') AS disaster_event_id,
        created_at
      FROM transactions
      WHERE status = 'COMPLETED'
      ORDER BY created_at DESC
      LIMIT 50
    `);

    // Recent system events (filtered — no sensitive data)
    const recentEvents = await chQuery<{
      event_type: string;
      service: string;
      created_at: string;
    }>(`
      SELECT
        event_type,
        service,
        created_at
      FROM events_log
      WHERE event_type IN ('PAYMENT', 'STATE_TRANSITION', 'AI_INFERENCE')
      ORDER BY created_at DESC
      LIMIT 30
    `);

    // Get disaster names for enrichment
    const disasterNames = await chQuery<{
      id: string;
      name: string;
    }>(`
      SELECT toString(id) AS id, name
      FROM disaster_events
    `);

    const nameMap: Record<string, string> = {};
    for (const d of disasterNames) {
      nameMap[d.id] = d.name;
    }

    return NextResponse.json({
      transactions: recentTransactions.map((t) => ({
        type: t.type,
        amount: parseFloat(t.amount) || 0,
        currency: t.currency,
        status: t.status,
        disasterName: nameMap[t.disaster_event_id] || null,
        createdAt: t.created_at,
      })),
      events: recentEvents.map((e) => ({
        type: e.event_type,
        service: e.service,
        createdAt: e.created_at,
      })),
    });
  } catch (err) {
    console.error("[transparency/activity] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch activity data", cached: true },
      { status: 503 }
    );
  }
}
