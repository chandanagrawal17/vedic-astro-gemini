/**
 * Deterministic Career & Business Alignment Engine
 *
 * Computes server-only `CareerTelemetry` from `NormalizedChartJson` + static Lahiri ephemeris:
 *   Layer 1: Natal Work Wiring, Duty vs. Purpose Gap, Perception Gap & Wealth Leaks
 *   Layer 2: Deterministic Independent 3-Path Scorer (70% Natal + 30% Next-12m Timing)
 *   Layer 3: Hidden Alternative Lanes Matcher (Paid Exclusive, filters out stated career_field)
 *   Layer 4: Forward 12-Month Tight Career Window Scanner (Paid Exclusive, 3 non-overlapping windows)
 *
 * CRITICAL: Never return `CareerTelemetry` to the browser.
 */

import {
  AstroPrecisionMode,
  NormalizedChartJson,
  PlanetPlacement,
} from "@/lib/astro/types";
import {
  formatTightMonthRange,
  getJupiterSignAt,
  getRahuSignAt,
  getSaturnSignAt,
  getSiderealSunSign,
  houseFromSign,
  MARS_RETROGRADE_WINDOWS,
  MARS_TRANSITS,
  parseIsoUtc,
  RASI_NAMES,
  RasiNumber,
  SATURN_TRANSITS,
  toRasiNumber,
} from "@/lib/astro/ephemeris/historicalTransits";
import type { CareerMode } from "@/lib/types/blueprint";

export type CanonicalCareerMode =
  | "employed"
  | "employed_hybrid"
  | "founder"
  | "freelance_hybrid"
  | "in_transition";

export function normalizeCareerMode(mode?: string | null): CanonicalCareerMode {
  switch ((mode ?? "").trim().toLowerCase()) {
    case "employed_hybrid":
      return "employed_hybrid";
    case "founder":
      return "founder";
    case "freelance":
    case "freelance_hybrid":
      return "freelance_hybrid";
    case "transition":
    case "in_transition":
      return "in_transition";
    case "employed":
    default:
      return "employed";
  }
}

export interface CareerUserContext {
  firstName: string;
  careerMode: CareerMode | CanonicalCareerMode | string;
  careerField: string;
}

export type ForwardCareerWindowType =
  | "momentum_ship_or_outreach"
  | "friction_stay_cool"
  | "chapter_shift_accountability"
  | "quiet_prep_protect_runway";

export interface ForwardCareerWindowTelemetry {
  id: string;
  year_label: string;
  month_range: string;
  window_type: ForwardCareerWindowType;
  focus_tags: string[];
  start_iso: string;
  end_iso: string;
}

export interface CareerTelemetry {
  precision_mode: AstroPrecisionMode;
  user_context: {
    first_name: string;
    career_mode: CanonicalCareerMode;
    career_field: string;
  };
  scores: {
    current_path_fit_score: number;
    day_job_score: number;
    going_solo_score: number;
    hybrid_side_build_score: number;
  };
  natal_work_profile: {
    sweet_spot_tags: string[];
    natural_strength_tags: string[];
    fulfillment_gap_tags: string[];
    perception_gap: {
      inner_reality_tags: string[];
      external_read_tags: string[];
      tactical_shift_tag: string;
    };
    field_audit_hints: {
      keep_tags: string[];
      missing_tags: string[];
      ideal_bridge_tag: string;
    };
    alternative_lanes: string[];
    wealth_pattern: {
      compounding_style_tags: string[];
      silent_income_leak_tags: string[];
    };
    energy_pacing_tags: string[];
  };
  forward_12m_timing: {
    macro_season_year_span: string;
    timing_year_label: string;
    macro_posture_tag: string;
    upcoming_windows: ForwardCareerWindowTelemetry[];
  };
}

interface NatalWorkSignals {
  anchorSign: RasiNumber;
  moonSign: RasiNumber;
  sunSign: RasiNumber | null;
  isExact: boolean;
  planetHouse: Map<string, number>;
  planetSign: Map<string, RasiNumber>;
  houseCounts: Map<number, number>;
  strong6th: boolean;
  strong7th: boolean;
  strong10th: boolean;
  strong3rd: boolean;
  strong4thOr9th: boolean;
  strong2ndOr11th: boolean;
  rahuIn1_10_11: boolean;
  saturnIn6_10_11: boolean;
  highFireStress: boolean;
  dutyPurposeMismatch: boolean;
}

function clampScore(value: number, isExact: boolean): number {
  const min = isExact ? 35 : 45;
  const max = isExact ? 96 : 88;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function uniqueStrings(items: string[], max = 4): string[] {
  const out: string[] = [];
  for (const item of items) {
    if (item && !out.includes(item)) out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

function extractNatalWorkSignals(chart: NormalizedChartJson): NatalWorkSignals {
  const isExact = chart.precisionMode === "exact";
  const planets = chart.corePlacements.planets ?? [];

  const lagnaSign = isExact
    ? toRasiNumber(
        chart.corePlacements.ascendant?.rasiNo,
        chart.corePlacements.ascendant?.zodiac
      )
    : null;
  const moonSign =
    toRasiNumber(
      chart.corePlacements.moon?.rasiNo,
      chart.corePlacements.moon?.zodiac
    ) ?? 1;
  const sunSign = toRasiNumber(
    chart.corePlacements.sun?.rasiNo,
    chart.corePlacements.sun?.zodiac
  );

  // Exact mode uses Lagna; approx_window / date_only strictly anchors to Chandra Lagna (Moon sign)
  const anchorSign = lagnaSign ?? moonSign;

  const planetHouse = new Map<string, number>();
  const planetSign = new Map<string, RasiNumber>();
  const houseCounts = new Map<number, number>();

  const register = (p: PlanetPlacement) => {
    const sign = toRasiNumber(p.rasiNo, p.zodiac);
    if (!sign) return;
    const key = p.name.toLowerCase();
    if (key === "ascendant" || key === "lagna") return;
    const h = houseFromSign(anchorSign, sign);
    planetSign.set(key, sign);
    planetHouse.set(key, h);
    houseCounts.set(h, (houseCounts.get(h) ?? 0) + 1);
  };

  for (const p of planets) register(p);
  if (chart.corePlacements.moon && !planetSign.has("moon")) {
    register(chart.corePlacements.moon);
  }
  if (chart.corePlacements.sun && !planetSign.has("sun")) {
    register(chart.corePlacements.sun);
  }

  const hOf = (name: string) => planetHouse.get(name) ?? -1;
  const sOf = (name: string) => planetSign.get(name) ?? null;

  const sixthCount = houseCounts.get(6) ?? 0;
  const strong6th =
    sixthCount >= 2 ||
    sOf("mercury") === 6 ||
    hOf("mars") === 6 ||
    hOf("sun") === 6 ||
    hOf("mercury") === 6;

  const strong7th =
    (houseCounts.get(7) ?? 0) >= 1 ||
    sOf("venus") === 7 ||
    sOf("venus") === 2 ||
    sOf("venus") === 12 ||
    hOf("venus") === 7;

  const strong10th =
    (houseCounts.get(10) ?? 0) >= 1 ||
    hOf("sun") === 10 ||
    hOf("saturn") === 10 ||
    hOf("mars") === 10;

  const strong3rd =
    (houseCounts.get(3) ?? 0) >= 1 ||
    hOf("jupiter") === 3 ||
    hOf("mars") === 3 ||
    hOf("mercury") === 3;

  const strong4thOr9th =
    (houseCounts.get(4) ?? 0) >= 1 ||
    (houseCounts.get(9) ?? 0) >= 1 ||
    hOf("jupiter") === 9 ||
    hOf("venus") === 4 ||
    hOf("moon") === 4 ||
    hOf("saturn") === 9;

  const strong2ndOr11th =
    (houseCounts.get(2) ?? 0) >= 1 || (houseCounts.get(11) ?? 0) >= 1;

  const rahuH = hOf("rahu");
  const rahuIn1_10_11 = rahuH === 1 || rahuH === 10 || rahuH === 11;

  const satH = hOf("saturn");
  const saturnIn6_10_11 = satH === 6 || satH === 10 || satH === 11;

  const highFireStress =
    [1, 5, 9].includes(moonSign) ||
    hOf("mars") === 1 ||
    hOf("mars") === 6 ||
    (hOf("sun") === hOf("mars") && hOf("sun") > 0);

  const dutyPurposeMismatch =
    (strong6th || strong10th) && (strong7th || strong4thOr9th || strong3rd);

  return {
    anchorSign,
    moonSign,
    sunSign,
    isExact,
    planetHouse,
    planetSign,
    houseCounts,
    strong6th,
    strong7th,
    strong10th,
    strong3rd,
    strong4thOr9th,
    strong2ndOr11th,
    rahuIn1_10_11,
    saturnIn6_10_11,
    highFireStress,
    dutyPurposeMismatch,
  };
}

interface AlternativeLaneCandidate {
  tag: string;
  score: number;
  excludeKeywords: string[];
}

function matchAlternativeLanes(
  signals: NatalWorkSignals,
  careerField: string
): string[] {
  const fieldLower = careerField.trim().toLowerCase();

  const candidates: AlternativeLaneCandidate[] = [
    {
      tag: "holistic_health_wellness_performance",
      score:
        (signals.strong6th ? 35 : 10) +
        (signals.strong4thOr9th ? 25 : 10) +
        (signals.highFireStress ? 15 : 5),
      excludeKeywords: ["health", "wellness", "medical", "doctor", "nurse", "nutrition", "fitness", "clinic"],
    },
    {
      tag: "strategy_consulting_turnarounds",
      score:
        (signals.strong6th ? 30 : 12) +
        (signals.strong10th || signals.rahuIn1_10_11 ? 25 : 10) +
        (signals.planetSign.has("mercury") || signals.planetSign.has("mars") ? 15 : 8),
      excludeKeywords: ["consult", "turnaround", "management consulting", "advisory"],
    },
    {
      tag: "partnerships_deals_consumer_brands",
      score:
        (signals.strong7th ? 40 : 12) +
        (signals.planetSign.get("venus") === 7 || signals.planetSign.get("venus") === 2 ? 20 : 8),
      excludeKeywords: ["brand", "retail", "consumer", "partnership", "sales", "luxury", "hospitality"],
    },
    {
      tag: "finance_audit_legal_risk",
      score:
        (signals.strong6th ? 25 : 10) +
        (signals.strong2ndOr11th ? 25 : 10) +
        (signals.planetSign.get("mercury") === 6 ? 18 : 8),
      excludeKeywords: ["finance", "bank", "audit", "legal", "law", "compliance", "accounting", "tax", "risk"],
    },
    {
      tag: "mentoring_teaching_media",
      score:
        (signals.strong3rd ? 32 : 12) +
        (signals.strong4thOr9th ? 22 : 10) +
        (signals.planetHouse.get("jupiter") === 3 || signals.planetHouse.get("jupiter") === 9 ? 16 : 6),
      excludeKeywords: ["teach", "educat", "coach", "mentor", "media", "journal", "publish", "podcast"],
    },
    {
      tag: "real_estate_architecture_spaces",
      score:
        (signals.strong4thOr9th ? 24 : 10) +
        (signals.strong10th ? 20 : 10) +
        (signals.planetHouse.get("saturn") === 4 || signals.planetHouse.get("saturn") === 10 ? 18 : 6),
      excludeKeywords: ["real estate", "architect", "construction", "interior", "property", "logistics"],
    },
  ];

  candidates.sort((a, b) => b.score - a.score);

  const filtered = candidates.filter((cand) => {
    if (!fieldLower) return true;
    return !cand.excludeKeywords.some((kw) => fieldLower.includes(kw));
  });

  const picked = filtered.slice(0, 5).map((c) => c.tag);
  if (picked.length >= 3) return picked;

  // Fallback so we always return at least 3 distinct lanes
  for (const cand of candidates) {
    if (!picked.includes(cand.tag)) picked.push(cand.tag);
    if (picked.length >= 3) break;
  }
  return picked;
}

/**
 * Layer 4 (Paid Exclusive): Scans [referenceDate, referenceDate + 12 months]
 * for 3 clean, non-overlapping 1-to-3-month career action windows.
 */
function scanForward12Months(
  signals: NatalWorkSignals,
  careerMode: CanonicalCareerMode,
  referenceDate: Date,
  activeDashaPlanet?: string
): {
  macroSeasonYearSpan: string;
  timingYearLabel: string;
  macroPostureTag: string;
  isRestructuringSeason: boolean;
  isExpansionSeason: boolean;
  windows: ForwardCareerWindowTelemetry[];
} {
  const start = new Date(referenceDate.getTime());
  const end = addDays(start, 365);

  const satNow = getSaturnSignAt(addDays(start, 30));
  const satMoonHouseNow = houseFromSign(signals.moonSign, satNow);
  const satAnchorHouseNow = houseFromSign(signals.anchorSign, satNow);
  const jupNow = getJupiterSignAt(addDays(start, 30));
  const jupHouseNow = houseFromSign(signals.anchorSign, jupNow);
  const rahuNow = getRahuSignAt(addDays(start, 60));
  const rahuHouseNow = houseFromSign(signals.anchorSign, rahuNow);

  const dashaLower = (activeDashaPlanet ?? "").trim().toLowerCase();
  const isBeneficDasha = ["jupiter", "venus", "mercury", "moon"].includes(dashaLower);
  const isRestructuringDasha = ["saturn", "rahu", "ketu"].includes(dashaLower);

  const isRestructuringSeason =
    satMoonHouseNow === 12 ||
    satMoonHouseNow === 8 ||
    satAnchorHouseNow === 12 ||
    satAnchorHouseNow === 8 ||
    rahuHouseNow === 10 ||
    rahuHouseNow === 12 ||
    (isRestructuringDasha && [1, 4, 8, 12].includes(satMoonHouseNow));

  const isExpansionSeason =
    !isRestructuringSeason &&
    (isBeneficDasha || [1, 3, 5, 7, 9, 10, 11].includes(jupHouseNow)) &&
    [3, 6, 10, 11].includes(satAnchorHouseNow);

  const macroPostureTag = isRestructuringSeason
    ? careerMode === "in_transition"
      ? "protect_runway_warm_outreach_no_panic_roles"
      : "quiet_workshop_protect_runway_no_impulsive_leaps"
    : isExpansionSeason
      ? "visible_expansion_negotiate_or_ship_boldly"
      : "steady_compounding_build_proof_before_scaling";

  interface RawWindow {
    start: Date;
    end: Date;
    priority: number;
    type: ForwardCareerWindowType;
    focusTags: string[];
  }

  const candidates: RawWindow[] = [];

  // 1. Major Saturn sign ingress inside next 12 months -> chapter_shift_accountability
  for (const seg of SATURN_TRANSITS) {
    const ingress = parseIsoUtc(seg.start);
    if (ingress >= start && ingress <= end && !seg.retro) {
      const wStart = ingress;
      const wEnd = addDays(ingress, 75);
      candidates.push({
        start: wStart,
        end: wEnd,
        priority: 95,
        type: "chapter_shift_accountability",
        focusTags:
          careerMode === "in_transition"
            ? [
                "serious_two_year_focus_chapter",
                "commit_to_high_leverage_track",
                "consistent_outreach_turns_into_authority",
              ]
            : [
                "serious_two_year_focus_chapter",
                "prune_distractions",
                "real_paying_users_turn_into_lasting_authority",
              ],
      });
    }
  }

  // 2. Mars friction / retrograde patience test inside next 12 months -> friction_stay_cool
  for (const mRx of MARS_RETROGRADE_WINDOWS) {
    const s = parseIsoUtc(mRx.start);
    const e = parseIsoUtc(mRx.end);
    if (e >= start && s <= end) {
      const wStart = s < start ? addDays(start, 35) : s;
      const wEnd = addDays(wStart, 72);
      candidates.push({
        start: wStart,
        end: wEnd,
        priority: 88,
        type: "friction_stay_cool",
        focusTags:
          careerMode === "in_transition"
            ? [
                "impatience_with_slow_recruiters_or_interviews",
                "do_not_settle_out_of_frustration",
                "channel_heat_into_portfolio_or_warm_intros",
              ]
            : [
                "impatience_with_slow_managers_or_politics",
                "document_agreements_in_writing",
                "channel_heat_into_own_build",
              ],
      });
    }
  }

  for (const seg of MARS_TRANSITS) {
    const s = parseIsoUtc(seg.start);
    const e = parseIsoUtc(seg.end);
    if (e < start || s > end) continue;
    const h = houseFromSign(signals.anchorSign, seg.sign);
    if ([1, 4, 6, 10].includes(h)) {
      const wStart = s < start ? start : s;
      const wEnd = addDays(wStart, Math.min(75, Math.max(35, Math.round((e.getTime() - wStart.getTime()) / 86_400_000))));
      candidates.push({
        start: wStart,
        end: wEnd,
        priority: h === 6 || h === 10 ? 84 : 80,
        type: "friction_stay_cool",
        focusTags:
          careerMode === "in_transition"
            ? [
                "impatience_with_slow_interviews",
                "protect_confidence_and_pacing",
                "avoid_taking_panic_offer",
              ]
            : [
                "impatience_with_slow_managers_or_politics",
                "document_agreements_in_writing",
                "channel_heat_into_own_build",
              ],
      });
    }
  }

  // 3. Momentum / shipping / outreach tailwind (Sun traversing 3rd/7th/9th/11th)
  for (let offsetDays = 10; offsetDays <= 310; offsetDays += 28) {
    const probe = addDays(start, offsetDays);
    const sunSign = getSiderealSunSign(probe);
    const sunH = houseFromSign(signals.anchorSign, sunSign);
    if ([3, 7, 9, 11].includes(sunH)) {
      candidates.push({
        start: probe,
        end: addDays(probe, 48),
        priority: sunH === 9 || sunH === 11 ? 90 : 85,
        type: "momentum_ship_or_outreach",
        focusTags:
          careerMode === "in_transition"
            ? [
                "clear_story_and_positioning",
                "warm_network_conversations_and_interviews",
                "pitch_lean_consulting_or_target_roles",
              ]
            : [
                "clear_writing_and_messaging",
                "ship_simple_v1_to_real_users",
                "warm_network_conversations",
              ],
      });
    } else if ([8, 12].includes(sunH)) {
      candidates.push({
        start: probe,
        end: addDays(probe, 45),
        priority: 76,
        type: "quiet_prep_protect_runway",
        focusTags: [
          "protect_cash_buffer_and_sleep",
          "refine_offer_behind_the_scenes",
          "avoid_noisy_commitments",
        ],
      });
    }
  }

  // Deduplicate: pick 3 clean, non-overlapping windows (>= 21 days gap) with distinct types
  candidates.sort((a, b) => b.priority - a.priority || a.start.getTime() - b.start.getTime());
  const selected: RawWindow[] = [];
  const usedTypes = new Set<ForwardCareerWindowType>();

  for (const cand of candidates) {
    if (usedTypes.has(cand.type) && selected.length < 3) continue;
    const tooClose = selected.some(
      (s) =>
        cand.start.getTime() <= addDays(s.end, 21).getTime() &&
        cand.end.getTime() >= addDays(s.start, -21).getTime()
    );
    if (tooClose) continue;
    selected.push(cand);
    usedTypes.add(cand.type);
    if (selected.length >= 3) break;
  }

  // Guarantee 3 clean windows even in edge cases
  const fallbackSpecs: Array<{ offset: number; dur: number; type: ForwardCareerWindowType; tags: string[] }> = [
    {
      offset: 20,
      dur: 45,
      type: "momentum_ship_or_outreach",
      tags: ["clear_writing_and_messaging", "ship_simple_v1_to_real_users", "warm_network_conversations"],
    },
    {
      offset: 115,
      dur: 55,
      type: "friction_stay_cool",
      tags: ["stay_calm_under_pressure", "document_agreements_in_writing", "protect_evening_recovery"],
    },
    {
      offset: 210,
      dur: 65,
      type: "chapter_shift_accountability",
      tags: ["prune_distractions", "focus_on_highest_leverage_bet", "steady_compounding_proof"],
    },
  ];

  for (const fb of fallbackSpecs) {
    if (selected.length >= 3) break;
    const s = addDays(start, fb.offset);
    const e = addDays(s, fb.dur);
    const tooClose = selected.some(
      (w) =>
        s.getTime() <= addDays(w.end, 21).getTime() &&
        e.getTime() >= addDays(w.start, -21).getTime()
    );
    if (!tooClose) {
      selected.push({ start: s, end: e, priority: 70, type: fb.type, focusTags: fb.tags });
    }
  }

  selected.sort((a, b) => a.start.getTime() - b.start.getTime());

  const windows: ForwardCareerWindowTelemetry[] = selected.map((w, idx) => ({
    id: `cw_${String(idx + 1).padStart(2, "0")}`,
    year_label: String(w.end.getUTCFullYear()),
    month_range: formatTightMonthRange(w.start, w.end),
    window_type: w.type,
    focus_tags: w.focusTags,
    start_iso: w.start.toISOString().slice(0, 10),
    end_iso: w.end.toISOString().slice(0, 10),
  }));

  const startY = start.getUTCFullYear();
  const endY = end.getUTCFullYear();
  const macroSeasonYearSpan =
    startY === endY ? `Now – Late ${endY}` : `Now – Mid-${endY}`;
  const timingYearLabel =
    startY === endY ? `${endY}` : `${endY}`;

  return {
    macroSeasonYearSpan,
    timingYearLabel,
    macroPostureTag,
    isRestructuringSeason,
    isExpansionSeason,
    windows,
  };
}

/**
 * Main entry point: deterministically computes Career telemetry (< 5ms, $0 API calls).
 */
export function computeCareerTelemetry(
  normalizedChart: NormalizedChartJson,
  userContext: CareerUserContext,
  precisionMode: AstroPrecisionMode = normalizedChart.precisionMode,
  referenceDate: Date = new Date()
): CareerTelemetry {
  const effectiveChart: NormalizedChartJson = {
    ...normalizedChart,
    precisionMode,
  };
  const canonicalMode = normalizeCareerMode(userContext.careerMode);
  const careerField = userContext.careerField.trim();
  const signals = extractNatalWorkSignals(effectiveChart);
  const forward = scanForward12Months(
    signals,
    canonicalMode,
    referenceDate,
    effectiveChart.eras?.era3?.planet
  );

  // -------------------------------------------------------------------------
  // Layer 2: Deterministic 3-Path Independent Scoring (70% Natal + 30% Timing)
  // -------------------------------------------------------------------------
  let dayJobRaw = 62;
  if (signals.strong6th) dayJobRaw += 12;
  if (signals.saturnIn6_10_11) dayJobRaw += 8;
  if (signals.rahuIn1_10_11 || (signals.strong7th && signals.strong3rd)) {
    dayJobRaw -= 10;
  }
  if (signals.dutyPurposeMismatch) dayJobRaw -= 6;
  if (forward.isExpansionSeason) dayJobRaw += 6;
  if (forward.isRestructuringSeason) dayJobRaw -= 4;

  let goingSoloRaw = 58;
  if (signals.strong7th) goingSoloRaw += 14;
  if (signals.strong3rd || signals.planetHouse.get("mars") === 1) goingSoloRaw += 10;
  if (signals.rahuIn1_10_11) goingSoloRaw += 8;
  if (signals.strong6th && !signals.strong7th) goingSoloRaw -= 8;
  if (forward.isExpansionSeason) goingSoloRaw += 10;
  if (forward.isRestructuringSeason) goingSoloRaw -= 10;

  let hybridRaw = 68;
  if ((signals.strong6th || signals.strong10th) && (signals.strong7th || signals.strong3rd || signals.rahuIn1_10_11)) {
    hybridRaw += 12;
  }
  if (signals.strong6th && (signals.strong4thOr9th || signals.strong7th)) {
    hybridRaw += 7;
  }
  if (signals.highFireStress) hybridRaw -= 5;
  if (forward.isRestructuringSeason) hybridRaw += 9;
  else if (forward.isExpansionSeason) hybridRaw += 4;

  const day_job_score = clampScore(dayJobRaw, signals.isExact);
  const going_solo_score = clampScore(goingSoloRaw, signals.isExact);
  const hybrid_side_build_score = clampScore(hybridRaw, signals.isExact);

  // Mode-specific current_path_fit_score (shown on Free Proof Screen 2)
  let currentPathRaw: number;
  switch (canonicalMode) {
    case "employed":
      currentPathRaw = day_job_score + (careerField ? 2 : 0);
      break;
    case "employed_hybrid":
      currentPathRaw = 0.72 * day_job_score + 0.28 * hybrid_side_build_score - 5;
      break;
    case "founder":
      currentPathRaw = going_solo_score;
      break;
    case "freelance_hybrid":
      currentPathRaw = hybrid_side_build_score;
      break;
    case "in_transition":
      // Evaluates alignment of their previous stated track so they understand why it felt outgrown
      currentPathRaw = Math.round(0.75 * day_job_score + 0.25 * going_solo_score);
      break;
  }
  const current_path_fit_score = clampScore(currentPathRaw, signals.isExact);

  // -------------------------------------------------------------------------
  // Layer 1: Natal Work Wiring, Fulfillment Gap, Perception Gap & Wealth Leaks
  // -------------------------------------------------------------------------
  const sweetSpot: string[] = [];
  const naturalStrengths: string[] = [];
  if (signals.strong6th) {
    sweetSpot.push("diagnostic_problem_solver", "systems_builder");
    naturalStrengths.push(
      "spots_hidden_flaws_fast",
      "calm_under_high_stakes",
      "turns_chaos_into_clean_systems"
    );
  }
  if (signals.strong7th || signals.strong3rd) {
    sweetSpot.push("independent_people_focused_builder");
    naturalStrengths.push("translates_complex_ideas_clearly");
  }
  if (signals.strong10th) {
    sweetSpot.push("structured_leader", "long_term_institution_builder");
    naturalStrengths.push("reliable_under_visible_responsibility");
  }
  if (sweetSpot.length === 0) {
    sweetSpot.push("adaptable_strategist", "steady_problem_solver");
  }
  if (naturalStrengths.length === 0) {
    naturalStrengths.push("quiet_reliability", "clear_pattern_recognition");
  }

  const fulfillmentGap: string[] = [];
  if (signals.dutyPurposeMismatch) {
    fulfillmentGap.push(
      "competence_trap_high_stamina_underfed_purpose",
      "craves_human_impact_and_ownership"
    );
  } else if (signals.rahuIn1_10_11) {
    fulfillmentGap.push(
      "restless_under_rigid_hierarchies",
      "hungry_for_unconventional_scale"
    );
  } else {
    fulfillmentGap.push(
      "needs_clear_autonomy_and_meaningful_craft",
      "drained_by_repetitive_busywork"
    );
  }

  const innerReality = signals.strong7th || signals.strong4thOr9th
    ? ["wants_autonomy_and_meaningful_impact", "thinks_like_builder_architect"]
    : ["wants_clean_ownership_without_micromanagement", "values_mastery_and_clarity"];

  const externalRead = signals.strong6th
    ? ["indispensable_crisis_fixer", "intense_and_impatient_with_red_tape"]
    : signals.strong10th
      ? ["composed_dependable_operator", "hard_to_read_when_frustrated"]
      : ["capable_self_starter", "quietly_absorbs_extra_load"];

  const tacticalShift =
    canonicalMode === "in_transition"
      ? "lead_with_visible_outcomes_and_warm_intros_not_just_resume_tasks"
      : signals.strong6th
        ? "stop_volunteering_for_invisible_cleanup_own_visible_outcomes"
        : "voice_your_direction_early_before_others_define_your_lane";

  const keepTags = signals.strong6th
    ? ["clean_systems_thinking", "complex_problem_solving", "structured_execution"]
    : ["strategic_judgment", "dependable_delivery", "clear_communication"];

  const missingTags = signals.strong7th || signals.strong4thOr9th
    ? ["direct_human_connection", "shaping_user_experience", "guiding_people_with_wisdom"]
    : ["creative_ownership", "equity_or_direct_upside", "room_to_build_your_own_way"];

  const idealBridgeTag = careerField
    ? "bridge_existing_craft_with_direct_human_impact_or_advisory"
    : "bridge_practical_execution_with_independent_ownership";

  const alternative_lanes = matchAlternativeLanes(signals, careerField);

  const compoundingStyle = signals.strong7th
    ? ["durable_reputation", "repeatable_products_or_ip", "partnerships_and_advisory"]
    : ["durable_reputation", "steady_equity_accumulation", "repeatable_systems"];

  const silentLeak = signals.strong6th
    ? ["over_polishing_before_charging", "staying_too_long_in_underleveraged_role"]
    : ["underpricing_own_expertise", "waiting_for_perfect_permission_before_pitching"];

  const energyPacing = signals.highFireStress
    ? ["fast_intense_mind", "sprint_then_burnout_risk", "needs_hard_evening_shutdown"]
    : ["steady_deep_focus", "absorbs_others_stress_silently", "needs_clear_weekly_recovery_block"];

  return {
    precision_mode: precisionMode,
    user_context: {
      first_name: userContext.firstName,
      career_mode: canonicalMode,
      career_field: careerField,
    },
    scores: {
      current_path_fit_score,
      day_job_score,
      going_solo_score,
      hybrid_side_build_score,
    },
    natal_work_profile: {
      sweet_spot_tags: uniqueStrings(sweetSpot, 3),
      natural_strength_tags: uniqueStrings(naturalStrengths, 3),
      fulfillment_gap_tags: uniqueStrings(fulfillmentGap, 3),
      perception_gap: {
        inner_reality_tags: innerReality,
        external_read_tags: externalRead,
        tactical_shift_tag: tacticalShift,
      },
      field_audit_hints: {
        keep_tags: keepTags,
        missing_tags: missingTags,
        ideal_bridge_tag: idealBridgeTag,
      },
      alternative_lanes,
      wealth_pattern: {
        compounding_style_tags: compoundingStyle,
        silent_income_leak_tags: silentLeak,
      },
      energy_pacing_tags: energyPacing,
    },
    forward_12m_timing: {
      macro_season_year_span: forward.macroSeasonYearSpan,
      timing_year_label: forward.timingYearLabel,
      macro_posture_tag: forward.macroPostureTag,
      upcoming_windows: forward.windows,
    },
  };
}
