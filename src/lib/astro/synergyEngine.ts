/**
 * Deterministic Behavioral Synergy Engine (Item 7, Part B)
 *
 * Pure, side-effect-free engine ($0 API cost) backed by `compatibility_kutas.json`
 * and `matchChartRules`. Computes the 8 Ashtakoota psychological dimensions,
 * cross-chart attraction/durability lenses, precision-honest fallbacks, and
 * non-fatalistic agency framing.
 *
 * Guardrails:
 *  - Strict camelCase everywhere.
 *  - Zero Sanskrit, zodiac, planet, house, or astrological jargon in user-facing output.
 *  - Never fabricates rising/house overlays when either chart is non-exact or moon-boundary uncertain.
 */

import compatibilityRulebook from "@/lib/knowledge/compatibility_kutas.json";
import { computeRelationshipTelemetry } from "@/lib/astro/relationshipEngine";
import {
  cleanRuleText,
  computeChaldeanDigit,
  findNakshatraRule,
  matchChartRules,
  signNumberOf,
} from "@/lib/astro/ruleMatcher";
import {
  AstroPrecisionMode,
  NormalizedChartJson,
  PlanetPlacement,
  toUiPrecisionMode,
} from "@/lib/astro/types";
import {
  BANNED_ASTROLOGY_REGEX,
  BANNED_FATALISTIC_REGEX,
  CLICHE_REGEX,
  CORPORATE_BUZZWORD_REGEX,
} from "@/lib/llm/guardrails";
import type {
  PrecisionMode,
  SynergyComparisonPayload,
  SynergyDimensionScore,
  SynergyRelationshipContext,
} from "@/lib/types/blueprint";

export const SYNERGY_ENGINE_VERSION = "synergy_v1_kutas";

interface CompatibilityRulebook {
  core_relationship_lenses: {
    attraction_and_chemistry: string;
    inner_bond_and_durability: string;
  };
  kuta_psychological_translations: Record<
    "varna" | "vasya" | "tara" | "yoni" | "graha_maitri" | "gana" | "bhakoot" | "nadi",
    string
  >;
  dosha_and_friction_guardrails: {
    kuja_or_mars_friction: string;
    avoid_superficial_rejection: string;
  };
}

const COMPATIBILITY = compatibilityRulebook as unknown as CompatibilityRulebook;

/* -------------------------------------------------------------------------- */
/*                       Classical 8-Kuta Lookup Tables                       */
/* -------------------------------------------------------------------------- */

/** Sign (1–12) -> Varna rank (1=Shudra, 2=Vaishya, 3=Kshatriya, 4=Brahmin). */
const SIGN_VARNA_RANK: Record<number, number> = {
  1: 3, 5: 3, 9: 3,
  2: 2, 6: 2, 10: 2,
  3: 1, 7: 1, 11: 1,
  4: 4, 8: 4, 12: 4,
};

type VasyaGroup = "chatushpada" | "manava" | "jalachara" | "vanachara" | "keeta";

function vasyaGroupOf(signNo: number, localDegree: number): VasyaGroup {
  if (signNo === 1 || signNo === 2) return "chatushpada";
  if (signNo === 3 || signNo === 6 || signNo === 7 || signNo === 11) return "manava";
  if (signNo === 4 || signNo === 12) return "jalachara";
  if (signNo === 5) return "vanachara";
  if (signNo === 8) return "keeta";
  if (signNo === 9) return localDegree < 15 ? "manava" : "chatushpada";
  return localDegree < 15 ? "chatushpada" : "jalachara";
}

const VASYA_SCORE_MATRIX: Record<VasyaGroup, Record<VasyaGroup, number>> = {
  chatushpada: { chatushpada: 2, manava: 0, jalachara: 1, vanachara: 0.5, keeta: 1 },
  manava: { chatushpada: 0, manava: 2, jalachara: 0.5, vanachara: 0, keeta: 1 },
  jalachara: { chatushpada: 1, manava: 0.5, jalachara: 2, vanachara: 1, keeta: 1 },
  vanachara: { chatushpada: 0.5, manava: 0, jalachara: 1, vanachara: 2, keeta: 0 },
  keeta: { chatushpada: 1, manava: 1, jalachara: 1, vanachara: 0, keeta: 2 },
};

type GanaGroup = "deva" | "manushya" | "rakshasa";

/** Nakshatra ID (1–27) -> Gana. */
const NAKSHATRA_GANA: Record<number, GanaGroup> = {
  1: "deva", 2: "manushya", 3: "rakshasa", 4: "manushya", 5: "deva", 6: "manushya",
  7: "deva", 8: "deva", 9: "rakshasa", 10: "rakshasa", 11: "manushya", 12: "manushya",
  13: "deva", 14: "rakshasa", 15: "deva", 16: "rakshasa", 17: "deva", 18: "rakshasa",
  19: "rakshasa", 20: "manushya", 21: "manushya", 22: "deva", 23: "rakshasa", 24: "rakshasa",
  25: "manushya", 26: "manushya", 27: "deva",
};

const GANA_SCORE_MATRIX: Record<GanaGroup, Record<GanaGroup, number>> = {
  deva: { deva: 6, manushya: 6, rakshasa: 0 },
  manushya: { deva: 5, manushya: 6, rakshasa: 0 },
  rakshasa: { deva: 1, manushya: 0, rakshasa: 6 },
};

type NadiGroup = "adi" | "madhya" | "antya";

/** Classical continuous 3-column serpentine Nadi cycle across 27 Nakshatras. */
function nadiOf(nakshatraId: number): NadiGroup {
  const cycle: NadiGroup[] = [
    "adi", "madhya", "antya",
    "antya", "madhya", "adi",
  ];
  return cycle[(nakshatraId - 1) % 6];
}

type YoniAnimal =
  | "horse" | "elephant" | "sheep" | "serpent" | "dog" | "cat" | "rat"
  | "cow" | "buffalo" | "tiger" | "hare" | "monkey" | "lion" | "mongoose";

const NAKSHATRA_YONI: Record<number, YoniAnimal> = {
  1: "horse", 2: "elephant", 3: "sheep", 4: "serpent", 5: "serpent", 6: "dog",
  7: "cat", 8: "sheep", 9: "cat", 10: "rat", 11: "rat", 12: "cow",
  13: "buffalo", 14: "tiger", 15: "buffalo", 16: "tiger", 17: "hare", 18: "hare",
  19: "dog", 20: "monkey", 21: "mongoose", 22: "monkey", 23: "lion", 24: "horse",
  25: "lion", 26: "cow", 27: "elephant",
};

const YONI_SWORN_ENEMIES: Array<[YoniAnimal, YoniAnimal]> = [
  ["horse", "buffalo"],
  ["elephant", "lion"],
  ["sheep", "monkey"],
  ["serpent", "mongoose"],
  ["dog", "hare"],
  ["cat", "rat"],
  ["cow", "tiger"],
];

const YONI_FRIENDLY_PAIRS: Array<[YoniAnimal, YoniAnimal]> = [
  ["horse", "sheep"],
  ["horse", "dog"],
  ["elephant", "cow"],
  ["elephant", "sheep"],
  ["cat", "monkey"],
  ["cow", "buffalo"],
  ["hare", "deer" as YoniAnimal],
  ["lion", "dog"],
];

function scoreYoni(a: YoniAnimal, b: YoniAnimal): number {
  if (a === b) return 4;
  if (
    YONI_SWORN_ENEMIES.some(
      ([x, y]) => (x === a && y === b) || (x === b && y === a)
    )
  ) {
    return 0;
  }
  if (
    YONI_FRIENDLY_PAIRS.some(
      ([x, y]) => (x === a && y === b) || (x === b && y === a)
    )
  ) {
    return 3;
  }
  // Natural predator/prey pairs (e.g., tiger/horse, tiger/dog, lion/cow) score 1; neutral pairs score 2.
  const tensePairs: Array<[YoniAnimal, YoniAnimal]> = [
    ["horse", "tiger"],
    ["horse", "lion"],
    ["tiger", "sheep"],
    ["tiger", "hare"],
    ["lion", "sheep"],
    ["lion", "hare"],
    ["serpent", "rat"],
    ["cat", "hare"],
  ];
  if (
    tensePairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
  ) {
    return 1;
  }
  return 2;
}

type PlanetLord = "sun" | "moon" | "mars" | "mercury" | "jupiter" | "venus" | "saturn";

const SIGN_LORDS: Record<number, PlanetLord> = {
  1: "mars", 2: "venus", 3: "mercury", 4: "moon",
  5: "sun", 6: "mercury", 7: "venus", 8: "mars",
  9: "jupiter", 10: "saturn", 11: "saturn", 12: "jupiter",
};

type MaitriRelation = "friend" | "neutral" | "enemy";

const PLANET_FRIENDSHIP: Record<PlanetLord, Record<PlanetLord, MaitriRelation>> = {
  sun: { sun: "friend", moon: "friend", mars: "friend", jupiter: "friend", mercury: "neutral", venus: "enemy", saturn: "enemy" },
  moon: { sun: "friend", moon: "friend", mercury: "friend", mars: "neutral", jupiter: "neutral", venus: "neutral", saturn: "neutral" },
  mars: { sun: "friend", moon: "friend", mars: "friend", jupiter: "friend", venus: "neutral", saturn: "neutral", mercury: "enemy" },
  mercury: { sun: "friend", venus: "friend", mercury: "friend", mars: "neutral", jupiter: "neutral", saturn: "neutral", moon: "enemy" },
  jupiter: { sun: "friend", moon: "friend", mars: "friend", jupiter: "friend", saturn: "neutral", mercury: "enemy", venus: "enemy" },
  venus: { mercury: "friend", saturn: "friend", venus: "friend", mars: "neutral", jupiter: "neutral", sun: "enemy", moon: "enemy" },
  saturn: { mercury: "friend", venus: "friend", saturn: "friend", jupiter: "neutral", sun: "enemy", moon: "enemy", mars: "enemy" },
};

function scoreGrahaMaitri(signA: number, signB: number): number {
  const lordA = SIGN_LORDS[signA];
  const lordB = SIGN_LORDS[signB];
  if (lordA === lordB) return 5;
  const relAB = PLANET_FRIENDSHIP[lordA][lordB];
  const relBA = PLANET_FRIENDSHIP[lordB][lordA];
  if (relAB === "friend" && relBA === "friend") return 5;
  if (
    (relAB === "friend" && relBA === "neutral") ||
    (relAB === "neutral" && relBA === "friend")
  ) {
    return 4;
  }
  if (relAB === "neutral" && relBA === "neutral") return 3;
  if (
    (relAB === "friend" && relBA === "enemy") ||
    (relAB === "enemy" && relBA === "friend")
  ) {
    return 1;
  }
  if (
    (relAB === "neutral" && relBA === "enemy") ||
    (relAB === "enemy" && relBA === "neutral")
  ) {
    return 0.5;
  }
  return 0;
}

function scoreBhakoot(signA: number, signB: number): number {
  const dist = ((signB - signA + 12) % 12) + 1;
  // Auspicious distances: 1-1 (1), 3-11 (3 or 11), 4-10 (4 or 10), 1-7 (7)
  if (dist === 1 || dist === 3 || dist === 4 || dist === 7 || dist === 10 || dist === 11) {
    return 7;
  }
  return 0;
}

function scoreTara(nakIdA: number, nakIdB: number): number {
  const inauspicious = new Set([3, 5, 7]);
  const fwd = (((nakIdB - nakIdA + 27) % 27) + 1) % 9 || 9;
  const rev = (((nakIdA - nakIdB + 27) % 27) + 1) % 9 || 9;
  const fwdPts = inauspicious.has(fwd) ? 0 : 1.5;
  const revPts = inauspicious.has(rev) ? 0 : 1.5;
  return fwdPts + revPts;
}

/* -------------------------------------------------------------------------- */
/*                         Chart Helpers & Guardrails                         */
/* -------------------------------------------------------------------------- */

function resolveNakshatraId(moon: PlanetPlacement | null | undefined): number {
  if (moon) {
    const rule = findNakshatraRule(moon.nakshatra);
    if (rule) return rule.id;
    const sNo = signNumberOf(moon);
    if (sNo !== null) {
      const globalDeg = ((sNo - 1) * 30 + (moon.localDegree || 15)) % 360;
      return Math.min(27, Math.max(1, Math.floor(globalDeg / (360 / 27)) + 1));
    }
  }
  return 1;
}

function lowerPrecision(
  a: AstroPrecisionMode,
  b: AstroPrecisionMode
): AstroPrecisionMode {
  if (a === "date_only" || b === "date_only") return "date_only";
  if (a === "approx_window" || b === "approx_window") return "approx_window";
  return "exact";
}

function findPlanet(
  chart: NormalizedChartJson,
  name: string
): PlanetPlacement | null {
  const target = name.toLowerCase();
  return (
    chart.corePlacements.planets.find(
      (p) => p.name.trim().toLowerCase() === target
    ) ?? null
  );
}

function houseDistance(fromSign: number, toSign: number): number {
  return ((toSign - fromSign + 12) % 12) + 1;
}

function elementOfSign(signNo: number): "fire" | "earth" | "air" | "water" {
  const mod = (signNo - 1) % 4;
  if (mod === 0) return "fire";
  if (mod === 1) return "earth";
  if (mod === 2) return "air";
  return "water";
}

function areElementsComplementary(
  a: "fire" | "earth" | "air" | "water",
  b: "fire" | "earth" | "air" | "water"
): boolean {
  if (a === b) return true;
  return (
    (a === "fire" && b === "air") ||
    (a === "air" && b === "fire") ||
    (a === "earth" && b === "water") ||
    (a === "water" && b === "earth")
  );
}

function sanitizeFirstName(name: string, fallback: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  const cleaned = first.replace(/[^a-zA-Z0-9'’-]/g, "").slice(0, 32);
  return cleaned || fallback;
}

function humanizeArmor(tag: string): string {
  switch (tag) {
    case "independentSelfSufficientExterior":
      return "Self-sufficient exterior";
    case "warmSteadyGroundedExterior":
      return "Calm, steady presence";
    default:
      return "Thoughtful, composed exterior";
  }
}

function humanizeInnerHeart(tag: string): string {
  switch (tag) {
    case "cravesWarmthTasteBanterAndEqualTeammate":
      return "craves warmth, playful banter, and an equal teammate";
    case "secretlyTestsReliabilitySlowlyAndCravesSteadiness":
      return "quietly tests reliability over time and craves steadiness";
    default:
      return "values honest follow-through and emotional warmth";
  }
}

function buildPrecisionMeta(
  effectivePrecision: AstroPrecisionMode,
  anyMoonBoundary: boolean
): { mode: PrecisionMode; label: string; note: string } {
  const uiMode: PrecisionMode = toUiPrecisionMode(effectivePrecision);
  if (effectivePrecision === "exact" && !anyMoonBoundary) {
    return {
      mode: "exact",
      label: "Full Timing Precision",
      note: "Both profiles include exact birth times, unlocking both initial attraction overlays and long-term durability signals.",
    };
  }
  if (anyMoonBoundary) {
    return {
      mode: uiMode,
      label: "Day-Window Core Rhythm",
      note: "One profile falls near a daily emotional boundary without an exact birth time, so this read leans on verified values, temperament, and communication alignment without guessing timing overlays.",
    };
  }
  return {
    mode: uiMode,
    label: uiMode === "window" ? "Window Precision" : "Date-Only Core Rhythm",
    note: "One profile didn’t include an exact birth time, so this read keeps verified emotional rhythm and communication alignment without fabricating rising-hour overlays.",
  };
}

export function scanSynergyStringsForGuardrails(
  payload: SynergyComparisonPayload
): string[] {
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const ownerPattern = payload.participants.ownerFirstName
    ? new RegExp(`\\b${escapeRegex(payload.participants.ownerFirstName)}\\b`, "g")
    : null;
  const partnerPattern = payload.participants.partnerFirstName
    ? new RegExp(`\\b${escapeRegex(payload.participants.partnerFirstName)}\\b`, "g")
    : null;

  const maskNames = (raw: string): string => {
    let out = raw;
    if (ownerPattern) out = out.replace(ownerPattern, "PersonA");
    if (partnerPattern) out = out.replace(partnerPattern, "PersonB");
    return out;
  };

  const strings: string[] = [
    payload.precisionBadge.label,
    payload.precisionBadge.note,
    payload.headline,
    payload.coreLenses.attractionAndChemistry.insight,
    payload.coreLenses.innerBondAndDurability.insight,
    payload.participantStyles.ownerSummary,
    payload.participantStyles.partnerSummary,
    payload.participantStyles.sharedAnchor,
    payload.frictionAndAgency.title,
    payload.frictionAndAgency.growthEdgeNote,
    payload.frictionAndAgency.tenSecondRepair,
    ...payload.dimensions.flatMap((d) => [d.label, d.summary]),
  ].map(maskNames);

  const violations: string[] = [];
  for (const text of strings) {
    for (const regex of [
      BANNED_ASTROLOGY_REGEX,
      BANNED_FATALISTIC_REGEX,
      CLICHE_REGEX,
      CORPORATE_BUZZWORD_REGEX,
    ]) {
      const fresh = new RegExp(regex.source, regex.flags);
      let m: RegExpExecArray | null;
      while ((m = fresh.exec(text)) !== null) {
        violations.push(`${m[0]} (in "${text.slice(0, 48)}...")`);
        if (m.index === fresh.lastIndex) fresh.lastIndex += 1;
      }
    }
  }
  return violations;
}

/* -------------------------------------------------------------------------- */
/*                          Main Synergy Synthesizer                          */
/* -------------------------------------------------------------------------- */

export interface ComputeSynergyInput {
  ownerFirstName: string;
  ownerDob?: string;
  ownerChart: NormalizedChartJson;
  partnerFirstName: string;
  partnerDob?: string;
  partnerChart: NormalizedChartJson;
  relationshipContext: SynergyRelationshipContext;
}

export function computeSynergyComparison(
  input: ComputeSynergyInput
): SynergyComparisonPayload {
  const ownerName = sanitizeFirstName(input.ownerFirstName, "Person A");
  const partnerName = sanitizeFirstName(input.partnerFirstName, "Person B");

  const ownerRules = matchChartRules(input.ownerChart, {
    fullName: ownerName,
    dob: input.ownerDob,
  });
  const partnerRules = matchChartRules(input.partnerChart, {
    fullName: partnerName,
    dob: input.partnerDob,
  });

  const ownerRel = computeRelationshipTelemetry(input.ownerChart, {
    firstName: ownerName,
    relationshipStatus: "single",
  });
  const partnerRel = computeRelationshipTelemetry(input.partnerChart, {
    firstName: partnerName,
    relationshipStatus: "single",
  });

  const effectiveAstroPrecision = lowerPrecision(
    input.ownerChart.precisionMode,
    input.partnerChart.precisionMode
  );
  const anyMoonBoundary =
    (input.ownerChart.precisionMode !== "exact" &&
      input.ownerChart.moonBoundaryFlag) ||
    (input.partnerChart.precisionMode !== "exact" &&
      input.partnerChart.moonBoundaryFlag);

  const exactAllowed = effectiveAstroPrecision === "exact" && !anyMoonBoundary;

  // 1. Compute 8 Ashtakoota scores deterministically from Moon sign + Nakshatra
  const ownerMoon = input.ownerChart.corePlacements.moon;
  const partnerMoon = input.partnerChart.corePlacements.moon;
  const ownerMoonSign = signNumberOf(ownerMoon) ?? 1;
  const partnerMoonSign = signNumberOf(partnerMoon) ?? 1;
  const ownerNakId = resolveNakshatraId(ownerMoon);
  const partnerNakId = resolveNakshatraId(partnerMoon);

  const varnaPts =
    SIGN_VARNA_RANK[ownerMoonSign] >= SIGN_VARNA_RANK[partnerMoonSign] ? 1 : 0;
  const vasyaPts =
    VASYA_SCORE_MATRIX[
      vasyaGroupOf(ownerMoonSign, ownerMoon?.localDegree ?? 15)
    ][vasyaGroupOf(partnerMoonSign, partnerMoon?.localDegree ?? 15)];
  const taraPts = scoreTara(ownerNakId, partnerNakId);
  const yoniPts = scoreYoni(
    NAKSHATRA_YONI[ownerNakId] ?? "horse",
    NAKSHATRA_YONI[partnerNakId] ?? "horse"
  );
  const maitriPts = scoreGrahaMaitri(ownerMoonSign, partnerMoonSign);
  const ganaPts =
    GANA_SCORE_MATRIX[NAKSHATRA_GANA[ownerNakId] ?? "deva"][
      NAKSHATRA_GANA[partnerNakId] ?? "deva"
    ];
  const bhakootPts = scoreBhakoot(ownerMoonSign, partnerMoonSign);
  const nadiPts = nadiOf(ownerNakId) !== nadiOf(partnerNakId) ? 8 : 0;

  const kutas = COMPATIBILITY.kuta_psychological_translations;
  const toneFor = (earned: number, max: number): SynergyDimensionScore["tone"] => {
    const ratio = max > 0 ? earned / max : 0;
    if (ratio >= 0.7) return "aligned";
    if (ratio >= 0.45) return "moderate";
    return "growth";
  };

  const rawDimensions: SynergyDimensionScore[] = [
    {
      key: "nervousSystemPacing",
      label: "Nervous-System Pacing",
      earned: nadiPts,
      max: 8,
      tone: toneFor(nadiPts, 8),
      summary: cleanRuleText(kutas.nadi),
    },
    {
      key: "domesticFlow",
      label: "Domestic Flow",
      earned: bhakootPts,
      max: 7,
      tone: toneFor(bhakootPts, 7),
      summary: cleanRuleText(kutas.bhakoot),
    },
    {
      key: "mentalFriendship",
      label: "Mental Friendship",
      earned: maitriPts,
      max: 5,
      tone: toneFor(maitriPts, 5),
      summary: cleanRuleText(kutas.graha_maitri),
    },
    {
      key: "stressTemperament",
      label: "Stress Temperament",
      earned: ganaPts,
      max: 6,
      tone: toneFor(ganaPts, 6),
      summary: cleanRuleText(kutas.gana),
    },
    {
      key: "dailyRhythm",
      label: "Daily Rhythm",
      earned: taraPts,
      max: 3,
      tone: toneFor(taraPts, 3),
      summary: cleanRuleText(kutas.tara),
    },
    {
      key: "physicalRapport",
      label: "Physical Rapport",
      earned: yoniPts,
      max: 4,
      tone: toneFor(yoniPts, 4),
      summary: cleanRuleText(kutas.yoni),
    },
    {
      key: "mutualInfluence",
      label: "Mutual Influence",
      earned: vasyaPts,
      max: 2,
      tone: toneFor(vasyaPts, 2),
      summary: cleanRuleText(kutas.vasya),
    },
    {
      key: "sharedValues",
      label: "Shared Values",
      earned: varnaPts,
      max: 1,
      tone: toneFor(varnaPts, 1),
      summary: cleanRuleText(kutas.varna),
    },
  ];
  const dimensions = rawDimensions.sort((a, b) => b.earned / b.max - a.earned / a.max);

  const earnedTotal = Number(
    dimensions.reduce((sum, d) => sum + d.earned, 0).toFixed(1)
  );
  const maxTotal = 36;
  const overallScore = Math.round((earnedTotal / maxTotal) * 100);

  // 2. Cross-chart Attraction & Durability Lenses (precision-gated!)
  const ownerVenus = findPlanet(input.ownerChart, "Venus");
  const partnerVenus = findPlanet(input.partnerChart, "Venus");
  const ownerMars = findPlanet(input.ownerChart, "Mars");
  const partnerMars = findPlanet(input.partnerChart, "Mars");

  const ownerVenusSign = signNumberOf(ownerVenus) ?? ownerMoonSign;
  const partnerVenusSign = signNumberOf(partnerVenus) ?? partnerMoonSign;
  const ownerMarsSign = signNumberOf(ownerMars) ?? ownerMoonSign;
  const partnerMarsSign = signNumberOf(partnerMars) ?? partnerMoonSign;

  // Synastry spark bonuses (purely behavioral scoring)
  const moonMirrorAxis = houseDistance(ownerMoonSign, partnerMoonSign) === 7;
  const marsToMoonSpark =
    partnerMarsSign === ownerMoonSign ||
    ownerMarsSign === partnerMoonSign ||
    houseDistance(partnerMarsSign, ownerMoonSign) === 7 ||
    houseDistance(ownerMarsSign, partnerMoonSign) === 7;
  const venusHarmony = areElementsComplementary(
    elementOfSign(ownerVenusSign),
    elementOfSign(partnerVenusSign)
  );

  let ascHarmonyBonus = 0;
  let ascMirrorText = "";
  if (exactAllowed) {
    const ownerAscSign = signNumberOf(input.ownerChart.corePlacements.ascendant);
    const partnerAscSign = signNumberOf(input.partnerChart.corePlacements.ascendant);
    if (ownerAscSign && partnerAscSign) {
      const dist = houseDistance(ownerAscSign, partnerAscSign);
      if (dist === 5 || dist === 9 || dist === 7 || dist === 1) {
        ascHarmonyBonus = 8;
        ascMirrorText =
          "Your outward instincts click quickly too, giving first conversations easy confidence and mutual respect.";
      } else if (dist === 3 || dist === 11) {
        ascHarmonyBonus = 5;
      }
      if (partnerMoonSign === ((ownerAscSign + 5) % 12) + 1) {
        ascHarmonyBonus += 6;
      }
    }
  }

  const rawAttraction =
    56 +
    (moonMirrorAxis ? 12 : 0) +
    (marsToMoonSpark ? 10 : 0) +
    (venusHarmony ? 8 : 0) +
    Math.round(((yoniPts + vasyaPts) / 6) * 8) +
    ascHarmonyBonus;
  const attractionScore = Math.min(96, Math.max(48, rawAttraction));

  const sharedCoreDrive =
    ownerRules.nakshatraTraits.moon?.coreDrive.key &&
    ownerRules.nakshatraTraits.moon.coreDrive.key ===
      partnerRules.nakshatraTraits.moon?.coreDrive.key;

  const ownerChaldean = computeChaldeanDigit({
    fullName: ownerName,
    dob: input.ownerDob,
  });
  const partnerChaldean = computeChaldeanDigit({
    fullName: partnerName,
    dob: input.partnerDob,
  });
  const numerologyHarmony =
    ownerChaldean &&
    partnerChaldean &&
    (ownerChaldean.digit === partnerChaldean.digit ||
      (ownerChaldean.digit + partnerChaldean.digit) % 3 === 0);

  const rawDurability =
    45 +
    Math.round(((nadiPts + bhakootPts + maitriPts + varnaPts) / 21) * 34) +
    (sharedCoreDrive ? 8 : 0) +
    (numerologyHarmony ? 5 : 0);
  const durabilityScore = Math.min(95, Math.max(46, rawDurability));

  // 3. Plain-English Mentor Narrative (Zero Jargon, Context-Aware)
  const contextNoun =
    input.relationshipContext === "creative_partner"
      ? "working together"
      : input.relationshipContext === "close_friend"
        ? "your friendship"
        : "closeness";

  let headline = "Steady Rhythm Meets Honest Momentum";
  if (attractionScore >= 80 && overallScore < 68) {
    headline = "Magnetic Spark Meets Deep-Focus Drive";
  } else if (overallScore >= 75) {
    headline = "Natural Flow With Shared Emotional Pace";
  } else if (bhakootPts === 0 && nadiPts === 8) {
    headline = "High-Speed Spark Meets Steady Grounding";
  } else if (ganaPts === 0) {
    headline = "Strong Chemistry With Contrasting Reset Styles";
  }

  const attractionInsightParts: string[] = [];
  if (moonMirrorAxis && marsToMoonSpark) {
    attractionInsightParts.push(
      `Strong mirror chemistry: ${partnerName}’s warmth and directness ignite ${ownerName}’s emotional core immediately, keeping ${contextNoun} energized and candid.`
    );
  } else if (venusHarmony) {
    attractionInsightParts.push(
      `Your social styles and tastes complement each other naturally, creating easy conversational pull early on.`
    );
  } else {
    attractionInsightParts.push(
      `You bring contrasting styles to the table, which creates curiosity when neither person slips into polite autopilot.`
    );
  }
  if (ascMirrorText) attractionInsightParts.push(ascMirrorText);

  const durabilityInsightParts: string[] = [];
  if (nadiPts === 8 && bhakootPts === 7) {
    durabilityInsightParts.push(
      `Even where day-to-day habits differ, your nervous-system pacing (8/8) and long-term domestic flow (7/7) balance cleanly.`
    );
  } else if (nadiPts === 8) {
    durabilityInsightParts.push(
      `Your constitutional energy pacing balances well over time—one speeds up where the other steadies the room.`
    );
  } else {
    durabilityInsightParts.push(
      `Because your stress rhythms run on similar frequencies, deliberate pauses and clear personal space protect long-term ease.`
    );
  }
  if (sharedCoreDrive) {
    durabilityInsightParts.push(
      `Both of you anchor around living with integrity and shared purpose.`
    );
  }

  // 4. Participant Behavioral Summaries (derived from ruleMatcher + relationshipEngine)
  const ownerImpulse =
    ownerRules.nakshatraTraits.moon?.coreImpulse.replace(/\.$/, "").toLowerCase() ??
    "fast instinctual momentum";
  const ownerBlindSpot =
    ownerRules.nakshatraTraits.moon?.blindSpot.replace(/\.$/, "").toLowerCase() ??
    "moving fast before reading the full room";
  const partnerImpulse =
    partnerRules.nakshatraTraits.moon?.coreImpulse.replace(/\.$/, "").toLowerCase() ??
    "steady, deliberate follow-through";
  const partnerBlindSpot =
    partnerRules.nakshatraTraits.moon?.blindSpot.replace(/\.$/, "").toLowerCase() ??
    "locking into tunnel vision under pressure";

  const ownerSummary = `${humanizeArmor(ownerRel.freeLayerSignals.outerArmorTag)} · ${ownerImpulse} · ${humanizeInnerHeart(ownerRel.freeLayerSignals.innerHeartTag)}. Watch-out: ${ownerBlindSpot}.`;
  const partnerSummary = `${humanizeArmor(partnerRel.freeLayerSignals.outerArmorTag)} · ${partnerImpulse} · ${humanizeInnerHeart(partnerRel.freeLayerSignals.innerHeartTag)}. Watch-out: ${partnerBlindSpot}.`;

  const driveHeatActive =
    ownerRules.relationship.driveHeatFlagActive ||
    partnerRules.relationship.driveHeatFlagActive;

  const sharedAnchorParts: string[] = [];
  if (sharedCoreDrive) {
    sharedAnchorParts.push("Shared anchor: values-driven integrity and purposeful follow-through");
  } else {
    sharedAnchorParts.push("Shared anchor: complementary drives that expand each other’s perspective");
  }
  if (nadiPts === 8) sharedAnchorParts.push("balanced nervous-system pacing (8/8)");
  sharedAnchorParts.push(
    driveHeatActive
      ? "high-drive heat channelled best through fair conflict agreements"
      : "calm baseline conflict dynamics"
  );
  const sharedAnchor = `${sharedAnchorParts.join(", ")}.`;

  // 5. Friction Guardrail & Speakable 10-Second Repair
  const lowestDims = [...dimensions].sort(
    (a, b) => a.earned / a.max - b.earned / b.max
  );
  const primaryEdge = lowestDims[0];
  const secondaryEdge = lowestDims[1];

  let frictionTitle = "Where You Click vs. Where Pacing Differs";
  let growthEdgeNote = cleanRuleText(
    COMPATIBILITY.dosha_and_friction_guardrails.avoid_superficial_rejection
  );
  let tenSecondRepair = `When pacing feels mismatched, pause and say: “I’m on your team—do you want quick solutions right now, or just room to breathe first?”`;

  if (ganaPts === 0) {
    frictionTitle = "Two Self-Sufficient Armors, Two Different Speeds";
    growthEdgeNote = `Lower scores in ${primaryEdge.label} (${primaryEdge.earned}/${primaryEdge.max}) and ${secondaryEdge.label} (${secondaryEdge.earned}/${secondaryEdge.max}) don’t predict failure—they show ${ownerName} pushes to clear the air fast while ${partnerName} watches quietly for steady follow-through.`;
    tenSecondRepair = `When tension hits and both of you go quiet, ${ownerName} says: “I don’t need to solve this in five minutes—just tell me you’re still in my corner and when we’ll talk.”`;
  } else if (driveHeatActive) {
    frictionTitle = "High-Drive Directness Under Pressure";
    growthEdgeNote = cleanRuleText(
      COMPATIBILITY.dosha_and_friction_guardrails.kuja_or_mars_friction
    );
    tenSecondRepair = `Before debating a heated point, say: “Let’s take ten minutes with water first—I care more about getting this right together than winning the moment.”`;
  } else if (bhakootPts === 0) {
    frictionTitle = "Same Care, Different Weekend Pacing";
    growthEdgeNote = `A lower score in ${primaryEdge.label} (${primaryEdge.earned}/${primaryEdge.max}) highlights different emotional recharge rhythms—navigate it with explicit check-ins rather than guessing.`;
    tenSecondRepair = `When ${ownerName} wants an immediate plan and ${partnerName} wants breathing room, say: “Take the afternoon—just tell me when we’ll circle back.”`;
  }

  const payload: SynergyComparisonPayload = {
    engineVersion: SYNERGY_ENGINE_VERSION,
    relationshipContext: input.relationshipContext,
    precisionBadge: buildPrecisionMeta(effectiveAstroPrecision, anyMoonBoundary),
    participants: {
      ownerFirstName: ownerName,
      partnerFirstName: partnerName,
    },
    overallScore,
    rawPoints: {
      earned: earnedTotal,
      max: maxTotal,
    },
    headline,
    coreLenses: {
      attractionAndChemistry: {
        label: "Attraction & Chemistry",
        score: attractionScore,
        insight: attractionInsightParts.join(" "),
      },
      innerBondAndDurability: {
        label: "Inner Bond & Durability",
        score: durabilityScore,
        insight: durabilityInsightParts.join(" "),
      },
    },
    participantStyles: {
      ownerSummary,
      partnerSummary,
      sharedAnchor,
    },
    dimensions,
    frictionAndAgency: {
      title: frictionTitle,
      growthEdgeNote,
      driveHeatActive,
      tenSecondRepair,
    },
  };

  const violations = scanSynergyStringsForGuardrails(payload);
  if (violations.length > 0) {
    throw new Error(
      `Synergy guardrail violation detected: ${violations.join("; ")}`
    );
  }

  return payload;
}
