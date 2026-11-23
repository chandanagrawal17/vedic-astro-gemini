# Requirements & Implementation Spec: Daily Command Center Edge-Case & Horizon Polish

**Target Repo:** Personal Blueprint MVP (Next.js 15 + TypeScript + Supabase + Ephemeris Engine)  
**Status:** Backlog Spec (Post-Part A Adversarial Review)  
**Related Files:**
- `src/lib/astro/dailyTransitEngine.ts`
- `src/lib/astro/ephemeris/historicalTransits.ts`
- `src/lib/supabase/dailySession.ts`
- `src/components/blueprint/DailyCommandCenter.tsx`
- `supabase/migrations/007_daily_command_center.sql`
- `tests/dailyCommandCenter.test.ts`

---

## 1. Background & Context

Item 7 Part A (Daily Command Center & Decision Tools) shipped with live Lahiri Moon calculation, browser-timezone routing (`tzOffsetHours`), full Vedic Gochar overlays (Chandra + Lagna + slow-planet Saturn/Jupiter/Rahu/Mars), and a 30-item zero-jargon directive pool (`DIRECTIVE_POOL`), passing all 48 unit tests, `tsc --noEmit`, `next build`, and a 1,026-string guardrail sweep.

During the post-build adversarial review, four non-blocking edge cases and maintenance items were identified for backlog tracking and future polish.

---

## 2. Backlog Items & Requirements

### B1. Align Today Hero vs. Calendar Day 0 Evaluation Timestamp
- **Problem Statement:**  
  In `src/lib/astro/dailyTransitEngine.ts`, `buildDailyCommandCenterData` calls `evaluateGocharAt(normalizedChart, now)` using the exact current timestamp, while `buildSevenDayCalendar` calls `evaluateGocharAt(normalizedChart, noonUtc)` for every day including `offset === 0`. On days when the sidereal Moon crosses a sign boundary between local midnight and noon (or noon and evening), the Today hero card (`toneStatus`, `bandwidthScore`) and `sevenDayCalendar[0]` can show mismatched statuses/scores.
- **Implementation Plan:**
  1. In `buildSevenDayCalendar` (`src/lib/astro/dailyTransitEngine.ts`), use `now` when `offset === 0` and keep `noonUtc` for `offset >= 1`:
     ```ts
     const evalDate = offset === 0 ? now : noonUtc;
     const gochar = evaluateGocharAt(params.normalizedChart, evalDate);
     ```
  2. Verify `evaluateMoveAudit` (which reads `calendar.find(...)`) automatically inherits exact parity with the Today hero verdict for today's date (`sevenDayCalendar[0]`).
- **Acceptance Criteria:**
  - Add a unit test in `tests/dailyCommandCenter.test.ts` targeting a UTC timestamp before/after a sidereal Moon ingress and asserting `payload.toneStatus === payload.sevenDayCalendar[0].status` and `payload.bandwidthScore === payload.sevenDayCalendar[0].bandwidthScore`.

---

### B2. Broaden Directive Pool Rotation Beyond Narrow Affinity Subsets
- **Problem Statement:**  
  `DIRECTIVE_POOL` in `src/lib/astro/dailyTransitEngine.ts` contains 30 unique directives (`dir_own_lane_01` through `dir_celebrate_done_30`). However, `selectDailyDirective` currently prioritizes `affinityPool` exclusively whenever any directive in `pool` matches `careerMode` or `relationshipStatus`. With a 3-day exclusion window (`excludedDirectiveIds.length <= 3`), users whose `(toneStatus, careerMode, relationshipStatus)` matches ≥ 4 affinity items rotate mostly inside that smaller subset (~4–7 directives) instead of cycling across general directives in `DIRECTIVE_POOL`.
- **Implementation Plan:**
  1. Update `selectDailyDirective` (`src/lib/astro/dailyTransitEngine.ts`) so `chosenPool` combines matching affinity directives with general directives (entries where `!d.careerAffinity && !d.relationshipAffinity`) matching `toneStatus` and `!excluded.has(d.id)`.
  2. Optionally give affinity directives higher weight (e.g., 2x entries or deterministic hash tiering) without starving general directives over a 14–30 day retention window.
- **Acceptance Criteria:**
  - Over 14 consecutive simulated daily check-ins with the same fixed `(toneStatus: "GREEN", careerMode: "employed_hybrid", relationshipStatus: "single")`, at least 10 distinct directives appear (confirming general + affinity variety while preserving the 3-day anti-repetition guarantee).

---

### B3. Extend Slow-Planet Gochar Ephemeris Horizon Past 2030
- **Problem Statement:**  
  `evaluateGocharAt` calls `getSaturnSignAt`, `getJupiterSignAt`, `getRahuSignAt`, and `getMarsSignAt` from `src/lib/astro/ephemeris/historicalTransits.ts`, whose static Lahiri sign-ingress tables currently cover **2005–2030**. Starting Jan 1, 2031, those lookups will clamp/fall back, causing `gocharDelta` (`[-8, +7]`) to freeze on 2030 planetary placements.
- **Implementation Plan:**
  1. Extend `historicalTransits.ts` ingress intervals for Saturn, Jupiter, Rahu/Ketu, and Mars through **2040** (verified against Swiss Ephemeris / VedicAstroAPI checkpoints).
  2. Alternatively, add an analytical Keplerian/VSOP87 sidereal fallback when `utcDate.getUTCFullYear() > 2030` so slow-planet Gochar never silently freezes.
- **Acceptance Criteria:**
  - Verify `getSaturnSignAt`, `getJupiterSignAt`, `getRahuSignAt`, and `getMarsSignAt` return accurate Lahiri rasi numbers for sample checkpoints in `2032` and `2038`.

---

### B4. Mid-Day Timezone Travel & `daily_checkins` Intraday Snapshot Semantics
- **Problem Statement:**  
  1. `daily_checkins` in `supabase/migrations/007_daily_command_center.sql` uses `UNIQUE(chart_id, checkin_date)` keyed on the user's current `tzOffsetHours` local date. Crossing midnight via timezone change cleanly reads/creates the new local `checkin_date` row, leaving any earlier-date row stored under the previous `checkin_date`.
  2. On initial load of a local date, `getOrInitDailyCommandCenter` (`src/lib/supabase/dailySession.ts`) caches `directive_id`, `directive_text`, `bandwidth_score`, and `tone_status` in `daily_checkins`. On subsequent reloads the same day, `payload` recomputes live `bandwidthScore` and `toneStatus` from `now`, while the stored `daily_checkins.bandwidth_score` / `tone_status` columns remain at the initial snapshot.
- **Implementation Plan:**
  1. Keep `directive_id` / `directive_text` pinned once per `(chart_id, checkin_date)` so the user's daily directive never shifts mid-day.
  2. Decide whether analytics/admin reporting expects `daily_checkins.bandwidth_score` / `tone_status` to reflect the initial morning snapshot (no change) or latest observed score (sync update only when `toneStatus` flips on Moon ingress).
- **Acceptance Criteria:**
  - Document chosen retention behavior in `src/lib/supabase/dailySession.ts` and add a test confirming a user who switches `tzOffsetHours` across midnight preserves prior-day memory tags on the earlier `checkin_date` without overwriting the new local day.

---

## 3. Verification Checklist (When Implementing Any Item Above)
- Run `npm test` — all unit tests pass (`0` failures).
- Run `npm run typecheck` — `0` TypeScript errors.
- Run `npm run build` — production Next.js compile + lint + type validation pass cleanly.
- Run guardrail sweep across `dailyTransitEngine.ts` outputs — `0` hits against `BANNED_ASTROLOGY_REGEX`, `BANNED_FATALISTIC_REGEX`, `CLICHE_REGEX`, and `CORPORATE_BUZZWORD_REGEX`.
- Confirm strict `camelCase` across all TypeScript interfaces, API JSON payloads, and UI state.
