# Requirements & Implementation Spec: Multi-Provider LLM Resilience & Prompt Voice Polish

**Target Repo:** Personal Blueprint MVP (Next.js 15 + TypeScript + Supabase + Gemini + OpenAI)  
**Status:** Backlog Spec (Ready for Implementation)  
**Related Files:**
- `src/lib/llm/geminiProvider.ts`
- `src/lib/llm/openaiProvider.ts`
- `src/lib/llm/provider.ts`
- `src/lib/llm/synthesizeBlueprint.ts`
- `src/lib/llm/prompts/hardResetPrompt.ts`
- `src/lib/llm/prompts/careerPrompt.ts`
- `src/lib/llm/prompts/relationshipPrompt.ts`
- `src/lib/llm/guardrails.ts`
- `src/lib/cache/blueprintCache.ts`
- `tests/helpers/fixtures.ts`

---

## 1. Background & Problem Statement

During Task #3 validation against real LLM APIs:
1. **Single-Vendor Gemini Outage Risk:** Google's Gemini 3.x endpoints (`gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.1-flash-lite`) intermittently returned `503 UNAVAILABLE` (*"currently experiencing high demand"*), causing `/api/blueprint/synthesize` to fail after walking Gemini's internal fallback chain.
2. **OpenAI (`gpt-4.1-mini`) Validation Passed 100% on Structure & Guardrails—With 3 Voice Rough Edges:**
   - `OpenAiLlmProvider` (`src/lib/llm/openaiProvider.ts`) was implemented and tested independently. Output passed `SynthesizedBlueprintSchema` and `auditBlueprintOutput` with **0 guardrail violations** on the first attempt.
   - However, manual prose review surfaced three tone/fixture issues to tighten before enabling `OpenAiLlmProvider` as an automatic production fallback:
     1. **Meta-defensive phrasing:** Phrases like *"this supplied fit score"*, *"these supplied reflection windows"*, *"these supplied windows organize experiments"*, and *"its recorded dates are historical"* break the warm, coffee-table mentor illusion.
     2. **Over-hedged Hook #1 / Hook #5 phrasing:** Excessive *"Check whether..."*, *"See whether you recognize..."*, and *"The shift to explore is..."* weakens the uncanny, declarative emotional mirror compared to Hook #2 and Hook #3.
     3. **Outdated Fixture Dates (`tests/helpers/fixtures.ts`):** `makeRawAstroBundle()` / `makeChandanExactChart()` uses static `antarDasha` dates ending in `2023`, making `era3` (`Mar 2021 – Feb 2022`) and `era4` (`Feb 2022 – Mar 2023`) look historical and causing the LLM to apologize for past dates.

---

## 2. Requirements

### R1. Multi-Provider LLM Resilience (`Gemini` Primary → `OpenAI` Automatic Fallback)
1. **Provider Routing (`LLM_PROVIDER_MODE`):**
   - Support `LLM_PROVIDER_MODE` env var (`"auto"` default | `"gemini_only"` | `"openai_only"`).
   - In `"auto"` mode: try `GeminiLlmProvider` first; if it fails with a retryable availability/quota/timeout error (`statusCode === 503 || 429 || 402 || isTimeout` or missing `GEMINI_API_KEY`) **and** `OPENAI_API_KEY` is configured, automatically fall back to `OpenAiLlmProvider`.
   - Do **not** fall back to OpenAI on deterministic client/caller bugs (`400`, `401`/`403` auth errors on OpenAI, or unrepairable `BlueprintGuardrailError` thrown after synthesis).
2. **Latency & Timeout Budgeting (Stay Within Client 60s Abort Limit):**
   - `src/app/onboarding/synthesizing/page.tsx` aborts `/api/blueprint/synthesize` after `60000ms`.
   - When `OpenAiLlmProvider` fallback is available in `"auto"` mode, cap the Gemini fallback chain to at most **2 models** (e.g., `[GEMINI_MODEL, GEMINI_FALLBACK_MODEL || "gemini-3.6-flash"]`, each `15000ms` max) so Gemini fails over in `<= 32s`, leaving `>= 25s` for `OpenAiLlmProvider` inside the 60s request budget.
   - If Gemini is in `"gemini_only"` mode (no OpenAI key), keep the broader multi-model Gemini chain (`gemini-3.8-flash` → `gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-3.7-flash`).
3. **Model Attribution & Error Hygiene:**
   - `ResilientLlmProvider.modelName` must dynamically reflect whichever provider/model actually succeeded (e.g. `"gemini-3.8-flash"` or `"openai:gpt-4.1-mini"`) so `blueprints.model_version` records exact provenance.
   - Never leak raw vendor JSON error bodies or API keys to client HTTP responses.

### R2. Prompt Voice & Tone Polish (Cross-Provider Consistency)
1. **Ban Meta-System Phrasing:**
   - Update `buildSystemPrompt` in `src/lib/llm/synthesizeBlueprint.ts` (and `hardResetPrompt.ts` / `careerPrompt.ts` / `relationshipPrompt.ts`) with an explicit anti-meta rule:
     - Never write `"supplied score"`, `"supplied fit score"`, `"supplied window"`, `"supplied reflection window"`, `"supplied sequence"`, `"recorded dates"`, `"your provided telemetry"`, or `"in the input"`.
     - Speak naturally about the chapter, score, or timeframe as lived context while preserving non-fatalistic agency framing.
2. **Sharpen Hook #1 & Hook #5 Declarative Confidence:**
   - Update `src/lib/llm/prompts/hardResetPrompt.ts` and Hook #5 instructions in `src/lib/llm/synthesizeBlueprint.ts`:
     - Lead with crisp, grounded, second-person observations (*"You were still keeping everything running, even as..."*) rather than repeating *"Check whether..."*, *"See whether you recognize..."*, or *"The shift to explore is..."*.
     - Keep non-fatalism via agency levers, not robotic disclaimers.
3. **Automated Guardrail Enforcement (`META_SYSTEM_PHRASE_REGEX`):**
   - Add `META_SYSTEM_PHRASE_REGEX` to `src/lib/llm/guardrails.ts` to catch phrases like `supplied (?:fit )?(?:score|scores|window|windows|sequence|comparison|reflection)|recorded dates|provided telemetry` during `auditBlueprintOutput` so the 1x auto-repair loop catches regressions automatically across both Gemini and OpenAI.
4. **Cache Version Bump:**
   - Increment `BLUEPRINT_ENGINE_VERSION` prefix in `src/lib/cache/blueprintCache.ts` (`v4_...` → `v5_hr_career_rel_${RULE_MATCHER_VERSION}`) once prompt changes ship so cached profiles transparently upgrade on next access via `getBlueprintById` / `synthesizeAndPersistBlueprint`.

### R3. Update Benchmark Fixture Dates (`tests/helpers/fixtures.ts`)
1. Update `antarDasha` intervals in `makeRawAstroBundle()` inside `tests/helpers/fixtures.ts` so `era3` spans an active current window (`2025 – 2027`, < 100% complete) and `era4` spans a true future window (`2027 – 2029`), matching live `VedicAstroApiProvider` behavior.
2. Verify existing deterministic tests in `tests/hardResetAndCareerEngines.test.ts`, `tests/relationshipEngineAndGuardrails.test.ts`, `tests/precisionRouter.test.ts`, and `scripts/test-*.ts` remain green after updating the fixture (adjusting any date assertions tied specifically to the old mock `antarDasha` end date).

---

## 3. Concrete Implementation Plan

### Step 1: Add `ResilientLlmProvider` & Wire `getLlmProvider()`
- **File:** `src/lib/llm/resilientProvider.ts` *(new)* + `src/lib/llm/geminiProvider.ts`
- **Design:**
  - Implement `class ResilientLlmProvider implements LlmProvider`:
    - Holds `providers: LlmProvider[]` (constructed from `LLM_PROVIDER_MODE`, `GEMINI_API_KEY`, `OPENAI_API_KEY`).
    - Maintains mutable `public modelName: string` updated to the winning provider's `modelName` (prefixing `"openai:"` for OpenAI if desired, or `${provider.providerName}:${provider.modelName}`).
    - Iterates through providers; catches `LlmProviderError` where `statusCode === 503 || statusCode === 429 || statusCode === 402 || isTimeout` (plus missing key/network 502s) and falls through to the next provider.
    - Immediately rethrows `400` / unrecoverable schema errors? Wait: if Gemini fails Zod validation twice (`isZodValidation`), falling over to OpenAI is actually *desirable*—so only rethrow non-provider errors or let `ResilientLlmProvider` fall back on any `LlmProviderError` when a secondary provider is configured!
  - Update `getLlmProvider()` (exported from `src/lib/llm/geminiProvider.ts` or re-exported cleanly so existing callers in `src/lib/llm/synthesizeBlueprint.ts` don't break):
    - `"openai_only"` → `new OpenAiLlmProvider()`
    - `"gemini_only"` → `new GeminiLlmProvider()`
    - `"auto"` (default) → `[new GeminiLlmProvider({ fallbackModels: [primaryFallback], timeoutMs: 15000 }), ...(hasOpenAiKey ? [new OpenAiLlmProvider({ timeoutMs: 25000 })] : [])]` wrapped in `ResilientLlmProvider`.
- **Timeout Safety:** Ensure `GeminiLlmProvider` accepts optional `timeoutMs` in constructor/options so `"auto"` mode enforces the `<= 32s` Gemini budget before OpenAI runs.

### Step 2: Polish Prompt Files & Guardrails
- **`src/lib/llm/synthesizeBlueprint.ts`:**
  - Under `TONE & VOICE:` in `buildSystemPrompt`, add:
    - *"Never refer to 'supplied scores', 'supplied windows', 'recorded dates', or 'provided telemetry'—talk directly about the user's real-life patterns and timeframes without breaking the fourth wall."*
    - *"Keep observations warm, candid, and declarative; avoid hedging every sentence with 'Check whether...', 'See whether...', or 'The shift to explore is...'."*
  - Update `HOOK #5` instructions so `era3Playbook` and `era4Preview` frame priorities forward-lookingly without referencing `"historical dates"`.
- **`src/lib/llm/prompts/hardResetPrompt.ts`:**
  - Add declarative-voice guidance for `introHook`, `concreteRealLifeThemes`, `whatItRewired`, and `flashpoints.realLifeEvent` (keep concrete scenes & agency without repetitive `"Check whether"` / `"Did you..."` question chaining).
- **`src/lib/llm/prompts/careerPrompt.ts` & `src/lib/llm/prompts/relationshipPrompt.ts`:**
  - Add explicit reminder on `honestMentorTake`, `bigPictureSummary`, and `greenFlagBodyCheck` not to use `"supplied fit score"`, `"supplied comparison"`, or `"supplied windows"`.
- **`src/lib/llm/guardrails.ts`:**
  - Add `META_SYSTEM_PHRASE_REGEX`:
    ```ts
    export const META_SYSTEM_PHRASE_REGEX =
      /\b(supplied\s+(?:fit\s+)?(?:score|scores|window|windows|sequence|comparison|reflection)|recorded\s+dates|provided\s+telemetry)\b/gi;
    ```
  - Add `"meta_system_leak"` to `GuardrailCategory` and invoke it inside `scanGlobalString`.
- **`src/lib/cache/blueprintCache.ts`:**
  - Bump `BLUEPRINT_ENGINE_VERSION` to `` `v5_hr_career_rel_${RULE_MATCHER_VERSION}` ``.

### Step 3: Update Benchmark Fixture Dates
- **`tests/helpers/fixtures.ts`:**
  - Shift the final `antarDasha` dates in `makeRawAstroBundle()` (`Mars/Saturn`, `Mars/Mercury`, `Mars/Ketu`, `Rahu/Rahu`) so the active `era3` overlaps `2026` (e.g., `2025-04-01` → `2027-02-01`) and `era4` is `2027-02-01` → `2029-10-01`.
  - Run all existing tests & `scripts/test-hard-reset-precision.ts`, `scripts/test-career-hook-precision.ts`, `scripts/test-relationship-hook-precision.ts`, and `scripts/test-rule-matcher.ts` to confirm zero regressions.

### Step 4: Environment Variables & Docs Update
- **`.env.local` / `.env.example` documentation:**
  - `LLM_PROVIDER_MODE=auto` *(options: `auto` | `gemini_only` | `openai_only`)*
  - `OPENAI_API_KEY=...` *(optional in `gemini_only`, required for `auto` fallback or `openai_only`)*
  - `OPENAI_MODEL=gpt-4.1-mini`
- Update `docs/LLM_PROMPTS.md` to note the meta-system phrase ban and dual-provider support.

---

## 4. Verification & Acceptance Criteria

1. **Unit Tests (`tests/llmResilienceAndVoice.test.ts` + existing `tests/*.test.ts`):**
   - `ResilientLlmProvider` tries Gemini first and returns Gemini result (`llmCallsMade: 1`) when healthy.
   - When Gemini throws `503` / `429` / timeout, `ResilientLlmProvider` automatically falls back to `OpenAiLlmProvider`, succeeds, and sets `modelVersion` to the OpenAI model name.
   - `ResilientLlmProvider` respects `LLM_PROVIDER_MODE=gemini_only` (does not call OpenAI) and `LLM_PROVIDER_MODE=openai_only` (skips Gemini).
   - `auditBlueprintOutput` catches `"this supplied fit score"` and `"recorded dates"` under `meta_system_leak` and triggers the 1x auto-repair loop cleanly.
2. **Live Smoke Test (once billing credits are active on Gemini or OpenAI):**
   - Run `synthesizeBlueprint` via `getLlmProvider()` (`auto` mode) and verify:
     - `SynthesizedBlueprintSchema.safeParse` passes.
     - `auditBlueprintOutput` returns `passed: true`, `violations: []`.
     - Zero occurrences of `"supplied"`, `"recorded dates"`, or robotic `"Check whether"` loops in generated copy.
     - `era3Preview` and `era4Preview` display active/future dates without historical caveats.
3. **Full Build Gate:**
   - `npm test` passes 100%.
   - `npm run typecheck` passes with 0 errors.
   - `npm run build` completes cleanly.
