/**
 * GET   /api/user/preferences — Get current user's donation preferences
 * PATCH /api/user/preferences — Update current user's donation preferences
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, logAuthEvent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { PreferencesUpdate } from "@/lib/types/user";

export async function GET(req: NextRequest) {
  const result = await requireAuth(req);
  if (result instanceof NextResponse) return result;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("donor_preferences")
    .select("*")
    .eq("user_id", result.id)
    .single();

  if (error) {
    // If no preferences exist yet, create default ones
    if (error.code === "PGRST116") {
      const { data: created, error: createError } = await supabase
        .from("donor_preferences")
        .insert({ user_id: result.id })
        .select()
        .single();

      if (createError) {
        return NextResponse.json(
          { error: "Failed to create default preferences" },
          { status: 500 }
        );
      }
      return NextResponse.json({ preferences: created });
    }

    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }

  return NextResponse.json({ preferences: data });
}

export async function PATCH(req: NextRequest) {
  const result = await requireAuth(req);
  if (result instanceof NextResponse) return result;

  let body: PreferencesUpdate;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Whitelist & validate allowed fields
  const allowed: (keyof PreferencesUpdate)[] = [
    "disaster_types",
    "geographic_regions",
    "roundup_limit_per_tx",
    "daily_micro_cap",
    "weekly_micro_cap",
    "monthly_micro_cap",
    "subscription_amount",
    "subscription_interval",
    "auto_route_to_active_disaster",
  ];

  const sanitized: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) {
      sanitized[k] = body[k];
    }
  }

  // Validate numeric fields are non-negative
  const numericFields = [
    "roundup_limit_per_tx",
    "daily_micro_cap",
    "weekly_micro_cap",
    "monthly_micro_cap",
    "subscription_amount",
  ] as const;

  for (const field of numericFields) {
    if (field in sanitized && (typeof sanitized[field] !== "number" || (sanitized[field] as number) < 0)) {
      return NextResponse.json(
        { error: `${field} must be a non-negative number` },
        { status: 400 }
      );
    }
  }

  // Validate disaster_types array
  if (sanitized.disaster_types) {
    if (!Array.isArray(sanitized.disaster_types)) {
      return NextResponse.json(
        { error: "disaster_types must be an array" },
        { status: 400 }
      );
    }
    const validTypes = [
      "ALL", "FLOOD", "EARTHQUAKE", "WILDFIRE", "TYPHOON", "DROUGHT", "TSUNAMI",
    ];
    for (const t of sanitized.disaster_types as string[]) {
      if (!validTypes.includes(t)) {
        return NextResponse.json(
          { error: `Invalid disaster type: ${t}` },
          { status: 400 }
        );
      }
    }
  }

  if (Object.keys(sanitized).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // Upsert: update if exists, create if not
  const { data: existing } = await supabase
    .from("donor_preferences")
    .select("id")
    .eq("user_id", result.id)
    .single();

  let data;
  let error;

  if (existing) {
    const res = await supabase
      .from("donor_preferences")
      .update(sanitized)
      .eq("user_id", result.id)
      .select()
      .single();
    data = res.data;
    error = res.error;
  } else {
    const res = await supabase
      .from("donor_preferences")
      .insert({ user_id: result.id, ...sanitized })
      .select()
      .single();
    data = res.data;
    error = res.error;
  }

  if (error) {
    return NextResponse.json(
      { error: "Failed to update preferences: " + error.message },
      { status: 500 }
    );
  }

  await logAuthEvent("preferences_updated", result.id, {
    fields: Object.keys(sanitized),
  });

  return NextResponse.json({ preferences: data });
}
