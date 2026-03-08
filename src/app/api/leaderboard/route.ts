/**
 * GET /api/leaderboard
 *
 * Returns a public leaderboard of donors who have opted in (is_leaderboard_visible = true).
 * Contribution totals are fetched from ClickHouse transactions.
 * Recipients are NEVER shown.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { chQuery } from "@/lib/clickhouse";
import crypto from "crypto";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Get users who opted into the leaderboard
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, wallet_address, created_at")
      .eq("is_leaderboard_visible", true)
      .order("created_at", { ascending: true });

    if (error || !profiles) {
      return NextResponse.json(
        { error: "Failed to fetch leaderboard profiles" },
        { status: 500 }
      );
    }

    if (profiles.length === 0) {
      return NextResponse.json({ leaderboard: [], total: 0 });
    }

    // Hash wallet addresses to match ClickHouse sender_wallet_hash
    const walletHashMap: Record<string, typeof profiles[number]> = {};
    for (const p of profiles) {
      if (p.wallet_address) {
        const hash = crypto
          .createHash("sha256")
          .update(p.wallet_address)
          .digest("hex")
          .slice(0, 16);
        walletHashMap[hash] = p;
      }
    }

    const hashes = Object.keys(walletHashMap);
    if (hashes.length === 0) {
      // No wallets — return profiles with 0 contributions
      return NextResponse.json({
        leaderboard: profiles.map((p) => ({
          displayName: p.display_name,
          avatarUrl: p.avatar_url,
          totalContributed: 0,
          transactionCount: 0,
          joinedAt: p.created_at,
        })),
        total: profiles.length,
      });
    }

    // Fetch contribution totals from ClickHouse
    const hashList = hashes.map((h) => `'${h}'`).join(",");
    const contributions = await chQuery<{
      sender_wallet_hash: string;
      total_amount: string;
      tx_count: string;
    }>(`
      SELECT
        sender_wallet_hash,
        sum(amount)  AS total_amount,
        count()      AS tx_count
      FROM transactions
      WHERE type IN ('CONTRIBUTION', 'ROUND_UP', 'SUBSCRIPTION')
        AND status = 'COMPLETED'
        AND sender_wallet_hash IN (${hashList})
      GROUP BY sender_wallet_hash
      ORDER BY total_amount DESC
    `);

    // Build contribution map
    const contribMap: Record<string, { amount: number; count: number }> = {};
    for (const row of contributions) {
      contribMap[row.sender_wallet_hash] = {
        amount: parseFloat(row.total_amount) || 0,
        count: parseInt(row.tx_count) || 0,
      };
    }

    // Merge and sort by contribution amount
    const leaderboard = profiles
      .map((p) => {
        if (!p.wallet_address) {
          return {
            displayName: p.display_name,
            avatarUrl: p.avatar_url,
            totalContributed: 0,
            transactionCount: 0,
            joinedAt: p.created_at,
          };
        }
        const hash = crypto
          .createHash("sha256")
          .update(p.wallet_address)
          .digest("hex")
          .slice(0, 16);
        const contrib = contribMap[hash] ?? { amount: 0, count: 0 };
        return {
          displayName: p.display_name,
          avatarUrl: p.avatar_url,
          totalContributed: contrib.amount,
          transactionCount: contrib.count,
          joinedAt: p.created_at,
        };
      })
      .sort((a, b) => b.totalContributed - a.totalContributed);

    return NextResponse.json({
      leaderboard,
      total: leaderboard.length,
    });
  } catch (err) {
    console.error("[leaderboard] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard", cached: true },
      { status: 503 }
    );
  }
}
