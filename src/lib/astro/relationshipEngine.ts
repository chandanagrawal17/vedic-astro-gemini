/**
 * Deterministic Relationship Mirror Engine
 *
 * Computes server-only `RelationshipTelemetry` from `NormalizedChartJson` + static Lahiri ephemeris:
 *   Layer 1: Contradiction Headline, Everyday/Texting Tell & Somatic Body Tell (Free Proof)
 *   Layer 2: Past 5–7 Year Love Shift Scanner — yearly range only (Free Proof + 1-Tap Accuracy)
 *   Layer 3: Spark vs. Peace & Status-Specific Blind-Spot / Playbook Signals (Half-Teased Free -> Paid)
 *   Layer 4: Forward 12-Month Tight 1-to-3-Month Relationship Windows (Paid Exclusive)
 *
 * CRITICAL: Never return `RelationshipTelemetry` to the browser.
 * Always use strict camelCase property names across all types and outputs.
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
  getMarsSignAt,
  getRahuSignAt,
  getSaturnAspectSigns,
  getSaturnSignAt,
  getSiderealSunSign,
  houseFromSign,
  isRetrogradeAt,
  JUPITER_TRANSITS,
  MARS_RETROGRADE_WINDOWS,
  offsetSign,
  parseIsoUtc,
  RAHU_TRANSITS,
  RasiNumber,
  SATURN_TRANSITS,
  toRasiNumber,
} from "@/lib/astro/ephemeris/historicalTransits";
import type {
  CanonicalRelationshipStatus,
  RelationshipStatus,
} from "@/lib/types/blueprint";

export function normalizeRelationshipStatus(
  status?: string | null
): CanonicalRelationshipStatus {
  switch ((status ?? "").trim().toLowerCase()) {
    case "married":
      return "married";
    case "dating":
    case "relationship":
      return "dating";
    case "single":
    case "shifting":
    default:
      return "single";
  }
}

export interface RelationshipUserContext {
  firstName: string;
  relationshipStatus: RelationshipStatus | CanonicalRelationshipStatus | string;
}

export type ForwardRelationshipWindowType =
  | "warmthAndCloseness"
  | "patienceWatch"
  | "groundedShift";

export interface ForwardRelationshipWindowTelemetry {
  id: string;
  yearLabel: string;
  monthRange: string;
  windowType: ForwardRelationshipWindowType;
  focusTags: string[];
  startIso: string;
  endIso: string;
}

export interface RelationshipTelemetry {
  precisionMode: AstroPrecisionMode;
  anchorMode: "lagnaAndVenus" | "lunarVenusFallback";
  userContext: {
    firstName: string;
    relationshipStatus: CanonicalRelationshipStatus;
  };
  freeLayerSignals: {
    outerArmorTag: string;
    innerHeartTag: string;
    textingTellTag: string;
    dateNightTellTag: string;
    somaticBodyTellTag: string;
    pastLoveShift: {
      yearRange: string;
      shiftThemeTag: string;
      triggerInternal: string;
    };
    sparkTraitsPreviewTags: string[];
    lockedTimingYearLabel: string;
  };
  paidLayerSignals: {
    peaceTraitsTags: string[];
    stopExcusingTag: string;
    primaryBlindSpotTag: string;
    resetAntidoteTag: string;
    greenFlagBodyCheckTag: string;
    forward12mTiming: {
      macroSeasonYearSpan: string;
      macroPostureTag: string;
      upcomingWindows: ForwardRelationshipWindowTelemetry[];
    };
  };
  upgradeHint: string | null;
}

type ElementKind = "fire" | "earth" | "air" | "water";

function elementOfSign(sign: RasiNumber): ElementKind {
  const mod = ((sign - 1) % 4) as 0 | 1 | 2 | 3;
  if (mod === 0) return "fire";
  if (mod === 1) return "earth";
  if (mod === 2) return "air";
  return "water";
}

function signLordSignRasis(sign: RasiNumber): RasiNumber[] {
  // Classical sign rulers -> return signs ruled by Mars/Venus/Mercury/Moon/Sun/Jupiter/Saturn
  switch (sign) {
    case 1: // Aries -> Mars
    case 8: // Scorpio -> Mars
      return [1, 8];
    case 2: // Taurus -> Venus
    case 7: // Libra -> Venus
      return [2, 7];
    case 3: // Gemini -> Mercury
    case 6: // Virgo -> Mercury
      return [3, 6];
    case 4: // Cancer -> Moon
      return [4];
    case 5: // Leo -> Sun
      return [5];
    case 9: // Sagittarius -> Jupiter
    case 12: // Pisces -> Jupiter
      return [9, 12];
    case 10: // Capricorn -> Saturn
    case 11: // Aquarius -> Saturn
      return [10, 11];
  }
}

function lordCodeOfSign(sign: RasiNumber): string {
  switch (sign) {
    case 1:
    case 8:
      return "Ma";
    case 2:
    case 7:
      return "Ve";
    case 3:
    case 6:
      return "Me";
    case 4:
      return "Mo";
    case 5:
      return "Su";
    case 9:
    case 12:
      return "Ju";
    case 10:
    case 11:
      return "Sa";
  }
}

function findPlanet(
  planets: PlanetPlacement[],
  codes: string[],
  names: string[]
): PlanetPlacement | null {
  for (const p of planets) {
    const code = p.code.trim().toLowerCase();
    const name = p.name.trim().toLowerCase();
    if (codes.some((c) => code === c) || names.some((n) => name === n)) {
      return p;
    }
  }
  return null;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

interface NatalLoveSignals {
  isExact: boolean;
  anchorSign: RasiNumber;
  lagnaSign: RasiNumber | null;
  moonSign: RasiNumber;
  sunSign: RasiNumber | null;
  venusSign: RasiNumber;
  marsSign: RasiNumber | null;
  mercurySign: RasiNumber | null;
  jupiterSign: RasiNumber | null;
  saturnSign: RasiNumber | null;
  seventhSign: RasiNumber;
  fifthSign: RasiNumber;
  lagnaLordHouse: number | null;
  venusHouse: number | null;
  saturnHouse: number | null;
  marsHouse: number | null;
  mercuryHouse: number | null;
  seventhLordSign: RasiNumber | null;
  d9SeventhSign: RasiNumber | null;
  d9VenusSign: RasiNumber | null;
  venusStrong: boolean;
  mercuryExaltedOrOwn: boolean;
  highFireOrMars: boolean;
  highAirOrRahu: boolean;
}

function extractD9Signals(
  d9Raw: Record<string, unknown> | null
): { d9SeventhSign: RasiNumber | null; d9VenusSign: RasiNumber | null } {
  if (!d9Raw || typeof d9Raw !== "object") {
    return { d9SeventhSign: null, d9VenusSign: null };
  }
  let d9Lagna: RasiNumber | null = null;
  let d9VenusSign: RasiNumber | null = null;

  for (let i = 0; i <= 12; i++) {
    const entry = d9Raw[String(i)];
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const name = String(row.full_name ?? row.name ?? "").toLowerCase();
    const sign = toRasiNumber(
      typeof row.rasi_no === "number" ? row.rasi_no : null,
      typeof row.zodiac === "string" ? row.zodiac : null
    );
    if (!sign) continue;
    if (name === "as" || name === "ascendant") d9Lagna = sign;
    if (name === "ve" || name === "venus") d9VenusSign = sign;
  }

  return {
    d9SeventhSign: d9Lagna ? offsetSign(d9Lagna, 6) : null,
    d9VenusSign,
  };
}

function extractNatalLoveSignals(chart: NormalizedChartJson): NatalLoveSignals {
  const isExact =
    chart.precisionMode === "exact" && Boolean(chart.corePlacements.ascendant);
  const planets = chart.corePlacements.planets ?? [];

  const lagnaSign = isExact
    ? toRasiNumber(
        chart.corePlacements.ascendant?.rasiNo,
        chart.corePlacements.ascendant?.zodiac
      )
    : null;
  const moonPlacement =
    chart.corePlacements.moon ?? findPlanet(planets, ["mo"], ["moon"]);
  const sunPlacement =
    chart.corePlacements.sun ?? findPlanet(planets, ["su"], ["sun"]);
  const venusPlacement = findPlanet(planets, ["ve"], ["venus"]);
  const marsPlacement = findPlanet(planets, ["ma"], ["mars"]);
  const mercuryPlacement = findPlanet(planets, ["me"], ["mercury"]);
  const jupiterPlacement = findPlanet(planets, ["ju"], ["jupiter"]);
  const saturnPlacement = findPlanet(planets, ["sa"], ["saturn"]);

  const moonSign =
    toRasiNumber(moonPlacement?.rasiNo, moonPlacement?.zodiac) ?? 1;
  const sunSign = toRasiNumber(sunPlacement?.rasiNo, sunPlacement?.zodiac);
  const venusSign =
    toRasiNumber(venusPlacement?.rasiNo, venusPlacement?.zodiac) ??
    offsetSign(sunSign ?? moonSign, 1);
  const marsSign = toRasiNumber(marsPlacement?.rasiNo, marsPlacement?.zodiac);
  const mercurySign = toRasiNumber(
    mercuryPlacement?.rasiNo,
    mercuryPlacement?.zodiac
  );
  const jupiterSign = toRasiNumber(
    jupiterPlacement?.rasiNo,
    jupiterPlacement?.zodiac
  );
  const saturnSign = toRasiNumber(saturnPlacement?.rasiNo, saturnPlacement?.zodiac);

  const anchorSign = lagnaSign ?? moonSign;
  const seventhSign = offsetSign(anchorSign, 6);
  const fifthSign = offsetSign(anchorSign, 4);

  const planetHouse = (p: PlanetPlacement | null, sign: RasiNumber | null) => {
    if (!isExact || !lagnaSign || !sign) return null;
    return p?.house ?? houseFromSign(lagnaSign, sign);
  };

  const lagnaLordCode = lagnaSign ? lordCodeOfSign(lagnaSign).toLowerCase() : null;
  const lagnaLordPlacement = lagnaLordCode
    ? findPlanet(planets, [lagnaLordCode], [])
    : null;
  const lagnaLordSign = lagnaLordPlacement
    ? toRasiNumber(lagnaLordPlacement.rasiNo, lagnaLordPlacement.zodiac)
    : null;
  const lagnaLordHouse =
    isExact && lagnaSign && lagnaLordSign
      ? lagnaLordPlacement?.house ?? houseFromSign(lagnaSign, lagnaLordSign)
      : null;

  const seventhLordCode = lordCodeOfSign(seventhSign).toLowerCase();
  const seventhLordPlacement = findPlanet(planets, [seventhLordCode], []);
  const seventhLordSign = seventhLordPlacement
    ? toRasiNumber(seventhLordPlacement.rasiNo, seventhLordPlacement.zodiac)
    : null;

  const d9 = isExact
    ? extractD9Signals(chart.divisionalCharts.D9)
    : { d9SeventhSign: null, d9VenusSign: null };

  const venusStrong = venusSign === 2 || venusSign === 7 || venusSign === 12;
  const mercuryExaltedOrOwn = mercurySign === 3 || mercurySign === 6;

  const fireCount = [lagnaSign, moonSign, sunSign, marsSign].filter(
    (s) => s && elementOfSign(s) === "fire"
  ).length;
  const airCount = [lagnaSign, moonSign, venusSign, mercurySign].filter(
    (s) => s && elementOfSign(s) === "air"
  ).length;

  return {
    isExact,
    anchorSign,
    lagnaSign,
    moonSign,
    sunSign,
    venusSign,
    marsSign,
    mercurySign,
    jupiterSign,
    saturnSign,
    seventhSign,
    fifthSign,
    lagnaLordHouse,
    venusHouse: planetHouse(venusPlacement, venusSign),
    saturnHouse: planetHouse(saturnPlacement, saturnSign),
    marsHouse: planetHouse(marsPlacement, marsSign),
    mercuryHouse: planetHouse(mercuryPlacement, mercurySign),
    seventhLordSign,
    d9SeventhSign: d9.d9SeventhSign,
    d9VenusSign: d9.d9VenusSign,
    venusStrong,
    mercuryExaltedOrOwn,
    highFireOrMars:
      fireCount >= 2 || elementOfSign(moonSign) === "fire",
    highAirOrRahu: airCount >= 2,
  };
}

function computeLayer1Signals(
  signals: NatalLoveSignals,
  referenceDate: Date
): {
  outerArmorTag: string;
  innerHeartTag: string;
  textingTellTag: string;
  dateNightTellTag: string;
  somaticBodyTellTag: string;
} {
  const outerEl = elementOfSign(signals.lagnaSign ?? signals.moonSign);
  const venusEl = elementOfSign(signals.venusSign);
  const moonEl = elementOfSign(signals.moonSign);

  // 1. Contradiction Headline tags
  let outerArmorTag = "independentSelfSufficientExterior";
  if (signals.isExact && signals.saturnHouse === 7) {
    outerArmorTag = "warmGivingComposedExterior";
  } else if (outerEl === "fire" && signals.lagnaLordHouse === 6) {
    outerArmorTag = "independentSelfSufficientExterior";
  } else if (outerEl === "air") {
    outerArmorTag = "coolPlayfulSelfContainedExterior";
  } else if (outerEl === "water") {
    outerArmorTag = "warmAttentiveQuietlyGuardedExterior";
  } else if (outerEl === "earth") {
    outerArmorTag = "steadyPracticalLowDramaExterior";
  }

  let innerHeartTag = "cravesWarmthTasteAndEqualTeammate";
  if (signals.venusStrong && (signals.venusHouse === 7 || !signals.isExact)) {
    innerHeartTag = "cravesWarmthTasteBanterAndEqualTeammate";
  } else if (signals.saturnHouse === 7 || venusEl === "earth") {
    innerHeartTag = "secretlyTestsReliabilitySlowlyAndCravesSteadiness";
  } else if (venusEl === "water") {
    innerHeartTag = "deeplyProtectiveAffectionateHomebodyHeart";
  } else if (venusEl === "fire") {
    innerHeartTag = "cravesPlayfulSparkRespectAndUnfilteredHonesty";
  }

  // 2. Texting & Date-Night Tell tags
  let textingTellTag =
    "directWarmWhenInterestedPoliteSilentExitWhenUnappreciated";
  if (moonEl === "fire") {
    textingTellTag =
      "directWarmNoWaitingGamesPoliteSilentExitWhenRespectDrops";
  } else if (moonEl === "air") {
    textingTellTag =
      "quickBanterReadsToneShiftsImmediatelyPullsBackWhenEffortFades";
  } else if (moonEl === "earth") {
    textingTellTag =
      "steadyLowDramaTexterNoticesFollowThroughMoreThanBigWords";
  } else if (moonEl === "water") {
    textingTellTag =
      "warmThoughtfulRepliesQuietWithdrawalTheSecondVibeFeelsOff";
  }

  let dateNightTellTag =
    "attentiveOutwardlyQuietlyNoticesConsistencyInside";
  if (signals.mercuryExaltedOrOwn || signals.mercuryHouse === 6 || signals.marsHouse === 6) {
    dateNightTellTag =
      "warmAttentiveOutsideQuietTenPointConsistencyAuditInside";
  } else if (signals.venusHouse === 7 || signals.venusHouse === 5) {
    dateNightTellTag =
      "generousConversationalHostQuietlyTestingMutualEffortAndTaste";
  } else if (signals.saturnHouse === 1 || signals.saturnHouse === 7) {
    dateNightTellTag =
      "calmListenerOnTheOutsideMeasuringLongTermReliabilityQuietly";
  }

  // 3. Body / Somatic Tell tags
  const transitSaturn = getSaturnSignAt(referenceDate);
  const saturnTransitHouse = houseFromSign(signals.anchorSign, transitSaturn);

  let somaticBodyTellTag: string;
  if (saturnTransitHouse === 12) {
    somaticBodyTellTag =
      "tightShouldersLightSleepLateNightWorkOrOrganizingWhenUnsure";
  } else if (saturnTransitHouse === 4) {
    somaticBodyTellTag =
      "chestTightnessHomeRestlessnessTroubleUnwindingAtNight";
  } else if (saturnTransitHouse === 8) {
    somaticBodyTellTag =
      "gutTensionPrivateBroodingOveranalyzingWhatWasSaid";
  } else if (saturnTransitHouse === 1 || saturnTransitHouse === 2) {
    somaticBodyTellTag = "jawClenchingHeavyFatigueGoingQuietInsteadOfSnapping";
  } else if (signals.highFireOrMars) {
    somaticBodyTellTag =
      "restlessHeatTightShouldersLateNightTaskSwitchingWhenUncertain";
  } else if (signals.highAirOrRahu) {
    somaticBodyTellTag =
      "wiredMindReplayingConversationsAtMidnightLightSleep";
  } else {
    somaticBodyTellTag =
      "heavyChestQuietWithdrawalOverthinkingSmallToneShifts";
  }

  return {
    outerArmorTag,
    innerHeartTag,
    textingTellTag,
    dateNightTellTag,
    somaticBodyTellTag,
  };
}

function formatYearSpanOnly(startIso: string, endIso: string, maxYear: number): string {
  const sDate = parseIsoUtc(startIso);
  const eDate = parseIsoUtc(endIso);
  const startY = Math.min(sDate.getUTCFullYear(), maxYear);
  // Treat early-January end dates as closing the preceding calendar year
  const rawEndY =
    eDate.getUTCMonth() === 0 && eDate.getUTCDate() <= 5
      ? eDate.getUTCFullYear() - 1
      : eDate.getUTCFullYear();
  const endY = Math.max(startY, Math.min(rawEndY, maxYear));
  return startY === endY ? String(startY) : `${startY} – ${endY}`;
}

function scanPastLoveShift(
  signals: NatalLoveSignals,
  chart: NormalizedChartJson,
  referenceDate: Date
): {
  yearRange: string;
  shiftThemeTag: string;
  triggerInternal: string;
} {
  const refYear = referenceDate.getUTCFullYear();
  const minScanDate = new Date(Date.UTC(refYear - 7, 0, 1));

  interface Candidate {
    score: number;
    yearRange: string;
    shiftThemeTag: string;
    triggerInternal: string;
  }
  const candidates: Candidate[] = [];

  const targetSigns = new Set<RasiNumber>([
    signals.anchorSign,
    signals.seventhSign,
    signals.venusSign,
  ]);
  if (signals.seventhLordSign) targetSigns.add(signals.seventhLordSign);

  // Priority 1: Rahu / Ketu axis hitting 1st/7th, Natal Venus, or 7th Lord
  for (const iv of RAHU_TRANSITS) {
    const s = parseIsoUtc(iv.start);
    const e = parseIsoUtc(iv.end);
    if (e < minScanDate || s > referenceDate) continue;
    // Skip tiny partial boundary slices starting only in current year if an earlier strong window exists
    const rahuSign = iv.sign;
    const ketuSign = offsetSign(rahuSign, 6);

    const hitsAxis =
      rahuSign === signals.anchorSign ||
      ketuSign === signals.anchorSign ||
      rahuSign === signals.seventhSign ||
      ketuSign === signals.seventhSign;
    const ketuHitsVenusOr7th =
      ketuSign === signals.venusSign ||
      ketuSign === signals.seventhSign ||
      (signals.seventhLordSign !== null && ketuSign === signals.seventhLordSign);
    const rahuHitsVenusOr7th =
      rahuSign === signals.venusSign ||
      rahuSign === signals.seventhSign ||
      (signals.seventhLordSign !== null && rahuSign === signals.seventhLordSign);

    if (!hitsAxis && !ketuHitsVenusOr7th && !rahuHitsVenusOr7th) continue;

    let score = 70;
    if (hitsAxis) score += 20;
    if (ketuHitsVenusOr7th) score += 25;
    if (rahuHitsVenusOr7th) score += 18;
    if (s.getUTCFullYear() <= refYear - 1) score += 10;

    const shiftThemeTag = ketuHitsVenusOr7th
      ? "stoppedToleratingLukewarmConnectionsStandardsRewired"
      : "intenseMagneticLessonThatExposedRealNeeds";

    candidates.push({
      score,
      yearRange: formatYearSpanOnly(iv.start, iv.end, refYear),
      shiftThemeTag,
      triggerInternal: `Rahu sign ${rahuSign} / Ketu sign ${ketuSign} intersecting relationship axis & Venus (${signals.venusSign})`,
    });
  }

  // Priority 2: Saturn entering/aspecting 7th, Natal Venus, or Sade Sati peak
  for (const iv of SATURN_TRANSITS) {
    const s = parseIsoUtc(iv.start);
    const e = parseIsoUtc(iv.end);
    if (e < minScanDate || s > referenceDate) continue;
    if (iv.retro) continue;

    const aspects = getSaturnAspectSigns(iv.sign);
    const hitsVenus = aspects.includes(signals.venusSign);
    const hitsSeventh = aspects.includes(signals.seventhSign);
    const hitsMoon = iv.sign === signals.moonSign;

    if (!hitsVenus && !hitsSeventh && !hitsMoon) continue;

    let score = 52;
    if (hitsSeventh) score += 14;
    if (hitsVenus) score += 12;
    if (hitsMoon) score += 10;

    candidates.push({
      score,
      yearRange: formatYearSpanOnly(iv.start, iv.end, refYear),
      shiftThemeTag: "heavyMaturityTestAroundEffortAndBoundaries",
      triggerInternal: `Saturn sign ${iv.sign} testing commitment & boundaries on Venus/7th/Moon`,
    });
  }

  // Priority 3: Recent Dasha era fallback (strictly YYYY or YYYY – YYYY)
  if (candidates.length === 0) {
    const era2 = chart.eras?.era2;
    if (era2?.startIso && era2?.endIso) {
      candidates.push({
        score: 30,
        yearRange: formatYearSpanOnly(era2.startIso, era2.endIso, refYear),
        shiftThemeTag: "quietInternalStandardsShiftAroundRealPartnership",
        triggerInternal: `Era transition (${era2.planet}) recalibrating relationship standards`,
      });
    } else {
      const startY = refYear - 4;
      const endY = refYear - 3;
      candidates.push({
        score: 20,
        yearRange: `${startY} – ${endY}`,
        shiftThemeTag: "quietInternalStandardsShiftAroundRealPartnership",
        triggerInternal: "Multi-year relational maturation cycle fallback",
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return {
    yearRange: best.yearRange,
    shiftThemeTag: best.shiftThemeTag,
    triggerInternal: best.triggerInternal,
  };
}

function scanForward12Months(
  signals: NatalLoveSignals,
  referenceDate: Date
): {
  macroSeasonYearSpan: string;
  lockedTimingYearLabel: string;
  macroPostureTag: string;
  upcomingWindows: ForwardRelationshipWindowTelemetry[];
} {
  const start = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate()
    )
  );
  const end = addDays(start, 365);

  interface Candidate {
    start: Date;
    end: Date;
    priority: number;
    type: ForwardRelationshipWindowType;
    focusTags: string[];
  }
  const candidates: Candidate[] = [];

  // Scan 1: Grounded Serious Shift (major Jupiter/Saturn/Rahu sign ingress in next 12 months)
  const checkIngresses = (
    intervals: Array<{ sign: RasiNumber; start: string; end: string; retro?: boolean }>,
    planetName: string
  ) => {
    for (const iv of intervals) {
      const d = parseIsoUtc(iv.start);
      if (d <= start || d > end) continue;
      const hFromAnchor = houseFromSign(signals.anchorSign, iv.sign);
      const hFromVenus = houseFromSign(signals.venusSign, iv.sign);
      const hitsRelAxis =
        [1, 5, 7, 11].includes(hFromAnchor) || [1, 7].includes(hFromVenus);

      const wStart = d;
      const wEnd = addDays(d, 74);
      const clampedEnd = wEnd > end ? end : wEnd;
      if ((clampedEnd.getTime() - wStart.getTime()) / 86_400_000 < 25) continue;

      candidates.push({
        start: wStart,
        end: clampedEnd,
        priority: hitsRelAxis ? 95 : 80,
        type: "groundedShift",
        focusTags: [
          "casualConnectionsLoseAppeal",
          "seriousLongTermReadinessClicksIn",
          "clearStandardsForStayingPower",
        ],
      });
      void planetName;
    }
  };

  checkIngresses(SATURN_TRANSITS, "Saturn");
  checkIngresses(JUPITER_TRANSITS, "Jupiter");
  checkIngresses(RAHU_TRANSITS, "Rahu");

  // Scan 2: Sample weekly across next 365 days for Warmth/Closeness and Patience Watch runs
  const daysTotal = 365;
  let warmthRunStart: Date | null = null;
  let patienceRunStart: Date | null = null;

  for (let offset = 0; offset <= daysTotal; offset += 7) {
    const probe = addDays(start, offset);
    const jupSign = getJupiterSignAt(probe);
    const marsSign = getMarsSignAt(probe);
    const sunSign = getSiderealSunSign(probe);
    const rahuSign = getRahuSignAt(probe);
    const ketuSign = getKetuSignAt(probe);
    const marsRx = isRetrogradeAt(MARS_RETROGRADE_WINDOWS, probe);

    const jupHouse = houseFromSign(signals.anchorSign, jupSign);
    const jupFromVenus = houseFromSign(signals.venusSign, jupSign);
    const sunHouse = houseFromSign(signals.anchorSign, sunSign);
    const marsHouse = houseFromSign(signals.anchorSign, marsSign);
    const marsFromVenus = houseFromSign(signals.venusSign, marsSign);
    const rahuHouse = houseFromSign(signals.anchorSign, rahuSign);

    const isWarmth =
      ([3, 5, 7, 9, 11].includes(jupHouse) ||
        [1, 5, 7, 11].includes(jupFromVenus) ||
        [5, 7, 9, 11].includes(sunHouse)) &&
      ![1, 6, 7, 8, 12].includes(marsHouse) &&
      !marsRx;

    const isPatience =
      Boolean(marsRx) ||
      [1, 6, 7, 8, 12].includes(marsHouse) ||
      [1, 7, 8].includes(marsFromVenus) ||
      ([4, 6, 12].includes(sunHouse) && [1, 7, 12].includes(rahuHouse)) ||
      ketuSign === signals.seventhSign;

    if (isWarmth && !warmthRunStart) {
      warmthRunStart = probe;
    } else if ((!isWarmth || offset + 7 > daysTotal) && warmthRunStart) {
      const spanDays = (probe.getTime() - warmthRunStart.getTime()) / 86_400_000;
      if (spanDays >= 28) {
        const wEnd =
          spanDays > 68 ? addDays(warmthRunStart, 60) : probe;
        candidates.push({
          start: warmthRunStart,
          end: wEnd,
          priority: [5, 7, 11].includes(jupHouse) || [1, 7, 11].includes(jupFromVenus) ? 92 : 82,
          type: "warmthAndCloseness",
          focusTags: [
            "warmIntroductionsThroughFriends",
            "easyRealLifeConversation",
            "mutualWarmthWithoutGuesswork",
          ],
        });
      }
      warmthRunStart = null;
    }

    if (isPatience && !patienceRunStart) {
      patienceRunStart = probe;
    } else if ((!isPatience || offset + 7 > daysTotal) && patienceRunStart) {
      const spanDays = (probe.getTime() - patienceRunStart.getTime()) / 86_400_000;
      if (spanDays >= 28) {
        const wEnd =
          spanDays > 72 ? addDays(patienceRunStart, 65) : probe;
        candidates.push({
          start: patienceRunStart,
          end: wEnd,
          priority: marsRx ? 90 : 81,
          type: "patienceWatch",
          focusTags: [
            "innerCriticRunsSharper",
            "pauseTenSecondsBeforeReacting",
            "dontTextOrDebateWhileExhausted",
          ],
        });
      }
      patienceRunStart = null;
    }
  }

  // Pick up to 1 highest-priority non-overlapping window per type (21-day gap minimum)
  candidates.sort((a, b) => b.priority - a.priority);
  const selected: Candidate[] = [];
  const usedTypes = new Set<ForwardRelationshipWindowType>();

  const overlapsExisting = (c: { start: Date; end: Date }) =>
    selected.some(
      (s) =>
        c.start.getTime() <= addDays(s.end, 21).getTime() &&
        c.end.getTime() >= addDays(s.start, -21).getTime()
    );

  // Prefer one of each type first
  for (const typeWanted of [
    "warmthAndCloseness",
    "patienceWatch",
    "groundedShift",
  ] as const) {
    const match = candidates.find(
      (c) => c.type === typeWanted && !overlapsExisting(c)
    );
    if (match) {
      selected.push(match);
      usedTypes.add(typeWanted);
    }
  }

  // Fill any missing slots cleanly from deterministic non-overlapping offsets
  const fallbacks: Array<{
    offset: number;
    dur: number;
    type: ForwardRelationshipWindowType;
    tags: string[];
  }> = [
    {
      offset: 25,
      dur: 50,
      type: "warmthAndCloseness",
      tags: ["warmIntroductionsThroughFriends", "realLifeEventsBeatSwiping", "easySpark"],
    },
    {
      offset: 115,
      dur: 55,
      type: "patienceWatch",
      tags: ["innerCriticRunsSharper", "skipImpatientTexts", "protectCalmEvenings"],
    },
    {
      offset: 205,
      dur: 65,
      type: "groundedShift",
      tags: ["seriousLongTermReadinessClicksIn", "higherStayingPowerConnections", "clarityOverMixedSignals"],
    },
  ];

  for (const fb of fallbacks) {
    if (selected.length >= 3) break;
    if (usedTypes.has(fb.type)) continue;
    const s = addDays(start, fb.offset);
    const e = addDays(s, fb.dur);
    if (!overlapsExisting({ start: s, end: e })) {
      selected.push({
        start: s,
        end: e,
        priority: 70,
        type: fb.type,
        focusTags: fb.tags,
      });
      usedTypes.add(fb.type);
    }
  }

  selected.sort((a, b) => a.start.getTime() - b.start.getTime());

  const upcomingWindows: ForwardRelationshipWindowTelemetry[] = selected.map(
    (w, idx) => ({
      id: `rw_${String(idx + 1).padStart(2, "0")}`,
      yearLabel: String(w.end.getUTCFullYear()),
      monthRange: formatTightMonthRange(w.start, w.end),
      windowType: w.type,
      focusTags: w.focusTags,
      startIso: w.start.toISOString().slice(0, 10),
      endIso: w.end.toISOString().slice(0, 10),
    })
  );

  const years = Array.from(
    new Set(
      upcomingWindows.flatMap((w) => [
        parseIsoUtc(w.startIso).getUTCFullYear(),
        parseIsoUtc(w.endIso).getUTCFullYear(),
      ])
    )
  ).sort((a, b) => a - b);

  const lockedTimingYearLabel =
    years.length >= 2 && years[0] !== years[years.length - 1]
      ? `${years[0]} – ${years[years.length - 1]}`
      : String(years[0] ?? end.getUTCFullYear());

  const startY = start.getUTCFullYear();
  const endY = end.getUTCFullYear();
  const macroSeasonYearSpan =
    startY === endY ? `Now – Late ${endY}` : `Now – Mid-${endY}`;

  const saturnNow = getSaturnSignAt(start);
  const saturnHouseNow = houseFromSign(signals.anchorSign, saturnNow);
  const macroPostureTag =
    saturnHouseNow === 12 || saturnHouseNow === 1 || saturnHouseNow === 7
      ? "quieterRebuildingSeasonQualityOverVolume"
      : "steadyClarityAndWarmConnectionSeason";

  return {
    macroSeasonYearSpan,
    lockedTimingYearLabel,
    macroPostureTag,
    upcomingWindows,
  };
}

function computeLayer3AndPaidSignals(
  signals: NatalLoveSignals,
  status: CanonicalRelationshipStatus
): {
  sparkTraitsPreviewTags: string[];
  peaceTraitsTags: string[];
  stopExcusingTag: string;
  primaryBlindSpotTag: string;
  resetAntidoteTag: string;
  greenFlagBodyCheckTag: string;
} {
  const fifthEl = elementOfSign(signals.fifthSign);
  const venusEl = elementOfSign(signals.venusSign);

  const sparkTraitsPreviewTags =
    venusEl === "air" || fifthEl === "fire"
      ? ["confident", "sharpBanter", "goodTaste", "livelyPresence"]
      : venusEl === "earth"
        ? ["groundedWarmth", "effortlessStyle", "calmConfidence", "subtleHumor"]
        : ["emotionalDepth", "attentiveEyeContact", "quietMagnetism", "sincereEnergy"];

  const d9El = elementOfSign(signals.d9SeventhSign ?? signals.moonSign);
  const peaceTraitsTags =
    d9El === "earth" || d9El === "fire"
      ? [
          "emotionallySteady",
          "warmAndDirect",
          "balancesFastInternalClockNoPowerStruggles",
        ]
      : [
          "emotionallyConsistent",
          "easyHumorUnderStress",
          "makesSilenceFeelSafeNotSuspicious",
        ];

  const stopExcusingTag =
    elementOfSign(signals.moonSign) === "fire" || signals.venusStrong
      ? "hotAndColdAmbiguityThatTriggersOverthinking"
      : "carryingOneSidedEmotionalWeightOutOfLoyalty";

  if (status === "married") {
    return {
      sparkTraitsPreviewTags,
      peaceTraitsTags,
      stopExcusingTag,
      primaryBlindSpotTag: "bringingOutsideStressHomeAndFixItModeUnderPressure",
      resetAntidoteTag:
        "offerWarmthFirstAndFortyFiveMinuteDecompressionBeforeProblemSolving",
      greenFlagBodyCheckTag:
        "softenedShouldersSharedHumorUnrushedEveningsNoKeepingScore",
    };
  }

  if (status === "dating") {
    return {
      sparkTraitsPreviewTags,
      peaceTraitsTags,
      stopExcusingTag,
      primaryBlindSpotTag:
        "fixingInsteadOfListeningOrPushingForClarityTooFast",
      resetAntidoteTag:
        "pauseTenSecondsAskWhatTheyNeedRightNowBeforeRunningAnAudit",
      greenFlagBodyCheckTag:
        "easySilenceWarmEyeContactNoTextingGuessworkBetweenDates",
    };
  }

  return {
    sparkTraitsPreviewTags,
    peaceTraitsTags,
    stopExcusingTag,
    primaryBlindSpotTag:
      "fastForwardInHeadOrOverFilterOnMinorFlawsTooEarly",
    resetAntidoteTag:
      "treatFirstThreeDatesAsCuriosityNotLifelongVerdictChooseFromFullness",
    greenFlagBodyCheckTag:
      "shouldersDropEasyLaughterNoNeedToPerformOrRecheckTexts",
  };
}

/**
 * Main deterministic entry point (< 5ms, $0 API calls).
 */
export function computeRelationshipTelemetry(
  normalizedChart: NormalizedChartJson,
  userContext: RelationshipUserContext,
  precisionMode: AstroPrecisionMode = normalizedChart.precisionMode,
  referenceDate: Date = new Date()
): RelationshipTelemetry {
  const effectiveChart: NormalizedChartJson = {
    ...normalizedChart,
    precisionMode,
  };
  const canonicalStatus = normalizeRelationshipStatus(
    userContext.relationshipStatus
  );
  const signals = extractNatalLoveSignals(effectiveChart);
  const layer1 = computeLayer1Signals(signals, referenceDate);
  const pastLoveShift = scanPastLoveShift(signals, effectiveChart, referenceDate);
  const layer3 = computeLayer3AndPaidSignals(signals, canonicalStatus);
  const forward = scanForward12Months(signals, referenceDate);

  return {
    precisionMode,
    anchorMode: signals.isExact ? "lagnaAndVenus" : "lunarVenusFallback",
    userContext: {
      firstName: userContext.firstName,
      relationshipStatus: canonicalStatus,
    },
    freeLayerSignals: {
      ...layer1,
      pastLoveShift,
      sparkTraitsPreviewTags: layer3.sparkTraitsPreviewTags,
      lockedTimingYearLabel: forward.lockedTimingYearLabel,
    },
    paidLayerSignals: {
      peaceTraitsTags: layer3.peaceTraitsTags,
      stopExcusingTag: layer3.stopExcusingTag,
      primaryBlindSpotTag: layer3.primaryBlindSpotTag,
      resetAntidoteTag: layer3.resetAntidoteTag,
      greenFlagBodyCheckTag: layer3.greenFlagBodyCheckTag,
      forward12mTiming: {
        macroSeasonYearSpan: forward.macroSeasonYearSpan,
        macroPostureTag: forward.macroPostureTag,
        upcomingWindows: forward.upcomingWindows,
      },
    },
    upgradeHint:
      precisionMode === "exact"
        ? null
        : "Add your exact birth time anytime to sharpen your long-term partnership & timing windows for free.",
  };
}

export { signLordSignRasis };
