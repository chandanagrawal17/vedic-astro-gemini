/**
 * Deterministic Rule Matcher
 *
 * Pure, side-effect-free module that maps a cached `NormalizedChartJson` onto the six
 * distilled knowledge rulebooks in `src/lib/knowledge/` and returns a compact
 * `MatchedKnowledgeContext` (a.k.a. `matched_knowledge_context`) for the LLM payload.
 *
 * - Never makes network calls; safe to run on every synthesis.
 * - Honors `precisionMode`: Lagna-anchored lenses, houses, and Lagna Nakshatra are only
 *   emitted when `precisionMode === "exact"`. Otherwise houses are counted from the natal
 *   Moon sign (when the Moon sign is reliable) and the Chaldean numerology fallback is added.
 * - Strips `[cite: …]` markers and jargon-heavy source parentheticals from rule strings so the
 *   model receives clean behavioral guidance to paraphrase (never to copy verbatim).
 */

import ayurvedaRulebook from "@/lib/knowledge/ayurveda_and_resets.json";
import compatibilityRulebook from "@/lib/knowledge/compatibility_kutas.json";
import timingRulebook from "@/lib/knowledge/dasha_and_timing.json";
import housesRulebook from "@/lib/knowledge/houses_and_lords.json";
import nakshatraRulebook from "@/lib/knowledge/nakshatras_and_gunas.json";
import numerologyRulebook from "@/lib/knowledge/numerology_fallback.json";
import type {
  AstroPrecisionMode,
  NormalizedChartJson,
  PlanetPlacement,
} from "@/lib/astro/types";

export const RULE_MATCHER_VERSION = "v2_expanded_rulebooks";

/* -------------------------------------------------------------------------- */
/*                          Rulebook shape definitions                         */
/* -------------------------------------------------------------------------- */

interface HouseRule {
  theme: string;
  growth_focus: string;
}

interface PlanetInHouseRule {
  planet: string;
  house: number;
  pillar: string;
  trait: string;
  blind_spot: string;
  actionable_shift: string;
}

interface HousesRulebook {
  reference_lenses: Record<"lagna" | "chandra_lagna" | "ravi_lagna" | "arudha_lagna", string>;
  houses: Record<string, HouseRule>;
  planet_in_house_patterns: PlanetInHouseRule[];
}

interface GunaRule {
  label: string;
  description: string;
  rebalance_tip: string;
}

interface NakshatraRule {
  id: number;
  name: string;
  span: string;
  core_impulse: string;
  strength: string;
  blind_spot: string;
}

interface NakshatraRulebook {
  gunas: Record<GunaKey, GunaRule>;
  core_drives: Record<CoreDriveKey, string>;
  nakshatras: NakshatraRule[];
}

interface TransitMoonStateRule {
  bandwidth_range: [number, number];
  tone: string;
  text_or_wait: "GREEN" | "YELLOW" | "RED";
  guidance: string;
}

interface PeriodLordThemeRule {
  focus: string;
  pacing_risk: string;
  agency_lever: string;
}

interface TimingRulebook {
  transit_moon_house_states: Record<string, TransitMoonStateRule>;
  ashtakavarga_thresholds: {
    strong_transit_bindus_min: number;
    weak_transit_bindus_max: number;
    strong_house_sav_min: number;
    calendar_tags: { high_score: string; mid_score: string; low_score: string };
  };
  dasha_and_muhurtha_principles: {
    functional_dignity: string;
    electional_timing: string;
  };
  period_lord_themes: Record<string, PeriodLordThemeRule>;
}

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

interface AyurvedaRulebook {
  dosha_profiles: Record<
    DoshaKey,
    { elements: string; stress_signature: string; quick_micro_anchor?: string; daily_reset: string[] }
  >;
  somatic_90_second_reset: {
    step_1_body_anchor: string;
    step_2_breath_pause: string;
    step_3_witness_shift: string;
  };
}

interface NumerologyRulebook {
  chaldean_letter_map: Record<string, number>;
  single_digit_profiles: Record<string, { theme: string; growth_edge: string }>;
}

const HOUSES = housesRulebook as unknown as HousesRulebook;
const NAKSHATRAS = nakshatraRulebook as unknown as NakshatraRulebook;
const TIMING = timingRulebook as unknown as TimingRulebook;
const COMPATIBILITY = compatibilityRulebook as unknown as CompatibilityRulebook;
const AYURVEDA = ayurvedaRulebook as unknown as AyurvedaRulebook;
const NUMEROLOGY = numerologyRulebook as unknown as NumerologyRulebook;

/* -------------------------------------------------------------------------- */
/*                               Public types                                  */
/* -------------------------------------------------------------------------- */

export type GunaKey = "sattva" | "rajas" | "tamas";
export type CoreDriveKey = "dharma" | "artha" | "kama" | "moksha";
export type DoshaKey = "vata" | "pitta" | "kapha";
export type ElementKey = "fire" | "earth" | "air" | "water";
export type HouseFrame = "lagna" | "moon" | "none";

export interface MatchRulesOptions {
  /** Whole-sign house (1–12) the transiting Moon occupies today, counted from the natal reference. */
  transitMoonHouse?: number;
  /** Used server-side only for the Chaldean fallback digit; never echoed into the context. */
  fullName?: string;
  /** YYYY-MM-DD (or DD/MM/YYYY); used for the Chaldean fallback when no name is available. */
  dob?: string;
}

export interface ActiveHouseContext {
  house: number;
  theme: string;
  growthFocus: string;
  occupants: string[];
}

export interface PlanetPatternContext {
  planet: string;
  house: number;
  pillar: string;
  trait: string;
  blindSpot: string;
  actionableShift: string;
}

export interface GunaEmphasisContext {
  key: GunaKey;
  label: string;
  description: string;
  rebalanceTip: string;
}

export interface NakshatraTraitContext {
  id: number;
  name: string;
  coreImpulse: string;
  strength: string;
  blindSpot: string;
  gunaEmphasis: {
    primary: GunaEmphasisContext;
    secondary: GunaEmphasisContext;
  };
  coreDrive: {
    key: CoreDriveKey;
    description: string;
  };
}

export interface TransitMoonStateContext {
  house: number;
  bandwidthRange: [number, number];
  tone: string;
  textOrWait: "GREEN" | "YELLOW" | "RED";
  guidance: string;
}

export interface CurrentChapterDignityContext {
  periodLord: string;
  dateRange: string;
  housesRuled: number[];
  pacingSignal: "supportive" | "mixed" | "steadyPacing";
}

export interface CurrentChapterThemeContext {
  periodLord: string;
  dateRange: string;
  focus: string;
  pacingRisk: string;
  agencyLever: string;
  subPeriodFocus: string | null;
}

export interface MatchedKnowledgeContext {
  ruleMatcherVersion: string;
  precisionMode: AstroPrecisionMode;
  houseFrame: HouseFrame;
  referenceLenses: {
    selfLens?: string;
    publicImageLens?: string;
    emotionalLens: string;
    purposeLens: string;
  };
  activeHouses: ActiveHouseContext[];
  planetPatterns: PlanetPatternContext[];
  nakshatraTraits: {
    moon: NakshatraTraitContext | null;
    lagna: NakshatraTraitContext | null;
    moonSignUncertain: boolean;
  };
  timing: {
    principles: {
      functionalDignity: string;
      electionalTiming: string;
    };
    bandwidthThresholds: {
      strongTransitBindusMin: number;
      weakTransitBindusMax: number;
      strongHouseSavMin: number;
      calendarTags: { highScore: string; midScore: string; lowScore: string };
    };
    transitMoonState: TransitMoonStateContext | null;
    currentChapterDignity: CurrentChapterDignityContext | null;
    currentChapterTheme: CurrentChapterThemeContext | null;
  };
  relationship: {
    coreLenses: {
      attractionAndChemistry: string;
      innerBondAndDurability: string;
    };
    compatibilityDimensions: {
      sharedValues: string;
      mutualInfluence: string;
      dailyRhythm: string;
      physicalRapport: string;
      mentalFriendship: string;
      stressTemperament: string;
      domesticFlow: string;
      nervousSystemPacing: string;
    };
    frictionGuardrails: {
      driveHeatFriction: string;
      avoidSuperficialRejection: string;
    };
    driveHeatFlagActive: boolean;
  };
  wellness: {
    primaryDosha: DoshaKey | null;
    secondaryDosha: DoshaKey | null;
    elementSources: Array<{ source: "lagna" | "moon" | "sun"; sign: string; element: ElementKey }>;
    stressSignature: string | null;
    quickMicroAnchor: string | null;
    dailyReset: string[];
    somaticReset: {
      bodyAnchor: string;
      breathPause: string;
      witnessShift: string;
    };
  };
  numerologyFallback: {
    digit: number;
    source: "name" | "dob";
    theme: string;
    growthEdge: string;
  } | null;
}

/* -------------------------------------------------------------------------- */
/*                          Deterministic lookup tables                        */
/* -------------------------------------------------------------------------- */

/** Houses the knowledge base covers in depth. */
export const FOCUS_HOUSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/** Always surfaced so Hooks #1–#3 (self, love, career) have a house anchor even when empty. */
const ANCHOR_HOUSES = new Set([1, 7, 10]);

/** Classical Mars-friction houses (from the chosen reference point). */
const DRIVE_HEAT_HOUSES = new Set([1, 4, 7, 8, 12]);

const SIGN_NAMES = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
] as const;

const SANSKRIT_SIGN_NAMES = [
  "mesha", "vrishabha", "mithuna", "karka", "simha", "kanya",
  "tula", "vrishchika", "dhanu", "makara", "kumbha", "meena",
] as const;

const SIGN_ELEMENTS: ElementKey[] = [
  "fire", "earth", "air", "water",
  "fire", "earth", "air", "water",
  "fire", "earth", "air", "water",
];

/** Element → Dosha emphasis (Air/Ether → vata, Fire → pitta, Earth/Water → kapha). */
const ELEMENT_TO_DOSHA: Record<ElementKey, DoshaKey> = {
  fire: "pitta",
  air: "vata",
  earth: "kapha",
  water: "kapha",
};

/** Sign (1–12) → classical ruler. */
const SIGN_RULERS = [
  "mars", "venus", "mercury", "moon", "sun", "mercury",
  "venus", "mars", "jupiter", "saturn", "saturn", "jupiter",
] as const;

const TRIKONA = new Set([1, 5, 9]);
const KENDRA = new Set([1, 4, 7, 10]);
const DUSTHANA = new Set([6, 8, 12]);

/** Purushartha zig-zag (D-A-K-M-M-K-A-D) across the 28-star sequence (Abhijit sits between #21 and #22). */
const CORE_DRIVE_CYCLE: CoreDriveKey[] = [
  "dharma", "artha", "kama", "moksha", "moksha", "kama", "artha", "dharma",
];

const GUNA_ORDER: GunaKey[] = ["rajas", "tamas", "sattva"];

/** Common spelling variants from different ephemeris providers. */
const NAKSHATRA_ALIASES: Record<string, string> = {
  arudra: "ardra",
  makha: "magha",
  pubba: "purva phalguni",
  purvaphalguni: "purva phalguni",
  uttaraphalguni: "uttara phalguni",
  pushyami: "pushya",
  pooya: "pushya",
  moola: "mula",
  satabhishak: "shatabhisha",
  shatabhishak: "shatabhisha",
  mrigshira: "mrigashira",
  mrigasira: "mrigashira",
  poorvabhadra: "purva bhadrapada",
  purvabhadra: "purva bhadrapada",
  uttarabhadra: "uttara bhadrapada",
  poorvashada: "purva ashadha",
  uttarashada: "uttara ashadha",
};

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                    */
/* -------------------------------------------------------------------------- */

const CITE_MARKER_REGEX = /\s*\[cite:[^\]]*\]/gi;
const JARGON_PARENTHETICAL_REGEX =
  /\s*\((?=[^)]*(?:\bhouse\b|\bD-\d+\b|venus|mars|saturn|jupiter|navamsha|upapada|darapada|lagna|dinacharya|ascendant))[^)]*\)/gi;

/** Removes citation markers and jargon-only source parentheticals from a rule string. */
export function cleanRuleText(text: string): string {
  return text
    .replace(CITE_MARKER_REGEX, "")
    .replace(JARGON_PARENTHETICAL_REGEX, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

function canonicalNakshatraKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/aa/g, "a")
    .replace(/oo/g, "u")
    .replace(/ee/g, "i")
    .replace(/tt/g, "t")
    .replace(/([tdbkgcp])h/g, "$1")
    .replace(/sh/g, "s")
    .replace(/w/g, "v");
}

const NAKSHATRA_INDEX: Array<{ key: string; rule: NakshatraRule }> = NAKSHATRAS.nakshatras.map(
  (rule) => ({ key: canonicalNakshatraKey(rule.name), rule })
);

export function findNakshatraRule(rawName: string | null | undefined): NakshatraRule | null {
  if (!rawName || !rawName.trim()) return null;
  const compact = rawName.toLowerCase().replace(/[^a-z]/g, "");
  const aliased = NAKSHATRA_ALIASES[compact] ?? rawName;
  const key = canonicalNakshatraKey(aliased);
  if (!key) return null;

  const exact = NAKSHATRA_INDEX.find((n) => n.key === key);
  if (exact) return exact.rule;

  if (key.length >= 5) {
    const prefix = NAKSHATRA_INDEX.find(
      (n) => n.key.startsWith(key) || key.startsWith(n.key)
    );
    if (prefix) return prefix.rule;
  }
  return null;
}

/** Returns the 1–12 sign number for a placement, preferring `rasiNo` and falling back to the sign name. */
export function signNumberOf(placement: PlanetPlacement | null | undefined): number | null {
  if (!placement) return null;
  if (Number.isInteger(placement.rasiNo) && placement.rasiNo >= 1 && placement.rasiNo <= 12) {
    return placement.rasiNo;
  }
  const z = placement.zodiac.trim().toLowerCase();
  const en = SIGN_NAMES.findIndex((s) => s === z);
  if (en >= 0) return en + 1;
  const sa = SANSKRIT_SIGN_NAMES.findIndex((s) => s === z);
  if (sa >= 0) return sa + 1;
  return null;
}

function houseFromReference(signNo: number, referenceSignNo: number): number {
  return ((signNo - referenceSignNo + 12) % 12) + 1;
}

function isAscendantPoint(p: PlanetPlacement): boolean {
  const n = p.name.trim().toLowerCase();
  return n === "ascendant" || n === "lagna" || p.code === "As";
}

function gunaContext(key: GunaKey): GunaEmphasisContext {
  const g = NAKSHATRAS.gunas[key];
  return {
    key,
    label: g.label,
    description: cleanRuleText(g.description),
    rebalanceTip: cleanRuleText(g.rebalance_tip),
  };
}

/**
 * Classical triple-guna sequence (primary by 9-star block, secondary by 3-star sub-block):
 * stars 1–9 lead with momentum, 10–18 with stillness, 19–27 with clarity.
 */
export function gunaEmphasisForNakshatra(id: number): { primary: GunaKey; secondary: GunaKey } {
  const idx = Math.min(Math.max(id, 1), 27) - 1;
  return {
    primary: GUNA_ORDER[Math.floor(idx / 9)],
    secondary: GUNA_ORDER[Math.floor((idx % 9) / 3)],
  };
}

export function coreDriveForNakshatra(id: number): CoreDriveKey {
  const clamped = Math.min(Math.max(id, 1), 27);
  // Positions 22–27 shift by one to account for Abhijit in the 28-star sequence.
  const position = clamped >= 22 ? clamped : clamped - 1;
  return CORE_DRIVE_CYCLE[position % CORE_DRIVE_CYCLE.length];
}

function buildNakshatraTrait(rawName: string | null | undefined): NakshatraTraitContext | null {
  const rule = findNakshatraRule(rawName);
  if (!rule) return null;
  const guna = gunaEmphasisForNakshatra(rule.id);
  const drive = coreDriveForNakshatra(rule.id);
  return {
    id: rule.id,
    name: rule.name,
    coreImpulse: cleanRuleText(rule.core_impulse),
    strength: cleanRuleText(rule.strength),
    blindSpot: cleanRuleText(rule.blind_spot),
    gunaEmphasis: {
      primary: gunaContext(guna.primary),
      secondary: gunaContext(guna.secondary),
    },
    coreDrive: {
      key: drive,
      description: cleanRuleText(NAKSHATRAS.core_drives[drive]),
    },
  };
}

function reduceToSingleDigit(n: number): number {
  let value = Math.abs(Math.trunc(n));
  while (value > 9) {
    value = String(value)
      .split("")
      .reduce((sum, d) => sum + Number(d), 0);
  }
  return value;
}

function parseDobParts(dob: string): { year: number; month: number; day: number } | null {
  const iso = dob.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
  const dmy = dob.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) return { year: Number(dmy[3]), month: Number(dmy[2]), day: Number(dmy[1]) };
  return null;
}

/**
 * Chaldean single digit (1–9).
 * - Name available → sum of Chaldean letter values (Cheiro's name number), reduced.
 * - Otherwise → full birth date digit sum, reduced.
 */
export function computeChaldeanDigit(options: {
  fullName?: string | null;
  dob?: string | null;
}): { digit: number; source: "name" | "dob" } | null {
  const letters = (options.fullName ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  if (letters.length > 0) {
    const total = letters
      .split("")
      .reduce((sum, ch) => sum + (NUMEROLOGY.chaldean_letter_map[ch] ?? 0), 0);
    const digit = reduceToSingleDigit(total);
    if (digit >= 1) return { digit, source: "name" };
  }

  const parts = options.dob ? parseDobParts(options.dob) : null;
  if (parts) {
    const digits = `${parts.year}${parts.month}${parts.day}`;
    const total = digits.split("").reduce((sum, d) => sum + Number(d), 0);
    const digit = reduceToSingleDigit(total);
    if (digit >= 1) return { digit, source: "dob" };
  }
  return null;
}

function computeCurrentChapterDignity(
  chart: NormalizedChartJson,
  ascSignNo: number
): CurrentChapterDignityContext | null {
  const era = chart.eras?.era3;
  if (!era?.planet) return null;
  const lord = era.planet.trim().toLowerCase();
  const housesRuled = SIGN_RULERS.map((ruler, i) =>
    ruler === lord ? houseFromReference(i + 1, ascSignNo) : null
  )
    .filter((h): h is number => h !== null)
    .sort((a, b) => a - b);

  // Nodal points rule no sign in this system → no functional-dignity verdict.
  if (housesRuled.length === 0) return null;

  const rulesTrikona = housesRuled.some((h) => TRIKONA.has(h));
  const rulesKendra = housesRuled.some((h) => KENDRA.has(h));
  const rulesDusthana = housesRuled.some((h) => DUSTHANA.has(h));

  let pacingSignal: CurrentChapterDignityContext["pacingSignal"];
  if (rulesTrikona || (rulesKendra && !rulesDusthana)) {
    pacingSignal = "supportive";
  } else if (rulesDusthana && !rulesKendra) {
    pacingSignal = "steadyPacing";
  } else {
    pacingSignal = "mixed";
  }

  return {
    periodLord: era.planet,
    dateRange: era.dateRange,
    housesRuled,
    pacingSignal,
  };
}

function findPeriodLordTheme(rawPlanet: string | undefined): PeriodLordThemeRule | null {
  if (!rawPlanet) return null;
  const target = rawPlanet.trim().toLowerCase();
  const entry = Object.entries(TIMING.period_lord_themes ?? {}).find(
    ([key]) => key.toLowerCase() === target
  );
  return entry ? entry[1] : null;
}

function computeCurrentChapterTheme(
  chart: NormalizedChartJson
): CurrentChapterThemeContext | null {
  const era = chart.eras?.era3;
  if (!era?.planet) return null;
  const mainTheme = findPeriodLordTheme(era.planet);
  if (!mainTheme) return null;
  const subTheme =
    era.subPlanet && era.subPlanet.toLowerCase() !== era.planet.toLowerCase()
      ? findPeriodLordTheme(era.subPlanet)
      : null;

  return {
    periodLord: era.planet,
    dateRange: era.dateRange,
    focus: cleanRuleText(mainTheme.focus),
    pacingRisk: cleanRuleText(mainTheme.pacing_risk),
    agencyLever: cleanRuleText(mainTheme.agency_lever),
    subPeriodFocus: subTheme ? cleanRuleText(subTheme.focus) : null,
  };
}

/* -------------------------------------------------------------------------- */
/*                                Main matcher                                 */
/* -------------------------------------------------------------------------- */

export function matchChartRules(
  normalizedChartJson: NormalizedChartJson,
  options: MatchRulesOptions = {}
): MatchedKnowledgeContext {
  const chart = normalizedChartJson;
  const precisionMode = chart.precisionMode;
  const isExact = precisionMode === "exact";

  const ascendant = isExact ? chart.corePlacements.ascendant : null;
  const moon = chart.corePlacements.moon;
  const sun = chart.corePlacements.sun;
  const ascSignNo = signNumberOf(ascendant);
  const moonSignNo = signNumberOf(moon);
  const sunSignNo = signNumberOf(sun);
  const moonSignUncertain = !isExact && chart.moonBoundaryFlag;

  // ---- 1. Reference lenses + house frame -----------------------------------
  const houseFrame: HouseFrame =
    isExact && ascSignNo !== null
      ? "lagna"
      : !moonSignUncertain && moonSignNo !== null
        ? "moon"
        : "none";
  const referenceSignNo = houseFrame === "lagna" ? ascSignNo : houseFrame === "moon" ? moonSignNo : null;

  const lenses = HOUSES.reference_lenses;
  const referenceLenses: MatchedKnowledgeContext["referenceLenses"] = {
    emotionalLens: cleanRuleText(lenses.chandra_lagna),
    purposeLens: cleanRuleText(lenses.ravi_lagna),
  };
  if (houseFrame === "lagna") {
    referenceLenses.selfLens = cleanRuleText(lenses.lagna);
    referenceLenses.publicImageLens = cleanRuleText(lenses.arudha_lagna);
  }

  const bodies = chart.corePlacements.planets.filter((p) => !isAscendantPoint(p));
  const placementsWithHouse = bodies
    .map((p) => {
      let house: number | null = null;
      if (houseFrame === "lagna") {
        const sNo = signNumberOf(p);
        house = p.house ?? (sNo !== null && ascSignNo !== null ? houseFromReference(sNo, ascSignNo) : null);
      } else if (houseFrame === "moon" && referenceSignNo !== null) {
        const sNo = signNumberOf(p);
        house = sNo !== null ? houseFromReference(sNo, referenceSignNo) : null;
      }
      return { name: p.name, house };
    })
    .filter((p): p is { name: string; house: number } => p.house !== null);

  const activeHouses: ActiveHouseContext[] =
    houseFrame === "none"
      ? []
      : FOCUS_HOUSES.flatMap((h) => {
          const occupants = placementsWithHouse.filter((p) => p.house === h).map((p) => p.name);
          if (occupants.length === 0 && !ANCHOR_HOUSES.has(h)) return [];
          const rule = HOUSES.houses[String(h)];
          if (!rule) return [];
          return [
            {
              house: h,
              theme: cleanRuleText(rule.theme),
              growthFocus: cleanRuleText(rule.growth_focus),
              occupants,
            },
          ];
        });

  const planetPatterns: PlanetPatternContext[] = HOUSES.planet_in_house_patterns
    .filter((pattern) =>
      placementsWithHouse.some(
        (p) => p.name.toLowerCase() === pattern.planet.toLowerCase() && p.house === pattern.house
      )
    )
    .map((pattern) => ({
      planet: pattern.planet,
      house: pattern.house,
      pillar: pattern.pillar,
      trait: cleanRuleText(pattern.trait),
      blindSpot: cleanRuleText(pattern.blind_spot),
      actionableShift: cleanRuleText(pattern.actionable_shift),
    }));

  // ---- 2. Nakshatra + guna ---------------------------------------------------
  const nakshatraTraits: MatchedKnowledgeContext["nakshatraTraits"] = {
    moon: buildNakshatraTrait(moon?.nakshatra),
    lagna: isExact ? buildNakshatraTrait(ascendant?.nakshatra) : null,
    moonSignUncertain,
  };

  // ---- 3. Timing & bandwidth ------------------------------------------------
  const thresholds = TIMING.ashtakavarga_thresholds;
  let transitMoonState: TransitMoonStateContext | null = null;
  if (
    typeof options.transitMoonHouse === "number" &&
    Number.isInteger(options.transitMoonHouse) &&
    options.transitMoonHouse >= 1 &&
    options.transitMoonHouse <= 12
  ) {
    const state = TIMING.transit_moon_house_states[String(options.transitMoonHouse)];
    if (state) {
      transitMoonState = {
        house: options.transitMoonHouse,
        bandwidthRange: [state.bandwidth_range[0], state.bandwidth_range[1]],
        tone: state.tone,
        textOrWait: state.text_or_wait,
        guidance: cleanRuleText(state.guidance),
      };
    }
  }

  const timing: MatchedKnowledgeContext["timing"] = {
    principles: {
      functionalDignity: cleanRuleText(TIMING.dasha_and_muhurtha_principles.functional_dignity),
      electionalTiming: cleanRuleText(TIMING.dasha_and_muhurtha_principles.electional_timing),
    },
    bandwidthThresholds: {
      strongTransitBindusMin: thresholds.strong_transit_bindus_min,
      weakTransitBindusMax: thresholds.weak_transit_bindus_max,
      strongHouseSavMin: thresholds.strong_house_sav_min,
      calendarTags: {
        highScore: thresholds.calendar_tags.high_score,
        midScore: thresholds.calendar_tags.mid_score,
        lowScore: thresholds.calendar_tags.low_score,
      },
    },
    transitMoonState,
    currentChapterDignity:
      houseFrame === "lagna" && ascSignNo !== null
        ? computeCurrentChapterDignity(chart, ascSignNo)
        : null,
    currentChapterTheme: computeCurrentChapterTheme(chart),
  };

  // ---- 4. Relationship guardrails + psychological dimensions ---------------
  const marsHouse = placementsWithHouse.find((p) => p.name.toLowerCase() === "mars")?.house ?? null;
  const kutas = COMPATIBILITY.kuta_psychological_translations;
  const relationship: MatchedKnowledgeContext["relationship"] = {
    coreLenses: {
      attractionAndChemistry: cleanRuleText(COMPATIBILITY.core_relationship_lenses.attraction_and_chemistry),
      innerBondAndDurability: cleanRuleText(COMPATIBILITY.core_relationship_lenses.inner_bond_and_durability),
    },
    compatibilityDimensions: {
      sharedValues: cleanRuleText(kutas.varna),
      mutualInfluence: cleanRuleText(kutas.vasya),
      dailyRhythm: cleanRuleText(kutas.tara),
      physicalRapport: cleanRuleText(kutas.yoni),
      mentalFriendship: cleanRuleText(kutas.graha_maitri),
      stressTemperament: cleanRuleText(kutas.gana),
      domesticFlow: cleanRuleText(kutas.bhakoot),
      nervousSystemPacing: cleanRuleText(kutas.nadi),
    },
    frictionGuardrails: {
      driveHeatFriction: cleanRuleText(COMPATIBILITY.dosha_and_friction_guardrails.kuja_or_mars_friction),
      avoidSuperficialRejection: cleanRuleText(
        COMPATIBILITY.dosha_and_friction_guardrails.avoid_superficial_rejection
      ),
    },
    driveHeatFlagActive: marsHouse !== null && DRIVE_HEAT_HOUSES.has(marsHouse),
  };

  // ---- 5. Ayurveda + 90s reset ----------------------------------------------
  const elementSources: MatchedKnowledgeContext["wellness"]["elementSources"] = [];
  const pushSource = (source: "lagna" | "moon" | "sun", signNo: number | null) => {
    if (signNo === null) return;
    elementSources.push({ source, sign: SIGN_NAMES[signNo - 1], element: SIGN_ELEMENTS[signNo - 1] });
  };
  if (isExact) pushSource("lagna", ascSignNo);
  if (!moonSignUncertain) pushSource("moon", moonSignNo);
  if (elementSources.length === 0) pushSource("sun", sunSignNo);

  const primarySource = elementSources[0] ?? null;
  const primaryDosha = primarySource ? ELEMENT_TO_DOSHA[primarySource.element] : null;
  const secondaryCandidate = elementSources[1] ? ELEMENT_TO_DOSHA[elementSources[1].element] : null;
  const secondaryDosha = secondaryCandidate && secondaryCandidate !== primaryDosha ? secondaryCandidate : null;
  const doshaProfile = primaryDosha ? AYURVEDA.dosha_profiles[primaryDosha] : null;
  const somatic = AYURVEDA.somatic_90_second_reset;

  const wellness: MatchedKnowledgeContext["wellness"] = {
    primaryDosha,
    secondaryDosha,
    elementSources,
    stressSignature: doshaProfile ? cleanRuleText(doshaProfile.stress_signature) : null,
    quickMicroAnchor: doshaProfile?.quick_micro_anchor
      ? cleanRuleText(doshaProfile.quick_micro_anchor)
      : null,
    dailyReset: doshaProfile ? doshaProfile.daily_reset.map(cleanRuleText) : [],
    somaticReset: {
      bodyAnchor: cleanRuleText(somatic.step_1_body_anchor),
      breathPause: cleanRuleText(somatic.step_2_breath_pause),
      witnessShift: cleanRuleText(somatic.step_3_witness_shift),
    },
  };

  // ---- 6. Missing birth-time numerology fallback ----------------------------
  let numerologyFallback: MatchedKnowledgeContext["numerologyFallback"] = null;
  if (!isExact) {
    const chaldean = computeChaldeanDigit({ fullName: options.fullName, dob: options.dob });
    const profile = chaldean ? NUMEROLOGY.single_digit_profiles[String(chaldean.digit)] : null;
    if (chaldean && profile) {
      numerologyFallback = {
        digit: chaldean.digit,
        source: chaldean.source,
        theme: cleanRuleText(profile.theme),
        growthEdge: cleanRuleText(profile.growth_edge),
      };
    }
  }

  return {
    ruleMatcherVersion: RULE_MATCHER_VERSION,
    precisionMode,
    houseFrame,
    referenceLenses,
    activeHouses,
    planetPatterns,
    nakshatraTraits,
    timing,
    relationship,
    wellness,
    numerologyFallback,
  };
}
