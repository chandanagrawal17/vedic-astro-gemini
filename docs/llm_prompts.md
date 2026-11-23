# LLM Synthesis Prompts, JSON Schemas & Guardrails

## 1. Architecture Strategy: Single Unified Synthesis Call

Instead of firing 5 slow sequential LLM calls during onboarding, run **one structured JSON completion** (`temperature: 0.35`, `responseMimeType: "application/json"`) using Gemini Flash on a **paid zero-data-retention API tier**. This keeps onboarding synthesis under 3–4 seconds, maintains narrative coherence across all 5 hooks, and costs fractions of a cent per user.

## 2. Automated Jargon-Ban Regex Guardrail (Mandatory Post-Processor)

Run this exact scanner on every generated JSON string before saving to Supabase. If any match triggers, run 1 automated repair pass instructing the model to rewrite only the offending strings in plain modern psychology.

```ts
export const BANNED_TERMS_REGEX =
  /\b(astrolog\w*|horoscope|vedic|jyotish|kundal[ia]|rashi|nakshatra|pada|charan|lagna|ascendant|navamsha|dashamsha|upapada|darapada|arudha|sudarshana|ashtakavarga|shadbala|mahadasha|antardasha|pratyantardasha|dasha|dasa|gochar|transit\w*|sade\s*sati|dhaiya|panauti|dusthana|kendra|trikona|upachaya|bhava|graha|yoga|dosha|mangal\w*|shani|rahu|ketu|shukr\w*|budh\w*|surya|chandra\w*|guru|brihaspati|mesha|vrishabha|mithuna|karka|simha|kanya|tula|vrishchika|dhanu|makara|kumbha|meena|aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces|saturn|jupiter|mars|venus|mercury|pluto|uranus|neptune|retrograde|vakriya|karm[ai]\w*|upaay|tantr\w*|mantra|chakra|pitta|vata|kapha|sattva|rajas|tamas|purushartha|dharma|artha|kama|moksha|numerolog\w*|life\s*path\s*number|1st\s*house|2nd\s*house|3rd\s*house|4th\s*house|5th\s*house|6th\s*house|7th\s*house|8th\s*house|9th\s*house|10th\s*house|11th\s*house|12th\s*house)\b/gi;
```

## 3. Knowledge Rulebook Grounding (`matched_knowledge_context`)

Before calling Gemini in `src/lib/llm/synthesizeBlueprint.ts`, `matchChartRules(normalizedChart, options)` (`src/lib/astro/ruleMatcher.ts`) maps the cached chart onto the 6 distilled rulebooks in `src/lib/knowledge/` and attaches `matchedKnowledgeContext` (`matched_knowledge_context`) alongside the normalized chart signals and telemetry:

- **Strict Grounding Rule:** *"Ground all behavioral insights, blind spots, relationship dynamics, career guidance, and somatic reset tips in `matched_knowledge_context` and `normalized_chart_json`. Synthesize them naturally into warm, everyday US mentor language—never copy rule strings verbatim and never leak any banned astrology, Sanskrit, or clinical terms."*
- **Precision Mode Honesty:** When `precisionMode !== "exact"`, `ruleMatcher.ts` omits Lagna-specific houses, lenses, and divisional/Lagna Nakshatra traits, and injects the Chaldean 1–9 `numerologyFallback` profile instead.
- **Automated Guardrail:** `auditBlueprintOutput` (`src/lib/llm/guardrails.ts`) scans every output string so zero Sanskrit, Ayurvedic (`Sattva`, `Vata`, `Pitta`, `Kapha`, `Dasha`, `Nakshatra`, `Lagna`), zodiac, house, or clinical terms leak to the user.

## 4. Output Validation Schema (Zod)

Use this exact schema in `src/lib/llm/blueprintSchema.ts` so `free_payload` (`hook_proof_json`) and `paid_payload` (`full_blueprint_json`) remain strictly separated.
