/**
 * Server-side auth helpers for API Route Handlers.
 *
 * Extracts the authenticated Supabase user from the Authorization header,
 * validates the JWT, and optionally enforces role-based access.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "./supabase";
import { getClickHouseClient } from "./clickhouse";
import type { UserRole } from "./types/user";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Extract and validate the authenticated user from a request.
 * Returns null if not authenticated.
 */
export async function getAuthUser(
  req: NextRequest
): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const supabase = getSupabaseAdmin();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;

  // Fetch role from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? "",
    role: (profile?.role as UserRole) ?? "user",
  };
}

/**
 * Require authentication. Returns a 401 response if not authenticated,
 * otherwise returns the authenticated user.
 */
export async function requireAuth(
  req: NextRequest
): Promise<AuthenticatedUser | NextResponse> {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }
  return user;
}

/**
 * Require a specific role. Returns a 403 response if the user doesn't have
 * the required role.
 */
export async function requireRole(
  req: NextRequest,
  role: UserRole
): Promise<AuthenticatedUser | NextResponse> {
  const result = await requireAuth(req);
  if (result instanceof NextResponse) return result;

  if (result.role !== role) {
    return NextResponse.json(
      { error: `Requires ${role} role` },
      { status: 403 }
    );
  }
  return result;
}

/**
 * Require admin role specifically.
 */
export async function requireAdmin(
  req: NextRequest
): Promise<AuthenticatedUser | NextResponse> {
  return requireRole(req, "admin");
}

/**
 * Log an auth event to ClickHouse events_log table.
 */
export async function logAuthEvent(
  eventType: string,
  userId: string | null,
  details: Record<string, unknown> = {}
) {
  try {
    const ch = getClickHouseClient();
    await ch.insert({
      table: "events_log",
      values: [
        {
          event_id: crypto.randomUUID(),
          event_type: "AUTH",
          source: "auth-api",
          detail: JSON.stringify({ type: eventType, userId, ...details }),
          created_at: new Date().toISOString().replace("T", " ").slice(0, 23),
        },
      ],
      format: "JSONEachRow",
    });
  } catch (err) {
    console.error("[logAuthEvent] ClickHouse write failed:", err);
  }
}
