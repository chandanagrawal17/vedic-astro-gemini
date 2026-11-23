-- Migration 007: Daily Command Center, 3-Day Anti-Repetition Directives, Memory Tags & Decision Logs
-- Idempotent migration: safe to run in Supabase SQL Editor after 001–006.

-- 1. Daily Check-Ins (caches today's bandwidth, rotating directive, memory tags & somatic reset count)
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES public.natal_charts(id) ON DELETE CASCADE,
  blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  bandwidth_score INT NOT NULL CHECK (bandwidth_score >= 0 AND bandwidth_score <= 100),
  tone_status TEXT NOT NULL CHECK (tone_status IN ('GREEN', 'YELLOW', 'RED')),
  directive_id TEXT NOT NULL,
  directive_text TEXT NOT NULL,
  memory_tags TEXT[] NOT NULL DEFAULT '{}',
  somatic_resets_completed INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chart_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_chart_date
  ON public.daily_checkins (chart_id, checkin_date DESC);

DROP TRIGGER IF EXISTS trg_daily_checkins_updated_at ON public.daily_checkins;
CREATE TRIGGER trg_daily_checkins_updated_at
  BEFORE UPDATE ON public.daily_checkins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.daily_checkins FROM anon, authenticated;

-- 2. Decision Logs ("Text or Wait?" filter & 7-Day Focus vs. Pitch Move Audits)
CREATE TABLE IF NOT EXISTS public.decision_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES public.natal_charts(id) ON DELETE CASCADE,
  tool_type TEXT NOT NULL CHECK (tool_type IN ('text_or_wait', 'focus_vs_pitch_audit')),
  input_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  verdict TEXT NOT NULL CHECK (verdict IN ('GREEN', 'YELLOW', 'RED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_logs_chart_created
  ON public.decision_logs (chart_id, created_at DESC);

ALTER TABLE public.decision_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.decision_logs FROM anon, authenticated;

-- 3. Expand funnel_events.event_name CHECK constraint for Daily Command Center events
ALTER TABLE public.funnel_events
  DROP CONSTRAINT IF EXISTS funnel_events_event_name_check;

ALTER TABLE public.funnel_events
  ADD CONSTRAINT funnel_events_event_name_check
  CHECK (
    event_name IN (
      'landing_view',
      'onboarding_started',
      'chart_calculated',
      'proof_viewed',
      'accuracy_rated',
      'rated_love_mirror_accuracy',
      'clicked_locked_monthly_timeline',
      'clicked_locked_career_blueprint',
      'clicked_locked_relationship_guide',
      'paywall_viewed',
      'paywall_cta_clicked',
      'beta_unlocked',
      'brag_card_shared',
      'birth_time_upgraded',
      'daily_command_viewed',
      'daily_memory_tagged',
      'somatic_reset_completed',
      'text_or_wait_checked',
      'focus_calendar_audited'
    )
  );
