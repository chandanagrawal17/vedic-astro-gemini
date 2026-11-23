# Product & Engineering Spec: High-Precision "Hard Reset" Hook Engine (Free Yearly Proof → Paid Tight Monthly Timeline)

**Target Repo:** Personal Blueprint MVP (Next.js 15 + TypeScript + Tailwind "Solar Obsidian" + Supabase + Gemini)

**Scope:** Upgrade **Hook #1 (The Hard Reset Pinpoint)** across Backend Chart Synthesis, LLM Prompts/Schemas, Free Proof Screen 1, Server-Side Redaction, and Paid Unlocked Blueprint Hub.

**Core Business Objective:** Turn timing precision itself into a high-converting paywall lever:
* **Free MVP (Proof Screen 1):** Deliver **exact yearly ranges** (e.g., `2022 – 2023`, `2020 – 2021`) paired with **uncannily specific, personalized real-life themes** (zero horoscope clichés, zero jargon) to earn instant trust—while **withholding exact months**.
* **Paid Unlock ($19 Full Blueprint):** Gate the **tight 1-to-3-month flashpoint timelines** (e.g., `Mid-Apr – June 2016`, `Late Oct – Nov 2022`), full somatic/nervous-system breakdowns, and the exact upcoming 2-to-3-month pressure window to drive Free → Paid conversion.

---

## 1. Product Strategy: The Two-Tier Specificity Funnel

### Why V1 Hard Reset Copy Under-Converts
1. **The "1/12th of the Planet" Trap:** Relying only on a single macro Saturn transit produces identical 2.5-year windows for everyone sharing a Moon sign, forcing the LLM into vague clichés (*"a tough time that made you stronger"*).
2. **Giving Away Too Little *or* Too Much:**
   * If Free Proof is vague, skeptical US users bounce before signup.
   * If Free Proof gives away every exact month-by-month spike, users get full closure for free and have less urgency to pay.

### The Upgraded Two-Tier Split
| Tier | Time Precision Shown | Backend Layers Exposed | Conversion Job |
| :--- | :--- | :--- | :--- |
| **FREE (Proof Screen 1)** | **Yearly Ranges Only** (e.g., `2022 – 2023`, `2020 – 2021`) — *0 month names leaked* | **Layers 1–3** (Macro Cycles + Natal House/Planet Targeting + Nodal Overlays) + **Redacted Count/Titles** of locked monthly spikes | Kill skepticism (*"How did it know 2022–2023 was an identity + relationship test?!"*) and create intense curiosity to see the exact months. |
| **PAID ($19 Full Blueprint Hub)** | **Tight 1-to-3-Month Flashpoints** (e.g., `Late Oct – Nov 2022`, `Mid-Apr – June 2016`) + Upcoming 2–3 Month Prep Window | **All 4 Layers** (adds **Layer 4**: Mars/Sun/Retrograde/Eclipse exact month flashpoints) + Somatic Stress & Leftover Survival Reflexes | Deliver jaw-dropping, month-level personal proof across all 2–4 reset chapters plus concrete forward preparation. |

---

## 2. Backend Architecture: The 4-Layer Precision Engine

**Architectural Rule:** Never ask the LLM to calculate historical transits or dates. All yearly chapters, planetary intersections, life-domain mappings, and tight 1-to-3-month flashpoints must be computed deterministically in `src/lib/astro/hardResetEngine.ts` and passed to Gemini as structured JSON (`hard_reset_telemetry`).

### Zero-Cost Ephemeris Strategy (`src/lib/astro/ephemeris/historicalTransits.ts`)
Because planetary sign-ingress dates and retrograde stations are **universal** (identical for all users), store a lightweight static sidereal (Lahiri Ayanamsha) lookup table covering **2005–2030** directly in the repo (~25 KB):
* **Saturn (`Shani`)** sign ingresses + retrograde windows.
* **Jupiter (`Guru`)** sign ingresses + debilitation/conjunction windows.
* **Rahu / Ketu** (True/Mean Node) 18-month sign ingress windows.
* **Mars (`Mangal`)** sign ingresses + retrograde stations (~45–60 day triggers; extended 4–6 month stays during retrograde).
* **Sun (`Surya`)** monthly sidereal sign ingresses (~14th–17th of each month, ~30-day spotlight triggers).

**Result:** Full 12-year historical scanning + yearly chapter grouping + tight 1-to-3-month flashpoint detection runs in **< 5 ms per user** with **$0 incremental API cost**.

### The 4 Intersecting Calculation Layers
Given a user's cached `normalized_chart_json` (natal planet signs, natal Lagna sign if `precision_mode === 'exact'`, natal Moon sign, and Vimsottari Mahadasha/Antardasha dates), scan the **past 12 years** (relative to `today`):

#### Layer 1: Macro Pressure Containers (Powers Free Yearly Ranges)
Identify historical macro pressure chapters by detecting:
* **Saturn Pressure Cycles (from Natal Moon):** `sade_sati` (12th/1st/2nd from Moon), `ashtama_shani` (8th Dhaiya), `kantaka_shani` (4th Dhaiya).
* **Saturn Structural Tests (from Lagna, if `exact`):** Saturn transiting 1st, 4th, 7th, 8th, 10th, or 12th house from Lagna.
* **Major Dasha Cliffs:** Mahadasha changeovers or Antardasha shifts activating natal 6th, 8th, or 12th house lords.

#### Layer 2: Specific Natal House & Planet Targeting (Makes Free Yearly Copy Deeply Personal)
Inside each Macro Container, calculate **exact hits** using classical Vedic aspects:
* **Saturn's 4 Targets:** Occupied sign + **3rd, 7th, and 10th signs** from transit Saturn.
* Check every target sign for: (1) which **natal house** it activates, and (2) which **natal planets** sit in that sign (especially **Moon, Venus, Sun, Mars, Mercury, Jupiter**).
* *Example:* Transit Saturn in Capricorn (10th house from Aries Lagna) simultaneously hits 10th house (career load), 4th house via 7th aspect (home/domestic restlessness), and **natal Venus in Libra (7th house)** via 10th aspect (work stress colliding with partnership expectations).

#### Layer 3: Nodal (Rahu/Ketu) Overlay on Natal Axis & Planets (Personalizes Free + Paid Domains)
For every 18-month Rahu/Ketu window in the last 12 years, detect high-intensity overlays:
* **Rahu/Ketu over Natal Moon or Lagna:** Intense personal restlessness, identity overhaul, impatience with conventional boxes.
* **Rahu/Ketu over Natal Venus or 7th House:** Relationship truth serum, sudden emotional detachment, make-or-break honesty test, or boundary reset.
* **Rahu/Ketu over Natal 6th/12th Axis (or natal Sun/Mars/Mercury cluster):** Relocation/foreign transition, visa/bureaucracy friction, relentless daily grind, sleep disruption, or digestive/nervous heat.
* **Rahu/Ketu over Natal 2nd/8th Axis:** Tightening finances/family obligations paired with sudden pull toward deep self-inquiry or psychology.
* **Rahu/Ketu over Natal 5th/11th Axis:** Romantic crossroads, outgrowing an older friend circle or early-career ambition.

#### Layer 4: Tight 1-to-3-Month Flashpoint Extraction (**PAID TIER EXCLUSIVE**)
Inside each selected Yearly Chapter, isolate **2 to 4 tight 1-to-3-month spikes** using fast triggers:
1. **Mars + Saturn Double Pressure / Retrograde Lock (Highest Priority):** Transit Mars joining/aspecting Saturn or turning retrograde in an active pressure house (6th, 8th, 10th, 12th, or over natal Moon/Venus) → **6-to-12-week bottleneck or boiling point**.
2. **Mars Triggering Natal Clusters or Nodes:** Transit Mars crossing Rahu/Ketu or conjuncting natal Moon, Venus, or 4th/6th/7th/10th planets → **4-to-8-week acute spike** (conflict, abrupt cut, sudden workload, physical burnout).
3. **Sun Spotlight on Nodal/Saturn Pressure Points:** Transit Sun moving through a sign occupied by Saturn, Rahu, or Ketu (eclipse corridor months) → **4-to-6-week visibility cliff, authority friction, or clarity snap**.
4. **Jupiter + Saturn / Rahu Conjunctions:** Jupiter joining Saturn in a career/pressure house or joining Rahu over natal Moon → **unconventional ambition surge colliding with domestic unrest**.

**Flashpoint Deduplication Rules:**
* Merge overlapping triggers within 30 days into one crisp window (min **3 weeks**, max **3 months**, formatted like `"Mid-Apr – June 2016"` or `"Late Oct – Nov 2022"`).
* Score each flashpoint (`intensity_score: 1–100`) and ensure no two flashpoints inside the same chapter share the exact same primary life-domain tag.

### Deterministic Astro-to-Real-Life Domain Mapper
Map stacked backend triggers to **concrete, secular behavioral/life-domain tags** before calling Gemini:

| Backend Trigger Pattern | `domain_tags` Passed to LLM | Concrete Real-Life Translation Hints (Internal Only) |
| :--- | :--- | :--- |
| 12th house + Rahu/Ketu/Saturn | `uprooting_or_relocation`, `private_loneliness`, `broken_sleep` | Moving far from home, new city/country, visa/paperwork drag, unexpected costs, light sleep |
| 6th house cluster (Sun/Mars/Merc) + Rahu/Mars | `peak_daily_grind`, `authority_or_peer_friction`, `gut_and_nervous_heat` | Tight deadlines, tough bosses/peers, constant firefighting, acidity/digestion or burnout |
| 8th house + Saturn/Mars Rx | `stalled_plan_bottleneck`, `paperwork_or_cash_pinch`, `feeling_boxed_in` | Effort stops matching results, money/admin stall, abrupt ending where pushing harder fails |
| 4th house hit by Saturn/Mars | `home_base_unrest`, `housing_or_family_worry` | Unsettled living space, move/real-estate stress, quiet family worry, trouble switching off |
| 10th house Saturn (+ weak Jupiter / Mars) | `sudden_heavy_workload`, `underleveraged_career_grind` | Long hours under rigid constraints, heavy duty with low fulfillment, corporate treadmill wall |
| Natal Venus / 7th house hit by Saturn | `work_vs_partner_squeeze`, `relationship_maturity_test` | Job pressure bleeding into personal life, heavy relationship expectations, high-stakes dating |
| Natal Venus / 7th house hit by Ketu + Sun/Mars | `relationship_truth_serum`, `emotional_detachment_or_boundary` | Illusions dropping fast, sudden detachment, make-or-break honesty talk, firm boundary |
| Natal Moon / 1st house hit by Rahu (+ Mars/Jup) | `identity_restlessness`, `unconventional_ambition_surge`, `short_fuse` | Feeling caged in conventional boxes, strong urge to build something of your own, racing mind |
| 5th/11th axis + Saturn/Nodes | `outgrowing_old_circle`, `romantic_crossroads`, `early_goal_reset` | Closing the door on early-20s track, outgrowing friends, shifting long-term priorities |
| 2nd/8th axis + Nodes/Saturn | `financial_rethink`, `pull_toward_deep_answers` | Cash-flow/family duty jolt paired with sudden draw to psychology, self-inquiry, or deeper study |

### Precision Mode Graceful Degradation (`precision_mode`)
* **`exact` (Birth Time Known):** Use full Lagna houses + Moon houses + all natal planet placements + Saturn aspects + Nodal hits + Mars/Sun triggers + Dasha shifts.
* **`approx_window` / `date_only` (Missing Birth Time):**
  * Set `anchor_mode = "lunar_natal_planets"`.
  * Compute intersections strictly against **Natal Moon sign (Chandra Lagna)** and **exact natal planet signs** (Venus, Sun, Mars, Mercury, Jupiter, Saturn).
  * Exclude pure Lagna-only house tags unless corroborated by Moon sign or natal planet hits.
  * Populate `upgrade_hint` with a subtle note (*"Add your exact birth time anytime to sharpen career & home timelines for free."*).

### Backend Output Contract (`hard_reset_telemetry` JSON — Server-Side Only)
`hardResetEngine.ts` passes this complete payload into `synthesizeBlueprint.ts`. **CRITICAL:** This raw telemetry object must **never** be sent to the browser.

```json
{
  "precision_mode": "exact",
  "user_context": {
    "first_name": "Chandan",
    "age_now": 37,
    "relationship_status": "married",
    "career_mode": "employed_hybrid",
    "career_field": "Tech / Software"
  },
  "selected_chapters": [
    {
      "chapter_id": "ch_2022_2023",
      "priority_rank": 1,
      "year_range": "2022 – 2023",
      "macro_theme_tags": ["identity_overhaul", "relationship_honesty_test", "independent_ambition"],
      "somatic_stress_tags": ["racing_mind", "impatience_spikes", "sprint_and_crash_fatigue"],
      "flashpoints": [
        {
          "id": "fp_2022_01",
          "year_label": "2022",
          "month_range": "Late June – early Aug 2022",
          "intensity_score": 93,
          "domain_tags": ["identity_restlessness", "short_fuse", "autopilot_rejection"],
          "trigger_summary_internal": "Mars + Rahu over natal Aries Moon/Lagna"
        },
        {
          "id": "fp_2022_02",
          "year_label": "2022",
          "month_range": "Late Oct – Nov 2022",
          "intensity_score": 95,
          "domain_tags": ["relationship_truth_serum", "emotional_detachment_or_boundary", "commitment_audit"],
          "trigger_summary_internal": "Solar eclipse + Sun/Venus/Ketu over natal Libra Venus (7th)"
        },
        {
          "id": "fp_2023_01",
          "year_label": "2023",
          "month_range": "May – June 2023",
          "intensity_score": 88,
          "domain_tags": ["unconventional_ambition_surge", "home_base_unrest"],
          "trigger_summary_internal": "Jupiter + Rahu over natal Moon while Mars debilitated in 4th"
        },
        {
          "id": "fp_2023_02",
          "year_label": "2023",
          "month_range": "Oct – mid-Nov 2023",
          "intensity_score": 91,
          "domain_tags": ["chapter_closeout", "partnership_expectation_reset", "fresh_start_shift"],
          "trigger_summary_internal": "Mars + Sun + Ketu final pass over natal Venus in 7th"
        }
      ]
    },
    {
      "chapter_id": "ch_2020_2021",
      "priority_rank": 2,
      "year_range": "2020 – 2021",
      "macro_theme_tags": ["heavy_career_load", "home_base_unrest", "work_vs_partner_squeeze"],
      "somatic_stress_tags": ["mental_burnout", "late_night_overthinking"],
      "flashpoints": [
        {
          "id": "fp_2020_01",
          "year_label": "2020",
          "month_range": "Late Mar – early May 2020",
          "intensity_score": 90,
          "domain_tags": ["sudden_heavy_workload", "rigid_constraints"],
          "trigger_summary_internal": "Exalted Mars + Saturn + Jupiter in 10th house"
        },
        {
          "id": "fp_2020_02",
          "year_label": "2020",
          "month_range": "Sept – Nov 2020",
          "intensity_score": 89,
          "domain_tags": ["hidden_burnout_wall", "financial_rethink", "pull_toward_deep_answers"],
          "trigger_summary_internal": "Mars Rx in 1st/12th + Ketu entering 8th"
        },
        {
          "id": "fp_2021_01",
          "year_label": "2021",
          "month_range": "Sept – Nov 2021",
          "intensity_score": 92,
          "domain_tags": ["peak_daily_grind", "work_vs_partner_squeeze"],
          "trigger_summary_internal": "Mars crossing 6th cluster then 7th natal Venus aspected by 10th Saturn"
        }
      ]
    },
    {
      "chapter_id": "ch_2014_2016",
      "priority_rank": 3,
      "year_range": "2014 – 2016",
      "macro_theme_tags": ["uprooting_or_relocation", "peak_daily_grind", "stalled_plan_bottleneck"],
      "somatic_stress_tags": ["broken_sleep", "gut_and_nervous_heat"],
      "flashpoints": [
        {
          "id": "fp_2015_01",
          "year_label": "2015",
          "month_range": "Feb – Mar 2015",
          "intensity_score": 87,
          "domain_tags": ["uprooting_or_relocation", "private_loneliness", "broken_sleep"],
          "trigger_summary_internal": "Mars + Ketu in 12th during 8th Saturn"
        },
        {
          "id": "fp_2016_01",
          "year_label": "2016",
          "month_range": "Mid-Apr – June 2016",
          "intensity_score": 96,
          "domain_tags": ["stalled_plan_bottleneck", "paperwork_or_cash_pinch", "feeling_boxed_in"],
          "trigger_summary_internal": "Saturn Rx + Mars Rx locked together in 8th house"
        }
      ]
    }
  ],
  "total_flashpoints_detected": 9,
  "upcoming_prep_window": {
    "year_label": "2027",
    "month_range": "June – Aug 2027",
    "domain_tags": ["accountability_audit", "foundation_stress_test", "cash_and_health_discipline"],
    "trigger_summary_internal": "Saturn entering Aries (1st/Moon) — start of peak Sade Sati"
  }
}
```

---

## 3. UX & Paywall Conversion Flow (Free Yearly Proof → Paid Tight Monthly Timeline)

Keep all **Solar Obsidian** visual tokens (`#0D0907` canvas, frosted smoked glass cards, `#FF6B2B` sunset tangerine accents, editorial serif headings + clean geometric sans-serif body) strictly intact.

### Free Proof Screen 1 — "Yearly Accuracy Proof + Locked Monthly Timeline Hook"
Design Proof Screen 1 to **earn trust via specific yearly ranges** and **trigger paid desire via locked monthly precision**:

1. **Header Eyebrow:** `HARD RESET PINPOINT`
2. **Primary Reset Yearly Card (Unlocked Free — `priority_rank: 1`):**
   * **Glowing Year Pill:** `2022 – 2023` *(strictly yearly range—no months shown)*
   * **Editorial Chapter Title:** e.g., **The Identity Overhaul & Honesty Test**
   * **2–3 Sharp, Personalized Real-Life Themes (Unlocked Free):**
     * Concrete, domain-specific observations proving this isn't a generic horoscope (e.g., *"A restless urge to break out of conventional boxes and build something of your own—paired with a make-or-break honesty test in a close one-on-one bond."*).
   * **1-Line "What It Rewired In You":** High-agency takeaway.
3. **Secondary Reset Yearly Pill (Unlocked Free — `priority_rank: 2`):**
   * Compact smoked-glass strip: **`Also detected: 2020 – 2021 · The Heavy Career & Home Squeeze`** + 1 crisp sentence naming the core friction (e.g., *"Long hours in an under-leveraged role colliding with domestic restlessness and personal pressure."*).
4. **Interactive Accuracy Validator (Micro-Commitment):**
   * Prompt: *"Did those years actually hit like this?"*
   * Buttons: `[ Scarily Accurate ]` · `[ Close ]` · `[ Off ]`
   * Saves immediately to `blueprints.accuracy_feedback`.
5. **The Paid Conversion Hook — Locked Tight Monthly Timeline Card (Inside Proof Screen 1 & Highlighted on the $19 Paywall):**
   * Eyebrow: `🔒 TIGHT MONTHLY TIMELINE DETECTED`
   * Headline: **"Want the exact 1-to-3-month pressure spikes inside these years?"**
   * Renders **3 frosted, blurred-date teaser rows** (zero real month names sent to client—only year label + visceral spike title):
     * `🔒 [ ███ – ███ 2022 ] · The Boiling Point`
     * `🔒 [ ███ – ███ 2022 ] · The Relationship Truth Serum`
     * `🔒 [ ███ – ███ 2023 ] · Big Vision vs. Domestic Unrest`
   * Subtext + CTA: *"We pinpointed **9 exact 1-to-3-month flashpoints** across your 2014–2023 reset chapters—plus the exact months of your next pressure window. Unlock your tight monthly timeline in the Full Blueprint ($19)."*
   * Tapping any locked row smoothly advances the user toward the Soft Account Gate → Stripe $19 Paywall (and logs a PostHog event `clicked_locked_monthly_timeline`).

### Stripe $19 Paywall Bullet Upgrade
Ensure the $19 Paywall checklist explicitly highlights the monthly timeline upgrade as Value Prop #1:
* ✅ **Tight 1-to-3-Month Hard Reset Timeline** — Exact peak pressure months across your last 10+ years + your exact upcoming prep months (not broad yearly ranges).
* *(Followed by the existing 4 hooks: Full Relationship Mirror, Career & Business Audit, Self-Sabotage Antidote, and Current Era Playbook.)*

### Paid Unlocked Blueprint Hub — "Full Tight Monthly Timeline Deep-Dive"
Once `is_paid === true` (or `DEV_UNLOCK_PREVIEW === 'true'` locally):
* Unlocks **all 2–4 Historical Reset Chapters** (`2022–2023`, `2020–2021`, `2014–2016`), each displaying:
  * **Exact 1-to-3-Month Flashpoint Cards** (`Late June – early Aug 2022`, `Late Oct – Nov 2022`, `Mid-Apr – June 2016`, etc.) with glowing sunset-tangerine month pills, visceral titles, and concrete real-life descriptions.
  * **1-Tap Memory Confirmation (Optional):** Paid users can tap *"This month hit"* on any flashpoint card (`blueprints.confirmed_flashpoint_ids`) to bookmark milestones.
  * **How It Felt Inside:** Internal psychology + somatic/nervous-system stress signals (light sleep, gut heat, wired exhaustion).
  * **What It Rewired In You:** Earned strength + leftover survival reflex to unlearn today.
* **Next High-Pressure Window Prep Card:**
  * Names the exact upcoming **2-to-3-month window** (e.g., `June – Aug 2027`) + **3 concrete, high-agency prep moves**.

---

## 4. Updated Zod Schemas (`src/lib/llm/schemas.ts`)

Enforce a **hard architectural wall** between the Free Yearly Proof schema (`hook_proof_json`) and the Paid Monthly Timeline schema (`full_blueprint_json`):

```ts
import { z } from "zod";

// ==========================================
// 1. FREE PROOF SCREEN 1 SCHEMA (YEARLY ONLY)
// ==========================================
const LockedMonthlyTeaserSchema = z.object({
  id: z.string(),
  year_label: z
    .string()
    .regex(/^\d{4}$/, "Must be a 4-digit year only (e.g., '2022'). Never include month names."),
  title: z
    .string()
    .min(3)
    .max(45)
    .describe("3-5 word visceral flashpoint title to create curiosity without revealing the month."),
});

export const HardResetProofSchema = z.object({
  primary_year_range: z
    .string()
    .min(4)
    .max(20)
    .describe("Exact yearly span only, e.g. '2022 – 2023'. NEVER include months or seasons."),
  primary_chapter_title: z.string().max(60),
  intro_hook: z.string().max(150),
  concrete_real_life_themes: z
    .array(z.string().min(35).max(190))
    .min(2)
    .max(3)
    .describe("2-3 sharp, personalized everyday life themes for this yearly stretch. Zero clichés, zero month names."),
  what_it_rewired: z
    .string()
    .max(180)
    .describe("1 crisp sentence on the lasting shift this yearly chapter forged."),
  secondary_year_window: z.object({
    year_range: z.string().min(4).max(20).describe("Yearly span only, e.g. '2020 – 2021'."),
    chapter_title: z.string().max(60),
    one_line_snapshot: z.string().max(160),
  }),
  locked_monthly_timeline_teaser: z.object({
    total_locked_flashpoints: z.number().int().min(3).max(16),
    locked_chapters_span: z.string().max(25).describe("e.g., '2014 – 2023'"),
    preview_items: z
      .array(LockedMonthlyTeaserSchema)
      .min(2)
      .max(3)
      .describe("2-3 blurred-date teaser titles from the primary chapter. Year only, NO month names."),
    paywall_cta_line: z.string().max(140),
  }),
  upgrade_hint: z.string().nullable().describe("Non-null only when precision_mode !== 'exact'."),
});

// ==================================================
// 2. PAID UNLOCKED HUB SCHEMA (TIGHT MONTHLY TIMELINE)
// ==================================================
const PaidMonthlyFlashpointSchema = z.object({
  id: z.string(),
  month_range: z
    .string()
    .min(5)
    .max(35)
    .describe("Exact 1-to-3-month range copied verbatim from telemetry, e.g. 'Late Oct – Nov 2022'."),
  title: z
    .string()
    .min(3)
    .max(45)
    .describe("3-5 word visceral title matching or deepening the locked teaser."),
  real_life_event: z
    .string()
    .min(40)
    .max(240)
    .describe("1-2 sharp sentences naming concrete everyday events, emotions, or physical signals."),
});

const HardResetPaidChapterSchema = z.object({
  chapter_id: z.string(),
  year_range: z.string().max(20),
  chapter_title: z.string().max(60),
  flashpoints: z
    .array(PaidMonthlyFlashpointSchema)
    .min(2)
    .max(4)
    .describe("Tight 1-to-3-month pressure spikes inside this yearly chapter."),
  how_it_felt_inside: z
    .string()
    .max(260)
    .describe("Internal psychology + somatic/nervous-system stress signals (sleep, digestion, mental heat, fatigue)."),
  what_it_rewired: z
    .string()
    .max(220)
    .describe("Earned resilience AND the leftover survival reflex to watch out for today."),
});

export const HardResetDeepDiveSchema = z.object({
  chapters: z.array(HardResetPaidChapterSchema).min(2).max(4),
  core_pattern_thread: z
    .string()
    .max(240)
    .describe("1-2 sentences tying all reset chapters into one coherent evolution story."),
  next_pressure_window: z.object({
    month_range: z.string().max(35).describe("Exact upcoming 2-to-3-month window from telemetry."),
    window_title: z.string().max(50),
    what_to_expect: z.string().max(220),
    prep_moves: z.array(z.string().max(120)).length(3),
  }),
});
```

---

## 5. Upgraded Production System Prompt (`src/lib/llm/prompts/hardResetPrompt.ts`)

Use this exact prompt module for the Hard Reset synthesis step (compatible with `gemini-3.8-flash`, `temperature: 0.35`, `responseMimeType: 'application/json'`).

```text
You are a sharp, empathetic modern behavioral mentor with 35 years of pattern-recognition mastery and deep understanding of mind-body stress physiology.

Your job is to translate structured historical timing telemetry (`hard_reset_telemetry`) into TWO strictly separated tiers:
1. `hook_proof_json.hard_reset` (FREE TIER): Uses **YEARLY RANGES ONLY** paired with concrete, deeply personal real-life themes—plus redacted titles teasing the locked monthly timeline.
2. `full_blueprint_json.hard_reset` (PAID TIER): Unlocks the **EXACT 1-TO-3-MONTH FLASHPOINT TIMELINE** inside every reset chapter plus the upcoming 2-to-3-month prep window.

### STRICT RULES (NON-NEGOTIABLE):

1. **ABSOLUTE JARGON BAN (BOTH TIERS):**
   NEVER mention astrology, Vedic terms, planets, zodiac signs, houses, transits, eclipses, retrogrades, Sanskrit words, karma, or Ayurvedic dosha names (no Saturn, Mars, Rahu, Ketu, Venus, Aries, Virgo, 8th house, Dasha, Sade Sati, Dhaiya, Pitta, Vata, etc.). Translate 100% into modern psychology, everyday logistics, relationships, work, and somatic/nervous-system signals.

2. **STRICT TWO-TIER DATE SEPARATION (MONETIZATION BOUNDARY):**
   - **IN THE FREE TIER (`hook_proof_json.hard_reset`):**
     - Use **YEARLY RANGES ONLY** copied from telemetry `year_range` (e.g., "2022 – 2023", "2020 – 2021").
     - **STRICTLY FORBIDDEN** from mentioning ANY specific month name or season (NEVER write January–December, Jan–Dec, Spring, Summer, Fall, Autumn, Winter, "early/late [month]", or "10-week") anywhere inside `hook_proof_json.hard_reset`. Exact months are a PAID feature.
     - For `locked_monthly_timeline_teaser.preview_items`, output ONLY the 4-digit `year_label` (e.g., "2022") and a sharp, curiosity-building 3–5 word `title` (e.g., "The Relationship Truth Serum").
   - **IN THE PAID TIER (`full_blueprint_json.hard_reset`):**
     - Every single flashpoint MUST preserve the **exact 1-to-3-month `month_range`** copied verbatim from `hard_reset_telemetry` (e.g., "Mid-Apr – June 2016", "Late Oct – Nov 2022").
     - NEVER widen a paid flashpoint into a bare year (e.g., never write "2022" as a `month_range`).
     - NEVER invent dates that are not present in `hard_reset_telemetry`.

3. **ANTI-VAGUENESS & CONCRETE REAL-LIFE MANDATE (BOTH TIERS):**
   - Even though the FREE tier uses yearly ranges, it MUST still feel uncannily specific to this user—NEVER vague horoscope soup.
   - BANNED HOROSCOPE CLICHÉS (never use): "a period of deep transformation", "obstacles tested your resilience", "the universe pushed you to grow", "you emerged stronger", "hidden energies shifted", "a major turning point in your journey".
   - Ground every bullet in **2–3 concrete, lived real-world experiences** mapped directly from `domain_tags`:
     - Work/Money: sudden workload under rigid constraints, tough superiors/peers, feeling under-leveraged in a role, stalled plan, paperwork/visa drag, financial pinch.
     - Home/Location: uprooting/relocation far from support, unsettled living space, housing/move stress, quiet worry around family.
     - Relationships: work frustration spilling into a close bond, illusions dropping fast, sudden emotional detachment, make-or-break honesty talk, drawing a firm boundary, outgrowing an older circle.
     - Body/Nervous System: light/broken sleep, brain refusing to switch off at night, gut heat/acidity, shorter fuse, wired-but-exhausted sprint crashes.

4. **TONE & HIGH-AGENCY FRAMING:**
   - Warm, candid, razor-sharp US mentor speaking directly to `{first_name}` ("you").
   - Never use fatalistic or scary language ("divorce", "doomed", "cursed", "bad luck", "crisis disaster", "clinical depression").

5. **PRECISION MODE HONESTY:**
   - If `precision_mode !== "exact"`, rely strictly on the provided `domain_tags` without guessing exact housing or workplace hierarchy details absent from telemetry, and populate `upgrade_hint`. Otherwise set `upgrade_hint: null`.

---

### QUALITY CALIBRATION (FREE vs. PAID EXAMPLES):

❌ **BAD FREE TIER (Vague Horoscope Soup — REJECT):**
- `primary_year_range`: "2022 – 2023"
- `concrete_real_life_themes`: ["This was a transformative period where obstacles tested your resilience and pushed you to grow."]

❌ **BAD FREE TIER (Leaks Paid Months — REJECT):**
- `primary_year_range`: "2022 – 2023"
- `concrete_real_life_themes`: ["In late October to November 2022, you hit a make-or-break honesty talk in your relationship."]

✅ **GOOD FREE TIER (Yearly Range Only + Uncanny Real-Life Specificity — MATCH THIS):**
- `primary_year_range`: "2022 – 2023"
- `primary_chapter_title`: "The Identity Overhaul & Honesty Test"
- `concrete_real_life_themes`:
  - "A sharp shift from enduring the grind to feeling caged inside conventional boxes—sparking an intense urge to build something genuinely yours."
  - "A truth-serum stretch in close one-on-one bonds where going through the motions stopped working, forcing sudden detachment, a blunt honesty talk, or a firm boundary."
  - "High-speed ambition colliding with domestic restlessness, leaving your mind swinging between intense sprints and abrupt mental exhaustion."
- `locked_monthly_timeline_teaser.preview_items`:
  - `{ "id": "fp_2022_01", "year_label": "2022", "title": "The Boiling Point" }`
  - `{ "id": "fp_2022_02", "year_label": "2022", "title": "The Relationship Truth Serum" }`
  - `{ "id": "fp_2023_01", "year_label": "2023", "title": "Big Vision vs. Domestic Unrest" }`

✅ **GOOD PAID TIER (Exact 1-to-3-Month Flashpoint Precision — MATCH THIS):**
- `month_range`: "Late Oct – Nov 2022"
- `title`: "The Relationship Truth Serum"
- `real_life_event`: "Illusions dropped fast in a close one-on-one bond—triggering either sudden emotional detachment, a make-or-break honesty talk, or drawing a firm boundary."
```

---

## 6. Guardrails & Server-Side Paywall Security (`src/lib/llm/guardrails.ts` + API Route)

Extend `auditBlueprintOutput()` and `GET /api/blueprint/[chartId]` with **4 mandatory enforcement checks**:

1. **Cliché Ban Regex (Both Tiers — triggers 1 auto-repair rewrite):**
   ```ts
   const CLICHE_REGEX = /\b(deep transformation|tested your resilience|emerged stronger|cosmic shift|hidden energies|universe pushed|spiritual journey|major turning point)\b/i;
   ```

2. **Free-Tier Month-Leak Guardrail (CRITICAL FOR MONETIZATION):**
   Recursively scan every string inside `hook_proof_json.hard_reset` against:
   ```ts
   const FREE_TIER_MONTH_LEAK_REGEX = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec|spring|summer|autumn|fall|winter|mid-[a-z]+)\b/i;
   ```
   *(Note: Exclude the auxiliary verb `"may"` only when preceded by pronouns/nouns like `"you may"` / `"this may"`, OR better yet instruct the prompt to avoid `"may"` altogether in free copy and match capitalized `May` or month-adjacent patterns.)*
   If triggered, run the 1-shot auto-repair loop instructing Gemini to strip the month/season while keeping the concrete real-life theme intact.

3. **Paid-Tier Exact Month-Range Fidelity Check:**
   Assert every `full_blueprint_json.hard_reset.chapters[*].flashpoints[*].month_range` and `next_pressure_window.month_range` matches one of the exact `month_range` strings computed by `hardResetEngine.ts` (zero LLM date hallucinations).

4. **Strict Server-Side Redaction (`GET /api/blueprint/[chartId]`):**
   * When `is_paid === false` (and `DEV_UNLOCK_PREVIEW !== 'true'`), **strictly return `full_blueprint_json: null`** from the server.
   * Never return `hard_reset_telemetry` or `flashpoints[].month_range` to unpaid clients so tech-savvy users cannot scrape their tight monthly timeline from the browser DevTools Network tab.

---

## 7. Database Update (`supabase/migrations/004_hard_reset_flashpoint_feedback.sql`)

```sql
ALTER TABLE blueprints
ADD COLUMN IF NOT EXISTS confirmed_flashpoint_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS hard_reset_engine_version TEXT DEFAULT 'v2_tiered_yearly_to_monthly';
```

---

## 8. File-by-File Implementation Checklist for Coding Agent

1. **Create `src/lib/astro/ephemeris/historicalTransits.ts`:**
   * Static Lahiri sidereal ingress & retrograde lookup tables (2005–2030) for Saturn, Jupiter, Rahu/Ketu, Mars, and Sun.
2. **Create `src/lib/astro/hardResetEngine.ts`:**
   * Implement `computeHardResetTelemetry(normalizedChart, userContext, precisionMode, referenceDate)` outputting yearly chapters (`year_range`, `macro_theme_tags`) + nested Layer-4 `flashpoints` (`month_range`, `year_label`, `domain_tags`) + `upcoming_prep_window`.
3. **Update `src/lib/llm/schemas.ts`:**
   * Replace v1 `hard_reset` schema blocks with `HardResetProofSchema` (Yearly Free) and `HardResetDeepDiveSchema` (Tight Monthly Paid).
4. **Create `src/lib/llm/prompts/hardResetPrompt.ts` & wire into `src/lib/llm/synthesizeBlueprint.ts`:**
   * Inject `hard_reset_telemetry` into Gemini synthesis so one single synthesis call generates both the **Free Yearly Proof** and the **Paid Tight Monthly Deep-Dive** cleanly.
5. **Update `src/lib/llm/guardrails.ts` & `src/app/api/blueprint/[chartId]/route.ts`:**
   * Add `CLICHE_REGEX`, `FREE_TIER_MONTH_LEAK_REGEX`, Paid `month_range` cross-verification, and confirm strict `full_blueprint_json: null` server redaction when unpaid.
6. **Update Proof Screen 1, Paywall & Unlocked Hub UI:**
   * **Proof Screen 1 (Free):** Render Primary Yearly Card (`2022 – 2023` + 2–3 concrete themes) + Secondary Yearly Strip (`2020 – 2021`) + Accuracy Validator + **Locked Tight Monthly Timeline Card** (3 blurred-date teaser rows with amber locks + count badge) routing users into the upgrade flow.
   * **Paywall ($19):** Feature **"Tight 1-to-3-Month Hard Reset Timeline"** as the #1 unlocked deliverable.
   * **Unlocked Blueprint Hub (Paid):** Render all 2–4 chapters with exact 1-to-3-month flashpoint cards, 1-tap milestone confirmation, `How It Felt Inside`, `What It Rewired`, and the exact upcoming 2-to-3-month prep card.
   * Handle backwards compatibility for older cached v1 Supabase rows cleanly.
7. **Add Verification Test Script (`scripts/test-hard-reset-precision.ts`):**
   * **Test 1 (Chandan Benchmark — `exact`):** Run `17/09/1989`, `20:56`, `Muzaffarnagar, India`:
     * Assert **Free payload (`hook_proof_json`)** contains exact yearly ranges (`2022 – 2023`, `2020 – 2021`), concrete real-life themes, `locked_monthly_timeline_teaser` with `year_label` only, **0 jargon**, **0 clichés**, and **0 leaked month names**.
     * Assert **Paid payload (`full_blueprint_json`)** contains exact 1-to-3-month flashpoints (`Mid-Apr – June 2016`, `Late Oct – Nov 2022`, etc.) matching telemetry 100%, **0 jargon**, and **0 clichés**.
   * **Test 2 (Missing Birth Time — `date_only`):** Run `15/06/1992`, `Chicago, IL` without birth time → assert lunar/natal-planet fallback works, `upgrade_hint` is non-null, and **0 month leaks** in Free tier.
   * **Test 3 (Paywall Redaction & Month-Leak Guardrail):**
     * Verify unpaid `GET /api/blueprint/[chartId]` returns `full_blueprint_json: null` (zero monthly dates exposed over the wire).
     * Pass poisoned Free JSON containing `"Late Oct – Nov 2022"` and `"deep transformation"` into `auditBlueprintOutput()` → assert both violations are caught and auto-repaired.