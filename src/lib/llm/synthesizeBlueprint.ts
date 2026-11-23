import {
  CareerTelemetry,
  computeCareerTelemetry,
  normalizeCareerMode,
  type CanonicalCareerMode,
} from "@/lib/astro/careerEngine";
import {
  computeHardResetTelemetry,
  HardResetTelemetry,
} from "@/lib/astro/hardResetEngine";
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
import { buildCareerPromptSection } from "@/lib/llm/prompts/careerPrompt";
import { buildHardResetPromptSection } from "@/lib/llm/prompts/hardResetPrompt";
import { LlmProvider } from "@/lib/llm/provider";
import { CareerMode, RelationshipStatus } from "@/lib/types/blueprint";

export const FIRST_NAME_PLACEHOLDER = "{{FIRST_NAME}}";

export interface BlueprintUserProfileContext {
  firstName: string;
  dobIso?: string | null;
  relationshipStatus: RelationshipStatus;
  careerMode: CareerMode;
  careerField: string;
}

export interface SynthesizeBlueprintInput {
  normalizedChart: NormalizedChartJson;
  profile: BlueprintUserProfileContext;
  referenceDate?: Date;
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

const CAREER_MODE_LABELS: Record<CanonicalCareerMode, string> = {
  employed: "Employed (9–5 Day Job)",
  employed_hybrid: "9–5 + Building on the Side",
  founder: "Founder / Business Owner",
  freelance_hybrid: "Freelance / Consulting",
  in_transition: "Between Roles / Exploring",
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

function computeTelemetryBundle(input: SynthesizeBlueprintInput): {
  hardResetTelemetry: HardResetTelemetry;
  careerTelemetry: CareerTelemetry;
  canonicalCareerMode: CanonicalCareerMode;
} {
  const canonicalCareerMode = normalizeCareerMode(input.profile.careerMode);
  const refDate = input.referenceDate ?? new Date();

  const hardResetTelemetry = computeHardResetTelemetry(
    input.normalizedChart,
    {
      firstName: FIRST_NAME_PLACEHOLDER,
      dobIso: input.profile.dobIso,
      relationshipStatus: input.profile.relationshipStatus,
      careerMode: canonicalCareerMode,
      careerField: input.profile.careerField,
    },
    input.normalizedChart.precisionMode,
    refDate
  );

  const careerTelemetry = computeCareerTelemetry(
    input.normalizedChart,
    {
      firstName: FIRST_NAME_PLACEHOLDER,
      careerMode: canonicalCareerMode,
      careerField: input.profile.careerField,
    },
    input.normalizedChart.precisionMode,
    refDate
  );

  return { hardResetTelemetry, careerTelemetry, canonicalCareerMode };
}

/**
 * Builds the zero-PII prompt payload sent to Gemini.
 * Strips email and replaces first_name with the literal {{FIRST_NAME}} placeholder.
 * Includes server-only deterministic telemetry for Hook #1 (Hard Reset) and Hook #3 (Career).
 */
export function buildChartSignalPayload(
  input: SynthesizeBlueprintInput,
  telemetryOverride?: {
    hardResetTelemetry: HardResetTelemetry;
    careerTelemetry: CareerTelemetry;
    canonicalCareerMode: CanonicalCareerMode;
  }
) {
  const { normalizedChart, profile } = input;
  const { hardResetTelemetry, careerTelemetry, canonicalCareerMode } =
    telemetryOverride ?? computeTelemetryBundle(input);
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
      careerMode: canonicalCareerMode,
      careerModeLabel: CAREER_MODE_LABELS[canonicalCareerMode],
      careerField: profile.careerField.trim() || "(not specified)",
    },
    precisionContext: {
      precisionMode: normalizedChart.precisionMode,
      isExactBirthTime: isExact,
      moonBoundaryFlag: normalizedChart.moonBoundaryFlag,
    },
    hardResetTelemetry,
    careerTelemetry,
    exactAnchorsToPreserveVerbatim: {
      hardResetPrimaryYearRange:
        hardResetTelemetry.selected_chapters[0]?.year_range ??
        normalizedChart.hardResetWindow.dateRange,
      hardResetSecondaryYearRange:
        hardResetTelemetry.selected_chapters[1]?.year_range ??
        normalizedChart.hardResetWindow.dateRange,
      hardResetNextPressureMonthRange:
        hardResetTelemetry.upcoming_prep_window.month_range,
      careerCurrentPathFitScore: careerTelemetry.scores.current_path_fit_score,
      careerPathScores: {
        day_job: careerTelemetry.scores.day_job_score,
        going_solo: careerTelemetry.scores.going_solo_score,
        hybrid_side_build: careerTelemetry.scores.hybrid_side_build_score,
      },
      careerTimingYearLabel:
        careerTelemetry.forward_12m_timing.timing_year_label,
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
    return value.replace(/\{\{?\s*first_name\s*\}?\}/gi, safeName) as T;
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

function buildSystemPrompt(
  input: SynthesizeBlueprintInput,
  canonicalCareerMode: CanonicalCareerMode
): string {
  const { normalizedChart, profile } = input;
  const isExact = normalizedChart.precisionMode === "exact";

  const precisionConstraint = isExact
    ? `PRECISION MODE = "exact":
- Exact birth time is available. You may weave sharp contrasts between internal emotional drive and external leadership perception, career authority dynamics, and partnership durability patterns—always expressed purely in modern behavioral psychology.`
    : `CRITICAL PRECISION CONSTRAINT (precisionMode = "${normalizedChart.precisionMode}"):
- Exact birth time was NOT provided. You MUST NOT fabricate rising-sign / first-impression perception splits, house-specific career status, or divisional-chart nuances absent from telemetry.
- Anchor all 5 hooks honestly in the provided lunar/solar/natal telemetry and core behavioral archetypes—still expressed in plain modern psychology.${
        normalizedChart.moonBoundaryFlag
          ? "\n- NOTE: Birth occurred on a lunar transition boundary day. Lean more heavily on solar character, macro multi-year cycle shifts, and core number dynamics."
          : ""
      }
- You MUST populate hook_proof_json.upgrade_hint with a warm, friendly 1-sentence note letting the user know that adding their exact birth time later sharpens their timeline and workplace precision for free.`;

  const relationshipGuidance =
    profile.relationshipStatus === "married" ||
    profile.relationshipStatus === "relationship"
      ? `RELATIONSHIP BRANCH = "partnered" (${RELATIONSHIP_LABELS[profile.relationshipStatus]}):
- Focus Hook 2 on partnership alignment, unspoken needs, emotional bandwidth under stress, and silent friction dynamics with a committed partner. Frame friction constructively with zero doom.`
      : `RELATIONSHIP BRANCH = "solo" (${RELATIONSHIP_LABELS[profile.relationshipStatus]}):
- Focus Hook 2 on attraction magnetism, repeating partner patterns, relational pacing, and what actually sustains long-term peace.`;

  return `You are the behavioral synthesis engine for Personal Blueprint, a modern US self-reflection platform ("Ancient pattern intelligence meets modern self-reflection").
Your job is to translate the internal pattern calculation signals and deterministic telemetry in the user payload into deeply resonant, candid, high-agency modern behavioral insights across 5 hooks, strictly separated into free proof (hook_proof_json) and paid deep-dive (full_blueprint_json).

TONE & VOICE:
- Warm, grounded, perceptive US mentor talking one-on-one over coffee—never fortune-telling, mystical fluff, corporate consultant-speak, doom, or clinical therapy.
- Specific, emotionally uncanny, and actionable. Speak directly to the user ("you", using the literal token ${FIRST_NAME_PLACEHOLDER} naturally where helpful—never invent another name).
- ZERO fatalism. Frame challenges as structural patterns and agency levers.

ABSOLUTE JARGON BAN (STRICTLY ENFORCED BY AUTOMATED SCANNER):
You MUST NEVER output ANY of the following words or concepts anywhere in any JSON string value (including titles, badges, pills, or summaries):
- Any astrology, horoscope, zodiac, planetary, Sanskrit, Ayurvedic, or numerology terms: astrology, astrological, horoscope, vedic, jyotish, zodiac, planet, planets, planetary, transit, transits, eclipse, lagna, ascendant, rising sign, rashi, dasha, mahadasha, antardasha, nakshatra, pada, kundali, kundli, rahu, ketu, shani, saturn, mangal, mars, shukra, venus, budha, mercury, surya, chandra, guru, jupiter, pluto, uranus, neptune, retrograde, sade sati, dhaiya, panauti, dusthana, kendra, trikona, navamsha, navamsa, dashamsha, dashamsa, upapada, arudha, karma, karmic, upaay, mantra, chakra, remedy, pitta, vata, kapha, dosha, dharma, numerology, life path number, any zodiac sign name (Aries..Pisces or Mesha..Meena), or any numbered house ("1st house" .. "12th house").
- Any fatalistic or clinical terms: divorce, infidelity, cheating, cursed, doomed, bad luck, unlucky, early death, clinical depression, diagnose, therapy, therapist.

${precisionConstraint}

${buildHardResetPromptSection(FIRST_NAME_PLACEHOLDER)}

${relationshipGuidance}

${buildCareerPromptSection(FIRST_NAME_PLACEHOLDER, canonicalCareerMode, profile.careerField.trim())}

VERBATIM ANCHORS:
- Preserve all strings and numbers in exactAnchorsToPreserveVerbatim verbatim in their corresponding output fields.
- Hook 5 must set era1.id = "era1", era1.label = "Era 1", era2.id = "era2", era2.label = "Era 2".`;
}

function enforceDeterministicAnchors(
  draft: SynthesizedBlueprintPayload,
  input: SynthesizeBlueprintInput,
  hardResetTelemetry: HardResetTelemetry,
  careerTelemetry: CareerTelemetry
): SynthesizedBlueprintPayload {
  const { normalizedChart, profile } = input;
  const isExact = normalizedChart.precisionMode === "exact";
  const isPartnered =
    profile.relationshipStatus === "married" ||
    profile.relationshipStatus === "relationship";

  const defaultUpgradeHint =
    "Add your exact birth time anytime to sharpen your workplace perception and monthly timing windows for free.";

  const primaryChapter = hardResetTelemetry.selected_chapters[0];
  const secondaryChapter = hardResetTelemetry.selected_chapters[1];

  const previewItems = draft.hook_proof_json.hardReset.lockedMonthlyTimelineTeaser.previewItems.map(
    (item, idx) => {
      const sourceFp = primaryChapter?.flashpoints[idx];
      return {
        ...item,
        id: sourceFp?.id ?? item.id,
        yearLabel: sourceFp?.year_label ?? item.yearLabel,
      };
    }
  );

  // Ensure deterministic score alignment in paid pathComparison
  const scoreByKey: Record<"day_job" | "going_solo" | "hybrid_side_build", number> = {
    day_job: careerTelemetry.scores.day_job_score,
    going_solo: careerTelemetry.scores.going_solo_score,
    hybrid_side_build: careerTelemetry.scores.hybrid_side_build_score,
  };
  const maxScore = Math.max(
    scoreByKey.day_job,
    scoreByKey.going_solo,
    scoreByKey.hybrid_side_build
  );

  const lockedPathComparison = draft.full_blueprint_json.career.pathComparison.map(
    (item) => {
      const exactScore = scoreByKey[item.pathKey];
      return {
        ...item,
        fitScore: exactScore,
        isRecommended: exactScore === maxScore,
      };
    }
  );

  // Align paid Hard Reset chapters/flashpoints verbatim to telemetry when IDs/indices match
  const lockedHardResetChapters = draft.full_blueprint_json.hardReset.chapters.map(
    (ch, chIdx) => {
      const tCh =
        hardResetTelemetry.selected_chapters.find((c) => c.chapter_id === ch.chapterId) ??
        hardResetTelemetry.selected_chapters[chIdx];
      if (!tCh) return ch;
      return {
        ...ch,
        chapterId: tCh.chapter_id,
        yearRange: tCh.year_range,
        flashpoints: ch.flashpoints.map((fp, fpIdx) => {
          const tFp =
            tCh.flashpoints.find((f) => f.id === fp.id) ??
            tCh.flashpoints[fpIdx];
          if (!tFp) return fp;
          return {
            ...fp,
            id: tFp.id,
            monthRange: tFp.month_range,
          };
        }),
      };
    }
  );

  // Align paid Career tight monthly windows verbatim to telemetry
  const lockedCareerWindows =
    draft.full_blueprint_json.career.next12Months.tightMonthlyWindows.map(
      (win, idx) => {
        const tWin =
          careerTelemetry.forward_12m_timing.upcoming_windows.find(
            (w) => w.id === win.id
          ) ?? careerTelemetry.forward_12m_timing.upcoming_windows[idx];
        if (!tWin) return win;
        return {
          ...win,
          id: tWin.id,
          monthRange: tWin.month_range,
        };
      }
    );

  return {
    hook_proof_json: {
      ...draft.hook_proof_json,
      hardReset: {
        ...draft.hook_proof_json.hardReset,
        primaryYearRange:
          primaryChapter?.year_range ??
          draft.hook_proof_json.hardReset.primaryYearRange,
        secondaryYearWindow: {
          ...draft.hook_proof_json.hardReset.secondaryYearWindow,
          yearRange:
            secondaryChapter?.year_range ??
            draft.hook_proof_json.hardReset.secondaryYearWindow.yearRange,
        },
        lockedMonthlyTimelineTeaser: {
          ...draft.hook_proof_json.hardReset.lockedMonthlyTimelineTeaser,
          totalLockedFlashpoints: hardResetTelemetry.total_flashpoints_detected,
          lockedChaptersSpan: hardResetTelemetry.locked_chapters_span,
          previewItems,
        },
      },
      relationship: {
        ...draft.hook_proof_json.relationship,
        branch: isPartnered ? "partnered" : "solo",
      },
      career: {
        ...draft.hook_proof_json.career,
        currentPathFitScore: careerTelemetry.scores.current_path_fit_score,
        lockedTeaser: {
          ...draft.hook_proof_json.career.lockedTeaser,
          alternativeLanesCount:
            careerTelemetry.natal_work_profile.alternative_lanes.length,
          timingYearLabel:
            careerTelemetry.forward_12m_timing.timing_year_label,
        },
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
        chapters: lockedHardResetChapters,
        nextPressureWindow: {
          ...draft.full_blueprint_json.hardReset.nextPressureWindow,
          monthRange: hardResetTelemetry.upcoming_prep_window.month_range,
        },
      },
      career: {
        ...draft.full_blueprint_json.career,
        pathComparison: lockedPathComparison,
        next12Months: {
          ...draft.full_blueprint_json.career.next12Months,
          tightMonthlyWindows: lockedCareerWindows,
        },
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
Your previous draft violated the strict Content, Tone, or Two-Tier Monetization Guardrail.
Flagged terms/issues: ${audit.flaggedTerms.join(", ")}
Specific violations:
${audit.violations
  .map((v) => `- [${v.category}] At "${v.path}": found "${v.term}" inside "...${v.snippet}..."`)
  .join("\n")}

Rewrite ONLY the offending sentences into warm, plain-English modern behavioral guidance.
- Remove ALL astrology/Sanskrit/numerology terms, fatalistic/clinical words, horoscope clichés, and corporate buzzwords.
- Remove ALL month names, seasons, and paid career path percentages from the FREE \`hook_proof_json\` tier while preserving concrete real-life meaning.
- Preserve all exact telemetry dates, scores, branch values, ${FIRST_NAME_PLACEHOLDER} tokens, and JSON structure identically.`;
}

export async function synthesizeBlueprint(
  input: SynthesizeBlueprintInput,
  provider: LlmProvider = getLlmProvider()
): Promise<SynthesizeBlueprintResult> {
  const telemetry = computeTelemetryBundle(input);
  const systemPrompt = buildSystemPrompt(input, telemetry.canonicalCareerMode);
  const userPayload = buildChartSignalPayload(input, telemetry);

  let llmCallsMade = 0;
  let repairedAfterAudit = false;

  llmCallsMade += 1;
  const rawDraft = await provider.generateStructuredJson(
    systemPrompt,
    userPayload,
    SynthesizedBlueprintSchema,
    { temperature: 0.35 }
  );

  let finalPayload = enforceDeterministicAnchors(
    rawDraft,
    input,
    telemetry.hardResetTelemetry,
    telemetry.careerTelemetry
  );
  let audit = auditBlueprintOutput(finalPayload, {
    hardResetTelemetry: telemetry.hardResetTelemetry,
    careerTelemetry: telemetry.careerTelemetry,
  });

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

    finalPayload = enforceDeterministicAnchors(
      repairedDraft,
      input,
      telemetry.hardResetTelemetry,
      telemetry.careerTelemetry
    );
    audit = auditBlueprintOutput(finalPayload, {
      hardResetTelemetry: telemetry.hardResetTelemetry,
      careerTelemetry: telemetry.careerTelemetry,
    });

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
