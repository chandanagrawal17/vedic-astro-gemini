# Product & Engineering Spec: "Relationship Mirror" Hook Engine (3-Way Status Gate → Lovable Free Proof → Paid Relationship Guide)

**Target Repo:** Personal Blueprint MVP (Next.js 15 + TypeScript + Tailwind "Solar Obsidian" + Supabase + Gemini)  
**Scope:** Upgrade **Hook #2 (Conditional Relationship Mirror)** across the 1-Tap Status Gate, Deterministic Relationship & Timing Engine (`relationshipEngine.ts`), Discriminated-Union Zod Schemas, Lovable Mentor Prompts, Guardrails, Free Proof Screen 2, Server-Side Redaction, and Paid Unlocked Blueprint Hub.

**Core Business Objective:** Replace vague relationship horoscopes (*"you value loyalty and hate mixed signals"*) with an **uncannily personal, lovable "caught-red-handed" mirror** tailored strictly to the user's current status (`single` | `dating` | `married`)—using a past-year love callback + 1-tap accuracy check to pull users effortlessly through the Soft Account Gate and convert them to the **$19 Paid Blueprint** for their full blind-spot playbook and tight 1-to-3-month relationship timing windows.

---

## 1. Product Strategy: Single-Branch Personalization & The "Caught-Red-Handed" Funnel

### Why Generic Relationship Hooks Fail
1. **Showing All Branches Kills Immersion:** Rendering both "If Single" and "If Married" copy on the same screen immediately breaks the illusion that the app knows the user. **Only the single selected status may ever be generated or rendered.**
2. **Barnum-Effect Fluff:** Telling users *"you want honesty and dislike games"* applies to 99% of humans and fails to trigger signup urgency.
3. **Fatalistic Astrology Language:** Classical 7th-house/Upapada texts contain harsh phrases (divorce, infidelity, quarrelsome partner). In the US market, fatalistic language triggers anxiety, ad-account bans, and refunds. Every signal must be framed as **warm, lovable, high-agency behavioral insight**.

### Step 0: The 1-Tap Status Gate (Before Hook #2 Renders)
* If `profiles.relationship_status` was already captured in Onboarding, skip Step 0 and render their tailored branch immediately.
* If the user enters directly via `/love-mirror` (or has not set a status), display a single frosted Solar Obsidian gate:
  > **"Quick check so this actually fits your life right now:"**  
  > `[ Single ]` · `[ Dating Someone ]` · `[ Married ]`
* Map cleanly to enum: `'single' | 'dating' | 'married'`.
* Provide a quiet `"Change status"` link in the card footer. Changing status updates `profiles.relationship_status` and re-synthesizes **only** the `relationship` module (preserving cached Hard Reset and Career modules).

### The Two-Tier Free vs. Paid Split (Per Selected Status)

| Tier | What Is Shown (Strictly 1 Active Branch) | Backend Layers Exposed | Conversion Job |
| :--- | :--- | :--- | :--- |
| **FREE (Proof Screen 2)** | **1 Lovable Contradiction Headline** + **2 Caught-Red-Handed Everyday Tells** (Texting/Date-Night Split Screen + Body Tell *or* Perception Gap) + **1 Past-Year Love Callback** (Yearly range only, e.g., `2022 – 2023`, zero months) + **1-Tap Accuracy Check** + **Half-Unlocked "Spark vs. Peace" Teaser** + **Locked Timing Pill (`[ ███ – ███ 2027 ]`)** | **Layers 1–3** (Outer Armor vs. Inner Heart, Mental/Texting Tell, Somatic Tell, Past 5–7 Year Love Shift Year Range) | Trigger a genuine laugh + *"How did it know that about me?!"* tap → slide straight into the Soft Account Gate & $19 Unlock. |
| **PAID ($19 Full Blueprint Hub)** | **Full Single-Branch Playbook** (`Single`: Spark vs. Peace + #1 Blind Spot + Body Green-Flag Check · `Dating`: Real Alignment Check + Early-Dating Friction Loop + 10-Second Shift · `Married`: Where You Click vs. Silent Friction + Outside Stress Bleed + 10-Second Shift) + **Next 12 Months Tight 1-to-3-Month Windows** | **All 4 Layers** (adds **Layer 4**: Forward 12-Month Tight 1-to-3-Month Relationship Windows + Deep D-9/UL/Moon-Venus Synthesis) | Deliver warmth, clarity, a repeatable 10-second habit shift, and exact upcoming connection/patience months. |

---

## 2. Backend Architecture: Deterministic Relationship Engine (`src/lib/astro/relationshipEngine.ts`)

**Architectural Rule:** Never let Gemini guess past relationship years, invent future month windows, or rely on generic personality clichés. Compute all 4 personalization layers deterministically in `src/lib/astro/relationshipEngine.ts` using `normalized_chart_json` and the existing zero-cost `historicalTransits.ts` table (**2005–2030**), passing server-only JSON (`relationship_telemetry`) to Gemini.

### The 4 Deterministic Personalization Layers

#### Layer 1: The Lovable Contradiction & Everyday Tells (Powers Free Proof)
Compute three distinct behavioral signals from the natal chart:

1. **The Contradiction Headline (`outer_armor_tag` vs. `inner_heart_tag`):**
   * Contrast **`Lagna` + `Lagna Lord House`** (how they appear on the outside) against **`7th House` + `Natal Venus Sign/Dignity`** (what their heart secretly craves).
   * *Example (Chandan):* Aries Lagna/Moon + Mars in 6th (`independent_self_sufficient_exterior`) vs. Own-sign Libra Venus in 7th (`craves_warmth_taste_equal_teammate`) → *"A Soft-Hearted Romantic Wearing an 'I'm Totally Fine Alone' Jacket"*.
   * *Other examples:* Water Lagna + Saturn in 7th (`warm_giving_exterior` vs. `secretly_tests_reliability_slowly`); Air Lagna + Mars/Venus in 4th (`cool_playful_exterior` vs. `deeply_protective_homebody_heart`).

2. **The Texting & Date-Night Tell (`emotional_speed_tag` + `mental_filter_tag`):**
   * Combine **`Natal Moon Sign/Element`** (emotional tempo & messaging style) with **`Natal Mercury / Mars House`** (how their brain audits people).
   * *Example (Chandan):* Fire/Aries Moon (`direct_warm_no_games_when_in`) + Exalted Mercury/Mars in 6th (`background_10_point_audit_polite_silent_exit`) → *"The date-night split screen + polite silent exit when respect drops"*.

3. **The Body Tell (`somatic_love_tell_tag`):**
   * Combine natal **Element/Dosha balance** (Fire/Mars/Sun = heat & tension; Air/Saturn/Rahu = racing thoughts & restlessness; Earth/Water = heavy chest/withdrawal) with **Current Transit Saturn House** from Moon/Lagna:
     * Saturn in 12th → `tight_shoulders_light_sleep_late_night_organizing_or_work`
     * Saturn in 4th → `chest_tightness_home_restlessness_trouble_unwinding`
     * Saturn in 8th → `gut_tension_private_brooding_overanalyzing`
     * Saturn in 1st/2nd → `jaw_clenching_heavy_fatigue_going_quiet`

#### Layer 2: Past-Year Love Callback Scanner (Powers Free Proof — **YEARLY RANGE ONLY**)
Scan the past **5 to 7 years** in `historicalTransits.ts` for the highest-intensity historical relationship/standards shift:
* **Priority 1 (Highest):** Transit **Rahu/Ketu** crossing the **1st/7th axis** or directly hitting **Natal Venus** or **Natal 7th Lord** (e.g., *Chandan: April 2022 – Oct 2023* → formatted strictly for Free tier as **`2022 – 2023`**).
* **Priority 2:** Transit **Saturn** entering/aspecting the **7th house**, **Natal Venus**, or peak **Sade Sati** over Natal Moon.
* **Priority 3:** Major **Venus / 7th-Lord / Rahu-Ketu Antardasha** transition within the last 6 years.
* Map the hit to a secular behavioral tag:
  * Ketu on 7th/Venus → `stopped_tolerating_lukewarm_connections_standards_rewired`
  * Rahu on 7th/Venus → `intense_magnetic_lesson_that_exposed_real_needs`
  * Saturn on 7th/Venus → `heavy_maturity_test_around_effort_and_boundaries`

#### Layer 3: Spark vs. Peace & Status-Specific Playbook Signals (Half-Teased Free → Full Paid)
* **Initial Spark (`spark_traits_tags`):** Derived from **5th house sign**, **Natal Venus sign**, and **Darapada (A7)** (if `exact`). Shown in the Free teaser to prove accuracy.
* **Lasting Peace (`peace_traits_tags` — PAID EXCLUSIVE):** Derived from **Navamsha (D-9) 7th house/Venus** (if `exact`), **Upapada Lagna (UL)**, and **Natal Moon emotional safety needs**. Held back behind the paywall as the curiosity cliffhanger.
* **Recurring Friction / Blind-Spot Tag (`friction_pattern_tag` — PAID EXCLUSIVE):**
  * Tailored by `relationship_status`:
    * `single` → e.g., `fast_forward_in_head_or_over_filter_too_early`
    * `dating` → e.g., `fixing_instead_of_listening_or_pushing_for_clarity_too_fast`
    * `married` → e.g., `bringing_outside_stress_home_and_fix_it_mode_under_pressure`

#### Layer 4: Forward 12-Month Tight Relationship Windows (**PAID TIER EXCLUSIVE**)
Reuse `historicalTransits.ts` to scan `[referenceDate → referenceDate + 12 months]` and extract **3 tight, non-overlapping 1-to-3-month windows**:
1. **Warmth, Closeness & Introductions (`window_type: "warmth_and_closeness"`):** Transit Jupiter/Venus/Mercury activating 3rd, 5th, 7th, 9th, or 11th houses cleanly (e.g., `"Dec 2026 – Jan 2027"`).
2. **Patience & Reactivity Watch (`window_type: "patience_watch"`):** Transit Mars/Sun/Rahu agitating 1st, 4th, 6th, 7th, or 12th houses (e.g., `"Mar – May 2027"`).
3. **Grounded Serious Shift (`window_type: "grounded_shift"`):** Major Saturn/Jupiter/Node sign ingress or Antardasha handover affecting 1st/7th/Moon/Venus (e.g., `"June – Aug 2027"`).

### Precision Mode Graceful Degradation (`precision_mode`)
* **`exact` (Birth Time Known):** Uses Lagna, 7th house, Venus, Moon, Mercury/Mars house, D-9 Navamsha, UL, A7, and full transits.
* **`approx_window` / `date_only` (Missing Birth Time):**
  * Anchors strictly to **Natal Moon sign (Chandra Lagna)** + **exact Natal Venus, Mars, and Mercury signs** + **Nodal/Saturn transits over Natal Venus & Moon**.
  * Skips D-9 / UL / Lagna-only house claims and populates `upgrade_hint` (*"Add your exact birth time anytime to sharpen your long-term partnership & timing windows for free."*).

### Backend Output Contract (`relationship_telemetry` JSON — Server-Side Only)
**CRITICAL:** Never expose `relationship_telemetry` to the browser.

```json
{
  "precision_mode": "exact",
  "user_context": {
    "first_name": "Chandan",
    "relationship_status": "single"
  },
  "free_layer_signals": {
    "outer_armor_tag": "independent_self_sufficient_exterior",
    "inner_heart_tag": "craves_warmth_taste_banter_equal_teammate",
    "texting_tell_tag": "direct_warm_when_interested_polite_silent_exit_when_unappreciated",
    "date_night_tell_tag": "warm_attentive_outside_quiet_10_point_audit_inside",
    "somatic_body_tell_tag": "tight_shoulders_light_sleep_late_night_work_or_organizing_when_unsure",
    "past_love_shift": {
      "year_range": "2022 – 2023",
      "shift_theme_tag": "stopped_tolerating_lukewarm_connections_standards_rewired",
      "trigger_internal": "Ketu over natal Libra Venus (7th) + Rahu over natal Aries Moon/Lagna"
    },
    "spark_traits_preview_tags": ["confident", "sharp_banter", "good_taste", "lively_presence"]
  },
  "paid_layer_signals": {
    "peace_traits_tags": ["emotionally_steady", "warm_and_direct", "balances_fast_internal_clock_no_power_struggles"],
    "stop_excusing_tag": "hot_and_cold_ambiguity_that_triggers_overthinking",
    "primary_blind_spot_tag": "fast_forward_in_head_or_over_filter_on_minor_flaws_too_early",
    "reset_antidote_tag": "treat_first_3_dates_as_curiosity_not_lifelong_verdict_choose_from_fullness",
    "green_flag_body_check_tag": "shoulders_drop_easy_laughter_no_need_to_perform_or_recheck_texts",
    "forward_12m_timing": {
      "macro_season_year_span": "Now – Mid-2027",
      "macro_posture_tag": "quieter_rebuilding_season_quality_over_app_volume",
      "upcoming_windows": [
        {
          "id": "rw_01",
          "year_label": "2027",
          "month_range": "Dec 2026 – Jan 2027",
          "window_type": "warmth_and_closeness",
          "focus_tags": ["warm_introductions_through_friends", "real_life_events_beat_swiping", "easy_spark"]
        },
        {
          "id": "rw_02",
          "year_label": "2027",
          "month_range": "Mar – May 2027",
          "window_type": "patience_watch",
          "focus_tags": ["skip_rebounds_and_dating_fatigue", "inner_critic_runs_sharper", "dont_text_while_annoyed"]
        },
        {
          "id": "rw_03",
          "year_label": "2027",
          "month_range": "June – Aug 2027",
          "window_type": "grounded_shift",
          "focus_tags": ["casual_connections_lose_appeal", "serious_long_term_readiness_clicks_in", "higher_staying_power_matches"]
        }
      ]
    }
  }
}
```

---

## 3. UX & Paywall Conversion Flow (Solar Obsidian Aesthetic)

Preserve all **Solar Obsidian** visual tokens (`#0D0907` canvas, smoked frosted glass cards `rgba(28, 19, 14, 0.72)`, `#FF6B2B` sunset tangerine accents, `#F5A65B` warm amber highlights, editorial serif headlines + clean geometric sans-serif body).

### Free Tier — Proof Screen 2 Card ("Your Heart's Honest Mirror")
Designed to be read in **30 seconds** and trigger a genuine *"how did it know that?!"* reaction:
1. **Top Bar:** Eyebrow `RELATIONSHIP MIRROR` + Active Status Pill (e.g., `Single`) + tiny `Change` link.
2. **Lovable Contradiction Headline (Editorial Serif):**  
   e.g., *"A Soft-Hearted Romantic Wearing an 'I'm Totally Fine Alone' Jacket"*
3. **3 Punchy "Caught-Red-Handed" Cards (Unlocked Free — Zero Month Names):**
   * **Card A — The Texting / Everyday Tell:** Calls out their exact messaging or interaction quirk (e.g., direct when interested, polite silent exit when unappreciated—or the "date-night split screen").
   * **Card B — Your Body Tell:** Calls out the exact physical habit when emotional uncertainty hits (e.g., tight shoulders, light sleep, midnight organizing/work).
   * **Card C — Your Past Love Shift (`2022 – 2023`):** Names the exact yearly stretch that rewired their standards or relationship dynamic—paired immediately with the **1-Tap Accuracy Check**:
     > *"Be honest—did something quietly rewire how you do love around **2022 – 2023**?"*  
     > `[ Okay, weirdly accurate ]` · `[ Pretty close ]` · `[ Not really ]`
     *(Saves to `blueprints.love_accuracy_feedback` and logs PostHog event `rated_love_mirror_accuracy`.)*
4. **The Curiosity Cliffhanger + Locked Teaser Box:**
   * **Half-Unlocked Type / Dynamic Secret:** Gives away *who sparks their interest* (or *what makes their bond click*)—then locks the second half:
     * `🔒 Unlock the 1 quiet trait you keep overlooking that actually brings peace past Month 3` *(Single)*
     * `🔒 Unlock the 1 early-dating friction loop + the 10-second shift that cools tension` *(Dating)*
     * `🔒 Unlock the 1 silent marriage stress loop + the 10-second shift that softens tough nights` *(Married)*
   * **Locked Timing Row:** `🔒 Your Best Months Ahead (2026 – 2027): [ ███ – ███ 2027 ]`
   * Tapping any locked row logs `clicked_locked_relationship_guide` and advances smoothly into the **Soft Account Gate → $19 Paywall**.

### Paid Tier — Unlocked Blueprint Hub ("Your Full Relationship Guide")
Renders **strictly 1 branch** matching `relationship_status`:
* **If `single`:**
  1. **Spark vs. Staying Power** (Who catches your eye · The gap that drains you · What to stop excusing)
  2. **Your #1 Single Blind Spot** (Named loop + Warm Mentor Reset)
  3. **Your Real Green-Flag Body Check**
  4. **Your Next 12 Months as a Single** (Macro note + 3 glowing ember-pill tight monthly cards)
* **If `dating`:**
  1. **Real Alignment Check** (Spark vs. long-term pace · 3 clear signs you're actually aligned)
  2. **Your Early-Dating Friction Loop** + **The 10-Second Shift** (exact copyable/speakable phrasing)
  3. **Pacing & Boundary Playbook** (How to stay warm without overthinking between texts)
  4. **Your Next 12 Months in Dating** (Macro note + 3 glowing ember-pill tight monthly cards)
* **If `married`:**
  1. **Where You Truly Click vs. The Silent Friction Point** (Warm, high-agency, zero doom)
  2. **Leaving Outside Stress at the Door** (How work/life heat sneaks into home + somatic reset)
  3. **The 10-Second Shift** (Exact phrasing to defuse tense moments + the "offer warmth first" mirror rule)
  4. **Your Next 12 Months Together** (Macro note + 3 glowing ember-pill tight monthly cards)

---

## 4. Discriminated-Union Zod Schemas (`src/lib/llm/schemas.ts`)

Enforce **both** the Free-vs-Paid boundary AND the **Single-Branch Isolation** boundary:

```typescript
import { z } from "zod";

// ============================================================
// 1. FREE PROOF SCREEN 2 SCHEMA (SINGLE BRANCH, YEARLY ONLY)
// ============================================================
export const RelationshipProofSchema = z.object({
  relationship_status: z.enum(["single", "dating", "married"]),
  lovable_contradiction_headline: z
    .string()
    .min(18)
    .max(85)
    .describe("Warm, playful contradiction headline contrasting outer armor vs. inner heart."),
  caught_red_handed_tell: z
    .string()
    .min(60)
    .max(260)
    .describe("Hyper-specific texting, date-night, or everyday interaction habit that makes them laugh and feel seen."),
  somatic_body_tell: z
    .string()
    .min(50)
    .max(230)
    .describe("Concrete physical/nervous-system tell when emotional uncertainty or tension hits."),
  past_love_shift: z.object({
    year_range: z
      .string()
      .regex(/^\d{4}(\s?[–-]\s?\d{4})?$/, "Yearly range only (e.g. '2022 – 2023'). NEVER include month names."),
    what_shifted: z
      .string()
      .min(55)
      .max(240)
      .describe("Warm, relatable reflection on how their standards or love life shifted in that yearly stretch."),
    accuracy_prompt: z.string().max(110),
  }),
  half_unlocked_cliffhanger: z.object({
    unlocked_half: z
      .string()
      .min(40)
      .max(180)
      .describe("Give away who sparks their interest or what makes them click to prove accuracy."),
    locked_half_teaser: z
      .string()
      .min(35)
      .max(150)
      .describe("Curiosity gap teasing the exact trait/loop unlocked in the $19 guide."),
  }),
  locked_timing_year_label: z
    .string()
    .regex(/^\d{4}(\s?[–-]\s?\d{4})?$/, "Year or year-span only. NEVER include month names."),
  upgrade_hint: z.string().nullable().describe("Non-null only when precision_mode !== 'exact'."),
});

// ============================================================
// 2. PAID UNLOCKED HUB SCHEMA (DISCRIMINATED UNION BY STATUS)
// ============================================================
const ForwardLoveWindowSchema = z.object({
  id: z.string(),
  month_range: z
    .string()
    .min(5)
    .max(35)
    .describe("Exact 1-to-3-month range copied verbatim from telemetry.paid_layer_signals.forward_12m_timing."),
  window_title: z.string().min(5).max(50),
  practical_guidance: z.string().min(60).max(260),
});

const SharedPaidTimingSchema = z.object({
  big_picture_summary: z.string().min(60).max(250),
  tight_monthly_windows: z.array(ForwardLoveWindowSchema).min(2).max(4),
});

const SinglePaidSchema = z.object({
  relationship_status: z.literal("single"),
  spark_vs_peace: z.object({
    who_catches_your_eye: z.string().min(50).max(220),
    where_the_gap_hides: z.string().min(60).max(250),
    what_to_stop_excusing: z.string().min(45).max(200),
  }),
  single_blind_spot: z.object({
    loop_name: z.string().min(5).max(55),
    how_it_plays_out: z.string().min(65).max(280),
    gentle_mentor_reset: z.string().min(55).max(240),
  }),
  green_flag_body_check: z.string().min(55).max(240),
  next_12_months: SharedPaidTimingSchema,
});

const DatingPaidSchema = z.object({
  relationship_status: z.literal("dating"),
  real_alignment_check: z.object({
    spark_vs_pace: z.string().min(60).max(250),
    three_alignment_signs: z.array(z.string().min(30).max(150)).length(3),
  }),
  early_dating_friction: z.object({
    loop_name: z.string().min(5).max(55),
    how_it_shows_up: z.string().min(60).max(260),
    ten_second_shift: z.string().min(55).max(240),
  }),
  pacing_and_boundaries_tip: z.string().min(55).max(240),
  next_12_months: SharedPaidTimingSchema,
});

const MarriedPaidSchema = z.object({
  relationship_status: z.literal("married"),
  marriage_blueprint: z.object({
    where_you_truly_click: z.string().min(60).max(250),
    silent_friction_point: z.string().min(65).max(270),
    leaving_outside_stress_at_door: z.string().min(55).max(240),
  }),
  ten_second_shift: z.object({
    exact_phrase_to_try: z.string().min(35).max(180),
    why_it_softens_the_room: z.string().min(50).max(230),
  }),
  next_12_months: SharedPaidTimingSchema,
});

export const RelationshipDeepDiveSchema = z.discriminatedUnion("relationship_status", [
  SinglePaidSchema,
  DatingPaidSchema,
  MarriedPaidSchema,
]);
```

---

## 5. Production System Prompt (`src/lib/llm/prompts/relationshipPrompt.ts`)

Use this prompt module with your configured Gemini Flash model (`temperature: 0.45`, `responseMimeType: 'application/json'`).

```markdown
You are a lovable, warm, deeply perceptive mentor talking one-on-one with your friend {first_name} over coffee about love and close relationships.

Your job is to translate structured relationship telemetry (`relationship_telemetry`) into TWO strictly separated tiers for ONE active status ONLY (`relationship_status` = "{relationship_status}"):
1. `hook_proof_json.relationship` (FREE TIER): A lovable, "caught-red-handed" mirror—a playful contradiction headline, a hyper-specific texting/date-night tell, a real physical body tell, a past-year love shift (YEARLY RANGE ONLY), and a half-unlocked curiosity cliffhanger.
2. `full_blueprint_json.relationship` (PAID TIER): The complete, comforting, decision-ready Relationship Guide tailored strictly to `{relationship_status}`, unlocking their deeper pattern, gentle reset / 10-second shift, and exact 1-to-3-month timing windows for the next 12 months.

### STRICT RULES (NON-NEGOTIABLE):

1. **LOVABLE, HUMAN MENTOR VOICE (KILL GENERIC HOROSCOPE FLUFF):**
   - Sound like a wise, affectionate close friend who genuinely roots for {first_name}'s happiness. Use natural contractions ("you're", "don't", "let's be real", "honestly") and vivid, everyday scenes (Tuesday dinner, staring at a phone screen, shoulders dropping after a date).
   - BANNED GENERIC CLICHÉS (never use): "you value loyalty and communication", "you hate mixed signals", "you don't like games", "twin flame", "soulmate energy", "toxic narcissist", "attachment trauma", "deep transformation", "the universe is aligning".
   - Instead of saying *"you dislike mixed signals"*, show the exact scene: *"You don't play the 'wait four hours to seem cool' game—and the second you feel strung along, you don't start a dramatic fight; you just turn super polite and quietly pack your bags in your head."*

2. **STRICT SINGLE-BRANCH ISOLATION:**
   - Generate ONLY the `{relationship_status}` branch.
   - If `single`: NEVER mention "your spouse", "your marriage", or "your current partner".
   - If `dating`: NEVER mention "your spouse", "your marriage", or "being single".
   - If `married`: NEVER mention "first dates", "dating apps", "swiping", or "finding someone new".

3. **US SAFETY & HIGH-AGENCY GUARDRAIL (ZERO FATALISM):**
   - NEVER predict divorce, breakups, cheating, infidelity, loneliness, curses, or doomed relationships.
   - Reframe all planetary tension into warm, empowering habits (e.g., pausing before fixing, leaving work stress at the door, choosing from emotional fullness).

4. **ABSOLUTE ASTROLOGY & AYURVEDA JARGON BAN (BOTH TIERS):**
   - NEVER mention astrology, Vedic terms, charts, planets, signs, houses, transits, eclipses, retrogrades, Sanskrit words, karma, or doshas (no Venus, Mars, Ketu, Rahu, Saturn, 7th house, Navamsha, Upapada, Sade Sati, Pitta, Rajas, etc.).

5. **STRICT TWO-TIER DATE SEPARATION (MONETIZATION BOUNDARY):**
   - **IN THE FREE TIER (`hook_proof_json.relationship`):**
     - Copy ONLY `past_love_shift.year_range` (e.g., "2022 – 2023") and `locked_timing_year_label` (e.g., "2026 – 2027").
     - STRICTLY FORBIDDEN from mentioning ANY specific month name or season (Jan–Dec, January–December, Spring, Summer, Fall, Autumn, Winter) anywhere in `hook_proof_json.relationship`.
   - **IN THE PAID TIER (`full_blueprint_json.relationship`):**
     - Copy EVERY `month_range` string VERBATIM from `telemetry.paid_layer_signals.forward_12m_timing.upcoming_windows`. Never invent or widen month ranges.

---

### VOICE CALIBRATION (MATCH THE GOOD VOICE):

❌ **BAD FREE TIER (Vague Barnum Fluff — REJECT):**
"You are loyal, warm, and value honest communication. You dislike mixed signals and want a partner who respects you."

✅ **GOOD FREE TIER (Lovable & Caught-Red-Handed — MATCH THIS):**
- `lovable_contradiction_headline`: "A Soft-Hearted Romantic Wearing an 'I'm Totally Fine Alone' Jacket"
- `caught_red_handed_tell`: "This one might make you laugh—you can be sitting across from someone, totally warm and carrying a great conversation, while a quiet voice in the back of your head runs a 10-point check on whether she's genuinely real. Once your gut feels something is off, you stay super polite… while quietly checking out."
- `somatic_body_tell`: "When you can't tell where you stand with someone, it doesn't just stay in your thoughts—your shoulders tighten, your sleep gets weirdly light, and you'll catch yourself diving into late-night work or organizing your space just to feel back in control."
```

---

## 6. Guardrails & Server-Side Paywall Security (`src/lib/llm/guardrails.ts`)

Extend `auditBlueprintOutput()` with **5 mandatory Relationship Hook checks**:

1. **Relationship Cliché & Fatalism Ban (Both Tiers — triggers 1 auto-repair rewrite):**
   ```typescript
   const LOVE_CLICHE_REGEX = /\b(twin flame|soulmate energy|toxic narcissist|value loyalty and communication|hate mixed signals|deep transformation|universe is aligning)\b/i;
   const FATALISTIC_LOVE_REGEX = /\b(divorce|infidelity|cheating|unfaithful|doomed to fail|breakup is inevitable|cursed in love|destined to be alone)\b/i;
   ```

2. **Cross-Branch Leak Guardrail (Both Tiers):**
   * If `relationship_status === 'single'`: reject strings matching `/\b(your spouse|your husband|your wife|your marriage)\b/i`.
   * If `relationship_status === 'married'`: reject strings matching `/\b(dating apps?|swiping|first dates?|finding someone new)\b/i`.
   * If `relationship_status === 'dating'`: reject strings matching `/\b(your spouse|your husband|your wife|your marriage|as a single)\b/i`.

3. **Free-Tier Month-Leak Guardrail (CRITICAL FOR MONETIZATION):**
   * Recursively scan every string in `hook_proof_json.relationship` with the shared `FREE_TIER_MONTH_LEAK_REGEX`. Zero month names or seasons may leak into Free copy.

4. **Paid-Tier Exact Month-Range Fidelity Check:**
   * Assert every `full_blueprint_json.relationship.next_12_months.tight_monthly_windows[*].month_range` matches telemetry verbatim.

5. **Strict Server-Side Redaction (`GET /api/blueprint/[chartId]`):**
   * When `is_paid === false` (and `DEV_UNLOCK_PREVIEW !== 'true'`), **strictly return `full_blueprint_json: null`** and never return `relationship_telemetry` over the wire.

---

## 7. Database Update (`supabase/migrations/006_relationship_hook_v2.sql`)

```sql
ALTER TABLE blueprints
ADD COLUMN IF NOT EXISTS love_accuracy_feedback TEXT CHECK (love_accuracy_feedback IN ('weirdly_accurate', 'pretty_close', 'not_really')),
ADD COLUMN IF NOT EXISTS relationship_hook_engine_version TEXT DEFAULT 'v2_lovable_single_branch';
```

---

## 8. File-by-File Implementation Checklist for Coding Agent

1. **Create `src/lib/astro/relationshipEngine.ts`:**
   * Import `historicalTransits.ts` and implement `computeRelationshipTelemetry(normalizedChart, userContext, precisionMode, referenceDate)`.
   * Implement all 4 deterministic layers: Contradiction/Texting/Body Tells, Past 5–7 Year Love Shift Scanner (yearly output), Spark-vs-Peace & Blind-Spot Mapper, and Forward 12-Month Tight Window Scanner.

2. **Add Status-Change Re-Synthesis Endpoint (`POST /api/blueprint/[chartId]/relationship-status`):**
   * Allows a user to tap `"Change status"` (`single` | `dating` | `married`), updates `profiles.relationship_status`, re-runs `relationshipEngine.ts` + Gemini **only** for the `relationship` block, updates cached `blueprints`, and returns the fresh single-branch payload (still strictly redacting `full_blueprint_json` if unpaid).

3. **Update `src/lib/llm/schemas.ts`:**
   * Add `RelationshipProofSchema` and the 3-way discriminated union `RelationshipDeepDiveSchema`.

4. **Create `src/lib/llm/prompts/relationshipPrompt.ts` & wire into `src/lib/llm/synthesizeBlueprint.ts`:**
   * Inject `relationship_telemetry` alongside Hard Reset and Career so one synthesis pipeline powers all three upgraded hooks.

5. **Update `src/lib/llm/guardrails.ts`:**
   * Add `LOVE_CLICHE_REGEX`, `FATALISTIC_LOVE_REGEX`, Cross-Branch Leak checks, Free-tier month-leak checks, and Paid `month_range` fidelity verification.

6. **Update Proof Screen 2, `/love-mirror` Gate & Unlocked Relationship Tab UI:**
   * **Step 0 Gate:** Render the 1-tap `[ Single ] · [ Dating Someone ] · [ Married ]` selector if status is unset.
   * **Proof Screen 2 (Free):** Render Lovable Contradiction Headline, Caught-Red-Handed Tell, Body Tell, Past-Year Love Shift (`2022 – 2023`) + 1-Tap Accuracy Check, Half-Unlocked Cliffhanger, and Locked `[ ███ – ███ 2027 ]` row.
   * **Unlocked Hub (Paid):** Render strictly the single active branch (`Single`, `Dating`, or `Married`) with glowing ember-pill tight monthly timing cards.

7. **Add Verification Benchmark Script (`scripts/test-relationship-hook-precision.ts`):**
   * **Test 1 (Chandan Single Benchmark — `exact`):** Run `17/09/1989`, `20:56`, `Muzaffarnagar, India` with `relationship_status: 'single'`:
     * Assert Free payload detects `2022 – 2023` past shift, contains **0 astrology jargon**, **0 clichés**, **0 month leaks**, and **0 spouse/marriage words**.
     * Assert Paid payload matches `SinglePaidSchema`, contains exact forward `month_range` strings from telemetry, and passes all safety checks.
   * **Test 2 (Branch Isolation — `married` & `dating`):** Re-run with `married` (assert 0 dating-app/first-date words + 0 fatalistic divorce words) and `dating` (assert 0 spouse/single words).
   * **Test 3 (Missing Birth Time — `date_only`):** Run `15/06/1992`, `Chicago, IL` without birth time → assert Moon/Venus fallback works, `upgrade_hint` is non-null, and **0 leaks** in Free tier.
   * **Test 4 (Guardrail & Redaction Check):** Pass poisoned JSON containing `"divorce"`, `"twin flame"`, `"your spouse"` (on single), and `"Dec 2026 – Jan 2027"` (in Free tier) → assert all violations are caught and repaired, and confirm unpaid `GET /api/blueprint/[chartId]` returns `full_blueprint_json: null`.