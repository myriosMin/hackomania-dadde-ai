/**
 * Hook for making authenticated API calls using the current Supabase session token.
 * Automatically injects the Authorization header.
 */

import { useCallback } from "react";
import { useAuth } from "../app/context/auth-context";

export function useAuthFetch() {
  const { session } = useAuth();

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers);
      if (session?.access_token) {
        headers.set("Authorization", `Bearer ${session.access_token}`);
      }
      headers.set("Content-Type", "application/json");
      return fetch(url, { ...options, headers });
    },
    [session]
  );

  return authFetch;
}
