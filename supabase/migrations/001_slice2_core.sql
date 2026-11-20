-- Slice 2 Core Schema: Profiles, Cached Natal Charts, and Blueprints
-- Run this in Supabase SQL Editor (or via `supabase db push`).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Shared updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  relationship_status TEXT CHECK (
    relationship_status IN ('single', 'relationship', 'married', 'shifting')
    OR relationship_status IS NULL
  ),
  career_mode TEXT NOT NULL DEFAULT 'employed' CHECK (
    career_mode IN ('employed', 'founder', 'freelance', 'transition')
  ),
  career_field TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Natal Charts (supports anonymous onboarding via session_token, then claims to user_id)
CREATE TABLE IF NOT EXISTS public.natal_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_token TEXT UNIQUE NOT NULL,
  dob DATE NOT NULL,
  tob TEXT, -- nullable HH:MM (24h); null when precision_mode = 'date_only'
  birth_window TEXT CHECK (
    birth_window IN ('morning', 'afternoon', 'evening', 'late_night')
    OR birth_window IS NULL
  ),
  precision_mode TEXT NOT NULL CHECK (
    precision_mode IN ('exact', 'approx_window', 'date_only')
  ),
  birth_city TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  tz DOUBLE PRECISION NOT NULL,
  moon_boundary_flag BOOLEAN NOT NULL DEFAULT FALSE,
  raw_astro_json JSONB NOT NULL,
  normalized_chart_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_natal_charts_user_id ON public.natal_charts(user_id);
CREATE INDEX IF NOT EXISTS idx_natal_charts_session_token ON public.natal_charts(session_token);
CREATE INDEX IF NOT EXISTS idx_natal_charts_cache_lookup
  ON public.natal_charts(dob, tob, precision_mode, lat, lon, tz);

DROP TRIGGER IF EXISTS trg_natal_charts_updated_at ON public.natal_charts;
CREATE TRIGGER trg_natal_charts_updated_at
  BEFORE UPDATE ON public.natal_charts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Blueprints (Hook proof payload + Full blueprint payload, gated by is_paid)
CREATE TABLE IF NOT EXISTS public.blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES public.natal_charts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_token TEXT UNIQUE NOT NULL,
  hook_proof_json JSONB NOT NULL,
  full_blueprint_json JSONB NOT NULL,
  hard_reset_feedback TEXT CHECK (
    hard_reset_feedback IN ('scarily_accurate', 'partially_true', 'not_quite')
    OR hard_reset_feedback IS NULL
  ),
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  unlock_tier TEXT CHECK (
    unlock_tier IN ('one_time_19', 'annual_39')
    OR unlock_tier IS NULL
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blueprints_chart_id ON public.blueprints(chart_id);
CREATE INDEX IF NOT EXISTS idx_blueprints_user_id ON public.blueprints(user_id);
CREATE INDEX IF NOT EXISTS idx_blueprints_session_token ON public.blueprints(session_token);

DROP TRIGGER IF EXISTS trg_blueprints_updated_at ON public.blueprints;
CREATE TRIGGER trg_blueprints_updated_at
  BEFORE UPDATE ON public.blueprints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.natal_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users select own profile" ON public.profiles;
CREATE POLICY "Users select own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Natal Charts policies (anonymous writes/reads happen strictly via server Service Role)
DROP POLICY IF EXISTS "Users select own natal charts" ON public.natal_charts;
CREATE POLICY "Users select own natal charts"
  ON public.natal_charts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own natal charts" ON public.natal_charts;
CREATE POLICY "Users insert own natal charts"
  ON public.natal_charts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own natal charts" ON public.natal_charts;
CREATE POLICY "Users update own natal charts"
  ON public.natal_charts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Blueprints policies (server strips full_blueprint_json unless is_paid = true)
DROP POLICY IF EXISTS "Users select own blueprints" ON public.blueprints;
CREATE POLICY "Users select own blueprints"
  ON public.blueprints FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own blueprints" ON public.blueprints;
CREATE POLICY "Users insert own blueprints"
  ON public.blueprints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own blueprints" ON public.blueprints;
CREATE POLICY "Users update own blueprints"
  ON public.blueprints FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
