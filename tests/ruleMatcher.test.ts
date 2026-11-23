import assert from "node:assert/strict";
import test from "node:test";
import housesRulebook from "@/lib/knowledge/houses_and_lords.json";
import timingRulebook from "@/lib/knowledge/dasha_and_timing.json";
import ayurvedaRulebook from "@/lib/knowledge/ayurveda_and_resets.json";
import {
  cleanRuleText,
  computeChaldeanDigit,
  FOCUS_HOUSES,
  matchChartRules,
  RULE_MATCHER_VERSION,
} from "@/lib/astro/ruleMatcher";
import { BANNED_ASTROLOGY_REGEX } from "@/lib/llm/guardrails";
import {
  makeChandanExactChart,
  makeChartBundleResult,
} from "./helpers/fixtures";

test("knowledge rulebooks cover all 12 houses, expanded planet patterns, and clean jargon-free coaching text", () => {
  assert.deepEqual([...FOCUS_HOUSES], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

  for (let h = 1; h <= 12; h++) {
    const entry = housesRulebook.houses[String(h) as keyof typeof housesRulebook.houses];
    assert.ok(entry, `Missing house ${h} rule in houses_and_lords.json`);
    const cleanTheme = cleanRuleText(entry.theme);
    const cleanFocus = cleanRuleText(entry.growth_focus);
    assert.ok(cleanTheme.length > 15 && !cleanTheme.includes("[cite:"));
    assert.ok(cleanFocus.length > 15 && !cleanFocus.includes("[cite:"));
    assert.equal(cleanTheme.match(BANNED_ASTROLOGY_REGEX), null, `Banned term in house ${h} theme: ${cleanTheme}`);
    assert.equal(cleanFocus.match(BANNED_ASTROLOGY_REGEX), null, `Banned term in house ${h} focus: ${cleanFocus}`);
  }

  assert.ok(
    housesRulebook.planet_in_house_patterns.length >= 40,
    `Expected expanded planet_in_house_patterns, found ${housesRulebook.planet_in_house_patterns.length}`
  );

  for (const p of housesRulebook.planet_in_house_patterns) {
    for (const field of [p.trait, p.blind_spot, p.actionable_shift]) {
      const cleaned = cleanRuleText(field);
      assert.ok(cleaned.length > 15 && !cleaned.includes("[cite:"));
      assert.equal(
        cleaned.match(BANNED_ASTROLOGY_REGEX),
        null,
        `Banned term in ${p.planet}@H${p.house}: ${cleaned}`
      );
    }
  }

  for (const lord of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"] as const) {
    const theme = timingRulebook.period_lord_themes[lord];
    assert.ok(theme, `Missing period_lord_themes entry for ${lord}`);
    for (const field of [theme.focus, theme.pacing_risk, theme.agency_lever]) {
      assert.equal(
        field.match(BANNED_ASTROLOGY_REGEX),
        null,
        `Banned term in period_lord_themes.${lord}: ${field}`
      );
    }
  }

  for (const dosha of ["vata", "pitta", "kapha"] as const) {
    const profile = ayurvedaRulebook.dosha_profiles[dosha];
    assert.ok(profile.quick_micro_anchor.length > 15);
    assert.equal(profile.quick_micro_anchor.match(BANNED_ASTROLOGY_REGEX), null);
  }
});

test("matchChartRules surfaces houses 2/3/11 when occupied, expanded planet patterns, compatibilityDimensions, and currentChapterTheme", () => {
  const exactChart = makeChandanExactChart().normalizedChartJson;
  const ctx = matchChartRules(exactChart, { transitMoonHouse: 10 });

  assert.equal(ctx.ruleMatcherVersion, RULE_MATCHER_VERSION);
  assert.equal(ctx.houseFrame, "lagna");

  const activeHouseNums = ctx.activeHouses.map((h) => h.house);
  assert.ok(activeHouseNums.includes(3), "Occupied House 3 (Jupiter) should appear in activeHouses");
  assert.ok(!activeHouseNums.includes(2), "Unoccupied non-anchor House 2 should remain omitted");
  assert.ok(!activeHouseNums.includes(11), "Unoccupied non-anchor House 11 should remain omitted");

  // Inject synthetic placements into Houses 2 and 11 to verify 2 & 11 surfacing
  const with2And11 = structuredClone(exactChart);
  with2And11.corePlacements.planets.push(
    {
      code: "Me2",
      name: "Mercury",
      zodiac: "Taurus",
      rasiNo: 2,
      house: 2,
      localDegree: 10,
      nakshatra: "Rohini",
      nakshatraLord: "Moon",
      nakshatraPada: 1,
      retro: false,
    },
    {
      code: "Ju11",
      name: "Jupiter",
      zodiac: "Aquarius",
      rasiNo: 11,
      house: 11,
      localDegree: 10,
      nakshatra: "Shatabhisha",
      nakshatraLord: "Rahu",
      nakshatraPada: 1,
      retro: false,
    }
  );
  const ctx211 = matchChartRules(with2And11);
  const nums211 = ctx211.activeHouses.map((h) => h.house);
  assert.ok(nums211.includes(2) && nums211.includes(11));
  assert.ok(ctx211.planetPatterns.some((p) => p.planet === "Mercury" && p.house === 2));
  assert.ok(ctx211.planetPatterns.some((p) => p.planet === "Jupiter" && p.house === 11));

  // Verify 8 compatibilityDimensions wired cleanly from compatibility_kutas.json
  const dims = ctx.relationship.compatibilityDimensions;
  assert.equal(Object.keys(dims).length, 8);
  for (const val of Object.values(dims)) {
    assert.ok(val.length > 10 && !val.includes("[cite:"));
    assert.equal(val.match(BANNED_ASTROLOGY_REGEX), null, `Banned term in compatibilityDimension: ${val}`);
  }

  // Verify currentChapterTheme & quickMicroAnchor
  assert.ok(ctx.timing.currentChapterTheme);
  assert.ok(ctx.timing.currentChapterTheme.focus.length > 10);
  assert.ok(ctx.wellness.quickMicroAnchor && ctx.wellness.quickMicroAnchor.length > 10);
});

test("matchChartRules honors date_only guardrails while still providing currentChapterTheme and Chaldean fallback", () => {
  const dateOnlyChart = makeChartBundleResult("date_only").normalizedChartJson;
  const ctx = matchChartRules(dateOnlyChart, {
    fullName: "Maya Lin",
    dob: "1992-06-15",
  });

  assert.equal(ctx.precisionMode, "date_only");
  assert.equal(ctx.houseFrame, "moon");
  assert.equal(ctx.referenceLenses.selfLens, undefined);
  assert.equal(ctx.referenceLenses.publicImageLens, undefined);
  assert.equal(ctx.nakshatraTraits.lagna, null);
  assert.equal(ctx.timing.currentChapterDignity, null);
  assert.ok(ctx.timing.currentChapterTheme, "currentChapterTheme works in date_only mode");
  assert.deepEqual(computeChaldeanDigit({ fullName: "Maya Lin", dob: "1992-06-15" }), {
    digit: ctx.numerologyFallback?.digit,
    source: "name",
  });
});
