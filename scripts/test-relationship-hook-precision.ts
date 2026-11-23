/**
 * Verification Benchmark Script — Hook #2: Relationship Mirror Engine
 *
 * Run with: npx tsx scripts/test-relationship-hook-precision.ts
 */

import assert from "node:assert/strict";
import { computeRelationshipTelemetry } from "../src/lib/astro/relationshipEngine";
import {
  RelationshipDeepDiveSchema,
  RelationshipProofSchema,
} from "../src/lib/llm/blueprintSchema";
import { auditBlueprintOutput } from "../src/lib/llm/guardrails";
import type { LlmProvider } from "../src/lib/llm/provider";
import {
  getBlueprintById,
  synthesizeAndPersistBlueprint,
} from "../src/lib/supabase/blueprintSession";
import {
  makeChandanExactChart,
  makeChartBundleResult,
  makeCleanBlueprintPayload,
} from "../tests/helpers/fixtures";
import { InMemorySupabaseAdmin } from "../tests/helpers/mockSupabase";

async function main() {
  const refDate = new Date("2026-11-22T12:00:00Z");
  const chandanChart = makeChandanExactChart().normalizedChartJson;

  // Test 1: Chandan Single Benchmark — exact (17/09/1989, 20:56, Muzaffarnagar, India)
  const relSingle = computeRelationshipTelemetry(
    chandanChart,
    { firstName: "Chandan", relationshipStatus: "single" },
    "exact",
    refDate
  );

  console.log("[Test 1] Chandan Single Past Shift:", relSingle.freeLayerSignals.pastLoveShift);
  console.log(
    "  Forward 12m windows:",
    relSingle.paidLayerSignals.forward12mTiming.upcomingWindows
      .map((w) => `${w.monthRange} (${w.windowType})`)
      .join(" | ")
  );

  assert.equal(relSingle.freeLayerSignals.pastLoveShift.yearRange, "2022 – 2023");
  assert.equal(relSingle.paidLayerSignals.forward12mTiming.upcomingWindows.length, 3);

  const singleClean = makeCleanBlueprintPayload("single");
  singleClean.hook_proof_json.relationship.pastLoveShift.yearRange =
    relSingle.freeLayerSignals.pastLoveShift.yearRange;
  singleClean.hook_proof_json.relationship.lockedTimingYearLabel =
    relSingle.freeLayerSignals.lockedTimingYearLabel;
  if (singleClean.full_blueprint_json.relationship.relationshipStatus === "single") {
    singleClean.full_blueprint_json.relationship.next12Months.tightMonthlyWindows =
      singleClean.full_blueprint_json.relationship.next12Months.tightMonthlyWindows.map(
        (w, i) => ({
          ...w,
          id: relSingle.paidLayerSignals.forward12mTiming.upcomingWindows[i].id,
          monthRange:
            relSingle.paidLayerSignals.forward12mTiming.upcomingWindows[i].monthRange,
        })
      );
  }
  assert.ok(RelationshipProofSchema.safeParse(singleClean.hook_proof_json.relationship).success);
  assert.ok(RelationshipDeepDiveSchema.safeParse(singleClean.full_blueprint_json.relationship).success);
  assert.equal(
    auditBlueprintOutput(singleClean, { relationshipTelemetry: relSingle }).passed,
    true
  );

  // Test 2: Branch Isolation — married & dating
  const relMarried = computeRelationshipTelemetry(
    chandanChart,
    { firstName: "Chandan", relationshipStatus: "married" },
    "exact",
    refDate
  );
  const relDating = computeRelationshipTelemetry(
    chandanChart,
    { firstName: "Chandan", relationshipStatus: "dating" },
    "exact",
    refDate
  );
  assert.equal(relMarried.userContext.relationshipStatus, "married");
  assert.equal(relDating.userContext.relationshipStatus, "dating");
  console.log("[Test 2] Single / Dating / Married branch isolation verified.");

  // Test 3: Missing Birth Time — date_only (15/06/1992, Chicago, IL)
  const dateOnlyChart = makeChartBundleResult("date_only").normalizedChartJson;
  const relDateOnly = computeRelationshipTelemetry(
    dateOnlyChart,
    { firstName: "Maya", relationshipStatus: "single" },
    "date_only",
    refDate
  );
  assert.equal(relDateOnly.anchorMode, "lunarVenusFallback");
  assert.ok(relDateOnly.upgradeHint && relDateOnly.upgradeHint.length > 20);
  console.log("[Test 3] date_only Moon/Venus fallback verified.");

  // Test 4: Guardrail & Redaction Check
  const poisoned = makeCleanBlueprintPayload("single");
  poisoned.hook_proof_json.relationship.caughtRedHandedTell =
    "Like a twin flame, you fear divorce with your spouse around Dec 2026 – Jan 2027.";
  const audit = auditBlueprintOutput(poisoned, {
    relationshipTelemetry: relSingle,
  });
  assert.equal(audit.passed, false);
  const cats = new Set(audit.violations.map((v) => v.category));
  assert.ok(cats.has("love_cliche"));
  assert.ok(cats.has("fatalistic_clinical"));
  assert.ok(cats.has("cross_branch_leak"));
  assert.ok(cats.has("free_tier_month_leak"));

  process.env.DEV_UNLOCK_PREVIEW = "false";
  const db = new InMemorySupabaseAdmin();
  const chartId = "55555555-5555-4555-8555-555555555555";
  const sessionToken = "pb_rel_bench_token";
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
    relationship_status: "single",
    career_mode: "employed",
    career_field: "Tech",
    raw_astro_json: {},
    normalized_chart_json: chandanChart,
  });

  const cleanStub: LlmProvider = {
    providerName: "bench-stub",
    modelName: "gemini-3.8-flash-bench",
    async generateStructuredJson(_s, _u, schema) {
      return schema.parse(makeCleanBlueprintPayload("single"));
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
  console.log("[Test 4] Guardrails & server-side redaction passed.");
  console.log("ALL RELATIONSHIP HOOK BENCHMARK CHECKS PASSED.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
