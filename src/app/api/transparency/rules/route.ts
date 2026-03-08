import { NextResponse } from "next/server";
import { chQuery } from "@/lib/clickhouse";

/**
 * GET /api/transparency/rules
 * Returns current community rules (latest version from ReplacingMergeTree).
 * Also returns rule version history to show how rules have evolved.
 */
export async function GET() {
  try {
    // Current active rules (latest version via FINAL — ReplacingMergeTree deduplication)
    const currentRules = await chQuery<{
      version: string;
      min_ai_confidence: string;
      max_payout_per_recipient: string;
      distribution_model: string;
      min_disaster_severity: string;
      reserve_percentage: string;
      updated_by: string;
      updated_at: string;
    }>(`
      SELECT *
      FROM community_rules FINAL
      ORDER BY version DESC
      LIMIT 1
    `);

    // Rule version history (show how rules changed over time)
    const ruleHistory = await chQuery<{
      version: string;
      min_ai_confidence: string;
      max_payout_per_recipient: string;
      distribution_model: string;
      min_disaster_severity: string;
      reserve_percentage: string;
      updated_by: string;
      updated_at: string;
    }>(`
      SELECT *
      FROM community_rules FINAL
      ORDER BY version DESC
      LIMIT 20
    `);

    const current = currentRules[0] ?? null;

    return NextResponse.json({
      current: current
        ? {
            version: parseInt(current.version),
            minAiConfidence: parseFloat(current.min_ai_confidence),
            maxPayoutPerRecipient: parseFloat(current.max_payout_per_recipient),
            distributionModel: current.distribution_model,
            minDisasterSeverity: parseInt(current.min_disaster_severity),
            reservePercentage: parseFloat(current.reserve_percentage),
            updatedBy: current.updated_by,
            updatedAt: current.updated_at,
          }
        : null,
      history: ruleHistory.map((r) => ({
        version: parseInt(r.version),
        minAiConfidence: parseFloat(r.min_ai_confidence),
        maxPayoutPerRecipient: parseFloat(r.max_payout_per_recipient),
        distributionModel: r.distribution_model,
        minDisasterSeverity: parseInt(r.min_disaster_severity),
        reservePercentage: parseFloat(r.reserve_percentage),
        updatedBy: r.updated_by,
        updatedAt: r.updated_at,
      })),
    });
  } catch (err) {
    console.error("[transparency/rules] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch community rules", cached: true },
      { status: 503 }
    );
  }
}
