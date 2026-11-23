import test from "node:test";
import assert from "node:assert/strict";
import type { AstroProvider } from "@/lib/astro/provider";
import type { LlmProvider } from "@/lib/llm/provider";
import {
  computeBirthInputHash,
  computeContextHash,
  EXISTING_PAID_ACCOUNT_MESSAGE,
  ExistingPaidAccountError,
  normalizeEmail,
} from "@/lib/cache/blueprintCache";
import {
  calculateAndPersistChart,
  claimSessionForUser,
} from "@/lib/supabase/chartSession";
import { synthesizeAndPersistBlueprint } from "@/lib/supabase/blueprintSession";
import { InMemorySupabaseAdmin } from "./helpers/mockSupabase";
import {
  makeChartBundleResult,
  makeCleanBlueprintPayload,
} from "./helpers/fixtures";

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
    reset: () => {
      fetchCount = 0;
    },
  };
}

function makeSpyLlmProvider() {
  let calls = 0;
  const provider: LlmProvider = {
    providerName: "spy-llm",
    modelName: "gemini-3.8-flash-test",
    async generateStructuredJson(_sys, _user, schema) {
      calls += 1;
      const payload = makeCleanBlueprintPayload("single");
      payload.hook_proof_json.career.fitHeadline = `Run ${calls} Alignment Fit`;
      return schema.parse(payload);
    },
  };
  return {
    provider,
    getCalls: () => calls,
    reset: () => {
      calls = 0;
    },
  };
}

test("hash helpers normalize email, coordinates, precision mode, and context deterministically", () => {
  assert.equal(normalizeEmail("  Test@Example.COM "), "test@example.com");

  const h1 = computeBirthInputHash({
    dob: "1991-03-22",
    tob: null,
    precisionMode: "dob_only",
    lat: 41.87814,
    lon: -87.62984,
    tz: -6,
  });
  const h2 = computeBirthInputHash({
    dob: "1991-03-22",
    tob: "",
    precisionMode: "date_only",
    lat: 41.87849,
    lon: -87.62951,
    tz: -6,
  });
  assert.equal(h1, h2);

  const c1 = computeContextHash({
    firstName: " Alex ",
    relationshipStatus: "single",
    careerMode: "employed",
    careerField: " Product Design ",
  });
  const c2 = computeContextHash({
    firstName: "alex",
    relationshipStatus: "single",
    careerMode: "employed",
    careerField: "product design",
  });
  assert.equal(c1, c2);
});

test("Slice 3.5 4-Case Matrix: Case A (Full Cache Hit), Case B (Context Update), Case C (Birth Time Update), and Paid Guardrail", async () => {
  const prevDevUnlock = process.env.DEV_UNLOCK_PREVIEW;
  process.env.DEV_UNLOCK_PREVIEW = "false";

  try {
    const db = new InMemorySupabaseAdmin();
    const astroSpy = makeSpyAstroProvider();
    const llmSpy = makeSpyLlmProvider();

    const baseBirth = {
      firstName: "Alex",
      birthDate: "1991-03-22",
      birthCity: "Chicago, IL",
      birthLat: 41.8781,
      birthLon: -87.6298,
      birthTz: -6,
      precisionMode: "dob_only" as const,
      birthTime: null,
      birthWindow: null,
      relationshipStatus: "single" as const,
      careerMode: "employed" as const,
      careerField: "Engineering",
    };

    // =========================================================================
    // Test 1 (Case D -> Case A): Brand new email -> then normalized same email
    // =========================================================================
    const calc1 = await calculateAndPersistChart(
      { ...baseBirth, email: "Test@Example.com", sessionToken: "pb_s1" },
      { admin: db.asAdminClient(), astroProvider: astroSpy.provider }
    );
    assert.equal(calc1.cacheCase, "D");
    assert.equal(calc1.cached, false);
    assert.equal(astroSpy.getFetchCount(), 1);

    const synth1 = await synthesizeAndPersistBlueprint({
      chartId: calc1.chartId,
      sessionToken: calc1.sessionToken,
      email: "Test@Example.com",
      profileOverride: {
        firstName: baseBirth.firstName,
        relationshipStatus: baseBirth.relationshipStatus,
        careerMode: baseBirth.careerMode,
        careerField: baseBirth.careerField,
      },
      llmProvider: llmSpy.provider,
      admin: db.asAdminClient(),
    });
    assert.equal(synth1.cached, false);
    assert.equal(synth1.llmCallsMade, 1);
    assert.equal(db.tables.natal_charts.length, 1);
    assert.equal(db.tables.blueprints.length, 1);
    assert.equal(db.tables.natal_charts[0].email, "test@example.com");
    assert.equal(db.tables.blueprints[0].email, "test@example.com");

    const originalChartId = db.tables.natal_charts[0].id as string;
    const originalBlueprintId = db.tables.blueprints[0].id as string;
    const originalBirthHash = db.tables.natal_charts[0].birth_input_hash as string;
    const originalContextHash = db.tables.blueprints[0].context_hash as string;

    // Resubmit with mixed-case/whitespace email & identical inputs -> Case A
    astroSpy.reset();
    llmSpy.reset();
    const calc2 = await calculateAndPersistChart(
      { ...baseBirth, email: " test@example.com ", sessionToken: "pb_s2" },
      { admin: db.asAdminClient(), astroProvider: astroSpy.provider }
    );
    assert.equal(calc2.cacheCase, "A");
    assert.equal(calc2.cached, true);
    assert.equal(calc2.apiCallsMade, 0);
    assert.equal(calc2.chartId, originalChartId);
    assert.equal(astroSpy.getFetchCount(), 0);

    const synth2 = await synthesizeAndPersistBlueprint({
      chartId: calc2.chartId,
      sessionToken: calc2.sessionToken,
      email: " test@example.com ",
      profileOverride: {
        firstName: baseBirth.firstName,
        relationshipStatus: baseBirth.relationshipStatus,
        careerMode: baseBirth.careerMode,
        careerField: baseBirth.careerField,
      },
      llmProvider: llmSpy.provider,
      admin: db.asAdminClient(),
    });
    assert.equal(synth2.cached, true);
    assert.equal(synth2.llmCallsMade, 0);
    assert.equal(llmSpy.getCalls(), 0);
    assert.equal(db.tables.natal_charts.length, 1);
    assert.equal(db.tables.blueprints.length, 1);

    // =========================================================================
    // Test 2 (Case B): Context-only change (careerMode -> founder)
    // =========================================================================
    astroSpy.reset();
    llmSpy.reset();
    const calc3 = await calculateAndPersistChart(
      {
        ...baseBirth,
        email: "test@example.com",
        careerMode: "founder",
        sessionToken: "pb_s3",
      },
      { admin: db.asAdminClient(), astroProvider: astroSpy.provider }
    );
    assert.equal(calc3.cacheCase, "B");
    assert.equal(calc3.cached, true);
    assert.equal(calc3.apiCallsMade, 0);
    assert.equal(astroSpy.getFetchCount(), 0);
    assert.equal(db.tables.natal_charts.length, 1);
    assert.equal(db.tables.blueprints.length, 1);

    const synth3 = await synthesizeAndPersistBlueprint({
      chartId: calc3.chartId,
      sessionToken: calc3.sessionToken,
      email: "test@example.com",
      profileOverride: {
        firstName: baseBirth.firstName,
        relationshipStatus: baseBirth.relationshipStatus,
        careerMode: "founder",
        careerField: baseBirth.careerField,
      },
      llmProvider: llmSpy.provider,
      admin: db.asAdminClient(),
    });
    assert.equal(synth3.cached, false);
    assert.equal(synth3.llmCallsMade, 1);
    assert.equal(llmSpy.getCalls(), 1);
    assert.equal(db.tables.natal_charts.length, 1);
    assert.equal(db.tables.blueprints.length, 1);
    assert.equal(db.tables.blueprints[0].id, originalBlueprintId);
    assert.notEqual(db.tables.blueprints[0].context_hash, originalContextHash);

    // =========================================================================
    // Test 3 (Case C): Birth time added -> updates in place, preserves is_paid
    // =========================================================================
    astroSpy.reset();
    llmSpy.reset();
    const calc4 = await calculateAndPersistChart(
      {
        ...baseBirth,
        email: "test@example.com",
        careerMode: "founder",
        precisionMode: "exact",
        birthTime: "08:30",
        sessionToken: "pb_s4",
      },
      { admin: db.asAdminClient(), astroProvider: astroSpy.provider }
    );
    assert.equal(calc4.cacheCase, "C");
    assert.equal(calc4.cached, false);
    assert.equal(astroSpy.getFetchCount(), 1);
    assert.equal(db.tables.natal_charts.length, 1);
    assert.equal(db.tables.natal_charts[0].id, originalChartId);
    assert.equal(db.tables.natal_charts[0].precision_mode, "exact");
    assert.notEqual(
      db.tables.natal_charts[0].birth_input_hash,
      originalBirthHash
    );

    const synth4 = await synthesizeAndPersistBlueprint({
      chartId: calc4.chartId,
      sessionToken: calc4.sessionToken,
      email: "test@example.com",
      profileOverride: {
        firstName: baseBirth.firstName,
        relationshipStatus: baseBirth.relationshipStatus,
        careerMode: "founder",
        careerField: baseBirth.careerField,
      },
      llmProvider: llmSpy.provider,
      admin: db.asAdminClient(),
    });
    assert.equal(synth4.cached, false);
    assert.equal(synth4.llmCallsMade, 1);
    assert.equal(db.tables.blueprints.length, 1);
    assert.equal(db.tables.blueprints[0].id, originalBlueprintId);
    assert.equal(db.tables.blueprints[0].is_paid, false);

    // =========================================================================
    // Test 4: Paid Account Privacy Guardrail + Authenticated Owner Preservation
    // =========================================================================
    db.tables.blueprints[0].is_paid = true;
    const paidHashSnapshot = db.tables.natal_charts[0].birth_input_hash;
    const paidCtxSnapshot = db.tables.blueprints[0].context_hash;

    astroSpy.reset();
    llmSpy.reset();

    await assert.rejects(
      () =>
        calculateAndPersistChart(
          {
            ...baseBirth,
            email: "TEST@EXAMPLE.COM",
            careerMode: "transition",
            sessionToken: "pb_attacker",
          },
          { admin: db.asAdminClient(), astroProvider: astroSpy.provider }
        ),
      (err: unknown) =>
        err instanceof ExistingPaidAccountError &&
        err.status === "existing_paid_account" &&
        err.message === EXISTING_PAID_ACCOUNT_MESSAGE
    );

    await assert.rejects(
      () =>
        synthesizeAndPersistBlueprint({
          chartId: originalChartId,
          sessionToken: calc4.sessionToken,
          email: "TEST@EXAMPLE.COM",
          profileOverride: { careerMode: "transition" },
          llmProvider: llmSpy.provider,
          admin: db.asAdminClient(),
        }),
      (err: unknown) =>
        err instanceof ExistingPaidAccountError &&
        err.status === "existing_paid_account"
    );

    assert.equal(astroSpy.getFetchCount(), 0);
    assert.equal(llmSpy.getCalls(), 0);
    assert.equal(db.tables.natal_charts[0].birth_input_hash, paidHashSnapshot);
    assert.equal(db.tables.blueprints[0].context_hash, paidCtxSnapshot);
    assert.equal(db.tables.blueprints[0].is_paid, true);

    // Claim via Supabase Auth email -> links user_id without creating duplicates
    const claimRes = await claimSessionForUser(
      {
        userId: "user-uuid-123",
        userEmail: "Test@Example.com",
      },
      { admin: db.asAdminClient() }
    );
    assert.equal(claimRes.chartId, originalChartId);
    assert.equal(claimRes.blueprintId, originalBlueprintId);
    assert.equal(claimRes.isPaid, true);
    assert.equal(db.tables.natal_charts.length, 1);
    assert.equal(db.tables.blueprints.length, 1);
    assert.equal(db.tables.profiles.length, 1);
    assert.equal(db.tables.natal_charts[0].user_id, "user-uuid-123");
    assert.equal(db.tables.blueprints[0].user_id, "user-uuid-123");
    assert.equal(db.tables.profiles[0].email, "test@example.com");

    // Authenticated owner CAN update birth time (Case C) and is_paid stays true
    const authedUpdate = await calculateAndPersistChart(
      {
        ...baseBirth,
        email: "test@example.com",
        careerMode: "founder",
        precisionMode: "exact",
        birthTime: "09:15",
        userId: "user-uuid-123",
        userEmail: "test@example.com",
      },
      { admin: db.asAdminClient(), astroProvider: astroSpy.provider }
    );
    assert.equal(authedUpdate.cacheCase, "C");
    const authedSynth = await synthesizeAndPersistBlueprint({
      chartId: authedUpdate.chartId,
      email: "test@example.com",
      userId: "user-uuid-123",
      userEmail: "test@example.com",
      profileOverride: {
        firstName: baseBirth.firstName,
        relationshipStatus: baseBirth.relationshipStatus,
        careerMode: "founder",
        careerField: baseBirth.careerField,
      },
      llmProvider: llmSpy.provider,
      admin: db.asAdminClient(),
    });
    assert.equal(authedSynth.isPaid, true);
    assert.ok(authedSynth.full_blueprint_json);
    assert.equal(db.tables.blueprints[0].is_paid, true);
    assert.equal(db.tables.blueprints[0].id, originalBlueprintId);
  } finally {
    if (prevDevUnlock === undefined) delete process.env.DEV_UNLOCK_PREVIEW;
    else process.env.DEV_UNLOCK_PREVIEW = prevDevUnlock;
  }
});
