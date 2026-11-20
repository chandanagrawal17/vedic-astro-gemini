import { NextRequest, NextResponse } from "next/server";
import { MOCK_CITIES } from "@/lib/mock/blueprintMock";
import { LocationOption } from "@/lib/types/blueprint";

interface OpenMeteoResult {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ results: MOCK_CITIES.slice(0, 12) });
  }

  try {
    const [cityPartRaw, regionPartRaw] = q.split(",").map((s) => s.trim());
    const searchName = cityPartRaw || q;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      searchName
    )}&count=10&language=en&format=json`;

    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as { results?: OpenMeteoResult[] };
      if (data.results && data.results.length > 0) {
        let items = data.results;
        if (regionPartRaw) {
          const regionLower = regionPartRaw.toLowerCase();
          const filtered = items.filter(
            (i) =>
              i.country?.toLowerCase().includes(regionLower) ||
              i.admin1?.toLowerCase().includes(regionLower)
          );
          if (filtered.length > 0) items = filtered;
        }

        const mapped: LocationOption[] = items.slice(0, 8).map((item) => ({
          cityName: item.admin1 ? `${item.name}, ${item.admin1}` : item.name,
          region: item.country || "Global",
          lat: item.latitude,
          lon: item.longitude,
          tzOffset: Math.round((item.longitude / 15) * 2) / 2,
        }));
        return NextResponse.json({ results: mapped });
      }
    }
  } catch {
    // Fall back to local city list if offline or timed out
  }

  const lower = q.toLowerCase();
  const fallback = MOCK_CITIES.filter(
    (c) =>
      c.cityName.toLowerCase().includes(lower) ||
      c.region.toLowerCase().includes(lower)
  ).slice(0, 8);

  return NextResponse.json({ results: fallback });
}
