-- Migration 009: Harden public.blueprints RLS against client-side writes
-- Idempotent migration: safe to run multiple times in Supabase SQL Editor after 001–008.
-- Ensures only the server service-role key (which bypasses RLS) can insert/update blueprints or flip is_paid.

ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own blueprints" ON public.blueprints;
DROP POLICY IF EXISTS "Users update own blueprints" ON public.blueprints;

REVOKE INSERT, UPDATE, DELETE ON public.blueprints FROM anon, authenticated;
