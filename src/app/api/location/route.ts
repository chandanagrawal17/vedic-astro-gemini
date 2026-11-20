import { NextRequest, NextResponse } from "next/server";
import { NormalizedLocation } from "@/lib/astro/types";
import { getAstroProvider } from "@/lib/astro/vedicAstroProvider";
import { MOCK_CITIES } from "@/lib/mock/blueprintMock";
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
  };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    const mockSlice = MOCK_CITIES.slice(0, 12);
    return NextResponse.json({
      locations: mockSlice.map(fromMockCity),
      results: mockSlice,
      cached: false,
    });
  }

  const cacheKey = q.toLowerCase();
  const cached = locationCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      locations: cached.locations,
      results: cached.results,
      cached: true,
    });
  }

  try {
    const provider = getAstroProvider();
    const locations = (await provider.searchLocation(q)).slice(0, 8);

    if (locations.length > 0) {
      const results = locations.map(toLocationOption);

      if (locationCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = locationCache.keys().next().value;
        if (oldestKey) locationCache.delete(oldestKey);
      }

      locationCache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        locations,
        results,
      });

      return NextResponse.json({
        locations,
        results,
        cached: false,
      });
    }
  } catch (err) {
    console.warn("[/api/location] VedicAstroAPI geo-search fallback:", err);
  }

  // Deterministic local fallback if API is unreachable or returned empty
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
