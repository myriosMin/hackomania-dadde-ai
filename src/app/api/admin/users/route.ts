/**
 * Admin-only API routes for user management.
 *
 * GET  /api/admin/users          — List all users (with pagination)
 * GET  /api/admin/users?id=<id>  — Get a specific user's full profile
 * PATCH /api/admin/users         — Update a user's role (promote/demote)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAuthEvent } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const supabase = getSupabaseAdmin();
  const userId = req.nextUrl.searchParams.get("id");

  // Single user lookup
  if (userId) {
    const [profileRes, prefsRes, subsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("donor_preferences")
        .select("*")
        .eq("user_id", userId)
        .single(),
      supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    if (profileRes.error) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      profile: profileRes.data,
      preferences: prefsRes.data ?? null,
      subscriptions: subsRes.data ?? [],
    });
  }

  // Paginated user list
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50");
  const role = req.nextUrl.searchParams.get("role");
  const search = req.nextUrl.searchParams.get("search");
  const offset = (page - 1) * limit;

  let query = supabase
    .from("profiles")
    .select("id, display_name, email, role, wallet_address, is_leaderboard_visible, created_at, updated_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (role) {
    query = query.eq("role", role);
  }

  if (search) {
    query = query.or(
      `display_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch users: " + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    users: data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  let body: { user_id: string; role: "user" | "admin" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.user_id || !body.role) {
    return NextResponse.json(
      { error: "user_id and role are required" },
      { status: 400 }
    );
  }

  if (!["user", "admin"].includes(body.role)) {
    return NextResponse.json(
      { error: "Role must be 'user' or 'admin'" },
      { status: 400 }
    );
  }

  // Prevent self-demotion
  if (body.user_id === admin.id && body.role !== "admin") {
    return NextResponse.json(
      { error: "Cannot demote yourself" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .update({ role: body.role })
    .eq("id", body.user_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to update user role: " + error.message },
      { status: 500 }
    );
  }

  await logAuthEvent("role_changed", admin.id, {
    targetUserId: body.user_id,
    newRole: body.role,
    changedBy: admin.id,
  });

  return NextResponse.json({ profile: data });
}
