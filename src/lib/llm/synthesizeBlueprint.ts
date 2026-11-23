import { NormalizedChartJson } from "@/lib/astro/types";
import {
  SynthesizedBlueprintPayload,
  SynthesizedBlueprintSchema,
} from "@/lib/llm/blueprintSchema";
import { getLlmProvider } from "@/lib/llm/geminiProvider";
import {
  auditBlueprintOutput,
  BlueprintGuardrailError,
  GuardrailAuditResult,
} from "@/lib/llm/guardrails";
import { LlmProvider } from "@/lib/llm/provider";
import { CareerMode, RelationshipStatus } from "@/lib/types/blueprint";

export const FIRST_NAME_PLACEHOLDER = "{{FIRST_NAME}}";

export interface BlueprintUserProfileContext {
  firstName: string;
  relationshipStatus: RelationshipStatus;
  careerMode: CareerMode;
  careerField: string;
}

export interface SynthesizeBlueprintInput {
  normalizedChart: NormalizedChartJson;
  profile: BlueprintUserProfileContext;
}

export interface SynthesizeBlueprintResult {
  payload: SynthesizedBlueprintPayload;
  modelVersion: string;
  llmCallsMade: number;
  repairedAfterAudit: boolean;
}

const RELATIONSHIP_LABELS: Record<RelationshipStatus, string> = {
  married: "Married",
  relationship: "In a Relationship",
  single: "Single / Dating",
  shifting: "Navigating a Shift",
};

const CAREER_MODE_LABELS: Record<CareerMode, string> = {
  employed: "Employed (9-5)",
  founder: "Founder / Business Owner",
  freelance: "Freelance / Hybrid",
  transition: "In Transition",
};

function summarizeDivisionalChart(
  chartObj: Record<string, unknown> | null
): unknown {
  if (!chartObj) return null;
  const summary: Record<string, unknown> = {};
  for (let i = 0; i <= 12; i++) {
    const entry = chartObj[String(i)];
    if (!entry || typeof entry !== "object") continue;
    const p = entry as Record<string, unknown>;
    const key = String(p.full_name ?? p.name ?? i);
    summary[key] = {
      zodiac: p.zodiac ?? null,
      house: p.house ?? null,
      retro: Boolean(p.retro),
    };
  }
  if (Object.keys(summary).length > 0) {
    return summary;
  }
  return Object.fromEntries(Object.entries(chartObj).slice(0, 14));
}

/**
 * Builds the zero-PII prompt payload sent to Gemini.
 * Strips email and replaces first_name with the literal {{FIRST_NAME}} placeholder.
 */
export function buildChartSignalPayload(input: SynthesizeBlueprintInput) {
  const { normalizedChart, profile } = input;
  const isExact = normalizedChart.precisionMode === "exact";
  const isPartnered =
    profile.relationshipStatus === "married" ||
    profile.relationshipStatus === "relationship";

  return {
    userProfile: {
      firstName: FIRST_NAME_PLACEHOLDER,
      relationshipStatus: profile.relationshipStatus,
      relationshipLabel: RELATIONSHIP_LABELS[profile.relationshipStatus],
      relationshipBranch: isPartnered ? "partnered" : "solo",
      careerMode: profile.careerMode,
      careerModeLabel: CAREER_MODE_LABELS[profile.careerMode],
      careerField: profile.careerField.trim() || "(not specified)",
    },
    precisionContext: {
      precisionMode: normalizedChart.precisionMode,
      isExactBirthTime: isExact,
      moonBoundaryFlag: normalizedChart.moonBoundaryFlag,
    },
    exactAnchorsToPreserveVerbatim: {
      hardResetWindow: normalizedChart.hardResetWindow.dateRange,
      nextPressureWindow: normalizedChart.nextPressureWindow,
      era1DateRange: normalizedChart.eras.era1.dateRange,
      era2DateRange: normalizedChart.eras.era2.dateRange,
      era3DateRange: normalizedChart.eras.era3.dateRange,
      era3PercentComplete: normalizedChart.eras.era3.percentComplete ?? 50,
      era4DateRange: normalizedChart.eras.era4.dateRange,
      relationshipBranch: isPartnered ? "partnered" : "solo",
    },
    internalCalculationSignals: {
      corePlacements: {
        ascendant: isExact ? normalizedChart.corePlacements.ascendant : null,
        moon: normalizedChart.corePlacements.moon,
        sun: normalizedChart.corePlacements.sun,
        planets: normalizedChart.corePlacements.planets.map((p) => ({
          name: p.name,
          zodiac: p.zodiac,
          house: isExact ? p.house : null,
          nakshatra: p.nakshatra,
          nakshatraPada: p.nakshatraPada,
          retro: p.retro,
        })),
      },
      divisionalChartsIncluded: isExact && normalizedChart.divisionalChartsIncluded,
      divisionalCharts: isExact
        ? {
            D9: summarizeDivisionalChart(normalizedChart.divisionalCharts.D9),
            D10: summarizeDivisionalChart(normalizedChart.divisionalCharts.D10),
            D30: summarizeDivisionalChart(normalizedChart.divisionalCharts.D30),
          }
        : null,
      hardResetCycle: normalizedChart.hardResetWindow,
      sadeSatiWindows: normalizedChart.sadeSatiWindows,
      erasSignals: normalizedChart.eras,
      numerology: normalizedChart.numerology,
    },
  };
}

/**
 * Recursively replaces {{FIRST_NAME}} placeholders with the user's real first name
 * strictly on the server after Gemini returns validated, guardrail-clean JSON.
 */
export function interpolateFirstName<T>(value: T, firstName: string): T {
  const safeName = firstName.trim() || "Friend";

  if (typeof value === "string") {
    return value.replace(/\{\{?\s*FIRST_NAME\s*\}?\}/gi, safeName) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => interpolateFirstName(item, safeName)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = interpolateFirstName(v, safeName);
    }
    return out as T;
  }
  return value;
}

function buildSystemPrompt(input: SynthesizeBlueprintInput): string {
  const { normalizedChart, profile } = input;
  const isExact = normalizedChart.precisionMode === "exact";

  const precisionConstraint = isExact
    ? `PRECISION MODE = "exact":
- Exact birth time is available. You may weave sharp contrasts between internal emotional drive and external leadership perception, career authority dynamics, and partnership durability patterns—always expressed purely in modern behavioral psychology.`
    : `CRITICAL PRECISION CONSTRAINT (precisionMode = "${normalizedChart.precisionMode}"):
- Exact birth time was NOT provided. You MUST NOT fabricate or mention rising-sign / first-impression perception splits, house-specific career status, or divisional-chart nuances.
- Anchor all 5 hooks honestly in lunar emotional rhythms, macro multi-year timing pressure, and core behavioral number archetypes—still expressed in plain modern psychology.${
        normalizedChart.moonBoundaryFlag
          ? "\n- NOTE: Birth occurred on a lunar transition boundary day. Lean more heavily on solar character, macro multi-year cycle shifts, and core number dynamics rather than overly narrow emotional-temperament stereotypes."
          : ""
      }
- You MUST populate hook_proof_json.upgrade_hint with a warm, friendly 1-sentence note letting the user know that adding their exact birth time later unlocks deeper career and partnership precision for free.`;

  const relationshipGuidance =
    profile.relationshipStatus === "married" ||
    profile.relationshipStatus === "relationship"
      ? `RELATIONSHIP BRANCH = "partnered" (${RELATIONSHIP_LABELS[profile.relationshipStatus]}):
- Focus Hook 2 on partnership alignment, unspoken needs, emotional bandwidth under stress, and silent friction dynamics with a committed partner. Frame friction constructively with zero doom.`
      : `RELATIONSHIP BRANCH = "solo" (${RELATIONSHIP_LABELS[profile.relationshipStatus]}):
- Focus Hook 2 on attraction magnetism, repeating partner patterns, relational pacing, and what actually sustains long-term peace.`;

  return `You are the behavioral synthesis engine for Personal Blueprint, a modern US self-reflection platform ("Ancient pattern intelligence meets modern self-reflection").
Your job is to translate the internal pattern calculation signals in the user payload into deeply resonant, candid, high-agency modern behavioral insights across 5 hooks, strictly separated into free proof (hook_proof_json) and paid deep-dive (full_blueprint_json).

TONE & VOICE:
- Warm, grounded, perceptive US executive mentor—never fortune-telling, mystical fluff, doom, or clinical therapy.
- Specific, emotionally uncanny, and actionable. Speak directly to the user ("you", using the literal token ${FIRST_NAME_PLACEHOLDER} naturally where helpful—never invent another name).
- ZERO fatalism. Frame challenges as structural patterns and agency levers.

ABSOLUTE JARGON BAN (STRICTLY ENFORCED BY AUTOMATED SCANNER):
You MUST NEVER output ANY of the following words or concepts anywhere in any JSON string value (including titles, badges, pills, or summaries):
- Any astrology, horoscope, zodiac, planetary, Sanskrit, Ayurvedic, or numerology terms: astrology, astrological, horoscope, vedic, jyotish, zodiac, planet, planets, planetary, transit, transits, lagna, ascendant, rising sign, rashi, dasha, mahadasha, antardasha, nakshatra, pada, kundali, kundli, rahu, ketu, shani, saturn, mangal, mars, shukra, venus, budha, mercury, surya, chandra, guru, jupiter, pluto, uranus, neptune, retrograde, sade sati, dhaiya, panauti, dusthana, kendra, trikona, navamsha, navamsa, dashamsha, dashamsa, upapada, arudha, karma, karmic, upaay, mantra, chakra, remedy, pitta, vata, kapha, dosha, dharma, numerology, life path number, any zodiac sign name (Aries..Pisces or Mesha..Meena), or any numbered house ("1st house" .. "12th house").
- Any fatalistic or clinical terms: divorce, infidelity, cheating, cursed, doomed, bad luck, unlucky, early death, clinical depression, diagnose, therapy, therapist.
Instead, translate all underlying calculations into plain modern psychology, nervous-system regulation, leadership dynamics, and decision architecture (e.g., "multi-year compression phase", "internal emotional baseline", "natural operating rhythm", "structural pivot").

${precisionConstraint}

${relationshipGuidance}

CAREER AUDIT GUIDANCE:
- Evaluate their careerMode (${CAREER_MODE_LABELS[profile.careerMode]}) and stated careerField (${profile.careerField.trim() || "general leadership/craft"}).
- Provide an honest alignmentScore (35-96), a crisp 3-4 word subtitle, a 1-2 word idealModePill, and in the paid layer give a clear Job vs. Business verdict, natural edge vs. how leadership reads them, field evaluation, duty vs. purpose gap, and 1 concrete 12-month next move.

VERBATIM ANCHORS:
- Preserve all strings and numbers in exactAnchorsToPreserveVerbatim verbatim in their corresponding output fields.
- Hook 5 must set era1.id = "era1", era1.label = "Era 1", era2.id = "era2", era2.label = "Era 2".`;
}

function enforceDeterministicAnchors(
  draft: SynthesizedBlueprintPayload,
  input: SynthesizeBlueprintInput
): SynthesizedBlueprintPayload {
  const { normalizedChart, profile } = input;
  const isExact = normalizedChart.precisionMode === "exact";
  const isPartnered =
    profile.relationshipStatus === "married" ||
    profile.relationshipStatus === "relationship";

  const defaultUpgradeHint =
    "Want sharper career & relationship precision? Add your exact birth time anytime for a free refresh.";

  return {
    hook_proof_json: {
      ...draft.hook_proof_json,
      hardReset: {
        ...draft.hook_proof_json.hardReset,
        window: normalizedChart.hardResetWindow.dateRange,
      },
      relationship: {
        ...draft.hook_proof_json.relationship,
        branch: isPartnered ? "partnered" : "solo",
      },
      eras: {
        era1: {
          ...draft.hook_proof_json.eras.era1,
          id: "era1",
          label: "Era 1",
          dateRange: normalizedChart.eras.era1.dateRange,
        },
        era2: {
          ...draft.hook_proof_json.eras.era2,
          id: "era2",
          label: "Era 2",
          dateRange: normalizedChart.eras.era2.dateRange,
        },
        era3Preview: {
          ...draft.hook_proof_json.eras.era3Preview,
          dateRange: normalizedChart.eras.era3.dateRange,
          percentComplete:
            normalizedChart.eras.era3.percentComplete ??
            draft.hook_proof_json.eras.era3Preview.percentComplete,
        },
      },
      upgrade_hint: isExact
        ? null
        : draft.hook_proof_json.upgrade_hint?.trim() || defaultUpgradeHint,
    },
    full_blueprint_json: {
      ...draft.full_blueprint_json,
      hardReset: {
        ...draft.full_blueprint_json.hardReset,
        nextPressureWindow: normalizedChart.nextPressureWindow,
      },
      eras: {
        ...draft.full_blueprint_json.eras,
        era4Preview: {
          ...draft.full_blueprint_json.eras.era4Preview,
          dateRange: normalizedChart.eras.era4.dateRange,
        },
      },
    },
  };
}

function buildRepairSystemPrompt(
  baseSystemPrompt: string,
  audit: GuardrailAuditResult
): string {
  return `${baseSystemPrompt}

REPAIR INSTRUCTION:
Your previous draft violated the strict Jargon-Ban & High-Agency Guardrail.
Flagged banned terms: ${audit.flaggedTerms.join(", ")}
Specific violations:
${audit.violations
  .map((v) => `- At "${v.path}": found "${v.term}" inside "...${v.snippet}..."`)
  .join("\n")}

Rewrite ONLY the offending sentences into warm, high-agency modern behavioral psychology.
Do NOT include any of the flagged terms or any other banned astrology, Sanskrit, numerology, fatalistic, or clinical words.
Preserve all exact dates, numbers, branch values, ${FIRST_NAME_PLACEHOLDER} tokens, and JSON structure identically.`;
}

export async function synthesizeBlueprint(
  input: SynthesizeBlueprintInput,
  provider: LlmProvider = getLlmProvider()
): Promise<SynthesizeBlueprintResult> {
  const systemPrompt = buildSystemPrompt(input);
  const userPayload = buildChartSignalPayload(input);

  let llmCallsMade = 0;
  let repairedAfterAudit = false;

  llmCallsMade += 1;
  const rawDraft = await provider.generateStructuredJson(
    systemPrompt,
    userPayload,
    SynthesizedBlueprintSchema,
    { temperature: 0.35 }
  );

  let finalPayload = enforceDeterministicAnchors(rawDraft, input);
  let audit = auditBlueprintOutput(finalPayload);

  if (!audit.passed) {
    console.warn(
      "[synthesizeBlueprint] Guardrail flagged terms on pass 1:",
      audit.flaggedTerms
    );

    repairedAfterAudit = true;
    llmCallsMade += 1;

    const repairSystemPrompt = buildRepairSystemPrompt(systemPrompt, audit);
    const repairedDraft = await provider.generateStructuredJson(
      repairSystemPrompt,
      {
        originalContext: userPayload,
        draftToRepair: finalPayload,
        flaggedTerms: audit.flaggedTerms,
        violations: audit.violations,
      },
      SynthesizedBlueprintSchema,
      { temperature: 0.25 }
    );

    finalPayload = enforceDeterministicAnchors(repairedDraft, input);
    audit = auditBlueprintOutput(finalPayload);

    if (!audit.passed) {
      console.error(
        "[synthesizeBlueprint] Guardrail failed after retry. Exact flagged terms:",
        audit.flaggedTerms,
        audit.violations
      );
      throw new BlueprintGuardrailError(
        `Blueprint output failed content guardrail after retry (flagged: ${audit.flaggedTerms.join(", ")}).`,
        audit.violations,
        audit.flaggedTerms
      );
    }
  }

  // Restore user's actual first_name server-side after validation + guardrail pass
  finalPayload = interpolateFirstName(finalPayload, input.profile.firstName);

  return {
    payload: finalPayload,
    modelVersion: provider.modelName,
    llmCallsMade,
    repairedAfterAudit,
  };
}
