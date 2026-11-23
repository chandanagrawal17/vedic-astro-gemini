import test from "node:test";
import assert from "node:assert/strict";
import {
  didMoonCrossBoundary,
  normalizeAstroBundle,
} from "@/lib/astro/normalizer";
import {
  toAstroPrecisionMode,
  toUiPrecisionMode,
} from "@/lib/astro/types";
import {
  AstroProviderError,
  normalizeDobFormats,
  resolveEffectiveTob,
  VedicAstroApiProvider,
} from "@/lib/astro/vedicAstroProvider";
import { makeRawAstroBundle } from "./helpers/fixtures";

test("precision mode conversions map cleanly between UI and Astro DB modes", () => {
  assert.equal(toAstroPrecisionMode("exact"), "exact");
  assert.equal(toAstroPrecisionMode("window"), "approx_window");
  assert.equal(toAstroPrecisionMode("dob_only"), "date_only");

  assert.equal(toUiPrecisionMode("exact"), "exact");
  assert.equal(toUiPrecisionMode("approx_window"), "window");
  assert.equal(toUiPrecisionMode("date_only"), "dob_only");
});

test("resolveEffectiveTob routes all 3 precision tiers and validates exact HH:MM", () => {
  assert.equal(resolveEffectiveTob("date_only", "08:00", "morning"), "12:00");
  assert.equal(resolveEffectiveTob("approx_window", null, "morning"), "09:00");
  assert.equal(resolveEffectiveTob("approx_window", null, "afternoon"), "15:00");
  assert.equal(resolveEffectiveTob("approx_window", null, "evening"), "21:00");
  assert.equal(resolveEffectiveTob("approx_window", null, "late_night"), "03:00");
  assert.equal(resolveEffectiveTob("exact", "20:54", null), "20:54");

  assert.throws(
    () => resolveEffectiveTob("exact", null, null),
    (err: unknown) =>
      err instanceof AstroProviderError && err.statusCode === 400
  );
});

test("normalizeDobFormats parses YYYY-MM-DD and DD/MM/YYYY and rejects invalid inputs", () => {
  assert.deepEqual(normalizeDobFormats("1989-09-17"), {
    dobIso: "1989-09-17",
    dobFormatted: "17/09/1989",
  });
  assert.deepEqual(normalizeDobFormats("17/09/1989"), {
    dobIso: "1989-09-17",
    dobFormatted: "17/09/1989",
  });
  assert.throws(
    () => normalizeDobFormats("invalid-date"),
    AstroProviderError
  );
});

test("didMoonCrossBoundary detects sign/nakshatra changes across birth day", () => {
  const bundleSame = makeRawAstroBundle({ moonCrossed: false });
  assert.equal(
    didMoonCrossBoundary(bundleSame.planetDetails, bundleSame.planetDetails),
    false
  );

  const bundleCrossed = makeRawAstroBundle({ moonCrossed: true });
  assert.equal(
    didMoonCrossBoundary(
      bundleCrossed.moonBoundaryCheck!.midnightPlanets,
      bundleCrossed.moonBoundaryCheck!.endOfDayPlanets
    ),
    true
  );
});

test("normalizeAstroBundle enforces precision rules for exact vs approx_window vs date_only", () => {
  const exactRaw = makeRawAstroBundle({ includeDivisionals: true });
  const exactNorm = normalizeAstroBundle({
    raw: exactRaw,
    dobIso: "1989-09-17",
    effectiveTob: "20:54",
    precisionMode: "exact",
    moonBoundaryFlag: false,
  });

  assert.equal(exactNorm.divisionalChartsIncluded, true);
  assert.ok(exactNorm.corePlacements.ascendant);
  assert.ok(exactNorm.divisionalCharts.D9);
  assert.ok(exactNorm.divisionalCharts.D10);
  assert.ok(exactNorm.divisionalCharts.D30);
  assert.equal(exactNorm.corePlacements.moon?.house, 1);

  const fallbackRaw = makeRawAstroBundle({ includeDivisionals: false });
  for (const mode of ["approx_window", "date_only"] as const) {
    const norm = normalizeAstroBundle({
      raw: fallbackRaw,
      dobIso: "1989-09-17",
      effectiveTob: mode === "date_only" ? "12:00" : "09:00",
      precisionMode: mode,
      moonBoundaryFlag: mode === "date_only",
    });

    assert.equal(norm.divisionalChartsIncluded, false);
    assert.equal(norm.corePlacements.ascendant, null);
    assert.equal(norm.divisionalCharts.D9, null);
    assert.equal(norm.divisionalCharts.D10, null);
    assert.equal(norm.divisionalCharts.D30, null);
    for (const p of norm.corePlacements.planets) {
      assert.equal(p.house, null, `House must be null in ${mode}`);
    }
    assert.equal(norm.moonBoundaryFlag, mode === "date_only");
  }
});

test("VedicAstroApiProvider.fetchChartBundle routes 8 calls for exact, 5 for approx_window, and 7 for date_only", async () => {
  const prevKey = process.env.VEDIC_ASTRO_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.VEDIC_ASTRO_API_KEY = "unit-test-key";

  const requestedPaths: string[] = [];
  const raw = makeRawAstroBundle({ moonCrossed: true });

  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    );
    requestedPaths.push(url.pathname);

    let payload: unknown = raw.planetDetails;
    if (url.pathname.includes("maha-dasha")) payload = raw.mahaDasha;
    else if (url.pathname.includes("antar-dasha")) payload = raw.antarDasha;
    else if (url.pathname.includes("sade-sati")) payload = raw.sadeSatiTable;
    else if (url.pathname.includes("numerology")) payload = raw.numerology;
    else if (url.pathname.includes("divisional-charts")) {
      payload = raw.divisionalD9;
    } else if (url.searchParams.get("tob") === "23:59") {
      payload = raw.moonBoundaryCheck!.endOfDayPlanets;
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const provider = new VedicAstroApiProvider();

    // 1. exact -> 8 calls
    requestedPaths.length = 0;
    const exactRes = await provider.fetchChartBundle({
      firstName: "Aarav",
      dob: "1989-09-17",
      tob: "20:54",
      precisionMode: "exact",
      birthCity: "Muzaffarnagar, India",
      lat: 29.47,
      lon: 77.7,
      tz: 5.5,
    });
    assert.equal(exactRes.apiCallsMade, 8);
    assert.equal(requestedPaths.length, 8);
    assert.equal(exactRes.normalizedChartJson.divisionalChartsIncluded, true);

    // 2. approx_window -> 5 calls
    requestedPaths.length = 0;
    const windowRes = await provider.fetchChartBundle({
      firstName: "Aarav",
      dob: "1989-09-17",
      birthWindow: "morning",
      precisionMode: "approx_window",
      birthCity: "Muzaffarnagar, India",
      lat: 29.47,
      lon: 77.7,
      tz: 5.5,
    });
    assert.equal(windowRes.apiCallsMade, 5);
    assert.equal(requestedPaths.length, 5);
    assert.equal(windowRes.effectiveTob, "09:00");
    assert.equal(windowRes.normalizedChartJson.corePlacements.ascendant, null);

    // 3. date_only -> 7 calls + moonBoundaryFlag = true
    requestedPaths.length = 0;
    const dobRes = await provider.fetchChartBundle({
      firstName: "Aarav",
      dob: "1989-09-17",
      precisionMode: "date_only",
      birthCity: "Muzaffarnagar, India",
      lat: 29.47,
      lon: 77.7,
      tz: 5.5,
    });
    assert.equal(dobRes.apiCallsMade, 7);
    assert.equal(requestedPaths.length, 7);
    assert.equal(dobRes.effectiveTob, "12:00");
    assert.equal(dobRes.moonBoundaryFlag, true);
  } finally {
    globalThis.fetch = originalFetch;
    if (prevKey === undefined) delete process.env.VEDIC_ASTRO_API_KEY;
    else process.env.VEDIC_ASTRO_API_KEY = prevKey;
  }
});
