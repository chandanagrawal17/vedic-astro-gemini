# GEMINI.md — Antigravity Workspace Instructions

## Project Overview
You are building a mobile-first web application (PWA) for the US market: a modern self-reflection and personal blueprint platform powered transparently by Vedic pattern calculations and Pythagorean numerology on the backend.

- **Brand Positioning:** *Ancient pattern intelligence meets modern self-reflection.*
- **Tagline:** *Know your patterns. Own your life.*
- **Core v1 Scope:** Strictly the **Personal Blueprint** experience centered around **5 high-conversion hooks** (Free Proof -> Soft Auth -> Stripe One-Time Unlock). Do NOT build daily notification crons, multi-partner CRMs, or palmistry in v1.

## Source-of-Truth Documentation
Read these files before planning or writing code:
1. `docs/PRD.md` — Product funnel, 5 Hooks Free/Paid matrix, 3-tier birth-time fallback, Supabase SQL schema, API contracts, and Stripe monetization.
2. `docs/DESIGN_SYSTEM.md` — "Solar Obsidian" aesthetic tokens, typography, glassmorphism recipes, orbital SVGs, and mobile-first layout specs.
3. `docs/LLM_PROMPTS.md` — Master Blueprint synthesis prompt, strict Zod JSON schemas, precision-mode rules, and automated jargon-ban regex.

## Locked Tech Stack
- **Framework:** Next.js 15 (App Router, TypeScript strict mode)
- **Styling:** Tailwind CSS + Framer Motion (subtle orbital & reveal animations)
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security, Google + Email Magic Link Auth)
- **Payments:** Stripe Checkout (One-time `$19` Full Blueprint Unlock + optional `$39/yr` Pass) + Stripe Webhooks
- **Astrology Backend:** Abstract `AstroProvider` interface (supporting `Prokerala` or `VedicAstroAPI`, plus a deterministic `MockAstroProvider` for Slice 1 local development)
- **LLM Middleware:** Abstract `LlmProvider` interface targeting Google GenAI SDK (`gemini-2.5-flash` or `gemini-3.8-flash` on paid zero-retention API tier) with `zod` structured output validation
- **Analytics:** PostHog (funnel step tracking)

## Non-Negotiable Engineering Guardrails
1. **Strict Jargon Ban in User-Facing Outputs:** Never expose Sanskrit terms, planet names, zodiac signs, house numbers, or astrological jargon in generated insights (see `docs/LLM_PROMPTS.md` for the mandatory regex test suite). Only mention "Vedic pattern math & numerology" in the transparent 1-line onboarding privacy note and FAQ.
2. **Mathematical Honesty (`precision_mode`):** If a user skips their exact birth time, NEVER fabricate rising signs, divisional charts (D-9, D-10, D-27, D-30), or exact Dasha transition dates. Route through the `dob_only` / `window` fallback cleanly.
3. **Cache Once, Never Re-Bill:** Fetch natal charts, Dashas, and numerology **once** per birth-data submission and cache raw JSON permanently in Supabase (`blueprint_sessions`). Only re-fetch if the user updates their birth time.
4. **Zero Fatalism & Non-Clinical Boundaries:** All copy must feel like a warm, grounded, high-agency mentor—never fortune-telling, doom predictions, or clinical therapy. Include a lightweight lifestyle/self-reflection disclaimer in the footer.
5. **Security & Secrets:** All Astrology API calls, LLM calls, and Stripe operations MUST run in Next.js Route Handlers / Server Actions. Never expose API keys or paid Blueprint JSON fields to unauthenticated or unpaid clients (filter paid fields server-side before returning responses).

## Recommended 4-Slice Execution Order
Always complete and verify one slice before starting the next:
- **Slice 1 (UI Shell + Mock Flow):** Implement the full Solar Obsidian mobile-first UI for Landing, 3-Step Onboarding, Pattern Synthesis animation, Proof Screens 1 & 2, Soft Auth Gate, Stripe Paywall UI, and Unlocked Blueprint view using realistic mock JSON data.
- **Slice 2 (Supabase + Auth + Cached Astro Engine):** Provision SQL migrations from `docs/PRD.md`, wire Supabase Auth, build Location Autocomplete, implement `AstroProvider` + 3-tier birth-time fallback + permanent DB caching.
- **Slice 3 (LLM Blueprint Synthesizer + Guardrails):** Wire `LlmProvider` using `docs/LLM_PROMPTS.md`, enforce Zod validation + jargon-ban regex retry loop, and persist Free + Paid JSON payloads cleanly in `blueprint_sessions`.
- **Slice 4 (Stripe Checkout + Webhooks + Polish):** Wire Stripe Checkout sessions, webhook fulfillment (`is_unlocked = true`), PostHog funnel events, accuracy feedback logging, and free birth-time refresh flow.

## Code Quality Standards
- Validate all API request/response payloads with `zod`.
- Write unit tests for: (a) the jargon-ban regex scanner, (b) server-side Free vs. Paid payload stripping, and (c) the 3-tier `precision_mode` router.
- Keep components modular under `src/components/blueprint/`, `src/components/onboarding/`, and `src/lib/engines/`.