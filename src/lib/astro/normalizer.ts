import {
  AstroPrecisionMode,
  DashaEraWindow,
  NormalizedChartJson,
  NumerologyProfile,
  PlanetPlacement,
  RawAstroBundle,
  SaturnResetWindow,
} from "@/lib/astro/types";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function parseAstroDate(raw: unknown): Date | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const trimmed = raw.trim();

  // Handle DD/MM/YYYY
  const ddmmyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (ddmmyyyy) {
    const d = Number(ddmmyyyy[1]);
    const m = Number(ddmmyyyy[2]) - 1;
    const y = Number(ddmmyyyy[3]);
    const parsed = new Date(Date.UTC(y, m, d));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatYearRange(
  start: Date,
  end: Date,
  precisionMode: AstroPrecisionMode,
  includeMonthsIfExact = false
): string {
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();

  if (precisionMode === "exact" && includeMonthsIfExact) {
    const startLabel = `${MONTH_NAMES[start.getUTCMonth()]} ${startYear}`;
    const endLabel = `${MONTH_NAMES[end.getUTCMonth()]} ${endYear}`;
    return `${startLabel} – ${endLabel}`;
  }

  return startYear === endYear ? `${startYear}` : `${startYear} – ${endYear}`;
}

export function extractPlanetsFromDetails(
  rawPlanetDetails: unknown
): PlanetPlacement[] {
  if (!rawPlanetDetails || typeof rawPlanetDetails !== "object") return [];
  const obj = rawPlanetDetails as Record<string, unknown>;
  const source =
    obj.response && typeof obj.response === "object"
      ? (obj.response as Record<string, unknown>)
      : obj;

  const placements: PlanetPlacement[] = [];
  for (let i = 0; i <= 12; i++) {
    const entry = source[String(i)];
    if (!entry || typeof entry !== "object") continue;
    const p = entry as Record<string, unknown>;
    if (typeof p.full_name !== "string" && typeof p.name !== "string") continue;

    placements.push({
      code: String(p.name ?? ""),
      name: String(p.full_name ?? p.name ?? ""),
      zodiac: String(p.zodiac ?? ""),
      rasiNo: Number(p.rasi_no ?? 0),
      house: typeof p.house === "number" ? p.house : null,
      localDegree: Number(p.local_degree ?? 0),
      nakshatra: String(p.nakshatra ?? ""),
      nakshatraLord: String(p.nakshatra_lord ?? ""),
      nakshatraPada: Number(p.nakshatra_pada ?? 0),
      retro: Boolean(p.retro),
    });
  }

  return placements;
}

export function didMoonCrossBoundary(
  midnightRaw: unknown,
  endOfDayRaw: unknown
): boolean {
  const startPlanets = extractPlanetsFromDetails(midnightRaw);
  const endPlanets = extractPlanetsFromDetails(endOfDayRaw);

  const moonStart = startPlanets.find(
    (p) => p.code === "Mo" || p.name.toLowerCase() === "moon"
  );
  const moonEnd = endPlanets.find(
    (p) => p.code === "Mo" || p.name.toLowerCase() === "moon"
  );

  if (!moonStart || !moonEnd) return false;

  const signChanged =
    moonStart.rasiNo !== moonEnd.rasiNo ||
    moonStart.zodiac.toLowerCase() !== moonEnd.zodiac.toLowerCase();

  const nakshatraChanged =
    moonStart.nakshatra.toLowerCase() !== moonEnd.nakshatra.toLowerCase();

  return signChanged || nakshatraChanged;
}

interface RawInterval {
  planet: string;
  subPlanet?: string;
  start: Date;
  end: Date;
  source: "mahadasha" | "antardasha";
}

function buildMahaDashaIntervals(
  rawMaha: unknown,
  dobDate: Date
): RawInterval[] {
  if (!rawMaha || typeof rawMaha !== "object") return [];
  const root = rawMaha as Record<string, unknown>;
  const res =
    root.response && typeof root.response === "object"
      ? (root.response as Record<string, unknown>)
      : root;

  const names = Array.isArray(res.mahadasha) ? res.mahadasha : [];
  const orders = Array.isArray(res.mahadasha_order) ? res.mahadasha_order : [];
  const dashaStart = parseAstroDate(res.dasha_start_date) ?? dobDate;

  const intervals: RawInterval[] = [];
  let cursor = dashaStart;

  for (let i = 0; i < Math.min(names.length, orders.length); i++) {
    const end = parseAstroDate(orders[i]);
    if (!end) continue;
    const start = cursor < dobDate && end > dobDate ? dobDate : cursor;
    intervals.push({
      planet: String(names[i]),
      start,
      end,
      source: "mahadasha",
    });
    cursor = end;
  }

  return intervals;
}

function buildAntarDashaIntervals(
  rawAntar: unknown,
  mahaIntervals: RawInterval[]
): RawInterval[] {
  if (!rawAntar || typeof rawAntar !== "object") return [];
  const root = rawAntar as Record<string, unknown>;
  const res =
    root.response && typeof root.response === "object"
      ? (root.response as Record<string, unknown>)
      : root;

  const antarNames = Array.isArray(res.antardashas) ? res.antardashas : [];
  const antarOrders = Array.isArray(res.antardasha_order)
    ? res.antardasha_order
    : [];

  const intervals: RawInterval[] = [];

  for (let m = 0; m < Math.min(antarNames.length, antarOrders.length); m++) {
    const namesRow = Array.isArray(antarNames[m]) ? antarNames[m] : [];
    const datesRow = Array.isArray(antarOrders[m]) ? antarOrders[m] : [];
    let cursor = mahaIntervals[m]?.start ?? null;

    for (let a = 0; a < Math.min(namesRow.length, datesRow.length); a++) {
      const end = parseAstroDate(datesRow[a]);
      if (!end) continue;

      // If no previous cursor is known (first entry without mahaStart), estimate 1 year prior
      const start =
        cursor ??
        new Date(
          Date.UTC(
            end.getUTCFullYear() - 1,
            end.getUTCMonth(),
            end.getUTCDate()
          )
        );

      const label = String(namesRow[a]);
      const [mainPlanet, subPlanet] = label.split("/");

      intervals.push({
        planet: mainPlanet || label,
        subPlanet: subPlanet || undefined,
        start,
        end,
        source: "antardasha",
      });

      cursor = end;
    }
  }

  return intervals;
}

function normalizeEras(
  rawMaha: unknown,
  rawAntar: unknown,
  dobDate: Date,
  precisionMode: AstroPrecisionMode
): NormalizedChartJson["eras"] {
  const now = new Date();
  const tenYearsAgo = new Date(
    Date.UTC(now.getUTCFullYear() - 10, now.getUTCMonth(), now.getUTCDate())
  );

  const mahaIntervals = buildMahaDashaIntervals(rawMaha, dobDate);
  const antarIntervals = buildAntarDashaIntervals(rawAntar, mahaIntervals);

  // Check how many Mahadashas overlap the last 10-12 years up to now
  const recentMaha = mahaIntervals.filter(
    (iv) => iv.end >= tenYearsAgo && iv.start <= now
  );

  let chosen4: [RawInterval, RawInterval, RawInterval, RawInterval] | null =
    null;

  if (recentMaha.length >= 3) {
    const currentIdx = mahaIntervals.findIndex(
      (iv) => iv.start <= now && iv.end >= now
    );
    if (currentIdx >= 2 && currentIdx + 1 < mahaIntervals.length) {
      chosen4 = [
        mahaIntervals[currentIdx - 2],
        mahaIntervals[currentIdx - 1],
        mahaIntervals[currentIdx],
        mahaIntervals[currentIdx + 1],
      ];
    }
  }

  // Otherwise use Antardasha granularity (or combine short ones) so the 10-year arc has 3 distinct eras
  if (!chosen4 && antarIntervals.length >= 4) {
    const currentAntarIdx = antarIntervals.findIndex(
      (iv) => iv.start <= now && iv.end >= now
    );
    const activeIdx =
      currentAntarIdx >= 0
        ? currentAntarIdx
        : Math.max(2, antarIntervals.length - 2);

    // Group adjacent short sub-periods (< 18 months) into ~2.5-3.5 yr buckets for Era 1 & Era 2
    const current = antarIntervals[activeIdx];
    const next =
      antarIntervals[Math.min(activeIdx + 1, antarIntervals.length - 1)];

    // Find Era 2 immediately preceding current (span >= 1.5 years if possible)
    let era2StartIdx = Math.max(0, activeIdx - 1);
    while (
      era2StartIdx > 0 &&
      (antarIntervals[activeIdx - 1].end.getTime() -
        antarIntervals[era2StartIdx].start.getTime()) /
        (365.25 * 86400000) <
        2.2
    ) {
      era2StartIdx--;
    }

    const era2: RawInterval = {
      planet: antarIntervals[era2StartIdx].planet,
      subPlanet: antarIntervals[activeIdx - 1]?.subPlanet,
      start: antarIntervals[era2StartIdx].start,
      end: antarIntervals[activeIdx - 1]?.end ?? current.start,
      source: "antardasha",
    };

    // Find Era 1 immediately preceding Era 2 (~3-4 years)
    const era1EndIdx = Math.max(0, era2StartIdx - 1);
    let era1StartIdx = era1EndIdx;
    while (
      era1StartIdx > 0 &&
      (antarIntervals[era1EndIdx].end.getTime() -
        antarIntervals[era1StartIdx].start.getTime()) /
        (365.25 * 86400000) <
        2.5
    ) {
      era1StartIdx--;
    }

    const era1: RawInterval = {
      planet: antarIntervals[era1StartIdx].planet,
      subPlanet: antarIntervals[era1EndIdx]?.subPlanet,
      start: antarIntervals[era1StartIdx].start,
      end: antarIntervals[era1EndIdx]?.end ?? era2.start,
      source: "antardasha",
    };

    chosen4 = [era1, era2, current, next];
  }

  // Deterministic fallback if API returned empty dashas
  if (!chosen4) {
    const y = now.getUTCFullYear();
    const mk = (
      s: number,
      e: number,
      planet: string
    ): RawInterval => ({
      planet,
      start: new Date(Date.UTC(s, 0, 1)),
      end: new Date(Date.UTC(e, 11, 31)),
      source: "mahadasha",
    });
    chosen4 = [
      mk(y - 10, y - 7, "Phase 1"),
      mk(y - 6, y - 3, "Phase 2"),
      mk(y - 2, y + 1, "Phase 3"),
      mk(y + 1, y + 4, "Phase 4"),
    ];
  }

  const [e1, e2, e3, e4] = chosen4;
  const totalMs = Math.max(1, e3.end.getTime() - e3.start.getTime());
  const elapsedMs = Math.max(0, now.getTime() - e3.start.getTime());
  const pct = Math.min(95, Math.max(8, Math.round((elapsedMs / totalMs) * 100)));

  const toWindow = (
    id: "era1" | "era2" | "era3" | "era4",
    iv: RawInterval,
    includeMonths: boolean,
    percentComplete?: number
  ): DashaEraWindow => ({
    id,
    planet: iv.planet,
    subPlanet: iv.subPlanet,
    startIso: iv.start.toISOString().slice(0, 10),
    endIso: iv.end.toISOString().slice(0, 10),
    dateRange: formatYearRange(iv.start, iv.end, precisionMode, includeMonths),
    ...(percentComplete !== undefined ? { percentComplete } : {}),
    source: iv.source,
  });

  return {
    era1: toWindow("era1", e1, false),
    era2: toWindow("era2", e2, false),
    era3: toWindow("era3", e3, true, pct),
    era4: toWindow("era4", e4, true),
  };
}

function normalizeSadeSati(
  rawSadeSati: unknown,
  eras: NormalizedChartJson["eras"],
  precisionMode: AstroPrecisionMode
): {
  windows: SaturnResetWindow[];
  hardReset: SaturnResetWindow;
  nextPressureWindow: string;
} {
  const root =
    rawSadeSati && typeof rawSadeSati === "object"
      ? (rawSadeSati as Record<string, unknown>)
      : {};
  const entries = Array.isArray(root.response)
    ? root.response
    : Array.isArray(rawSadeSati)
      ? rawSadeSati
      : [];

  interface ParsedEntry {
    type: string;
    direction: string;
    start: Date;
    end: Date;
  }

  const parsed: ParsedEntry[] = [];
  for (const item of entries) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const start = parseAstroDate(row.start_date);
    const end = parseAstroDate(row.end_date);
    if (!start || !end) continue;
    parsed.push({
      type: String(row.type ?? "Saturn Cycle"),
      direction: String(row.direction ?? "N/A"),
      start,
      end,
    });
  }

  // Merge adjacent/retrograde segments of the same type within 270 days
  const merged: ParsedEntry[] = [];
  for (const item of parsed) {
    const prev = merged[merged.length - 1];
    const gapDays = prev
      ? (item.start.getTime() - prev.end.getTime()) / 86400000
      : Infinity;

    if (prev && prev.type === item.type && gapDays <= 270) {
      if (item.end > prev.end) prev.end = item.end;
      if (item.direction !== "N/A" && prev.direction === "N/A") {
        prev.direction = item.direction;
      }
    } else {
      merged.push({ ...item });
    }
  }

  const now = new Date();
  const currentYear = now.getUTCFullYear();

  const windows: SaturnResetWindow[] = merged.map((m) => {
    const startY = m.start.getUTCFullYear();
    const endY = m.end.getUTCFullYear();
    const isCurrentOrRecent =
      startY <= currentYear && endY >= currentYear - 16;

    return {
      type: m.type,
      direction: m.direction,
      startIso: m.start.toISOString().slice(0, 10),
      endIso: m.end.toISOString().slice(0, 10),
      dateRange: formatYearRange(m.start, m.end, precisionMode, false),
      isCurrentOrRecent,
    };
  });

  // Prefer Sade Sati first, then Ashtama/Kantaka Shani within the last 16 years
  const recentWindows = windows.filter((w) => w.isCurrentOrRecent);
  const preferredSadeSati = recentWindows.find((w) =>
    w.type.toLowerCase().includes("sade sati")
  );
  const preferredRecent =
    preferredSadeSati ?? recentWindows[recentWindows.length - 1];

  // Fallback to Era 2 if no Saturn cycle overlapped the past 16 years
  const hardReset: SaturnResetWindow = preferredRecent ?? {
    type: "Dasha Transition",
    direction: "Reset",
    startIso: eras.era2.startIso,
    endIso: eras.era2.endIso,
    dateRange: eras.era2.dateRange,
    isCurrentOrRecent: true,
  };

  const futureWindow = windows.find(
    (w) => parseAstroDate(w.startIso)! > now
  );
  const nextPressureWindow = futureWindow
    ? futureWindow.dateRange
    : eras.era4.dateRange;

  return { windows, hardReset, nextPressureWindow };
}

function normalizeNumerology(rawNumerology: unknown): NumerologyProfile {
  const root =
    rawNumerology && typeof rawNumerology === "object"
      ? (rawNumerology as Record<string, unknown>)
      : {};
  const res =
    root.response && typeof root.response === "object"
      ? (root.response as Record<string, unknown>)
      : root;

  const getNum = (key: string): string | null => {
    const item = res[key];
    if (!item || typeof item !== "object") return null;
    const num = (item as Record<string, unknown>).number;
    return num !== undefined && num !== null ? String(num) : null;
  };

  return {
    destinyNumber: getNum("destiny"),
    personalityNumber: getNum("personality"),
    attitudeNumber: getNum("attitude"),
    characterNumber: getNum("character"),
    soulNumber: getNum("soul"),
    purposeNumber: getNum("purpose"),
  };
}

function unwrapResponseObject(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.response && typeof obj.response === "object") {
    return obj.response as Record<string, unknown>;
  }
  return obj;
}

export function normalizeAstroBundle(params: {
  raw: RawAstroBundle;
  dobIso: string;
  effectiveTob: string;
  precisionMode: AstroPrecisionMode;
  moonBoundaryFlag: boolean;
}): NormalizedChartJson {
  const { raw, dobIso, effectiveTob, precisionMode, moonBoundaryFlag } = params;
  const dobDate = parseAstroDate(dobIso) ?? new Date();

  const allPlanets = extractPlanetsFromDetails(raw.planetDetails);
  const isExact = precisionMode === "exact";

  const sanitizedPlanets = allPlanets.map((p) => ({
    ...p,
    house: isExact ? p.house : null,
  }));

  const ascendant = isExact
    ? sanitizedPlanets.find(
        (p) => p.code === "As" || p.name.toLowerCase() === "ascendant"
      ) ?? null
    : null;

  const moon =
    sanitizedPlanets.find(
      (p) => p.code === "Mo" || p.name.toLowerCase() === "moon"
    ) ?? null;

  const sun =
    sanitizedPlanets.find(
      (p) => p.code === "Su" || p.name.toLowerCase() === "sun"
    ) ?? null;

  const planets = sanitizedPlanets.filter(
    (p) => p.code !== "As" && p.name.toLowerCase() !== "ascendant"
  );

  const eras = normalizeEras(raw.mahaDasha, raw.antarDasha, dobDate, precisionMode);
  const saturn = normalizeSadeSati(raw.sadeSatiTable, eras, precisionMode);
  const numerology = normalizeNumerology(raw.numerology);

  return {
    precisionMode,
    effectiveTob,
    moonBoundaryFlag,
    corePlacements: {
      ascendant,
      moon,
      sun,
      planets,
    },
    divisionalChartsIncluded: isExact,
    divisionalCharts: isExact
      ? {
          D9: unwrapResponseObject(raw.divisionalD9),
          D10: unwrapResponseObject(raw.divisionalD10),
          D30: unwrapResponseObject(raw.divisionalD30),
        }
      : {
          D9: null,
          D10: null,
          D30: null,
        },
    hardResetWindow: saturn.hardReset,
    sadeSatiWindows: saturn.windows,
    nextPressureWindow: saturn.nextPressureWindow,
    eras,
    numerology,
  };
}
