-- Slice 3 Migration: Blueprint Accuracy Feedback, Model Version, and Chart Profile Context
-- Run this in Supabase SQL Editor after 001_slice2_core.sql.

-- 1. Add Slice 3 columns to blueprints
ALTER TABLE public.blueprints
  ADD COLUMN IF NOT EXISTS accuracy_feedback TEXT,
  ADD COLUMN IF NOT EXISTS model_version TEXT;

ALTER TABLE public.blueprints
  DROP CONSTRAINT IF EXISTS blueprints_accuracy_feedback_check;

ALTER TABLE public.blueprints
  ADD CONSTRAINT blueprints_accuracy_feedback_check
  CHECK (
    accuracy_feedback IN ('scarily_accurate', 'close', 'off')
    OR accuracy_feedback IS NULL
  );

-- Ensure one blueprint row per natal_chart
CREATE UNIQUE INDEX IF NOT EXISTS uq_blueprints_chart_id
  ON public.blueprints(chart_id);

-- 2. Store intake profile context on natal_charts so anonymous synthesis
--    can load relationship_status / career_mode / career_field / first_name cleanly
ALTER TABLE public.natal_charts
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS relationship_status TEXT,
  ADD COLUMN IF NOT EXISTS career_mode TEXT,
  ADD COLUMN IF NOT EXISTS career_field TEXT;
