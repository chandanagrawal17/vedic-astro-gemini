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
- **Strict `camelCase` Always (All Modules, Schemas, APIs, & UI):** Every TypeScript type/interface, Zod schema property inside `hook_proof_json` and `full_blueprint_json`, deterministic engine telemetry field, API JSON request/response field, and React component prop/state MUST use `camelCase`. Map to `snake_case` ONLY at the PostgreSQL/Supabase SQL column boundary (`love_accuracy_feedback`, `relationship_status`, `relationship_hook_engine_version`) or where an already-shipped top-level wrapper key explicitly requires backwards compatibility (`hook_proof_json`, `full_blueprint_json`, `upgrade_hint`). Never introduce `snake_case` property names in TypeScript interfaces, Zod schemas, or JSON payloads.
- Validate all API request/response payloads with `zod`.
- Write unit tests for: (a) the jargon-ban regex scanner, (b) server-side Free vs. Paid payload stripping, and (c) the 3-tier `precision_mode` router.
- Keep components modular under `src/components/blueprint/`, `src/components/onboarding/`, and `src/lib/engines/`.

## LLM Voice & Hook Tonality Rules
1. **Global Mentor Voice & Guardrails (All 5 Hooks):**
   - **Persona:** Warm, grounded, perceptive US mentor speaking one-on-one over coffee using natural contractions (`you're`, `don't`, `let's be real`) and concrete everyday scenes—never mystical fortune-telling, clinical therapy, doom, or stiff consultant-speak.
   - **Zero Jargon / Fatalism / Clichés:** Strictly forbid astrology, Vedic, zodiac, planetary, house, Sanskrit, Ayurvedic, or numerology terms (`BANNED_ASTROLOGY_REGEX`), fatalistic or clinical terms (`BANNED_FATALISTIC_REGEX`), horoscope clichés like `"deep transformation"` or `"emerged stronger"` (`CLICHE_REGEX` / `LOVE_CLICHE_REGEX`), and corporate buzzwords like `"synergy"`, `"deliverables"`, or `"operational footprint"` (`CORPORATE_BUZZWORD_REGEX`).
   - **High-Agency & Verbatim Honesty:** Frame friction as structural patterns paired with practical agency levers; never fabricate dates, scores, or placements missing from telemetry when `precisionMode !== "exact"`.
2. **Hook #1 — Hard Reset Pinpoint:**
   - **Tone:** Sharp, candid behavioral and mind-body stress mentor—ground themes in concrete work/money, home/relocation, relationship, and nervous-system realities (light sleep, gut heat, wired exhaustion), never vague hardship soup.
   - **Tier Discipline:** Free tier uses **yearly ranges only** (`YYYY – YYYY`) and redacted 3–5 word flashpoint titles with zero month names or seasons; Paid tier copies verbatim 1-to-3-month flashpoints, somatic inside feelings, leftover survival reflexes, and 3 calm prep moves.
3. **Hook #2 — Conditional Relationship Mirror:**
   - **Tone:** Lovable, affectionate close friend with playful `"caught-red-handed"` warmth anchored in real everyday scenes (texting pauses, Tuesday dinners, shoulders dropping)—never Barnum clichés (`"you value loyalty"`, `"hate mixed signals"`, `"twin flame"`).
   - **Branch & Tier Discipline:** Strictly isolate **1 active status** (`single` | `dating` | `married`) with zero cross-branch leaks; Free tier exposes yearly past shifts only (zero months or seasons); Paid tier delivers speakable `"10-second shift"` phrasing and verbatim forward 1-to-3-month windows.
4. **Hook #3 — Career & Business Alignment:**
   - **Tone:** Warm, plain-spoken career mentor—replace stiff corporate jargon with human phrasing (`"putting out fires"`, `"building something that's actually yours"`, `"stay cool and get it in writing"`).
   - **Empathy & Tier Discipline:** When `careerMode === "in_transition"`, never advise about a `"day job"` or `"office drama"`—frame fit around why the last chapter felt outgrown, cash runway, and warm outreach. Free tier withholds the 3 individual path scores and all future months; Paid tier locks exact telemetry scores and verbatim 1-to-3-month windows.
5. **Hook #4 — #1 Self-Sabotage Loop:**
   - **Tone:** Candid, shame-free pattern-breaker naming the subtle cognitive/nervous-system reflex without guilt or clinical labels.
   - **Tier Discipline:** Free tier pairs a crisp evocative `loopName` (`"The Urgency Loop"`) with 1 painfully relatable everyday `symptomSentence`; Paid tier maps concrete triggers in love and career plus 3 grounded, secular cognitive/somatic antidote steps.
6. **Hook #5 — 10-Year Arc in 3 Eras:**
   - **Tone:** Crisp editorial storyteller—evocative yet grounded chapter naming with zero karma, fate, or mystical-alignment framing.
   - **Tier Discipline:** Free tier pairs 2–4 word titles (`era1`, `era2`, `era3Preview`) with 1–2 concise sentences preserving exact telemetry `dateRange` and `percentComplete`; Paid tier focuses `era3Playbook` (`coreMandate`, `doubleDown`, `eliminate`) on concrete behavioral priorities and frames `era4Preview` as an agency opportunity.