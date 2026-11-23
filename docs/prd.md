# Product Requirements Document (PRD): Personal Blueprint MVP (v1)

## 1. Product Vision & Strategy
Build a mobile-first US web application that delivers an uncannily accurate **Personal Behavioral Blueprint** in under 60 seconds. Rather than competing with noisy daily horoscope apps on Day 1, v1 focuses exclusively on proving accuracy through **past life cycles** and translating complex Vedic astrology + Pythagorean numerology into empowering, modern self-awareness across **Identity, Relationships, and Career**.

- **Target Market:** US Millennials & Gen Z (ages 24–42) seeking self-knowledge, relationship clarity, and career alignment.
- **Brand Belief:** *A happy, satisfied life starts with deep self-understanding—and humanity has spent millennia mapping the patterns of who we are.*
- **Monetization Model (v1):** **One-time `$19` Full Blueprint Unlock** (primary CTA) alongside an optional **`$39/yr` Blueprint Pass** (includes free chart refreshes & early access to v2 live mentor tools). One-time pricing avoids early subscription churn while funding v2.

---

## 2. End-to-End Conversion Funnel (5 Steps)

| Step | Route | Screen / Experience | Business Objective |
| :--- | :--- | :--- | :--- |
| **1. Entry Wedge** | `/`, `/hard-reset`, `/career-audit`, `/self-sabotage` | Problem-first landing page in Solar Obsidian UI (no generic marketing fluff). | High top-of-funnel start rate ($\ge 65\%$) |
| **2. Fast Intake** | `/onboarding` | 3-step micro-intake (< 45 sec): (a) Name, DOB, Birth City, Optional Time; (b) Relationship Context; (c) Career Context & Field. | Collect chart + personalization with zero dead ends ($\ge 55\%$ completion) |
| **3. Synthesis** | `/onboarding/synthesizing` | 3-second orbital animation cycling through status steps while server fetches chart & generates Blueprint. | Build perceived precision & hide API latency |
| **4. Free Proof** | `/preview/[sessionId]` | **Proof Screen 1** (Hard Reset Year + Era 1 & 2 Timeline + Accuracy Validator) -> **Proof Screen 2** (Self-Sabotage Loop Name + Love & Career Teasers). | Kill skepticism before asking for email or card |
| **5. Auth & Unlock** | `/unlock/[sessionId]` -> `/blueprint` | Soft Account Gate (Google / Email Magic Link) -> Stripe Checkout Paywall -> Full Unlocked 5-Module Blueprint + Reflection Notes. | Capture leads ($\ge 45\%$) & convert paid unlocks ($6\%\text{--}12\%$) |

---

## 3. Onboarding Intake Specification

### Step 2A: Birth Details (Zero-Shame Escape Hatch)
- **First Name** (text, required)
- **Date of Birth** (date picker, required)
- **Birth City** (autocomplete returning `city_name`, `lat`, `lon`, `timezone_offset`, required)
- **Time of Birth** (3 explicit mode pills):
  - `[ Exact Time ]` -> standard HH:MM AM/PM input -> sets `precision_mode = "exact"`
  - `[ Rough Window ]` -> Morning (6am–12pm) / Afternoon (12pm–6pm) / Evening (6pm–12am) / Late Night (12am–6am) -> sets `precision_mode = "window"`
  - `[ I Don't Know My Time ]` -> no time input -> sets `precision_mode = "dob_only"`
- **Transparency Micro-Copy (below form):** *"Calculated using Vedic pattern math & numerology. 100% private—never shared or sold."*

### Step 2B: Relationship Context (1-Tap)
- Options: `Single / Dating` | `In a Relationship` | `Married` | `Navigating a Shift`

### Step 2C: Career Context (1-Tap + Optional Field)
- Mode options: `Employed (9–5)` | `Founder / Business Owner` | `Freelance / Hybrid` | `In Transition`
- Optional 1-line text input: *"What field or role are you in right now?"* (e.g., *"Software Engineering"*, *"Marketing"*, *"Healthcare"*)

---

## 4. The 5 Core Blueprint Hooks (Free vs. Paid Matrix)

**CRITICAL SECURITY RULE:** The backend generates the complete JSON once, stores it in `blueprint_sessions`, and **strips all `paid` keys on the server** whenever `is_unlocked === false`. Never send locked text to the browser and hide it only with CSS blur.

### Hook 1: The "Hard Reset" Pinpoint *(Credibility Anchor)*
- **Vedic Engine:** Scans past 10–15 years for Saturn structural pressure (*Sade Sati*: Saturn across 12th/1st/2nd from natal Moon; *Dhaiya*: Saturn in 4th/8th from Moon) cross-referenced with heavy 6th/8th/12th house Mahadasha/Antardasha shifts.
- **FREE Layer:**
  - Exact 2–3 year window (e.g., `2021 – 2023`)
  - Chapter label (e.g., *"The Structural Stripping"*)
  - 2-sentence candid description of the internal pressure felt during that stretch
  - **Interactive Validator:** `[ Scarily Accurate ]` · `[ Partially True ]` · `[ Not Quite ]` (logged to DB)
- **PAID Layer:**
  - Deep breakdown of *why* that reset happened and the permanent skill/resilience it built
  - Next major pressure-test window + how to prepare proactively

### Hook 2: Conditional Relationship Mirror *(Married vs. Single Branch)*
- **Vedic Engine:**
  - *Exact Mode:* 7th house & lord, Venus placement, Moon emotional safety, Navamsha (D-9) durability, Upapada Lagna (UL) / Darapada (A7), Rahu/Ketu axis.
  - *Fallback Mode (`dob_only`/`window`):* Chandra Lagna 7th house, natal Venus & Mars signs, Moon Nakshatra temperament, Numerology Expression/Heart's Desire.
- **Branching:**
  - If `Married` or `In a Relationship`: Focus on partnership alignment, unspoken needs, and silent friction dynamics.
  - If `Single / Dating` or `Navigating a Shift`: Focus on attraction magnetism, repeating partner patterns, and what actually sustains long-term peace.
- **FREE Layer:**
  - 1-Line Relational Archetype (e.g., *"High Loyalty, Zero Tolerance for Ambiguity"*)
  - Teaser badge: `1 Core Partner Friction Trigger Detected` (locked card preview)
- **PAID Layer:**
  - Core Alignment Profile (how they bond & feel safe)
  - The Silent Friction Pattern (reframed constructively—zero doom or divorce predictions)
  - 2 Practical Communication Shifts + Upcoming Relationship Clarity Window

### Hook 3: Career & Business Alignment Audit *(Primary Paid Trigger)*
- **Vedic Engine:**
  - *Exact Mode:* 6th house (service/stamina) vs. 7th house (independent trade/business), 10th house (vocation/authority from Lagna/Moon/Sun), 11th house (financial gains), Dashamsha (D-10), and 4th house (*Sukhasthana* — inner happiness vs. external duty).
  - *Fallback Mode:* Chandra/Surya Lagna 10th house, Saturn/Mercury/Sun dignity, Numerology Life Path & Destiny numbers.
- **FREE Layer:**
  - **Career Alignment Meter:** Numeric score (e.g., `64%`) + crisp 4-word subtitle (e.g., *"High Stamina, Low Fulfillment"*)
  - **1-Word Ideal Mode Pill:** e.g., `Bridge-Builder`, `Independent Strategist`, `Systems Architect`, `Operator`
  - Blurred teaser: *"Full Job vs. Business Verdict & Role Match Locked"*
- **PAID Layer:**
  - **Job vs. Business Verdict:** Clear recommendation (9–5 Leadership / Entrepreneurial Build / Hybrid Bridge) with plain-English reasoning
  - **Current Field Match:** Direct evaluation comparing their stated field (e.g., *"Tech/IT"*) against their natural blueprint
  - **The Duty vs. Purpose Gap:** How to align practical income with genuine personal satisfaction
  - **Current Timing Posture:** Whether the next 12 months favor building durable systems in place or executing a leap

### Hook 4: Your #1 Self-Sabotage Loop *(Emotional Gut-Punch)*
- **Vedic Engine:**
  - *Exact Mode:* Lagna/Moon/Rahu/Mars/Saturn friction tensions + subconscious patterns (D-27 / D-30).
  - *Fallback Mode:* Natal Moon Nakshatra + Mars/Saturn/Rahu sign tensions + Numerology Challenge Number.
- **FREE Layer:**
  - Exact evocative loop name (e.g., *"The Urgency Loop"*, *"Moving the Goalposts"*, *"Over-Auditing Before Launch"*)
  - 1 painfully relatable symptom sentence
- **PAID Layer:**
  - **The Full Trigger Map:** How this loop quietly shows up in (a) Love/Relationships and (b) Career/Decisions
  - **3-Step Practical Antidote:** Secular cognitive + somatic reframe (rooted in witness observation and nervous-system down-regulation)

### Hook 5: Your Last 10 Years Mapped Into 3 Named Eras *(Narrative Closer)*
- **Vedic Engine:** Historical and current Vimsottari Mahadasha/Antardasha transitions + Saturn/Jupiter macro cycles + Numerology Personal Years (1–9).
- **FREE Layer:**
  - Interactive curved Solar Obsidian timeline displaying **Era 1** (Past) and **Era 2** (Recent Past) with dates, titles, and 1-sentence summaries unlocked
  - **Era 3 (Current Chapter)** shows only its title, date range, and `% complete` progress arc—details locked
- **PAID Layer:**
  - Complete **Current Era Playbook**: Core Mandate, Where to Double Down, What to Eliminate
  - **Era 4 Preview:** Date range and high-level theme of the upcoming chapter

---

## 5. Missing Birth-Time Fallback & Precision Architecture

1. **Moon-Boundary Detection:** When `precision_mode === "dob_only"`, the Astro Engine fetches Moon longitude at `00:01` and `23:59` local time on the birth date. If the Moon crossed a sign boundary, flag `moon_boundary_day = true` in the chart metadata and instruct the LLM to lean more heavily on Numerology, Sun/Saturn/Jupiter placements, and broader multi-day lunar themes.
2. **Dasha Drift Guardrail:** In Vimsottari Dasha, an error of $m$ minutes shifts dates by roughly $\frac{m \times n}{4}$ days (where $n$ is the opening Mahadasha length in years). When `precision_mode !== "exact"`, display Era boundaries by **year/season** (e.g., `2021 – 2023`) rather than exact calendar dates.
3. **Free Upgrade Loop:** Inside the unlocked `/blueprint` page, if `precision_mode !== "exact"`, show a subtle amber banner: *"Found your exact birth time? Add it anytime for a free Deep Blueprint refresh."* Updating birth time re-runs the Astro API and regenerates the Blueprint at no extra charge.

---

## 6. Astro Provider & Caching Architecture

Implement a clean adapter at `src/lib/astro/provider.ts`:

```ts
export interface AstroProvider {
  searchLocation(query: string): Promise<LocationResult[]>;
  computeNatalBundle(input: BirthInput): Promise<NormalizedChartBundle>;
}
```

- **Primary Adapters:** `ProkeralaProvider` (best free 5,000-credit sandbox + Pythagorean Numerology) OR `VedicAstroApiProvider` (flat call pricing + Location Search API + MCP server).
- **Dev Adapter:** `MockAstroProvider` returning realistic normalized JSON (use a Mesha Lagna / Bharani Moon / Rahu Mahadasha fixture for deterministic testing).
- **One-Time Fetch Rule:** Call `computeNatalBundle` **once** upon onboarding submission. Compute historical Saturn transit windows (past 15 years) and Numerology Life Path / Personal Year math locally in TypeScript (`src/lib/astro/numerology.ts` and `src/lib/astro/saturnCycles.ts`) to minimize external API credits.

---

## 7. Database Schema (Supabase PostgreSQL)

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Blueprint Sessions (supports anonymous onboarding before auth, then claims on login)
CREATE TABLE public.blueprint_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_token TEXT UNIQUE NOT NULL,
  entry_wedge TEXT NOT NULL DEFAULT 'default', -- 'hard-reset' | 'career-audit' | 'self-sabotage' | 'default'
  first_name TEXT NOT NULL,

  -- Birth Input
  birth_date DATE NOT NULL,
  birth_time TIME, -- nullable for dob_only
  birth_window TEXT, -- 'morning' | 'afternoon' | 'evening' | 'late_night' | null
  precision_mode TEXT NOT NULL CHECK (precision_mode IN ('exact', 'window', 'dob_only')),
  birth_city TEXT NOT NULL,
  birth_lat DOUBLE PRECISION NOT NULL,
  birth_lon DOUBLE PRECISION NOT NULL,
  birth_tz DOUBLE PRECISION NOT NULL,

  -- 2 Micro-Inputs
  relationship_status TEXT NOT NULL CHECK (relationship_status IN ('single', 'relationship', 'married', 'shifting')),
  career_mode TEXT NOT NULL CHECK (career_mode IN ('employed', 'founder', 'freelance', 'transition')),
  career_field TEXT,

  -- Cached Raw Math (fetched once)
  normalized_chart_json JSONB NOT NULL,
  moon_boundary_day BOOLEAN NOT NULL DEFAULT FALSE,

  -- Generated Blueprint Payload (strictly split into free_payload + paid_payload)
  free_payload JSONB NOT NULL,
  paid_payload JSONB NOT NULL,

  -- Accuracy Proof Feedback
  hard_reset_feedback TEXT CHECK (hard_reset_feedback IN ('scarily_accurate', 'partially_true', 'not_quite')),

  -- Monetization State
  is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  unlock_tier TEXT CHECK (unlock_tier IN ('one_time_19', 'annual_39')),
  stripe_checkout_session_id TEXT,
  unlocked_at TIMESTAMPTZ,

  -- Refresh counter (allow up to 2 free refreshes when adding exact birth time)
  refresh_count INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON public.blueprint_sessions(user_id);
CREATE INDEX idx_sessions_anon ON public.blueprint_sessions(anonymous_token);

-- 3. Lightweight Reflection Notes (Memory seed inside unlocked Blueprint)
CREATE TABLE public.blueprint_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.blueprint_sessions(id) ON DELETE CASCADE,
  hook_key TEXT NOT NULL CHECK (hook_key IN ('hard_reset', 'relationship', 'career', 'self_sabotage', 'eras')),
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users read own blueprints" ON public.blueprint_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users manage own reflections" ON public.blueprint_reflections
  FOR ALL USING (auth.uid() = user_id);
```

*Note: Anonymous preview reads/writes happen strictly via Next.js Server Route Handlers using the Supabase Service Role key validated against an HttpOnly signed `anonymous_token` cookie, returning ONLY `free_payload` until `is_unlocked = true`.*

---

## 8. Next.js API Route Contracts

- `GET /api/locations?q=...` — City autocomplete returning lat, lon, timezone.
- `POST /api/blueprint/generate` — Validates intake via Zod -> calls `AstroProvider` -> computes local Numerology/Saturn windows -> calls `LlmProvider` (with jargon-ban verification) -> saves to `blueprint_sessions` -> sets HttpOnly `anonymous_token` cookie -> returns `{ sessionId, freePayload }`.
- `GET /api/blueprint/[sessionId]` — Verifies ownership (user session OR `anonymous_token` cookie). Returns `freePayload` always; returns `paidPayload` **only if** `is_unlocked === true`.
- `POST /api/blueprint/[sessionId]/feedback` — Records `hard_reset_feedback` (`scarily_accurate` | `partially_true` | `not_quite`).
- `POST /api/blueprint/[sessionId]/claim` — Links anonymous `blueprint_sessions` row to newly authenticated `auth.uid()`.
- `POST /api/stripe/checkout` — Creates Stripe Checkout session (`$19` one-time or `$39/yr`) with `metadata: { sessionId, userId }`.
- `POST /api/stripe/webhook` — Verifies Stripe signature -> handles `checkout.session.completed` -> sets `is_unlocked = true`, `unlocked_at = NOW()`.
- `POST /api/blueprint/[sessionId]/refresh-time` — Allows unlocked users who initially used `dob_only`/`window` to enter exact birth time and regenerate their chart once for free.
- `POST /api/reflections` — Saves a short personal reflection note anchored to any of the 5 hooks.

---

## 9. Acceptance Criteria (Definition of Done for v1)
1. **Zero Jargon Leak:** Automated Jest/Vitest test suite confirms 0 banned astrology/Sanskrit words appear across 10 diverse test birth profiles.
2. **Paywall Integrity:** Inspecting network responses on `/preview/[sessionId]` for an unpaid user confirms `paid_payload` is completely absent (`undefined`) from the HTTP response.
3. **Missing-Time Resilience:** Submitting `I Don't Know My Time` completes onboarding in under 5 seconds and produces zero references to rising signs or exact calendar Dasha dates.
4. **Mobile First Polish:** All screens render cleanly at `375px`–`430px` mobile widths with zero horizontal scroll and centered phone-frame aesthetics on desktop.
5. **End-to-End Stripe Test:** Completing a Stripe test-mode `$19` checkout redirects cleanly to `/blueprint` with all 5 modules unlocked immediately.