# Product & Engineering Spec: "Career & Business Alignment" Hook Engine (Free Fit Teaser → Paid Full Career Guide)

**Target Repo:** Personal Blueprint MVP (Next.js 15 + TypeScript + Tailwind "Solar Obsidian" + Supabase + Gemini)
**Scope:** Upgrade **Hook #3 (Career & Business Alignment Audit)** across Onboarding Context Handling, Deterministic Backend Scoring & Timing (`careerEngine.ts`), LLM Prompts/Schemas, Free Proof Screen 2, Server-Side Redaction, and Paid Unlocked Blueprint Hub.

**Core Business Objective:** Make the user feel uncannily understood about *why* their work feels energizing or draining—using a warm, everyday mentor tone—while gating the high-value decisions (the 3-path percentage breakdown, field audit, alternative career lanes, and tight 1-to-3-month forward timing windows) behind the **$19 Full Blueprint Unlock**.

---

## 1. Product Strategy: The Two-Tier Career Conversion Funnel

### Why Generic Career Readings Fail
1. **Ignoring Real Life:** Telling an experienced engineering manager *"you could be a teacher or artist"* feels disconnected. The engine must judge their **actual onboarding inputs** (`career_mode` + `career_field`).
2. **Stiff Consultant-Speak:** Robotic phrases like *"leverage your operational footprint"* or *"maximize synergistic deliverables"* kill emotional trust. Copy must sound like a smart, caring mentor talking over coffee.
3. **Unstructured Percentages & Leaked Timing:** Letting an LLM make up arbitrary percentages causes inconsistent outputs across runs, while giving away forward monthly timing windows for free removes urgency to unlock the $19 guide.

### The Two-Tier Free vs. Paid Split

| Tier | What Is Shown | Backend Layers Exposed | Conversion Job |
| :--- | :--- | :--- | :--- |
| **FREE (Proof Screen 2)** | **1 Overall Fit Meter** (e.g., `63% Fit`) + **Your Sweet Spot** + **3 Warm Mentor Observations** (Natural Strength, The "Competence Trap" / Current Friction, How Work Sees You) + **Locked Teaser Card** | **Layer 1** (Natal Edge, Duty vs. Purpose Gap, Perception Gap) + **Redacted Placeholders** (`9–5: ██%`, `[ ███ – ███ 2027 ]`) | Trigger instant *"How did it know that about my job?!"* recognition and build urgency to unlock the exact path scores and next 12 months. |
| **PAID ($19 Full Blueprint Hub)** | **3-Path Independent Fit Scores** (`9–5`, `Going Solo`, `Building on the Side First`) + **Current Field Audit** + **3–5 Hidden Alternative Lanes** + **Capability vs. Perception Shift** + **How Money Grows & Silent Leak** + **Next 12 Months Tight Monthly Windows** | **All 4 Layers** (Deterministic 3-Path Scorer + Field/Alternative Lane Matcher + **Layer 4** Forward 12-Month Tight Window Scanner) | Deliver a practical, reassuring, decision-ready career roadmap with exact 1-to-3-month action windows. |

### First-Class `career_mode` Branching (Including `in_transition`)
Every prompt and UI label must adapt seamlessly to the user's onboarding selection:
* `employed` *(9–5 Day Job)* → Focuses on the "Competence Trap," manager/leadership perception, and whether to stay, negotiate, or build on the side.
* `employed_hybrid` *(9–5 + Building on the Side)* → Focuses on pacing energy between day job and side project, shipping v1, and avoiding premature leaps.
* `founder` *(Founder / Business Owner)* → Focuses on delegation vs. doing everything yourself, scaling bottleneck, partner alignment, and cash-flow rhythm.
* `freelance_hybrid` *(Freelance / Consulting)* → Focuses on pricing confidence, positioning vs. chasing gigs, and repeatable productized income.
* `in_transition` *(Between Roles / Recently Laid Off / Exploring)* → **Empathy-first branch.** Never lectures them about "staying at their day job" or "current office drama." Reframes their fit score as **"Alignment of Your Previous Track,"** protects cash runway without panic moves, highlights warm-network outreach vs. cold applications, and maps their best upcoming 1-to-3-month interview/consulting momentum windows.

---

## 2. Backend Architecture: Deterministic Career & Timing Engine (`src/lib/astro/careerEngine.ts`)

**Architectural Rule:** Never let Gemini invent percentages, calculate transits, or guess forward dates. All scores, career-lane matches, perception dynamics, and upcoming 1-to-3-month career windows are computed deterministically in `src/lib/astro/careerEngine.ts` and passed to Gemini as server-only JSON (`career_telemetry`).

### Zero-Cost Ephemeris Reuse
Reuse the exact static Lahiri sidereal lookup table created for the Hard Reset engine (`src/lib/astro/ephemeris/historicalTransits.ts`, covering **2005–2030**) to scan **forward 12 months from `referenceDate`**.
**Result:** Full career scoring + alternative lane mapping + forward 12-month flashpoint detection runs in **< 5 ms per user** with **$0 incremental API cost**.

---

### Layer 1: Natal Work Wiring, Fulfillment Gap & Perception Signals
Extract structured secular behavioral tags from `normalized_chart_json`:

1. **Natural Work Edge (6th + 10th + 1st/3rd Houses & Strongest Natal Planets):**
   * Strong 6th house / Virgo / exalted Mercury / Mars → `diagnostic_problem_solver`, `crisis_fixer`, `systems_builder`, `high_pressure_stamina`.
   * Strong 10th house / Sun / Saturn → `structured_leader`, `long_term_institution_builder`, `visible_authority`.
   * Strong 3rd / 5th / 9th / Jupiter / Mercury → `clear_communicator`, `mentor_and_guide`, `big_picture_strategist`.
   * Strong 7th / Venus / Libra → `people_and_experience_designer`, `deal_maker_and_partner`, `client_facing_grace`.
2. **The Duty vs. Purpose Gap (10th & 6th Stamina vs. 4th Inner Fulfillment & 9th/12th Meaning):**
   * High 6th/10th stamina paired with strong 4th/9th/Jupiter/Venus pull → flags `competence_trap_high_stamina_underfed_purpose` (*"You're great at hard work, which traps you in jobs that pay well but slowly drain your spark"*).
3. **Capability vs. Perception Gap (Inner Wiring vs. External Workplace Read — Lagna/D-10 vs. Arudha/10th/6th expression):**
   * Example: Inner self wants `autonomy_and_meaningful_ownership`, while workplace reads them as `indispensable_firefighter_or_intense_fixer`.
4. **Wealth & Income Leak Pattern (2nd + 11th + 9th + 12th Houses):**
   * Maps `compounding_style` (e.g., `reputation_and_repeatable_systems`, `partnerships_and_advisory`, `steady_equity_accumulation`) and `silent_income_leak` (e.g., `over_polishing_before_charging`, `staying_too_long_in_safe_underleveraged_role`, `underpricing_own_expertise`).

---

### Layer 2: Deterministic 3-Path Scoring Formula (Independent 0–100% Ratings)
Each of the three paths is scored **independently out of 100** (clamped to `35–96` so no path ever looks absurdly `0%` or `100%`). Scores combine **70% Natal Wiring** + **30% Current 12-Month Timing Modifier**.

#### A. `day_job_score` *(Sticking Purely to a 9–5)*
* **Base:** `62`
* **Natal Modifiers:**
  * `+12` for strong 6th house (service/execution stamina, exalted/own-sign planets in 6th)
  * `+8` for strong Saturn in 6th/10th/11th (corporate endurance)
  * `-14` for Rahu in 1st/10th or strong 7th/3rd entrepreneurial pull (restlessness under rigid bosses)
  * `-10` for Duty-vs-Purpose fulfillment mismatch (high stamina but strong 4th/9th/Venus human-impact need)
* **Timing Modifier (Next 12 Months):**
  * `+6` during supportive 6th/10th career consolidation transits
  * `-6` during 12th-house/8th-house corporate restructuring cycles (e.g., Saturn in 12th from Moon/Lagna) or active Rahu career disruption.

#### B. `going_solo_score` *(Quitting Cold Turkey / Full Solo Leap Right Now)*
* **Base:** `58`
* **Natal Modifiers:**
  * `+14` for strong 7th house (business/trade/partnerships, e.g., own-sign/exalted Venus or 7th lord)
  * `+10` for strong 3rd house (self-started initiative) or 1st house Mars/Sun drive
  * `+8` for Rahu in 10th/11th/1st (hunger for unconventional scale & ownership)
  * `-8` for heavy 6th-house perfectionism/over-auditing cluster when working totally alone without accountability
* **Timing Modifier (Next 12 Months):**
  * `+10` during clear expansion sub-chapters (active benefic Dasha/Antardasha + supportive Jupiter/Saturn transit)
  * `-12` during quiet restructuring/12th-house/Sade Sati opening windows (penalizes impulsive, zero-runway leaps).

#### C. `hybrid_side_build_score` *(Keeping a Steady Base While Building Something of Your Own)*
* **Base:** `68`
* **Natal Modifiers:**
  * `+12` when *both* high execution stamina (6th/10th) AND high ownership/people hunger (7th/3rd/Rahu/9th) coexist
  * `+8` when chart favors bridging two domains (e.g., technical logic + human guidance/wellness/advisory)
  * `-6` if energy-burnout risk is high (strong fire/Mars/Sun stress markers — keeps score realistic around `88–92%` rather than `100%`)
* **Timing Modifier (Next 12 Months):**
  * `+10` during restructuring, 12th-house prep, or early-Sade-Sati seasons (rewards protecting cash runway while shipping lean proof).

#### D. `current_path_fit_score` *(Shown on Free Proof Screen 2 Meter)*
* If `career_mode === 'employed'` → derived from `day_job_score` (+/- 5 based on field match).
* If `career_mode === 'employed_hybrid'` → weighted blend (`0.55 * day_job_score + 0.45 * hybrid_side_build_score`, highlighting the tension between day job and side ambition).
* If `career_mode === 'founder'` → derived from `going_solo_score`.
* If `career_mode === 'freelance_hybrid'` → derived from `hybrid_side_build_score`.
* If `career_mode === 'in_transition'` → evaluates alignment of their *previous stated field/track* (`previous_track_fit_score`) and explicitly labels the Free meter as e.g. **`63% Fit — Why Your Last Chapter Felt Outgrown`**.

---

### Layer 3: Hidden Alternative Lanes Matcher (Paid Exclusive)
Map the user's top 3–5 non-obvious planetary/house strengths to **3 to 5 plain-English alternative career lanes** outside their stated `career_field` (filtering out any lane that duplicates `career_field`):

| Natal Signature Pattern | Alternative Lane Tag | Plain-English Mentor Translation |
| :--- | :--- | :--- |
| Strong 6th + 4th/Jupiter/Moon | `holistic_health_wellness_performance` | Holistic health, burnout coaching, longevity, nutrition, or wellness platforms |
| Strong 6th + 10th + Mercury/Mars | `strategy_consulting_turnarounds` | Management consulting, operations turnarounds, or executive troubleshooting |
| Strong 7th + Venus/Libra/Taurus | `partnerships_deals_consumer_brands` | Strategic partnerships, deal-making, client advisory, or curated consumer/lifestyle brands |
| Strong 2nd/6th/8th + Mercury/Saturn | `finance_audit_legal_risk` | Financial strategy, wealth advisory, risk, compliance, or contract negotiation |
| Strong 3rd/5th/9th + Jupiter/Mercury | `mentoring_teaching_media` | Coaching, writing, online education, or translating complex ideas for everyday people |
| Strong 4th/10th + Saturn/Mars | `real_estate_architecture_spaces` | Real estate strategy, architecture, physical spaces, or logistics/infrastructure |

---

### Layer 4: Forward 12-Month Tight Career Window Scanner (**PAID TIER EXCLUSIVE**)
Using `historicalTransits.ts`, scan `[referenceDate → referenceDate + 12 months]` for **3 to 4 tight 1-to-3-month career windows**:

1. **Shipping, Interviews & Outreach Tailwind (`window_type: "momentum_ship_or_outreach"`):**
   * Transit Sun/Mercury/Venus/Jupiter activating 3rd (messaging/shipping), 7th (partnerships/interviews), 9th (mentors/warm network), or 11th (gains/offers) without heavy Mars/Saturn lock.
2. **Workplace Friction / Patience Test (`window_type: "friction_stay_cool"`):**
   * Transit Mars/Sun/Saturn hitting 6th (politics/peers), 10th (bosses/pressure), or 1st/Moon (short fuse/impatience).
   * *If `career_mode === 'in_transition'`:* Reframe from "office politics" to **"impatience spike with slow recruiters/interviews—don't force or settle out of frustration."**
3. **Major Chapter Shift / Consolidation (`window_type: "chapter_shift_accountability"`):**
   * Major Saturn/Jupiter/Node sign ingress or Antardasha shift inside the next 12 months (e.g., Saturn entering Aries in `June – Aug 2027`).
4. **Quiet Recharge / Strategy Reset (`window_type: "quiet_prep_protect_runway"`):**
   * Heavy 12th/8th house transit emphasis → advise steady cash buffer, lean v1 building, and protecting sleep/nervous system.

**Window Formatting Rules:**
* Min **3 weeks**, max **3 months** (e.g., `"Dec 2026 – Jan 2027"`, `"Mar – May 2027"`, `"June – Aug 2027"`).
* Deduplicate overlapping windows within 21 days so paid users always get **3 clean, non-overlapping forward windows**.

---

### Precision Mode Graceful Degradation (`precision_mode`)
* **`exact` (Birth Time Known):** Uses Lagna houses (1st, 4th, 6th, 7th, 10th, 11th), Moon houses, natal planets, Dasha timeline, and forward transits.
* **`approx_window` / `date_only` (Missing Birth Time):**
  * Anchors scoring and forward windows strictly to **Chandra Lagna (Natal Moon sign)** + **exact natal planet signs** (Sun, Mars, Mercury, Jupiter, Venus, Saturn) + **Surya Lagna (Sun sign)** for career temperament.
  * Moderates extreme score swings (clamps scores to `45–88`) and sets `upgrade_hint` (*"Add your exact birth time anytime to sharpen your workplace perception and monthly timing windows for free."*).

---

### Backend Output Contract (`career_telemetry` JSON — Server-Side Only)
**CRITICAL:** Never expose `career_telemetry` directly to the browser.

```json
{
  "precision_mode": "exact",
  "user_context": {
    "first_name": "Chandan",
    "career_mode": "employed_hybrid",
    "career_field": "Tech / Software Development Management"
  },
  "scores": {
    "current_path_fit_score": 63,
    "day_job_score": 60,
    "going_solo_score": 72,
    "hybrid_side_build_score": 91
  },
  "natal_work_profile": {
    "sweet_spot_tags": ["diagnostic_problem_solver", "systems_builder", "independent_people_focused_builder"],
    "natural_strength_tags": ["spots_hidden_flaws_fast", "calm_under_high_stakes", "turns_chaos_into_clean_systems"],
    "fulfillment_gap_tags": ["competence_trap_high_stamina_underfed_purpose", "craves_human_impact_and_ownership"],
    "perception_gap": {
      "inner_reality_tags": ["wants_autonomy_and_meaningful_impact", "thinks_like_builder_architect"],
      "external_read_tags": ["indispensable_crisis_fixer", "intense_and_impatient_with_red_tape"],
      "tactical_shift_tag": "stop_volunteering_for_invisible_cleanup_own_visible_outcomes"
    },
    "field_audit_hints": {
      "keep_tags": ["clean_systems_thinking", "complex_problem_solving", "structured_execution"],
      "missing_tags": ["direct_human_connection", "shaping_user_experience", "guiding_people_with_wisdom"],
      "ideal_bridge_tag": "tech_systems_bridged_with_human_guidance_or_advisory"
    },
    "alternative_lanes": [
      "holistic_health_wellness_performance",
      "strategy_consulting_turnarounds",
      "partnerships_deals_consumer_brands",
      "finance_audit_legal_risk",
      "mentoring_teaching_media"
    ],
    "wealth_pattern": {
      "compounding_style_tags": ["durable_reputation", "repeatable_products_or_ip", "steady_long_term_build"],
      "silent_income_leak_tags": ["over_polishing_before_charging", "staying_too_long_in_underleveraged_role"]
    },
    "energy_pacing_tags": ["fast_intense_mind", "sprint_then_burnout_risk", "needs_hard_evening_shutdown"]
  },
  "forward_12m_timing": {
    "macro_season_year_span": "Now – Mid-2027",
    "macro_posture_tag": "quiet_workshop_protect_runway_no_impulsive_leaps",
    "upcoming_windows": [
      {
        "id": "cw_01",
        "year_label": "2027",
        "month_range": "Dec 2026 – Jan 2027",
        "window_type": "momentum_ship_or_outreach",
        "focus_tags": ["clear_writing_and_messaging", "ship_simple_v1_to_real_users", "warm_network_conversations"]
      },
      {
        "id": "cw_02",
        "year_label": "2027",
        "month_range": "Mar – May 2027",
        "window_type": "friction_stay_cool",
        "focus_tags": ["impatience_with_slow_managers_or_politics", "document_agreements_in_writing", "channel_heat_into_own_build"]
      },
      {
        "id": "cw_03",
        "year_label": "2027",
        "month_range": "June – Aug 2027",
        "window_type": "chapter_shift_accountability",
        "focus_tags": ["serious_two_year_focus_chapter", "prune_distractions", "real_paying_users_turn_into_lasting_authority"]
      }
    ]
  }
}
```

---

## 3. UX & Paywall Conversion Flow (Solar Obsidian Aesthetic)

Preserve all **Solar Obsidian** visual tokens (`#0D0907` canvas, smoked frosted glass cards `rgba(28, 19, 14, 0.72)`, `#FF6B2B` sunset tangerine accents, `#F5A65B` warm amber highlights, editorial serif headlines + geometric sans-serif body).

### Free Tier — Proof Screen 2 Card ("Your Career Fit Right Now")
1. **Header Eyebrow:** `CAREER & PATH AUDIT`
2. **Hero Alignment Meter (Unlocked Free):**
   * Glowing circular or horizontal ember meter: **`63% Fit`**
   * Warm mentor subtitle: *"Great at the job, hungry for something deeper"* *(or for `in_transition`: *"Why your last chapter felt outgrown"*)*
   * Pill badge: **`Your Sweet Spot: Problem-Solver → Builder of Your Own Thing`**
3. **3 Warm Mentor Observations (Unlocked Free — Plain, Everyday Language):**
   * **Why you're so good at what you do:** 1–2 friendly sentences on their natural edge.
   * **Why it still feels a little empty:** 1–2 honest sentences naming the Competence Trap (or transition clarity).
   * **How people at work actually see you:** 1–2 sharp sentences exposing the Perception Gap.
4. **Locked Paid Teaser Strip (Creates Upgrade Urgency — Zero Leaked Scores or Months):**
   * Eyebrow: `🔒 FULL CAREER GUIDE LOCKED`
   * Blurred 3-Path Comparison Bars:
     * `9–5: ██%` · `Going Solo: ██%` · `Building on the Side First: ██%`
   * 3 Locked Checklist Teasers:
     * `🔒 Does {career_field} really fit you?` *(+ 4 hidden alternative lanes)*
     * `🔒 How money grows for you (and the quiet habit costing you income)`
     * `🔒 Your Best Months Ahead:` **`[ ███ – ███ 2027 ]`** *(when to ship, when to stay cool, when things shift)*
   * Tapping any locked bar logs PostHog event `clicked_locked_career_blueprint` and advances smoothly toward Soft Auth → **$19 Stripe Paywall**.

### Paid Tier — Unlocked Blueprint Hub ("Your Full Career Guide")
Once `is_paid === true` (or `DEV_UNLOCK_PREVIEW === 'true'` locally):
1. **Day Job vs. Doing Your Own Thing (3-Bar Visual Scorecard):**
   * Displays exact deterministic scores (`9–5: 60%`, `Going Solo: 72%`, `Building on the Side First: 91%`) with a highlighted glowing tangerine border around the highest-scoring path and a warm, honest 2-sentence mentor take under each.
2. **Does `{career_field}` Actually Fit You? (Field Audit Card):**
   * Three scannable rows: **What fits you like a glove**, **What's missing**, and **Your best next step**.
3. **Hidden Alternative Lanes (Swipeable Chips / Cards):**
   * 3 to 5 alternative fields outside their current box, each with a 1-sentence reason why it fits their wiring + a 1-tap bookmark toggle (`blueprints.saved_alternative_lanes`).
4. **Who You Really Are vs. How Work Sees You:**
   * Side-by-side glass split (**Inside your head** vs. **What coworkers see**) + **1 simple shift to try**.
5. **How Money Grows for You *(and Where It Quietly Leaks)*:**
   * Clean 2-part insight card without hype or get-rich-quick language.
6. **Your Next 12 Months: Tight Monthly Action Windows:**
   * Macro headline (e.g., *"Treat the next six months as your quiet workshop"*) + **3 glowing ember-pill month cards** (`Dec 2026 – Jan 2027`, `Mar – May 2027`, `June – Aug 2027`) + **1 Mind-Body Pacing Tip** to protect sleep and avoid burnout.

---

## 4. Updated Zod Schemas (`src/lib/llm/schemas.ts`)

Maintain a **hard schema boundary** between Free (`CareerProofSchema`) and Paid (`CareerDeepDiveSchema`):

```typescript
import { z } from "zod";

// ====================================================
// 1. FREE PROOF SCREEN 2 SCHEMA (NO 3-PATH SCORES, NO MONTHS)
// ====================================================
export const CareerProofSchema = z.object({
  current_path_fit_score: z
    .number()
    .int()
    .min(35)
    .max(96)
    .describe("Must match telemetry.scores.current_path_fit_score verbatim."),
  fit_headline: z
    .string()
    .min(10)
    .max(65)
    .describe("Warm, everyday mentor summary, e.g. 'Great at the job, hungry for something deeper'."),
  sweet_spot_label: z
    .string()
    .min(8)
    .max(55)
    .describe("Plain-English ideal mode, e.g. 'Problem-Solver -> Builder of Your Own Thing'."),
  why_you_are_good: z
    .string()
    .min(45)
    .max(220)
    .describe("1-2 friendly mentor sentences explaining their natural edge."),
  why_it_feels_empty_or_shifting: z
    .string()
    .min(45)
    .max(220)
    .describe("1-2 candid sentences naming the Competence Trap or transition clarity. Zero month names."),
  how_work_sees_you: z
    .string()
    .min(45)
    .max(210)
    .describe("1-2 relatable sentences naming the workplace perception gap."),
  locked_teaser: z.object({
    field_audit_question: z
      .string()
      .max(70)
      .describe("e.g., 'Does Tech really fit you?' or 'Does your current track really fit you?'"),
    alternative_lanes_count: z.number().int().min(3).max(5),
    timing_year_label: z
      .string()
      .regex(/^\d{4}(\s?[–-]\s?\d{4})?$/, "Year or year-span only (e.g. '2027' or '2026 – 2027'). NEVER include months."),
    paywall_cta_line: z.string().max(130),
  }),
  upgrade_hint: z.string().nullable().describe("Non-null only when precision_mode !== 'exact'."),
});

// ====================================================
// 2. PAID UNLOCKED HUB SCHEMA (3 SCORES + FIELD AUDIT + LANES + MONTHS)
// ====================================================
const CareerPathScoreItemSchema = z.object({
  path_key: z.enum(["day_job", "going_solo", "hybrid_side_build"]),
  path_label: z.string().max(55),
  fit_score: z.number().int().min(35).max(96),
  is_recommended: z.boolean(),
  honest_mentor_take: z
    .string()
    .min(50)
    .max(240)
    .describe("2 warm, plain-English sentences explaining why this score fits them right now."),
});

const AlternativeLaneSchema = z.object({
  lane_id: z.string(),
  lane_name: z.string().max(55),
  why_it_fits_you: z.string().min(45).max(200),
});

const ForwardCareerWindowSchema = z.object({
  id: z.string(),
  month_range: z
    .string()
    .min(5)
    .max(35)
    .describe("Exact 1-to-3-month range copied verbatim from telemetry.forward_12m_timing.upcoming_windows."),
  window_title: z
    .string()
    .min(5)
    .max(50)
    .describe("Friendly, human label, e.g. 'Great Time to Put It Out There' or 'Watch Your Patience at Work'."),
  practical_guidance: z
    .string()
    .min(55)
    .max(250)
    .describe("2 warm, actionable mentor sentences on what to do and what to avoid in these exact months."),
});

export const CareerDeepDiveSchema = z.object({
  path_comparison: z
    .array(CareerPathScoreItemSchema)
    .length(3)
    .describe("Must contain day_job, going_solo, and hybrid_side_build with exact telemetry scores."),
  field_audit: z.object({
    stated_field_label: z.string().max(60),
    what_fits_like_a_glove: z.string().min(45).max(220),
    what_is_missing: z.string().min(45).max(220),
    your_best_next_step: z.string().min(55).max(250),
  }),
  hidden_alternative_lanes: z.array(AlternativeLaneSchema).min(3).max(5),
  perception_gap: z.object({
    inside_your_head: z.string().min(40).max(190),
    what_coworkers_see: z.string().min(40).max(190),
    simple_shift_to_try: z.string().min(45).max(210),
  }),
  money_and_leaks: z.object({
    how_money_grows_for_you: z.string().min(50).max(220),
    quiet_habit_costing_you: z.string().min(50).max(220),
  }),
  next_12_months: z.object({
    big_picture_summary: z.string().min(60).max(250),
    tight_monthly_windows: z.array(ForwardCareerWindowSchema).min(2).max(4),
    mind_body_pacing_tip: z
      .string()
      .min(50)
      .max(220)
      .describe("1 grounded everyday habit to protect sleep, nerves, and focus without burnout."),
  }),
});
```

---

## 5. Production System Prompt (`src/lib/llm/prompts/careerPrompt.ts`)

Use this prompt module with your configured Gemini Flash model (`temperature: 0.4`, `responseMimeType: 'application/json'`).

```text
You are a warm, honest, deeply experienced life and career mentor talking one-on-one with your mentee ({first_name}) over coffee.

Your job is to translate structured career telemetry (`career_telemetry`) into TWO strictly separated tiers:
1. `hook_proof_json.career` (FREE TIER): A warm, uncannily accurate mirror of their current fit, natural strength, quiet emptiness/shift, and how work sees them—WITHOUT revealing the 3 individual path scores or any specific future month names.
2. `full_blueprint_json.career` (PAID TIER): The complete, decision-ready Career Guide unlocking the 3 path scores, Field Audit, 3–5 Hidden Alternative Lanes, Perception Shift, Money & Leaks, and exact 1-to-3-month timing windows for the next 12 months.

### STRICT RULES (NON-NEGOTIABLE):

1. **WARM, EVERYDAY MENTOR VOICE (ZERO CORPORATE BUZZWORDS):**
   - Write like a wise, caring friend who genuinely wants {first_name} to be happy and successful. Use natural contractions ("you're", "don't", "it's", "that's") and plain, human words.
   - STRICTLY FORBIDDEN CORPORATE / CONSULTANT JARGON: Never write "synergy", "leverage operational footprint", "surgical diagnostic", "deliverables", "value proposition", "paradigm", "tactical posture", "stakeholder alignment", "maximize upside", "optimize bandwidth", or "scalable ecosystem".
   - Say *"putting out fires"* instead of *"operational firefighting"*. Say *"building something that's actually yours"* instead of *"achieving entrepreneurial ownership"*. Say *"stay cool and get it in writing"* instead of *"adopt a defensive documentation posture"*.

2. **ABSOLUTE ASTROLOGY & AYURVEDA JARGON BAN (BOTH TIERS):**
   - NEVER mention astrology, Vedic terms, charts, planets, signs, houses, transits, retrogrades, Sanskrit words, karma, or doshas (no Saturn, Mars, Rahu, Venus, 10th house, D-10, Arudha, Dasha, Sade Sati, Pitta, Vata, etc.).

3. **STRICT TWO-TIER MONETIZATION WALL:**
   - **IN THE FREE TIER (`hook_proof_json.career`):**
     - Copy ONLY `current_path_fit_score` verbatim from telemetry.
     - NEVER mention the 3 individual path percentages (`day_job_score`, `going_solo_score`, `hybrid_side_build_score`) anywhere in the free text.
     - NEVER mention ANY specific month name or season (Jan–Dec, January–December, Spring, Summer, Fall, Autumn, Winter) anywhere in `hook_proof_json.career`. Exact timing months are a PAID feature.
   - **IN THE PAID TIER (`full_blueprint_json.career`):**
     - Copy ALL 3 path scores (`day_job_score`, `going_solo_score`, `hybrid_side_build_score`) and EVERY `month_range` string VERBATIM from `career_telemetry`. Never invent, round, or widen numbers or month ranges.

4. **CAREER MODE EMPATHY (`career_mode`):**
   - Always adapt every sentence to `{career_mode}` and `{career_field}`.
   - **CRITICAL FOR `in_transition`:** If `career_mode === "in_transition"`, the user is currently between roles or recently left/lost a job. NEVER say "at your day job right now" or "don't quit your job." Instead, validate that their last chapter ran its course, encourage protecting their cash cushion without taking a panic role, highlight warm introductions/network outreach, and frame the `hybrid_side_build` path as "landing steady income or consulting while building your own thing."

5. **HIGH-AGENCY, NON-FATALISTIC TONE:**
   - Never predict layoffs, failure, bankruptcy, or bad luck. Frame tough timing windows as practical heads-ups ("office drama will test your patience more than usual here, so keep your cool").

---

### VOICE CALIBRATION EXAMPLES (MATCH THE GOOD VOICE):

❌ **BAD (Too Stiff / Corporate — REJECT):**
"You possess a surgical diagnostic mind that excels at untangling complex operational bottlenecks, yet purely backend execution creates a fulfillment deficit."

✅ **GOOD (Warm Mentor Talking to Mentee — MATCH THIS):**
"Honestly, you're the person everyone turns to when things get messy. Drop you into a broken system or a stressful deadline, and your brain just clicks into gear—you spot what's wrong and fix it faster than almost anyone else in the room."

❌ **BAD FREE TIER (Leaks Paid Score & Month — REJECT):**
"While your 9–5 fit is only 60%, your side-build score is 91% and December to January is your best launch window."

✅ **GOOD FREE TIER (Sharp Proof, Zero Leaks — MATCH THIS):**
"You have the grit to crush a tough 9–5, and weirdly, that's your trap. You don't hate hard work—you're just getting tired of pouring all that energy into someone else's machine without feeling like it truly helps people or belongs to you."
```

---

## 6. Guardrails & Server-Side Paywall Security (`src/lib/llm/guardrails.ts`)

Extend `auditBlueprintOutput()` with **5 mandatory Career Hook checks**:

1. **Corporate Buzzword & Cliché Guardrail (Both Tiers — triggers 1 auto-repair rewrite):**
   ```typescript
   const CORPORATE_BUZZWORD_REGEX = /\b(synerg\w*|operational footprint|surgical diagnostic|deliverables|value proposition|paradigm|tactical posture|stakeholder alignment|scalable ecosystem|maximize upside|deep transformation|tested your resilience)\b/i;
   ```
2. **Free-Tier Month & Score Leak Guardrail (CRITICAL FOR MONETIZATION):**
   * Recursively scan every string inside `hook_proof_json.career` for month names/seasons (`FREE_TIER_MONTH_LEAK_REGEX` shared with Hard Reset).
   * Assert no string inside `hook_proof_json.career` leaks the 3 paid scores (e.g., if `hybrid_side_build_score` is `91`, verify `"91%"` does not appear inside `hook_proof_json.career` unless it equals `current_path_fit_score`).
3. **Paid-Tier Deterministic Score Fidelity Check:**
   * Assert `full_blueprint_json.career.path_comparison` contains exact matches for `day_job_score`, `going_solo_score`, and `hybrid_side_build_score` from `career_telemetry.scores` (zero LLM math drift).
4. **Paid-Tier Exact Month-Range Fidelity Check:**
   * Assert every `full_blueprint_json.career.next_12_months.tight_monthly_windows[*].month_range` matches one of the exact `month_range` strings computed by `careerEngine.ts`.
5. **Strict Server-Side Redaction (`GET /api/blueprint/[chartId]`):**
   * When `is_paid === false` (and `DEV_UNLOCK_PREVIEW !== 'true'`), **strictly return `full_blueprint_json: null`** and never return `career_telemetry` over the wire.

---

## 7. Database Update (`supabase/migrations/005_career_hook_feedback.sql`)

```sql
ALTER TABLE blueprints
ADD COLUMN IF NOT EXISTS saved_alternative_lanes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS career_hook_engine_version TEXT DEFAULT 'v2_friendly_mentor_tiered';
```

---

## 8. File-by-File Implementation Checklist for Coding Agent

1. **Create `src/lib/astro/careerEngine.ts`:**
   * Import `historicalTransits.ts` (already built for Hard Reset) and implement `computeCareerTelemetry(normalizedChart, userContext, precisionMode, referenceDate)`.
   * Include the deterministic 3-path scoring algorithm (`day_job_score`, `going_solo_score`, `hybrid_side_build_score`, `current_path_fit_score`), `career_mode === 'in_transition'` handling, alternative lane matcher, and forward 12-month window scanner.
2. **Update Onboarding Career Options (`src/app/onboarding/...`):**
   * Ensure `career_mode` includes `employed`, `employed_hybrid` ("9–5 + Building on the Side"), `founder`, `freelance_hybrid`, and `in_transition` ("Between Roles / Exploring"), plus the optional 1-line `career_field` input.
3. **Update `src/lib/llm/schemas.ts`:**
   * Replace v1 `career` schema blocks with `CareerProofSchema` (Free) and `CareerDeepDiveSchema` (Paid).
4. **Create `src/lib/llm/prompts/careerPrompt.ts` & wire into `src/lib/llm/synthesizeBlueprint.ts`:**
   * Inject `career_telemetry` into Gemini synthesis alongside Hard Reset so one synthesis flow generates both the Free Career Teaser and Paid Full Career Guide.
5. **Update `src/lib/llm/guardrails.ts`:**
   * Add `CORPORATE_BUZZWORD_REGEX`, Free-tier career score/month leak checks, and Paid score/month fidelity checks.
6. **Update Proof Screen 2, Paywall & Unlocked Career Tab UI:**
   * **Proof Screen 2 (Free):** Render the glowing Career Fit Meter, Sweet Spot pill, 3 warm mentor observations, and the Locked Career Teaser Card (`9–5: ██% · Going Solo: ██% · Building on the Side First: ██%` + `[ ███ – ███ 2027 ]`).
   * **Unlocked Blueprint Hub (Paid):** Render the 3-Path Scorecard, Field Audit, bookmarkable Hidden Alternative Lanes, Perception Gap split card, Money & Quiet Leaks, and Next 12 Months tight flashpoint cards + Mind-Body Pacing tip.
   * Maintain clean fallback rendering for older cached v1 Supabase blueprints.
7. **Add Verification Benchmark Script (`scripts/test-career-hook-precision.ts`):**
   * **Test 1 (Chandan Employed Hybrid Benchmark — `exact`):** Run `17/09/1989`, `20:56`, `Muzaffarnagar, India` with `career_mode: 'employed_hybrid'`, `career_field: 'Tech / Software Development Management'`:
     * Assert deterministic scores match expected tiering (`hybrid_side_build_score > going_solo_score > day_job_score`, targeting ~`91 / 72 / 60`).
     * Assert Free payload has **0 astrology jargon**, **0 corporate buzzwords**, **0 leaked months**, and **0 leaked paid path scores**.
     * Assert Paid payload contains all 3 exact scores, 3–5 alternative lanes outside Tech, and exact forward `month_range` strings matching telemetry 100%.
   * **Test 2 (`in_transition` Empathy Benchmark):** Re-run Chandan's chart with `career_mode: 'in_transition'` → assert output never says `"at your day job"` or `"don't quit your job"`, and properly frames runway protection + warm outreach.
   * **Test 3 (Missing Birth Time — `date_only`):** Run `15/06/1992`, `Chicago, IL` without birth time → assert Moon/Sun fallback works, `upgrade_hint` is non-null, and **0 leaks** in Free tier.
   * **Test 4 (Guardrail & Redaction Check):** Pass poisoned JSON containing `"surgical diagnostic"`, `"Saturn"`, and `"Dec 2026 – Jan 2027"` in Free tier → assert all violations are caught and repaired, and confirm unpaid `GET /api/blueprint/[chartId]` returns `full_blueprint_json: null`.