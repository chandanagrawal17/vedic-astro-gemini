import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import { GET as getPersonalNatureRoute } from "@/app/api/personal-nature/[chartId]/route";
import { POST as postPersonalNatureFeedbackRoute } from "@/app/api/personal-nature/[chartId]/feedback/route";
import { PersonalNatureView } from "@/components/blueprint/PersonalNatureSection";
import {
  buildDemoPersonalNatureResponse,
  buildMockPersonalNatureBatch,
  PERSONAL_NATURE_CATEGORIES,
  PERSONAL_NATURE_CATALOG,
} from "@/lib/astro/personalNatureCatalog";
import {
  buildPersonalNatureEngineContext,
  computeArudhaLagnaSign,
} from "@/lib/astro/personalNatureEngine";
import {
  auditBlueprintOutput,
  auditMentorTone,
  BANNED_ASTROLOGY_REGEX,
  BANNED_ROBOTIC_BUZZWORDS,
} from "@/lib/llm/guardrails";
import { SynthesizedBlueprintSchema } from "@/lib/llm/blueprintSchema";
import {
  countWords,
  getOrInitPersonalNature,
  PersonalNatureFeedbackRequestSchema,
  savePersonalNatureFeedback,
  synthesizePersonalNatureBatch,
} from "@/lib/llm/personalNatureSchema";
import type { LlmProvider } from "@/lib/llm/provider";
import {
  buildMentorSystemPrompt,
  ELDER_MENTOR_VOICE_V1,
  loadActiveVoiceProfile,
  synthesizeDailyBriefDirective,
} from "@/lib/llm/voiceProfile";
import { BlueprintServiceError } from "@/lib/supabase/blueprintSession";
import { zodToJsonSchema } from "@/lib/llm/zodToJsonSchema";
import {
  makeChandanExactChart,
  makeChartBundleResult,
  makeCleanBlueprintPayload,
} from "./helpers/fixtures";
import { InMemorySupabaseAdmin } from "./helpers/mockSupabase";

test("auditBlueprintOutput passes clean modern psychology blueprint JSON", () => {
  const clean = makeCleanBlueprintPayload();
  const result = auditBlueprintOutput(clean);

  assert.equal(result.passed, true);
  assert.equal(result.violations.length, 0);
  assert.equal(result.flaggedTerms.length, 0);
});

test("auditBlueprintOutput allows normal English words like transition, leadership, and marshal", () => {
  const result = auditBlueprintOutput({
    headline: "Navigating a major career transition with calm leadership",
    notes: [
      "You marshal your focus well when people respect your boundaries.",
      "Transitioning into strategic ownership suits your operating style.",
    ],
  });

  assert.equal(result.passed, true, `Unexpected flags: ${result.flaggedTerms.join(", ")}`);
});

test("auditBlueprintOutput catches banned astrology, Sanskrit, numerology, and house terms", () => {
  const poisoned = {
    hook_proof_json: {
      hardReset: {
        chapterLabel: "Rahu Mahadasha & Sade Sati",
        description:
          "Your Saturn transit through the 10th house and Aries ascendant caused a Navamsha karmic shift.",
      },
      career: {
        subtitle: "Guided by Numerology & Upaay",
      },
    },
  };

  const result = auditBlueprintOutput(poisoned);
  assert.equal(result.passed, false);

  const lower = result.flaggedTerms.map((t) => t.toLowerCase());
  for (const expected of [
    "rahu",
    "mahadasha",
    "sade sati",
    "saturn",
    "transit",
    "10th house",
    "aries",
    "ascendant",
    "navamsha",
    "karmic",
    "numerology",
    "upaay",
  ]) {
    assert.ok(
      lower.includes(expected),
      `Expected guardrail to flag "${expected}", got: ${result.flaggedTerms.join(", ")}`
    );
  }
});

test("auditBlueprintOutput catches banned fatalistic and clinical terms with exact JSON paths", () => {
  const poisoned = {
    full_blueprint_json: {
      relationship: {
        silentFrictionPattern: "Fear of divorce or infidelity creates bad luck.",
      },
      selfSabotage: {
        antidoteSteps: [
          "Pause for 24 hours.",
          "Seek a therapist to diagnose clinical depression early.",
          "Breathe steadily.",
        ],
      },
    },
  };

  const result = auditBlueprintOutput(poisoned);
  assert.equal(result.passed, false);

  const paths = result.violations.map((v) => v.path);
  assert.ok(
    paths.includes("full_blueprint_json.relationship.silentFrictionPattern")
  );
  assert.ok(
    paths.includes("full_blueprint_json.selfSabotage.antidoteSteps[1]")
  );

  const lower = result.flaggedTerms.map((t) => t.toLowerCase());
  for (const term of [
    "divorce",
    "infidelity",
    "bad luck",
    "therapist",
    "diagnose",
    "clinical depression",
  ]) {
    assert.ok(lower.includes(term), `Expected to catch "${term}"`);
  }
});

test("auditBlueprintOutput catches clichés, corporate buzzwords, free-tier month leaks, and paid score leaks without false positives on everyday English", () => {
  const safeEnglish = makeCleanBlueprintPayload();
  safeEnglish.hook_proof_json.career.whyYouAreGood =
    "You may feel stretched at times, so don't fall into over-polishing—you spring into action and march forward calmly.";
  const safeRes = auditBlueprintOutput(safeEnglish);
  assert.equal(
    safeRes.passed,
    true,
    `Expected everyday verbs (may/fall/spring/march) to pass, got: ${safeRes.flaggedTerms.join(", ")}`
  );

  const poisoned = makeCleanBlueprintPayload();
  poisoned.hook_proof_json.hardReset.concreteRealLifeThemes[0] =
    "In Late Oct – Nov 2022, this period of deep transformation tested your resilience.";
  poisoned.hook_proof_json.career.whyYouAreGood =
    "You possess a surgical diagnostic mind with strong deliverables and a 91% side build fit in Dec 2026 – Jan 2027.";

  const result = auditBlueprintOutput(poisoned, {
    careerTelemetry: {
      precision_mode: "exact",
      user_context: {
        first_name: "Alex",
        career_mode: "employed_hybrid",
        career_field: "Software",
      },
      scores: {
        current_path_fit_score: 63,
        day_job_score: 60,
        going_solo_score: 72,
        hybrid_side_build_score: 91,
      },
      natal_work_profile: {
        sweet_spot_tags: [],
        natural_strength_tags: [],
        fulfillment_gap_tags: [],
        perception_gap: {
          inner_reality_tags: [],
          external_read_tags: [],
          tactical_shift_tag: "",
        },
        field_audit_hints: {
          keep_tags: [],
          missing_tags: [],
          ideal_bridge_tag: "",
        },
        alternative_lanes: ["a", "b", "c"],
        wealth_pattern: {
          compounding_style_tags: [],
          silent_income_leak_tags: [],
        },
        energy_pacing_tags: [],
      },
      forward_12m_timing: {
        macro_season_year_span: "Now – Mid-2027",
        timing_year_label: "2027",
        macro_posture_tag: "quiet_workshop",
        upcoming_windows: [
          {
            id: "cw_01",
            year_label: "2027",
            month_range: "Dec 2026 – Jan 2027",
            window_type: "momentum_ship_or_outreach",
            focus_tags: [],
            start_iso: "2026-12-01",
            end_iso: "2027-01-20",
          },
          {
            id: "cw_02",
            year_label: "2027",
            month_range: "Mar – May 2027",
            window_type: "friction_stay_cool",
            focus_tags: [],
            start_iso: "2027-03-01",
            end_iso: "2027-05-15",
          },
          {
            id: "cw_03",
            year_label: "2027",
            month_range: "June – Aug 2027",
            window_type: "chapter_shift_accountability",
            focus_tags: [],
            start_iso: "2027-06-02",
            end_iso: "2027-08-15",
          },
        ],
      },
    },
  });

  assert.equal(result.passed, false);
  const categories = new Set(result.violations.map((v) => v.category));
  assert.ok(categories.has("horoscope_cliche"), "Should catch clichés");
  assert.ok(categories.has("corporate_buzzword"), "Should catch corporate buzzwords");
  assert.ok(categories.has("free_tier_month_leak"), "Should catch leaked months in Free tier");
  assert.ok(categories.has("free_tier_score_leak"), "Should catch leaked paid career score (91%) in Free tier");
});

test("zodToJsonSchema generates valid JSON Schema for SynthesizedBlueprintSchema", () => {
  const jsonSchema = zodToJsonSchema(SynthesizedBlueprintSchema) as {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: boolean;
  };

  assert.equal(jsonSchema.type, "object");
  assert.equal(jsonSchema.additionalProperties, false);
  assert.deepEqual(jsonSchema.required, [
    "hook_proof_json",
    "full_blueprint_json",
  ]);
  assert.ok(jsonSchema.properties.hook_proof_json);
  assert.ok(jsonSchema.properties.full_blueprint_json);

  // Ensure Gemini FSM-exploding constraints are omitted from responseJsonSchema
  const serialized = JSON.stringify(jsonSchema);
  assert.equal(serialized.includes('"minItems"'), false);
  assert.equal(serialized.includes('"maxItems"'), false);
  assert.equal(serialized.includes('"minimum"'), false);
  assert.equal(serialized.includes('"maximum"'), false);
});

function createCleanPnStub(mode: "exact" | "date_only"): LlmProvider {
  return {
    providerName: "test-pn-stub",
    modelName: "gemini-3.8-flash-test",
    async generateStructuredJson(_sys, userPayload, schema) {
      const ids = new Set(
        ((userPayload as { tellsToSynthesize?: Array<{ tellId: string }> })
          ?.tellsToSynthesize ?? []
        ).map((t) => t.tellId)
      );
      const batch = buildMockPersonalNatureBatch(mode, "all").filter((t) =>
        ids.size > 0 ? ids.has(t.tellId) : true
      );
      return schema.parse({ tells: batch });
    },
  };
}

test("Personal Nature catalog defines 4 categories (no Mind & Rhythm) and 18 tells (8 Day-1 + 10 Day-2)", () => {
  assert.equal(PERSONAL_NATURE_CATEGORIES.length, 4);
  assert.equal(
    PERSONAL_NATURE_CATEGORIES.some((c) => /mind|rhythm/i.test(c.slug + c.title)),
    false
  );
  assert.equal(PERSONAL_NATURE_CATALOG.length, 18);
  assert.equal(
    PERSONAL_NATURE_CATALOG.filter((t) => t.unlockDay === 1).length,
    8
  );
  assert.equal(
    PERSONAL_NATURE_CATALOG.filter((t) => t.unlockDay === 2).length,
    10
  );
});

test("Personal Nature engine & synthesizer pass 0 jargon/robotic leaks across exact, date_only, and planet-like user names", async () => {
  const exactChart = makeChandanExactChart().normalizedChartJson;
  const dateOnlyChart = makeChartBundleResult("date_only").normalizedChartJson;

  assert.ok(computeArudhaLagnaSign(exactChart) !== null);
  assert.equal(computeArudhaLagnaSign(dateOnlyChart), null);

  const exactCtx = buildPersonalNatureEngineContext({
    normalizedChart: exactChart,
    dobIso: "1989-09-17",
  });
  const dateOnlyCtx = buildPersonalNatureEngineContext({
    normalizedChart: dateOnlyChart,
    dobIso: "1992-06-15",
  });

  assert.ok(exactCtx.tells.some((t) => t.tellId === "perception_gap"));
  assert.ok(
    dateOnlyCtx.tells.some((t) => t.tellId === "silent_first_impression")
  );
  assert.equal(
    dateOnlyCtx.tells.some((t) => t.tellId === "perception_gap"),
    false
  );

  const exactRes = await synthesizePersonalNatureBatch(
    {
      normalizedChart: exactChart,
      firstName: "Leo",
      dobIso: "1989-09-17",
      unlockDay: "all",
    },
    createCleanPnStub("exact")
  );
  assert.equal(exactRes.tells.length, 18);

  for (const tell of exactRes.tells) {
    assert.equal(BANNED_ASTROLOGY_REGEX.test(JSON.stringify(tell)), false);
    assert.equal(auditMentorTone(tell).passed, true);
    const wc = countWords(tell.body);
    assert.ok(wc >= 35 && wc <= 75, `Expected 35–75 words, got ${wc}`);
  }
});

test("auditMentorTone flags all 26 BANNED_ROBOTIC_BUZZWORDS and Daily Brief auto-repairs on 1 retry", async () => {
  for (const term of BANNED_ROBOTIC_BUZZWORDS) {
    const audit = auditMentorTone(`You are hitting a ${term} wall right now.`);
    assert.equal(audit.passed, false, `Should flag "${term}"`);
  }

  let calls = 0;
  const dailyStub: LlmProvider = {
    providerName: "daily-stub",
    modelName: "gemini-3.8-flash-test",
    async generateStructuredJson(_sys, _usr, schema) {
      calls += 1;
      if (calls === 1) {
        return schema.parse({
          directiveText:
            "Protect your cognitive battery and bandwidth instead of moving the goalposts today.",
        });
      }
      return schema.parse({
        directiveText:
          "You've been carrying a lot quietly this week—finish one meaningful task before noon and let tonight stay simple.",
      });
    },
  };

  const brief = await synthesizeDailyBriefDirective(
    {
      precisionMode: "exact",
      toneStatus: "YELLOW",
      toneLabel: "Steady Pacing",
      summary: "Quiet morning focus.",
    },
    dailyStub
  );
  assert.equal(brief.repairedAfterAudit, true);
  assert.equal(calls, 2);
  assert.equal(auditMentorTone(brief.directiveText).passed, true);
});

test("Personal Nature session enforces unlocked paywall (403), Day-1 -> 24h Day-2 drip, voice auto-upgrade, and locked-tell feedback guard", async () => {
  const prevDev = process.env.DEV_UNLOCK_PREVIEW;
  process.env.DEV_UNLOCK_PREVIEW = "false";

  try {
    const db = new InMemorySupabaseAdmin();
    const chartId = "99999999-9999-4999-8999-999999999999";
    const sessionToken = "pb_pn_unit_token";
    const t0 = new Date("2026-11-25T10:00:00.000Z");

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
      first_name: "Chandan",
      relationship_status: "married",
      career_mode: "employed",
      career_field: "Software",
      raw_astro_json: {},
      normalized_chart_json: makeChandanExactChart().normalizedChartJson,
      created_at: t0.toISOString(),
    });

    db.tables.blueprints.push({
      id: "bp-pn-1",
      chart_id: chartId,
      user_id: null,
      session_token: sessionToken,
      is_paid: false,
      hook_proof_json: {},
      full_blueprint_json: {},
      model_version: "gemini-3.8-flash",
      created_at: t0.toISOString(),
    });

    const stub = createCleanPnStub("exact");

    await assert.rejects(
      () =>
        getOrInitPersonalNature({
          chartIdOrToken: chartId,
          sessionToken,
          referenceDate: t0,
          llmProvider: stub,
          admin: db.asAdminClient(),
        }),
      (err: unknown) =>
        err instanceof BlueprintServiceError && err.statusCode === 403
    );

    db.tables.blueprints[0].is_paid = true;

    const day1 = await getOrInitPersonalNature({
      chartIdOrToken: chartId,
      sessionToken,
      referenceDate: t0,
      llmProvider: stub,
      admin: db.asAdminClient(),
    });
    assert.equal(day1.day2Unlocked, false);
    assert.equal(
      day1.categories.reduce((s, c) => s + c.unlockedTells.length, 0),
      8
    );
    assert.equal(
      day1.categories.reduce((s, c) => s + c.lockedTeasers.length, 0),
      10
    );

    await assert.rejects(
      () =>
        savePersonalNatureFeedback({
          chartIdOrToken: chartId,
          tellId: "advice_skepticism",
          accuracyRating: "uncanny",
          sessionToken,
          admin: db.asAdminClient(),
        }),
      (err: unknown) =>
        err instanceof BlueprintServiceError && err.statusCode === 404
    );

    await savePersonalNatureFeedback({
      chartIdOrToken: chartId,
      tellId: "core_contradiction",
      accuracyRating: "uncanny",
      userReflection: "Felt like my grandmother talking to me",
      sessionToken,
      admin: db.asAdminClient(),
    });

    db.tables.personal_nature_tells[0].voice_profile_id = "legacy_robotic_v0";
    const upgraded = await getOrInitPersonalNature({
      chartIdOrToken: chartId,
      sessionToken,
      referenceDate: t0,
      llmProvider: stub,
      admin: db.asAdminClient(),
    });
    const refreshedCore = upgraded.categories[0].unlockedTells.find(
      (t) => t.tellId === "core_contradiction"
    );
    assert.equal(refreshedCore?.accuracyRating, "uncanny");
    assert.equal(
      refreshedCore?.userReflection,
      "Felt like my grandmother talking to me"
    );
    assert.ok(
      db.tables.personal_nature_tells.every(
        (r) => r.voice_profile_id === ELDER_MENTOR_VOICE_V1.id
      )
    );

    const t25h = new Date(t0.getTime() + 25 * 3600 * 1000);
    const day2 = await getOrInitPersonalNature({
      chartIdOrToken: chartId,
      sessionToken,
      referenceDate: t25h,
      llmProvider: stub,
      admin: db.asAdminClient(),
    });
    assert.equal(day2.day2Unlocked, true);
    assert.equal(
      day2.categories.reduce((s, c) => s + c.unlockedTells.length, 0),
      18
    );

    const loadedProfile = await loadActiveVoiceProfile(db.asAdminClient());
    assert.equal(loadedProfile.id, "elder_mentor_v1");
    assert.ok(
      buildMentorSystemPrompt({
        voiceProfile: loadedProfile,
        precisionMode: "exact",
        moduleInstructions: "Check",
      }).includes("kitchen table")
    );

    const parsedSnake = PersonalNatureFeedbackRequestSchema.safeParse({
      tell_id: "core_contradiction",
      accuracy_rating: "mostly_me",
      user_reflection: "True\u0000 at work",
    });
    assert.equal(parsedSnake.success, true);
    if (parsedSnake.success) {
      assert.equal(parsedSnake.data.userReflection, "True at work");
    }
    assert.equal(PersonalNatureFeedbackRequestSchema.safeParse([]).success, false);

    const demoGetRes = await getPersonalNatureRoute(
      new NextRequest("http://localhost:3000/api/personal-nature/demo-session"),
      { params: Promise.resolve({ chartId: "demo-session" }) }
    );
    assert.equal(demoGetRes.status, 404);

    const badFbRes = await postPersonalNatureFeedbackRoute(
      new NextRequest("http://localhost:3000/api/personal-nature/abc/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tellId: "", accuracyRating: "invalid" }),
      }),
      { params: Promise.resolve({ chartId: "abc" }) }
    );
    assert.equal(badFbRes.status, 400);

    for (const file of [
      "src/lib/llm/voiceProfile.ts",
      "src/lib/llm/personalNatureSchema.ts",
      "src/lib/llm/synthesizeBlueprint.ts",
      "src/lib/llm/prompts/hardResetPrompt.ts",
      "src/lib/llm/prompts/relationshipPrompt.ts",
      "src/lib/llm/prompts/careerPrompt.ts",
    ]) {
      const src = fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
      assert.ok(src.includes("buildMentorSystemPrompt"));
    }
  } finally {
    if (prevDev === undefined) delete process.env.DEV_UNLOCK_PREVIEW;
    else process.env.DEV_UNLOCK_PREVIEW = prevDev;
  }
});

test("Personal tab UI standard: tab is named 'Personal', all 4 categories start collapsed on 1 screen with zero serial numbering, and expand cleanly on click", () => {
  const blueprintPageSrc = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/blueprint/page.tsx"),
    "utf8"
  );
  assert.match(
    blueprintPageSrc,
    /\{\s*id:\s*"personal_nature",\s*label:\s*"Personal"/
  );
  assert.ok(blueprintPageSrc.includes('requestedTab === "personal"'));

  const demoDay1 = buildDemoPersonalNatureResponse({
    firstName: "Chandan",
    precisionMode: "exact",
    previewDay2: false,
  });

  const collapsedHtml = renderToStaticMarkup(
    React.createElement(PersonalNatureView, {
      data: demoDay1,
      activeCategorySlug: null,
      onToggleCategory: () => {},
      previewDay2: false,
      togglingPreview: false,
      onTogglePreviewDay2: () => {},
      draftNotes: {},
      onChangeDraftNote: () => {},
      savingTellId: null,
      savedToastId: null,
      onRateTell: () => {},
    })
  );

  assert.equal((collapsedHtml.match(/aria-expanded="false"/g) ?? []).length, 4);
  assert.equal(collapsedHtml.includes('aria-expanded="true"'), false);
  assert.equal(
    collapsedHtml.includes("Capable Armor Around a Quietly Tender Heart"),
    false
  );
  assert.equal(/\b(?:0[1-4]\s*·|Part\s*[1-4])\b/i.test(collapsedHtml), false);
  assert.ok(collapsedHtml.includes("2 of 5 moments open"));
  assert.ok(collapsedHtml.includes("3 of 5 moments open"));
  assert.ok(collapsedHtml.includes("1 of 3 moments open"));
  assert.equal(/mind\s*(?:&amp;|&|and)\s*rhythm/i.test(collapsedHtml), false);

  const expandedHtml = renderToStaticMarkup(
    React.createElement(PersonalNatureView, {
      data: demoDay1,
      activeCategorySlug: "inside_vs_outside",
      onToggleCategory: () => {},
      previewDay2: false,
      togglingPreview: false,
      onTogglePreviewDay2: () => {},
      draftNotes: {},
      onChangeDraftNote: () => {},
      savingTellId: null,
      savedToastId: null,
      onRateTell: () => {},
    })
  );

  assert.equal((expandedHtml.match(/aria-expanded="true"/g) ?? []).length, 1);
  assert.equal((expandedHtml.match(/aria-expanded="false"/g) ?? []).length, 3);
  assert.ok(expandedHtml.includes("Capable Armor Around a Quietly Tender Heart"));
  assert.ok(expandedHtml.includes("Why You Rarely Take Advice at Face Value"));
  assert.equal(
    expandedHtml.includes("swallow someone&#x27;s advice just because they hold a fancy title"),
    false
  );
});
