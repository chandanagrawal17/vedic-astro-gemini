/**
 * Verification Benchmark Script — Hook #3: Career & Business Alignment Engine
 *
 * Run with: npx tsx scripts/test-career-hook-precision.ts
 */

import assert from "node:assert/strict";
import { computeCareerTelemetry } from "../src/lib/astro/careerEngine";
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
  const chandanChart = makeChandanExactChart().normalizedChartJson;

  // Test 1: Chandan Employed Hybrid Benchmark — exact
  const careerExact = computeCareerTelemetry(
    chandanChart,
    {
      firstName: "Chandan",
      careerMode: "employed_hybrid",
      careerField: "Tech / Software Development Management",
    },
    "exact",
    refDate
  );

  console.log("[Test 1] Chandan Employed Hybrid Scores:", careerExact.scores);
  console.log(
    "  Alternative lanes:",
    careerExact.natal_work_profile.alternative_lanes.join(", ")
  );
  console.log(
    "  Forward 12m windows:",
    careerExact.forward_12m_timing.upcoming_windows
      .map((w) => `${w.month_range} (${w.window_type})`)
      .join(" | ")
  );

  assert.ok(
    careerExact.scores.hybrid_side_build_score >
      careerExact.scores.going_solo_score &&
      careerExact.scores.going_solo_score > careerExact.scores.day_job_score
  );
  assert.ok(careerExact.natal_work_profile.alternative_lanes.length >= 3);
  assert.equal(careerExact.forward_12m_timing.upcoming_windows.length, 3);

  // Test 2: in_transition Empathy Benchmark
  const transitionTelemetry = computeCareerTelemetry(
    chandanChart,
    {
      firstName: "Chandan",
      careerMode: "in_transition",
      careerField: "Tech / Software Development Management",
    },
    "exact",
    refDate
  );
  assert.equal(transitionTelemetry.user_context.career_mode, "in_transition");

  const badTransition = makeCleanBlueprintPayload();
  badTransition.hook_proof_json.career.whyItFeelsEmptyOrShifting =
    "Don't quit your job while you figure out what is next at your day job.";
  const transitionAudit = auditBlueprintOutput(badTransition, {
    careerTelemetry: transitionTelemetry,
  });
  assert.equal(transitionAudit.passed, false);
  assert.ok(
    transitionAudit.violations.some((v) => v.category === "transition_empathy")
  );
  console.log("[Test 2] in_transition empathy guardrail passed.");

  // Test 3: Missing Birth Time — date_only (15/06/1992, Chicago, IL)
  const dateOnlyChart = makeChartBundleResult("date_only").normalizedChartJson;
  const careerDateOnly = computeCareerTelemetry(
    dateOnlyChart,
    {
      firstName: "Alex",
      careerMode: "employed",
      careerField: "Healthcare",
    },
    "date_only",
    refDate
  );
  for (const val of Object.values(careerDateOnly.scores)) {
    assert.ok(val >= 45 && val <= 88);
  }
  console.log("[Test 3] date_only Moon/Sun fallback passed:", careerDateOnly.scores);

  // Test 4: Guardrail & Redaction Check
  const poisoned = makeCleanBlueprintPayload();
  poisoned.hook_proof_json.career.whyYouAreGood =
    "Your surgical diagnostic Saturn edge peaks in Dec 2026 – Jan 2027.";
  const audit = auditBlueprintOutput(poisoned, { careerTelemetry: careerExact });
  assert.equal(audit.passed, false);
  const cats = new Set(audit.violations.map((v) => v.category));
  assert.ok(cats.has("corporate_buzzword"));
  assert.ok(cats.has("astrology_jargon"));
  assert.ok(cats.has("free_tier_month_leak"));

  process.env.DEV_UNLOCK_PREVIEW = "false";
  const db = new InMemorySupabaseAdmin();
  const chartId = "33333333-3333-4333-8333-333333333333";
  const sessionToken = "pb_career_bench_token";
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
    career_field: "Tech / Software Development Management",
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
  console.log("[Test 4] Guardrail & server redaction passed.");
  console.log("ALL CAREER HOOK BENCHMARK CHECKS PASSED.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
