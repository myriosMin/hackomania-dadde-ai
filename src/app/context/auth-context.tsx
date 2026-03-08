"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Session, AuthError } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "../../lib/supabase-browser";
import type {
  AppUser,
  Profile,
  DonorPreferences,
  UserRole,
  ProfileUpdate,
  PreferencesUpdate,
} from "../../lib/types/user";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface AuthContextType {
  /** Current authenticated user (null while loading or logged-out) */
  user: AppUser | null;
  /** Raw Supabase session (for token access in API calls) */
  session: Session | null;
  /** True while the initial session is being resolved */
  loading: boolean;
  /** Whether a user is currently authenticated */
  isAuthenticated: boolean;
  /** Whether the current user has the admin role */
  isAdmin: boolean;
  /** User's donor preferences (loaded after auth) */
  preferences: DonorPreferences | null;

  // Auth actions
  login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signup: (
    email: string,
    password: string,
    metadata?: { display_name?: string; wallet_address?: string }
  ) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<void>;

  // Profile actions
  updateProfile: (updates: ProfileUpdate) => Promise<{ error: string | null }>;
  updatePreferences: (updates: PreferencesUpdate) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Helper: map DB profile row → AppUser
// ---------------------------------------------------------------------------
function profileToAppUser(p: Profile): AppUser {
  return {
    id: p.id,
    email: p.email ?? "",
    displayName: p.display_name,
    avatarUrl: p.avatar_url,
    role: p.role as UserRole,
    walletAddress: p.wallet_address,
    isLeaderboardVisible: p.is_leaderboard_visible,
    phone: p.phone,
    bio: p.bio ?? "",
    notificationEmail: p.notification_email,
    notificationPush: p.notification_push,
    createdAt: p.created_at,
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [preferences, setPreferences] = useState<DonorPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = getSupabaseBrowser();

  // ── Fetch profile + preferences from Supabase ──────────────────────────
  const fetchProfile = useCallback(
    async (userId: string) => {
      const [profileRes, prefsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase
          .from("donor_preferences")
          .select("*")
          .eq("user_id", userId)
          .single(),
      ]);

      if (profileRes.data) {
        setUser(profileToAppUser(profileRes.data as Profile));
      }
      if (prefsRes.data) {
        setPreferences(prefsRes.data as DonorPreferences);
      }
    },
    [supabase]
  );

  // ── Listen for auth state changes ──────────────────────────────────────
  useEffect(() => {
    // Get existing session on mount
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        fetchProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Subscribe to future changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setUser(null);
        setPreferences(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  // ── Auth actions ─────────────────────────────────────────────────────────

  const login = async (
    email: string,
    password: string
  ): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signup = async (
    email: string,
    password: string,
    metadata?: { display_name?: string; wallet_address?: string }
  ): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata, // stored in auth.users.raw_user_meta_data → used by handle_new_user trigger
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    return { error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPreferences(null);
    setSession(null);
  };

  // ── Profile / preference mutations ──────────────────────────────────────

  const updateProfile = async (
    updates: ProfileUpdate
  ): Promise<{ error: string | null }> => {
    if (!user) return { error: "Not authenticated" };
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);
    if (error) return { error: error.message };
    await fetchProfile(user.id);
    return { error: null };
  };

  const updatePreferences = async (
    updates: PreferencesUpdate
  ): Promise<{ error: string | null }> => {
    if (!user) return { error: "Not authenticated" };
    const { error } = await supabase
      .from("donor_preferences")
      .update(updates)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    await fetchProfile(user.id);
    return { error: null };
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  // ── Provide context ────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        preferences,
        login,
        signup,
        logout,
        updateProfile,
        updatePreferences,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
