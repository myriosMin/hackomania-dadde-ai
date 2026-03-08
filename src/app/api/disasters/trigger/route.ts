/**
 * POST /api/disasters/trigger
 *
 * Demo endpoint that runs the FULL AI pipeline for a disaster scenario:
 *
 *  1. DisasterVerifier agent: verifies the disaster via GDACS / USGS / ReliefWeb / Google Search
 *  2. Inserts the verified disaster into ClickHouse
 *  3. Auto-creates a demo claim for that disaster
 *  4. ClaimRecommender agent: evaluates the claim against community rules
 *  5. Updates the claim with full AI metadata → appears in admin inbox for instant payout
 *
 * This showcases the end-to-end Verifier → Recommender → Admin Payout pipeline.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, type AuthenticatedUser } from "@/lib/auth";
import { chQuery, chWrite } from "@/lib/clickhouse";
import crypto from "crypto";

export const runtime = "nodejs";

const AGENT_URL = process.env.AGENT_URL ?? "http://localhost:8000";

interface TriggerBody {
  name: string;
  type: string;
  severity: number;
  region: string;
  country: string;
  description: string;
  /** Optional: custom claim text. If omitted a realistic demo claim is generated. */
  claimDescription?: string;
  /** Optional: wallet address for the demo claimant */
  walletAddress?: string;
}

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;
  const admin = authResult as AuthenticatedUser;

  let body: TriggerBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, type, severity, region, country, description } = body;
  if (!name || !type || !region) {
    return NextResponse.json(
      { error: "name, type, and region are required" },
      { status: 400 }
    );
  }

  const now = () => new Date().toISOString().replace("T", " ").slice(0, 19);

  // ── Step 0: Deduplicate ──────────────────────────────────────────────────
  const existing = await chQuery<{ id: string }>(
    `SELECT id FROM disaster_events ` +
      `WHERE name = '${name.replace(/'/g, "\\'")}' ` +
      `AND started_at >= now() - INTERVAL 7 DAY LIMIT 1`
  );
  if (existing.length > 0) {
    return NextResponse.json(
      {
        error: "A disaster with this name already exists in the last 7 days",
        existingId: existing[0].id,
      },
      { status: 409 }
    );
  }

  // ── Step 1: Run Disaster Verifier Agent ──────────────────────────────────
  let verification: Record<string, unknown> = {};
  let verifierText = "";

  try {
    const verifyRes = await fetch(`${AGENT_URL}/verify-disaster`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        disaster_description: `${name}: ${description}`,
        disaster_type: type,
        region: region,
      }),
    });

    if (!verifyRes.ok) {
      throw new Error(`Verifier agent returned ${verifyRes.status}`);
    }

    const verifyData = await verifyRes.json();
    verification = {
      disaster_verified: verifyData.disaster_verified ?? false,
      confidence: verifyData.confidence ?? 0,
      reasoning: verifyData.reasoning ?? "",
      sources_checked: verifyData.sources_checked ?? [],
      disaster_details: verifyData.disaster_details ?? {},
    };
    verifierText = verifyData.agent_text ?? "";
  } catch (err) {
    console.error("[trigger] Verifier agent failed:", err);
    // Continue anyway for demo — insert as unverified
    verification = {
      disaster_verified: false,
      confidence: 0,
      reasoning: `Verifier agent error: ${err instanceof Error ? err.message : String(err)}`,
      sources_checked: [],
      disaster_details: {},
    };
  }

  // ── Step 2: Insert disaster into ClickHouse ──────────────────────────────
  const disasterId = crypto.randomUUID();

  await chWrite("INSERT INTO disaster_events", [
    {
      id: disasterId,
      name,
      type: type.toUpperCase(),
      severity: Math.min(Math.max(severity ?? 5, 1), 10),
      region,
      country: country ?? "",
      status: "ACTIVE",
      description: description ?? "",
      source: verification.disaster_verified
        ? `AI_VERIFIED (${(verification.sources_checked as string[]).join(", ")})`
        : "DEMO_TRIGGER",
      started_at: now(),
      created_at: now(),
    },
  ]);

  // ── Step 3: Create a demo claim for this disaster ────────────────────────
  const claimId = crypto.randomUUID();
  const demoClaimDescription =
    body.claimDescription ??
    `I am affected by the ${name} in ${region}${country ? `, ${country}` : ""}. ` +
      `My home has been severely damaged and I need immediate relief assistance ` +
      `for temporary shelter, food supplies, and medical needs for my family of 4.`;

  const claimantIdHash = crypto
    .createHash("sha256")
    .update(`demo-claimant-${admin.id}`)
    .digest("hex")
    .slice(0, 16);
  const walletHash = crypto
    .createHash("sha256")
    .update(body.walletAddress ?? "https://ilp.interledger-test.dev/demo-claimant")
    .digest("hex")
    .slice(0, 16);

  await chWrite("INSERT INTO claims", [
    {
      id: claimId,
      claimant_id_hash: claimantIdHash,
      claimant_wallet_hash: walletHash,
      disaster_event_id: disasterId,
      description: demoClaimDescription,
      image_url: null,
      status: "AI_REVIEWING",
      created_at: now(),
      updated_at: now(),
    },
  ]);

  // ── Step 4: Run Claim Recommender Agent ──────────────────────────────────
  let recommendation: Record<string, unknown> = {};
  let recommenderText = "";
  let finalStatus = "ESCALATED";

  try {
    const evalRes = await fetch(`${AGENT_URL}/evaluate-claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claim_id: claimId,
        claim_description: demoClaimDescription,
        disaster_description: `${name}: ${description}`,
        disaster_type: type,
        region: region,
        disaster_id: disasterId,
      }),
    });

    if (!evalRes.ok) {
      throw new Error(`Evaluator agent returned ${evalRes.status}`);
    }

    const evalData = await evalRes.json();
    // The evaluate-claim endpoint runs the full pipeline (verifier + recommender)
    // but we already have verification from step 1, so use the recommender output
    recommendation = evalData.recommendation ?? {};
    recommenderText = evalData.agent_text ?? "";

    // Merge the independent verification from step 1 with the pipeline's
    if (evalData.verification) {
      verification = { ...verification, ...evalData.verification };
    }

    // Determine claim status
    const decision = recommendation.decision as string;
    const confidence = (recommendation.confidence_score as number) ?? 0;

    let minConfidence = 0.85;
    try {
      const rules = await chQuery<{ min_ai_confidence: number }>(
        "SELECT min_ai_confidence FROM community_rules FINAL ORDER BY version DESC LIMIT 1"
      );
      if (rules.length > 0) minConfidence = rules[0].min_ai_confidence;
    } catch {
      /* use default */
    }

    if (decision === "RECOMMEND_APPROVE" && confidence >= minConfidence) {
      finalStatus = "PENDING_HUMAN_APPROVAL";
    } else if (decision === "RECOMMEND_DENY") {
      finalStatus = "DENIED_BY_AI";
    } else if (decision === "RECOMMEND_ESCALATE") {
      finalStatus = "ESCALATED";
    } else {
      finalStatus = "NEEDS_REVIEW";
    }
  } catch (err) {
    console.error("[trigger] Evaluator agent failed:", err);
    finalStatus = "ESCALATED";
    recommendation = {
      decision: "RECOMMEND_ESCALATE",
      confidence_score: 0,
      reasoning: `Recommender agent error: ${err instanceof Error ? err.message : String(err)}`,
      risk_flags: ["agent_error"],
      matched_rules: [],
      suggested_payout: 0,
    };
  }

  // ── Step 5: Update claim with full AI results ────────────────────────────
  const recDecision = (recommendation.decision as string) ?? null;
  const recConfidence = (recommendation.confidence_score as number) ?? null;

  await chWrite(
    `ALTER TABLE claims UPDATE ` +
      `status = '${finalStatus}', ` +
      `ai_recommendation = ${recDecision ? `'${recDecision}'` : "NULL"}, ` +
      `ai_recommendation_confidence = ${recConfidence ?? "NULL"}, ` +
      `payout_amount = ${(recommendation.suggested_payout as number) ?? "NULL"}, ` +
      `metadata = '${JSON.stringify({
        verification,
        recommendation,
        verifier_text: verifierText,
        recommender_text: recommenderText,
      }).replace(/'/g, "\\'")}', ` +
      `updated_at = now() ` +
      `WHERE id = '${claimId}'`
  );

  // Log event
  await chWrite("INSERT INTO events_log", [
    {
      id: crypto.randomUUID(),
      event_type: "DEMO_FULL_PIPELINE",
      service: "admin",
      payload: JSON.stringify({
        disasterId,
        claimId,
        disasterName: name,
        verified: verification.disaster_verified,
        aiDecision: recDecision,
        finalStatus,
      }),
      created_at: now(),
    },
  ]);

  return NextResponse.json({
    message: `Pipeline complete! Disaster "${name}" verified and claim created.`,
    pipeline: {
      disaster: {
        id: disasterId,
        name,
        verified: verification.disaster_verified,
        verifierConfidence: verification.confidence,
        sourcesChecked: verification.sources_checked,
        verifierReasoning: verification.reasoning,
      },
      claim: {
        id: claimId,
        status: finalStatus,
        aiDecision: recDecision,
        aiConfidence: recConfidence,
        suggestedPayout: recommendation.suggested_payout ?? 0,
        reasoning: recommendation.reasoning ?? "",
        riskFlags: recommendation.risk_flags ?? [],
        matchedRules: recommendation.matched_rules ?? [],
      },
    },
    agentText: {
      verifier: verifierText,
      recommender: recommenderText,
    },
  });
}
