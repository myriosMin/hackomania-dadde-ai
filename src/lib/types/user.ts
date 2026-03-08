/**
 * Shared user types for Dadde's Fund.
 * Used across auth context, API routes, and components.
 */

export type UserRole = "user" | "admin";

/** Profile as stored in Supabase `profiles` table */
export interface Profile {
  id: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  role: UserRole;
  wallet_address: string | null;
  is_leaderboard_visible: boolean;
  phone: string | null;
  bio: string;
  notification_email: boolean;
  notification_push: boolean;
  created_at: string;
  updated_at: string;
}

/** Donor preferences as stored in Supabase `donor_preferences` table */
export interface DonorPreferences {
  id: string;
  user_id: string;
  disaster_types: string[];
  geographic_regions: string[];
  roundup_limit_per_tx: number;
  daily_micro_cap: number;
  weekly_micro_cap: number;
  monthly_micro_cap: number;
  subscription_amount: number;
  subscription_interval: string;
  auto_route_to_active_disaster: boolean;
  created_at: string;
  updated_at: string;
}

/** User subscription record from Supabase `user_subscriptions` table */
export interface UserSubscription {
  id: string;
  user_id: string;
  grant_id: string | null;
  wallet_address: string;
  amount: number;
  asset_code: string;
  asset_scale: number;
  interval: string;
  status: "active" | "paused" | "cancelled" | "expired";
  next_payment_at: string | null;
  last_payment_at: string | null;
  total_paid: number;
  payment_count: number;
  created_at: string;
  updated_at: string;
}

/** Combined user data returned by auth context */
export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  walletAddress: string | null;
  isLeaderboardVisible: boolean;
  phone: string | null;
  bio: string;
  notificationEmail: boolean;
  notificationPush: boolean;
  createdAt: string;
}

/** Fields the user can update on their own profile */
export interface ProfileUpdate {
  display_name?: string;
  avatar_url?: string;
  wallet_address?: string;
  is_leaderboard_visible?: boolean;
  phone?: string;
  bio?: string;
  notification_email?: boolean;
  notification_push?: boolean;
}

/** Fields the user can update on their preferences */
export interface PreferencesUpdate {
  disaster_types?: string[];
  geographic_regions?: string[];
  roundup_limit_per_tx?: number;
  daily_micro_cap?: number;
  weekly_micro_cap?: number;
  monthly_micro_cap?: number;
  subscription_amount?: number;
  subscription_interval?: string;
  auto_route_to_active_disaster?: boolean;
}
