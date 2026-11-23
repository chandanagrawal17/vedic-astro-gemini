import test from "node:test";
import assert from "node:assert/strict";
import type { AstroProvider } from "@/lib/astro/provider";
import { calculateAndPersistChart } from "@/lib/supabase/chartSession";
import { InMemorySupabaseAdmin } from "./helpers/mockSupabase";
import { makeChartBundleResult } from "./helpers/fixtures";

function makeSpyAstroProvider() {
  let fetchCount = 0;
  const provider: AstroProvider = {
    providerName: "spy-astro",
    async searchLocation() {
      return [];
    },
    async fetchChartBundle(input) {
      fetchCount += 1;
      return makeChartBundleResult(input.precisionMode);
    },
  };
  return {
    provider,
    getFetchCount: () => fetchCount,
  };
}

test("calculateAndPersistChart fetches once, persists raw+normalized chart in DB, and never re-calls AstroProvider on cache hits", async () => {
  const db = new InMemorySupabaseAdmin();
  const spy = makeSpyAstroProvider();

  const baseInput = {
    firstName: "Aarav",
    birthDate: "1989-09-17",
    birthCity: "Muzaffarnagar, India",
    birthLat: 29.47,
    birthLon: 77.7,
    birthTz: 5.5,
    precisionMode: "exact" as const,
    birthTime: "20:54",
    birthWindow: null,
    relationshipStatus: "married" as const,
    careerMode: "employed" as const,
    careerField: "Software Engineering",
  };

  // 1. Cache miss -> 1 AstroProvider call, stored in natal_charts
  const first = await calculateAndPersistChart(
    { ...baseInput, sessionToken: "pb_sess_1" },
    { admin: db.asAdminClient(), astroProvider: spy.provider }
  );
  assert.equal(first.cached, false);
  assert.equal(first.apiCallsMade, 8);
  assert.equal(spy.getFetchCount(), 1);
  assert.equal(db.tables.natal_charts.length, 1);

  // 2. Repeat same sessionToken (even with updated careerField) -> 0 AstroProvider calls
  const second = await calculateAndPersistChart(
    {
      ...baseInput,
      careerField: "AI Systems",
      sessionToken: "pb_sess_1",
    },
    { admin: db.asAdminClient(), astroProvider: spy.provider }
  );
  assert.equal(second.cached, true);
  assert.equal(second.apiCallsMade, 0);
  assert.equal(second.chartId, first.chartId);
  assert.equal(spy.getFetchCount(), 1);

  // 3. Brand-new sessionToken with matching birth coordinates -> copies DB math with 0 AstroProvider calls
  const third = await calculateAndPersistChart(
    { ...baseInput, firstName: "Guest2", sessionToken: "pb_sess_2" },
    { admin: db.asAdminClient(), astroProvider: spy.provider }
  );
  assert.equal(third.cached, true);
  assert.equal(third.apiCallsMade, 0);
  assert.equal(spy.getFetchCount(), 1);
  assert.deepEqual(third.normalizedChart, first.normalizedChart);
});

test("calculateAndPersistChart handles date_only (tob = null) caching and invalidates stale blueprints on birth-time refresh", async () => {
  const db = new InMemorySupabaseAdmin();
  const spy = makeSpyAstroProvider();

  const dobInput = {
    firstName: "Maya",
    birthDate: "1989-09-17",
    birthCity: "Chicago, IL",
    birthLat: 41.8781,
    birthLon: -87.6298,
    birthTz: -6,
    precisionMode: "dob_only" as const,
    birthTime: null,
    birthWindow: null,
    relationshipStatus: "single" as const,
    careerMode: "founder" as const,
    careerField: "SaaS",
  };

  const first = await calculateAndPersistChart(
    { ...dobInput, sessionToken: "pb_dob_1" },
    { admin: db.asAdminClient(), astroProvider: spy.provider }
  );
  assert.equal(first.cached, false);
  assert.equal(first.apiCallsMade, 7);
  assert.equal(spy.getFetchCount(), 1);

  // Seed a blueprint tied to first.chartId
  db.tables.blueprints.push({
    id: "bp-1",
    chart_id: first.chartId,
    session_token: "pb_dob_1",
    model_version: "gemini-3.8-flash",
    hook_proof_json: {},
    full_blueprint_json: {},
    is_paid: false,
  });

  // New sessionToken with same dob_only birth inputs -> hits cache (0 calls)
  const cachedDob = await calculateAndPersistChart(
    { ...dobInput, sessionToken: "pb_dob_2" },
    { admin: db.asAdminClient(), astroProvider: spy.provider }
  );
  assert.equal(cachedDob.cached, true);
  assert.equal(cachedDob.apiCallsMade, 0);
  assert.equal(spy.getFetchCount(), 1);

  // Upgrading pb_dob_1 with exact birth time invalidates stale blueprint and recalculates
  const upgraded = await calculateAndPersistChart(
    {
      ...dobInput,
      precisionMode: "exact",
      birthTime: "08:30",
      sessionToken: "pb_dob_1",
    },
    { admin: db.asAdminClient(), astroProvider: spy.provider }
  );
  assert.equal(upgraded.cached, false);
  assert.equal(upgraded.apiCallsMade, 8);
  assert.equal(spy.getFetchCount(), 2);
  assert.equal(
    db.tables.blueprints.length,
    0,
    "Stale blueprint must be deleted when birth time is upgraded"
  );
});
