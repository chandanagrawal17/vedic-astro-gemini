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
import {
  computeRelationshipTelemetry,
  normalizeRelationshipStatus,
  RelationshipTelemetry,
} from "@/lib/astro/relationshipEngine";
import { matchChartRules } from "@/lib/astro/ruleMatcher";
import { NormalizedChartJson } from "@/lib/astro/types";
import {
  RelationshipDeepDivePayload,
  RelationshipOnlyPayload,
  RelationshipOnlySchema,
  RelationshipProofPayload,
  SynthesizedBlueprintPayload,
  SynthesizedBlueprintSchema,
} from "@/lib/llm/blueprintSchema";
import { getLlmProvider } from "@/lib/llm/geminiProvider";
import {
  auditBlueprintOutput,
  auditRelationshipOnlyOutput,
  BlueprintGuardrailError,
  GuardrailAuditResult,
} from "@/lib/llm/guardrails";
import { buildCareerPromptSection } from "@/lib/llm/prompts/careerPrompt";
import { buildHardResetPromptSection } from "@/lib/llm/prompts/hardResetPrompt";
import { buildRelationshipPromptSection } from "@/lib/llm/prompts/relationshipPrompt";
import { LlmProvider } from "@/lib/llm/provider";
import {
  CanonicalRelationshipStatus,
  CareerMode,
  RelationshipStatus,
} from "@/lib/types/blueprint";

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
  /** Optional whole-sign house of today's transiting Moon (1–12) for bandwidth guidance. */
  transitMoonHouse?: number;
}

export interface SynthesizeBlueprintResult {
  payload: SynthesizedBlueprintPayload;
  modelVersion: string;
  llmCallsMade: number;
  repairedAfterAudit: boolean;
}

const RELATIONSHIP_LABELS: Record<RelationshipStatus, string> = {
  married: "Married",
  dating: "Dating Someone",
  relationship: "In a Relationship",
  single: "Single",
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
  relationshipTelemetry: RelationshipTelemetry;
  canonicalCareerMode: CanonicalCareerMode;
  canonicalRelationshipStatus: CanonicalRelationshipStatus;
} {
  const canonicalCareerMode = normalizeCareerMode(input.profile.careerMode);
  const canonicalRelationshipStatus = normalizeRelationshipStatus(
    input.profile.relationshipStatus
  );
  const refDate = input.referenceDate ?? new Date();

  const hardResetTelemetry = computeHardResetTelemetry(
    input.normalizedChart,
    {
      firstName: FIRST_NAME_PLACEHOLDER,
      dobIso: input.profile.dobIso,
      relationshipStatus: canonicalRelationshipStatus,
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

  const relationshipTelemetry = computeRelationshipTelemetry(
    input.normalizedChart,
    {
      firstName: FIRST_NAME_PLACEHOLDER,
      relationshipStatus: canonicalRelationshipStatus,
    },
    input.normalizedChart.precisionMode,
    refDate
  );

  return {
    hardResetTelemetry,
    careerTelemetry,
    relationshipTelemetry,
    canonicalCareerMode,
    canonicalRelationshipStatus,
  };
}

/**
 * Builds the zero-PII prompt payload sent to Gemini.
 * Strips email and replaces firstName with the literal {{FIRST_NAME}} placeholder.
 * Includes server-only deterministic telemetry for Hook #1 (Hard Reset), Hook #2 (Relationship), and Hook #3 (Career).
 */
export function buildChartSignalPayload(
  input: SynthesizeBlueprintInput,
  telemetryOverride?: {
    hardResetTelemetry: HardResetTelemetry;
    careerTelemetry: CareerTelemetry;
    relationshipTelemetry: RelationshipTelemetry;
    canonicalCareerMode: CanonicalCareerMode;
    canonicalRelationshipStatus: CanonicalRelationshipStatus;
  }
) {
  const { normalizedChart, profile } = input;
  const {
    hardResetTelemetry,
    careerTelemetry,
    relationshipTelemetry,
    canonicalCareerMode,
    canonicalRelationshipStatus,
  } = telemetryOverride ?? computeTelemetryBundle(input);
  const isExact = normalizedChart.precisionMode === "exact";

  return {
    userProfile: {
      firstName: FIRST_NAME_PLACEHOLDER,
      relationshipStatus: canonicalRelationshipStatus,
      relationshipLabel: RELATIONSHIP_LABELS[canonicalRelationshipStatus],
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
    relationshipTelemetry,
    careerTelemetry,
    // Deterministic rulebook grounding (zero PII: name is never passed; DOB only yields a 1–9 digit).
    matchedKnowledgeContext: matchChartRules(normalizedChart, {
      dob: profile.dobIso ?? undefined,
      transitMoonHouse: input.transitMoonHouse,
    }),
    exactAnchorsToPreserveVerbatim: {
      hardResetPrimaryYearRange:
        hardResetTelemetry.selected_chapters[0]?.year_range ??
        normalizedChart.hardResetWindow.dateRange,
      hardResetSecondaryYearRange:
        hardResetTelemetry.selected_chapters[1]?.year_range ??
        normalizedChart.hardResetWindow.dateRange,
      hardResetNextPressureMonthRange:
        hardResetTelemetry.upcoming_prep_window.month_range,
      relationshipStatus: canonicalRelationshipStatus,
      relationshipPastLoveYearRange:
        relationshipTelemetry.freeLayerSignals.pastLoveShift.yearRange,
      relationshipLockedTimingYearLabel:
        relationshipTelemetry.freeLayerSignals.lockedTimingYearLabel,
      relationshipUpcomingWindows:
        relationshipTelemetry.paidLayerSignals.forward12mTiming.upcomingWindows.map(
          (w) => ({ id: w.id, monthRange: w.monthRange })
        ),
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
  canonicalCareerMode: CanonicalCareerMode,
  canonicalRelationshipStatus: CanonicalRelationshipStatus
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

  return `You are the behavioral synthesis engine for Personal Blueprint, a modern US self-reflection platform ("Ancient pattern intelligence meets modern self-reflection").
Your job is to translate the internal pattern calculation signals and deterministic telemetry in the user payload into deeply resonant, candid, high-agency modern behavioral insights across 5 hooks, strictly separated into free proof (hook_proof_json) and paid deep-dive (full_blueprint_json).

TONE & VOICE:
- Warm, grounded, perceptive US mentor talking one-on-one over coffee—never fortune-telling, mystical fluff, corporate consultant-speak, doom, or clinical therapy.
- Specific, emotionally uncanny, and actionable. Speak directly to the user ("you", using the literal token ${FIRST_NAME_PLACEHOLDER} naturally where helpful—never invent another name).
- ZERO fatalism. Frame challenges as structural patterns and agency levers.

ABSOLUTE JARGON BAN (STRICTLY ENFORCED BY AUTOMATED SCANNER):
You MUST NEVER output ANY of the following words or concepts anywhere in any JSON string value (including titles, badges, pills, or summaries):
- Any astrology, horoscope, zodiac, planetary, Sanskrit, Ayurvedic, or numerology terms: astrology, astrological, horoscope, vedic, jyotish, zodiac, planet, planets, planetary, transit, transits, eclipse, lagna, ascendant, rising sign, rashi, dasha, mahadasha, antardasha, nakshatra, pada, kundali, kundli, rahu, ketu, shani, saturn, mangal, mars, shukra, venus, budha, mercury, surya, chandra, guru, jupiter, pluto, uranus, neptune, retrograde, sade sati, dhaiya, panauti, dusthana, kendra, trikona, navamsha, navamsa, dashamsha, dashamsa, upapada, arudha, karma, karmic, upaay, mantra, chakra, remedy, pitta, vata, kapha, dosha, dharma, numerology, life path number, any zodiac sign name (Aries..Pisces or Mesha..Meena), or any numbered house ("1st house" .. "12th house").
- Any fatalistic or clinical terms: divorce, infidelity, cheating, unfaithful, doomed to fail, breakup is inevitable, cursed in love, destined to be alone, cursed, doomed, bad luck, unlucky, early death, clinical depression, diagnose, therapy, therapist.

KNOWLEDGE GROUNDING RULE (matched_knowledge_context):
- Ground all behavioral insights, blind spots, relationship dynamics, career guidance, and somatic reset tips in \`matchedKnowledgeContext\` (matched_knowledge_context) and the chart signals (normalized_chart_json → internalCalculationSignals + telemetry). Synthesize them naturally into warm, everyday US mentor language—never copy rule strings verbatim and never leak any banned astrology, Sanskrit, or clinical terms.
- Use nakshatraTraits (coreImpulse / strength / blindSpot / gunaEmphasis / coreDrive) to sharpen Hook #2 tells and Hook #4 loop naming; planetPatterns + activeHouses for Hook #1 and Hook #3 themes; relationship.coreLenses + frictionGuardrails for Hook #2 (never treat any single signal as a fixed verdict); wellness.stressSignature + dailyReset + somaticReset for nervous-system tells and antidote steps; timing.currentChapterDignity.pacingSignal for Hook #5 pacing tone.
- Keys and labels inside matchedKnowledgeContext (e.g. dosha names, guna keys, house numbers, period lords) are INTERNAL ONLY and must never appear in output.
- If numerologyFallback is present (no exact birth time), lean on its theme and growthEdge for core character texture instead of inventing chart detail.

${precisionConstraint}

${buildHardResetPromptSection(FIRST_NAME_PLACEHOLDER)}

${buildRelationshipPromptSection(FIRST_NAME_PLACEHOLDER, canonicalRelationshipStatus)}

${buildCareerPromptSection(FIRST_NAME_PLACEHOLDER, canonicalCareerMode, profile.careerField.trim())}

HOOK #4 — #1 SELF-SABOTAGE LOOP (CANDID, SHAME-FREE PATTERN BREAKER):
- Tone: Direct, empathetic mirror naming the subtle nervous-system or cognitive reflex without guilt, shame, or therapy-speak.
- Free tier (\`hook_proof_json.selfSabotage\`): Crisp evocative \`loopName\` (e.g. "The Urgency Loop") + 1 painfully relatable everyday \`symptomSentence\`.
- Paid tier (\`full_blueprint_json.selfSabotage\`): Concrete real-world triggers in love (\`triggerMapLove\`) and career (\`triggerMapCareer\`) + 3 grounded, secular cognitive/somatic \`antidoteSteps\`.

HOOK #5 — 10-YEAR ARC IN 3 ERAS (CRISP EDITORIAL STORYTELLER):
- Tone: Concise, evocative chapter narrative rooted in lived priorities and momentum—zero karma, fate, or cosmic-alignment phrasing.
- Free tier (\`hook_proof_json.eras\`): Crisp 2–4 word titles (\`era1\`, \`era2\`, \`era3Preview\`) + 1–2 grounded sentences summarizing how each chapter reshaped priorities, preserving \`dateRange\` and \`percentComplete\` verbatim.
- Paid tier (\`full_blueprint_json.eras\`): Concrete behavioral priorities inside \`era3Playbook\` (\`coreMandate\`, \`doubleDown\`, \`eliminate\`) + forward opportunity theme in \`era4Preview\`.

VERBATIM ANCHORS:
- Preserve all strings and numbers in exactAnchorsToPreserveVerbatim verbatim in their corresponding output fields.
- Hook 5 must set era1.id = "era1", era1.label = "Era 1", era2.id = "era2", era2.label = "Era 2".`;
}

function enforceRelationshipAnchors(
  freeRel: RelationshipProofPayload,
  paidRel: RelationshipDeepDivePayload,
  relationshipTelemetry: RelationshipTelemetry
): {
  freeRelationship: RelationshipProofPayload;
  paidRelationship: RelationshipDeepDivePayload;
} {
  const canonicalStatus = relationshipTelemetry.userContext.relationshipStatus;
  const telemetryWindows =
    relationshipTelemetry.paidLayerSignals.forward12mTiming.upcomingWindows;

  const pinnedWindows = paidRel.next12Months.tightMonthlyWindows.map(
    (win, idx) => {
      const tWin =
        telemetryWindows.find((w) => w.id === win.id) ?? telemetryWindows[idx];
      if (!tWin) return win;
      return {
        ...win,
        id: tWin.id,
        monthRange: tWin.monthRange,
      };
    }
  );

  const freeRelationship: RelationshipProofPayload = {
    ...freeRel,
    relationshipStatus: canonicalStatus,
    pastLoveShift: {
      ...freeRel.pastLoveShift,
      yearRange: relationshipTelemetry.freeLayerSignals.pastLoveShift.yearRange,
    },
    lockedTimingYearLabel:
      relationshipTelemetry.freeLayerSignals.lockedTimingYearLabel,
  };

  let paidRelationship: RelationshipDeepDivePayload;
  if (paidRel.relationshipStatus === "single") {
    paidRelationship = {
      ...paidRel,
      relationshipStatus: "single",
      next12Months: {
        ...paidRel.next12Months,
        tightMonthlyWindows: pinnedWindows,
      },
    };
  } else if (paidRel.relationshipStatus === "dating") {
    paidRelationship = {
      ...paidRel,
      relationshipStatus: "dating",
      next12Months: {
        ...paidRel.next12Months,
        tightMonthlyWindows: pinnedWindows,
      },
    };
  } else {
    paidRelationship = {
      ...paidRel,
      relationshipStatus: "married",
      next12Months: {
        ...paidRel.next12Months,
        tightMonthlyWindows: pinnedWindows,
      },
    };
  }

  return { freeRelationship, paidRelationship };
}

function enforceDeterministicAnchors(
  draft: SynthesizedBlueprintPayload,
  input: SynthesizeBlueprintInput,
  hardResetTelemetry: HardResetTelemetry,
  careerTelemetry: CareerTelemetry,
  relationshipTelemetry: RelationshipTelemetry
): SynthesizedBlueprintPayload {
  const { normalizedChart } = input;
  const isExact = normalizedChart.precisionMode === "exact";

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

  const { freeRelationship, paidRelationship } = enforceRelationshipAnchors(
    draft.hook_proof_json.relationship,
    draft.full_blueprint_json.relationship,
    relationshipTelemetry
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
      relationship: freeRelationship,
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
      relationship: paidRelationship,
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
  const systemPrompt = buildSystemPrompt(
    input,
    telemetry.canonicalCareerMode,
    telemetry.canonicalRelationshipStatus
  );
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
    telemetry.careerTelemetry,
    telemetry.relationshipTelemetry
  );
  let audit = auditBlueprintOutput(finalPayload, {
    hardResetTelemetry: telemetry.hardResetTelemetry,
    careerTelemetry: telemetry.careerTelemetry,
    relationshipTelemetry: telemetry.relationshipTelemetry,
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
      telemetry.careerTelemetry,
      telemetry.relationshipTelemetry
    );
    audit = auditBlueprintOutput(finalPayload, {
      hardResetTelemetry: telemetry.hardResetTelemetry,
      careerTelemetry: telemetry.careerTelemetry,
      relationshipTelemetry: telemetry.relationshipTelemetry,
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

  // Restore user's actual firstName server-side after validation + guardrail pass
  finalPayload = interpolateFirstName(finalPayload, input.profile.firstName);

  return {
    payload: finalPayload,
    modelVersion: provider.modelName,
    llmCallsMade,
    repairedAfterAudit,
  };
}

export interface SynthesizeRelationshipOnlyResult {
  hookProofRelationship: RelationshipProofPayload;
  fullBlueprintRelationship: RelationshipDeepDivePayload;
  modelVersion: string;
  llmCallsMade: number;
  repairedAfterAudit: boolean;
}

/**
 * Re-synthesizes ONLY Hook #2 (Relationship Mirror) when a user updates their relationship status,
 * preserving Hard Reset, Career, Eras, and Self-Sabotage verbatim.
 */
export async function synthesizeRelationshipOnly(
  input: {
    normalizedChart: NormalizedChartJson;
    firstName: string;
    relationshipStatus: RelationshipStatus;
    referenceDate?: Date;
  },
  provider: LlmProvider = getLlmProvider()
): Promise<SynthesizeRelationshipOnlyResult> {
  const canonicalStatus = normalizeRelationshipStatus(input.relationshipStatus);
  const relationshipTelemetry = computeRelationshipTelemetry(
    input.normalizedChart,
    {
      firstName: FIRST_NAME_PLACEHOLDER,
      relationshipStatus: canonicalStatus,
    },
    input.normalizedChart.precisionMode,
    input.referenceDate ?? new Date()
  );

  const systemPrompt = `You are translating \`relationshipTelemetry\` and \`matchedKnowledgeContext\` into \`hookProofRelationship\` (FREE) and \`fullBlueprintRelationship\` (PAID) using the literal placeholder ${FIRST_NAME_PLACEHOLDER} for the user's name.
ABSOLUTE JARGON BAN: Never output any astrology, Sanskrit, planet, sign, house, numerology, or fatalistic/clinical terms.
KNOWLEDGE GROUNDING RULE: Ground all behavioral insights, blind spots, relationship dynamics, and somatic reset tips in \`matchedKnowledgeContext\` and \`relationshipTelemetry\`. Synthesize them naturally into warm, everyday US mentor language—never copy rule strings verbatim and never leak any banned astrology, Sanskrit, or clinical terms.
${buildRelationshipPromptSection(FIRST_NAME_PLACEHOLDER, canonicalStatus)}`;

  const userPayload = {
    firstName: FIRST_NAME_PLACEHOLDER,
    relationshipStatus: canonicalStatus,
    relationshipTelemetry,
    matchedKnowledgeContext: matchChartRules(input.normalizedChart),
  };

  let llmCallsMade = 1;
  let repairedAfterAudit = false;

  const rawDraft: RelationshipOnlyPayload = await provider.generateStructuredJson(
    systemPrompt,
    userPayload,
    RelationshipOnlySchema,
    { temperature: 0.4 }
  );

  let anchored = enforceRelationshipAnchors(
    rawDraft.hookProofRelationship,
    rawDraft.fullBlueprintRelationship,
    relationshipTelemetry
  );

  let audit = auditRelationshipOnlyOutput(
    {
      hookProofRelationship: anchored.freeRelationship,
      fullBlueprintRelationship: anchored.paidRelationship,
    },
    relationshipTelemetry
  );

  if (!audit.passed) {
    repairedAfterAudit = true;
    llmCallsMade += 1;

    const repairSystemPrompt = buildRepairSystemPrompt(systemPrompt, audit);
    const repairedDraft = await provider.generateStructuredJson(
      repairSystemPrompt,
      {
        originalContext: userPayload,
        draftToRepair: {
          hookProofRelationship: anchored.freeRelationship,
          fullBlueprintRelationship: anchored.paidRelationship,
        },
        flaggedTerms: audit.flaggedTerms,
        violations: audit.violations,
      },
      RelationshipOnlySchema,
      { temperature: 0.25 }
    );

    anchored = enforceRelationshipAnchors(
      repairedDraft.hookProofRelationship,
      repairedDraft.fullBlueprintRelationship,
      relationshipTelemetry
    );

    audit = auditRelationshipOnlyOutput(
      {
        hookProofRelationship: anchored.freeRelationship,
        fullBlueprintRelationship: anchored.paidRelationship,
      },
      relationshipTelemetry
    );

    if (!audit.passed) {
      throw new BlueprintGuardrailError(
        `Relationship Mirror synthesis failed content guardrail after retry (flagged: ${audit.flaggedTerms.join(", ")}).`,
        audit.violations,
        audit.flaggedTerms
      );
    }
  }

  return {
    hookProofRelationship: interpolateFirstName(
      anchored.freeRelationship,
      input.firstName
    ),
    fullBlueprintRelationship: interpolateFirstName(
      anchored.paidRelationship,
      input.firstName
    ),
    modelVersion: provider.modelName,
    llmCallsMade,
    repairedAfterAudit,
  };
}
