import type { BirthWindow, PrecisionMode as UiPrecisionMode } from "@/lib/types/blueprint";

/**
 * Canonical DB & Astro-Engine precision modes for Slice 2.
 */
export type AstroPrecisionMode = "exact" | "approx_window" | "date_only";

export function toAstroPrecisionMode(
  mode: UiPrecisionMode | AstroPrecisionMode
): AstroPrecisionMode {
  if (mode === "window") return "approx_window";
  if (mode === "dob_only") return "date_only";
  return mode;
}

export function toUiPrecisionMode(
  mode: UiPrecisionMode | AstroPrecisionMode
): UiPrecisionMode {
  if (mode === "approx_window") return "window";
  if (mode === "date_only") return "dob_only";
  return mode;
}

export interface NormalizedLocation {
  city: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
  tz: number;
}

export interface ChartCalculationInput {
  firstName: string;
  dob: string; // YYYY-MM-DD or DD/MM/YYYY
  tob?: string | null; // HH:MM (24h)
  birthWindow?: BirthWindow | null;
  precisionMode: AstroPrecisionMode;
  birthCity: string;
  lat: number;
  lon: number;
  tz: number;
}

export interface PlanetPlacement {
  code: string;
  name: string;
  zodiac: string;
  rasiNo: number;
  house: number | null;
  localDegree: number;
  nakshatra: string;
  nakshatraLord: string;
  nakshatraPada: number;
  retro: boolean;
}

export interface DashaEraWindow {
  id: "era1" | "era2" | "era3" | "era4";
  planet: string;
  subPlanet?: string;
  startIso: string;
  endIso: string;
  dateRange: string;
  percentComplete?: number;
  source: "mahadasha" | "antardasha";
}

export interface SaturnResetWindow {
  type: string; // e.g., "Sade Sati" | "Ashtama Shani" | "Kantaka Shani" | "Dasha Transition"
  direction: string;
  startIso: string;
  endIso: string;
  dateRange: string;
  isCurrentOrRecent: boolean;
}

export interface NumerologyProfile {
  destinyNumber: string | null;
  personalityNumber: string | null;
  attitudeNumber: string | null;
  characterNumber: string | null;
  soulNumber: string | null;
  purposeNumber: string | null;
}

export interface NormalizedChartJson {
  precisionMode: AstroPrecisionMode;
  effectiveTob: string;
  moonBoundaryFlag: boolean;
  corePlacements: {
    ascendant: PlanetPlacement | null; // null when precisionMode !== 'exact'
    moon: PlanetPlacement | null;
    sun: PlanetPlacement | null;
    planets: PlanetPlacement[];
  };
  divisionalChartsIncluded: boolean;
  divisionalCharts: {
    D9: Record<string, unknown> | null;
    D10: Record<string, unknown> | null;
    D30: Record<string, unknown> | null;
  };
  hardResetWindow: SaturnResetWindow;
  sadeSatiWindows: SaturnResetWindow[];
  nextPressureWindow: string;
  eras: {
    era1: DashaEraWindow;
    era2: DashaEraWindow;
    era3: DashaEraWindow;
    era4: DashaEraWindow;
  };
  numerology: NumerologyProfile;
}

export interface RawAstroBundle {
  planetDetails: unknown;
  mahaDasha: unknown;
  antarDasha: unknown;
  sadeSatiTable: unknown;
  numerology: unknown;
  divisionalD9: unknown | null;
  divisionalD10: unknown | null;
  divisionalD30: unknown | null;
  moonBoundaryCheck?: {
    midnightPlanets: unknown;
    endOfDayPlanets: unknown;
  } | null;
}

export interface ChartBundleResult {
  dobIso: string; // YYYY-MM-DD
  dobFormatted: string; // DD/MM/YYYY
  effectiveTob: string; // HH:MM
  precisionMode: AstroPrecisionMode;
  moonBoundaryFlag: boolean;
  rawAstroJson: RawAstroBundle;
  normalizedChartJson: NormalizedChartJson;
  apiCallsMade: number;
}
