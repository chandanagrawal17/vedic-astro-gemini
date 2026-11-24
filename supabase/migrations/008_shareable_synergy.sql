-- Migration 008: Shareable Synergy Links (Item 7, Part B)
-- Idempotent migration: safe to run in Supabase SQL Editor after 001–007.

CREATE TABLE IF NOT EXISTS public.synergy_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token TEXT UNIQUE NOT NULL,
  owner_chart_id UUID NOT NULL REFERENCES public.natal_charts(id) ON DELETE CASCADE,
  partner_chart_id UUID REFERENCES public.natal_charts(id) ON DELETE SET NULL,
  relationship_context TEXT NOT NULL DEFAULT 'romantic' CHECK (
    relationship_context IN ('romantic', 'close_friend', 'creative_partner')
  ),
  owner_display_name TEXT NOT NULL,
  owner_vibe_line TEXT,
  partner_display_name TEXT,
  precision_mode TEXT NOT NULL DEFAULT 'exact' CHECK (
    precision_mode IN ('exact', 'approx_window', 'date_only')
  ),
  synergy_json JSONB,
  engine_version TEXT NOT NULL DEFAULT 'synergy_v1',
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_synergy_links_share_token
  ON public.synergy_links (share_token);

CREATE INDEX IF NOT EXISTS idx_synergy_links_owner_chart
  ON public.synergy_links (owner_chart_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_synergy_links_updated_at ON public.synergy_links;
CREATE TRIGGER trg_synergy_links_updated_at
  BEFORE UPDATE ON public.synergy_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.synergy_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.synergy_links FROM anon, authenticated;

-- Expand funnel_events.event_name CHECK constraint for Shareable Synergy events
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
      'focus_calendar_audited',
      'synergy_link_created',
      'synergy_invite_viewed',
      'synergy_compared'
    )
  );
