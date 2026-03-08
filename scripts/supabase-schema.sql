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
--    Roles: 'user' (default donors/receivers) | 'admin' (collectors/moderators)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT NOT NULL DEFAULT '',
  email           TEXT,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'user'
                  CHECK (role IN ('user', 'admin')),
  wallet_address  TEXT,                     -- Open Payments wallet address
  is_leaderboard_visible BOOLEAN NOT NULL DEFAULT false, -- opt-in donor leaderboard
  phone           TEXT,                     -- optional contact number
  bio             TEXT DEFAULT '',          -- short user description
  notification_email BOOLEAN NOT NULL DEFAULT true,  -- email notifications
  notification_push  BOOLEAN NOT NULL DEFAULT false, -- push notifications
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create a profile row + default preferences when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, wallet_address)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'wallet_address'
  );

  INSERT INTO public.donor_preferences (user_id)
  VALUES (NEW.id);

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
  geographic_regions      TEXT[] NOT NULL DEFAULT '{GLOBAL}',
                          -- e.g. {ASIA, EUROPE} or {GLOBAL}
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
-- 3. user_subscriptions — Track Open Payments recurring subscriptions
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  grant_id        TEXT,                     -- Open Payments grant reference
  wallet_address  TEXT NOT NULL,            -- donor wallet used for this subscription
  amount          NUMERIC(18,4) NOT NULL,   -- pledge amount per interval
  asset_code      TEXT NOT NULL DEFAULT 'USD',
  asset_scale     INT NOT NULL DEFAULT 2,
  interval        TEXT NOT NULL DEFAULT 'P1M', -- ISO 8601 duration
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  next_payment_at TIMESTAMPTZ,
  last_payment_at TIMESTAMPTZ,
  total_paid      NUMERIC(18,4) NOT NULL DEFAULT 0,
  payment_count   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Row Level Security
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own row
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Profiles: users can update their own row (except role)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Profiles: admins can read all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

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

-- User subscriptions: users manage their own
CREATE POLICY "Users can view own subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON public.user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON public.user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Service role full access to subscriptions"
  ON public.user_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────────────────────
-- 5. updated_at triggers
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

DROP TRIGGER IF EXISTS set_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER set_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Helper function: check if current user is admin
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
