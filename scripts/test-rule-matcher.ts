/**
 * Verification Script — Deterministic Rule Matcher & Knowledge Grounding
 *
 * Run with: npx tsx scripts/test-rule-matcher.ts
 */

import assert from "node:assert/strict";
import {
  computeChaldeanDigit,
  matchChartRules,
  RULE_MATCHER_VERSION,
} from "../src/lib/astro/ruleMatcher";
import { SynthesizedBlueprintSchema } from "../src/lib/llm/blueprintSchema";
import { auditBlueprintOutput } from "../src/lib/llm/guardrails";
import type { LlmProvider } from "../src/lib/llm/provider";
import { synthesizeBlueprint } from "../src/lib/llm/synthesizeBlueprint";
import {
  makeChandanExactChart,
  makeChartBundleResult,
  makeCleanBlueprintPayload,
} from "../tests/helpers/fixtures";

async function main() {
  // =========================================================================
  // TEST 1: Exact mode — Moon & Lagna Nakshatra, Houses, Patterns, Dosha, Relationship
  // =========================================================================
  console.log("=== Test 1: Exact Mode Rule Matching ===");
  const exactChart = makeChandanExactChart().normalizedChartJson;
  const exactCtx = matchChartRules(exactChart, {
    transitMoonHouse: 10,
  });

  assert.equal(exactCtx.ruleMatcherVersion, RULE_MATCHER_VERSION);
  assert.equal(exactCtx.precisionMode, "exact");
  assert.equal(exactCtx.houseFrame, "lagna");

  // Reference lenses (exact includes selfLens & publicImageLens)
  assert.ok(exactCtx.referenceLenses.selfLens && exactCtx.referenceLenses.selfLens.length > 10);
  assert.ok(
    exactCtx.referenceLenses.publicImageLens &&
      exactCtx.referenceLenses.publicImageLens.length > 10
  );
  assert.ok(exactCtx.referenceLenses.emotionalLens.length > 10);
  assert.ok(exactCtx.referenceLenses.purposeLens.length > 10);

  // Moon & Lagna Nakshatra traits (Bharani)
  assert.equal(exactCtx.nakshatraTraits.moon?.name, "Bharani");
  assert.equal(exactCtx.nakshatraTraits.lagna?.name, "Bharani");
  assert.ok(exactCtx.nakshatraTraits.moon?.coreImpulse.length);
  assert.ok(exactCtx.nakshatraTraits.moon?.strength.length);
  assert.ok(exactCtx.nakshatraTraits.moon?.blindSpot.length);
  assert.ok(exactCtx.nakshatraTraits.moon?.gunaEmphasis.primary.label.length);
  assert.ok(exactCtx.nakshatraTraits.moon?.coreDrive.description.length);

  // Active houses & planet-in-house patterns (Moon@1, Sun@6, Mars@6, Mercury@6, Venus@7, Rahu@10, Ketu@4 + House 3 Jupiter)
  const houseNums = exactCtx.activeHouses.map((h) => h.house);
  assert.ok(
    houseNums.includes(1) &&
      houseNums.includes(3) &&
      houseNums.includes(6) &&
      houseNums.includes(7) &&
      houseNums.includes(10),
    `Expected houses 1, 3, 6, 7, 10 in activeHouses, got ${houseNums.join(", ")}`
  );
  for (const [planet, house] of [
    ["Moon", 1],
    ["Sun", 6],
    ["Mars", 6],
    ["Mercury", 6],
    ["Venus", 7],
    ["Rahu", 10],
    ["Ketu", 4],
  ] as const) {
    assert.ok(
      exactCtx.planetPatterns.some((p) => p.planet === planet && p.house === house),
      `Expected ${planet} in house ${house} pattern`
    );
  }

  // Timing, Current Chapter Theme & Transit Moon State (house 10)
  assert.equal(exactCtx.timing.transitMoonState?.house, 10);
  assert.equal(exactCtx.timing.transitMoonState?.textOrWait, "GREEN");
  assert.deepEqual(exactCtx.timing.transitMoonState?.bandwidthRange, [78, 92]);
  assert.ok(exactCtx.timing.principles.functionalDignity.length > 10);
  assert.ok(exactCtx.timing.bandwidthThresholds.strongHouseSavMin === 28);
  assert.ok(exactCtx.timing.currentChapterTheme, "Expected currentChapterTheme for active era3 lord");
  assert.ok(exactCtx.timing.currentChapterTheme.focus.length > 10);
  assert.ok(exactCtx.timing.currentChapterTheme.pacingRisk.length > 10);
  assert.ok(exactCtx.timing.currentChapterTheme.agencyLever.length > 10);

  // Relationship guardrails + all 8 compatibilityDimensions (from compatibility_kutas.json)
  assert.ok(exactCtx.relationship.coreLenses.attractionAndChemistry.length > 10);
  assert.ok(exactCtx.relationship.coreLenses.innerBondAndDurability.length > 10);
  assert.ok(exactCtx.relationship.frictionGuardrails.driveHeatFriction.length > 10);
  assert.ok(exactCtx.relationship.frictionGuardrails.avoidSuperficialRejection.length > 10);
  for (const [k, v] of Object.entries(exactCtx.relationship.compatibilityDimensions)) {
    assert.ok(v.length > 10 && !v.includes("[cite:"), `Invalid compatibilityDimension ${k}: ${v}`);
  }

  // Dosha wellness routines (Aries Fire Lagna/Moon -> pitta)
  assert.equal(exactCtx.wellness.primaryDosha, "pitta");
  assert.ok(exactCtx.wellness.stressSignature && exactCtx.wellness.stressSignature.length > 10);
  assert.ok(exactCtx.wellness.quickMicroAnchor && exactCtx.wellness.quickMicroAnchor.length > 10);
  assert.equal(exactCtx.wellness.dailyReset.length, 3);
  assert.ok(exactCtx.wellness.somaticReset.bodyAnchor.length > 10);
  assert.ok(exactCtx.wellness.somaticReset.breathPause.length > 10);
  assert.ok(exactCtx.wellness.somaticReset.witnessShift.length > 10);

  // Exact mode must NOT emit numerologyFallback
  assert.equal(exactCtx.numerologyFallback, null);

  console.log("Test 1 PASSED:", {
    moonNakshatra: exactCtx.nakshatraTraits.moon?.name,
    activeHouses: houseNums,
    planetPatterns: exactCtx.planetPatterns.map((p) => `${p.planet}@H${p.house}`),
    primaryDosha: exactCtx.wellness.primaryDosha,
    transitMoon10: exactCtx.timing.transitMoonState?.textOrWait,
  });

  // =========================================================================
  // TEST 2: date_only mode — Omits Lagna rules, includes Chaldean fallback
  // =========================================================================
  console.log("\n=== Test 2: date_only Mode & Chaldean Fallback ===");
  const dateOnlyChart = makeChartBundleResult("date_only").normalizedChartJson;
  const dateOnlyCtx = matchChartRules(dateOnlyChart, {
    fullName: "Maya Lin",
    dob: "1992-06-15",
  });

  assert.equal(dateOnlyCtx.precisionMode, "date_only");
  assert.equal(dateOnlyCtx.houseFrame, "moon");
  assert.equal(dateOnlyCtx.referenceLenses.selfLens, undefined);
  assert.equal(dateOnlyCtx.referenceLenses.publicImageLens, undefined);
  assert.equal(dateOnlyCtx.nakshatraTraits.lagna, null);
  assert.equal(dateOnlyCtx.timing.currentChapterDignity, null);
  assert.ok(dateOnlyCtx.timing.currentChapterTheme, "date_only still resolves currentChapterTheme");

  const expectedDigit = computeChaldeanDigit({ fullName: "Maya Lin", dob: "1992-06-15" });
  assert.ok(expectedDigit && dateOnlyCtx.numerologyFallback);
  assert.equal(dateOnlyCtx.numerologyFallback.digit, expectedDigit.digit);
  assert.equal(dateOnlyCtx.numerologyFallback.source, "name");
  assert.ok(dateOnlyCtx.numerologyFallback.theme.length > 10);
  assert.ok(dateOnlyCtx.numerologyFallback.growthEdge.length > 10);

  // Also check DOB-only Chaldean fallback when fullName is omitted
  const dobOnlyCtx = matchChartRules(dateOnlyChart, { dob: "1992-06-15" });
  assert.equal(dobOnlyCtx.numerologyFallback?.source, "dob");
  assert.equal(dobOnlyCtx.numerologyFallback?.digit, 6); // 1+9+9+2+0+6+1+5 = 33 -> 6

  console.log("Test 2 PASSED:", {
    houseFrame: dateOnlyCtx.houseFrame,
    lagnaNakshatra: dateOnlyCtx.nakshatraTraits.lagna,
    numerologyByName: dateOnlyCtx.numerologyFallback,
    numerologyByDob: dobOnlyCtx.numerologyFallback,
  });

  // =========================================================================
  // TEST 3: End-to-End Synthesis + Knowledge Injection + Zero Jargon Guardrail
  // =========================================================================
  console.log("\n=== Test 3: End-to-End Guardrail & Payload Injection Check ===");
  let capturedUserPayload: Record<string, unknown> = {};
  let capturedSystemPrompt = "";
  let callCount = 0;

  const spyProvider: LlmProvider = {
    providerName: "rule-matcher-test-stub",
    modelName: "gemini-2.5-flash-test",
    async generateStructuredJson(sys, user, schema) {
      callCount += 1;
      if (callCount === 1) {
        capturedSystemPrompt = sys;
        capturedUserPayload = (user ?? {}) as Record<string, unknown>;
        // Intentionally leak a Sanskrit term on pass 1 to verify guardrail repair loop
        const poisoned = makeCleanBlueprintPayload("married");
        poisoned.full_blueprint_json.selfSabotage.antidoteSteps[0] =
          "Calm your Pitta heat with a Sattva breath pause before replying.";
        return schema.parse(poisoned);
      }
      // Pass 2 (auto-repair) returns clean everyday mentor copy grounded in matchedKnowledgeContext
      return schema.parse(makeCleanBlueprintPayload("married"));
    },
  };

  const synthResult = await synthesizeBlueprint(
    {
      normalizedChart: exactChart,
      profile: {
        firstName: "Chandan",
        dobIso: "1989-09-17",
        relationshipStatus: "married",
        careerMode: "employed",
        careerField: "Software Engineering",
      },
      transitMoonHouse: 10,
    },
    spyProvider
  );

  // Verify matchedKnowledgeContext and grounding rule were injected
  assert.ok(
    capturedSystemPrompt.includes("KNOWLEDGE GROUNDING RULE"),
    "System prompt must include KNOWLEDGE GROUNDING RULE"
  );
  assert.ok(
    "matchedKnowledgeContext" in capturedUserPayload,
    "User payload sent to LLM must include matchedKnowledgeContext"
  );
  const injectedCtx = capturedUserPayload.matchedKnowledgeContext as {
    ruleMatcherVersion: string;
    wellness: { primaryDosha: string };
  };
  assert.equal(injectedCtx.ruleMatcherVersion, RULE_MATCHER_VERSION);
  assert.equal(injectedCtx.wellness.primaryDosha, "pitta");

  // Verify repair occurred and final output passes Zod + 0 jargon violations
  assert.equal(synthResult.repairedAfterAudit, true);
  assert.equal(synthResult.llmCallsMade, 2);

  const zodCheck = SynthesizedBlueprintSchema.safeParse(synthResult.payload);
  assert.ok(
    zodCheck.success,
    `Zod validation failed: ${zodCheck.success ? "" : zodCheck.error.message}`
  );

  const auditCheck = auditBlueprintOutput(synthResult.payload);
  assert.equal(
    auditCheck.passed,
    true,
    `Expected 0 jargon violations, found: ${auditCheck.flaggedTerms.join(", ")}`
  );

  console.log("Test 3 PASSED:", {
    repairedAfterAudit: synthResult.repairedAfterAudit,
    llmCallsMade: synthResult.llmCallsMade,
    zodPassed: zodCheck.success,
    jargonViolations: auditCheck.violations.length,
  });

  console.log("\nALL RULE MATCHER TESTS PASSED!");
}

main().catch((err) => {
  console.error("\nTEST FAILED:", err);
  process.exit(1);
});
