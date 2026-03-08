/**
 * Browser-side Supabase client for Dadde's Fund.
 *
 * Uses NEXT_PUBLIC_ env vars so it can be imported in client components.
 * Respects Row-Level Security via the anon key.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _browser: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (_browser) return _browser;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Add them to .env (they must be prefixed NEXT_PUBLIC_ for client-side access)."
    );
  }

  _browser = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return _browser;
}
