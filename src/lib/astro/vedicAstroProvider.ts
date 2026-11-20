import { normalizeAstroBundle, didMoonCrossBoundary } from "@/lib/astro/normalizer";
import { AstroProvider } from "@/lib/astro/provider";
import {
  AstroPrecisionMode,
  ChartBundleResult,
  ChartCalculationInput,
  NormalizedLocation,
  RawAstroBundle,
} from "@/lib/astro/types";
import { BirthWindow } from "@/lib/types/blueprint";

export class AstroProviderError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 502,
    public readonly isTimeout = false
  ) {
    super(message);
    this.name = "AstroProviderError";
  }
}

const WINDOW_MIDPOINT_TOB: Record<BirthWindow, string> = {
  morning: "09:00",
  afternoon: "15:00",
  evening: "21:00",
  late_night: "03:00",
};

/**
 * Normalizes YYYY-MM-DD or DD/MM/YYYY into both ISO (YYYY-MM-DD) and VedicAstroAPI (DD/MM/YYYY).
 */
export function normalizeDobFormats(dob: string): {
  dobIso: string;
  dobFormatted: string;
} {
  const trimmed = dob.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return {
      dobIso: `${y}-${m}-${d}`,
      dobFormatted: `${d}/${m}/${y}`,
    };
  }

  const dmyMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return {
      dobIso: `${y}-${m}-${d}`,
      dobFormatted: `${d}/${m}/${y}`,
    };
  }

  throw new AstroProviderError(
    `Invalid dob format "${dob}". Expected YYYY-MM-DD or DD/MM/YYYY.`,
    400
  );
}

export function resolveEffectiveTob(
  precisionMode: AstroPrecisionMode,
  tob?: string | null,
  birthWindow?: BirthWindow | null
): string {
  if (precisionMode === "date_only") {
    return "12:00";
  }
  if (precisionMode === "approx_window") {
    return WINDOW_MIDPOINT_TOB[birthWindow ?? "morning"] ?? "09:00";
  }
  if (tob && /^\d{2}:\d{2}$/.test(tob.trim())) {
    return tob.trim();
  }
  throw new AstroProviderError(
    "Exact precision mode requires a valid HH:MM 24-hour time of birth.",
    400
  );
}

interface GeoSearchItem {
  name?: string;
  alternate_name?: string;
  country?: string;
  country_name?: string;
  full_name?: string;
  coordinates?: [string | number, string | number];
  tz?: number | string;
  state_name?: string;
}

export class VedicAstroApiProvider implements AstroProvider {
  public readonly providerName = "vedicastroapi";
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options?: { baseUrl?: string; timeoutMs?: number }) {
    if (typeof window !== "undefined") {
      throw new Error("VedicAstroApiProvider must only run on the server.");
    }
    const envBase =
      options?.baseUrl ||
      process.env.VEDIC_ASTRO_BASE_URL ||
      "https://api.vedicastroapi.com/v3-json";
    this.baseUrl = envBase.replace(/\/+$/, "");
    this.timeoutMs = options?.timeoutMs ?? 15000;
  }

  private getApiKey(): string {
    const apiKey = process.env.VEDIC_ASTRO_API_KEY;
    if (!apiKey) {
      throw new AstroProviderError(
        "Missing VEDIC_ASTRO_API_KEY environment variable.",
        500
      );
    }
    return apiKey;
  }

  private async requestJson<T>(
    path: string,
    params: Record<string, string | number>
  ): Promise<T> {
    const apiKey = this.getApiKey();
    const url = new URL(`${this.baseUrl}/${path.replace(/^\/+/, "")}`);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
    url.searchParams.set("lang", "en");
    url.searchParams.set("api_key", apiKey);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        throw new AstroProviderError(
          `VedicAstroAPI ${path} failed with HTTP ${res.status}: ${bodyText.slice(0, 200)}`,
          502
        );
      }

      const data = (await res.json()) as T & { status?: number; response?: unknown };
      if (
        data &&
        typeof data === "object" &&
        "status" in data &&
        typeof data.status === "number" &&
        data.status !== 200
      ) {
        throw new AstroProviderError(
          `VedicAstroAPI ${path} returned status ${data.status}`,
          502
        );
      }

      return data;
    } catch (err) {
      if (err instanceof AstroProviderError) {
        throw err;
      }
      if (err instanceof Error && err.name === "AbortError") {
        throw new AstroProviderError(
          `VedicAstroAPI ${path} timed out after ${this.timeoutMs}ms`,
          504,
          true
        );
      }
      throw new AstroProviderError(
        `VedicAstroAPI ${path} network error: ${err instanceof Error ? err.message : String(err)}`,
        502
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async searchLocation(cityQuery: string): Promise<NormalizedLocation[]> {
    const trimmed = cityQuery.trim();
    if (!trimmed) return [];

    const [cityPart, qualifierPart] = trimmed.split(",").map((s) => s.trim());
    const queryCity = cityPart || trimmed;

    const payload = await this.requestJson<{
      status: number;
      response?: GeoSearchItem[];
    }>("utilities/geo-search", {
      city: queryCity,
    });

    const items = Array.isArray(payload.response) ? payload.response : [];

    let normalized: NormalizedLocation[] = items
      .filter((item) => Array.isArray(item.coordinates) && item.coordinates.length >= 2)
      .map((item) => {
        const parts = (item.full_name || "")
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        const inferredState =
          item.state_name ||
          (parts.length >= 3 ? parts[1] : parts.length === 2 ? parts[1] : "");

        return {
          city: item.name || queryCity,
          state: inferredState,
          country: item.country_name || item.country || "",
          lat: Number(item.coordinates![0]),
          lon: Number(item.coordinates![1]),
          tz: Number(item.tz ?? 0),
        };
      });

    if (qualifierPart) {
      const qLower = qualifierPart.toLowerCase();
      const filtered = normalized.filter(
        (loc) =>
          loc.state.toLowerCase().includes(qLower) ||
          loc.country.toLowerCase().includes(qLower)
      );
      if (filtered.length > 0) {
        normalized = filtered;
      }
    }

    return normalized;
  }

  async fetchChartBundle(
    input: ChartCalculationInput
  ): Promise<ChartBundleResult> {
    const { dobIso, dobFormatted } = normalizeDobFormats(input.dob);
    const effectiveTob = resolveEffectiveTob(
      input.precisionMode,
      input.tob,
      input.birthWindow
    );

    const commonParams = {
      dob: dobFormatted,
      tob: effectiveTob,
      lat: input.lat,
      lon: input.lon,
      tz: input.tz,
    };

    let apiCallsMade = 0;
    const trackedFetch = <T>(
      path: string,
      params: Record<string, string | number>
    ): Promise<T> => {
      apiCallsMade += 1;
      return this.requestJson<T>(path, params);
    };

    // Core endpoints (called for ALL precision tiers)
    const corePromises = Promise.all([
      trackedFetch<unknown>("horoscope/planet-details", commonParams),
      trackedFetch<unknown>("dashas/maha-dasha", commonParams),
      trackedFetch<unknown>("dashas/antar-dasha", commonParams),
      trackedFetch<unknown>("extended-horoscope/sade-sati-table", commonParams),
      trackedFetch<unknown>("prediction/numerology", {
        name: input.firstName.trim() || "Blueprint",
        date: dobFormatted,
      }),
    ]);

    // Divisional charts ONLY when precision_mode === 'exact'
    const divisionalPromises =
      input.precisionMode === "exact"
        ? Promise.all([
            trackedFetch<unknown>("horoscope/divisional-charts", {
              ...commonParams,
              div: "D9",
            }),
            trackedFetch<unknown>("horoscope/divisional-charts", {
              ...commonParams,
              div: "D10",
            }),
            trackedFetch<unknown>("horoscope/divisional-charts", {
              ...commonParams,
              div: "D30",
            }),
          ])
        : Promise.resolve([null, null, null] as const);

    // Moon-Boundary Guardrail ONLY when precision_mode === 'date_only'
    const moonBoundaryPromises =
      input.precisionMode === "date_only"
        ? Promise.all([
            trackedFetch<unknown>("horoscope/planet-details", {
              ...commonParams,
              tob: "00:01",
            }),
            trackedFetch<unknown>("horoscope/planet-details", {
              ...commonParams,
              tob: "23:59",
            }),
          ])
        : Promise.resolve(null);

    const [
      [planetDetails, mahaDasha, antarDasha, sadeSatiTable, numerology],
      [divisionalD9, divisionalD10, divisionalD30],
      moonBoundaryPair,
    ] = await Promise.all([
      corePromises,
      divisionalPromises,
      moonBoundaryPromises,
    ]);

    const moonBoundaryFlag = moonBoundaryPair
      ? didMoonCrossBoundary(moonBoundaryPair[0], moonBoundaryPair[1])
      : false;

    const rawAstroJson: RawAstroBundle = {
      planetDetails,
      mahaDasha,
      antarDasha,
      sadeSatiTable,
      numerology,
      divisionalD9,
      divisionalD10,
      divisionalD30,
      moonBoundaryCheck: moonBoundaryPair
        ? {
            midnightPlanets: moonBoundaryPair[0],
            endOfDayPlanets: moonBoundaryPair[1],
          }
        : null,
    };

    const normalizedChartJson = normalizeAstroBundle({
      raw: rawAstroJson,
      dobIso,
      effectiveTob,
      precisionMode: input.precisionMode,
      moonBoundaryFlag,
    });

    return {
      dobIso,
      dobFormatted,
      effectiveTob,
      precisionMode: input.precisionMode,
      moonBoundaryFlag,
      rawAstroJson,
      normalizedChartJson,
      apiCallsMade,
    };
  }
}

export function getAstroProvider(): AstroProvider {
  return new VedicAstroApiProvider();
}
