import test from "node:test";
import assert from "node:assert/strict";
import { auditBlueprintOutput } from "@/lib/llm/guardrails";
import { SynthesizedBlueprintSchema } from "@/lib/llm/blueprintSchema";
import { zodToJsonSchema } from "@/lib/llm/zodToJsonSchema";
import { makeCleanBlueprintPayload } from "./helpers/fixtures";

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
});
