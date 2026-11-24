import { NextRequest, NextResponse } from "next/server";
import { NormalizedLocation } from "@/lib/astro/types";
import { resolveHistoricalUtcOffsetHours } from "@/lib/location/timezoneOffset";
import { searchWorldCities } from "@/lib/location/worldCitySearch";
import { MOCK_CITIES } from "@/lib/mock/blueprintMock";
import { enforceRateLimit } from "@/lib/rateLimit";
import { LocationOption } from "@/lib/types/blueprint";

interface CacheEntry {
  expiresAt: number;
  locations: NormalizedLocation[];
  results: LocationOption[];
}

const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_ENTRIES = 200;
const locationCache = new Map<string, CacheEntry>();

function toLocationOption(loc: NormalizedLocation): LocationOption {
  const cityLabel = loc.state ? `${loc.city}, ${loc.state}` : loc.city;
  return {
    cityName: cityLabel,
    region: loc.country || "Global",
    lat: loc.lat,
    lon: loc.lon,
    tzOffset: loc.tz,
    ...(loc.timeZone ? { timeZone: loc.timeZone } : {}),
  };
}

function fromMockCity(opt: LocationOption): NormalizedLocation {
  const [city, state] = opt.cityName.split(",").map((s) => s.trim());
  return {
    city: city || opt.cityName,
    state: state || "",
    country: opt.region,
    lat: opt.lat,
    lon: opt.lon,
    tz: opt.tzOffset,
    ...(opt.timeZone ? { timeZone: opt.timeZone } : {}),
  };
}

interface OpenMeteoGeoItem {
  name?: string;
  admin1?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

async function searchOpenMeteo(
  query: string,
  dob?: string | null,
  tob?: string | null
): Promise<NormalizedLocation[]> {
  const [cityPart, qualifierPart] = query.split(",").map((s) => s.trim());
  const baseName = cityPart || query;

  const fetchGeo = async (name: string): Promise<OpenMeteoGeoItem[]> => {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      name
    )}&count=8&language=en&format=json`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: OpenMeteoGeoItem[] };
    return Array.isArray(data.results) ? data.results : [];
  };

  let items = await fetchGeo(baseName);
  let qualifier = qualifierPart || "";

  // Handle space-separated qualifiers like "muzaffarnagar india"
  if (items.length === 0 && !qualifier && baseName.includes(" ")) {
    const words = baseName.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      items = await fetchGeo(words[0]);
      qualifier = words.slice(1).join(" ");
    }
  }

  let normalized: NormalizedLocation[] = items
    .filter(
      (item) =>
        typeof item.latitude === "number" && typeof item.longitude === "number"
    )
    .map((item) => ({
      city: item.name || baseName,
      state: item.admin1 || "",
      country: item.country || "",
      lat: Number(item.latitude),
      lon: Number(item.longitude),
      tz:
        resolveHistoricalUtcOffsetHours(item.timezone, dob, tob) ?? 0,
      ...(item.timezone ? { timeZone: item.timezone } : {}),
    }));

  if (qualifier) {
    const qLower = qualifier.toLowerCase();
    const filtered = normalized.filter(
      (loc) =>
        loc.state.toLowerCase().includes(qLower) ||
        loc.country.toLowerCase().includes(qLower)
    );
    if (filtered.length > 0) {
      normalized = filtered;
    }
  }

  return normalized.slice(0, 8);
}

function storeCache(
  cacheKey: string,
  locations: NormalizedLocation[],
  results: LocationOption[]
) {
  if (locationCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = locationCache.keys().next().value;
    if (oldestKey) locationCache.delete(oldestKey);
  }
  locationCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    locations,
    results,
  });
}

export async function GET(req: NextRequest) {
  const rateLimited = enforceRateLimit(req, {
    namespace: "location_search",
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const dob = req.nextUrl.searchParams.get("dob")?.trim() || null;
  const tob = req.nextUrl.searchParams.get("tob")?.trim() || null;

  if (q.length < 2) {
    const mockSlice = MOCK_CITIES.slice(0, 12);
    return NextResponse.json({
      locations: mockSlice.map(fromMockCity),
      results: mockSlice,
      cached: false,
    });
  }

  const cacheKey = `${q.toLowerCase()}::${dob ?? ""}::${tob ?? ""}`;
  const cached = locationCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      locations: cached.locations,
      results: cached.results,
      cached: true,
    });
  }

  // Primary: Local bundled GeoNames cities15000 index (~34k global cities, 0 external API calls)
  const localMatches = searchWorldCities(q, { dob, tob, limit: 8 });
  if (localMatches.length > 0) {
    const results = localMatches.map(toLocationOption);
    storeCache(cacheKey, localMatches, results);
    return NextResponse.json({
      locations: localMatches,
      results,
      cached: false,
    });
  }

  // Fallback 1: Open-Meteo global geocoding for smaller towns/villages (<15k pop)
  try {
    const fallbackLocations = await searchOpenMeteo(q, dob, tob);
    if (fallbackLocations.length > 0) {
      const results = fallbackLocations.map(toLocationOption);
      storeCache(cacheKey, fallbackLocations, results);
      return NextResponse.json({
        locations: fallbackLocations,
        results,
        cached: false,
      });
    }
  } catch (err) {
    console.warn("[/api/location] Open-Meteo geo-search fallback error:", err);
  }

  // Fallback 2: Deterministic local preset list if offline
  const lower = q.toLowerCase();
  const fallbackResults = MOCK_CITIES.filter(
    (c) =>
      c.cityName.toLowerCase().includes(lower) ||
      c.region.toLowerCase().includes(lower)
  ).slice(0, 8);

  return NextResponse.json({
    locations: fallbackResults.map(fromMockCity),
    results: fallbackResults,
    cached: false,
    fallback: true,
  });
}
