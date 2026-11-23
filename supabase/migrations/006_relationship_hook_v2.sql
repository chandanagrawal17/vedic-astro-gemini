-- Migration 006: Relationship Mirror Hook v2 (Single-Branch & Accuracy Feedback)
-- Idempotent migration: safe to run in Supabase SQL Editor after 001–005.

-- 1. Extend blueprints with relationship accuracy feedback and engine version
ALTER TABLE public.blueprints
  ADD COLUMN IF NOT EXISTS love_accuracy_feedback TEXT,
  ADD COLUMN IF NOT EXISTS relationship_hook_engine_version TEXT DEFAULT 'v2_lovable_single_branch';

ALTER TABLE public.blueprints
  DROP CONSTRAINT IF EXISTS blueprints_love_accuracy_feedback_check;

ALTER TABLE public.blueprints
  ADD CONSTRAINT blueprints_love_accuracy_feedback_check
  CHECK (
    love_accuracy_feedback IN ('weirdly_accurate', 'pretty_close', 'not_really')
    OR love_accuracy_feedback IS NULL
  );

-- 2. Expand profiles.relationship_status CHECK constraint to include 'dating' alongside legacy values
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_relationship_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_relationship_status_check
  CHECK (
    relationship_status IN ('single', 'dating', 'relationship', 'married', 'shifting')
    OR relationship_status IS NULL
  );

-- 3. Expand funnel_events.event_name CHECK constraint for Relationship Mirror events
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
      'birth_time_upgraded'
    )
  );
