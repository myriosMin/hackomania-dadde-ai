/**
 * POST /api/claims/[id]/approve
 * POST /api/claims/[id]/reject
 *
 * Admin actions on claims. Only accessible by admin/collector role.
 *
 * Approve: Sets status to APPROVED, does NOT auto-trigger payout.
 *          Admin must separately call /api/payments/payout with the claim details.
 * Reject:  Sets status to DENIED_BY_HUMAN with optional reviewer comment.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, type AuthenticatedUser } from "@/lib/auth";
import { chWrite, chQuery } from "@/lib/clickhouse";
import crypto from "crypto";

export const runtime = "nodejs";

interface ClaimRow {
  id: string;
  status: string;
  ai_recommendation: string | null;
  ai_recommendation_confidence: number | null;
  payout_amount: number | null;
  description: string;
  disaster_event_id: string;
  metadata: string;
}

// GET /api/claims/[id] — fetch a single claim (admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    const claims = await chQuery<ClaimRow>(
      `SELECT id, status, ai_recommendation, ai_recommendation_confidence, ` +
        `payout_amount, description, disaster_event_id, metadata, ` +
        `claimant_id_hash, created_at, updated_at ` +
        `FROM claims WHERE id = '${id}' LIMIT 1`
    );
    if (claims.length === 0) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const claim = claims[0];
    let metadata = {};
    try {
      metadata = JSON.parse(claim.metadata || "{}");
    } catch {
      // keep empty
    }

    return NextResponse.json({ ...claim, metadata });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch claim", detail: String(err) },
      { status: 500 }
    );
  }
}

// POST /api/claims/[id] — approve or reject
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;
  const admin = authResult as AuthenticatedUser;

  const { id } = await params;

  let body: { action: "approve" | "reject"; comment?: string; payoutAmount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!["approve", "reject"].includes(body.action)) {
    return NextResponse.json(
      { error: "action must be 'approve' or 'reject'" },
      { status: 400 }
    );
  }

  // Check claim exists and is in a reviewable state
  const claims = await chQuery<ClaimRow>(
    `SELECT id, status, payout_amount FROM claims WHERE id = '${id}' LIMIT 1`
  );
  if (claims.length === 0) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  const claim = claims[0];
  const reviewableStatuses = [
    "PENDING_HUMAN_APPROVAL",
    "NEEDS_REVIEW",
    "ESCALATED",
    "DENIED_BY_AI",
  ];
  if (!reviewableStatuses.includes(claim.status)) {
    return NextResponse.json(
      { error: `Claim status '${claim.status}' is not reviewable` },
      { status: 409 }
    );
  }

  const reviewerHash = crypto
    .createHash("sha256")
    .update(admin.id)
    .digest("hex")
    .slice(0, 16);
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  if (body.action === "approve") {
    const newStatus = "APPROVED";
    const payoutAmount = body.payoutAmount ?? claim.payout_amount;

    await chWrite(
      `ALTER TABLE claims UPDATE ` +
        `status = '${newStatus}', ` +
        `reviewer_id_hash = '${reviewerHash}', ` +
        `reviewed_at = '${now}', ` +
        `payout_amount = ${payoutAmount ?? "NULL"}, ` +
        `updated_at = now() ` +
        `WHERE id = '${id}'`
    );

    // Log event
    await chWrite("INSERT INTO events_log", [
      {
        id: crypto.randomUUID(),
        event_type: "CLAIM_APPROVED",
        service: "claims",
        payload: JSON.stringify({
          claim_id: id,
          reviewer: reviewerHash,
          payout_amount: payoutAmount,
          comment: body.comment ?? "",
        }),
        created_at: now,
      },
    ]);

    return NextResponse.json({
      claimId: id,
      status: newStatus,
      message:
        "Claim approved. Use /api/payments/payout to execute the payout via Open Payments.",
      payoutAmount,
    });
  } else {
    // Reject
    const newStatus = "DENIED_BY_HUMAN";

    await chWrite(
      `ALTER TABLE claims UPDATE ` +
        `status = '${newStatus}', ` +
        `reviewer_id_hash = '${reviewerHash}', ` +
        `reviewed_at = '${now}', ` +
        `updated_at = now() ` +
        `WHERE id = '${id}'`
    );

    await chWrite("INSERT INTO events_log", [
      {
        id: crypto.randomUUID(),
        event_type: "CLAIM_REJECTED",
        service: "claims",
        payload: JSON.stringify({
          claim_id: id,
          reviewer: reviewerHash,
          comment: body.comment ?? "",
        }),
        created_at: now,
      },
    ]);

    return NextResponse.json({
      claimId: id,
      status: newStatus,
      message: "Claim rejected by admin.",
    });
  }
}
