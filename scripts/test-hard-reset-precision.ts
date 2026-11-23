/**
 * Verification Benchmark Script — Hook #1: High-Precision Hard Reset Engine
 *
 * Run with: npx tsx scripts/test-hard-reset-precision.ts
 */

import assert from "node:assert/strict";
import { computeHardResetTelemetry } from "../src/lib/astro/hardResetEngine";
import { auditBlueprintOutput } from "../src/lib/llm/guardrails";
import { getBlueprintById, synthesizeAndPersistBlueprint } from "../src/lib/supabase/blueprintSession";
import {
  makeChandanExactChart,
  makeChartBundleResult,
  makeCleanBlueprintPayload,
} from "../tests/helpers/fixtures";
import { InMemorySupabaseAdmin } from "../tests/helpers/mockSupabase";
import type { LlmProvider } from "../src/lib/llm/provider";

async function main() {
  const refDate = new Date("2026-11-22T12:00:00Z");

  // Test 1: Chandan Benchmark — exact (17/09/1989, 20:56, Muzaffarnagar, India)
  const chandanChart = makeChandanExactChart().normalizedChartJson;
  const hrExact = computeHardResetTelemetry(
    chandanChart,
    {
      firstName: "Chandan",
      dobIso: "1989-09-17",
      relationshipStatus: "married",
      careerMode: "employed_hybrid",
      careerField: "Tech / Software Development Management",
    },
    "exact",
    refDate
  );

  console.log("[Test 1] Chandan Exact Hard Reset Chapters:");
  for (const ch of hrExact.selected_chapters) {
    console.log(
      `  - ${ch.year_range}: ${ch.flashpoints.map((f) => f.month_range).join(" | ")}`
    );
  }
  console.log(
    `  Upcoming prep window: ${hrExact.upcoming_prep_window.month_range}`
  );

  assert.ok(hrExact.selected_chapters.some((c) => c.year_range.includes("2022")));
  assert.ok(hrExact.selected_chapters.some((c) => c.year_range.includes("2020")));
  assert.ok(hrExact.upcoming_prep_window.month_range.includes("2027"));

  // Test 2: Missing Birth Time — date_only (15/06/1992, Chicago, IL)
  const dateOnlyChart = makeChartBundleResult("date_only").normalizedChartJson;
  const hrDateOnly = computeHardResetTelemetry(
    dateOnlyChart,
    {
      firstName: "Alex",
      dobIso: "1992-06-15",
      relationshipStatus: "single",
      careerMode: "employed",
      careerField: "Finance",
    },
    "date_only",
    refDate
  );
  assert.equal(hrDateOnly.anchor_mode, "lunar_natal_planets");
  assert.ok(hrDateOnly.selected_chapters.length >= 2);
  console.log("[Test 2] date_only Lunar/Natal fallback passed.");

  // Test 3: Paywall Redaction & Month-Leak + Cliché Guardrail
  const poisoned = makeCleanBlueprintPayload();
  poisoned.hook_proof_json.hardReset.concreteRealLifeThemes[0] =
    "During Late Oct – Nov 2022, a period of deep transformation changed everything.";
  const audit = auditBlueprintOutput(poisoned);
  assert.equal(audit.passed, false);
  assert.ok(audit.violations.some((v) => v.category === "free_tier_month_leak"));
  assert.ok(audit.violations.some((v) => v.category === "horoscope_cliche"));

  // Verify unpaid GET returns full_blueprint_json: null
  process.env.DEV_UNLOCK_PREVIEW = "false";
  const db = new InMemorySupabaseAdmin();
  const chartId = "22222222-2222-4222-8222-222222222222";
  const sessionToken = "pb_hr_bench_token";
  db.tables.natal_charts.push({
    id: chartId,
    user_id: null,
    session_token: sessionToken,
    dob: "1989-09-17",
    tob: "20:56",
    birth_window: null,
    precision_mode: "exact",
    birth_city: "Muzaffarnagar, India",
    lat: 29.47,
    lon: 77.7,
    tz: 5.5,
    moon_boundary_flag: false,
    first_name: "Chandan",
    relationship_status: "married",
    career_mode: "employed_hybrid",
    career_field: "Tech",
    raw_astro_json: {},
    normalized_chart_json: chandanChart,
  });

  const cleanStub: LlmProvider = {
    providerName: "bench-stub",
    modelName: "gemini-3.8-flash-bench",
    async generateStructuredJson(_s, _u, schema) {
      return schema.parse(makeCleanBlueprintPayload());
    },
  };

  await synthesizeAndPersistBlueprint({
    chartId,
    sessionToken,
    llmProvider: cleanStub,
    admin: db.asAdminClient(),
  });

  const unpaid = await getBlueprintById({
    chartIdOrToken: chartId,
    sessionToken,
    admin: db.asAdminClient(),
  });
  assert.equal(unpaid.full_blueprint_json, null);
  console.log("[Test 3] Paywall redaction & month-leak guardrail passed.");
  console.log("ALL HARD RESET BENCHMARK CHECKS PASSED.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
