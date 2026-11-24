import type { NormalizedLocation } from "@/lib/astro/types";
import { resolveHistoricalUtcOffsetHours } from "@/lib/location/timezoneOffset";
import rawWorldCities from "@/lib/location/worldCities.json";

/**
 * Compact tuple format generated from GeoNames cities15000:
 * [cityName, asciiNameOrEmpty, stateOrAdmin1, countryName, lat, lon, ianaTimeZone]
 * Sorted descending by population.
 */
type WorldCityTuple = [
  string,
  string,
  string,
  string,
  number,
  number,
  string,
];

interface IndexedCity {
  city: string;
  cityLower: string;
  asciiLower: string;
  state: string;
  stateLower: string;
  country: string;
  countryLower: string;
  lat: number;
  lon: number;
  timeZone: string;
}

let cachedIndex: IndexedCity[] | null = null;

function getCityIndex(): IndexedCity[] {
  if (cachedIndex) return cachedIndex;

  const tuples = rawWorldCities as WorldCityTuple[];
  cachedIndex = tuples.map(([city, ascii, state, country, lat, lon, timeZone]) => ({
    city,
    cityLower: city.toLowerCase(),
    asciiLower: (ascii || city).toLowerCase(),
    state,
    stateLower: state.toLowerCase(),
    country,
    countryLower: country.toLowerCase(),
    lat,
    lon,
    timeZone,
  }));

  return cachedIndex;
}

function scoreCityMatch(
  entry: IndexedCity,
  cityTerm: string,
  qualifierLower: string
): number {
  let baseRank = -1;

  if (entry.cityLower === cityTerm || entry.asciiLower === cityTerm) {
    baseRank = 0;
  } else if (
    entry.cityLower.startsWith(cityTerm) ||
    entry.asciiLower.startsWith(cityTerm)
  ) {
    baseRank = 1;
  } else if (
    entry.cityLower.includes(` ${cityTerm}`) ||
    entry.asciiLower.includes(` ${cityTerm}`)
  ) {
    baseRank = 2;
  } else if (
    entry.cityLower.includes(cityTerm) ||
    entry.asciiLower.includes(cityTerm)
  ) {
    baseRank = 3;
  } else if (
    !qualifierLower &&
    (entry.stateLower.includes(cityTerm) || entry.countryLower.includes(cityTerm))
  ) {
    baseRank = 4;
  }

  if (baseRank < 0) return -1;

  if (qualifierLower) {
    const matchesQualifier =
      entry.stateLower.includes(qualifierLower) ||
      entry.countryLower.includes(qualifierLower);
    if (!matchesQualifier) return -1;
  }

  return baseRank;
}

function runIndexQuery(
  index: IndexedCity[],
  cityTerm: string,
  qualifierLower: string,
  limit: number
): IndexedCity[] {
  const buckets: IndexedCity[][] = [[], [], [], [], []];

  for (let i = 0; i < index.length; i++) {
    const entry = index[i];
    const rank = scoreCityMatch(entry, cityTerm, qualifierLower);
    if (rank >= 0) {
      buckets[rank].push(entry);
      if (rank === 0 && buckets[0].length >= limit) {
        break;
      }
    }
  }

  const combined: IndexedCity[] = [];
  for (const bucket of buckets) {
    for (const item of bucket) {
      combined.push(item);
      if (combined.length >= limit) return combined;
    }
  }
  return combined;
}

export function searchWorldCities(
  query: string,
  options?: { dob?: string | null; tob?: string | null; limit?: number }
): NormalizedLocation[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const limit = options?.limit ?? 8;
  const index = getCityIndex();

  const [rawCityPart, ...restComma] = trimmed.split(",").map((s) => s.trim());
  const commaQualifier = restComma.join(" ").trim().toLowerCase();
  const primaryTerm = (rawCityPart || trimmed).toLowerCase();

  let matches = runIndexQuery(index, primaryTerm, commaQualifier, limit);

  // Support space-separated qualifiers like "muzaffarnagar india" or "london uk"
  if (matches.length === 0 && !commaQualifier && primaryTerm.includes(" ")) {
    const words = primaryTerm.split(/\s+/).filter(Boolean);
    for (let splitAt = words.length - 1; splitAt >= 1 && matches.length === 0; splitAt--) {
      const cityCandidate = words.slice(0, splitAt).join(" ");
      const qualifierCandidate = words.slice(splitAt).join(" ");
      if (cityCandidate.length >= 2) {
        matches = runIndexQuery(index, cityCandidate, qualifierCandidate, limit);
      }
    }
  }

  return matches.map((m) => ({
    city: m.city,
    state: m.state,
    country: m.country,
    lat: m.lat,
    lon: m.lon,
    tz:
      resolveHistoricalUtcOffsetHours(m.timeZone, options?.dob, options?.tob) ??
      0,
    timeZone: m.timeZone,
  }));
}
