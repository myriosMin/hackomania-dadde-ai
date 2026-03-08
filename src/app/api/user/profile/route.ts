/**
 * GET  /api/user/profile — Get current user's profile
 * PATCH /api/user/profile — Update current user's profile
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, logAuthEvent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { ProfileUpdate } from "@/lib/types/user";

export async function GET(req: NextRequest) {
  const result = await requireAuth(req);
  if (result instanceof NextResponse) return result;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", result.id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ profile: data });
}

export async function PATCH(req: NextRequest) {
  const result = await requireAuth(req);
  if (result instanceof NextResponse) return result;

  let body: ProfileUpdate;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Whitelist allowed fields (prevent role escalation)
  const allowed: (keyof ProfileUpdate)[] = [
    "display_name",
    "avatar_url",
    "wallet_address",
    "is_leaderboard_visible",
    "phone",
    "bio",
    "notification_email",
    "notification_push",
  ];

  const sanitized: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) {
      sanitized[k] = body[k];
    }
  }

  if (Object.keys(sanitized).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .update(sanitized)
    .eq("id", result.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to update profile: " + error.message },
      { status: 500 }
    );
  }

  await logAuthEvent("profile_updated", result.id, {
    fields: Object.keys(sanitized),
  });

  return NextResponse.json({ profile: data });
}
