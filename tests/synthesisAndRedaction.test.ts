import test from "node:test";
import assert from "node:assert/strict";
import { BlueprintGuardrailError } from "@/lib/llm/guardrails";
import type { LlmProvider } from "@/lib/llm/provider";
import { synthesizeBlueprint } from "@/lib/llm/synthesizeBlueprint";
import {
  BlueprintServiceError,
  getBlueprintById,
  saveBlueprintFeedback,
  synthesizeAndPersistBlueprint,
} from "@/lib/supabase/blueprintSession";
import { InMemorySupabaseAdmin } from "./helpers/mockSupabase";
import {
  makeChartBundleResult,
  makeCleanBlueprintPayload,
} from "./helpers/fixtures";

function makeStubLlmProvider(
  responses: Array<ReturnType<typeof makeCleanBlueprintPayload>>
): { provider: LlmProvider; getCalls: () => number } {
  let calls = 0;
  const provider: LlmProvider = {
    providerName: "stub-llm",
    modelName: "gemini-3.8-flash-test",
    async generateStructuredJson(_sys, _user, schema) {
      const idx = Math.min(calls, responses.length - 1);
      calls += 1;
      return schema.parse(structuredClone(responses[idx]));
    },
  };
  return { provider, getCalls: () => calls };
}

test("synthesizeBlueprint auto-repairs banned jargon on 1 retry and throws if retry still fails", async () => {
  const chart = makeChartBundleResult("exact").normalizedChartJson;
  const poisoned = makeCleanBlueprintPayload();
  poisoned.hook_proof_json.hardReset.description =
    "Your Rahu Mahadasha in the 10th house forced a tough reset.";
  const clean = makeCleanBlueprintPayload();

  // Pass 1 poisoned -> Pass 2 clean repair
  const repairStub = makeStubLlmProvider([poisoned, clean]);
  const repaired = await synthesizeBlueprint(
    {
      normalizedChart: chart,
      profile: {
        firstName: "Aarav",
        relationshipStatus: "married",
        careerMode: "employed",
        careerField: "Engineering",
      },
    },
    repairStub.provider
  );
  assert.equal(repaired.repairedAfterAudit, true);
  assert.equal(repaired.llmCallsMade, 2);
  assert.equal(repaired.payload.hook_proof_json.upgrade_hint, null);
  assert.equal(repaired.payload.hook_proof_json.relationship.branch, "partnered");

  // Pass 1 poisoned -> Pass 2 still poisoned -> throws BlueprintGuardrailError
  const failingStub = makeStubLlmProvider([poisoned, poisoned]);
  await assert.rejects(
    () =>
      synthesizeBlueprint(
        {
          normalizedChart: chart,
          profile: {
            firstName: "Aarav",
            relationshipStatus: "single",
            careerMode: "founder",
            careerField: "AI",
          },
        },
        failingStub.provider
      ),
    (err: unknown) =>
      err instanceof BlueprintGuardrailError &&
      err.flaggedTerms.length > 0
  );
});

test("synthesizeBlueprint enforces non-null upgrade_hint and solo branch in date_only + single mode", async () => {
  const chart = makeChartBundleResult("date_only").normalizedChartJson;
  const clean = makeCleanBlueprintPayload();
  clean.hook_proof_json.upgrade_hint = null; // simulate LLM forgetting hint

  const stub = makeStubLlmProvider([clean]);
  const res = await synthesizeBlueprint(
    {
      normalizedChart: chart,
      profile: {
        firstName: "Maya",
        relationshipStatus: "single",
        careerMode: "founder",
        careerField: "SaaS",
      },
    },
    stub.provider
  );

  assert.equal(res.payload.hook_proof_json.relationship.branch, "solo");
  assert.ok(
    typeof res.payload.hook_proof_json.upgrade_hint === "string" &&
      res.payload.hook_proof_json.upgrade_hint.length > 15
  );
  assert.equal(
    res.payload.hook_proof_json.eras.era1.dateRange,
    chart.eras.era1.dateRange
  );
});

test("blueprintSession caches LLM output and strictly strips full_blueprint_json unless paid or non-prod DEV_UNLOCK_PREVIEW=true", async () => {
  const prevDevUnlock = process.env.DEV_UNLOCK_PREVIEW;
  const prevNodeEnv = process.env.NODE_ENV;
  const env = process.env as Record<string, string | undefined>;

  try {
    env.DEV_UNLOCK_PREVIEW = "false";
    env.NODE_ENV = "test";

    const db = new InMemorySupabaseAdmin();
    const chartBundle = makeChartBundleResult("exact");
    const chartId = "11111111-1111-4111-8111-111111111111";
    const sessionToken = "pb_unit_token_1";

    db.tables.natal_charts.push({
      id: chartId,
      user_id: null,
      session_token: sessionToken,
      dob: "1989-09-17",
      tob: "20:54",
      birth_window: null,
      precision_mode: "exact",
      birth_city: "Muzaffarnagar, India",
      lat: 29.47,
      lon: 77.7,
      tz: 5.5,
      moon_boundary_flag: false,
      first_name: "Aarav",
      relationship_status: "married",
      career_mode: "employed",
      career_field: "Software",
      raw_astro_json: chartBundle.rawAstroJson,
      normalized_chart_json: chartBundle.normalizedChartJson,
    });

    const llmStub = makeStubLlmProvider([makeCleanBlueprintPayload()]);

    // 1. First synthesis calls LLM once, redacts paid payload when unpaid
    const first = await synthesizeAndPersistBlueprint({
      chartId,
      sessionToken,
      llmProvider: llmStub.provider,
      admin: db.asAdminClient(),
    });
    assert.equal(first.cached, false);
    assert.equal(first.llmCallsMade, 1);
    assert.equal(first.isPaid, false);
    assert.equal(first.isUnlocked, false);
    assert.equal(first.full_blueprint_json, null);

    // 2. Second synthesis hits DB cache -> 0 extra LLM calls
    const second = await synthesizeAndPersistBlueprint({
      chartId,
      sessionToken,
      llmProvider: llmStub.provider,
      admin: db.asAdminClient(),
    });
    assert.equal(second.cached, true);
    assert.equal(second.llmCallsMade, 0);
    assert.equal(llmStub.getCalls(), 1);
    assert.equal(second.full_blueprint_json, null);

    // 3. Unpaid GET redacts full_blueprint_json
    const unpaidGet = await getBlueprintById({
      chartIdOrToken: chartId,
      sessionToken,
      admin: db.asAdminClient(),
    });
    assert.ok(unpaidGet.hook_proof_json);
    assert.equal(unpaidGet.full_blueprint_json, null);

    // 4. Unauthorized caller gets 403
    await assert.rejects(
      () =>
        getBlueprintById({
          chartIdOrToken: chartId,
          sessionToken: "pb_wrong_token",
          admin: db.asAdminClient(),
        }),
      (err: unknown) =>
        err instanceof BlueprintServiceError && err.statusCode === 403
    );

    // 5. DEV_UNLOCK_PREVIEW=true unlocks in non-production, but is ignored in production
    env.DEV_UNLOCK_PREVIEW = "true";
    const devPreviewGet = await getBlueprintById({
      chartIdOrToken: chartId,
      sessionToken,
      admin: db.asAdminClient(),
    });
    assert.equal(devPreviewGet.isUnlocked, true);
    assert.ok(devPreviewGet.full_blueprint_json);

    env.NODE_ENV = "production";
    const prodGuardGet = await getBlueprintById({
      chartIdOrToken: chartId,
      sessionToken,
      admin: db.asAdminClient(),
    });
    assert.equal(prodGuardGet.isUnlocked, false);
    assert.equal(prodGuardGet.full_blueprint_json, null);

    // 6. Paid blueprint returns full_blueprint_json even in production
    db.tables.blueprints[0].is_paid = true;
    const paidGet = await getBlueprintById({
      chartIdOrToken: chartId,
      sessionToken,
      admin: db.asAdminClient(),
    });
    assert.equal(paidGet.isPaid, true);
    assert.equal(paidGet.isUnlocked, true);
    assert.ok(paidGet.full_blueprint_json);

    // 7. Accuracy feedback saves cleanly
    const fb = await saveBlueprintFeedback({
      chartIdOrToken: chartId,
      feedback: "scarily_accurate",
      sessionToken,
      admin: db.asAdminClient(),
    });
    assert.equal(fb.accuracyFeedback, "scarily_accurate");
    assert.equal(db.tables.blueprints[0].accuracy_feedback, "scarily_accurate");
  } finally {
    if (prevDevUnlock === undefined) delete env.DEV_UNLOCK_PREVIEW;
    else env.DEV_UNLOCK_PREVIEW = prevDevUnlock;

    if (prevNodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = prevNodeEnv;
  }
});
