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

import { VedicAstroApiProvider } from "../src/lib/astro/vedicAstroProvider";
import { SynthesizedBlueprintSchema } from "../src/lib/llm/blueprintSchema";
import { auditBlueprintOutput } from "../src/lib/llm/guardrails";
import { synthesizeBlueprint } from "../src/lib/llm/synthesizeBlueprint";
import { calculateAndPersistChart } from "../src/lib/supabase/chartSession";
import { getSupabaseAdminClient } from "../src/lib/supabase/admin";
import { POST as synthesizeRoute } from "../src/app/api/blueprint/synthesize/route";
import { GET as getBlueprintRoute } from "../src/app/api/blueprint/[chartId]/route";
import { POST as feedbackRoute } from "../src/app/api/blueprint/[chartId]/feedback/route";

async function runTests() {
  const astroProvider = new VedicAstroApiProvider();

  // =========================================================================
  // TEST A: Exact + Married + Tech/Software (17/09/1989, 20:54, Muzaffarnagar)
  // =========================================================================
  console.log("\n=== Test A: Exact + Married + Tech/Software ===");
  const muzMatches = await astroProvider.searchLocation("Muzaffarnagar, India");
  assert.ok(muzMatches.length > 0, "Expected Muzaffarnagar location match");
  const muz = muzMatches[0];

  const bundleA = await astroProvider.fetchChartBundle({
    firstName: "Aarav",
    dob: "17/09/1989",
    tob: "20:54",
    precisionMode: "exact",
    birthCity: `${muz.city}, ${muz.country}`,
    lat: muz.lat,
    lon: muz.lon,
    tz: muz.tz,
  });

  const synthA = await synthesizeBlueprint({
    normalizedChart: bundleA.normalizedChartJson,
    profile: {
      firstName: "Aarav",
      relationshipStatus: "married",
      careerMode: "employed",
      careerField: "Tech/Software",
    },
  });

  const zodA = SynthesizedBlueprintSchema.safeParse(synthA.payload);
  assert.ok(zodA.success, `Test A Zod validation failed: ${zodA.success ? "" : zodA.error.message}`);

  const auditA = auditBlueprintOutput(synthA.payload);
  assert.equal(
    auditA.passed,
    true,
    `Test A jargon violations found: ${auditA.flaggedTerms.join(", ")}`
  );
  assert.equal(synthA.payload.hook_proof_json.relationship.branch, "partnered");
  assert.equal(synthA.payload.hook_proof_json.upgrade_hint, null);

  console.log("Test A PASSED (5 Hook Headlines):", {
    modelVersion: synthA.modelVersion,
    llmCallsMade: synthA.llmCallsMade,
    repairedAfterAudit: synthA.repairedAfterAudit,
    hook1_hardReset: `${synthA.payload.hook_proof_json.hardReset.primaryYearRange} — ${synthA.payload.hook_proof_json.hardReset.primaryChapterTitle}`,
    hook2_relationship: synthA.payload.hook_proof_json.relationship.archetype,
    hook3_career: `${synthA.payload.hook_proof_json.career.currentPathFitScore}% (${synthA.payload.hook_proof_json.career.fitHeadline}) [${synthA.payload.hook_proof_json.career.sweetSpotLabel}]`,
    hook4_selfSabotage: synthA.payload.hook_proof_json.selfSabotage.loopName,
    hook5_eras: `${synthA.payload.hook_proof_json.eras.era1.title} -> ${synthA.payload.hook_proof_json.eras.era2.title} -> ${synthA.payload.hook_proof_json.eras.era3Preview.title} (${synthA.payload.hook_proof_json.eras.era3Preview.percentComplete}%)`,
  });

  // =========================================================================
  // TEST B: date_only + Single + Founder (15/06/1992, Chicago, IL)
  // =========================================================================
  console.log("\n=== Test B: date_only + Single + Founder ===");
  const chiMatches = await astroProvider.searchLocation("Chicago, United States");
  const chi = chiMatches[0] ?? {
    city: "Chicago",
    state: "Illinois",
    country: "United States",
    lat: 41.8781,
    lon: -87.6298,
    tz: -6,
  };

  const bundleB = await astroProvider.fetchChartBundle({
    firstName: "Maya",
    dob: "15/06/1992",
    tob: null,
    precisionMode: "date_only",
    birthCity: `${chi.city}, ${chi.state || chi.country}`,
    lat: chi.lat,
    lon: chi.lon,
    tz: chi.tz,
  });

  const synthB = await synthesizeBlueprint({
    normalizedChart: bundleB.normalizedChartJson,
    profile: {
      firstName: "Maya",
      relationshipStatus: "single",
      careerMode: "founder",
      careerField: "B2B SaaS",
    },
  });

  const zodB = SynthesizedBlueprintSchema.safeParse(synthB.payload);
  assert.ok(zodB.success, `Test B Zod validation failed: ${zodB.success ? "" : zodB.error.message}`);

  const auditB = auditBlueprintOutput(synthB.payload);
  assert.equal(
    auditB.passed,
    true,
    `Test B jargon violations found: ${auditB.flaggedTerms.join(", ")}`
  );
  assert.equal(synthB.payload.hook_proof_json.relationship.branch, "solo");
  assert.ok(
    typeof synthB.payload.hook_proof_json.upgrade_hint === "string" &&
      synthB.payload.hook_proof_json.upgrade_hint.length > 10,
    "Expected non-empty upgrade_hint for date_only mode"
  );

  console.log("Test B PASSED:", {
    modelVersion: synthB.modelVersion,
    llmCallsMade: synthB.llmCallsMade,
    relationshipBranch: synthB.payload.hook_proof_json.relationship.branch,
    relationshipArchetype: synthB.payload.hook_proof_json.relationship.archetype,
    upgrade_hint: synthB.payload.hook_proof_json.upgrade_hint,
  });

  // =========================================================================
  // TEST C: Guardrail Unit Test (poisoned JSON)
  // =========================================================================
  console.log("\n=== Test C: Guardrail Unit Test ===");
  const poisoned = {
    hook_proof_json: {
      hardReset: {
        window: "2020 – 2023",
        chapterLabel: "Rahu Mahadasha Shift",
        description:
          "Your 10th house pressure created intense career strain and fear of divorce.",
      },
    },
    full_blueprint_json: {
      relationship: {
        silentFrictionPattern: "You worry about divorce during stressful years.",
      },
    },
  };

  const auditC = auditBlueprintOutput(poisoned);
  assert.equal(auditC.passed, false, "Poisoned JSON must fail guardrail");
  const lowerFlagged = auditC.flaggedTerms.map((t) => t.toLowerCase());
  assert.ok(lowerFlagged.includes("rahu"), "Must catch 'Rahu'");
  assert.ok(lowerFlagged.includes("mahadasha"), "Must catch 'Mahadasha'");
  assert.ok(lowerFlagged.includes("10th house"), "Must catch '10th house'");
  assert.ok(lowerFlagged.includes("divorce"), "Must catch 'divorce'");

  console.log("Test C PASSED. Caught terms:", auditC.flaggedTerms);

  // =========================================================================
  // TEST D: Caching & Server-Side Redaction via API Route Handlers
  // =========================================================================
  console.log("\n=== Test D: Caching & Redaction ===");
  const prevDevUnlock = process.env.DEV_UNLOCK_PREVIEW;
  process.env.DEV_UNLOCK_PREVIEW = "false";

  const testToken = `pb_test_s3_${Date.now()}`;
  const admin = getSupabaseAdminClient();

  try {
    const calc = await calculateAndPersistChart({
      firstName: "Aarav",
      birthDate: "1989-09-17",
      birthCity: "Muzaffarnagar, India",
      birthLat: muz.lat,
      birthLon: muz.lon,
      birthTz: muz.tz,
      precisionMode: "exact",
      birthTime: "20:54",
      birthWindow: null,
      relationshipStatus: "married",
      careerMode: "employed",
      careerField: "Tech/Software",
      sessionToken: testToken,
    });

    // Call POST /api/blueprint/synthesize #1
    const req1 = new NextRequest("http://localhost:3000/api/blueprint/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chartId: calc.chartId,
        sessionToken: calc.sessionToken,
      }),
    });
    const res1 = await synthesizeRoute(req1);
    assert.equal(res1.status, 200, `Expected 200 on first synthesize, got ${res1.status}`);
    const body1 = (await res1.json()) as {
      cached: boolean;
      llmCallsMade: number;
      hook_proof_json: unknown;
      full_blueprint_json: unknown;
    };
    assert.equal(body1.cached, false);
    assert.ok(body1.llmCallsMade >= 1, "First synthesize must call LLM");
    assert.equal(body1.full_blueprint_json, null, "Unpaid synthesize must redact full_blueprint_json");

    // Call POST /api/blueprint/synthesize #2 (Idempotency check)
    const req2 = new NextRequest("http://localhost:3000/api/blueprint/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chartId: calc.chartId,
        sessionToken: calc.sessionToken,
      }),
    });
    const res2 = await synthesizeRoute(req2);
    assert.equal(res2.status, 200);
    const body2 = (await res2.json()) as {
      cached: boolean;
      llmCallsMade: number;
      full_blueprint_json: unknown;
    };
    assert.equal(body2.cached, true, "Second synthesize must hit DB cache");
    assert.equal(body2.llmCallsMade, 0, "Second synthesize must make 0 extra LLM calls");
    assert.equal(body2.full_blueprint_json, null, "Unpaid cached synthesize must redact full_blueprint_json");

    // Unpaid GET /api/blueprint/[chartId]
    const getReq = new NextRequest(
      `http://localhost:3000/api/blueprint/${calc.chartId}?sessionToken=${calc.sessionToken}`,
      { method: "GET" }
    );
    const getRes = await getBlueprintRoute(getReq, {
      params: Promise.resolve({ chartId: calc.chartId }),
    });
    assert.equal(getRes.status, 200);
    const getBody = (await getRes.json()) as {
      isPaid: boolean;
      isUnlocked: boolean;
      hook_proof_json: unknown;
      full_blueprint_json: unknown;
    };
    assert.equal(getBody.isPaid, false);
    assert.equal(getBody.isUnlocked, false);
    assert.ok(getBody.hook_proof_json, "Must return hook_proof_json");
    assert.equal(
      getBody.full_blueprint_json,
      null,
      "Unpaid GET /api/blueprint/[chartId] MUST return full_blueprint_json: null"
    );

    // Feedback route check
    const fbReq = new NextRequest(
      `http://localhost:3000/api/blueprint/${calc.chartId}/feedback`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: "scarily_accurate",
          sessionToken: calc.sessionToken,
        }),
      }
    );
    const fbRes = await feedbackRoute(fbReq, {
      params: Promise.resolve({ chartId: calc.chartId }),
    });
    assert.equal(fbRes.status, 200);
    const fbBody = (await fbRes.json()) as { accuracyFeedback: string };
    assert.equal(fbBody.accuracyFeedback, "scarily_accurate");

    console.log("Test D PASSED:", {
      firstCallLlmCalls: body1.llmCallsMade,
      secondCallCached: body2.cached,
      secondCallLlmCalls: body2.llmCallsMade,
      unpaidFullBlueprintJson: getBody.full_blueprint_json,
      savedFeedback: fbBody.accuracyFeedback,
    });
  } finally {
    process.env.DEV_UNLOCK_PREVIEW = prevDevUnlock;
    await admin.from("natal_charts").delete().eq("session_token", testToken);
  }

  console.log("\nALL SLICE 3 TESTS PASSED!");
}

runTests().catch((err) => {
  console.error("\nTEST FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
