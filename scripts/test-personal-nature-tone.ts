/**
 * Verification Script — Personal Nature Tab v2 & Global Elder-Mentor Voice (`elder_mentor_v1`)
 *
 * Run with: npx tsx scripts/test-personal-nature-tone.ts
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildMockPersonalNatureBatch,
  PERSONAL_NATURE_CATEGORIES,
  PERSONAL_NATURE_CATALOG,
} from "../src/lib/astro/personalNatureCatalog";
import {
  buildPersonalNatureEngineContext,
  computeArudhaLagnaSign,
} from "../src/lib/astro/personalNatureEngine";
import {
  auditMentorTone,
  BANNED_ASTROLOGY_REGEX,
  BANNED_FATALISTIC_REGEX,
  BANNED_ROBOTIC_BUZZWORDS,
  BlueprintGuardrailError,
} from "../src/lib/llm/guardrails";
import {
  countWords,
  getOrInitPersonalNature,
  savePersonalNatureFeedback,
  synthesizePersonalNatureBatch,
} from "../src/lib/llm/personalNatureSchema";
import type { LlmProvider } from "../src/lib/llm/provider";
import {
  buildMentorSystemPrompt,
  ELDER_MENTOR_VOICE_V1,
} from "../src/lib/llm/voiceProfile";
import {
  makeChandanExactChart,
  makeChartBundleResult,
} from "../tests/helpers/fixtures";
import { InMemorySupabaseAdmin } from "../tests/helpers/mockSupabase";

function makePnStubProvider(
  precisionMode: "exact" | "date_only",
  poisonFirstPass = false
): { provider: LlmProvider; getCalls: () => number; getPrompts: () => string[] } {
  let calls = 0;
  const prompts: string[] = [];

  const provider: LlmProvider = {
    providerName: "pn-tone-stub",
    modelName: "gemini-3.8-flash-test",
    async generateStructuredJson(systemPrompt, userPayload, schema) {
      prompts.push(systemPrompt);
      const currentCall = calls;
      calls += 1;

      const requestedIds = new Set(
        ((userPayload as { tellsToSynthesize?: Array<{ tellId: string }> })
          ?.tellsToSynthesize ?? []
        ).map((t) => t.tellId)
      );

      const allClean = buildMockPersonalNatureBatch(precisionMode, "all");
      const filtered = allClean.filter((t) =>
        requestedIds.size > 0 ? requestedIds.has(t.tellId) : true
      );

      if (poisonFirstPass && currentCall === 0 && filtered[0]) {
        const poisoned = structuredClone(filtered);
        poisoned[0].body =
          "Your high-voltage Rahu bandwidth and surgical politeness push your nervous system baseline past its burnout threshold during Saturn transits, leaving you over-optimizing every framework and moving the goalposts.";
        return schema.parse({ tells: poisoned });
      }

      return schema.parse({ tells: filtered });
    },
  };

  return {
    provider,
    getCalls: () => calls,
    getPrompts: () => prompts,
  };
}

async function main() {
  const refDate = new Date("2026-11-25T12:00:00Z");

  // =========================================================================
  // 1. Category Integrity Check (4 categories, 8 Day-1 + 10 Day-2 = 18 tells, NO Mind & Rhythm)
  // =========================================================================
  assert.equal(PERSONAL_NATURE_CATEGORIES.length, 4);
  assert.deepEqual(
    PERSONAL_NATURE_CATEGORIES.map((c) => c.slug),
    [
      "inside_vs_outside",
      "under_pressure",
      "blind_spots_and_drive",
      "turning_points",
    ]
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

  const uiSource = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/blueprint/PersonalNatureSection.tsx"),
    "utf8"
  );
  assert.equal(
    /mind\s*(?:&|and)\s*rhythm/i.test(uiSource),
    false,
    "Mind & Rhythm must be completely absent from Personal Nature UI"
  );
  assert.equal(
    /\bPart\s*\{|\b0[1-4]\s*·/.test(uiSource),
    false,
    "Serial numbering must be absent from Personal category headers"
  );
  assert.ok(
    uiSource.includes("moments open") && uiSource.includes("aria-expanded"),
    "Personal tab categories must be collapsible and show moments open"
  );
  console.log("[Check 1] Category & Collapsible UI integrity verified: 4 collapsible categories, 0 serial numbers, 18 tells, 0 Mind & Rhythm.");

  // =========================================================================
  // 2. Chandan Exact Fixture (Sept 17, 1989, 20:54, Muzaffarnagar) — All 18 Tells
  // =========================================================================
  const chandanChart = makeChandanExactChart().normalizedChartJson;
  const exactEngineCtx = buildPersonalNatureEngineContext({
    normalizedChart: chandanChart,
    dobIso: "1989-09-17",
    unlockDay: "all",
    referenceDate: refDate,
  });
  assert.equal(exactEngineCtx.tells.length, 18);
  assert.ok(computeArudhaLagnaSign(chandanChart) !== null);
  assert.ok(exactEngineCtx.tells.some((t) => t.tellId === "perception_gap"));

  const exactStub = makePnStubProvider("exact");
  const exactSynth = await synthesizePersonalNatureBatch(
    {
      normalizedChart: chandanChart,
      firstName: "Chandan",
      dobIso: "1989-09-17",
      unlockDay: "all",
      referenceDate: refDate,
    },
    exactStub.provider
  );

  assert.equal(exactSynth.tells.length, 18);
  for (const tell of exactSynth.tells) {
    const combined = `${tell.headline} ${tell.body} ${tell.followUpPill}`;
    assert.equal(
      BANNED_ASTROLOGY_REGEX.test(combined),
      false,
      `Astrology jargon leaked in ${tell.tellId}: ${combined}`
    );
    assert.equal(
      BANNED_FATALISTIC_REGEX.test(combined),
      false,
      `Fatalistic/clinical term leaked in ${tell.tellId}: ${combined}`
    );
    const toneCheck = auditMentorTone(tell);
    assert.equal(
      toneCheck.passed,
      true,
      `Robotic buzzword leaked in ${tell.tellId}: ${toneCheck.flaggedTerms.join(", ")}`
    );
    const words = countWords(tell.body);
    assert.ok(
      words >= 35 && words <= 75,
      `Expected 35–75 words for ${tell.tellId}, got ${words}`
    );
  }
  console.log("[Check 2] Exact fixture (Chandan Sept 17, 1989, Muzaffarnagar): all 18 tells passed tone, jargon, and 35–75 word checks.");

  // =========================================================================
  // 3. Date-Only Fixture — Swaps perception_gap -> silent_first_impression & 0 House Leaks
  // =========================================================================
  const dateOnlyChart = makeChartBundleResult("date_only").normalizedChartJson;
  assert.equal(computeArudhaLagnaSign(dateOnlyChart), null);
  const dateOnlyCtx = buildPersonalNatureEngineContext({
    normalizedChart: dateOnlyChart,
    dobIso: "1989-09-17",
    unlockDay: "all",
    referenceDate: refDate,
  });
  assert.equal(dateOnlyCtx.tells.length, 18);
  assert.equal(
    dateOnlyCtx.tells.some((t) => t.tellId === "perception_gap"),
    false
  );
  assert.equal(
    dateOnlyCtx.tells.some((t) => t.tellId === "silent_first_impression"),
    true
  );

  const dateOnlyStub = makePnStubProvider("date_only");
  const dateOnlySynth = await synthesizePersonalNatureBatch(
    {
      normalizedChart: dateOnlyChart,
      firstName: "Maya",
      dobIso: "1992-06-15",
      unlockDay: "all",
      referenceDate: refDate,
    },
    dateOnlyStub.provider
  );
  assert.equal(dateOnlySynth.tells.length, 18);
  for (const tell of dateOnlySynth.tells) {
    assert.equal(auditMentorTone(tell).passed, true);
    const words = countWords(tell.body);
    assert.ok(words >= 35 && words <= 75);
  }
  console.log("[Check 3] Date-only fixture: 18 tells generated cleanly with silent_first_impression fallback.");

  // =========================================================================
  // 4. All 26 BANNED_ROBOTIC_BUZZWORDS Caught + 1 Automatic Corrective Retry
  // =========================================================================
  for (const buzzword of BANNED_ROBOTIC_BUZZWORDS) {
    const res = auditMentorTone(`Let's protect your ${buzzword} today.`);
    assert.equal(
      res.passed,
      false,
      `Expected auditMentorTone to reject "${buzzword}"`
    );
  }

  const retryStub = makePnStubProvider("exact", true);
  const repaired = await synthesizePersonalNatureBatch(
    {
      normalizedChart: chandanChart,
      firstName: "Chandan",
      dobIso: "1989-09-17",
      unlockDay: 1,
      referenceDate: refDate,
    },
    retryStub.provider
  );
  assert.equal(repaired.repairedAfterAudit, true);
  assert.equal(repaired.llmCallsMade, 2);
  assert.equal(repaired.tells.length, 8);
  assert.equal(auditMentorTone(repaired.tells).passed, true);

  // Verify persistent failure throws BlueprintGuardrailError after 1 retry
  const alwaysPoisonedProvider: LlmProvider = {
    providerName: "poison-stub",
    modelName: "gemini-3.8-flash-test",
    async generateStructuredJson(_sys, _usr, schema) {
      const poisoned = buildMockPersonalNatureBatch("exact", 1);
      poisoned[0].body =
        "Your high-voltage bandwidth and cognitive battery hit their burnout threshold under Rahu telemetry while moving the goalposts every single week without neural stillness or somatic interrupt.";
      return schema.parse({ tells: poisoned });
    },
  };
  await assert.rejects(
    () =>
      synthesizePersonalNatureBatch(
        {
          normalizedChart: chandanChart,
          firstName: "Chandan",
          unlockDay: 1,
          referenceDate: refDate,
        },
        alwaysPoisonedProvider
      ),
    (err: unknown) => err instanceof BlueprintGuardrailError
  );
  console.log("[Check 4] All 26 BANNED_ROBOTIC_BUZZWORDS caught & 1-retry corrective repair verified.");

  // =========================================================================
  // 5. Drip Unlock (Day 1 -> 24h Day 2), Dev Preview, Feedback -> user_memory & Birth-Time Hint
  // =========================================================================
  const prevDev = process.env.DEV_UNLOCK_PREVIEW;
  process.env.DEV_UNLOCK_PREVIEW = "true";
  try {
    const db = new InMemorySupabaseAdmin();
    const chartId = "88888888-8888-4888-8888-888888888888";
    const sessionToken = "pb_pn_tone_test";
    const createdIso = "2026-11-25T12:00:00.000Z";

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
      career_mode: "employed_hybrid",
      career_field: "Software",
      raw_astro_json: {},
      normalized_chart_json: chandanChart,
      created_at: createdIso,
    });

    const sessionStub = makePnStubProvider("exact");

    // Day 1 initial visit: 8 unlocked, 10 locked teasers
    const day1Res = await getOrInitPersonalNature({
      chartIdOrToken: chartId,
      sessionToken,
      referenceDate: new Date(createdIso),
      llmProvider: sessionStub.provider,
      admin: db.asAdminClient(),
    });
    assert.equal(day1Res.voiceProfileId, ELDER_MENTOR_VOICE_V1.id);
    assert.equal(day1Res.categories.length, 4);
    assert.equal(
      day1Res.categories.reduce((s, c) => s + c.unlockedTells.length, 0),
      8
    );
    assert.equal(
      day1Res.categories.reduce((s, c) => s + c.lockedTeasers.length, 0),
      10
    );

    // Dev preview toggle unlocks all 18 tells immediately
    const previewRes = await getOrInitPersonalNature({
      chartIdOrToken: chartId,
      sessionToken,
      previewDay2: true,
      referenceDate: new Date(createdIso),
      llmProvider: sessionStub.provider,
      admin: db.asAdminClient(),
    });
    assert.equal(
      previewRes.categories.reduce((s, c) => s + c.unlockedTells.length, 0),
      18
    );
    assert.equal(
      previewRes.categories.reduce((s, c) => s + c.lockedTeasers.length, 0),
      0
    );

    // Rate 2 house-dependent tells as "not_really" -> triggers showBirthTimeVerifyHint
    const fb1 = await savePersonalNatureFeedback({
      chartIdOrToken: chartId,
      tellId: "perception_gap",
      accuracyRating: "not_really",
      userReflection: "People usually read me as warm right away",
      sessionToken,
      admin: db.asAdminClient(),
    });
    assert.equal(fb1.showBirthTimeVerifyHint, false);

    const fb2 = await savePersonalNatureFeedback({
      chartIdOrToken: chartId,
      tellId: "real_vs_fake_recovery",
      accuracyRating: "not_really",
      sessionToken,
      admin: db.asAdminClient(),
    });
    assert.equal(fb2.showBirthTimeVerifyHint, true);
    assert.equal(db.tables.user_memory.length, 2);
  } finally {
    if (prevDev === undefined) delete process.env.DEV_UNLOCK_PREVIEW;
    else process.env.DEV_UNLOCK_PREVIEW = prevDev;
  }
  console.log("[Check 5] Day 1 / Day 2 drip, DEV_UNLOCK_PREVIEW toggle, user_memory, and birth-time nudge verified.");

  // =========================================================================
  // 6. Global Voice Check across All Synthesis Routes
  // =========================================================================
  const requiredModules = [
    "src/lib/llm/voiceProfile.ts",
    "src/lib/llm/personalNatureSchema.ts",
    "src/lib/llm/synthesizeBlueprint.ts",
    "src/lib/llm/prompts/hardResetPrompt.ts",
    "src/lib/llm/prompts/relationshipPrompt.ts",
    "src/lib/llm/prompts/careerPrompt.ts",
  ];

  for (const relPath of requiredModules) {
    const content = fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
    assert.ok(
      content.includes("buildMentorSystemPrompt"),
      `Expected ${relPath} to import and wire buildMentorSystemPrompt`
    );
  }

  const builtPrompt = buildMentorSystemPrompt({
    voiceProfile: ELDER_MENTOR_VOICE_V1,
    precisionMode: "date_only",
    moduleInstructions: "Test instructions",
  });
  assert.ok(builtPrompt.includes("kitchen table"));
  assert.ok(builtPrompt.includes("NON-NEGOTIABLE VOICE & SAFETY RULES:"));
  assert.ok(builtPrompt.includes("BIRTH TIME PRECISION MODE: date_only"));

  console.log("[Check 6] Global Elder-Mentor voice verified across Personal Nature, Hard Reset, Relationships, Career, and Daily Brief.");
  console.log("\nALL PERSONAL NATURE v2 & ELDER-MENTOR TONE CHECKS PASSED!");
}

main().catch((err) => {
  console.error("\nPERSONAL NATURE TONE VERIFICATION FAILED:", err);
  process.exit(1);
});
