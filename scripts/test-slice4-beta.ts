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

import { verifyAdminBetaAccess } from "../src/lib/admin/betaMetrics";
import {
  buildBlueprintUnlockedEmail,
  sendBlueprintEmail,
} from "../src/lib/email/resend";
import { LlmProvider } from "../src/lib/llm/provider";
import {
  FIRST_NAME_PLACEHOLDER,
  synthesizeBlueprint,
} from "../src/lib/llm/synthesizeBlueprint";
import { enforceRateLimit, resetRateLimiter } from "../src/lib/rateLimit";
import { getSupabaseAdminClient } from "../src/lib/supabase/admin";
import { POST as betaUnlockRoute } from "../src/app/api/blueprint/[chartId]/beta-unlock/route";
import { POST as calculateChartRoute } from "../src/app/api/charts/calculate/route";
import { makeChartBundleResult, makeCleanBlueprintPayload } from "../tests/helpers/fixtures";

async function runSlice4Verification() {
  console.log("=== Slice 4 Beta Launch Verification ===");

  // =========================================================================
  // TEST 1: Beta Unlock via POST /api/blueprint/[chartId]/beta-unlock
  // =========================================================================
  console.log("\n[Test 1] Beta Unlock (session_token + email)...");
  const admin = getSupabaseAdminClient();
  const suffix = Date.now();
  const testEmail = `slice4.tester.${suffix}@example.com`;
  const testToken = `pb_s4_test_${suffix}`;
  const chartBundle = makeChartBundleResult("date_only");
  const cleanPayload = makeCleanBlueprintPayload();

  let chartId: string | null = null;

  try {
    const { data: insertedChart, error: chartErr } = await admin
      .from("natal_charts")
      .insert({
        session_token: testToken,
        email: testEmail,
        dob: "1992-06-15",
        tob: null,
        birth_window: null,
        precision_mode: "date_only",
        birth_city: "Chicago, IL",
        lat: 41.8781,
        lon: -87.6298,
        tz: -6,
        moon_boundary_flag: false,
        first_name: "Maya",
        relationship_status: "single",
        career_mode: "founder",
        career_field: "B2B SaaS",
        raw_astro_json: chartBundle.rawAstroJson,
        normalized_chart_json: chartBundle.normalizedChartJson,
      })
      .select("id")
      .single<{ id: string }>();

    if (chartErr || !insertedChart) {
      throw new Error(
        `Failed to seed natal_charts (did you run 004_slice4_beta_launch.sql?): ${chartErr?.message}`
      );
    }
    chartId = insertedChart.id;

    const { error: bpErr } = await admin.from("blueprints").insert({
      chart_id: chartId,
      session_token: testToken,
      email: testEmail,
      hook_proof_json: cleanPayload.hook_proof_json,
      full_blueprint_json: cleanPayload.full_blueprint_json,
      model_version: "gemini-3.8-flash-verify",
      is_paid: false,
      entry_hook: "hard-reset",
    });
    if (bpErr) {
      throw new Error(
        `Failed to seed blueprints (did you run 004_slice4_beta_launch.sql?): ${bpErr.message}`
      );
    }

    const prevMode = process.env.BETA_UNLOCK_MODE;
    process.env.BETA_UNLOCK_MODE = "instant";
    try {
      const unlockReq = new NextRequest(
        `http://localhost:3000/api/blueprint/${chartId}/beta-unlock`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: testToken,
            email: ` ${testEmail.toUpperCase()} `,
            unlockTier: "one_time_19",
          }),
        }
      );

      const unlockRes = await betaUnlockRoute(unlockReq, {
        params: Promise.resolve({ chartId }),
      });
      assert.equal(
        unlockRes.status,
        200,
        `Expected 200 from beta-unlock, got ${unlockRes.status}`
      );
      const unlockJson = (await unlockRes.json()) as {
        unlocked: boolean;
        unlockSource: string;
      };
      assert.equal(unlockJson.unlocked, true);
      assert.equal(unlockJson.unlockSource, "beta_free");

      const { data: verifiedBp } = await admin
        .from("blueprints")
        .select("is_paid, unlock_source, unlocked_at")
        .eq("chart_id", chartId)
        .single<{
          is_paid: boolean;
          unlock_source: string;
          unlocked_at: string | null;
        }>();

      assert.equal(verifiedBp?.is_paid, true);
      assert.equal(verifiedBp?.unlock_source, "beta_free");
      assert.ok(verifiedBp?.unlocked_at);

      const { data: events } = await admin
        .from("funnel_events")
        .select("event_name, chart_id")
        .eq("chart_id", chartId)
        .eq("event_name", "beta_unlocked");
      assert.ok(events && events.length >= 1, "Expected beta_unlocked in funnel_events");

      console.log("  Test 1 PASSED:", {
        chartId,
        is_paid: verifiedBp.is_paid,
        unlock_source: verifiedBp.unlock_source,
        betaUnlockedEvents: events.length,
      });
    } finally {
      if (prevMode === undefined) delete process.env.BETA_UNLOCK_MODE;
      else process.env.BETA_UNLOCK_MODE = prevMode;
    }
  } finally {
    if (chartId) {
      await admin.from("funnel_events").delete().eq("chart_id", chartId);
      await admin.from("blueprints").delete().eq("chart_id", chartId);
      await admin.from("natal_charts").delete().eq("id", chartId);
    }
  }

  // =========================================================================
  // TEST 2: Resend Sandbox Safety
  // =========================================================================
  console.log("\n[Test 2] Resend Sandbox Safety...");
  const prevEmailMode = process.env.EMAIL_MODE;
  const prevSandbox = process.env.EMAIL_SANDBOX_RECIPIENT;
  process.env.EMAIL_MODE = "sandbox";
  process.env.EMAIL_SANDBOX_RECIPIENT = "allowed-sandbox@example.com";
  try {
    const emailPayload = buildBlueprintUnlockedEmail({
      firstName: "Maya",
      email: "external-user@gmail.com",
      resumeUrl: "http://localhost:3000/blueprint?session=pb_demo",
    });
    const sendRes = await sendBlueprintEmail(emailPayload);
    assert.equal(sendRes.skipped, true);
    assert.equal(sendRes.sent, false);
    assert.equal(sendRes.reason, "sandbox_mode");
    console.log("  Test 2 PASSED:", sendRes);
  } finally {
    if (prevEmailMode === undefined) delete process.env.EMAIL_MODE;
    else process.env.EMAIL_MODE = prevEmailMode;
    if (prevSandbox === undefined) delete process.env.EMAIL_SANDBOX_RECIPIENT;
    else process.env.EMAIL_SANDBOX_RECIPIENT = prevSandbox;
  }

  // =========================================================================
  // TEST 3: Zero-PII Gemini Payload & Post-Interpolation
  // =========================================================================
  console.log("\n[Test 3] Zero-PII Gemini Payload & Post-Interpolation...");
  const realFirstName = "ChandanTestUser";
  const realEmail = "chandan.private@example.com";
  let capturedPromptJson = "";
  let capturedSystem = "";

  const spyLlm: LlmProvider = {
    providerName: "spy-gemini",
    modelName: "gemini-3.8-flash-test",
    async generateStructuredJson(systemPrompt, userPayload, schema) {
      capturedSystem = systemPrompt;
      capturedPromptJson = JSON.stringify(userPayload);
      const draft = makeCleanBlueprintPayload();
      draft.hook_proof_json.hardReset.introHook = `${FIRST_NAME_PLACEHOLDER}, that two-year compression reshaped your trajectory. You came out with far sharper boundaries.`;
      return schema.parse(draft);
    },
  };

  const synthResult = await synthesizeBlueprint(
    {
      normalizedChart: makeChartBundleResult("exact").normalizedChartJson,
      profile: {
        firstName: realFirstName,
        relationshipStatus: "married",
        careerMode: "employed",
        careerField: "Engineering",
      },
    },
    spyLlm
  );

  assert.ok(capturedPromptJson.includes(FIRST_NAME_PLACEHOLDER));
  assert.equal(capturedPromptJson.includes(realFirstName), false);
  assert.equal(capturedPromptJson.includes(realEmail), false);
  assert.equal(capturedSystem.includes(realFirstName), false);
  assert.equal(capturedSystem.includes(realEmail), false);
  assert.ok(
    synthResult.payload.hook_proof_json.hardReset.introHook.startsWith(
      `${realFirstName},`
    )
  );
  console.log("  Test 3 PASSED: Zero PII sent to Gemini; post-interpolation restored first_name.");

  // =========================================================================
  // TEST 4: Rate Limiter & Admin Gate
  // =========================================================================
  console.log("\n[Test 4] Rate Limiter (HTTP 429) & Admin Gate...");
  resetRateLimiter();
  const burstIp = "198.51.100.42";
  for (let i = 0; i < 10; i++) {
    const res = enforceRateLimit(
      new NextRequest("http://localhost:3000/api/charts/calculate", {
        headers: { "x-forwarded-for": burstIp },
      }),
      { namespace: "charts_calculate", limit: 10, windowMs: 60 * 60 * 1000 }
    );
    assert.equal(res, null);
  }
  const blockedRes = await calculateChartRoute(
    new NextRequest("http://localhost:3000/api/charts/calculate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": burstIp,
      },
      body: JSON.stringify({}),
    })
  );
  assert.equal(blockedRes.status, 429, "11th request must return HTTP 429");

  const unauthAdmin = verifyAdminBetaAccess({
    authUserEmail: null,
    devHeaderEmail: null,
    nodeEnv: "production",
  });
  assert.equal(unauthAdmin.authorized, false);

  const wrongAdmin = verifyAdminBetaAccess({
    authUserEmail: "not-admin@example.com",
    nodeEnv: "production",
  });
  assert.equal(wrongAdmin.authorized, false);

  console.log("  Test 4 PASSED: Burst hit 429 and unauthenticated /admin/beta blocked.");
  console.log("\nALL SLICE 4 VERIFICATION CHECKS PASSED!");
}

runSlice4Verification().catch((err) => {
  console.error(
    "\nSLICE 4 VERIFICATION FAILED:",
    err instanceof Error ? err.message : err
  );
  process.exit(1);
});
