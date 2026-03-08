/**
 * POST /api/claims/submit
 *
 * Step 6 — Core Workflow: Submit a disaster relief claim.
 *
 * Flow:
 *   1. Validate inputs (description, disaster event, wallet address).
 *   2. Insert claim into ClickHouse with status = SUBMITTED.
 *   3. Update status to AI_REVIEWING.
 *   4. Call the Python agent pipeline: DisasterVerifier → ClaimRecommender.
 *   5. Update claim with AI results and final workflow status.
 *
 * The AI never executes payouts — all approved claims wait for admin approval.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, type AuthenticatedUser } from "@/lib/auth";
import { chWrite, chQuery } from "@/lib/clickhouse";
import crypto from "crypto";

export const runtime = "nodejs";

const AGENT_URL = process.env.AGENT_URL ?? "http://localhost:8000";

interface ClaimSubmitBody {
  description: string;
  disasterEventId: string;
  walletAddress: string;
  imageUrl?: string;
}

export async function POST(req: NextRequest) {
  // Auth check
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult as AuthenticatedUser;

  let body: ClaimSubmitBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate inputs
  const errors: string[] = [];
  if (!body.description || body.description.length > 2000) {
    errors.push("description is required and must be ≤ 2000 chars");
  }
  if (!body.disasterEventId) {
    errors.push("disasterEventId is required");
  }
  if (!body.walletAddress) {
    errors.push("walletAddress is required");
  }
  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const claimId = crypto.randomUUID();
  const claimantIdHash = crypto
    .createHash("sha256")
    .update(user.id)
    .digest("hex")
    .slice(0, 16);
  const walletHash = crypto
    .createHash("sha256")
    .update(body.walletAddress)
    .digest("hex")
    .slice(0, 16);
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  // 1. Insert claim with SUBMITTED status
  const insertResult = await chWrite("INSERT INTO claims", [
    {
      id: claimId,
      claimant_id_hash: claimantIdHash,
      claimant_wallet_hash: walletHash,
      disaster_event_id: body.disasterEventId,
      description: body.description,
      image_url: body.imageUrl ?? null,
      status: "SUBMITTED",
      created_at: now,
      updated_at: now,
    },
  ]);

  if (!insertResult.ok) {
    return NextResponse.json(
      { error: "Failed to store claim", detail: insertResult.error },
      { status: 503 }
    );
  }

  // 2. Update to AI_REVIEWING
  await chWrite(
    `ALTER TABLE claims UPDATE status = 'AI_REVIEWING', updated_at = now() WHERE id = '${claimId}'`
  );

  // Log event
  await chWrite("INSERT INTO events_log", [
    {
      id: crypto.randomUUID(),
      event_type: "CLAIM_SUBMITTED",
      service: "claims",
      payload: JSON.stringify({ claim_id: claimId, user_id: claimantIdHash }),
      created_at: now,
    },
  ]);

  // 3. Fetch disaster event info for context
  let disasterDescription = "";
  let disasterType = "";
  let region = "";
  try {
    const disasters = await chQuery<{
      name: string;
      type: string;
      region: string;
      country: string;
      description: string;
    }>(
      `SELECT name, type, region, country, description FROM disaster_events WHERE id = '${body.disasterEventId}' LIMIT 1`
    );
    if (disasters.length > 0) {
      const d = disasters[0];
      disasterDescription = `${d.name}: ${d.description}`;
      disasterType = d.type;
      region = d.region || d.country;
    }
  } catch {
    // Non-blocking — agent will still try to verify
  }

  // 4. Call the Python agent pipeline
  let verification: Record<string, unknown> = {};
  let recommendation: Record<string, unknown> = {};
  let agentText = "";
  let aiStatus = "ESCALATED"; // Default if agent fails

  try {
    const agentRes = await fetch(`${AGENT_URL}/evaluate-claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim_id: claimId,
        claim_description: body.description,
        disaster_description: disasterDescription,
        disaster_type: disasterType,
        region: region,
        disaster_id: body.disasterEventId,
      }),
    });

    if (!agentRes.ok) {
      throw new Error(`Agent returned ${agentRes.status}`);
    }

    const agentData = await agentRes.json();
    verification = agentData.verification ?? {};
    recommendation = agentData.recommendation ?? {};
    agentText = agentData.agent_text ?? "";

    // Determine claim status based on recommendation
    const decision = recommendation.decision as string;
    const confidence = (recommendation.confidence_score as number) ?? 0;

    // Load community rules for threshold
    let minConfidence = 0.85;
    try {
      const rules = await chQuery<{ min_ai_confidence: number }>(
        "SELECT min_ai_confidence FROM community_rules FINAL ORDER BY version DESC LIMIT 1"
      );
      if (rules.length > 0) {
        minConfidence = rules[0].min_ai_confidence;
      }
    } catch {
      // Use default
    }

    if (decision === "RECOMMEND_APPROVE" && confidence >= minConfidence) {
      aiStatus = "PENDING_HUMAN_APPROVAL";
    } else if (decision === "RECOMMEND_DENY") {
      aiStatus = "DENIED_BY_AI";
    } else if (decision === "RECOMMEND_ESCALATE") {
      aiStatus = "ESCALATED";
    } else {
      aiStatus = "NEEDS_REVIEW";
    }
  } catch (err) {
    console.error("[claims/submit] Agent call failed:", err);
    aiStatus = "ESCALATED";

    // Log error
    await chWrite("INSERT INTO events_log", [
      {
        id: crypto.randomUUID(),
        event_type: "AI_ERROR",
        service: "claims",
        payload: JSON.stringify({
          claim_id: claimId,
          error: err instanceof Error ? err.message : String(err),
        }),
        created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
      },
    ]);
  }

  // 5. Update claim with AI results
  const recDecision = (recommendation.decision as string) ?? null;
  const recConfidence = (recommendation.confidence_score as number) ?? null;

  await chWrite(
    `ALTER TABLE claims UPDATE ` +
      `status = '${aiStatus}', ` +
      `ai_recommendation = ${recDecision ? `'${recDecision}'` : "NULL"}, ` +
      `ai_recommendation_confidence = ${recConfidence ?? "NULL"}, ` +
      `payout_amount = ${(recommendation.suggested_payout as number) ?? "NULL"}, ` +
      `metadata = '${JSON.stringify({
        verification: verification,
        recommendation: recommendation,
        agent_text: agentText,
      }).replace(/'/g, "\\'")}', ` +
      `updated_at = now() ` +
      `WHERE id = '${claimId}'`
  );

  return NextResponse.json({
    claimId,
    status: aiStatus,
    verification: {
      disaster_verified: verification.disaster_verified ?? false,
      confidence: verification.confidence ?? 0,
      sources_checked: verification.sources_checked ?? [],
    },
    recommendation: {
      decision: recDecision,
      confidence_score: recConfidence,
      reasoning: recommendation.reasoning ?? "",
      risk_flags: recommendation.risk_flags ?? [],
      suggested_payout: recommendation.suggested_payout ?? 0,
    },
  });
}
