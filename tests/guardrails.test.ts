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
});
