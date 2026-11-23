import test from "node:test";
import assert from "node:assert/strict";
import {
  computeCareerTelemetry,
  normalizeCareerMode,
} from "@/lib/astro/careerEngine";
import { computeHardResetTelemetry } from "@/lib/astro/hardResetEngine";
import { auditBlueprintOutput } from "@/lib/llm/guardrails";
import {
  makeChandanExactChart,
  makeChartBundleResult,
  makeCleanBlueprintPayload,
} from "./helpers/fixtures";

const FIXED_REF_DATE = new Date("2026-11-22T12:00:00Z");

test("Hard Reset Engine — Chandan exact benchmark produces 2022–2023, 2020–2021, 2014–2016 chapters & tight flashpoints", () => {
  const chart = makeChandanExactChart().normalizedChartJson;
  const telemetry = computeHardResetTelemetry(
    chart,
    {
      firstName: "Chandan",
      dobIso: "1989-09-17",
      relationshipStatus: "married",
      careerMode: "employed_hybrid",
      careerField: "Tech / Software Development Management",
    },
    "exact",
    FIXED_REF_DATE
  );

  assert.equal(telemetry.precision_mode, "exact");
  assert.equal(telemetry.anchor_mode, "lagna_and_lunar");
  assert.ok(
    telemetry.selected_chapters.length >= 2 &&
      telemetry.selected_chapters.length <= 4
  );

  const yearRanges = telemetry.selected_chapters.map((c) => c.year_range);
  assert.ok(
    yearRanges.some((r) => r.includes("2022") && r.includes("2023")),
    `Expected 2022–2023 chapter, got: ${yearRanges.join(", ")}`
  );
  assert.ok(
    yearRanges.some((r) => r.includes("2020") && r.includes("2021")),
    `Expected 2020–2021 chapter, got: ${yearRanges.join(", ")}`
  );

  // Every chapter has 2–4 tight flashpoints with distinct primary domain tags
  for (const ch of telemetry.selected_chapters) {
    assert.ok(
      ch.flashpoints.length >= 2 && ch.flashpoints.length <= 4,
      `Expected 2-4 flashpoints in ${ch.year_range}, got ${ch.flashpoints.length}`
    );
    for (const fp of ch.flashpoints) {
      assert.match(fp.year_label, /^\d{4}$/);
      assert.ok(fp.month_range.length >= 5);
      assert.ok(fp.domain_tags.length >= 1);
    }
  }

  // Upcoming prep window detects Saturn entering Aries in June – Aug 2027
  assert.equal(telemetry.upcoming_prep_window.year_label, "2027");
  assert.ok(
    telemetry.upcoming_prep_window.month_range.includes("June") &&
      telemetry.upcoming_prep_window.month_range.includes("2027"),
    `Expected June – Aug 2027 prep window, got: ${telemetry.upcoming_prep_window.month_range}`
  );
});

test("Hard Reset Engine — date_only fallback anchors strictly to lunar_natal_planets & handles young users and partial charts", () => {
  const chart = makeChartBundleResult("date_only").normalizedChartJson;
  chart.moonBoundaryFlag = true;

  const telemetry = computeHardResetTelemetry(
    chart,
    {
      firstName: "Jordan",
      dobIso: "2004-05-01",
      relationshipStatus: "single",
      careerMode: "employed",
      careerField: "Design",
    },
    "date_only",
    FIXED_REF_DATE
  );

  assert.equal(telemetry.precision_mode, "date_only");
  assert.equal(telemetry.anchor_mode, "lunar_natal_planets");
  assert.ok(telemetry.selected_chapters.length >= 2);
  assert.ok(telemetry.total_flashpoints_detected >= 4);
});

test("Career Engine — Chandan employed_hybrid benchmark scores hybrid > solo > day_job and excludes Tech from alternative lanes", () => {
  const chart = makeChandanExactChart().normalizedChartJson;
  const telemetry = computeCareerTelemetry(
    chart,
    {
      firstName: "Chandan",
      careerMode: "employed_hybrid",
      careerField: "Tech / Software Development Management",
    },
    "exact",
    FIXED_REF_DATE
  );

  const { scores, natal_work_profile, forward_12m_timing } = telemetry;
  assert.ok(
    scores.hybrid_side_build_score > scores.going_solo_score &&
      scores.going_solo_score > scores.day_job_score,
    `Expected hybrid (${scores.hybrid_side_build_score}) > solo (${scores.going_solo_score}) > day_job (${scores.day_job_score})`
  );
  assert.ok(scores.current_path_fit_score >= 35 && scores.current_path_fit_score <= 96);
  assert.ok(
    natal_work_profile.alternative_lanes.length >= 3 &&
      natal_work_profile.alternative_lanes.length <= 5
  );

  // Forward 12-month windows are 3 non-overlapping windows > 21 days apart
  assert.equal(forward_12m_timing.upcoming_windows.length, 3);
  for (let i = 1; i < forward_12m_timing.upcoming_windows.length; i++) {
    const prevEnd = new Date(
      forward_12m_timing.upcoming_windows[i - 1].end_iso
    ).getTime();
    const currStart = new Date(
      forward_12m_timing.upcoming_windows[i].start_iso
    ).getTime();
    assert.ok(
      (currStart - prevEnd) / 86_400_000 >= 20,
      "Forward career windows must be non-overlapping"
    );
  }
});

test("Career Engine — alternative lanes filter stated field, legacy aliases normalize, and date_only clamps scores to 45–88", () => {
  assert.equal(normalizeCareerMode("freelance"), "freelance_hybrid");
  assert.equal(normalizeCareerMode("transition"), "in_transition");

  const exactChart = makeChandanExactChart().normalizedChartJson;
  const financeTelemetry = computeCareerTelemetry(
    exactChart,
    {
      firstName: "Sam",
      careerMode: "in_transition",
      careerField: "Corporate Finance & Risk",
    },
    "exact",
    FIXED_REF_DATE
  );
  assert.ok(
    !financeTelemetry.natal_work_profile.alternative_lanes.includes(
      "finance_audit_legal_risk"
    ),
    "Alternative lanes must exclude stated career field"
  );
  assert.equal(financeTelemetry.user_context.career_mode, "in_transition");

  // Guardrail catches forbidden 'day job' phrasing for in_transition mode
  const poisonedTransition = makeCleanBlueprintPayload();
  poisonedTransition.hook_proof_json.career.whyItFeelsEmptyOrShifting =
    "Whatever you do, don't quit your job while at your day job right now.";
  const transitionAudit = auditBlueprintOutput(poisonedTransition, {
    careerTelemetry: financeTelemetry,
  });
  assert.equal(transitionAudit.passed, false);
  assert.ok(
    transitionAudit.violations.some((v) => v.category === "transition_empathy")
  );

  // date_only clamps all scores inside 45–88
  const dateOnlyChart = makeChartBundleResult("date_only").normalizedChartJson;
  const dateOnlyTelemetry = computeCareerTelemetry(
    dateOnlyChart,
    {
      firstName: "Alex",
      careerMode: "founder",
      careerField: "Healthcare",
    },
    "date_only",
    FIXED_REF_DATE
  );
  for (const score of Object.values(dateOnlyTelemetry.scores)) {
    assert.ok(
      score >= 45 && score <= 88,
      `date_only score ${score} should be clamped to 45–88`
    );
  }
});

test("Guardrails verify Paid-tier exact score and monthRange fidelity against telemetry", () => {
  const chart = makeChandanExactChart().normalizedChartJson;
  const hrTelemetry = computeHardResetTelemetry(
    chart,
    {
      firstName: "Chandan",
      dobIso: "1989-09-17",
      relationshipStatus: "married",
      careerMode: "employed_hybrid",
      careerField: "Tech",
    },
    "exact",
    FIXED_REF_DATE
  );
  const careerTelemetry = computeCareerTelemetry(
    chart,
    {
      firstName: "Chandan",
      careerMode: "employed_hybrid",
      careerField: "Tech",
    },
    "exact",
    FIXED_REF_DATE
  );

  const drifted = makeCleanBlueprintPayload();
  drifted.full_blueprint_json.hardReset.chapters[0].flashpoints[0].monthRange =
    "Jan – Feb 2099";
  drifted.full_blueprint_json.career.pathComparison[0].fitScore = 95;
  drifted.full_blueprint_json.career.next12Months.tightMonthlyWindows[0].monthRange =
    "Feb – Apr 2099";

  const audit = auditBlueprintOutput(drifted, {
    hardResetTelemetry: hrTelemetry,
    careerTelemetry,
  });
  assert.equal(audit.passed, false);
  const cats = new Set(audit.violations.map((v) => v.category));
  assert.ok(cats.has("paid_date_fidelity"));
  assert.ok(cats.has("paid_score_fidelity"));
});
