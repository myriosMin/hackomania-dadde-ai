import { NextResponse } from "next/server";
import { chQuery } from "@/lib/clickhouse";

/**
 * GET /api/transparency/fund-metrics
 * Returns aggregated fund health data from ClickHouse fund_metrics + transactions.
 * Never exposes individual recipient data — only totals and time series.
 */
export async function GET() {
  try {
    // Overall fund summary from fund_metrics (SummingMergeTree)
    const fundSummary = await chQuery<{
      transaction_type: string;
      total_amount: string;
      transaction_count: string;
    }>(`
      SELECT
        transaction_type,
        sum(total_amount)       AS total_amount,
        sum(transaction_count)  AS transaction_count
      FROM fund_metrics
      GROUP BY transaction_type
      ORDER BY transaction_type
    `);

    // Contribution velocity — daily totals for last 30 days
    const dailyVolume = await chQuery<{
      date: string;
      transaction_type: string;
      total_amount: string;
      transaction_count: string;
    }>(`
      SELECT
        date,
        transaction_type,
        sum(total_amount)       AS total_amount,
        sum(transaction_count)  AS transaction_count
      FROM fund_metrics
      WHERE date >= today() - 30
      GROUP BY date, transaction_type
      ORDER BY date ASC
    `);

    // Total unique donors (hashed) — count distinct senders for CONTRIBUTION type
    const donorCount = await chQuery<{ count: string }>(`
      SELECT count(DISTINCT sender_wallet_hash) AS count
      FROM transactions
      WHERE type = 'CONTRIBUTION' AND status = 'COMPLETED'
    `);

    // Total payouts count (anonymized — no recipient info)
    const payoutStats = await chQuery<{
      total_payouts: string;
      total_payout_amount: string;
    }>(`
      SELECT
        count()       AS total_payouts,
        sum(amount)   AS total_payout_amount
      FROM transactions
      WHERE type = 'PAYOUT' AND status = 'COMPLETED'
    `);

    // Calculate totals from summary
    let totalContributions = 0;
    let totalPayouts = 0;
    let contributionCount = 0;
    let payoutCount = 0;

    for (const row of fundSummary) {
      const amount = parseFloat(row.total_amount) || 0;
      const count = parseInt(row.transaction_count) || 0;
      if (row.transaction_type === "CONTRIBUTION" || row.transaction_type === "ROUND_UP" || row.transaction_type === "SUBSCRIPTION") {
        totalContributions += amount;
        contributionCount += count;
      } else if (row.transaction_type === "PAYOUT") {
        totalPayouts += amount;
        payoutCount += count;
      }
    }

    const fundBalance = totalContributions - totalPayouts;

    return NextResponse.json({
      summary: {
        fundBalance: Math.max(0, fundBalance),
        totalContributions,
        totalPayouts,
        contributionCount,
        payoutCount,
        uniqueDonors: parseInt(donorCount[0]?.count ?? "0"),
        conversionRate: totalContributions > 0
          ? ((totalPayouts / totalContributions) * 100).toFixed(1)
          : "0.0",
      },
      dailyVolume: dailyVolume.map((row) => ({
        date: row.date,
        type: row.transaction_type,
        amount: parseFloat(row.total_amount) || 0,
        count: parseInt(row.transaction_count) || 0,
      })),
      breakdown: fundSummary.map((row) => ({
        type: row.transaction_type,
        amount: parseFloat(row.total_amount) || 0,
        count: parseInt(row.transaction_count) || 0,
      })),
    });
  } catch (err) {
    console.error("[transparency/fund-metrics] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch fund metrics", cached: true },
      { status: 503 }
    );
  }
}
