import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

// Load .env.local when running via tsx outside Next.js
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnvLocal();

import { VedicAstroApiProvider } from "../src/lib/astro/vedicAstroProvider";
import { calculateAndPersistChart } from "../src/lib/supabase/chartSession";
import { getSupabaseAdminClient } from "../src/lib/supabase/admin";

async function runTests() {
  const provider = new VedicAstroApiProvider();

  console.log("\n=== Test A: Exact Mode (17/09/1989, 20:54, Muzaffarnagar, India) ===");
  const muzaffarnagarMatches = await provider.searchLocation("Muzaffarnagar, India");
  assert.ok(muzaffarnagarMatches.length > 0, "Expected geo-search result for Muzaffarnagar, India");
  const muz = muzaffarnagarMatches[0];
  console.log("Location:", muz);

  const testA = await provider.fetchChartBundle({
    firstName: "Aarav",
    dob: "17/09/1989",
    tob: "20:54",
    precisionMode: "exact",
    birthCity: `${muz.city}, ${muz.country}`,
    lat: muz.lat,
    lon: muz.lon,
    tz: muz.tz,
  });

  assert.equal(testA.effectiveTob, "20:54");
  assert.equal(testA.apiCallsMade, 8, "Expected 5 core + 3 divisional (D9/D10/D30) API calls");
  assert.ok(testA.rawAstroJson.planetDetails, "Missing planetDetails");
  assert.ok(testA.rawAstroJson.mahaDasha, "Missing mahaDasha");
  assert.ok(testA.rawAstroJson.antarDasha, "Missing antarDasha");
  assert.ok(testA.rawAstroJson.sadeSatiTable, "Missing sadeSatiTable");
  assert.ok(testA.rawAstroJson.numerology, "Missing numerology");
  assert.ok(testA.rawAstroJson.divisionalD9, "Missing D9");
  assert.ok(testA.rawAstroJson.divisionalD10, "Missing D10");
  assert.ok(testA.rawAstroJson.divisionalD30, "Missing D30");
  assert.ok(testA.normalizedChartJson.divisionalChartsIncluded);
  console.log("Test A PASSED:", {
    apiCallsMade: testA.apiCallsMade,
    ascendant: testA.normalizedChartJson.corePlacements.ascendant?.zodiac,
    moon: testA.normalizedChartJson.corePlacements.moon?.zodiac,
    hardResetWindow: testA.normalizedChartJson.hardResetWindow.dateRange,
    eras: {
      era1: testA.normalizedChartJson.eras.era1.dateRange,
      era2: testA.normalizedChartJson.eras.era2.dateRange,
      era3: testA.normalizedChartJson.eras.era3.dateRange,
    },
    numerologyDestiny: testA.normalizedChartJson.numerology.destinyNumber,
  });

  console.log("\n=== Test B: Date-Only Mode (15/06/1992, Chicago, IL) ===");
  const chicagoMatches = await provider.searchLocation("Chicago, United States");
  const chi = chicagoMatches[0] ?? {
    city: "Chicago",
    state: "Illinois",
    country: "United States",
    lat: 41.8781,
    lon: -87.6298,
    tz: -6,
  };
  console.log("Location:", chi);

  const testB = await provider.fetchChartBundle({
    firstName: "Maya",
    dob: "15/06/1992",
    tob: null,
    precisionMode: "date_only",
    birthCity: `${chi.city}, ${chi.state || chi.country}`,
    lat: chi.lat,
    lon: chi.lon,
    tz: chi.tz,
  });

  assert.equal(testB.effectiveTob, "12:00", "date_only must default to 12:00");
  assert.equal(testB.rawAstroJson.divisionalD9, null, "D9 must be skipped for date_only");
  assert.equal(testB.rawAstroJson.divisionalD10, null, "D10 must be skipped for date_only");
  assert.equal(testB.rawAstroJson.divisionalD30, null, "D30 must be skipped for date_only");
  assert.equal(testB.normalizedChartJson.divisionalChartsIncluded, false);
  assert.equal(testB.normalizedChartJson.corePlacements.ascendant, null, "Ascendant must be null in date_only");
  assert.equal(typeof testB.moonBoundaryFlag, "boolean", "moon_boundary_flag must be boolean");
  assert.equal(testB.apiCallsMade, 7, "Expected 5 core + 2 moon-boundary checks");
  console.log("Test B PASSED:", {
    effectiveTob: testB.effectiveTob,
    moonBoundaryFlag: testB.moonBoundaryFlag,
    apiCallsMade: testB.apiCallsMade,
    hardResetWindow: testB.normalizedChartJson.hardResetWindow.dateRange,
    eras: {
      era1: testB.normalizedChartJson.eras.era1.dateRange,
      era2: testB.normalizedChartJson.eras.era2.dateRange,
      era3: testB.normalizedChartJson.eras.era3.dateRange,
    },
  });

  console.log("\n=== Test C: Supabase Caching Check ===");
  const testToken = `test_cache_${Date.now()}`;
  const admin = getSupabaseAdminClient();

  try {
    const firstCall = await calculateAndPersistChart({
      firstName: "Aarav",
      birthDate: "1989-09-17",
      birthCity: "Muzaffarnagar, India",
      birthLat: muz.lat,
      birthLon: muz.lon,
      birthTz: muz.tz,
      precisionMode: "exact",
      birthTime: "20:54",
      birthWindow: null,
      relationshipStatus: "single",
      careerMode: "employed",
      careerField: "Engineering",
      sessionToken: testToken,
    });

    const secondCall = await calculateAndPersistChart({
      firstName: "Aarav",
      birthDate: "1989-09-17",
      birthCity: "Muzaffarnagar, India",
      birthLat: muz.lat,
      birthLon: muz.lon,
      birthTz: muz.tz,
      precisionMode: "exact",
      birthTime: "20:54",
      birthWindow: null,
      relationshipStatus: "single",
      careerMode: "employed",
      careerField: "Engineering",
      sessionToken: testToken,
    });

    assert.equal(secondCall.cached, true, "Second call must hit cache");
    assert.equal(secondCall.apiCallsMade, 0, "Second call must make 0 VedicAstroAPI calls");
    assert.equal(secondCall.chartId, firstCall.chartId, "Must return same cached chartId");

    console.log("Test C PASSED:", {
      firstCallCached: firstCall.cached,
      firstCallApiCalls: firstCall.apiCallsMade,
      secondCallCached: secondCall.cached,
      secondCallApiCalls: secondCall.apiCallsMade,
      chartId: secondCall.chartId,
    });
  } finally {
    // Clean up temporary test row
    await admin.from("natal_charts").delete().eq("session_token", testToken);
  }

  console.log("\nALL SLICE 2 TESTS PASSED!");
}

runTests().catch((err) => {
  console.error("\nTEST FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
