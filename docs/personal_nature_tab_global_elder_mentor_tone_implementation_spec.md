# Personal Nature Tab v2 & Global Elder-Mentor Voice Architecture

**Target Repo:** `vedic-astro-gemini`  
**Scope:** Replace the static Personal Nature section with a 4-category, 18-tell evolving discovery hub (Day 1 + Day 2 drip architecture), and establish a **single, persisted Global Voice & Tone Profile (`elder_mentor_v1`)** stored in both code and Supabase so every LLM feature across the app speaks with the exact same warmth, empathy, and human clarity.

---

## 1. Global Voice & Tone Architecture (App-Wide Standard)

To guarantee the app never slips back into robotic, clinical, or generic horoscope language, the tone must be defined once, stored in Supabase, imported by every LLM route, and enforced programmatically by `src/lib/llm/guardrails.ts`.

### 1.1 Canonical Voice Persona (`elder_mentor_v1`)
Create **`src/lib/llm/voiceProfile.ts`** as the single TypeScript source of truth, mirrored into the `app_voice_profiles` table in Supabase.

* **Persona:** A warm, deeply empathetic mentor—like a wise, loving elder family member sitting across the kitchen table over a cup of tea. Speaks with quiet affection, steadiness, and gentle honesty. Sees the good heart behind the user's protective habits and never judges, lectures, or talks down.
* **Voice Rules (Mandatory on Every Prompt):**
  1. **Empathy First, Truth Second:** Always validate the protective reason or caring intention behind a habit before softly naming the blind spot.
  2. **Kitchen-Table English:** Write the way a loving human mentor talks aloud. Short, breathable sentences. Natural contractions (`you're`, `don't`, `isn't`).
  3. **Zero Astrology or Esoteric Jargon:** Never output planet names, signs, houses, Sanskrit terms, or cosmic labels (`Lagna`, `Moon`, `Mars`, `Saturn`, `Rahu`, `Ketu`, `Nakshatra`, `Dasha`, `Dosha`, `Pitta`, `Vata`, `Kapha`, `Guna`, `Karma`, `Kundali`, `Arudha`, `transit`, `chart`, `alignment`).
  4. **Zero Corporate, Tech, or Clinical Buzzwords:** Strictly ban mechanical/robotic phrasing (see Blocklist in Section 1.2).
  5. **No Medical or Fatalistic Claims:** Never diagnose health conditions, predict doom, or imply fixed destiny. Frame every insight around self-awareness and gentle choice.
  6. **Stack, Don't Flatten:** Every Personal Nature tell must synthesize at least **two chart layers** (e.g., outer drive vs. inner need, strength vs. hidden toll) so it lands as an unmistakable *"how did it know that?"* moment rather than a generic compliment.

### 1.2 Automated Tone Guardrail Extension (`src/lib/llm/guardrails.ts`)
Add `auditMentorTone(text: string)` alongside the existing astrology-jargon validator. Any LLM output matching these banned terms must fail validation and trigger a single corrective retry:

```ts
export const BANNED_ROBOTIC_BUZZWORDS = [
  'high-voltage',
  'bandwidth',
  'surgical politeness',
  'diagnostic sprints',
  'auditing details',
  'internal thermostat',
  'nervous system baseline',
  'moving the goalpost',
  'moving the goalposts',
  'telemetry',
  'operationalize',
  'operational mode',
  'cognitive battery',
  'circuit breaker',
  'optimization',
  'over-optimizing',
  'optimize',
  'synergy',
  'pipeline',
  'framework',
  'leverage point',
  'tactical stance',
  'executive state',
  'burnout threshold',
  'somatic interrupt',
  'neural stillness',
];
```

### 1.3 Shared Prompt Wrapper (`buildMentorSystemPrompt`)
Export a single helper from `src/lib/llm/voiceProfile.ts` and refactor **all** LLM routes (Personal Nature, Hard Reset, Relationship Mirror, Career Audit, Daily Brief) to wrap their task instructions with it:

```ts
export function buildMentorSystemPrompt(params: {
  voiceProfile: VoiceProfileRow;
  moduleInstructions: string;
  precisionMode: 'exact' | 'approximate' | 'date_only';
}): string {
  return `
${params.voiceProfile.system_persona}

NON-NEGOTIABLE VOICE & SAFETY RULES:
${params.voiceProfile.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

STRICTLY FORBIDDEN WORDS & PHRASES:
- Astrology/Sanskrit terms: ${params.voiceProfile.banned_astro_terms.join(', ')}
- Robotic/Corporate/Clinical terms: ${params.voiceProfile.banned_robotic_terms.join(', ')}

BIRTH TIME PRECISION MODE: ${params.precisionMode}
- If precisionMode is "date_only", NEVER reference exact house-dependent perceptions (such as public room projection or divisional charts). Synthesize strictly from Moon sign/Nakshatra, planetary signs, macro cycles, and Numerology fallback rules.

MODULE INSTRUCTIONS:
${params.moduleInstructions}
`.trim();
}
```

---

## 2. Personal Nature Tab Information Architecture (MVP)

**Removed for MVP:** *Mind & Rhythm* (explicitly excluded to keep the tab tight and emotionally resonant).

The Personal Nature tab consists of **4 permanent categories** holding **18 thoroughly calculated tells** across a **Day 1 (8 tells)** + **Day 2 (10 tells)** rollout:

| Category Slug | Display Title | Subtitle | Day 1 Tells | Day 2 Tells | Total |
| :--- | :--- | :--- | :---: | :---: | :---: |
| `inside_vs_outside` | **Inside vs. Outside** | Who you are in your heart vs. how people read you | 2 | 3 | **5** |
| `under_pressure` | **Under Pressure** | How stress shows up in your body, reactions & rest | 3 | 2 | **5** |
| `blind_spots_and_drive` | **Blind Spots & Drive** | Quiet habits that drain you & what makes life feel full | 2 | 3 | **5** |
| `turning_points` | **Turning Points** | The chapters that quietly shaped who you are today | 1 | 2 | **3** |
| **Total** | | | **8** | **10** | **18** |

---

## 3. Master Registry of All 18 Tells (`src/lib/astro/personalNatureCatalog.ts`)

Store this deterministic catalog in TypeScript so the backend engine (`personalNatureEngine.ts`) knows exactly which chart layers to extract from `normalized_chart_json`, `matched_knowledge_context`, and `historicalTransits.ts` for each tell.

### Category 1: Inside vs. Outside (`inside_vs_outside`)

1. **`core_contradiction`** *(Day 1 · Exact or Date-Only)*
   * **Chart Stack:** `Lagna` + `Lagna Lord house` (outer self-reliance) contrasted against `Natal Moon sign/Nakshatra` + `Venus` / `4th` / `7th` house (private emotional need). *(Date-only fallback: Sun sign + Numerology drive vs. Moon Nakshatra emotional core.)*
   * **Prompt Instruction:** Gently reveal the tender contrast between the capable armor they wear in public and what their heart quietly longs for in private.
2. **`perception_gap`** *(Day 1 · Requires `exact` birth time)*
   * **Chart Stack:** `Lagna` + `1st house` (true inner warmth and reaction speed) vs. `Arudha Lagna` + `10th house` (how rooms read them before they speak). *(Date-only fallback: Swap with `silent_first_impression` using Moon Nakshatra vs. Life Path number.)*
   * **Prompt Instruction:** Reassure them about why people often misread their composure or directness before really knowing them.
3. **`advice_skepticism`** *(Day 2 · Exact or Date-Only)*
   * **Chart Stack:** `9th house` / `9th lord` + `Saturn` + `Jupiter` dignity + `Lagna` independence.
   * **Prompt Instruction:** Explain warmly why they never take advice purely because of someone's title, how they test wisdom against lived experience, and how deeply loyal they become once trust is earned.
4. **`living_room_self`** *(Day 2 · Exact or Date-Only)*
   * **Chart Stack:** Outer `1st`/`6th`/`10th` grit contrasted against private `4th house` warmth + `Venus` + `Jupiter`.
   * **Prompt Instruction:** Speak tenderly about the warm, generous, playful version of themselves that only their tiny inner circle ever gets to see.
5. **`care_sounds_like_critique`** *(Day 2 · Exact or Date-Only)*
   * **Chart Stack:** `Mercury` + `Mars` + `Sun` problem-solving placements (especially 3rd/6th/10th) contrasted against `Venus` / `Moon` affection.
   * **Prompt Instruction:** Validate that when they jump straight into spotting flaws and offering fixes for someone they love, it comes purely from caring deeply—then softly show why loved ones sometimes just need comfort first.

### Category 2: Under Pressure (`under_pressure`)

6. **`body_tell_under_stress`** *(Day 1 · Exact or Date-Only)*
   * **Chart Stack:** Astro-Ayurvedic constitution (`ayurveda_and_resets.json` Dosha balance) + `6th`/`12th` house strain markers + current `Saturn` transit house.
   * **Prompt Instruction:** Gently name 2 everyday physical cues (e.g., unsettled stomach, tight jaw, light sleep, restless shoulders) and 1 late-night habit that tip them off before they admit they are worn out. Zero clinical/medical framing.
7. **`silent_shutdown_tell`** *(Day 1 · Exact or Date-Only)*
   * **Chart Stack:** `Moon` reaction speed + `Mars`/`Mercury`/`Saturn` defense placements + `Ketu` detachment axis.
   * **Prompt Instruction:** Describe with compassion the exact subtle way they pull back when disrespected or let down (e.g., going quiet and extra polite, closing the door in their heart long before saying anything).
8. **`real_vs_fake_recovery`** *(Day 1 · Exact or Date-Only)*
   * **Chart Stack:** `4th house` inner sanctuary + `12th house` decompression markers + `Ketu`/`Moon` rest needs.
   * **Prompt Instruction:** Gently name 1 common "fake rest" habit (like phone scrolling or casual socializing) that leaves them humming with fatigue, then give the exact 2 simple habits that truly let their shoulders drop.
9. **`ignoring_exhaustion`** *(Day 2 · Exact or Date-Only)*
   * **Chart Stack:** `Sun` + `Mars` endurance/duty placements (`1st`/`6th`/`10th`) + `Moon` urgency + `Nakshatra` containment blind spot.
   * **Prompt Instruction:** Compassionately call out how they push quietly past their own tiredness out of pride and responsibility until their body forces a pause—reminding them they do not have to earn rest by running empty.
10. **`calm_in_crisis_impatient_in_delays`** *(Day 2 · Exact or Date-Only)*
    * **Chart Stack:** `Moon` + `Mars` / `Rajas` impatience with slowness contrasted against `6th`/`8th` house or `Ketu`/`Saturn` composure during genuine emergencies.
    * **Prompt Instruction:** Point out the endearing contradiction where minor everyday delays test their patience in seconds, yet during a real crisis they become the calmest, steadiest person in the room.

### Category 3: Blind Spots & Drive (`blind_spots_and_drive`)

11. **`private_self_sabotage`** *(Day 1 · Exact or Date-Only)*
    * **Chart Stack:** `Moon Nakshatra` blind spot (`nakshatras_and_gunas.json`) + `Rahu`/`Saturn`/`Mars` friction + `Mercury` perfectionism + `D-27`/`D-30` (if `exact`).
    * **Prompt Instruction:** Warmly expose the one quiet pattern that steals their joy right around a win (e.g., carrying pressure in silence, spotting the next flaw within 24 hours, never letting themselves celebrate).
12. **`hidden_fulfillment_leak`** *(Day 1 · Exact or Date-Only)*
    * **Chart Stack:** Four Core Drives (`Dharma`, `Artha`, `Kama`, `Moksha`) balance + `10th house` external duty vs. `4th house` inner happiness.
    * **Prompt Instruction:** Validate why looking successful on paper still leaves a quiet heaviness whenever their daily effort loses touch with meaning, truth, or real human care.
13. **`guest_even_at_home`** *(Day 2 · Exact or Date-Only)*
    * **Chart Stack:** `4th house` occupants/lord (`Ketu`/`Saturn`/`Jupiter` nuance) + `Rahu–Ketu` axis pull between outer world and inner peace.
    * **Prompt Instruction:** Reassure them gently if a quiet part of them sometimes feels half-detached even in a comfortable home—reminding them their deepest sense of home lives inside their own stillness.
14. **`giving_vs_asking_pride`** *(Day 2 · Exact or Date-Only)*
    * **Chart Stack:** `2nd lord` / `Venus` generosity + `11th lord` / `Saturn` earned fairness + `1st`/`6th` over-functioning.
    * **Prompt Instruction:** Acknowledge their generous heart and quiet pride about not wanting to owe anyone—then gently remind them that letting someone show up for them lets people love them back.
15. **`polishing_in_the_dark`** *(Day 2 · Exact or Date-Only)*
    * **Chart Stack:** `Mercury` precision/dignity + `Saturn` strict standards + `Rahu`/`10th` public ambition.
    * **Prompt Instruction:** Speak warmly to why they keep quietly tweaking details behind the scenes long after their work is already wonderful—reassuring them the world needs the real thing they built, not spotless perfection.

### Category 4: Turning Points (`turning_points`)

16. **`past_identity_rewire`** *(Day 1 · Exact or Date-Only)*
    * **Chart Stack:** `historicalTransits.ts` scan over the past 10–12 years for major `Saturn` cycles (`Sade Sati` / `Dhaiya`), `Rahu–Ketu` 1st–7th axis transits, and major `Mahadasha` transitions.
    * **Prompt Instruction:** Name 1–2 specific past year windows (never vague "a few years ago") and speak warmly about how those heavy stretches quietly built their backbone and changed what they were willing to settle for.
17. **`full_plate_heavy_heart_window`** *(Day 2 · Exact or Date-Only)*
    * **Chart Stack:** Secondary historical `Saturn` or `Rahu–Ketu` transit window from the past 4–7 years (distinct from Tell #16) hitting the `4th`/`10th` or `1st`/`7th` axis.
    * **Prompt Instruction:** Validate a specific recent 1–2 year stretch where they worked hard and carried heavy duty, yet felt like they were walking uphill in heavy shoes—breaking the spell of just chasing checkboxes.
18. **`current_season_tug_of_war`** *(Day 2 · Exact or Date-Only)*
    * **Chart Stack:** Active `Mahadasha` + `Antardasha` growth drive contrasted against current `Saturn` transit house (`12th`/`4th`/`8th`/`1st` etc.) pruning/pacing lesson.
    * **Prompt Instruction:** Name the gentle two-way pull they feel right now between wanting to build something bold and life nudging them to protect their peace, rest, and clear old clutter—reassuring them they are not stalling, they are clearing the table.

---

## 4. Database Schema (`supabase/migrations/010_personal_nature_and_voice.sql`)

```sql
-- 1. Global Voice & Tone Registry (Single Source of Truth in DB)
CREATE TABLE IF NOT EXISTS public.app_voice_profiles (
  id TEXT PRIMARY KEY, -- e.g. 'elder_mentor_v1'
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  system_persona TEXT NOT NULL,
  rules JSONB NOT NULL,               -- Array of voice & empathy rules
  banned_astro_terms JSONB NOT NULL,  -- Array of forbidden astro/Sanskrit terms
  banned_robotic_terms JSONB NOT NULL,-- Array of forbidden tech/corporate buzzwords
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only one active default voice profile at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_voice_profile
  ON public.app_voice_profiles (is_active)
  WHERE is_active = TRUE;

-- 2. Personal Nature Tells (Per Chart, Category & Unlock Day)
CREATE TABLE IF NOT EXISTS public.personal_nature_tells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES public.birth_charts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (
    category IN ('inside_vs_outside', 'under_pressure', 'blind_spots_and_drive', 'turning_points')
  ),
  tell_id TEXT NOT NULL,
  unlock_day INT NOT NULL CHECK (unlock_day >= 1),
  is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ,
  headline TEXT NOT NULL,
  body TEXT NOT NULL,
  follow_up_pill TEXT NOT NULL,
  accuracy_rating TEXT CHECK (accuracy_rating IN ('uncanny', 'mostly_me', 'not_really')),
  user_reflection TEXT,
  voice_profile_id TEXT NOT NULL REFERENCES public.app_voice_profiles(id),
  precision_mode TEXT NOT NULL CHECK (precision_mode IN ('exact', 'approximate', 'date_only')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chart_id, tell_id)
);

CREATE INDEX IF NOT EXISTS idx_pn_tells_chart_day
  ON public.personal_nature_tells (chart_id, unlock_day, category);

-- 3. Row Level Security (Service-role writes, owner reads & rates)
ALTER TABLE public.app_voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_nature_tells ENABLE ROW LEVEL SECURITY;

-- Voice profiles readable by authenticated users / server; writable only via service role
CREATE POLICY "Read active voice profile"
  ON public.app_voice_profiles FOR SELECT
  USING (is_active = TRUE);

-- Users can read their own tells
CREATE POLICY "Users read own personal nature tells"
  ON public.personal_nature_tells FOR SELECT
  USING (auth.uid() = user_id);

-- All inserts/generation happen via server service role only; feedback goes through API route
```

---

## 5. Zod Output Contract (`src/lib/llm/personalNatureSchema.ts`)

Every generated tell must strictly parse against this schema before saving to Supabase:

```ts
import { z } from 'zod';

export const PersonalNatureTellSchema = z.object({
  tell_id: z.string().min(1),
  category: z.enum([
    'inside_vs_outside',
    'under_pressure',
    'blind_spots_and_drive',
    'turning_points',
  ]),
  headline: z.string().min(8).max(75),        // 4–8 warm, human words
  body: z.string().min(140).max(460),         // ~45–65 warm kitchen-table words
  follow_up_pill: z.string().min(10).max(140),// 1 gentle reflection question
});

export const PersonalNatureBatchSchema = z.object({
  tells: z.array(PersonalNatureTellSchema).min(1),
});
```

---

## 6. Drip-Reveal & User Engagement Mechanics

1. **Day 1 Immediate Unlock (8 Tells):**
   * On onboarding completion / first visit to the Personal Nature tab, generate and unlock all **8 Day-1 tells** in a single batched Gemini call (fast, low-cost, consistent voice across cards).
   * Inside each of the 4 category sections, render the unlocked Day-1 cards followed by **1–2 blurred/locked Day-2 teaser cards** showing an intriguing human title (e.g., *"🔒 Why You Rarely Take Advice at Face Value — Unlocks Tomorrow"*).
2. **Day 2 Unlock (10 Tells) & Future Drip Extensibility:**
   * When `now >= chart.created_at + 24 hours` (or via a dev/beta preview toggle `NEXT_PUBLIC_ENABLE_DAY2_PREVIEW`), automatically unlock and lazily generate the **10 Day-2 tells** in one batched call, showing a subtle warm amber `"New"` pill on freshly unlocked cards.
   * For testing/demo purposes, allow an admin/beta flag so the founder can preview Day 1 and Day 2 seamlessly.
3. **1-Tap Accuracy Pulse + Memory Feedback Loop:**
   * Every card footer displays three lightweight pills: `[ Uncanny ]` `[ Mostly me ]` `[ Not really ]`.
   * Tapping any rating immediately saves to `personal_nature_tells.accuracy_rating`, displays the gentle `follow_up_pill` reflection prompt with 1-tap quick chips or an optional 1-line note, and appends a concise tag to `user_memory`.
   * If a user taps `Not really` on 2+ house-dependent tells, softly prompt them to double-check their birth time in Settings.
4. **Voice Versioning Auto-Upgrade:**
   * Whenever a chart loads tells whose `voice_profile_id` does not match the active `app_voice_profiles.id` (`elder_mentor_v1`), mark them stale and offer/trigger silent regeneration so legacy robotic copy never lingers.

---

## 7. API Endpoints

* **`GET /api/personal-nature/[chartId]`**
  * Fetches active `app_voice_profiles` row + all `personal_nature_tells` for `chartId`.
  * Auto-triggers Day-1 batch generation if none exist; auto-triggers Day-2 unlock if `>= 24h` elapsed since Day-1 unlock (or `?previewDay2=true` when `DEV_UNLOCK_PREVIEW=true`).
  * Returns structured `{ voiceProfileId, categories: [{ slug, title, subtitle, unlockedTells, lockedTeasers }] }`.
* **`POST /api/personal-nature/[chartId]/feedback`**
  * Body: `{ tell_id, accuracy_rating, user_reflection? }`.
  * Validates ownership, updates `personal_nature_tells`, and writes a compact insight entry into `user_memory` (for future drip tells & daily check-ins).

---

## 8. Verification & Acceptance Criteria

Create **`scripts/test-personal-nature-tone.ts`** to verify:
1. All **18 tells** generate cleanly for both an `exact` birth-time fixture (Chandan's chart: Sept 17, 1989, 20:54, Muzaffarnagar) and a `date_only` fixture.
2. **0 astrology/Sanskrit leaks** across all 18 headlines, bodies, and follow-up pills.
3. **0 robotic/corporate buzzword leaks** (`auditMentorTone` passes 100%).
4. **Word count & warmth check:** Every tell body lands within 35–75 words and avoids clinical/fatalistic phrasing.
5. **Category integrity:** Exactly 4 categories returned (`Mind & Rhythm` is completely absent from UI and API).
6. **Global voice check:** Confirm `buildMentorSystemPrompt` is imported by Personal Nature, Hard Reset, Relationship Mirror, Career Audit, and Daily Brief routes.

---

## 9. Copy-Paste Antigravity Kickoff Prompt

Open a fresh chat in Antigravity inside your `vedic-astro-gemini` workspace and paste this prompt:

```markdown
Read `GEMINI.md`, `docs/PRD.md`, `docs/DESIGN_SYSTEM.md`, `docs/LLM_PROMPTS.md`, and the new `docs/PERSONAL_NATURE_PRODUCT_DOC.md`.

Implement the **Personal Nature Tab v2 & Global Elder-Mentor Voice Architecture** end-to-end without breaking the existing Solar Obsidian UI or existing tests:

1. **Global Voice & Tone System (`elder_mentor_v1`):**
   - Create `supabase/migrations/010_personal_nature_and_voice.sql` creating `app_voice_profiles` (seeded with `elder_mentor_v1` as active) and `personal_nature_tells` with proper RLS policies.
   - Create `src/lib/llm/voiceProfile.ts` exporting `ELDER_MENTOR_VOICE_V1` and `buildMentorSystemPrompt(...)` (reading the active DB voice profile with code fallback).
   - Extend `src/lib/llm/guardrails.ts` with `BANNED_ROBOTIC_BUZZWORDS` and `auditMentorTone(...)` with 1 automatic corrective retry on violation.
   - Wire `buildMentorSystemPrompt` into Personal Nature AND update our other LLM synthesis routes (Hard Reset, Career, Relationships, Daily Brief) so the entire app shares the exact same warm, compassionate elder-mentor voice.

2. **Personal Nature Backend Engine & API:**
   - Create `src/lib/astro/personalNatureCatalog.ts` defining the 4 categories (`inside_vs_outside`, `under_pressure`, `blind_spots_and_drive`, `turning_points` — ensure `Mind & Rhythm` is completely removed) and all 18 tells (8 Day-1 + 10 Day-2) with `date_only` fallbacks.
   - Create `src/lib/astro/personalNatureEngine.ts` extracting the stacked chart context for each tell from `normalized_chart_json`, `ruleMatcher.ts`, and `historicalTransits.ts`.
   - Create `src/lib/llm/personalNatureSchema.ts` (Zod schemas) and API routes `GET /api/personal-nature/[chartId]` and `POST /api/personal-nature/[chartId]/feedback`.

3. **Personal Nature Tab UI (Solar Obsidian / Warm Editorial Style):**
   - Render the 4 clean category sections with unlocked tell cards (warm headline, 45–65 word kitchen-table body, 1-tap `[ Uncanny ] [ Mostly me ] [ Not really ]` pulse, and gentle follow-up reflection prompt).
   - Show subtle locked Day-2 teaser cards inside each category until unlocked (plus a subtle dev preview toggle when `DEV_UNLOCK_PREVIEW=true` so I can review all 18 tells right away).

4. **Verify:**
   - Write and run `scripts/test-personal-nature-tone.ts`, then run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` and report full results.
```