/**
 * Supabase client singleton for Dadde's Fund.
 *
 * Used for OLTP user data (profiles, auth, donor preferences).
 * ClickHouse remains the analytics / audit-trail store.
 *
 * Three exports:
 *   - supabase          — anon-key client (safe for browser-side / RLS-protected)
 *   - supabaseAdmin     — service-role client (server-only, bypasses RLS)
 *   - Database type      — generated from Supabase schema for type safety
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config";

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

let _anon: SupabaseClient | null = null;
let _admin: SupabaseClient | null = null;

/**
 * Public / anon-key Supabase client.
 * Respects Row-Level Security and is safe to expose client-side.
 */
export function getSupabase(): SupabaseClient {
  if (_anon) return _anon;
  _anon = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  return _anon;
}

/**
 * Service-role Supabase client (server-only).
 * Bypasses RLS — use only in API Route Handlers, never client-side.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  _admin = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _admin;
}
