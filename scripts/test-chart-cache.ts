import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

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

import { POST as calculateChartRoute } from "../src/app/api/charts/calculate/route";
import { getSupabaseAdminClient } from "../src/lib/supabase/admin";

interface CalculateResponse {
  cached: boolean;
  apiCallsMade: number;
  chartId: string;
  sessionId: string;
  sessionToken: string;
  precisionMode: string;
  moonBoundaryFlag: boolean;
  normalizedChart: unknown;
  error?: string;
}

function createVedicFetchSpy() {
  const originalFetch = globalThis.fetch;
  let vedicHttpCalls = 0;
  const vedicPaths: string[] = [];

  globalThis.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const urlStr =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (urlStr.includes("vedicastroapi.com")) {
      vedicHttpCalls += 1;
      try {
        vedicPaths.push(new URL(urlStr).pathname);
      } catch {
        vedicPaths.push(urlStr);
      }
    }

    return originalFetch(input, init);
  };

  return {
    getCount: () => vedicHttpCalls,
    getPaths: () => [...vedicPaths],
    reset: () => {
      vedicHttpCalls = 0;
      vedicPaths.length = 0;
    },
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

async function callCalculateEndpoint(
  payload: Record<string, unknown>
): Promise<{ status: number; body: CalculateResponse }> {
  const req = new NextRequest("http://localhost:3000/api/charts/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const res = await calculateChartRoute(req);
  const body = (await res.json()) as CalculateResponse;
  return { status: res.status, body };
}

async function runTests() {
  const admin = getSupabaseAdminClient();
  const spy = createVedicFetchSpy();
  const createdTokens: string[] = [];

  const exactBirthPayload = {
    firstName: "CacheTest",
    birthDate: "1984-05-11",
    birthCity: "Austin, TX",
    birthLat: 30.2672,
    birthLon: -97.7431,
    birthTz: -6,
    precisionMode: "exact",
    birthTime: "04:17",
    birthWindow: null,
    relationshipStatus: "single",
    careerMode: "employed",
    careerField: "Engineering",
  };

  const dateOnlyBirthPayload = {
    firstName: "CacheDateOnly",
    birthDate: "1986-08-23",
    birthCity: "Seattle, WA",
    birthLat: 47.6062,
    birthLon: -122.3321,
    birthTz: -8,
    precisionMode: "dob_only",
    birthTime: null,
    birthWindow: null,
    relationshipStatus: "married",
    careerMode: "founder",
    careerField: "Design",
  };

  try {
    // Ensure a clean starting slate if an earlier test aborted mid-run
    await admin
      .from("natal_charts")
      .delete()
      .in("dob", [exactBirthPayload.birthDate, dateOnlyBirthPayload.birthDate])
      .like("session_token", "pb_test_cache_%");

    // Also check if another non-test row already exists for those synthetic dates
    const { data: preExistingExact } = await admin
      .from("natal_charts")
      .select("id")
      .eq("dob", exactBirthPayload.birthDate)
      .eq("tob", exactBirthPayload.birthTime)
      .limit(1);

    // =========================================================================
    // Test 1: First call fetches from VedicAstroAPI and stores in Supabase DB
    // =========================================================================
    console.log("\n=== Test 1: Initial VedicAstroAPI Fetch & DB Persistence ===");
    const token1 = `pb_test_cache_1_${Date.now()}`;
    createdTokens.push(token1);

    spy.reset();
    const res1 = await callCalculateEndpoint({
      ...exactBirthPayload,
      sessionToken: token1,
    });
    assert.equal(res1.status, 200, `Expected 200, got ${res1.status}: ${res1.body.error}`);

    const expectedInitialCalls =
      preExistingExact && preExistingExact.length > 0 ? 0 : 8;
    if (expectedInitialCalls === 8) {
      assert.equal(res1.body.cached, false, "First call should be a cache miss");
      assert.equal(res1.body.apiCallsMade, 8, "Exact mode should report 8 VedicAstroAPI calls");
      assert.equal(
        spy.getCount(),
        8,
        `Network spy expected 8 VedicAstroAPI HTTP calls, saw ${spy.getCount()}`
      );
    }

    // Verify stored directly in Supabase natal_charts
    const { data: dbRow1, error: dbErr1 } = await admin
      .from("natal_charts")
      .select("id, session_token, raw_astro_json, normalized_chart_json")
      .eq("id", res1.body.chartId)
      .single();

    assert.equal(dbErr1, null, `DB lookup failed: ${dbErr1?.message}`);
    assert.ok(dbRow1, "Expected natal_charts row in Supabase");
    assert.ok(dbRow1.raw_astro_json?.planetDetails, "DB must store raw planetDetails");
    assert.ok(dbRow1.raw_astro_json?.mahaDasha, "DB must store raw mahaDasha");
    assert.ok(dbRow1.raw_astro_json?.antarDasha, "DB must store raw antarDasha");
    assert.ok(dbRow1.raw_astro_json?.sadeSatiTable, "DB must store raw sadeSatiTable");
    assert.ok(dbRow1.raw_astro_json?.numerology, "DB must store raw numerology");
    assert.ok(dbRow1.raw_astro_json?.divisionalD9, "DB must store raw divisionalD9");
    assert.ok(dbRow1.normalized_chart_json, "DB must store normalized_chart_json");

    console.log("Test 1 PASSED:", {
      chartId: res1.body.chartId,
      cached: res1.body.cached,
      apiCallsMade: res1.body.apiCallsMade,
      networkHttpCalls: spy.getCount(),
    });

    // =========================================================================
    // Test 2: Repeat call with same sessionToken hits DB with 0 API calls
    // =========================================================================
    console.log("\n=== Test 2: Repeat Call (Same Session) Uses DB Cache (0 API Calls) ===");
    spy.reset();
    const res2 = await callCalculateEndpoint({
      ...exactBirthPayload,
      relationshipStatus: "married", // profile tweak, same birth inputs
      careerField: "Product",
      sessionToken: token1,
    });
    assert.equal(res2.status, 200);
    assert.equal(res2.body.cached, true, "Repeat call must return cached: true");
    assert.equal(res2.body.apiCallsMade, 0, "Repeat call must report 0 API calls");
    assert.equal(
      spy.getCount(),
      0,
      `Network spy expected 0 VedicAstroAPI calls on repeat, saw ${spy.getCount()}`
    );
    assert.equal(res2.body.chartId, res1.body.chartId, "Must reuse same chartId");
    assert.deepEqual(
      res2.body.normalizedChart,
      res1.body.normalizedChart,
      "Cached normalizedChart must match original"
    );

    console.log("Test 2 PASSED:", {
      chartId: res2.body.chartId,
      cached: res2.body.cached,
      apiCallsMade: res2.body.apiCallsMade,
      networkHttpCalls: spy.getCount(),
    });

    // =========================================================================
    // Test 3: Brand new sessionToken with identical birth data -> 0 API calls
    // =========================================================================
    console.log("\n=== Test 3: New Session With Same Birth Data Uses DB Cache (0 API Calls) ===");
    const token2 = `pb_test_cache_2_${Date.now()}`;
    createdTokens.push(token2);

    spy.reset();
    const res3 = await callCalculateEndpoint({
      ...exactBirthPayload,
      firstName: "AnotherSession",
      sessionToken: token2,
    });
    assert.equal(res3.status, 200);
    assert.equal(res3.body.cached, true, "Cross-session match must return cached: true");
    assert.equal(res3.body.apiCallsMade, 0, "Cross-session match must report 0 API calls");
    assert.equal(
      spy.getCount(),
      0,
      `Network spy expected 0 VedicAstroAPI calls across sessions, saw ${spy.getCount()}`
    );
    assert.deepEqual(
      res3.body.normalizedChart,
      res1.body.normalizedChart,
      "Reused normalizedChart must match stored chart"
    );

    const { data: dbRow3 } = await admin
      .from("natal_charts")
      .select("raw_astro_json")
      .eq("id", res3.body.chartId)
      .single();
    assert.deepEqual(
      dbRow3?.raw_astro_json,
      dbRow1.raw_astro_json,
      "New session row must copy stored raw_astro_json from DB cache"
    );

    console.log("Test 3 PASSED:", {
      chartId: res3.body.chartId,
      cached: res3.body.cached,
      apiCallsMade: res3.body.apiCallsMade,
      networkHttpCalls: spy.getCount(),
    });

    // =========================================================================
    // Test 4: date_only Mode (tob = null) Caching -> 0 API calls on repeat
    // =========================================================================
    console.log("\n=== Test 4: date_only Mode (tob = null) Caching ===");
    const token3 = `pb_test_cache_dob1_${Date.now()}`;
    const token4 = `pb_test_cache_dob2_${Date.now()}`;
    createdTokens.push(token3, token4);

    spy.reset();
    const dobRes1 = await callCalculateEndpoint({
      ...dateOnlyBirthPayload,
      sessionToken: token3,
    });
    assert.equal(dobRes1.status, 200);
    const dobFirstNetworkCalls = spy.getCount();

    spy.reset();
    const dobRes2 = await callCalculateEndpoint({
      ...dateOnlyBirthPayload,
      sessionToken: token4,
    });
    assert.equal(dobRes2.status, 200);
    assert.equal(dobRes2.body.cached, true, "date_only repeat must hit DB cache");
    assert.equal(dobRes2.body.apiCallsMade, 0, "date_only repeat must report 0 API calls");
    assert.equal(
      spy.getCount(),
      0,
      `Network spy expected 0 VedicAstroAPI calls for date_only repeat, saw ${spy.getCount()}`
    );
    assert.deepEqual(dobRes2.body.normalizedChart, dobRes1.body.normalizedChart);

    console.log("Test 4 PASSED:", {
      firstCallNetworkCalls: dobFirstNetworkCalls,
      secondCallCached: dobRes2.body.cached,
      secondCallApiCalls: dobRes2.body.apiCallsMade,
      secondCallNetworkCalls: spy.getCount(),
    });

    console.log("\nALL CHART DB CACHING TESTS PASSED!");
  } finally {
    spy.restore();
    if (createdTokens.length > 0) {
      await admin.from("natal_charts").delete().in("session_token", createdTokens);
    }
  }
}

runTests().catch((err) => {
  console.error("\nTEST FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
