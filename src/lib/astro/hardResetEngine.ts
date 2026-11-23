/**
 * Deterministic 4-Layer "Hard Reset" Precision Engine
 *
 * Computes server-only `HardResetTelemetry` from `NormalizedChartJson` + static Lahiri ephemeris:
 *   Layer 1: Macro Pressure Containers (yearly ranges — powers Free Proof Screen 1)
 *   Layer 2: Natal House & Planet Targeting (Saturn's 1/3/7/10 aspects)
 *   Layer 3: Nodal (Rahu/Ketu) Overlays on Natal Axis & Planets
 *   Layer 4: Tight 1-to-3-Month Flashpoints (Mars/Sun/Rx/Jupiter triggers — Paid Exclusive)
 *
 * CRITICAL: Never return `HardResetTelemetry` to the browser.
 */

import {
  AstroPrecisionMode,
  NormalizedChartJson,
  PlanetPlacement,
} from "@/lib/astro/types";
import {
  formatTightMonthRange,
  getJupiterSignAt,
  getKetuSignAt,
  getRahuSignAt,
  getSaturnAspectSigns,
  getSaturnSignAt,
  getSunIntervalInYear,
  houseFromSign,
  isRetrogradeAt,
  MARS_RETROGRADE_WINDOWS,
  MARS_TRANSITS,
  offsetSign,
  parseIsoUtc,
  RAHU_TRANSITS,
  RASI_NAMES,
  RasiNumber,
  SATURN_RETROGRADE_WINDOWS,
  SATURN_TRANSITS,
  toRasiNumber,
} from "@/lib/astro/ephemeris/historicalTransits";

export interface HardResetUserContext {
  firstName: string;
  dobIso?: string | null;
  relationshipStatus: string;
  careerMode: string;
  careerField: string;
}

export interface HardResetFlashpointTelemetry {
  id: string;
  year_label: string;
  month_range: string;
  intensity_score: number;
  domain_tags: string[];
  trigger_summary_internal: string;
  start_iso: string;
  end_iso: string;
}

export interface HardResetChapterTelemetry {
  chapter_id: string;
  priority_rank: number;
  year_range: string;
  macro_theme_tags: string[];
  somatic_stress_tags: string[];
  flashpoints: HardResetFlashpointTelemetry[];
}

export interface HardResetUpcomingPrepTelemetry {
  year_label: string;
  month_range: string;
  domain_tags: string[];
  trigger_summary_internal: string;
}

export interface HardResetTelemetry {
  precision_mode: AstroPrecisionMode;
  anchor_mode: "lagna_and_lunar" | "lunar_natal_planets";
  user_context: {
    first_name: string;
    age_now: number | null;
    relationship_status: string;
    career_mode: string;
    career_field: string;
  };
  selected_chapters: HardResetChapterTelemetry[];
  total_flashpoints_detected: number;
  locked_chapters_span: string;
  upcoming_prep_window: HardResetUpcomingPrepTelemetry;
}

interface NatalSignIndex {
  anchorSign: RasiNumber;
  lagnaSign: RasiNumber | null;
  moonSign: RasiNumber;
  sunSign: RasiNumber | null;
  venusSign: RasiNumber | null;
  marsSign: RasiNumber | null;
  mercurySign: RasiNumber | null;
  jupiterSign: RasiNumber | null;
  saturnSign: RasiNumber | null;
  rahuSign: RasiNumber | null;
  ketuSign: RasiNumber | null;
  isExact: boolean;
  planetsBySign: Map<RasiNumber, string[]>;
}

interface RawFlashpointCandidate {
  start: Date;
  end: Date;
  intensity: number;
  domainTags: string[];
  somaticTags: string[];
  triggerSummary: string;
}

function findPlanetSign(
  planets: PlanetPlacement[],
  codes: string[],
  names: string[]
): RasiNumber | null {
  const found = planets.find(
    (p) =>
      codes.includes(p.code.toLowerCase()) ||
      names.includes(p.name.toLowerCase())
  );
  if (!found) return null;
  return toRasiNumber(found.rasiNo, found.zodiac);
}

function buildNatalSignIndex(chart: NormalizedChartJson): NatalSignIndex {
  const isExact = chart.precisionMode === "exact";
  const planets = chart.corePlacements.planets ?? [];

  const lagnaSign = isExact
    ? toRasiNumber(
        chart.corePlacements.ascendant?.rasiNo,
        chart.corePlacements.ascendant?.zodiac
      ) ?? findPlanetSign(planets, ["as", "asc"], ["ascendant", "lagna"])
    : null;

  const moonSign =
    toRasiNumber(
      chart.corePlacements.moon?.rasiNo,
      chart.corePlacements.moon?.zodiac
    ) ??
    findPlanetSign(planets, ["mo"], ["moon"]) ??
    1;

  const sunSign =
    toRasiNumber(
      chart.corePlacements.sun?.rasiNo,
      chart.corePlacements.sun?.zodiac
    ) ?? findPlanetSign(planets, ["su"], ["sun"]);

  const venusSign = findPlanetSign(planets, ["ve"], ["venus"]);
  const marsSign = findPlanetSign(planets, ["ma"], ["mars"]);
  const mercurySign = findPlanetSign(planets, ["me"], ["mercury"]);
  const jupiterSign = findPlanetSign(planets, ["ju"], ["jupiter"]);
  const saturnSign = findPlanetSign(planets, ["sa"], ["saturn"]);
  const rahuSign = findPlanetSign(planets, ["ra"], ["rahu"]);
  const ketuSign = findPlanetSign(planets, ["ke"], ["ketu"]);

  const anchorSign = lagnaSign ?? moonSign;

  const planetsBySign = new Map<RasiNumber, string[]>();
  const add = (sign: RasiNumber | null, label: string) => {
    if (!sign) return;
    const list = planetsBySign.get(sign) ?? [];
    if (!list.includes(label)) list.push(label);
    planetsBySign.set(sign, list);
  };
  add(moonSign, "Moon");
  add(sunSign, "Sun");
  add(venusSign, "Venus");
  add(marsSign, "Mars");
  add(mercurySign, "Mercury");
  add(jupiterSign, "Jupiter");
  add(saturnSign, "Saturn");

  return {
    anchorSign,
    lagnaSign,
    moonSign,
    sunSign,
    venusSign,
    marsSign,
    mercurySign,
    jupiterSign,
    saturnSign,
    rahuSign,
    ketuSign,
    isExact,
    planetsBySign,
  };
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function clampDate(date: Date, min: Date, max: Date): Date {
  if (date.getTime() < min.getTime()) return new Date(min.getTime());
  if (date.getTime() > max.getTime()) return new Date(max.getTime());
  return new Date(date.getTime());
}

function clampFlashpointDuration(start: Date, end: Date): { start: Date; end: Date } {
  const days = (end.getTime() - start.getTime()) / 86_400_000;
  if (days < 21) {
    return { start, end: addDays(start, 28) };
  }
  if (days > 92) {
    return { start, end: addDays(start, 84) };
  }
  return { start, end };
}

function uniqueStrings(items: string[], max = 4): string[] {
  const out: string[] = [];
  for (const item of items) {
    if (item && !out.includes(item)) out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

function computeAge(dobIso: string | null | undefined, refDate: Date): number | null {
  if (!dobIso) return null;
  const parsed = new Date(dobIso);
  if (Number.isNaN(parsed.getTime())) return null;
  let age = refDate.getUTCFullYear() - parsed.getUTCFullYear();
  const m = refDate.getUTCMonth() - parsed.getUTCMonth();
  if (m < 0 || (m === 0 && refDate.getUTCDate() < parsed.getUTCDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function mapHouseAndPlanetsToTags(
  house: number,
  trigger: "saturn" | "rahu" | "ketu" | "mars" | "mars_saturn" | "sun_node" | "jup_rahu",
  natal: NatalSignIndex,
  sign: RasiNumber
): { domainTags: string[]; somaticTags: string[] } {
  const domain: string[] = [];
  const somatic: string[] = [];
  const natalPlanetsHere = natal.planetsBySign.get(sign) ?? [];
  const hitsVenus = natalPlanetsHere.includes("Venus");
  const hitsMoon = natalPlanetsHere.includes("Moon");
  const hasSixthCluster =
    house === 6 &&
    natalPlanetsHere.filter((p) => ["Sun", "Mars", "Mercury"].includes(p)).length >= 2;

  if (house === 1 || hitsMoon) {
    if (trigger === "rahu" || trigger === "jup_rahu") {
      domain.push("identity_restlessness", "unconventional_ambition_surge");
      somatic.push("racing_mind", "sprint_and_crash_fatigue");
    } else if (trigger === "mars") {
      domain.push("identity_restlessness", "short_fuse", "autopilot_rejection");
      somatic.push("racing_mind", "impatience_spikes");
    } else {
      domain.push("identity_overhaul", "foundation_stress_test");
      somatic.push("mental_burnout", "late_night_overthinking");
    }
  }

  if (house === 7 || hitsVenus) {
    if (trigger === "ketu" || trigger === "sun_node" || trigger === "mars") {
      domain.push("relationship_truth_serum", "emotional_detachment_or_boundary");
      somatic.push("emotional_tension");
    } else {
      domain.push("work_vs_partner_squeeze", "relationship_maturity_test");
      somatic.push("mental_burnout");
    }
  }

  if (house === 12) {
    domain.push("uprooting_or_relocation", "private_loneliness", "broken_sleep");
    somatic.push("broken_sleep", "late_night_overthinking");
  }

  if (house === 8) {
    if (trigger === "mars_saturn") {
      domain.push("stalled_plan_bottleneck", "paperwork_or_cash_pinch", "feeling_boxed_in");
      somatic.push("broken_sleep", "gut_and_nervous_heat");
    } else {
      domain.push("financial_rethink", "pull_toward_deep_answers");
      somatic.push("late_night_overthinking");
    }
  }

  if (house === 6 || hasSixthCluster) {
    domain.push("peak_daily_grind", "authority_or_peer_friction");
    somatic.push("gut_and_nervous_heat", "sprint_and_crash_fatigue");
  }

  if (house === 10) {
    domain.push("sudden_heavy_workload", "underleveraged_career_grind");
    somatic.push("mental_burnout", "late_night_overthinking");
  }

  if (house === 4) {
    domain.push("home_base_unrest", "housing_or_family_worry");
    somatic.push("broken_sleep");
  }

  if (house === 2) {
    domain.push("financial_rethink", "family_obligation_squeeze");
    somatic.push("late_night_overthinking");
  }

  if (house === 5 || house === 11) {
    domain.push("outgrowing_old_circle", "early_goal_reset");
    somatic.push("impatience_spikes");
  }

  if (domain.length === 0) {
    domain.push("structural_pivot", "priority_recalibration");
  }
  if (somatic.length === 0) {
    somatic.push("mental_burnout", "broken_sleep");
  }

  return {
    domainTags: uniqueStrings(domain, 3),
    somaticTags: uniqueStrings(somatic, 3),
  };
}

interface MacroContainer {
  startYear: number;
  endYear: number;
  startDate: Date;
  endDate: Date;
  score: number;
  kind: "saturn" | "nodal";
  macroTags: string[];
  somaticTags: string[];
  sourceLabel: string;
}

function buildMacroContainers(
  natal: NatalSignIndex,
  scanStart: Date,
  scanEnd: Date,
  dashaTransitionYears: number[]
): MacroContainer[] {
  const containers: MacroContainer[] = [];

  // 1A. Saturn pressure cycles (Moon: 12/1/2/4/8; Lagna if exact: 1/4/7/8/10/12)
  const saturnBySign = new Map<RasiNumber, { start: Date; end: Date }>();
  for (const seg of SATURN_TRANSITS) {
    const s = parseIsoUtc(seg.start);
    const e = parseIsoUtc(seg.end);
    if (e <= scanStart || s >= scanEnd) continue;
    const clampedS = clampDate(s, scanStart, scanEnd);
    const clampedE = clampDate(e, scanStart, scanEnd);
    if ((clampedE.getTime() - clampedS.getTime()) / 86_400_000 < 90) continue;

    const existing = saturnBySign.get(seg.sign);
    if (!existing) {
      saturnBySign.set(seg.sign, { start: clampedS, end: clampedE });
    } else {
      saturnBySign.set(seg.sign, {
        start: existing.start < clampedS ? existing.start : clampedS,
        end: existing.end > clampedE ? existing.end : clampedE,
      });
    }
  }

  for (const [sign, span] of saturnBySign.entries()) {
    const moonHouse = houseFromSign(natal.moonSign, sign);
    const lagnaHouse = natal.lagnaSign ? houseFromSign(natal.lagnaSign, sign) : null;
    const isMoonPressure = [12, 1, 2, 4, 8].includes(moonHouse);
    const isLagnaPressure = lagnaHouse !== null && [1, 4, 7, 8, 10, 12].includes(lagnaHouse);

    if (!isMoonPressure && !isLagnaPressure) continue;

    // Layer 2: Saturn's 4 targets (occupied + 3rd + 7th + 10th)
    const aspectSigns = getSaturnAspectSigns(sign);
    const tags: string[] = [];
    const somatic: string[] = [];
    let score = 70;

    if (moonHouse === 8 || lagnaHouse === 8) {
      score += 18;
      tags.push("stalled_plan_bottleneck", "uprooting_or_relocation");
      somatic.push("broken_sleep", "gut_and_nervous_heat");
    } else if ([12, 1, 2].includes(moonHouse)) {
      score += 16;
      tags.push("identity_overhaul", "uprooting_or_relocation");
      somatic.push("broken_sleep", "late_night_overthinking");
    } else if (lagnaHouse === 10 || moonHouse === 10) {
      score += 15;
      tags.push("heavy_career_load", "underleveraged_career_grind");
      somatic.push("mental_burnout", "late_night_overthinking");
    } else if (moonHouse === 4 || lagnaHouse === 4) {
      score += 14;
      tags.push("home_base_unrest", "foundation_stress_test");
      somatic.push("broken_sleep", "mental_burnout");
    }

    for (const target of aspectSigns) {
      const targetHouse = houseFromSign(natal.anchorSign, target);
      if (targetHouse === 4) tags.push("home_base_unrest");
      if (natal.venusSign && target === natal.venusSign) {
        score += 8;
        tags.push("work_vs_partner_squeeze");
      }
      if (natal.sunSign && target === natal.sunSign) {
        score += 5;
        tags.push("authority_or_peer_friction");
      }
    }

    const sYear = span.start.getUTCFullYear();
    const rawEndYear = span.end.getUTCFullYear();
    const eYear =
      rawEndYear - sYear >= 3
        ? sYear + 2
        : span.end.getUTCMonth() <= 1 && rawEndYear > sYear
          ? rawEndYear - 1
          : rawEndYear;

    containers.push({
      startYear: sYear,
      endYear: Math.max(sYear, eYear),
      startDate: span.start,
      endDate: new Date(Date.UTC(Math.max(sYear, eYear), 11, 31)),
      score,
      kind: "saturn",
      macroTags: uniqueStrings(tags, 3),
      somaticTags: uniqueStrings(somatic, 3),
      sourceLabel: `Saturn in ${RASI_NAMES[sign]}`,
    });
  }

  // 1B. Layer 3: High-intensity Nodal (Rahu/Ketu) 18-month axis overlays
  for (const seg of RAHU_TRANSITS) {
    const s = parseIsoUtc(seg.start);
    const e = parseIsoUtc(seg.end);
    if (e <= scanStart || s >= scanEnd) continue;
    const clampedS = clampDate(s, scanStart, scanEnd);
    const clampedE = clampDate(e, scanStart, scanEnd);
    if ((clampedE.getTime() - clampedS.getTime()) / 86_400_000 < 120) continue;

    const rahuSign = seg.sign;
    const ketuSign = offsetSign(rahuSign, 6);
    const rahuHouse = houseFromSign(natal.anchorSign, rahuSign);
    const ketuHouse = houseFromSign(natal.anchorSign, ketuSign);

    const hitsMoonOrLagna =
      rahuSign === natal.moonSign ||
      ketuSign === natal.moonSign ||
      rahuHouse === 1 ||
      ketuHouse === 1;
    const hitsVenusOr7 =
      (natal.venusSign !== null &&
        (rahuSign === natal.venusSign || ketuSign === natal.venusSign)) ||
      rahuHouse === 7 ||
      ketuHouse === 7;
    const hits612 = rahuHouse === 6 || ketuHouse === 6 || rahuHouse === 12 || ketuHouse === 12;
    const hits28 = rahuHouse === 2 || ketuHouse === 2 || rahuHouse === 8 || ketuHouse === 8;

    if (!hitsMoonOrLagna && !hitsVenusOr7 && !hits612 && !hits28) continue;

    let score = 68;
    const tags: string[] = [];
    const somatic: string[] = [];

    if (hitsMoonOrLagna) {
      score += 24;
      tags.push("identity_overhaul", "independent_ambition");
      somatic.push("racing_mind", "impatience_spikes", "sprint_and_crash_fatigue");
    }
    if (hitsVenusOr7) {
      score += 14;
      tags.push("relationship_honesty_test");
      somatic.push("impatience_spikes");
    }
    if (hits612) {
      score += 10;
      tags.push("uprooting_or_relocation", "peak_daily_grind");
      somatic.push("broken_sleep", "gut_and_nervous_heat");
    }
    if (hits28) {
      score += 8;
      tags.push("financial_rethink", "pull_toward_deep_answers");
      somatic.push("late_night_overthinking");
    }

    const sYear =
      clampedS.getUTCMonth() >= 9 && clampedE.getUTCFullYear() > clampedS.getUTCFullYear()
        ? clampedS.getUTCFullYear() + 1
        : clampedS.getUTCFullYear();
    const eYear =
      clampedE.getUTCMonth() === 0 && clampedE.getUTCFullYear() > sYear
        ? clampedE.getUTCFullYear() - 1
        : clampedE.getUTCFullYear();

    containers.push({
      startYear: sYear,
      endYear: Math.max(sYear, eYear),
      startDate: clampedS,
      endDate: clampedE,
      score,
      kind: "nodal",
      macroTags: uniqueStrings(tags, 3),
      somaticTags: uniqueStrings(somatic, 3),
      sourceLabel: `Rahu ${RASI_NAMES[rahuSign]} / Ketu ${RASI_NAMES[ketuSign]}`,
    });
  }

  // Prefer completed historical chapters over still-unfolding current year,
  // and boost chapters aligned with major Dasha/Antardasha cliffs.
  const refYear = scanEnd.getUTCFullYear();
  for (const c of containers) {
    if (
      dashaTransitionYears.some(
        (yr) => yr >= c.startYear && yr <= c.endYear
      )
    ) {
      c.score += 6;
    }
    if (c.endYear >= refYear) {
      c.score -= 18;
    } else if (c.endYear >= refYear - 4) {
      c.score += 14;
    } else if (c.endYear >= refYear - 7) {
      c.score += 8;
    }
  }

  // Sort by highest priority score first so primary chapters claim their exact years cleanly
  containers.sort((a, b) => b.score - a.score || b.endYear - a.endYear);
  const merged: MacroContainer[] = [];

  for (const c of containers) {
    const overlap = merged.find(
      (m) => c.startYear <= m.endYear && c.endYear >= m.startYear
    );
    if (overlap) {
      // Only merge Saturn + Nodal when they cover almost the exact same span (never merge two different nodal signs)
      const sameSpan =
        c.kind !== overlap.kind &&
        Math.abs(c.startYear - overlap.startYear) <= 1 &&
        Math.abs(c.endYear - overlap.endYear) <= 1 &&
        Math.max(c.endYear, overlap.endYear) - Math.min(c.startYear, overlap.startYear) <= 2;

      if (sameSpan) {
        overlap.score = Math.max(overlap.score, c.score) + 6;
        overlap.macroTags = uniqueStrings([...overlap.macroTags, ...c.macroTags], 3);
        overlap.somaticTags = uniqueStrings([...overlap.somaticTags, ...c.somaticTags], 3);
        continue;
      }

      // Trim single-edge year overlap (e.g. Saturn 2020–2022 trimmed cleanly to 2020–2021 beside Nodal 2022–2023)
      if (c.endYear === overlap.startYear && c.startYear < overlap.startYear) {
        c.endYear = overlap.startYear - 1;
        c.endDate = new Date(Date.UTC(c.endYear, 11, 31));
      } else if (c.startYear === overlap.endYear && c.endYear > overlap.endYear) {
        c.startYear = overlap.endYear + 1;
        c.startDate = new Date(Date.UTC(c.startYear, 0, 1));
      } else {
        continue;
      }
    }
    merged.push(c);
  }

  merged.sort((a, b) => b.score - a.score || b.endYear - a.endYear);
  return merged.slice(0, 3);
}

function extractChapterFlashpoints(
  chapter: MacroContainer,
  natal: NatalSignIndex,
  scanEnd: Date
): HardResetFlashpointTelemetry[] {
  const winStart = new Date(Date.UTC(chapter.startYear, 0, 1));
  const winEnd = clampDate(
    new Date(Date.UTC(chapter.endYear, 11, 31)),
    winStart,
    scanEnd
  );
  const candidates: RawFlashpointCandidate[] = [];

  // 4A. Mars + Saturn Retrograde Lock
  for (const marsRx of MARS_RETROGRADE_WINDOWS) {
    const ms = parseIsoUtc(marsRx.start);
    const me = parseIsoUtc(marsRx.end);
    if (me < winStart || ms > winEnd) continue;

    for (const satRx of SATURN_RETROGRADE_WINDOWS) {
      const ss = parseIsoUtc(satRx.start);
      const se = parseIsoUtc(satRx.end);
      const overlapStart = ms > ss ? ms : ss;
      const overlapEnd = me < se ? me : se;
      if ((overlapEnd.getTime() - overlapStart.getTime()) / 86_400_000 < 21) continue;

      const satAspects = getSaturnAspectSigns(satRx.sign);
      if (marsRx.sign === satRx.sign || satAspects.includes(marsRx.sign)) {
        const house = houseFromSign(natal.anchorSign, marsRx.sign);
        const mapped = mapHouseAndPlanetsToTags(house, "mars_saturn", natal, marsRx.sign);
        candidates.push({
          start: clampDate(overlapStart, winStart, winEnd),
          end: clampDate(overlapEnd, winStart, winEnd),
          intensity: 96,
          domainTags: mapped.domainTags,
          somaticTags: mapped.somaticTags,
          triggerSummary: `Saturn Rx + Mars Rx locked in ${RASI_NAMES[marsRx.sign]} (${house}th)`,
        });
      }
    }
  }

  // 4B. Fast Mars triggers
  for (const seg of MARS_TRANSITS) {
    const s = parseIsoUtc(seg.start);
    const e = parseIsoUtc(seg.end);
    if (e < winStart || s > winEnd) continue;

    const mid = new Date(
      (Math.max(s.getTime(), winStart.getTime()) + Math.min(e.getTime(), winEnd.getTime())) / 2
    );
    const satSign = getSaturnSignAt(mid);
    const rahuSign = getRahuSignAt(mid);
    const ketuSign = getKetuSignAt(mid);
    const jupSign = getJupiterSignAt(mid);
    const house = houseFromSign(natal.anchorSign, seg.sign);
    const natalHere = natal.planetsBySign.get(seg.sign) ?? [];
    const marsRxActive = isRetrogradeAt(MARS_RETROGRADE_WINDOWS, mid);

    const joinsRahu = seg.sign === rahuSign;
    const joinsKetu = seg.sign === ketuSign;
    const joinsSaturn = seg.sign === satSign;
    const aspectedBySaturn = getSaturnAspectSigns(satSign).includes(seg.sign);
    const hitsKeyNatal =
      seg.sign === natal.moonSign ||
      (natal.venusSign !== null && seg.sign === natal.venusSign) ||
      natalHere.length >= 2;

    let intensity = 0;
    let triggerType: "mars" | "mars_saturn" | "jup_rahu" = "mars";
    let summary = "";

    if (joinsRahu && (hitsKeyNatal || [1, 4, 6, 7, 8, 10, 12].includes(house))) {
      intensity = 93;
      summary = `Mars + Rahu in ${RASI_NAMES[seg.sign]} (${house}th)`;
    } else if (joinsKetu && (hitsKeyNatal || [1, 7, 8, 12].includes(house))) {
      intensity = 91;
      summary = `Mars + Ketu in ${RASI_NAMES[seg.sign]} (${house}th)`;
    } else if (joinsSaturn && [1, 4, 6, 7, 8, 10, 12].includes(house)) {
      intensity = 90 + (jupSign === satSign ? 2 : 0);
      triggerType = "mars_saturn";
      summary = `Mars + Saturn in ${RASI_NAMES[seg.sign]} (${house}th)`;
    } else if (marsRxActive && [1, 6, 8, 10, 12].includes(house)) {
      intensity = 89;
      summary = `Mars Rx in ${RASI_NAMES[seg.sign]} (${house}th)`;
    } else if (
      seg.sign === 4 &&
      house === 4 &&
      jupSign === rahuSign &&
      (rahuSign === natal.moonSign || rahuSign === natal.anchorSign)
    ) {
      intensity = 88;
      triggerType = "jup_rahu";
      summary = `Jupiter + Rahu over ${RASI_NAMES[rahuSign]} while Mars in 4th`;
    } else if (aspectedBySaturn && hitsKeyNatal) {
      intensity = 87;
      summary = `Mars over natal ${natalHere.join("/")} aspected by Saturn`;
    } else if (hitsKeyNatal && [1, 6, 7, 8, 10, 12].includes(house)) {
      intensity = 82;
      summary = `Mars triggering ${RASI_NAMES[seg.sign]} (${house}th)`;
    }

    if (intensity >= 82) {
      const clamped = clampFlashpointDuration(
        clampDate(s, winStart, winEnd),
        clampDate(e, winStart, winEnd)
      );
      const mapped = mapHouseAndPlanetsToTags(house, triggerType, natal, seg.sign);
      if (triggerType === "jup_rahu") {
        mapped.domainTags = uniqueStrings(
          ["unconventional_ambition_surge", "home_base_unrest", ...mapped.domainTags],
          3
        );
      }
      candidates.push({
        start: clamped.start,
        end: clamped.end,
        intensity,
        domainTags: mapped.domainTags,
        somaticTags: mapped.somaticTags,
        triggerSummary: summary,
      });
    }
  }

  // 4C. Sun Spotlight on Nodal Pressure Points
  for (let year = chapter.startYear; year <= chapter.endYear; year++) {
    const midYear = new Date(Date.UTC(year, 6, 1));
    const rahuSign = getRahuSignAt(midYear);
    const ketuSign = getKetuSignAt(midYear);
    const targets: Array<{ sign: RasiNumber; label: string }> = [
      { sign: ketuSign, label: "Ketu" },
      { sign: rahuSign, label: "Rahu" },
    ];

    for (const t of targets) {
      const sunWin = getSunIntervalInYear(year, t.sign);
      if (sunWin.end < winStart || sunWin.start > winEnd) continue;
      const midSun = new Date((sunWin.start.getTime() + sunWin.end.getTime()) / 2);
      if (
        (t.label === "Ketu" && getKetuSignAt(midSun) !== t.sign) ||
        (t.label === "Rahu" && getRahuSignAt(midSun) !== t.sign)
      ) {
        continue;
      }

      const house = houseFromSign(natal.anchorSign, t.sign);
      const hitsVenus = natal.venusSign === t.sign;
      const hitsMoon = natal.moonSign === t.sign;
      if (!hitsVenus && !hitsMoon && ![1, 7, 8, 10, 12].includes(house)) continue;

      const intensity = hitsVenus ? 95 : hitsMoon ? 92 : 84;
      const mapped = mapHouseAndPlanetsToTags(house, "sun_node", natal, t.sign);
      candidates.push({
        start: clampDate(sunWin.start, winStart, winEnd),
        end: clampDate(sunWin.end, winStart, winEnd),
        intensity,
        domainTags: mapped.domainTags,
        somaticTags: mapped.somaticTags,
        triggerSummary: `Sun + ${t.label} eclipse corridor in ${RASI_NAMES[t.sign]} (${house}th)`,
      });
    }
  }

  candidates.sort((a, b) => b.intensity - a.intensity || a.start.getTime() - b.start.getTime());

  const chosen: RawFlashpointCandidate[] = [];
  const usedPrimaryDomains = new Set<string>();

  for (const cand of candidates) {
    const overlaps = chosen.some(
      (c) =>
        cand.start.getTime() <= addDays(c.end, 30).getTime() &&
        cand.end.getTime() >= addDays(c.start, -30).getTime()
    );
    if (overlaps) continue;

    const primary = cand.domainTags[0];
    if (usedPrimaryDomains.has(primary)) {
      const altIdx = cand.domainTags.findIndex((tag) => !usedPrimaryDomains.has(tag));
      if (altIdx > 0) {
        const reordered = [...cand.domainTags];
        const [picked] = reordered.splice(altIdx, 1);
        reordered.unshift(picked);
        cand.domainTags = reordered;
      } else if (chosen.length >= 2) {
        continue;
      }
    }

    usedPrimaryDomains.add(cand.domainTags[0]);
    chosen.push(cand);
    if (chosen.length >= 4) break;
  }

  if (chosen.length < 2) {
    const fallbackPoints = [
      {
        start: new Date(Date.UTC(chapter.startYear, 3, 15)),
        end: new Date(Date.UTC(chapter.startYear, 5, 25)),
        domainTags: chapter.macroTags.slice(0, 2).length
          ? chapter.macroTags.slice(0, 2)
          : ["structural_pivot", "priority_recalibration"],
        summary: `${chapter.sourceLabel} opening compression`,
      },
      {
        start: new Date(Date.UTC(chapter.endYear, 8, 15)),
        end: new Date(Date.UTC(chapter.endYear, 10, 20)),
        domainTags: ["chapter_closeout", "foundation_stress_test"],
        summary: `${chapter.sourceLabel} closing audit`,
      },
    ];
    for (const fb of fallbackPoints) {
      if (chosen.length >= 2) break;
      const s = clampDate(fb.start, winStart, winEnd);
      const e = clampDate(fb.end, s, winEnd);
      const overlaps = chosen.some(
        (c) =>
          s.getTime() <= addDays(c.end, 25).getTime() &&
          e.getTime() >= addDays(c.start, -25).getTime()
      );
      if (!overlaps) {
        chosen.push({
          start: s,
          end: clampFlashpointDuration(s, e).end,
          intensity: 80,
          domainTags: fb.domainTags,
          somaticTags: chapter.somaticTags,
          triggerSummary: fb.summary,
        });
      }
    }
  }

  chosen.sort((a, b) => a.start.getTime() - b.start.getTime());

  const yearCounter = new Map<number, number>();
  return chosen.map((c) => {
    const y = c.start.getUTCFullYear();
    const count = (yearCounter.get(y) ?? 0) + 1;
    yearCounter.set(y, count);
    return {
      id: `fp_${y}_${String(count).padStart(2, "0")}`,
      year_label: String(y),
      month_range: formatTightMonthRange(c.start, c.end),
      intensity_score: c.intensity,
      domain_tags: c.domainTags,
      trigger_summary_internal: c.triggerSummary,
      start_iso: c.start.toISOString().slice(0, 10),
      end_iso: c.end.toISOString().slice(0, 10),
    };
  });
}

function findUpcomingPrepWindow(
  natal: NatalSignIndex,
  referenceDate: Date
): HardResetUpcomingPrepTelemetry {
  const startSearch = addDays(referenceDate, 30);
  const endSearch = addDays(referenceDate, 730);

  for (const seg of SATURN_TRANSITS) {
    const ingress = parseIsoUtc(seg.start);
    if (ingress < startSearch || ingress > endSearch || seg.retro) continue;
    const moonH = houseFromSign(natal.moonSign, seg.sign);
    const anchorH = houseFromSign(natal.anchorSign, seg.sign);
    if ([1, 4, 7, 8, 10, 12].includes(moonH) || [1, 4, 8, 10, 12].includes(anchorH)) {
      const winEnd = addDays(ingress, 75);
      return {
        year_label: String(ingress.getUTCFullYear()),
        month_range: formatTightMonthRange(ingress, winEnd),
        domain_tags: [
          "accountability_audit",
          "foundation_stress_test",
          "cash_and_health_discipline",
        ],
        trigger_summary_internal: `Saturn entering ${RASI_NAMES[seg.sign]} (${anchorH}th/${moonH}th from Moon)`,
      };
    }
  }

  for (const mRx of MARS_RETROGRADE_WINDOWS) {
    const s = parseIsoUtc(mRx.start);
    const e = parseIsoUtc(mRx.end);
    if (s >= startSearch && s <= endSearch) {
      const house = houseFromSign(natal.anchorSign, mRx.sign);
      return {
        year_label: String(s.getUTCFullYear()),
        month_range: formatTightMonthRange(s, e),
        domain_tags: [
          "patience_and_pacing_test",
          "avoid_impulsive_decisions",
          "energy_and_runway_discipline",
        ],
        trigger_summary_internal: `Mars Rx in ${RASI_NAMES[mRx.sign]} (${house}th)`,
      };
    }
  }

  const fbStart = addDays(referenceDate, 180);
  const fbEnd = addDays(fbStart, 65);
  return {
    year_label: String(fbStart.getUTCFullYear()),
    month_range: formatTightMonthRange(fbStart, fbEnd),
    domain_tags: [
      "accountability_audit",
      "foundation_stress_test",
      "cash_and_health_discipline",
    ],
    trigger_summary_internal: "Forward structural checkpoint",
  };
}

export function computeHardResetTelemetry(
  normalizedChart: NormalizedChartJson,
  userContext: HardResetUserContext,
  precisionMode: AstroPrecisionMode = normalizedChart.precisionMode,
  referenceDate: Date = new Date()
): HardResetTelemetry {
  const effectiveChart: NormalizedChartJson = {
    ...normalizedChart,
    precisionMode,
  };
  const natal = buildNatalSignIndex(effectiveChart);
  const ageNow = computeAge(userContext.dobIso, referenceDate);

  let scanYearsBack = 12;
  if (ageNow !== null && ageNow >= 21 && ageNow - 18 < 12) {
    scanYearsBack = Math.max(4, ageNow - 18);
  }
  const scanStart = new Date(
    Date.UTC(referenceDate.getUTCFullYear() - scanYearsBack, 0, 1)
  );
  const scanEnd = new Date(referenceDate.getTime());

  const dashaTransitionYears = [
    normalizedChart.eras?.era1?.startIso,
    normalizedChart.eras?.era2?.startIso,
    normalizedChart.eras?.era3?.startIso,
  ]
    .map((iso) => (iso ? new Date(iso).getUTCFullYear() : Number.NaN))
    .filter((yr) => Number.isFinite(yr));

  let containers = buildMacroContainers(
    natal,
    scanStart,
    scanEnd,
    dashaTransitionYears
  );

  if (containers.length < 2) {
    const refY = referenceDate.getUTCFullYear();
    const fallbacks: MacroContainer[] = [
      {
        startYear: refY - 4,
        endYear: refY - 3,
        startDate: new Date(Date.UTC(refY - 4, 0, 1)),
        endDate: new Date(Date.UTC(refY - 3, 11, 31)),
        score: 75,
        kind: "saturn",
        macroTags: ["identity_overhaul", "priority_recalibration"],
        somaticTags: ["racing_mind", "broken_sleep"],
        sourceLabel: "Recent structural pressure cycle",
      },
      {
        startYear: refY - 7,
        endYear: refY - 6,
        startDate: new Date(Date.UTC(refY - 7, 0, 1)),
        endDate: new Date(Date.UTC(refY - 6, 11, 31)),
        score: 70,
        kind: "saturn",
        macroTags: ["heavy_career_load", "home_base_unrest"],
        somaticTags: ["mental_burnout", "late_night_overthinking"],
        sourceLabel: "Prior foundation audit cycle",
      },
    ];
    for (const fb of fallbacks) {
      if (containers.length >= 2) break;
      const overlaps = containers.some(
        (c) => fb.startYear <= c.endYear && fb.endYear >= c.startYear
      );
      if (!overlaps) containers.push(fb);
    }
    containers = containers.slice(0, 3);
  }

  const selected_chapters: HardResetChapterTelemetry[] = containers.map(
    (c, idx) => {
      const yearRange =
        c.startYear === c.endYear
          ? `${c.startYear}`
          : `${c.startYear} – ${c.endYear}`;
      const flashpoints = extractChapterFlashpoints(c, natal, scanEnd);
      return {
        chapter_id: `ch_${c.startYear}_${c.endYear}`,
        priority_rank: idx + 1,
        year_range: yearRange,
        macro_theme_tags: c.macroTags,
        somatic_stress_tags: c.somaticTags,
        flashpoints,
      };
    }
  );

  const total_flashpoints_detected = selected_chapters.reduce(
    (sum, ch) => sum + ch.flashpoints.length,
    0
  );

  const allYears = containers.flatMap((c) => [c.startYear, c.endYear]);
  const minYear = Math.min(...allYears);
  const maxYear = Math.max(...allYears);
  const locked_chapters_span =
    minYear === maxYear ? `${minYear}` : `${minYear} – ${maxYear}`;

  const upcoming_prep_window = findUpcomingPrepWindow(natal, referenceDate);

  return {
    precision_mode: precisionMode,
    anchor_mode: natal.isExact ? "lagna_and_lunar" : "lunar_natal_planets",
    user_context: {
      first_name: userContext.firstName,
      age_now: ageNow,
      relationship_status: userContext.relationshipStatus,
      career_mode: userContext.careerMode,
      career_field: userContext.careerField,
    },
    selected_chapters,
    total_flashpoints_detected,
    locked_chapters_span,
    upcoming_prep_window,
  };
}
