import { NextResponse } from "next/server";
import { chQuery } from "@/lib/clickhouse";

/**
 * GET /api/transparency/ai-decisions
 * Returns aggregated AI decision ratios — never individual claim data.
 */
export async function GET() {
  try {
    // AI Recommendation decisions aggregate
    const recommendations = await chQuery<{
      decision: string;
      count: string;
      avg_confidence: string;
    }>(`
      SELECT
        decision,
        count()                   AS count,
        avg(confidence_score)     AS avg_confidence
      FROM ai_inferences
      WHERE agent_type = 'RECOMMENDER'
        AND decision IS NOT NULL
      GROUP BY decision
      ORDER BY count DESC
    `);

    // AI Critic validations aggregate
    const critiques = await chQuery<{
      decision: string;
      count: string;
      avg_confidence: string;
    }>(`
      SELECT
        decision,
        count()                   AS count,
        avg(confidence_score)     AS avg_confidence
      FROM ai_inferences
      WHERE agent_type = 'CRITIC'
        AND decision IS NOT NULL
      GROUP BY decision
      ORDER BY count DESC
    `);

    // Overall AI processing stats
    const processingStats = await chQuery<{
      agent_type: string;
      total: string;
      avg_time_ms: string;
      error_count: string;
    }>(`
      SELECT
        agent_type,
        count()                             AS total,
        avg(processing_time_ms)             AS avg_time_ms,
        countIf(error IS NOT NULL AND error != '') AS error_count
      FROM ai_inferences
      GROUP BY agent_type
    `);

    // Claim status distribution (anonymized — no claimant info)
    const claimStatuses = await chQuery<{
      status: string;
      count: string;
    }>(`
      SELECT
        status,
        sum(claim_count) AS count
      FROM claim_metrics
      GROUP BY status
      ORDER BY count DESC
    `);

    return NextResponse.json({
      recommendations: recommendations.map((r) => ({
        decision: r.decision,
        count: parseInt(r.count),
        avgConfidence: parseFloat(parseFloat(r.avg_confidence).toFixed(3)),
      })),
      critiques: critiques.map((c) => ({
        decision: c.decision,
        count: parseInt(c.count),
        avgConfidence: parseFloat(parseFloat(c.avg_confidence).toFixed(3)),
      })),
      processingStats: processingStats.map((s) => ({
        agentType: s.agent_type,
        total: parseInt(s.total),
        avgTimeMs: Math.round(parseFloat(s.avg_time_ms)),
        errorCount: parseInt(s.error_count),
      })),
      claimStatuses: claimStatuses.map((s) => ({
        status: s.status,
        count: parseInt(s.count),
      })),
    });
  } catch (err) {
    console.error("[transparency/ai-decisions] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch AI decision data", cached: true },
      { status: 503 }
    );
  }
}
