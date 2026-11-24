import test from "node:test";
import assert from "node:assert/strict";
import type { AstroProvider } from "@/lib/astro/provider";
import {
  computeSynergyComparison,
  scanSynergyStringsForGuardrails,
} from "@/lib/astro/synergyEngine";
import type { ChartBundleResult } from "@/lib/astro/types";
import {
  compareSynergyWithPartner,
  createSynergyInviteLink,
  getSynergyInviteByToken,
  SynergyServiceError,
} from "@/lib/supabase/synergySession";
import { makeChandanExactChart, makeChartBundleResult, makeCleanBlueprintPayload } from "./helpers/fixtures";
import { InMemorySupabaseAdmin } from "./helpers/mockSupabase";

function makeMichelleBundle(precisionMode: "exact" | "date_only" = "exact"): ChartBundleResult {
  const base = makeChartBundleResult(precisionMode);
  const michellePlanets = [
    {
      code: "Su",
      name: "Sun",
      zodiac: "Taurus",
      rasiNo: 2,
      house: precisionMode === "exact" ? 10 : null,
      localDegree: 28.1,
      nakshatra: "Mrigashira",
      nakshatraLord: "Mars",
      nakshatraPada: 2,
      retro: false,
    },
    {
      code: "Mo",
      name: "Moon",
      zodiac: "Libra",
      rasiNo: 7,
      house: precisionMode === "exact" ? 3 : null,
      localDegree: 27.66,
      nakshatra: "Vishakha",
      nakshatraLord: "Jupiter",
      nakshatraPada: 3,
      retro: false,
    },
    {
      code: "Ma",
      name: "Mars",
      zodiac: "Aries",
      rasiNo: 1,
      house: precisionMode === "exact" ? 9 : null,
      localDegree: 4.72,
      nakshatra: "Ashvini",
      nakshatraLord: "Ketu",
      nakshatraPada: 2,
      retro: false,
    },
    {
      code: "Ve",
      name: "Venus",
      zodiac: "Taurus",
      rasiNo: 2,
      house: precisionMode === "exact" ? 10 : null,
      localDegree: 27.81,
      nakshatra: "Mrigashira",
      nakshatraLord: "Mars",
      nakshatraPada: 2,
      retro: false,
    },
  ];

  const ascendant =
    precisionMode === "exact"
      ? {
          code: "As",
          name: "Ascendant",
          zodiac: "Leo",
          rasiNo: 5,
          house: 1,
          localDegree: 13.08,
          nakshatra: "Magha",
          nakshatraLord: "Ketu",
          nakshatraPada: 4,
          retro: false,
        }
      : null;

  return {
    ...base,
    dobIso: "1992-06-12",
    dobFormatted: "12/06/1992",
    effectiveTob: precisionMode === "exact" ? "11:32" : "12:00",
    precisionMode,
    normalizedChartJson: {
      ...base.normalizedChartJson,
      precisionMode,
      effectiveTob: precisionMode === "exact" ? "11:32" : "12:00",
      corePlacements: {
        ascendant,
        moon: michellePlanets[1],
        sun: michellePlanets[0],
        planets: michellePlanets,
      },
    },
  };
}

function makeChandanLiveStyleChart() {
  const chandan = makeChandanExactChart().normalizedChartJson;
  chandan.corePlacements.moon!.nakshatra = "Ashvini";
  chandan.corePlacements.moon!.nakshatraLord = "Ketu";
  chandan.corePlacements.moon!.nakshatraPada = 1;
  chandan.corePlacements.moon!.localDegree = 1.28;
  return chandan;
}

test("synergyEngine — Chandan × Michelle exact benchmark scores 21.5/36 (60%) with 0 guardrail violations", () => {
  const chandan = makeChandanLiveStyleChart();
  const michelle = makeMichelleBundle("exact").normalizedChartJson;

  for (const relationshipContext of ["romantic", "close_friend", "creative_partner"] as const) {
    const result = computeSynergyComparison({
      ownerFirstName: "Chandan",
      ownerDob: "1989-09-17",
      ownerChart: chandan,
      partnerFirstName: "Michelle",
      partnerDob: "1992-06-12",
      partnerChart: michelle,
      relationshipContext,
    });

    assert.equal(result.rawPoints.earned, 21.5);
    assert.equal(result.rawPoints.max, 36);
    assert.equal(result.overallScore, 60);
    assert.equal(result.precisionBadge.mode, "exact");
    assert.equal(result.dimensions.length, 8);

    const byKey = Object.fromEntries(result.dimensions.map((d) => [d.key, d.earned]));
    assert.equal(byKey.nervousSystemPacing, 8);
    assert.equal(byKey.domesticFlow, 7);
    assert.equal(byKey.mentalFriendship, 3);
    assert.equal(byKey.dailyRhythm, 1.5);
    assert.equal(byKey.physicalRapport, 1);
    assert.equal(byKey.sharedValues, 1);
    assert.equal(byKey.stressTemperament, 0);
    assert.equal(byKey.mutualInfluence, 0);

    assert.deepEqual(scanSynergyStringsForGuardrails(result), []);
  }
});

test("synergyEngine — precisionMode honesty downgrades when partner is date_only or moonBoundaryFlag=true", () => {
  const chandan = makeChandanLiveStyleChart();
  const michelleDateOnly = makeMichelleBundle("date_only").normalizedChartJson;
  michelleDateOnly.moonBoundaryFlag = true;

  const result = computeSynergyComparison({
    ownerFirstName: "Chandan",
    ownerDob: "1989-09-17",
    ownerChart: chandan,
    partnerFirstName: "Michelle",
    partnerDob: "1992-06-12",
    partnerChart: michelleDateOnly,
    relationshipContext: "romantic",
  });

  assert.equal(result.precisionBadge.mode, "dob_only");
  assert.equal(result.precisionBadge.label, "Day-Window Core Rhythm");
  assert.deepEqual(scanSynergyStringsForGuardrails(result), []);
});

test("synergySession — tokenized invite creation enforces auth, hides PII, and supports local-only vs email persistence", async () => {
  const db = new InMemorySupabaseAdmin();
  const chandan = makeChandanLiveStyleChart();
  const ownerChartId = "11111111-1111-4111-8111-111111111111";
  const ownerToken = "pb_owner_token_123";

  db.tables.natal_charts.push({
    id: ownerChartId,
    user_id: null,
    session_token: ownerToken,
    email: "chandan.private@example.com",
    first_name: "Chandan",
    dob: "1989-09-17",
    tob: "20:54",
    precision_mode: "exact",
    birth_city: "Muzaffarnagar, India",
    lat: 29.47,
    lon: 77.7,
    tz: 5.5,
    moon_boundary_flag: false,
    normalized_chart_json: chandan,
    raw_astro_json: {},
  });

  const cleanBp = makeCleanBlueprintPayload("single");
  db.tables.blueprints.push({
    id: "bp-owner-1",
    chart_id: ownerChartId,
    session_token: ownerToken,
    hook_proof_json: cleanBp.hook_proof_json,
    full_blueprint_json: cleanBp.full_blueprint_json,
    is_paid: true,
  });

  // 1. Unauthorized caller cannot mint invite link
  await assert.rejects(
    () =>
      createSynergyInviteLink(
        {
          chartIdOrToken: ownerChartId,
          relationshipContext: "romantic",
          sessionToken: "wrong_token",
        },
        { admin: db.asAdminClient() }
      ),
    (err: unknown) => err instanceof SynergyServiceError && err.statusCode === 403
  );

  // 2. Authorized owner mints tokenized link
  const created = await createSynergyInviteLink(
    {
      chartIdOrToken: ownerChartId,
      relationshipContext: "romantic",
      sessionToken: ownerToken,
    },
    { admin: db.asAdminClient() }
  );
  assert.match(created.shareToken, /^syn_[A-Za-z0-9_-]+$/);
  assert.equal(created.ownerDisplayName, "Chandan");

  // 3. Public GET exposes zero PII
  const publicInvite = await getSynergyInviteByToken(created.shareToken, {
    admin: db.asAdminClient(),
  });
  assert.equal(publicInvite.status, "awaiting_partner");
  const serializedPublic = JSON.stringify(publicInvite);
  assert.equal(serializedPublic.includes("1989-09-17"), false);
  assert.equal(serializedPublic.includes("Muzaffarnagar"), false);
  assert.equal(serializedPublic.includes("chandan.private@example.com"), false);
  assert.equal(serializedPublic.includes(ownerChartId), false);

  let astroCalls = 0;
  const mockProvider: AstroProvider = {
    providerName: "mock",
    async searchLocation() {
      return [];
    },
    async fetchChartBundle() {
      astroCalls += 1;
      return makeMichelleBundle("exact");
    },
  };

  // 4. Partner B omits email -> local_only (NOT stored in natal_charts or synergy_links)
  const localCompare = await compareSynergyWithPartner(
    {
      shareToken: created.shareToken,
      firstName: "Michelle",
      email: null,
      birthDate: "1992-06-12",
      birthCity: "São Paulo, Brazil",
      birthLat: -23.5475,
      birthLon: -46.63611,
      birthTz: -3,
      precisionMode: "exact",
      birthTime: "11:32",
      birthWindow: null,
    },
    { admin: db.asAdminClient(), astroProvider: mockProvider }
  );
  assert.equal(localCompare.persistedToDb, false);
  assert.equal(localCompare.storageMode, "local_only");
  assert.equal(localCompare.partnerChartId, null);
  assert.equal(localCompare.comparison.overallScore, 60);
  assert.equal(db.tables.natal_charts.length, 1);
  assert.equal(astroCalls, 1);

  const afterLocalGet = await getSynergyInviteByToken(created.shareToken, {
    admin: db.asAdminClient(),
  });
  assert.equal(afterLocalGet.status, "awaiting_partner");

  // 5. Partner B provides email -> saved_to_account (stored in natal_charts + cached on synergy_links)
  const savedCompare = await compareSynergyWithPartner(
    {
      shareToken: created.shareToken,
      firstName: "Michelle",
      email: "michelle@example.com",
      birthDate: "1992-06-12",
      birthCity: "São Paulo, Brazil",
      birthLat: -23.5475,
      birthLon: -46.63611,
      birthTz: -3,
      precisionMode: "exact",
      birthTime: "11:32",
      birthWindow: null,
    },
    { admin: db.asAdminClient(), astroProvider: mockProvider }
  );
  assert.equal(savedCompare.persistedToDb, true);
  assert.equal(savedCompare.storageMode, "saved_to_account");
  assert.ok(savedCompare.partnerChartId);
  assert.equal(db.tables.natal_charts.length, 2);
  assert.equal(astroCalls, 2);

  // Subsequent GET reads cached comparison with 0 astro calls
  const afterSavedGet = await getSynergyInviteByToken(created.shareToken, {
    admin: db.asAdminClient(),
  });
  assert.equal(afterSavedGet.status, "ready");
  assert.equal(afterSavedGet.comparison?.overallScore, 60);
  assert.equal(astroCalls, 2);

  // 6. Completed link rejects overwrite attempts with 409 Conflict
  await assert.rejects(
    () =>
      compareSynergyWithPartner(
        {
          shareToken: created.shareToken,
          firstName: "Hijacker",
          email: "hijacker@example.com",
          birthDate: "1992-06-12",
          birthCity: "São Paulo, Brazil",
          birthLat: -23.5475,
          birthLon: -46.63611,
          birthTz: -3,
          precisionMode: "exact",
          birthTime: "11:32",
          birthWindow: null,
        },
        { admin: db.asAdminClient(), astroProvider: mockProvider }
      ),
    (err: unknown) => err instanceof SynergyServiceError && err.statusCode === 409
  );
});

test("synergyEngine — names matching zodiac/planet words (e.g. Leo, Venus) do not trigger false-positive guardrail crashes", () => {
  const chandan = makeChandanLiveStyleChart();
  const michelle = makeMichelleBundle("exact").normalizedChartJson;

  const result = computeSynergyComparison({
    ownerFirstName: "Leo",
    ownerDob: "1989-09-17",
    ownerChart: chandan,
    partnerFirstName: "Venus",
    partnerDob: "1992-06-12",
    partnerChart: michelle,
    relationshipContext: "romantic",
  });

  assert.equal(result.participants.ownerFirstName, "Leo");
  assert.equal(result.participants.partnerFirstName, "Venus");
  assert.deepEqual(scanSynergyStringsForGuardrails(result), []);
});

test("synergySession — paid account protection falls back to local_only without overwriting existing paid account", async () => {
  const db = new InMemorySupabaseAdmin();
  const chandan = makeChandanLiveStyleChart();
  const ownerChartId = "11111111-1111-4111-8111-111111111111";
  const paidPartnerChartId = "33333333-3333-4333-8333-333333333333";

  db.tables.natal_charts.push(
    {
      id: ownerChartId,
      user_id: null,
      session_token: "pb_owner",
      email: "owner@example.com",
      first_name: "Chandan",
      dob: "1989-09-17",
      precision_mode: "exact",
      normalized_chart_json: chandan,
    },
    {
      id: paidPartnerChartId,
      user_id: "user-paid-1",
      session_token: "pb_paid_partner_secret",
      email: "paid.michelle@example.com",
      first_name: "Michelle",
      dob: "1992-06-12",
      precision_mode: "exact",
      normalized_chart_json: makeMichelleBundle("exact").normalizedChartJson,
    }
  );
  db.tables.blueprints.push({
    id: "bp-paid-partner",
    chart_id: paidPartnerChartId,
    user_id: "user-paid-1",
    session_token: "pb_paid_partner_secret",
    email: "paid.michelle@example.com",
    is_paid: true,
    hook_proof_json: makeCleanBlueprintPayload().hook_proof_json,
    full_blueprint_json: makeCleanBlueprintPayload().full_blueprint_json,
  });

  const created = await createSynergyInviteLink(
    {
      chartIdOrToken: ownerChartId,
      relationshipContext: "romantic",
      sessionToken: "pb_owner",
    },
    { admin: db.asAdminClient() }
  );

  const mockProvider: AstroProvider = {
    providerName: "mock",
    async searchLocation() {
      return [];
    },
    async fetchChartBundle() {
      return makeMichelleBundle("exact");
    },
  };

  const res = await compareSynergyWithPartner(
    {
      shareToken: created.shareToken,
      firstName: "Michelle",
      email: "paid.michelle@example.com",
      birthDate: "1992-06-12",
      birthCity: "São Paulo, Brazil",
      birthLat: -23.5475,
      birthLon: -46.63611,
      birthTz: -3,
      precisionMode: "exact",
      birthTime: "11:32",
      birthWindow: null,
    },
    { admin: db.asAdminClient(), astroProvider: mockProvider }
  );

  assert.equal(res.persistedToDb, false);
  assert.equal(res.storageMode, "local_only");
  assert.equal(res.partnerSessionToken, null);
  assert.equal(res.comparison.overallScore, 60);
});
