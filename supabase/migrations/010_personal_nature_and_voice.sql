-- Migration 010: Personal Nature Tab v2 & Global Elder-Mentor Voice Architecture
-- Idempotent migration: safe to run in Supabase SQL Editor after 001–009.

-- 1. Global Voice & Tone Registry (Single Source of Truth in DB)
CREATE TABLE IF NOT EXISTS public.app_voice_profiles (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  system_persona TEXT NOT NULL,
  rules JSONB NOT NULL,
  banned_astro_terms JSONB NOT NULL,
  banned_robotic_terms JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only one active default voice profile at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_voice_profile
  ON public.app_voice_profiles (is_active)
  WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS trg_app_voice_profiles_updated_at ON public.app_voice_profiles;
CREATE TRIGGER trg_app_voice_profiles_updated_at
  BEFORE UPDATE ON public.app_voice_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed canonical elder_mentor_v1 profile as active
UPDATE public.app_voice_profiles
SET is_active = FALSE
WHERE id <> 'elder_mentor_v1' AND is_active = TRUE;

INSERT INTO public.app_voice_profiles (
  id,
  label,
  is_active,
  system_persona,
  rules,
  banned_astro_terms,
  banned_robotic_terms
)
VALUES (
  'elder_mentor_v1',
  'Warm Kitchen-Table Elder Mentor (v1)',
  TRUE,
  'You are a warm, deeply empathetic mentor—like a wise, loving elder family member sitting across the kitchen table over a cup of tea. You speak with quiet affection, steadiness, and gentle honesty. You always see the good heart and protective care behind someone''s habits, and you never judge, lecture, diagnose, or talk down.',
  jsonb_build_array(
    'Empathy First, Truth Second: Always validate the protective reason or caring intention behind a habit before softly naming the blind spot.',
    'Kitchen-Table English: Write the way a loving human mentor talks aloud. Use short, breathable sentences and natural contractions (you''re, don''t, isn''t, let''s).',
    'Zero Astrology or Esoteric Jargon: Never output planet names, zodiac signs, house numbers, Sanskrit terms, Ayurvedic dosha/guna labels, or cosmic phrasing.',
    'Zero Corporate, Tech, or Clinical Buzzwords: Never use mechanical, diagnostic, or consultant buzzwords.',
    'No Medical or Fatalistic Claims: Never diagnose health conditions, predict doom, or imply fixed destiny. Frame every insight around self-awareness and gentle choice.',
    'Stack, Don''t Flatten: Synthesize at least two contrasting layers (e.g., outer capability vs. inner tenderness, strength vs. quiet toll) so every insight feels deeply personal rather than generic.'
  ),
  jsonb_build_array(
    'astrology', 'horoscope', 'vedic', 'jyotish', 'lagna', 'ascendant',
    'moon', 'sun', 'mars', 'venus', 'mercury', 'jupiter', 'saturn', 'rahu', 'ketu',
    'nakshatra', 'dasha', 'mahadasha', 'antardasha', 'dosha', 'pitta', 'vata', 'kapha',
    'guna', 'sattva', 'rajas', 'tamas', 'karma', 'kundali', 'arudha', 'navamsha', 'dashamsha',
    'sade sati', 'dhaiya', 'transit', 'numerology', 'life path number',
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
    '1st house', '2nd house', '3rd house', '4th house', '5th house', '6th house',
    '7th house', '8th house', '9th house', '10th house', '11th house', '12th house'
  ),
  jsonb_build_array(
    'high-voltage', 'bandwidth', 'surgical politeness', 'diagnostic sprints',
    'auditing details', 'internal thermostat', 'nervous system baseline',
    'moving the goalpost', 'moving the goalposts', 'telemetry',
    'operationalize', 'operational mode', 'cognitive battery', 'circuit breaker',
    'optimization', 'over-optimizing', 'optimize', 'synergy', 'pipeline',
    'framework', 'leverage point', 'tactical stance', 'executive state',
    'burnout threshold', 'somatic interrupt', 'neural stillness'
  )
)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  is_active = TRUE,
  system_persona = EXCLUDED.system_persona,
  rules = EXCLUDED.rules,
  banned_astro_terms = EXCLUDED.banned_astro_terms,
  banned_robotic_terms = EXCLUDED.banned_robotic_terms,
  updated_at = NOW();

-- 2. Personal Nature Tells (Per Chart, Category & Unlock Day)
CREATE TABLE IF NOT EXISTS public.personal_nature_tells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES public.natal_charts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (
    category IN ('inside_vs_outside', 'under_pressure', 'blind_spots_and_drive', 'turning_points')
  ),
  tell_id TEXT NOT NULL,
  unlock_day INT NOT NULL CHECK (unlock_day >= 1),
  is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ,
  headline TEXT NOT NULL,
  body TEXT NOT NULL,
  follow_up_pill TEXT NOT NULL,
  accuracy_rating TEXT CHECK (accuracy_rating IN ('uncanny', 'mostly_me', 'not_really')),
  user_reflection TEXT,
  voice_profile_id TEXT NOT NULL REFERENCES public.app_voice_profiles(id),
  precision_mode TEXT NOT NULL CHECK (
    precision_mode IN ('exact', 'approx_window', 'approximate', 'date_only')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chart_id, tell_id)
);

CREATE INDEX IF NOT EXISTS idx_pn_tells_chart_day
  ON public.personal_nature_tells (chart_id, unlock_day, category);

DROP TRIGGER IF EXISTS trg_personal_nature_tells_updated_at ON public.personal_nature_tells;
CREATE TRIGGER trg_personal_nature_tells_updated_at
  BEFORE UPDATE ON public.personal_nature_tells
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. User Memory (Compact insight entries from accuracy ratings & reflections)
CREATE TABLE IF NOT EXISTS public.user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES public.natal_charts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'personal_nature',
  reference_id TEXT NOT NULL,
  memory_tag TEXT NOT NULL,
  note_text TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chart_id, source, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_user_memory_chart
  ON public.user_memory (chart_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_user_memory_updated_at ON public.user_memory;
CREATE TRIGGER trg_user_memory_updated_at
  BEFORE UPDATE ON public.user_memory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Row Level Security (Service-role writes, least-privilege owner reads)
ALTER TABLE public.app_voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_nature_tells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.app_voice_profiles FROM anon, authenticated;
REVOKE ALL ON public.personal_nature_tells FROM anon, authenticated;
REVOKE ALL ON public.user_memory FROM anon, authenticated;

GRANT SELECT ON public.app_voice_profiles TO anon, authenticated;
GRANT SELECT ON public.personal_nature_tells TO authenticated;
GRANT SELECT ON public.user_memory TO authenticated;

DROP POLICY IF EXISTS "Read active voice profile" ON public.app_voice_profiles;
CREATE POLICY "Read active voice profile"
  ON public.app_voice_profiles FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Users read own personal nature tells" ON public.personal_nature_tells;
CREATE POLICY "Users read own personal nature tells"
  ON public.personal_nature_tells FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own user memory" ON public.user_memory;
CREATE POLICY "Users read own user memory"
  ON public.user_memory FOR SELECT
  USING (auth.uid() = user_id);
