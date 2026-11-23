/**
 * Static Lahiri Sidereal Ephemeris Lookup (2005–2030)
 *
 * Sign numbering (Rasi 1..12):
 * 1=Aries, 2=Taurus, 3=Gemini, 4=Cancer, 5=Leo, 6=Virgo,
 * 7=Libra, 8=Scorpio, 9=Sagittarius, 10=Capricorn, 11=Aquarius, 12=Pisces.
 *
 * Universal planetary sign ingresses and retrograde windows shared by
 * hardResetEngine.ts (12-year historical scan) and careerEngine.ts (12-month forward scan).
 * Zero runtime API calls; executes in < 5ms per user.
 */

export type RasiNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface SiderealTransitInterval {
  sign: RasiNumber;
  start: string; // YYYY-MM-DD (inclusive)
  end: string; // YYYY-MM-DD (exclusive)
  retro?: boolean;
}

export interface RetrogradeWindow {
  start: string;
  end: string;
  sign: RasiNumber;
}

export const RASI_NAMES: Record<RasiNumber, string> = {
  1: "Aries",
  2: "Taurus",
  3: "Gemini",
  4: "Cancer",
  5: "Leo",
  6: "Virgo",
  7: "Libra",
  8: "Scorpio",
  9: "Sagittarius",
  10: "Capricorn",
  11: "Aquarius",
  12: "Pisces",
};

const NAME_TO_RASI: Record<string, RasiNumber> = {
  aries: 1,
  mesha: 1,
  taurus: 2,
  vrishabha: 2,
  gemini: 3,
  mithuna: 3,
  cancer: 4,
  karka: 4,
  leo: 5,
  simha: 5,
  virgo: 6,
  kanya: 6,
  libra: 7,
  tula: 7,
  scorpio: 8,
  vrishchika: 8,
  sagittarius: 9,
  dhanu: 9,
  capricorn: 10,
  makara: 10,
  aquarius: 11,
  kumbha: 11,
  pisces: 12,
  meena: 12,
};

export function toRasiNumber(rasiNo?: number | null, zodiac?: string | null): RasiNumber | null {
  if (typeof rasiNo === "number" && rasiNo >= 1 && rasiNo <= 12) {
    return Math.trunc(rasiNo) as RasiNumber;
  }
  if (zodiac) {
    const mapped = NAME_TO_RASI[zodiac.trim().toLowerCase()];
    if (mapped) return mapped;
  }
  return null;
}

/**
 * Computes whole-sign house number (1..12) of `targetSign` measured from `anchorSign`.
 */
export function houseFromSign(anchorSign: RasiNumber, targetSign: RasiNumber): number {
  return ((targetSign - anchorSign + 12) % 12) + 1;
}

/**
 * Returns the sign offset by `steps` (0-indexed; e.g. 6 = opposite/7th sign).
 */
export function offsetSign(sign: RasiNumber, steps: number): RasiNumber {
  return ((((sign - 1 + steps) % 12) + 12) % 12 + 1) as RasiNumber;
}

/**
 * Saturn's classical Vedic targets: occupied sign + 3rd, 7th, and 10th signs from transit Saturn.
 */
export function getSaturnAspectSigns(saturnSign: RasiNumber): RasiNumber[] {
  return [
    saturnSign,
    offsetSign(saturnSign, 2),
    offsetSign(saturnSign, 6),
    offsetSign(saturnSign, 9),
  ];
}

// ---------------------------------------------------------------------------
// 1. SATURN (SHANI) SIDEREAL TRANSITS (2005–2030)
// ---------------------------------------------------------------------------
export const SATURN_TRANSITS: SiderealTransitInterval[] = [
  { sign: 4, start: "2005-05-26", end: "2006-11-01" },
  { sign: 5, start: "2006-11-01", end: "2007-01-10" },
  { sign: 4, start: "2007-01-10", end: "2007-07-15" },
  { sign: 5, start: "2007-07-15", end: "2009-09-09" },
  { sign: 6, start: "2009-09-09", end: "2011-11-15" },
  { sign: 7, start: "2011-11-15", end: "2012-05-15" },
  { sign: 6, start: "2012-05-15", end: "2012-08-04", retro: true },
  { sign: 7, start: "2012-08-04", end: "2014-11-02" },
  { sign: 8, start: "2014-11-02", end: "2017-01-26" },
  { sign: 9, start: "2017-01-26", end: "2017-06-21" },
  { sign: 8, start: "2017-06-21", end: "2017-10-26", retro: true },
  { sign: 9, start: "2017-10-26", end: "2020-01-24" },
  { sign: 10, start: "2020-01-24", end: "2022-04-29" },
  { sign: 11, start: "2022-04-29", end: "2022-07-12" },
  { sign: 10, start: "2022-07-12", end: "2023-01-17", retro: true },
  { sign: 11, start: "2023-01-17", end: "2025-03-29" },
  { sign: 12, start: "2025-03-29", end: "2027-06-02" },
  { sign: 1, start: "2027-06-02", end: "2027-10-20" },
  { sign: 12, start: "2027-10-20", end: "2028-02-23", retro: true },
  { sign: 1, start: "2028-02-23", end: "2029-08-08" },
  { sign: 2, start: "2029-08-08", end: "2031-01-01" },
];

export const SATURN_RETROGRADE_WINDOWS: RetrogradeWindow[] = [
  { start: "2014-03-02", end: "2014-07-20", sign: 7 },
  { start: "2015-03-14", end: "2015-08-02", sign: 8 },
  { start: "2016-03-25", end: "2016-08-13", sign: 8 },
  { start: "2017-04-06", end: "2017-08-25", sign: 8 },
  { start: "2018-04-18", end: "2018-09-06", sign: 9 },
  { start: "2019-04-30", end: "2019-09-18", sign: 9 },
  { start: "2020-05-11", end: "2020-09-29", sign: 10 },
  { start: "2021-05-23", end: "2021-10-11", sign: 10 },
  { start: "2022-06-04", end: "2022-10-23", sign: 10 },
  { start: "2023-06-17", end: "2023-11-04", sign: 11 },
  { start: "2024-06-29", end: "2024-11-15", sign: 11 },
  { start: "2025-07-13", end: "2025-11-28", sign: 12 },
  { start: "2026-07-26", end: "2026-12-10", sign: 12 },
  { start: "2027-08-09", end: "2027-12-24", sign: 1 },
  { start: "2028-08-22", end: "2029-01-05", sign: 1 },
];

// ---------------------------------------------------------------------------
// 2. RAHU / KETU SIDEREAL TRANSITS (2005–2030)
//    Ketu is always the opposite sign: offsetSign(rahuSign, 6)
// ---------------------------------------------------------------------------
export const RAHU_TRANSITS: SiderealTransitInterval[] = [
  { sign: 12, start: "2005-01-01", end: "2006-10-29" },
  { sign: 11, start: "2006-10-29", end: "2008-05-05" },
  { sign: 10, start: "2008-05-05", end: "2009-11-03" },
  { sign: 9, start: "2009-11-03", end: "2011-06-07" },
  { sign: 8, start: "2011-06-07", end: "2012-12-23" },
  { sign: 7, start: "2012-12-23", end: "2014-07-13" },
  { sign: 6, start: "2014-07-13", end: "2016-01-30" },
  { sign: 5, start: "2016-01-30", end: "2017-08-18" },
  { sign: 4, start: "2017-08-18", end: "2019-03-07" },
  { sign: 3, start: "2019-03-07", end: "2020-09-23" },
  { sign: 2, start: "2020-09-23", end: "2022-04-12" },
  { sign: 1, start: "2022-04-12", end: "2023-10-30" },
  { sign: 12, start: "2023-10-30", end: "2025-05-18" },
  { sign: 11, start: "2025-05-18", end: "2026-12-05" },
  { sign: 10, start: "2026-12-05", end: "2028-06-23" },
  { sign: 9, start: "2028-06-23", end: "2030-01-10" },
  { sign: 8, start: "2030-01-10", end: "2031-01-01" },
];

// ---------------------------------------------------------------------------
// 3. JUPITER (GURU) SIDEREAL TRANSITS (2005–2030)
// ---------------------------------------------------------------------------
export const JUPITER_TRANSITS: SiderealTransitInterval[] = [
  { sign: 6, start: "2005-01-01", end: "2005-09-28" },
  { sign: 7, start: "2005-09-28", end: "2006-10-27" },
  { sign: 8, start: "2006-10-27", end: "2007-11-22" },
  { sign: 9, start: "2007-11-22", end: "2008-12-09" },
  { sign: 10, start: "2008-12-09", end: "2009-12-19" },
  { sign: 11, start: "2009-12-19", end: "2010-05-02" },
  { sign: 12, start: "2010-05-02", end: "2010-11-01" },
  { sign: 11, start: "2010-11-01", end: "2010-12-06", retro: true },
  { sign: 12, start: "2010-12-06", end: "2011-05-08" },
  { sign: 1, start: "2011-05-08", end: "2012-05-17" },
  { sign: 2, start: "2012-05-17", end: "2013-05-31" },
  { sign: 3, start: "2013-05-31", end: "2014-06-19" },
  { sign: 4, start: "2014-06-19", end: "2015-07-14" },
  { sign: 5, start: "2015-07-14", end: "2016-08-11" },
  { sign: 6, start: "2016-08-11", end: "2017-09-12" },
  { sign: 7, start: "2017-09-12", end: "2018-10-11" },
  { sign: 8, start: "2018-10-11", end: "2019-11-05" },
  { sign: 9, start: "2019-11-05", end: "2020-03-30" },
  { sign: 10, start: "2020-03-30", end: "2020-06-30" },
  { sign: 9, start: "2020-06-30", end: "2020-11-20", retro: true },
  { sign: 10, start: "2020-11-20", end: "2021-04-06" },
  { sign: 11, start: "2021-04-06", end: "2021-09-14" },
  { sign: 10, start: "2021-09-14", end: "2021-11-20", retro: true },
  { sign: 11, start: "2021-11-20", end: "2022-04-13" },
  { sign: 12, start: "2022-04-13", end: "2023-04-22" },
  { sign: 1, start: "2023-04-22", end: "2024-05-01" },
  { sign: 2, start: "2024-05-01", end: "2025-05-14" },
  { sign: 3, start: "2025-05-14", end: "2025-10-18" },
  { sign: 4, start: "2025-10-18", end: "2025-12-05" },
  { sign: 3, start: "2025-12-05", end: "2026-06-02", retro: true },
  { sign: 4, start: "2026-06-02", end: "2026-10-31" },
  { sign: 5, start: "2026-10-31", end: "2027-01-25" },
  { sign: 4, start: "2027-01-25", end: "2027-06-26", retro: true },
  { sign: 5, start: "2027-06-26", end: "2028-07-26" },
  { sign: 6, start: "2028-07-26", end: "2029-08-25" },
  { sign: 7, start: "2029-08-25", end: "2030-09-22" },
  { sign: 8, start: "2030-09-22", end: "2031-01-01" },
];

// ---------------------------------------------------------------------------
// 4. MARS (MANGAL) SIDEREAL TRANSITS & RETROGRADE WINDOWS (2013–2030)
// ---------------------------------------------------------------------------
export const MARS_TRANSITS: SiderealTransitInterval[] = [
  { sign: 5, start: "2013-10-05", end: "2013-11-26" },
  { sign: 6, start: "2013-11-26", end: "2014-02-04" },
  { sign: 7, start: "2014-02-04", end: "2014-03-25" },
  { sign: 6, start: "2014-03-25", end: "2014-07-14", retro: true },
  { sign: 7, start: "2014-07-14", end: "2014-09-04" },
  { sign: 8, start: "2014-09-04", end: "2014-10-18" },
  { sign: 9, start: "2014-10-18", end: "2014-11-27" },
  { sign: 10, start: "2014-11-27", end: "2015-01-04" },
  { sign: 11, start: "2015-01-04", end: "2015-02-12" },
  { sign: 12, start: "2015-02-12", end: "2015-03-23" },
  { sign: 1, start: "2015-03-23", end: "2015-05-04" },
  { sign: 2, start: "2015-05-04", end: "2015-06-16" },
  { sign: 3, start: "2015-06-16", end: "2015-07-30" },
  { sign: 4, start: "2015-07-30", end: "2015-09-15" },
  { sign: 5, start: "2015-09-15", end: "2015-11-03" },
  { sign: 6, start: "2015-11-03", end: "2015-12-24" },
  { sign: 7, start: "2015-12-24", end: "2016-02-20" },
  { sign: 8, start: "2016-02-20", end: "2016-09-18" },
  { sign: 9, start: "2016-09-18", end: "2016-11-01" },
  { sign: 10, start: "2016-11-01", end: "2016-12-11" },
  { sign: 11, start: "2016-12-11", end: "2017-01-20" },
  { sign: 12, start: "2017-01-20", end: "2017-03-02" },
  { sign: 1, start: "2017-03-02", end: "2017-04-13" },
  { sign: 2, start: "2017-04-13", end: "2017-05-26" },
  { sign: 3, start: "2017-05-26", end: "2017-07-11" },
  { sign: 4, start: "2017-07-11", end: "2017-08-27" },
  { sign: 5, start: "2017-08-27", end: "2017-10-13" },
  { sign: 6, start: "2017-10-13", end: "2017-11-30" },
  { sign: 7, start: "2017-11-30", end: "2018-01-17" },
  { sign: 8, start: "2018-01-17", end: "2018-03-07" },
  { sign: 9, start: "2018-03-07", end: "2018-05-02" },
  { sign: 10, start: "2018-05-02", end: "2018-11-06" },
  { sign: 11, start: "2018-11-06", end: "2018-12-23" },
  { sign: 12, start: "2018-12-23", end: "2019-02-05" },
  { sign: 1, start: "2019-02-05", end: "2019-03-22" },
  { sign: 2, start: "2019-03-22", end: "2019-05-07" },
  { sign: 3, start: "2019-05-07", end: "2019-06-22" },
  { sign: 4, start: "2019-06-22", end: "2019-08-09" },
  { sign: 5, start: "2019-08-09", end: "2019-09-25" },
  { sign: 6, start: "2019-09-25", end: "2019-11-10" },
  { sign: 7, start: "2019-11-10", end: "2019-12-25" },
  { sign: 8, start: "2019-12-25", end: "2020-02-08" },
  { sign: 9, start: "2020-02-08", end: "2020-03-22" },
  { sign: 10, start: "2020-03-22", end: "2020-05-04" },
  { sign: 11, start: "2020-05-04", end: "2020-06-18" },
  { sign: 12, start: "2020-06-18", end: "2020-08-16" },
  { sign: 1, start: "2020-08-16", end: "2020-10-04" },
  { sign: 12, start: "2020-10-04", end: "2020-12-24", retro: true },
  { sign: 1, start: "2020-12-24", end: "2021-02-22" },
  { sign: 2, start: "2021-02-22", end: "2021-04-14" },
  { sign: 3, start: "2021-04-14", end: "2021-06-02" },
  { sign: 4, start: "2021-06-02", end: "2021-07-20" },
  { sign: 5, start: "2021-07-20", end: "2021-09-06" },
  { sign: 6, start: "2021-09-06", end: "2021-10-22" },
  { sign: 7, start: "2021-10-22", end: "2021-12-05" },
  { sign: 8, start: "2021-12-05", end: "2022-01-16" },
  { sign: 9, start: "2022-01-16", end: "2022-02-26" },
  { sign: 10, start: "2022-02-26", end: "2022-04-07" },
  { sign: 11, start: "2022-04-07", end: "2022-05-17" },
  { sign: 12, start: "2022-05-17", end: "2022-06-27" },
  { sign: 1, start: "2022-06-27", end: "2022-08-10" },
  { sign: 2, start: "2022-08-10", end: "2022-10-16" },
  { sign: 3, start: "2022-10-16", end: "2022-11-13" },
  { sign: 2, start: "2022-11-13", end: "2023-03-13", retro: true },
  { sign: 3, start: "2023-03-13", end: "2023-05-10" },
  { sign: 4, start: "2023-05-10", end: "2023-07-01" },
  { sign: 5, start: "2023-07-01", end: "2023-08-18" },
  { sign: 6, start: "2023-08-18", end: "2023-10-03" },
  { sign: 7, start: "2023-10-03", end: "2023-11-16" },
  { sign: 8, start: "2023-11-16", end: "2023-12-27" },
  { sign: 9, start: "2023-12-27", end: "2024-02-05" },
  { sign: 10, start: "2024-02-05", end: "2024-03-15" },
  { sign: 11, start: "2024-03-15", end: "2024-04-23" },
  { sign: 12, start: "2024-04-23", end: "2024-06-01" },
  { sign: 1, start: "2024-06-01", end: "2024-07-12" },
  { sign: 2, start: "2024-07-12", end: "2024-08-26" },
  { sign: 3, start: "2024-08-26", end: "2024-10-20" },
  { sign: 4, start: "2024-10-20", end: "2025-01-21" },
  { sign: 3, start: "2025-01-21", end: "2025-04-03", retro: true },
  { sign: 4, start: "2025-04-03", end: "2025-06-07" },
  { sign: 5, start: "2025-06-07", end: "2025-07-28" },
  { sign: 6, start: "2025-07-28", end: "2025-09-13" },
  { sign: 7, start: "2025-09-13", end: "2025-10-27" },
  { sign: 8, start: "2025-10-27", end: "2025-12-07" },
  { sign: 9, start: "2025-12-07", end: "2026-01-16" },
  { sign: 10, start: "2026-01-16", end: "2026-02-23" },
  { sign: 11, start: "2026-02-23", end: "2026-04-02" },
  { sign: 12, start: "2026-04-02", end: "2026-05-11" },
  { sign: 1, start: "2026-05-11", end: "2026-06-21" },
  { sign: 2, start: "2026-06-21", end: "2026-08-02" },
  { sign: 3, start: "2026-08-02", end: "2026-09-18" },
  { sign: 4, start: "2026-09-18", end: "2026-11-12" },
  { sign: 5, start: "2026-11-12", end: "2027-02-25" },
  { sign: 4, start: "2027-02-25", end: "2027-05-20", retro: true },
  { sign: 5, start: "2027-05-20", end: "2027-07-05" },
  { sign: 6, start: "2027-07-05", end: "2027-08-22" },
  { sign: 7, start: "2027-08-22", end: "2027-10-08" },
  { sign: 8, start: "2027-10-08", end: "2027-11-21" },
  { sign: 9, start: "2027-11-21", end: "2028-01-01" },
  { sign: 10, start: "2028-01-01", end: "2028-02-10" },
  { sign: 11, start: "2028-02-10", end: "2028-03-20" },
  { sign: 12, start: "2028-03-20", end: "2028-04-28" },
  { sign: 1, start: "2028-04-28", end: "2028-06-08" },
  { sign: 2, start: "2028-06-08", end: "2028-07-20" },
  { sign: 3, start: "2028-07-20", end: "2028-09-03" },
  { sign: 4, start: "2028-09-03", end: "2028-10-20" },
  { sign: 5, start: "2028-10-20", end: "2028-12-10" },
  { sign: 6, start: "2028-12-10", end: "2029-05-15" },
  { sign: 7, start: "2029-05-15", end: "2029-07-12" },
  { sign: 8, start: "2029-07-12", end: "2029-08-30" },
  { sign: 9, start: "2029-08-30", end: "2029-10-14" },
  { sign: 10, start: "2029-10-14", end: "2029-11-25" },
  { sign: 11, start: "2029-11-25", end: "2030-01-04" },
  { sign: 12, start: "2030-01-04", end: "2030-02-13" },
  { sign: 1, start: "2030-02-13", end: "2030-03-25" },
  { sign: 2, start: "2030-03-25", end: "2030-05-06" },
  { sign: 3, start: "2030-05-06", end: "2030-06-19" },
  { sign: 4, start: "2030-06-19", end: "2030-08-05" },
  { sign: 5, start: "2030-08-05", end: "2030-09-22" },
  { sign: 6, start: "2030-09-22", end: "2030-11-08" },
  { sign: 7, start: "2030-11-08", end: "2031-01-01" },
];

export const MARS_RETROGRADE_WINDOWS: RetrogradeWindow[] = [
  { start: "2014-03-01", end: "2014-05-20", sign: 6 },
  { start: "2016-04-17", end: "2016-06-29", sign: 8 },
  { start: "2018-06-26", end: "2018-08-27", sign: 10 },
  { start: "2020-09-09", end: "2020-11-14", sign: 12 },
  { start: "2022-10-30", end: "2023-01-12", sign: 2 },
  { start: "2024-12-06", end: "2025-02-24", sign: 3 },
  { start: "2027-01-10", end: "2027-04-01", sign: 4 },
  { start: "2029-02-14", end: "2029-05-05", sign: 6 },
];

// ---------------------------------------------------------------------------
// 5. SUN (SURYA) SIDEREAL INGRESS HELPER (~14th–17th monthly)
// ---------------------------------------------------------------------------
const SUN_INGRESS_DAY_BY_MONTH: Array<{ month: number; day: number; sign: RasiNumber }> = [
  { month: 0, day: 14, sign: 10 }, // Jan 14 -> Capricorn
  { month: 1, day: 13, sign: 11 }, // Feb 13 -> Aquarius
  { month: 2, day: 14, sign: 12 }, // Mar 14 -> Pisces
  { month: 3, day: 14, sign: 1 }, // Apr 14 -> Aries
  { month: 4, day: 15, sign: 2 }, // May 15 -> Taurus
  { month: 5, day: 15, sign: 3 }, // Jun 15 -> Gemini
  { month: 6, day: 16, sign: 4 }, // Jul 16 -> Cancer
  { month: 7, day: 17, sign: 5 }, // Aug 17 -> Leo
  { month: 8, day: 17, sign: 6 }, // Sep 17 -> Virgo
  { month: 9, day: 17, sign: 7 }, // Oct 17 -> Libra
  { month: 10, day: 16, sign: 8 }, // Nov 16 -> Scorpio
  { month: 11, day: 16, sign: 9 }, // Dec 16 -> Sagittarius
];

export function getSiderealSunSign(date: Date): RasiNumber {
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const entry = SUN_INGRESS_DAY_BY_MONTH[m];
  if (d >= entry.day) {
    return entry.sign;
  }
  const prev = SUN_INGRESS_DAY_BY_MONTH[(m + 11) % 12];
  return prev.sign;
}

export function getSunIntervalInYear(year: number, targetSign: RasiNumber): { start: Date; end: Date } {
  const idx = SUN_INGRESS_DAY_BY_MONTH.findIndex((e) => e.sign === targetSign);
  const curr = SUN_INGRESS_DAY_BY_MONTH[idx];
  const next = SUN_INGRESS_DAY_BY_MONTH[(idx + 1) % 12];
  const start = new Date(Date.UTC(year, curr.month, curr.day));
  const endYear = next.month < curr.month ? year + 1 : year;
  const end = new Date(Date.UTC(endYear, next.month, next.day));
  return { start, end };
}

// ---------------------------------------------------------------------------
// 6. GENERIC DATE & LOOKUP HELPERS
// ---------------------------------------------------------------------------
export function parseIsoUtc(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export function findTransitSignAt(
  intervals: SiderealTransitInterval[],
  date: Date
): SiderealTransitInterval | null {
  const ts = date.getTime();
  for (const item of intervals) {
    const start = parseIsoUtc(item.start).getTime();
    const end = parseIsoUtc(item.end).getTime();
    if (ts >= start && ts < end) {
      return item;
    }
  }
  return null;
}

export function getSaturnSignAt(date: Date): RasiNumber {
  return findTransitSignAt(SATURN_TRANSITS, date)?.sign ?? 12;
}

export function getRahuSignAt(date: Date): RasiNumber {
  return findTransitSignAt(RAHU_TRANSITS, date)?.sign ?? 11;
}

export function getKetuSignAt(date: Date): RasiNumber {
  return offsetSign(getRahuSignAt(date), 6);
}

export function getJupiterSignAt(date: Date): RasiNumber {
  return findTransitSignAt(JUPITER_TRANSITS, date)?.sign ?? 4;
}

export function getMarsSignAt(date: Date): RasiNumber {
  return findTransitSignAt(MARS_TRANSITS, date)?.sign ?? 5;
}

export function isRetrogradeAt(windows: RetrogradeWindow[], date: Date): RetrogradeWindow | null {
  const ts = date.getTime();
  for (const w of windows) {
    if (ts >= parseIsoUtc(w.start).getTime() && ts <= parseIsoUtc(w.end).getTime()) {
      return w;
    }
  }
  return null;
}

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "June",
  "July",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
];

function formatPointLabel(date: Date, isEnd: boolean): string {
  const day = date.getUTCDate();
  const mon = SHORT_MONTHS[date.getUTCMonth()];
  if (!isEnd) {
    if (day >= 22) return `Late ${mon}`;
    if (day >= 12 && day <= 19) return `Mid-${mon}`;
    return mon;
  }
  if (day <= 10) return `early ${mon}`;
  if (day >= 11 && day <= 19) return `mid-${mon}`;
  return mon;
}

/**
 * Formats a tight 3-week to 3-month window cleanly, e.g.:
 * - "Mid-Apr – June 2016"
 * - "Late Oct – Nov 2022"
 * - "Dec 2026 – Jan 2027"
 */
export function formatTightMonthRange(start: Date, end: Date): string {
  const sYear = start.getUTCFullYear();
  const eYear = end.getUTCFullYear();
  const sMonth = start.getUTCMonth();
  const eMonth = end.getUTCMonth();

  if (sYear === eYear && sMonth === eMonth) {
    return `${SHORT_MONTHS[sMonth]} ${sYear}`;
  }
  if (sYear === eYear) {
    const left = formatPointLabel(start, false);
    const right = formatPointLabel(end, true);
    return `${left} – ${right} ${eYear}`;
  }
  const left = SHORT_MONTHS[sMonth];
  const right = SHORT_MONTHS[eMonth];
  return `${left} ${sYear} – ${right} ${eYear}`;
}
