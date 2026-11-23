-- Slice 4 Migration: Beta Unlock, Entry Hook Attribution, & Funnel Telemetry
-- Idempotent migration: safe to run multiple times in Supabase SQL Editor after 001, 002, and 003.

-- 1. Extend blueprints with unlock_source, unlocked_at, unlocked_email_sent_at, entry_hook, utm_source
ALTER TABLE public.blueprints
  ADD COLUMN IF NOT EXISTS unlock_source TEXT,
  ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unlocked_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entry_hook TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT;

ALTER TABLE public.blueprints
  DROP CONSTRAINT IF EXISTS blueprints_unlock_source_check;

ALTER TABLE public.blueprints
  ADD CONSTRAINT blueprints_unlock_source_check
  CHECK (
    unlock_source IN ('beta_free', 'beta_code', 'stripe')
    OR unlock_source IS NULL
  );

ALTER TABLE public.blueprints
  DROP CONSTRAINT IF EXISTS blueprints_entry_hook_check;

ALTER TABLE public.blueprints
  ADD CONSTRAINT blueprints_entry_hook_check
  CHECK (
    entry_hook IN (
      'hard-reset',
      '3-eras',
      'career-audit',
      'love-mirror',
      'self-sabotage',
      'direct'
    )
    OR entry_hook IS NULL
  );

-- 2. Create funnel_events table for end-to-end conversion & willingness-to-pay tracking
CREATE TABLE IF NOT EXISTS public.funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID REFERENCES public.natal_charts(id) ON DELETE SET NULL,
  email TEXT,
  event_name TEXT NOT NULL CHECK (
    event_name IN (
      'landing_view',
      'onboarding_started',
      'chart_calculated',
      'proof_viewed',
      'accuracy_rated',
      'paywall_viewed',
      'paywall_cta_clicked',
      'beta_unlocked',
      'brag_card_shared',
      'birth_time_upgraded'
    )
  ),
  entry_hook TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_name_created
  ON public.funnel_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_funnel_events_entry_hook
  ON public.funnel_events (entry_hook, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_funnel_events_chart_id
  ON public.funnel_events (chart_id)
  WHERE chart_id IS NOT NULL;

-- 3. Lock funnel_events strictly to server service-role key via RLS
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.funnel_events FROM anon, authenticated;
