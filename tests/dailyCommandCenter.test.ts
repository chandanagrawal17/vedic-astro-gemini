import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDailyCommandCenterData,
  buildSevenDayCalendar,
  computeSiderealMoonLahiri,
  evaluateMoveAudit,
  evaluateTextOrWait,
  selectDailyDirective,
} from "@/lib/astro/dailyTransitEngine";
import {
  auditBlueprintOutput,
  BANNED_ASTROLOGY_REGEX,
  BANNED_FATALISTIC_REGEX,
  CLICHE_REGEX,
  CORPORATE_BUZZWORD_REGEX,
} from "@/lib/llm/guardrails";
import { BlueprintServiceError } from "@/lib/supabase/blueprintSession";
import {
  auditCalendarMoveAndLog,
  checkTextOrWaitAndLog,
  getOrInitDailyCommandCenter,
  recordSomaticResetCompletion,
  toggleDailyMemoryTag,
} from "@/lib/supabase/dailySession";
import { makeChandanExactChart, makeChartBundleResult, makeCleanBlueprintPayload } from "./helpers/fixtures";
import { InMemorySupabaseAdmin } from "./helpers/mockSupabase";

test("computeSiderealMoonLahiri matches verified Lahiri checkpoints within 0.02 deg", () => {
  const cp1 = computeSiderealMoonLahiri(new Date("1989-09-17T15:24:00Z"));
  assert.equal(cp1.rasiNo, 1);
  assert.equal(cp1.nakshatra, "Ashwini");
  assert.ok(Math.abs(cp1.localDegree - 1.277) < 0.05);

  const cp2 = computeSiderealMoonLahiri(new Date("2026-11-23T18:00:00Z"));
  assert.equal(cp2.rasiNo, 1);
  assert.equal(cp2.nakshatra, "Bharani");
  assert.ok(Math.abs(cp2.localDegree - 25.095) < 0.05);

  const cp3 = computeSiderealMoonLahiri(new Date("2026-11-28T18:00:00Z"));
  assert.equal(cp3.rasiNo, 4);
  assert.equal(cp3.nakshatra, "Pushya");
  assert.ok(Math.abs(cp3.localDegree - 9.787) < 0.05);
});

test("buildDailyCommandCenterData produces clean, jargon-free copy across exact and moon-boundary modes", () => {
  const exactChart = makeChandanExactChart().normalizedChartJson;
  const payload = buildDailyCommandCenterData({
    chartId: "chart-exact-1",
    normalizedChart: exactChart,
    tzOffsetHours: -6,
    careerMode: "employed_hybrid",
    relationshipStatus: "single",
    excludedDirectiveIds: [],
    referenceDate: new Date("2026-11-23T18:00:00Z"),
  });

  assert.equal(payload.checkinDate, "2026-11-23");
  assert.equal(payload.precisionNote, null);
  assert.ok(payload.bandwidthScore >= 40 && payload.bandwidthScore <= 95);
  assert.equal(payload.sevenDayCalendar.length, 7);
  assert.equal(payload.somaticReset.durationSeconds, 90);
  assert.equal(payload.somaticReset.phases.length, 3);

  // Check zero jargon/cliché/fatalistic leaks across all generated user-facing strings
  const serialized = JSON.stringify(payload);
  for (const rx of [
    BANNED_ASTROLOGY_REGEX,
    BANNED_FATALISTIC_REGEX,
    CLICHE_REGEX,
    CORPORATE_BUZZWORD_REGEX,
  ]) {
    assert.equal(serialized.match(rx), null, `Unexpected guardrail hit: ${serialized.match(rx)}`);
  }

  // Also test date_only + moonBoundaryFlag fallback
  const boundaryChart = makeChartBundleResult("date_only").normalizedChartJson;
  boundaryChart.moonBoundaryFlag = true;
  const fallbackPayload = buildDailyCommandCenterData({
    chartId: "chart-boundary-1",
    normalizedChart: boundaryChart,
    tzOffsetHours: -5,
    excludedDirectiveIds: [],
    referenceDate: new Date("2026-11-23T18:00:00Z"),
  });
  assert.equal(fallbackPayload.precisionMode, "dob_only");
  assert.ok(fallbackPayload.precisionNote && fallbackPayload.precisionNote.includes("exact birth time"));
  assert.ok(fallbackPayload.bandwidthScore >= 48 && fallbackPayload.bandwidthScore <= 82);
});

test("selectDailyDirective excludes prior 3 days of directive IDs and Text-or-Wait / Move Audit obey guardrails", () => {
  const first = selectDailyDirective({
    chartId: "c1",
    dateIso: "2026-11-23",
    toneStatus: "GREEN",
    careerMode: "founder",
    excludedDirectiveIds: [],
  });
  const second = selectDailyDirective({
    chartId: "c1",
    dateIso: "2026-11-23",
    toneStatus: "GREEN",
    careerMode: "founder",
    excludedDirectiveIds: [first.directiveId],
  });
  assert.notEqual(first.directiveId, second.directiveId);

  const exactChart = makeChandanExactChart().normalizedChartJson;
  for (const intent of ["dating", "work", "conflict", "money"] as const) {
    const res = evaluateTextOrWait({
      normalizedChart: exactChart,
      tzOffsetHours: -6,
      intent,
      urgency: "now",
      referenceDate: new Date("2026-11-23T18:00:00Z"),
    });
    const text = `${res.badge} ${res.guidance} ${res.speakableScript}`;
    assert.equal(text.match(BANNED_ASTROLOGY_REGEX), null);
    assert.equal(text.match(BANNED_FATALISTIC_REGEX), null);
  }

  const cal = buildSevenDayCalendar({
    normalizedChart: exactChart,
    tzOffsetHours: -6,
    referenceDate: new Date("2026-11-23T18:00:00Z"),
  });
  const focusDay = cal.find((d) => d.mode === "FOCUS") ?? cal[0];
  const audit = evaluateMoveAudit({
    calendar: cal,
    dateIso: focusDay.dateIso,
    action: "pitch",
  });
  assert.ok(audit.headline.length > 5 && audit.guidance.length > 10);
  const auditAudit = auditBlueprintOutput({ hook_proof_json: {}, full_blueprint_json: { audit } });
  assert.equal(auditAudit.passed, true);
});

test("dailySession enforces unlocked paywall, 3-day anti-repetition cache, memory tags, somatic resets, and decision logs", async () => {
  const prevDevUnlock = process.env.DEV_UNLOCK_PREVIEW;
  process.env.DEV_UNLOCK_PREVIEW = "false";

  try {
    const db = new InMemorySupabaseAdmin();
    const chartBundle = makeChandanExactChart();
    const chartId = "77777777-7777-4777-8777-777777777777";
    const sessionToken = "pb_daily_test_1";

    db.tables.natal_charts.push({
      id: chartId,
      user_id: null,
      session_token: sessionToken,
      email: "daily@example.com",
      dob: "1989-09-17",
      tob: "20:54",
      birth_window: null,
      precision_mode: "exact",
      birth_city: "Chicago, IL",
      lat: 41.88,
      lon: -87.63,
      tz: -6,
      moon_boundary_flag: false,
      first_name: "Chandan",
      relationship_status: "single",
      career_mode: "employed_hybrid",
      career_field: "Tech/Software",
      raw_astro_json: chartBundle.rawAstroJson,
      normalized_chart_json: chartBundle.normalizedChartJson,
    });

    const clean = makeCleanBlueprintPayload("single");
    db.tables.blueprints.push({
      id: "bp-daily-1",
      chart_id: chartId,
      user_id: null,
      session_token: sessionToken,
      email: "daily@example.com",
      context_hash: "ctx_daily",
      hook_proof_json: clean.hook_proof_json,
      full_blueprint_json: clean.full_blueprint_json,
      accuracy_feedback: null,
      model_version: "gemini-3.8-flash",
      is_paid: false,
      unlock_tier: null,
    });

    // 1. Unpaid user is blocked (403)
    await assert.rejects(
      () =>
        getOrInitDailyCommandCenter({
          chartIdOrToken: chartId,
          sessionToken,
          referenceDate: new Date("2026-11-23T18:00:00Z"),
          admin: db.asAdminClient(),
        }),
      (err: unknown) => err instanceof BlueprintServiceError && err.statusCode === 403
    );

    // 2. Unlock blueprint & seed 3 prior days of directives to test anti-repetition
    db.tables.blueprints[0].is_paid = true;
    const baseline = selectDailyDirective({
      chartId,
      dateIso: "2026-11-23",
      toneStatus: "GREEN",
      careerMode: "employed_hybrid",
      relationshipStatus: "single",
      excludedDirectiveIds: [],
    });
    db.tables.daily_checkins.push({
      id: "dc-prev-1",
      chart_id: chartId,
      blueprint_id: "bp-daily-1",
      checkin_date: "2026-11-21",
      bandwidth_score: 80,
      tone_status: "GREEN",
      directive_id: baseline.directiveId,
      directive_text: baseline.text,
      memory_tags: [],
      somatic_resets_completed: 0,
    });

    const daily1 = await getOrInitDailyCommandCenter({
      chartIdOrToken: chartId,
      sessionToken,
      referenceDate: new Date("2026-11-23T18:00:00Z"),
      admin: db.asAdminClient(),
    });
    assert.notEqual(
      daily1.payload.dailyDirective.directiveId,
      baseline.directiveId,
      "3-day anti-repetition must exclude directive shown 2 days ago"
    );
    assert.equal(db.tables.daily_checkins.length, 2);

    // 3. Re-reading today returns the exact cached directive
    const daily2 = await getOrInitDailyCommandCenter({
      chartIdOrToken: chartId,
      sessionToken,
      referenceDate: new Date("2026-11-23T18:00:00Z"),
      admin: db.asAdminClient(),
    });
    assert.equal(
      daily2.payload.dailyDirective.directiveId,
      daily1.payload.dailyDirective.directiveId
    );
    assert.equal(db.tables.daily_checkins.length, 2);

    // 4. Memory tags & Somatic Reset persist cleanly
    const tagged = await toggleDailyMemoryTag({
      chartIdOrToken: chartId,
      tag: "helped_pause",
      sessionToken,
      referenceDate: new Date("2026-11-23T18:00:00Z"),
      admin: db.asAdminClient(),
    });
    assert.deepEqual(tagged.memoryTags, ["helped_pause"]);

    const untagged = await toggleDailyMemoryTag({
      chartIdOrToken: chartId,
      tag: "helped_pause",
      sessionToken,
      referenceDate: new Date("2026-11-23T18:00:00Z"),
      admin: db.asAdminClient(),
    });
    assert.deepEqual(untagged.memoryTags, []);

    const somatic = await recordSomaticResetCompletion({
      chartIdOrToken: chartId,
      sessionToken,
      referenceDate: new Date("2026-11-23T18:00:00Z"),
      admin: db.asAdminClient(),
    });
    assert.equal(somatic.somaticResetsCompletedToday, 1);

    // 5. Text or Wait + Move Audit log to decision_logs
    const tow = await checkTextOrWaitAndLog({
      chartIdOrToken: chartId,
      intent: "dating",
      urgency: "now",
      sessionToken,
      referenceDate: new Date("2026-11-23T18:00:00Z"),
      admin: db.asAdminClient(),
    });
    assert.equal(tow.result.intent, "dating");

    const audit = await auditCalendarMoveAndLog({
      chartIdOrToken: chartId,
      dateIso: "2026-11-25",
      action: "pitch",
      sessionToken,
      referenceDate: new Date("2026-11-23T18:00:00Z"),
      admin: db.asAdminClient(),
    });
    assert.equal(audit.result.dateIso, "2026-11-25");
    assert.equal(db.tables.decision_logs.length, 2);

    // 6. Current browser tzOffsetHours (+5.5 India) overrides birth chart.tz (-6 US Central)
    const rolloverUtc = new Date("2026-11-24T02:00:00Z");
    const chicagoDefault = await getOrInitDailyCommandCenter({
      chartIdOrToken: chartId,
      sessionToken,
      referenceDate: rolloverUtc,
      admin: db.asAdminClient(),
    });
    assert.equal(chicagoDefault.payload.checkinDate, "2026-11-23");

    const indiaOverride = await getOrInitDailyCommandCenter({
      chartIdOrToken: chartId,
      sessionToken,
      tzOffsetHours: 5.5,
      referenceDate: rolloverUtc,
      admin: db.asAdminClient(),
    });
    assert.equal(indiaOverride.payload.checkinDate, "2026-11-24");
    assert.equal(indiaOverride.payload.sevenDayCalendar[0]?.dateIso, "2026-11-24");
  } finally {
    if (prevDevUnlock === undefined) delete process.env.DEV_UNLOCK_PREVIEW;
    else process.env.DEV_UNLOCK_PREVIEW = prevDevUnlock;
  }
});

test("Gochar Chandrashtama safeguard forces RED caution even when Lagna house is open", () => {
  // Find a 2026-11 UTC date where sidereal Moon is in Aries (rasiNo === 1)
  let ariesMoonUtc: Date | null = null;
  for (let day = 1; day <= 28; day++) {
    const candidate = new Date(Date.UTC(2026, 10, day, 12, 0, 0));
    if (computeSiderealMoonLahiri(candidate).rasiNo === 1) {
      ariesMoonUtc = candidate;
      break;
    }
  }
  assert.ok(ariesMoonUtc, "Expected a Nov 2026 UTC date with sidereal Aries Moon");

  const baseChart = makeChandanExactChart().normalizedChartJson;
  const chandrashtamaChart = {
    ...baseChart,
    corePlacements: {
      ...baseChart.corePlacements,
      ascendant: baseChart.corePlacements.ascendant
        ? { ...baseChart.corePlacements.ascendant, zodiac: "Aries", rasiNo: 1 }
        : null, // Transit Aries Moon = 1st from Lagna (normally GREEN)
      moon: baseChart.corePlacements.moon
        ? { ...baseChart.corePlacements.moon, zodiac: "Virgo", rasiNo: 6 }
        : null, // Transit Aries Moon = 8th from Virgo Moon (Chandrashtama)
    },
  };

  const daily = buildDailyCommandCenterData({
    chartId: "gochar-test",
    normalizedChart: chandrashtamaChart,
    tzOffsetHours: -6,
    careerMode: "employed_hybrid",
    relationshipStatus: "single",
    excludedDirectiveIds: [],
    referenceDate: ariesMoonUtc,
  });

  assert.equal(daily.toneStatus, "RED");
  assert.ok(
    daily.bandwidthScore <= 56,
    `Expected Chandrashtama bandwidthScore <= 56, got ${daily.bandwidthScore}`
  );
  assert.equal(
    BANNED_ASTROLOGY_REGEX.test(
      `${daily.toneLabel} ${daily.summary} ${daily.dailyDirective.text}`
    ),
    false
  );
});

test("directive pool supplies 30 unique directives with zero guardrail violations", () => {
  const seenIds = new Set<string>();
  const allTexts: string[] = [];
  const statuses = ["GREEN", "YELLOW", "RED"] as const;

  for (let i = 0; i < 30; i++) {
    const picked = selectDailyDirective({
      chartId: "pool-sweep-chart",
      dateIso: `2026-11-${String((i % 28) + 1).padStart(2, "0")}`,
      toneStatus: statuses[i % statuses.length],
      careerMode: i % 2 === 0 ? "employed_hybrid" : "founder",
      relationshipStatus: i % 3 === 0 ? "dating" : "single",
      excludedDirectiveIds: Array.from(seenIds),
    });
    assert.equal(
      seenIds.has(picked.directiveId),
      false,
      `Duplicate directive returned before exhausting pool: ${picked.directiveId}`
    );
    seenIds.add(picked.directiveId);
    allTexts.push(picked.text);
  }

  assert.equal(seenIds.size, 30);

  for (const text of allTexts) {
    assert.equal(BANNED_ASTROLOGY_REGEX.test(text), false, `Astrology jargon in directive: ${text}`);
    assert.equal(BANNED_FATALISTIC_REGEX.test(text), false, `Fatalistic term in directive: ${text}`);
    assert.equal(CLICHE_REGEX.test(text), false, `Cliche in directive: ${text}`);
    assert.equal(CORPORATE_BUZZWORD_REGEX.test(text), false, `Buzzword in directive: ${text}`);
  }
});

test("buildDailyCommandCenterData respects date_only moonBoundaryFlag without jargon", () => {
  const baseChart = makeChandanExactChart().normalizedChartJson;
  const boundaryChart = {
    ...baseChart,
    precisionMode: "date_only" as const,
    moonBoundaryFlag: true,
  };

  const daily = buildDailyCommandCenterData({
    chartId: "boundary-test",
    normalizedChart: boundaryChart,
    tzOffsetHours: -6,
    careerMode: "in_transition",
    relationshipStatus: "married",
    excludedDirectiveIds: [],
    referenceDate: new Date("2026-11-23T18:00:00Z"),
  });

  assert.equal(daily.precisionMode, "dob_only");
  assert.ok(daily.precisionNote && daily.precisionNote.length > 10);
  assert.ok(daily.bandwidthScore >= 48 && daily.bandwidthScore <= 82);
  assert.equal(
    BANNED_ASTROLOGY_REGEX.test(
      `${daily.precisionNote} ${daily.toneLabel} ${daily.summary} ${daily.dailyDirective.text}`
    ),
    false
  );
});
