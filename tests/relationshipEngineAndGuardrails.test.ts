import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  computeRelationshipTelemetry,
  normalizeRelationshipStatus,
} from "@/lib/astro/relationshipEngine";
import {
  normalizeFreePayloadForUi,
  normalizePaidPayloadForUi,
} from "@/lib/blueprint/normalizePayload";
import {
  RelationshipDeepDiveSchema,
  RelationshipProofSchema,
  SynthesizedBlueprintSchema,
} from "@/lib/llm/blueprintSchema";
import { auditBlueprintOutput } from "@/lib/llm/guardrails";
import type { LlmProvider } from "@/lib/llm/provider";
import { zodToJsonSchema } from "@/lib/llm/zodToJsonSchema";
import { POST as funnelEventRoute } from "@/app/api/funnel/event/route";
import { resetRateLimiter } from "@/lib/rateLimit";
import {
  getBlueprintById,
  saveBlueprintFeedback,
  synthesizeAndPersistBlueprint,
  updateRelationshipStatusAndResynthesize,
} from "@/lib/supabase/blueprintSession";
import type { BlueprintFreePayload, BlueprintPaidPayload } from "@/lib/types/blueprint";
import {
  makeChandanExactChart,
  makeChartBundleResult,
  makeCleanBlueprintPayload,
} from "./helpers/fixtures";
import { InMemorySupabaseAdmin } from "./helpers/mockSupabase";

const FIXED_REF_DATE = new Date("2026-11-22T12:00:00Z");

test("Relationship Engine — Chandan Single benchmark (exact) detects 2022–2023 past shift & 3 tight forward windows", () => {
  const chandanChart = makeChandanExactChart().normalizedChartJson;
  const telemetry = computeRelationshipTelemetry(
    chandanChart,
    {
      firstName: "Chandan",
      relationshipStatus: "single",
    },
    "exact",
    FIXED_REF_DATE
  );

  assert.equal(telemetry.precisionMode, "exact");
  assert.equal(telemetry.anchorMode, "lagnaAndVenus");
  assert.equal(telemetry.userContext.relationshipStatus, "single");
  assert.equal(telemetry.upgradeHint, null);

  assert.equal(telemetry.freeLayerSignals.pastLoveShift.yearRange, "2022 – 2023");
  assert.match(
    telemetry.freeLayerSignals.pastLoveShift.yearRange,
    /^\d{4}(\s?[–-]\s?\d{4})?$/
  );
  assert.match(
    telemetry.freeLayerSignals.lockedTimingYearLabel,
    /^\d{4}(\s?[–-]\s?\d{4})?$/
  );

  const windows = telemetry.paidLayerSignals.forward12mTiming.upcomingWindows;
  assert.equal(windows.length, 3);
  for (let i = 1; i < windows.length; i++) {
    const prevEnd = new Date(windows[i - 1].endIso).getTime();
    const currStart = new Date(windows[i].startIso).getTime();
    assert.ok(
      (currStart - prevEnd) / 86_400_000 >= 20,
      "Forward relationship windows must be non-overlapping"
    );
  }
});

test("Relationship Engine — normalizes legacy onboarding statuses and degrades gracefully on date_only", () => {
  assert.equal(normalizeRelationshipStatus("relationship"), "dating");
  assert.equal(normalizeRelationshipStatus("shifting"), "single");
  assert.equal(normalizeRelationshipStatus("dating"), "dating");
  assert.equal(normalizeRelationshipStatus("married"), "married");

  const dateOnlyChart = makeChartBundleResult("date_only").normalizedChartJson;
  const telemetry = computeRelationshipTelemetry(
    dateOnlyChart,
    {
      firstName: "Maya",
      relationshipStatus: "relationship",
    },
    "date_only",
    FIXED_REF_DATE
  );

  assert.equal(telemetry.precisionMode, "date_only");
  assert.equal(telemetry.anchorMode, "lunarVenusFallback");
  assert.equal(telemetry.userContext.relationshipStatus, "dating");
  assert.ok(
    typeof telemetry.upgradeHint === "string" &&
      telemetry.upgradeHint.length > 20
  );
  assert.equal(
    telemetry.paidLayerSignals.forward12mTiming.upcomingWindows.length,
    3
  );
});

test("zodToJsonSchema supports discriminatedUnion for RelationshipDeepDiveSchema", () => {
  const relJsonSchema = zodToJsonSchema(RelationshipDeepDiveSchema) as {
    anyOf?: Array<{ type: string; properties?: Record<string, unknown> }>;
  };
  assert.ok(Array.isArray(relJsonSchema.anyOf));
  assert.equal(relJsonSchema.anyOf.length, 3);

  const fullSchema = zodToJsonSchema(SynthesizedBlueprintSchema) as {
    properties?: {
      full_blueprint_json?: {
        properties?: { relationship?: { anyOf?: unknown[] } };
      };
    };
  };
  assert.ok(
    Array.isArray(
      fullSchema.properties?.full_blueprint_json?.properties?.relationship
        ?.anyOf
    )
  );
});

test("Guardrails catch love clichés, fatalism, cross-branch leaks, free-tier month leaks, and paid date drift", () => {
  const chandanChart = makeChandanExactChart().normalizedChartJson;
  const singleTelemetry = computeRelationshipTelemetry(
    chandanChart,
    { firstName: "Chandan", relationshipStatus: "single" },
    "exact",
    FIXED_REF_DATE
  );

  const poisonedSingle = makeCleanBlueprintPayload("single");
  poisonedSingle.hook_proof_json.relationship.caughtRedHandedTell =
    "You hate mixed signals like a twin flame in Dec 2026 – Jan 2027 while ignoring your spouse.";
  if (poisonedSingle.full_blueprint_json.relationship.relationshipStatus === "single") {
    poisonedSingle.full_blueprint_json.relationship.sparkVsPeace.whereTheGapHides =
      "Fear of divorce makes your spouse pull away.";
    poisonedSingle.full_blueprint_json.relationship.next12Months.tightMonthlyWindows[0].monthRange =
      "Feb – Mar 2099";
  }

  const audit = auditBlueprintOutput(poisonedSingle, {
    relationshipTelemetry: singleTelemetry,
  });
  assert.equal(audit.passed, false);

  const cats = new Set(audit.violations.map((v) => v.category));
  assert.ok(cats.has("love_cliche"));
  assert.ok(cats.has("fatalistic_clinical"));
  assert.ok(cats.has("free_tier_month_leak"));
  assert.ok(cats.has("cross_branch_leak"));
  assert.ok(cats.has("paid_date_fidelity"));

  // Married branch rejects dating app copy
  const marriedTelemetry = computeRelationshipTelemetry(
    chandanChart,
    { firstName: "Chandan", relationshipStatus: "married" },
    "exact",
    FIXED_REF_DATE
  );
  const poisonedMarried = makeCleanBlueprintPayload("married");
  if (poisonedMarried.full_blueprint_json.relationship.relationshipStatus === "married") {
    poisonedMarried.full_blueprint_json.relationship.marriageBlueprint.silentFrictionPoint =
      "You miss swiping on dating apps during stressful weeks.";
  }
  const marriedAudit = auditBlueprintOutput(poisonedMarried, {
    relationshipTelemetry: marriedTelemetry,
  });
  assert.equal(marriedAudit.passed, false);
  assert.ok(
    marriedAudit.violations.some((v) => v.category === "cross_branch_leak")
  );
});

test("Status-change partial re-synthesis preserves Hard Reset & Career, updates status/feedback, and redacts unpaid full payload", async () => {
  const prevDevUnlock = process.env.DEV_UNLOCK_PREVIEW;
  process.env.DEV_UNLOCK_PREVIEW = "false";

  try {
    const db = new InMemorySupabaseAdmin();
    const chartBundle = makeChartBundleResult("exact");
    const chartId = "44444444-4444-4444-8444-444444444444";
    const sessionToken = "pb_rel_switch_1";

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
      career_field: "Software",
      raw_astro_json: chartBundle.rawAstroJson,
      normalized_chart_json: chartBundle.normalizedChartJson,
    });

    const initialStub: LlmProvider = {
      providerName: "stub",
      modelName: "gemini-3.8-flash-test",
      async generateStructuredJson(_s, _u, schema) {
        return schema.parse(makeCleanBlueprintPayload("single"));
      },
    };

    const first = await synthesizeAndPersistBlueprint({
      chartId,
      sessionToken,
      llmProvider: initialStub,
      admin: db.asAdminClient(),
    });
    assert.equal(first.hook_proof_json.relationship.relationshipStatus, "single");
    assert.equal(first.full_blueprint_json, null);

    const savedFb = await saveBlueprintFeedback({
      chartIdOrToken: chartId,
      loveFeedback: "weirdly_accurate",
      sessionToken,
      admin: db.asAdminClient(),
    });
    assert.equal(savedFb.loveAccuracyFeedback, "weirdly_accurate");

    const originalHardReset = structuredClone(
      db.tables.blueprints[0].hook_proof_json
    ) as BlueprintFreePayload;
    const originalCareer = structuredClone(
      db.tables.blueprints[0].full_blueprint_json
    ) as BlueprintPaidPayload;

    const marriedStub: LlmProvider = {
      providerName: "stub-married",
      modelName: "gemini-3.8-flash-test",
      async generateStructuredJson(_s, _u, schema) {
        const married = makeCleanBlueprintPayload("married");
        return schema.parse({
          hookProofRelationship: married.hook_proof_json.relationship,
          fullBlueprintRelationship: married.full_blueprint_json.relationship,
        });
      },
    };

    const switched = await updateRelationshipStatusAndResynthesize({
      chartIdOrToken: chartId,
      relationshipStatus: "married",
      sessionToken,
      llmProvider: marriedStub,
      admin: db.asAdminClient(),
    });

    assert.equal(
      switched.hook_proof_json.relationship.relationshipStatus,
      "married"
    );
    assert.equal(switched.full_blueprint_json, null, "Unpaid switch must stay redacted");
    assert.equal(switched.loveAccuracyFeedback, null, "Status change resets love accuracy rating");
    assert.equal(db.tables.natal_charts[0].relationship_status, "married");

    assert.deepEqual(
      (db.tables.blueprints[0].hook_proof_json as BlueprintFreePayload).hardReset,
      originalHardReset.hardReset
    );
    assert.deepEqual(
      (db.tables.blueprints[0].full_blueprint_json as BlueprintPaidPayload).career,
      originalCareer.career
    );

    const unpaidGet = await getBlueprintById({
      chartIdOrToken: chartId,
      sessionToken,
      admin: db.asAdminClient(),
    });
    assert.equal(unpaidGet.full_blueprint_json, null);
    assert.equal(
      unpaidGet.hook_proof_json.relationship.relationshipStatus,
      "married"
    );
  } finally {
    if (prevDevUnlock === undefined) delete process.env.DEV_UNLOCK_PREVIEW;
    else process.env.DEV_UNLOCK_PREVIEW = prevDevUnlock;
  }
});

test("Legacy v1 relationship payloads normalize cleanly for UI without crashing", () => {
  const clean = makeCleanBlueprintPayload("single");
  const legacyFree = {
    ...clean.hook_proof_json,
    relationship: {
      branch: "partnered",
      archetype: "Quietly Devoted Partner",
      teaserBadge: "1 Trigger Detected",
    },
  } as unknown as BlueprintFreePayload;

  const normalizedFree = normalizeFreePayloadForUi(legacyFree);
  assert.ok(
    RelationshipProofSchema.safeParse(normalizedFree.relationship).success
  );
  assert.equal(normalizedFree.relationship.relationshipStatus, "married");

  const legacyPaid = {
    ...clean.full_blueprint_json,
    relationship: {
      coreAlignmentProfile: "You bond via steady follow-through.",
      silentFrictionPattern: "You go quiet when overloaded.",
      communicationShifts: ["State bandwidth upfront.", "Pause 10 seconds."],
      clarityWindow: "Next 6 Months",
    },
  } as unknown as BlueprintPaidPayload;

  const normalizedPaid = normalizePaidPayloadForUi(legacyPaid);
  assert.ok(normalizedPaid);
  assert.equal(normalizedPaid.relationship.relationshipStatus, "single");
});

test("Client funnel event endpoint accepts clicked_locked_relationship_guide", async () => {
  resetRateLimiter();
  const req = new NextRequest("http://localhost:3000/api/funnel/event", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "203.0.113.155",
    },
    body: JSON.stringify({ eventName: "clicked_locked_relationship_guide" }),
  });
  const res = await funnelEventRoute(req);
  assert.equal(res.status, 200);
});
