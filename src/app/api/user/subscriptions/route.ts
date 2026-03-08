/**
 * GET    /api/user/subscriptions — List current user's subscriptions
 * POST   /api/user/subscriptions — Create a new subscription record
 * PATCH  /api/user/subscriptions — Update a subscription (pause/resume)
 * DELETE /api/user/subscriptions — Cancel a subscription
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, logAuthEvent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const result = await requireAuth(req);
  if (result instanceof NextResponse) return result;

  const supabase = getSupabaseAdmin();
  const status = req.nextUrl.searchParams.get("status"); // optional filter

  let query = supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", result.id)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }

  return NextResponse.json({ subscriptions: data });
}

export async function POST(req: NextRequest) {
  const result = await requireAuth(req);
  if (result instanceof NextResponse) return result;

  let body: {
    wallet_address: string;
    amount: number;
    asset_code?: string;
    asset_scale?: number;
    interval?: string;
    grant_id?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.wallet_address || !body.amount || body.amount <= 0) {
    return NextResponse.json(
      { error: "wallet_address and a positive amount are required" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_subscriptions")
    .insert({
      user_id: result.id,
      wallet_address: body.wallet_address,
      amount: body.amount,
      asset_code: body.asset_code ?? "USD",
      asset_scale: body.asset_scale ?? 2,
      interval: body.interval ?? "P1M",
      grant_id: body.grant_id ?? null,
      status: "active",
      next_payment_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create subscription: " + error.message },
      { status: 500 }
    );
  }

  await logAuthEvent("subscription_created", result.id, {
    subscriptionId: data.id,
    amount: body.amount,
    interval: body.interval ?? "P1M",
  });

  return NextResponse.json({ subscription: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const result = await requireAuth(req);
  if (result instanceof NextResponse) return result;

  let body: { id: string; status?: "active" | "paused" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.id) {
    return NextResponse.json(
      { error: "Subscription id is required" },
      { status: 400 }
    );
  }

  const validStatuses = ["active", "paused"];
  if (body.status && !validStatuses.includes(body.status)) {
    return NextResponse.json(
      { error: "Status must be 'active' or 'paused'" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // Verify ownership
  const { data: existing } = await supabase
    .from("user_subscriptions")
    .select("id, user_id, status")
    .eq("id", body.id)
    .single();

  if (!existing || existing.user_id !== result.id) {
    return NextResponse.json(
      { error: "Subscription not found" },
      { status: 404 }
    );
  }

  if (existing.status === "cancelled") {
    return NextResponse.json(
      { error: "Cannot modify a cancelled subscription" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (body.status) updates.status = body.status;

  const { data, error } = await supabase
    .from("user_subscriptions")
    .update(updates)
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }

  await logAuthEvent("subscription_updated", result.id, {
    subscriptionId: body.id,
    newStatus: body.status,
  });

  return NextResponse.json({ subscription: data });
}

export async function DELETE(req: NextRequest) {
  const result = await requireAuth(req);
  if (result instanceof NextResponse) return result;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Subscription id query param is required" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // Verify ownership
  const { data: existing } = await supabase
    .from("user_subscriptions")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!existing || existing.user_id !== result.id) {
    return NextResponse.json(
      { error: "Subscription not found" },
      { status: 404 }
    );
  }

  const { error } = await supabase
    .from("user_subscriptions")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }

  await logAuthEvent("subscription_cancelled", result.id, {
    subscriptionId: id,
  });

  return NextResponse.json({ success: true });
}
