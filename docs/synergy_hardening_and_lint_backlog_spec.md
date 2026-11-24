# Backlog Implementation Spec: Synergy Hardening, Paid-Account Linking & Lint Cleanup

**Target Repo:** Personal Blueprint MVP (Next.js 15 + TypeScript + Supabase)  
**Status:** Backlog Spec (Post Item 7, Part B Adversarial Review)  
**Related Files:**
- `src/lib/astro/synergyEngine.ts`
- `src/lib/supabase/synergySession.ts`
- `src/app/api/synergy/[token]/compare/route.ts`
- `src/app/synergy/[token]/page.tsx`
- `src/components/synergy/SynergyReportView.tsx`
- `src/lib/rateLimit.ts`
- `src/lib/astro/careerEngine.ts`
- `src/lib/astro/dailyTransitEngine.ts`
- `eslint.config.mjs` & `package.json`

---

## 1. Background & Warnings Identified

During the adversarial review of **Item 7, Part B (Shareable Synergy Link)** and **Non-Interactive ESLint (`eslint.config.mjs`)**, four non-blocking warnings and one deployment prerequisite were flagged for follow-up hardening:

1. **Directional Ashtakoota Asymmetry (`Varna` / `Gana` / `Vasya`):**
   - `computeSynergyComparison()` in `src/lib/astro/synergyEngine.ts` currently evaluates `SIGN_VARNA_RANK[owner] >= SIGN_VARNA_RANK[partner]`, `GANA_SCORE_MATRIX[owner][partner]`, and `VASYA_SCORE_MATRIX[owner][partner]`.
   - Because classical Ashtakoota tables are directional (`boy -> girl`), swapping who initiates the Synergy invite (`Chandan -> Michelle` vs. `Michelle -> Chandan`) can shift the score by 1–2 points in a gender-neutral US product flow.
2. **Unauthenticated Paid-Email Probing & Linking UX:**
   - When an unauthenticated Partner B submits an email already associated with an `is_paid: true` Personal Blueprint in `compareSynergyWithPartner()`, `ExistingPaidAccountError` is caught and the server falls back to `local_only` mode so the paid user's `natal_charts` row and session cannot be overwritten or hijacked.
   - However: (a) returning `storageMode: "local_only"` despite an email being typed subtly reveals that the email has a paid account, and (b) a legitimate returning paid user doesn't get a smooth **"Sign in to link your existing paid Blueprint"** prompt.
3. **In-Memory Rate Limiter Scope (`src/lib/rateLimit.ts`):**
   - `enforceRateLimit()` on `/api/synergy/create` and `/api/synergy/[token]/compare` uses `globalThis.__pbRateLimitBuckets`. In multi-instance or serverless production deploys, per-process memory resets on cold starts and does not share counters across instances, leaving `VedicAstroAPI` credits exposed to distributed bursts.
4. **Pre-Existing ESLint Warnings & Next.js 16 `next lint` Deprecation:**
   - `npm run lint` passes with `0` errors, but emits 3 pre-existing warnings in untouched files (`RASI_NAMES` in `careerEngine.ts`, `DailySomaticPhase` in `dailyTransitEngine.ts`, unused `eslint-disable no-var` in `rateLimit.ts`) plus Next 15's deprecation warning for `next lint` ahead of Next.js 16.

*(Deployment Note: `supabase/migrations/008_shareable_synergy.sql` must also be executed in the Supabase SQL Editor before testing `/api/synergy/*` against live Supabase.)*

---

## 2. Requirements & Implementation Plan

### R1. Symmetric Gender-Neutral Scoring Option (`synergyEngine.ts`)
1. **Order-Independent Scoring Mode:**
   - Add an optional `scoringMode?: "symmetric" | "classical_ordered"` option to `ComputeSynergyInput` (defaulting to `"symmetric"` for shareable US links while preserving `"classical_ordered"` for classical Ashtakoota verification benchmarks).
   - Under `"symmetric"`:
     - **Varna (1 pt):** Award `1` when `Math.abs(rankA - rankB) <= 1 || rankA === rankB` (or `Math.max(orderedAB, orderedBA)`), ensuring `A × B === B × A`.
     - **Gana (6 pts) & Vasya (2 pts):** Compute `Math.max(matrix[a][b], matrix[b][a])` (or symmetric average rounded to nearest `0.5`) so the invite creator and invite receiver always see identical scores regardless of who sent the link.
2. **Engine Version Bump:**
   - Bump `SYNERGY_ENGINE_VERSION` from `"synergy_v1_kutas"` to `"synergy_v2_symmetric_kutas"` so existing `synergy_links` rows automatically self-heal on next `GET /api/synergy/[token]` read.
3. **Unit Tests (`tests/synergyEngine.test.ts`):**
   - Assert symmetry invariant: `computeSynergyComparison(A, B).overallScore === computeSynergyComparison(B, A).overallScore` and identical per-dimension scores under `"symmetric"`.

### R2. Paid-Account Linking UX & Anti-Enumeration Hygiene
1. **Avoid Account-State Oracle + Offer Smooth Sign-In:**
   - When `ExistingPaidAccountError` triggers inside `compareSynergyWithPartner()` while unauthenticated:
     - Still compute the Synergy comparison ephemerally without touching the paid account.
     - Return a generic `accountLinkPrompt: "If you already have a Personal Blueprint account under this email, sign in to link it—otherwise this comparison stays private in your browser."` (neutral phrasing that works identically whether or not the caller wants to reveal state, or trigger Soft Auth magic-link / Google OAuth before persisting `partner_chart_id`).
2. **Post-Auth Claim Hook for Synergy:**
   - Allow an authenticated Partner B returning from `/auth/callback` to link their existing `natal_charts.id` to a `synergy_links` token (when `partner_chart_id IS NULL`) via `POST /api/synergy/[token]/claim-partner`.

### R3. Distributed Rate Limiting (`src/lib/rateLimit.ts`)
1. **Shared Store Adapter:**
   - Abstract `checkRateLimitAsync(key, limit, windowMs)` in `src/lib/rateLimit.ts` with:
     - **Primary (Prod):** Upstash Redis REST (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`) OR a lightweight Supabase RPC sliding-window table (`public.api_rate_limits`) when Redis is not provisioned.
     - **Fallback (Local/Tests):** Existing `globalThis` in-memory bucket store when neither Redis nor Supabase is configured.
2. **Wire Across Paid/External API Endpoints:**
   - Apply `await enforceRateLimitAsync(...)` to `/api/synergy/create`, `/api/synergy/[token]/compare`, `/api/charts/calculate`, and `/api/blueprint/synthesize`.

### R4. ESLint Zero-Warning Cleanup & ESLint CLI Migration
1. **Clear the 3 Pre-Existing Warnings:**
   - Remove unused `RASI_NAMES` in `src/lib/astro/careerEngine.ts`.
   - Remove unused `DailySomaticPhase` import in `src/lib/astro/dailyTransitEngine.ts`.
   - Remove the stale `// eslint-disable-next-line no-var` comment in `src/lib/rateLimit.ts`.
2. **Prepare for Next.js 16:**
   - Update `"lint"` script in `package.json` from `"next lint"` to `"eslint ."` (and verify `eslint.config.mjs` covers `src/**` and `tests/**` with `--max-warnings=0` in CI).

---

## 3. Acceptance Criteria

1. `computeSynergyComparison(A, B)` and `computeSynergyComparison(B, A)` return identical `overallScore` and `dimensions` in `"symmetric"` mode while preserving `21.5/36` under `"classical_ordered"`.
2. Unauthenticated `POST /api/synergy/[token]/compare` with an existing paid email neither overwrites the paid user's chart nor leaks account ownership, while authenticated users can cleanly link their existing chart.
3. Distributed rate limiting enforces HTTP `429` across concurrent requests even across separate module/server instances.
4. `npm run lint -- --max-warnings=0`, `npm test`, `npm run typecheck`, and `npm run build` all pass with zero warnings and zero errors.
