import { NextResponse } from "next/server";
import { chQuery } from "@/lib/clickhouse";

/**
 * GET /api/transparency/proposals
 * Returns governance proposals with vote tallies.
 * Voter identities are hashed — never exposed.
 */
export async function GET() {
  try {
    // All proposals ordered by newest first
    const proposals = await chQuery<{
      id: string;
      title: string;
      description: string;
      rule_field: string;
      proposed_value: string;
      current_value: string;
      votes_for: string;
      votes_against: string;
      status: string;
      expires_at: string;
      resolved_at: string;
      created_at: string;
    }>(`
      SELECT
        id,
        title,
        description,
        rule_field,
        proposed_value,
        current_value,
        votes_for,
        votes_against,
        status,
        expires_at,
        resolved_at,
        created_at
      FROM governance_proposals
      ORDER BY created_at DESC
      LIMIT 50
    `);

    // Vote participation stats
    const voteStats = await chQuery<{
      total_votes: string;
      unique_voters: string;
    }>(`
      SELECT
        count()                             AS total_votes,
        count(DISTINCT voter_id_hash)       AS unique_voters
      FROM governance_votes
    `);

    // Votes by proposal (aggregated)
    const votesByProposal = await chQuery<{
      proposal_id: string;
      vote: string;
      count: string;
    }>(`
      SELECT
        proposal_id,
        vote,
        count() AS count
      FROM governance_votes
      GROUP BY proposal_id, vote
      ORDER BY proposal_id
    `);

    // Build a vote map for enrichment
    const voteMap: Record<string, { for: number; against: number }> = {};
    for (const v of votesByProposal) {
      if (!voteMap[v.proposal_id]) {
        voteMap[v.proposal_id] = { for: 0, against: 0 };
      }
      if (v.vote === "FOR") {
        voteMap[v.proposal_id].for = parseInt(v.count);
      } else {
        voteMap[v.proposal_id].against = parseInt(v.count);
      }
    }

    return NextResponse.json({
      proposals: proposals.map((p) => {
        const liveVotes = voteMap[p.id];
        return {
          id: p.id,
          title: p.title,
          description: p.description,
          ruleField: p.rule_field,
          proposedValue: p.proposed_value,
          currentValue: p.current_value,
          votesFor: liveVotes?.for ?? parseInt(p.votes_for),
          votesAgainst: liveVotes?.against ?? parseInt(p.votes_against),
          status: p.status,
          expiresAt: p.expires_at,
          resolvedAt: p.resolved_at,
          createdAt: p.created_at,
        };
      }),
      stats: {
        totalVotes: parseInt(voteStats[0]?.total_votes ?? "0"),
        uniqueVoters: parseInt(voteStats[0]?.unique_voters ?? "0"),
        activeProposals: proposals.filter((p) => p.status === "ACTIVE").length,
        passedProposals: proposals.filter((p) => p.status === "PASSED").length,
        rejectedProposals: proposals.filter((p) => p.status === "REJECTED").length,
      },
    });
  } catch (err) {
    console.error("[transparency/proposals] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch governance proposals", cached: true },
      { status: 503 }
    );
  }
}
