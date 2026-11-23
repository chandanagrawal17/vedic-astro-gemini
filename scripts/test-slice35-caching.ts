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
import { POST as synthesizeRoute } from "../src/app/api/blueprint/synthesize/route";
import { EXISTING_PAID_ACCOUNT_MESSAGE } from "../src/lib/cache/blueprintCache";
import { getSupabaseAdminClient } from "../src/lib/supabase/admin";

function createExternalApiSpy() {
  const originalFetch = globalThis.fetch;
  let vedicHttpCalls = 0;
  let geminiHttpCalls = 0;

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
    } else if (urlStr.includes("generativelanguage.googleapis.com")) {
      geminiHttpCalls += 1;
    }

    return originalFetch(input, init);
  };

  return {
    getVedicCalls: () => vedicHttpCalls,
    getGeminiCalls: () => geminiHttpCalls,
    reset: () => {
      vedicHttpCalls = 0;
      geminiHttpCalls = 0;
    },
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

async function callCalculate(payload: Record<string, unknown>) {
  const req = new NextRequest("http://localhost:3000/api/charts/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const res = await calculateChartRoute(req);
  const body = (await res.json()) as Record<string, unknown>;
  return { status: res.status, body };
}

async function callSynthesize(payload: Record<string, unknown>) {
  const req = new NextRequest("http://localhost:3000/api/blueprint/synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const res = await synthesizeRoute(req);
  const body = (await res.json()) as Record<string, unknown>;
  return { status: res.status, body };
}

async function assertMigrationApplied() {
  const admin = getSupabaseAdminClient();
  const { error: chartColErr } = await admin
    .from("natal_charts")
    .select("id, email, birth_input_hash")
    .limit(1);

  const { error: bpColErr } = await admin
    .from("blueprints")
    .select("id, email, context_hash")
    .limit(1);

  if (chartColErr || bpColErr) {
    throw new Error(
      "Slice 3.5 columns missing in Supabase. Please run supabase/migrations/003_slice35_email_caching.sql in the Supabase SQL Editor first."
    );
  }
}

async function runTests() {
  await assertMigrationApplied();

  const admin = getSupabaseAdminClient();
  const spy = createExternalApiSpy();
  const prevDevUnlock = process.env.DEV_UNLOCK_PREVIEW;
  process.env.DEV_UNLOCK_PREVIEW = "false";

  const canonicalEmail = "test@example.com";

  const basePayload = {
    firstName: "Alex",
    birthDate: "1991-03-22",
    birthCity: "Austin, TX",
    birthLat: 30.2672,
    birthLon: -97.7431,
    birthTz: -6,
    precisionMode: "dob_only",
    birthTime: null,
    birthWindow: null,
    relationshipStatus: "single",
    careerMode: "employed",
    careerField: "Product Strategy",
  };

  async function cleanupTestEmailRows() {
    await admin.from("blueprints").delete().eq("email", canonicalEmail);
    await admin.from("natal_charts").delete().eq("email", canonicalEmail);
  }

  try {
    await cleanupTestEmailRows();

    // =========================================================================
    // Test 1 (Case D -> Case A — Full Cache Hit)
    // =========================================================================
    console.log("\n=== Test 1: Case A Full Cache Hit (Test@Example.com -> ' test@example.com ') ===");
    spy.reset();
    const calc1 = await callCalculate({
      ...basePayload,
      email: "Test@Example.com",
      sessionToken: `pb_s35_1_${Date.now()}`,
    });
    assert.equal(calc1.status, 200, `calc1 failed: ${JSON.stringify(calc1.body)}`);
    const chartId1 = calc1.body.chartId as string;
    const sessionToken1 = calc1.body.sessionToken as string;

    const synth1 = await callSynthesize({
      chartId: chartId1,
      sessionToken: sessionToken1,
      email: "Test@Example.com",
      firstName: basePayload.firstName,
      relationshipStatus: basePayload.relationshipStatus,
      careerMode: basePayload.careerMode,
      careerField: basePayload.careerField,
    });
    assert.equal(synth1.status, 200, `synth1 failed: ${JSON.stringify(synth1.body)}`);
    assert.equal(synth1.body.full_blueprint_json, null);

    // Resubmit with mixed-case/whitespace email and identical inputs
    spy.reset();
    const calc2 = await callCalculate({
      ...basePayload,
      email: " test@example.com ",
      sessionToken: `pb_s35_2_${Date.now()}`,
    });
    assert.equal(calc2.status, 200, `calc2 failed: ${JSON.stringify(calc2.body)}`);
    assert.equal(calc2.body.cached, true);
    assert.equal(calc2.body.apiCallsMade, 0);
    assert.equal(calc2.body.chartId, chartId1);
    assert.equal(spy.getVedicCalls(), 0, "Case A must make 0 VedicAstroAPI HTTP calls");

    const synth2 = await callSynthesize({
      chartId: calc2.body.chartId as string,
      sessionToken: calc2.body.sessionToken as string,
      email: " test@example.com ",
      firstName: basePayload.firstName,
      relationshipStatus: basePayload.relationshipStatus,
      careerMode: basePayload.careerMode,
      careerField: basePayload.careerField,
    });
    assert.equal(synth2.status, 200, `synth2 failed: ${JSON.stringify(synth2.body)}`);
    assert.equal(synth2.body.cached, true);
    assert.equal(synth2.body.llmCallsMade, 0);
    assert.equal(spy.getGeminiCalls(), 0, "Case A must make 0 Gemini HTTP calls");

    const { data: chartsAfterT1 } = await admin
      .from("natal_charts")
      .select("id, birth_input_hash, precision_mode")
      .eq("email", canonicalEmail);
    const { data: bpsAfterT1 } = await admin
      .from("blueprints")
      .select("id, context_hash, is_paid")
      .eq("email", canonicalEmail);

    assert.equal(chartsAfterT1?.length, 1, "Expected exactly 1 natal_charts row after Test 1");
    assert.equal(bpsAfterT1?.length, 1, "Expected exactly 1 blueprints row after Test 1");

    const blueprintId1 = bpsAfterT1![0].id as string;
    const birthHash1 = chartsAfterT1![0].birth_input_hash as string;
    const contextHash1 = bpsAfterT1![0].context_hash as string;

    console.log("Test 1 PASSED:", {
      natalChartsRows: chartsAfterT1?.length,
      blueprintsRows: bpsAfterT1?.length,
      vedicCallsOnSecondRun: spy.getVedicCalls(),
      geminiCallsOnSecondRun: spy.getGeminiCalls(),
    });

    // =========================================================================
    // Test 2 (Case B — Context Update: career_mode changed)
    // =========================================================================
    console.log("\n=== Test 2: Case B Context Update (careerMode -> founder) ===");
    spy.reset();
    const calc3 = await callCalculate({
      ...basePayload,
      email: "test@example.com",
      careerMode: "founder",
      sessionToken: `pb_s35_3_${Date.now()}`,
    });
    assert.equal(calc3.status, 200, `calc3 failed: ${JSON.stringify(calc3.body)}`);
    assert.equal(calc3.body.cached, true);
    assert.equal(calc3.body.apiCallsMade, 0);
    assert.equal(spy.getVedicCalls(), 0, "Case B must make 0 VedicAstroAPI calls");

    const synth3 = await callSynthesize({
      chartId: calc3.body.chartId as string,
      sessionToken: calc3.body.sessionToken as string,
      email: "test@example.com",
      firstName: basePayload.firstName,
      relationshipStatus: basePayload.relationshipStatus,
      careerMode: "founder",
      careerField: basePayload.careerField,
    });
    assert.equal(synth3.status, 200, `synth3 failed: ${JSON.stringify(synth3.body)}`);
    assert.equal(synth3.body.cached, false);
    assert.ok((synth3.body.llmCallsMade as number) >= 1, "Case B must re-run Gemini synthesis");

    const { data: chartsAfterT2 } = await admin
      .from("natal_charts")
      .select("id")
      .eq("email", canonicalEmail);
    const { data: bpsAfterT2 } = await admin
      .from("blueprints")
      .select("id, context_hash")
      .eq("email", canonicalEmail);

    assert.equal(chartsAfterT2?.length, 1, "Row count in natal_charts must remain 1");
    assert.equal(bpsAfterT2?.length, 1, "Row count in blueprints must remain 1");
    assert.equal(bpsAfterT2![0].id, blueprintId1, "Must update blueprints row in place");
    assert.notEqual(
      bpsAfterT2![0].context_hash,
      contextHash1,
      "blueprints.context_hash must update on career_mode change"
    );

    const contextHash2 = bpsAfterT2![0].context_hash as string;
    console.log("Test 2 PASSED:", {
      vedicCalls: spy.getVedicCalls(),
      blueprintIdPreserved: bpsAfterT2![0].id === blueprintId1,
      contextHashUpdated: contextHash2 !== contextHash1,
    });

    // =========================================================================
    // Test 3 (Case C — Birth Time Update: add exact tob)
    // =========================================================================
    console.log("\n=== Test 3: Case C Birth Time Update (dob_only -> exact tob) ===");
    spy.reset();
    const calc4 = await callCalculate({
      ...basePayload,
      email: "test@example.com",
      careerMode: "founder",
      precisionMode: "exact",
      birthTime: "08:30",
      sessionToken: `pb_s35_4_${Date.now()}`,
    });
    assert.equal(calc4.status, 200, `calc4 failed: ${JSON.stringify(calc4.body)}`);
    assert.equal(calc4.body.cached, false);
    assert.ok((calc4.body.apiCallsMade as number) > 0, "Case C must call VedicAstroAPI");
    assert.ok(spy.getVedicCalls() > 0, "Expected VedicAstroAPI HTTP calls for Case C");

    const synth4 = await callSynthesize({
      chartId: calc4.body.chartId as string,
      sessionToken: calc4.body.sessionToken as string,
      email: "test@example.com",
      firstName: basePayload.firstName,
      relationshipStatus: basePayload.relationshipStatus,
      careerMode: "founder",
      careerField: basePayload.careerField,
    });
    assert.equal(synth4.status, 200, `synth4 failed: ${JSON.stringify(synth4.body)}`);
    assert.equal(synth4.body.cached, false);

    const { data: chartsAfterT3 } = await admin
      .from("natal_charts")
      .select("id, birth_input_hash, precision_mode")
      .eq("email", canonicalEmail);
    const { data: bpsAfterT3 } = await admin
      .from("blueprints")
      .select("id, is_paid, context_hash")
      .eq("email", canonicalEmail);

    assert.equal(chartsAfterT3?.length, 1, "natal_charts row count must remain 1");
    assert.equal(bpsAfterT3?.length, 1, "blueprints row count must remain 1");
    assert.equal(chartsAfterT3![0].id, chartId1, "natal_charts.id must be preserved");
    assert.equal(chartsAfterT3![0].precision_mode, "exact");
    assert.notEqual(
      chartsAfterT3![0].birth_input_hash,
      birthHash1,
      "natal_charts.birth_input_hash must update in place"
    );
    assert.equal(bpsAfterT3![0].id, blueprintId1, "blueprints.id must be preserved");
    assert.equal(bpsAfterT3![0].is_paid, false, "blueprints.is_paid must be preserved");

    const birthHashAfterT3 = chartsAfterT3![0].birth_input_hash as string;
    const contextHashAfterT3 = bpsAfterT3![0].context_hash as string;

    console.log("Test 3 PASSED:", {
      chartIdPreserved: chartsAfterT3![0].id === chartId1,
      precisionMode: chartsAfterT3![0].precision_mode,
      birthHashUpdated: birthHashAfterT3 !== birthHash1,
      isPaidPreserved: bpsAfterT3![0].is_paid,
    });

    // =========================================================================
    // Test 4 (Paid Protection): is_paid = true blocks unauthenticated overwrite/leak
    // =========================================================================
    console.log("\n=== Test 4: Paid Account Privacy Guardrail ===");
    const { error: markPaidErr } = await admin
      .from("blueprints")
      .update({ is_paid: true })
      .eq("id", blueprintId1);
    assert.equal(markPaidErr, null, `Failed to mark blueprint paid: ${markPaidErr?.message}`);

    spy.reset();
    const unauthCalc = await callCalculate({
      ...basePayload,
      email: "TEST@EXAMPLE.COM",
      careerMode: "transition",
      precisionMode: "exact",
      birthTime: "22:15",
      sessionToken: `pb_s35_unauth_${Date.now()}`,
    });
    assert.equal(
      unauthCalc.body.status,
      "existing_paid_account",
      `Expected existing_paid_account on calculate, got: ${JSON.stringify(unauthCalc.body)}`
    );
    assert.equal(unauthCalc.body.message, EXISTING_PAID_ACCOUNT_MESSAGE);
    assert.equal(unauthCalc.body.full_blueprint_json, undefined);
    assert.equal(spy.getVedicCalls(), 0, "Paid guardrail must make 0 VedicAstroAPI calls");

    const unauthSynth = await callSynthesize({
      chartId: chartId1,
      sessionToken: sessionToken1,
      email: "TEST@EXAMPLE.COM",
      careerMode: "transition",
    });
    assert.equal(
      unauthSynth.body.status,
      "existing_paid_account",
      `Expected existing_paid_account on synthesize, got: ${JSON.stringify(unauthSynth.body)}`
    );
    assert.equal(unauthSynth.body.full_blueprint_json, undefined);
    assert.equal(spy.getGeminiCalls(), 0, "Paid guardrail must make 0 Gemini calls");

    // Verify DB rows were NOT overwritten
    const { data: chartAfterT4 } = await admin
      .from("natal_charts")
      .select("birth_input_hash, precision_mode")
      .eq("id", chartId1)
      .single();
    const { data: bpAfterT4 } = await admin
      .from("blueprints")
      .select("context_hash, is_paid")
      .eq("id", blueprintId1)
      .single();

    assert.equal(chartAfterT4?.birth_input_hash, birthHashAfterT3);
    assert.equal(chartAfterT4?.precision_mode, "exact");
    assert.equal(bpAfterT4?.context_hash, contextHashAfterT3);
    assert.equal(bpAfterT4?.is_paid, true);

    console.log("Test 4 PASSED:", {
      status: unauthCalc.body.status,
      leakedFullBlueprint: unauthSynth.body.full_blueprint_json !== undefined,
      rowIntact: chartAfterT4?.birth_input_hash === birthHashAfterT3,
    });

    console.log("\nALL SLICE 3.5 CACHING & DEDUP TESTS PASSED!");
  } finally {
    spy.restore();
    if (prevDevUnlock === undefined) delete process.env.DEV_UNLOCK_PREVIEW;
    else process.env.DEV_UNLOCK_PREVIEW = prevDevUnlock;
    await cleanupTestEmailRows().catch(() => {});
  }
}

runTests().catch((err) => {
  console.error("\nTEST FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
