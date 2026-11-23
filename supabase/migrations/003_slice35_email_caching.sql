-- Slice 3.5 Migration: Unique-Email Deduplication & Smart Hash-Based Caching
-- Idempotent migration: safe to run multiple times in Supabase SQL Editor after 001_slice2_core.sql and 002_slice3_blueprints.sql.

-- 1. Add email, hash, and updated_at columns idempotently
ALTER TABLE public.natal_charts
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS birth_input_hash TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.blueprints
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS context_hash TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Normalize existing non-null emails with LOWER(TRIM(email))
UPDATE public.profiles
SET email = NULLIF(LOWER(TRIM(email)), '')
WHERE email IS NOT NULL;

UPDATE public.natal_charts
SET email = NULLIF(LOWER(TRIM(email)), '')
WHERE email IS NOT NULL;

UPDATE public.blueprints
SET email = NULLIF(LOWER(TRIM(email)), '')
WHERE email IS NOT NULL;

-- Backfill email between linked natal_charts and blueprints when one side is missing
UPDATE public.blueprints b
SET email = nc.email
FROM public.natal_charts nc
WHERE b.chart_id = nc.id
  AND b.email IS NULL
  AND nc.email IS NOT NULL;

UPDATE public.natal_charts nc
SET email = b.email
FROM public.blueprints b
WHERE b.chart_id = nc.id
  AND nc.email IS NULL
  AND b.email IS NOT NULL;

-- 3. Clean existing duplicate dev rows BEFORE adding unique indexes
-- 3a. Deduplicate profiles by normalized email (keep most recently updated/created)
WITH ranked_profiles AS (
  SELECT
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(email))
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, user_id DESC
    ) AS rn
  FROM public.profiles
  WHERE email IS NOT NULL
)
DELETE FROM public.profiles p
USING ranked_profiles rp
WHERE p.user_id = rp.user_id
  AND rp.rn > 1;

-- 3b. Deduplicate blueprints by normalized email (keep is_paid = true first, then most recent)
WITH ranked_blueprints_by_email AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(email))
      ORDER BY is_paid DESC, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.blueprints
  WHERE email IS NOT NULL
)
DELETE FROM public.blueprints b
USING ranked_blueprints_by_email rb
WHERE b.id = rb.id
  AND rb.rn > 1;

-- 3c. Deduplicate blueprints by chart_id (keep is_paid = true first, then most recent)
WITH ranked_blueprints_by_chart AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY chart_id
      ORDER BY is_paid DESC, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.blueprints
)
DELETE FROM public.blueprints b
USING ranked_blueprints_by_chart rb
WHERE b.id = rb.id
  AND rb.rn > 1;

-- 3d. Deduplicate natal_charts by normalized email (keep row linked to is_paid = true first, then most recent)
WITH ranked_charts AS (
  SELECT
    nc.id,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(nc.email))
      ORDER BY COALESCE(b.is_paid, FALSE) DESC, nc.created_at DESC NULLS LAST, nc.id DESC
    ) AS rn
  FROM public.natal_charts nc
  LEFT JOIN public.blueprints b ON b.chart_id = nc.id
  WHERE nc.email IS NOT NULL
)
DELETE FROM public.natal_charts nc
USING ranked_charts rc
WHERE nc.id = rc.id
  AND rc.rn > 1;

-- 4. Create strict unique indexes & lookup indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_natal_charts_email_unique
  ON public.natal_charts (LOWER(TRIM(email)))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_blueprints_chart_id_unique
  ON public.blueprints (chart_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique
  ON public.profiles (LOWER(TRIM(email)))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_natal_charts_birth_input_hash
  ON public.natal_charts (birth_input_hash)
  WHERE birth_input_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_blueprints_email_lookup
  ON public.blueprints (LOWER(TRIM(email)))
  WHERE email IS NOT NULL;
