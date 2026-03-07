-- ============================================================================
-- Supabase (Postgres) Schema — Dadde's Fund
-- ============================================================================
-- Run this in the Supabase SQL Editor or via supabase db push.
-- These tables handle OLTP user data, auth, and donor preferences.
-- Analytics / audit data lives in ClickHouse (see scripts/migrate-clickhouse.ts).
-- ============================================================================

-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────────────────────
-- 1. profiles — Extended user info linked to Supabase Auth (auth.users)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT NOT NULL DEFAULT '',
  email           TEXT,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'donor'
                  CHECK (role IN ('donor', 'collector', 'receiver', 'admin')),
  wallet_address  TEXT,                     -- Open Payments wallet address
  is_leaderboard_visible BOOLEAN NOT NULL DEFAULT false, -- opt-in donor leaderboard
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create a profile row when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────────────────────
-- 2. donor_preferences — Configurable donation routing preferences
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.donor_preferences (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Disaster type filter
  disaster_types          TEXT[] NOT NULL DEFAULT '{ALL}',
                          -- e.g. {FLOOD, EARTHQUAKE} or {ALL}
  -- Geographic preference
  geographic_region       TEXT NOT NULL DEFAULT 'GLOBAL',
                          -- GLOBAL | ASIA | SOUTHEAST_ASIA | SINGAPORE | specific country
  -- Spending limits
  roundup_limit_per_tx    NUMERIC(18,4) DEFAULT 1.00,     -- max round-up per transaction
  daily_micro_cap         NUMERIC(18,4) DEFAULT 10.00,     -- daily micro-donation cap
  weekly_micro_cap        NUMERIC(18,4) DEFAULT 50.00,
  monthly_micro_cap       NUMERIC(18,4) DEFAULT 200.00,
  subscription_amount     NUMERIC(18,4) DEFAULT 0,         -- 0 = no subscription
  subscription_interval   TEXT DEFAULT 'P1M',              -- ISO 8601 duration
  -- Surge opt-in
  auto_route_to_active_disaster BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Row Level Security
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_preferences ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own, admins/collectors can read all
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Service role can do anything (used by server-side admin client)
CREATE POLICY "Service role full access to profiles"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');

-- Donor preferences: users manage their own
CREATE POLICY "Users can view own preferences"
  ON public.donor_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.donor_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.donor_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to preferences"
  ON public.donor_preferences FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────────────────────
-- 4. updated_at trigger
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_donor_preferences_updated_at ON public.donor_preferences;
CREATE TRIGGER set_donor_preferences_updated_at
  BEFORE UPDATE ON public.donor_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
