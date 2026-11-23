import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { verifyAdminBetaAccess } from "@/lib/admin/betaMetrics";
import { buildBragCardData } from "@/lib/bragCard/renderBragCard";
import {
  buildBlueprintUnlockedEmail,
  sendBlueprintEmail,
} from "@/lib/email/resend";
import { BlueprintGuardrailError } from "@/lib/llm/guardrails";
import type { LlmProvider } from "@/lib/llm/provider";
import {
  FIRST_NAME_PLACEHOLDER,
  interpolateFirstName,
  synthesizeBlueprint,
} from "@/lib/llm/synthesizeBlueprint";
import { POST as funnelEventRoute } from "@/app/api/funnel/event/route";
import { performBetaUnlock } from "@/lib/payments/betaUnlockService";
import { enforceRateLimit, resetRateLimiter } from "@/lib/rateLimit";
import {
  getBlueprintById,
  synthesizeAndPersistBlueprint,
} from "@/lib/supabase/blueprintSession";
import { calculateAndPersistChart } from "@/lib/supabase/chartSession";
import { InMemorySupabaseAdmin } from "./helpers/mockSupabase";
import {
  makeChartBundleResult,
  makeCleanBlueprintPayload,
} from "./helpers/fixtures";

test("performBetaUnlock authorizes session_token + normalized email without inbox wait, unlocks blueprint, and logs beta_unlocked", async () => {
  const prevMode = process.env.BETA_UNLOCK_MODE;
  const prevEmailMode = process.env.EMAIL_MODE;
  const prevDevUnlock = process.env.DEV_UNLOCK_PREVIEW;
  process.env.BETA_UNLOCK_MODE = "instant";
  process.env.EMAIL_MODE = "sandbox";
  process.env.DEV_UNLOCK_PREVIEW = "false";

  try {
    const db = new InMemorySupabaseAdmin();
    const chartBundle = makeChartBundleResult("date_only");
    const chartId = "22222222-2222-4222-8222-222222222222";
    const sessionToken = "pb_beta_unlock_1";

    db.tables.natal_charts.push({
      id: chartId,
      user_id: null,
      session_token: sessionToken,
      email: "tester@example.com",
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
    });

    const clean = makeCleanBlueprintPayload();
    db.tables.blueprints.push({
      id: "bp-1",
      chart_id: chartId,
      user_id: null,
      session_token: sessionToken,
      email: "tester@example.com",
      context_hash: "ctx_1",
      hook_proof_json: clean.hook_proof_json,
      full_blueprint_json: clean.full_blueprint_json,
      accuracy_feedback: null,
      model_version: "gemini-3.8-flash-test",
      is_paid: false,
      unlock_tier: null,
      entry_hook: "self-sabotage",
    });

    // Wrong email must fail 403
    await assert.rejects(
      () =>
        performBetaUnlock({
          chartIdOrToken: chartId,
          sessionToken,
          email: "wrong@example.com",
          admin: db.asAdminClient(),
        }),
      (err: unknown) =>
        err instanceof Error && "statusCode" in err && err.statusCode === 403
    );

    // Matching session_token + normalized email succeeds without auth login
    const unlockRes = await performBetaUnlock({
      chartIdOrToken: chartId,
      sessionToken,
      email: "  TESTER@EXAMPLE.COM ",
      origin: "https://blueprint.example.com",
      admin: db.asAdminClient(),
    });

    assert.equal(unlockRes.unlocked, true);
    assert.equal(unlockRes.unlockSource, "beta_free");
    assert.equal(db.tables.blueprints[0].is_paid, true);
    assert.equal(db.tables.blueprints[0].unlock_source, "beta_free");
    assert.ok(db.tables.blueprints[0].unlocked_at);

    const betaEvt = db.tables.funnel_events.find(
      (e) => e.event_name === "beta_unlocked"
    );
    assert.ok(betaEvt);
    assert.equal(betaEvt.chart_id, chartId);
    assert.equal(betaEvt.email, "tester@example.com");

    // Unlocked blueprint is immediately readable via sessionToken
    const bpGet = await getBlueprintById({
      chartIdOrToken: chartId,
      sessionToken,
      admin: db.asAdminClient(),
    });
    assert.equal(bpGet.isPaid, true);
    assert.equal(bpGet.isUnlocked, true);
    assert.ok(bpGet.full_blueprint_json);
  } finally {
    if (prevMode === undefined) delete process.env.BETA_UNLOCK_MODE;
    else process.env.BETA_UNLOCK_MODE = prevMode;
    if (prevEmailMode === undefined) delete process.env.EMAIL_MODE;
    else process.env.EMAIL_MODE = prevEmailMode;
    if (prevDevUnlock === undefined) delete process.env.DEV_UNLOCK_PREVIEW;
    else process.env.DEV_UNLOCK_PREVIEW = prevDevUnlock;
  }
});

test("Resend sandbox skips external recipients safely and only sends to EMAIL_SANDBOX_RECIPIENT", async () => {
  const prevEmailMode = process.env.EMAIL_MODE;
  const prevSandbox = process.env.EMAIL_SANDBOX_RECIPIENT;
  const prevKey = process.env.RESEND_API_KEY;
  process.env.EMAIL_MODE = "sandbox";
  process.env.EMAIL_SANDBOX_RECIPIENT = "Owner@Example.com";
  process.env.RESEND_API_KEY = "re_test_key";

  try {
    let fetchCalls = 0;
    const fakeFetch: typeof fetch = async () => {
      fetchCalls += 1;
      return new Response(JSON.stringify({ id: "email_123" }), { status: 200 });
    };

    const externalEmail = buildBlueprintUnlockedEmail({
      firstName: "Maya",
      email: "external.beta@gmail.com",
      resumeUrl: "http://localhost:3000/blueprint?session=pb_1",
    });

    const skippedRes = await sendBlueprintEmail(externalEmail, {
      fetchFn: fakeFetch,
    });
    assert.equal(skippedRes.skipped, true);
    assert.equal(skippedRes.sent, false);
    assert.equal(skippedRes.reason, "sandbox_mode");
    assert.equal(fetchCalls, 0);

    const sandboxEmail = buildBlueprintUnlockedEmail({
      firstName: "Owner",
      email: " owner@example.com ",
      resumeUrl: "http://localhost:3000/blueprint?session=pb_2",
    });
    const sentRes = await sendBlueprintEmail(sandboxEmail, {
      fetchFn: fakeFetch,
    });
    assert.equal(sentRes.sent, true);
    assert.equal(sentRes.skipped, false);
    assert.equal(fetchCalls, 1);
  } finally {
    if (prevEmailMode === undefined) delete process.env.EMAIL_MODE;
    else process.env.EMAIL_MODE = prevEmailMode;
    if (prevSandbox === undefined) delete process.env.EMAIL_SANDBOX_RECIPIENT;
    else process.env.EMAIL_SANDBOX_RECIPIENT = prevSandbox;
    if (prevKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevKey;
  }
});

test("synthesizeBlueprint strips real firstName and email from Gemini payload and interpolates {{FIRST_NAME}} after guardrails", async () => {
  const chart = makeChartBundleResult("exact").normalizedChartJson;
  let capturedSys = "";
  let capturedUserPayload = "";

  const spyProvider: LlmProvider = {
    providerName: "spy-zero-pii",
    modelName: "gemini-3.8-flash-test",
    async generateStructuredJson(sys, user, schema) {
      capturedSys = sys;
      capturedUserPayload = JSON.stringify(user);
      const draft = makeCleanBlueprintPayload("married");
      draft.hook_proof_json.hardReset.introHook = `${FIRST_NAME_PLACEHOLDER}, your 2022–2023 stretch forced a sharp identity reset and rebuilt your standards from scratch.`;
      if (draft.full_blueprint_json.relationship.relationshipStatus === "married") {
        draft.full_blueprint_json.relationship.marriageBlueprint.whereYouTrulyClick = `${FIRST_NAME_PLACEHOLDER}, you bond deeply through quiet reliability and honest communication.`;
      }
      return schema.parse(draft);
    },
  };

  const result = await synthesizeBlueprint(
    {
      normalizedChart: chart,
      profile: {
        firstName: "Chandan",
        relationshipStatus: "married",
        careerMode: "employed",
        careerField: "Software Engineering",
      },
    },
    spyProvider
  );

  assert.ok(capturedUserPayload.includes(FIRST_NAME_PLACEHOLDER));
  assert.ok(capturedSys.includes(FIRST_NAME_PLACEHOLDER));
  assert.equal(capturedUserPayload.includes("Chandan"), false);
  assert.equal(capturedSys.includes("Chandan"), false);

  // Post-interpolation restores real first name cleanly
  assert.ok(
    result.payload.hook_proof_json.hardReset.introHook.startsWith("Chandan,")
  );
  assert.equal(
    result.payload.full_blueprint_json.relationship.relationshipStatus,
    "married"
  );
  if (
    result.payload.full_blueprint_json.relationship.relationshipStatus ===
    "married"
  ) {
    assert.ok(
      result.payload.full_blueprint_json.relationship.marriageBlueprint.whereYouTrulyClick.startsWith(
        "Chandan,"
      )
    );
  }
  assert.equal(
    JSON.stringify(result.payload).includes(FIRST_NAME_PLACEHOLDER),
    false
  );
});

test("Beta unlocked user can add exact birth time in-place while preserving is_paid and unlock_source", async () => {
  const db = new InMemorySupabaseAdmin();
  const chartBundleDobOnly = makeChartBundleResult("date_only");
  const chartBundleExact = makeChartBundleResult("exact");
  const sessionToken = "pb_beta_refresh_1";

  const calc1 = await calculateAndPersistChart(
    {
      email: "beta.refresh@example.com",
      firstName: "Elena",
      birthDate: "1991-03-22",
      birthCity: "Chicago, IL",
      birthLat: 41.8781,
      birthLon: -87.6298,
      birthTz: -6,
      precisionMode: "dob_only",
      birthTime: null,
      birthWindow: null,
      relationshipStatus: "single",
      careerMode: "employed",
      careerField: "Design",
      sessionToken,
    },
    {
      admin: db.asAdminClient(),
      astroProvider: {
        providerName: "stub",
        async searchLocation() {
          return [];
        },
        async fetchChartBundle() {
          return chartBundleDobOnly;
        },
      },
    }
  );

  const stubLlm: LlmProvider = {
    providerName: "stub",
    modelName: "gemini-3.8-flash-test",
    async generateStructuredJson(_sys, _user, schema) {
      return schema.parse(makeCleanBlueprintPayload("single"));
    },
  };

  await synthesizeAndPersistBlueprint({
    chartId: calc1.chartId,
    sessionToken,
    email: "beta.refresh@example.com",
    entryHook: "career-audit",
    llmProvider: stubLlm,
    admin: db.asAdminClient(),
  });

  await performBetaUnlock({
    chartIdOrToken: calc1.chartId,
    sessionToken,
    email: "beta.refresh@example.com",
    admin: db.asAdminClient(),
  });

  assert.equal(db.tables.blueprints[0].is_paid, true);
  assert.equal(db.tables.blueprints[0].unlock_source, "beta_free");

  // Beta user refreshes with exact birth time
  const calc2 = await calculateAndPersistChart(
    {
      email: "beta.refresh@example.com",
      firstName: "Elena",
      birthDate: "1991-03-22",
      birthCity: "Chicago, IL",
      birthLat: 41.8781,
      birthLon: -87.6298,
      birthTz: -6,
      precisionMode: "exact",
      birthTime: "08:30",
      birthWindow: null,
      relationshipStatus: "single",
      careerMode: "employed",
      careerField: "Design",
      sessionToken,
      intent: "birth_time_upgrade",
    },
    {
      admin: db.asAdminClient(),
      astroProvider: {
        providerName: "stub",
        async searchLocation() {
          return [];
        },
        async fetchChartBundle() {
          return chartBundleExact;
        },
      },
    }
  );

  assert.equal(calc2.cacheCase, "C");
  const synth2 = await synthesizeAndPersistBlueprint({
    chartId: calc2.chartId,
    sessionToken,
    email: "beta.refresh@example.com",
    intent: "birth_time_upgrade",
    llmProvider: stubLlm,
    admin: db.asAdminClient(),
  });

  assert.equal(synth2.isPaid, true);
  assert.equal(synth2.unlockSource, "beta_free");
  assert.equal(synth2.precisionMode, "exact");
  assert.ok(synth2.full_blueprint_json);
});

test("Rate limiter enforces burst HTTP 429 and admin gate blocks non-admin access", () => {
  resetRateLimiter();

  const makeReq = (ip: string) =>
    new NextRequest("http://localhost:3000/api/charts/calculate", {
      headers: { "x-forwarded-for": ip },
    });

  for (let i = 0; i < 10; i++) {
    const blocked = enforceRateLimit(makeReq("203.0.113.10"), {
      namespace: "test_calc",
      limit: 10,
      windowMs: 60_000,
    });
    assert.equal(blocked, null);
  }

  const eleventh = enforceRateLimit(makeReq("203.0.113.10"), {
    namespace: "test_calc",
    limit: 10,
    windowMs: 60_000,
  });
  assert.ok(eleventh);
  assert.equal(eleventh.status, 429);

  const prevAdmins = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "founder@personalblueprint.app";
  try {
    assert.equal(
      verifyAdminBetaAccess({ authUserEmail: null, devHeaderEmail: null }).authorized,
      false
    );
    assert.equal(
      verifyAdminBetaAccess({
        authUserEmail: "stranger@example.com",
        nodeEnv: "production",
      }).authorized,
      false
    );
    assert.equal(
      verifyAdminBetaAccess({
        authUserEmail: "FOUNDER@personalblueprint.app",
        nodeEnv: "production",
      }).authorized,
      true
    );
  } finally {
    if (prevAdmins === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = prevAdmins;
  }

  // Brag card strips PII
  const clean = makeCleanBlueprintPayload();
  const brag = buildBragCardData({
    mode: "3_eras",
    includeFirstName: false,
    firstName: "Elena",
    freePayload: clean.hook_proof_json,
  });
  assert.equal(brag.firstName, null);
  assert.equal("email" in brag, false);
  assert.equal("birthDate" in brag, false);
});

test("Client funnel event endpoint rejects forged server-authoritative events, accepts locked-hook click events, and interpolateFirstName handles casing variants", async () => {
  resetRateLimiter();
  const forgedReq = new NextRequest("http://localhost:3000/api/funnel/event", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "203.0.113.99",
    },
    body: JSON.stringify({ eventName: "beta_unlocked" }),
  });
  const forgedRes = await funnelEventRoute(forgedReq);
  assert.equal(forgedRes.status, 400);

  for (const allowedEvent of [
    "clicked_locked_monthly_timeline",
    "clicked_locked_career_blueprint",
  ]) {
    const okReq = new NextRequest("http://localhost:3000/api/funnel/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.100",
      },
      body: JSON.stringify({ eventName: allowedEvent }),
    });
    const okRes = await funnelEventRoute(okReq);
    assert.equal(okRes.status, 200);
  }

  const interpolated = interpolateFirstName(
    {
      a: "Hello {{FIRST_NAME}}",
      b: "Hey {{first_name}} and {FIRST_NAME}",
    },
    "Maya"
  );
  assert.equal(interpolated.a, "Hello Maya");
  assert.equal(interpolated.b, "Hey Maya and Maya");
});
