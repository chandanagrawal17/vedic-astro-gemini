-- Migration 005: Hard Reset & Career Hook v2 Precision Upgrade
-- Idempotent migration: safe to run in Supabase SQL Editor after 001–004.

-- 1. Extend blueprints with flashpoint confirmation, saved alternative lanes, and engine versions
ALTER TABLE public.blueprints
  ADD COLUMN IF NOT EXISTS confirmed_flashpoint_ids TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hard_reset_engine_version TEXT DEFAULT 'v2_tiered_yearly_to_monthly',
  ADD COLUMN IF NOT EXISTS saved_alternative_lanes TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS career_hook_engine_version TEXT DEFAULT 'v2_friendly_mentor_tiered';

-- 2. Expand profiles.career_mode CHECK constraint to include 5 canonical modes + legacy aliases
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_career_mode_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_career_mode_check
  CHECK (
    career_mode IN (
      'employed',
      'employed_hybrid',
      'founder',
      'freelance_hybrid',
      'in_transition',
      'freelance',
      'transition'
    )
  );

-- 3. Expand funnel_events.event_name CHECK constraint for locked hook CTA clicks
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
      'clicked_locked_monthly_timeline',
      'clicked_locked_career_blueprint',
      'paywall_viewed',
      'paywall_cta_clicked',
      'beta_unlocked',
      'brag_card_shared',
      'birth_time_upgraded'
    )
  );
