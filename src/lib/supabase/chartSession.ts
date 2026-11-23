import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AstroProvider } from "@/lib/astro/provider";
import {
  AstroPrecisionMode,
  NormalizedChartJson,
  RawAstroBundle,
  toAstroPrecisionMode,
} from "@/lib/astro/types";
import {
  getAstroProvider,
  normalizeDobFormats,
  resolveEffectiveTob,
} from "@/lib/astro/vedicAstroProvider";
import {
  BlueprintCacheRow,
  computeBirthInputHash,
  computeContextHash,
  evaluateEmailCacheState,
  ExistingPaidAccountError,
  NatalChartCacheRow,
  normalizeOptionalEmail,
} from "@/lib/cache/blueprintCache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  BirthWindow,
  BlueprintFreePayload,
  CareerMode,
  HardResetFeedback,
  PrecisionMode as UiPrecisionMode,
  RelationshipStatus,
} from "@/lib/types/blueprint";

export interface CalculateChartParams {
  email?: string;
  firstName: string;
  birthDate: string;
  birthCity: string;
  birthLat: number;
  birthLon: number;
  birthTz: number;
  precisionMode: UiPrecisionMode | AstroPrecisionMode;
  birthTime: string | null;
  birthWindow: BirthWindow | null;
  relationshipStatus: RelationshipStatus;
  careerMode: CareerMode;
  careerField: string;
  sessionToken?: string;
  userId?: string | null;
  userEmail?: string | null;
}

export interface CalculateChartOutput {
  cached: boolean;
  apiCallsMade: number;
  chartId: string;
  sessionId: string;
  sessionToken: string;
  precisionMode: AstroPrecisionMode;
  moonBoundaryFlag: boolean;
  normalizedChart: NormalizedChartJson;
  freePayload: BlueprintFreePayload | null;
  hasBlueprint: boolean;
  hardResetFeedback: HardResetFeedback | null;
  birthInputHash?: string;
  cacheCase?: "A" | "B" | "C" | "D";
}

interface NatalChartRow extends NatalChartCacheRow {
  raw_astro_json: RawAstroBundle;
  normalized_chart_json: NormalizedChartJson;
}

interface BlueprintRow {
  id: string;
  chart_id: string;
  user_id: string | null;
  session_token: string;
  email?: string | null;
  context_hash?: string | null;
  hook_proof_json: BlueprintFreePayload;
  accuracy_feedback: HardResetFeedback | null;
  model_version: string | null;
  is_paid: boolean;
}

function assertMigrationError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.message?.includes("does not exist")
  ) {
    throw new Error(
      "Supabase schema out of date. Please run supabase/migrations/001_slice2_core.sql, 002_slice3_blueprints.sql, and 003_slice35_email_caching.sql in your Supabase SQL Editor."
    );
  }
  throw new Error(error.message || "Supabase database error");
}

export interface CalculateChartDeps {
  admin?: Pick<SupabaseClient, "from">;
  astroProvider?: AstroProvider;
}

async function upsertProfileIfAuthenticated(
  admin: Pick<SupabaseClient, "from">,
  params: {
    userId?: string | null;
    email?: string | null;
    firstName: string;
    relationshipStatus: RelationshipStatus;
    careerMode: CareerMode;
    careerField: string;
  }
) {
  if (!params.userId) return;
  const { error } = await admin.from("profiles").upsert(
    {
      user_id: params.userId,
      email: params.email ?? null,
      first_name: params.firstName,
      relationship_status: params.relationshipStatus,
      career_mode: params.careerMode,
      career_field: params.careerField,
    },
    { onConflict: "user_id" }
  );
  if (error) assertMigrationError(error);
}

async function findReusableChartByBirthCoords(
  admin: Pick<SupabaseClient, "from">,
  params: {
    dobIso: string;
    storedTob: string | null;
    astroPrecision: AstroPrecisionMode;
    birthLat: number;
    birthLon: number;
    birthTz: number;
    userId?: string | null;
    birthInputHash?: string;
  }
): Promise<NatalChartRow | undefined> {
  if (params.birthInputHash) {
    const { data: hashMatches, error: hashErr } = await admin
      .from("natal_charts")
      .select("*")
      .eq("birth_input_hash", params.birthInputHash)
      .limit(1);
    if (hashErr) assertMigrationError(hashErr);
    if (hashMatches && hashMatches.length > 0) {
      return hashMatches[0] as NatalChartRow;
    }
  }

  let matchQuery = admin
    .from("natal_charts")
    .select("*")
    .eq("dob", params.dobIso)
    .eq("precision_mode", params.astroPrecision)
    .eq("tz", params.birthTz)
    .gte("lat", params.birthLat - 0.001)
    .lte("lat", params.birthLat + 0.001)
    .gte("lon", params.birthLon - 0.001)
    .lte("lon", params.birthLon + 0.001);

  if (params.storedTob === null) {
    matchQuery = matchQuery.is("tob", null);
  } else {
    matchQuery = matchQuery.eq("tob", params.storedTob);
  }

  if (params.userId) {
    matchQuery = matchQuery.eq("user_id", params.userId);
  }

  const { data: existingMatches, error: matchErr } = await matchQuery.limit(1);
  if (matchErr) assertMigrationError(matchErr);

  return existingMatches?.[0] as NatalChartRow | undefined;
}

export async function calculateAndPersistChart(
  params: CalculateChartParams,
  deps?: CalculateChartDeps
): Promise<CalculateChartOutput> {
  const admin = deps?.admin ?? getSupabaseAdminClient();
  const astroPrecision = toAstroPrecisionMode(params.precisionMode);
  const { dobIso } = normalizeDobFormats(params.birthDate);
  const storedTob =
    astroPrecision === "date_only"
      ? null
      : resolveEffectiveTob(astroPrecision, params.birthTime, params.birthWindow);

  const birthInputHash = computeBirthInputHash({
    dob: dobIso,
    tob: storedTob,
    precisionMode: astroPrecision,
    lat: params.birthLat,
    lon: params.birthLon,
    tz: params.birthTz,
  });

  const contextHash = computeContextHash({
    firstName: params.firstName,
    relationshipStatus: params.relationshipStatus,
    careerMode: params.careerMode,
    careerField: params.careerField,
  });

  const normalizedEmail = normalizeOptionalEmail(params.email);
  const requestedToken = params.sessionToken?.trim() || null;

  // ===========================================================================
  // SLICE 3.5 PATH: Unique-Email Deduplication & 4-Case Smart Hash Caching
  // ===========================================================================
  if (normalizedEmail) {
    let evaluation;
    try {
      evaluation = await evaluateEmailCacheState({
        admin,
        email: normalizedEmail,
        birthInputHash,
        contextHash,
        authUserId: params.userId,
        authUserEmail: params.userEmail,
      });
    } catch (err) {
      assertMigrationError(err as { code?: string; message?: string });
      throw err;
    }

    if (evaluation.status === "existing_paid_account") {
      throw new ExistingPaidAccountError(evaluation.message);
    }

    const { cacheCase, existingChart, existingBlueprint } = evaluation;

    // Case A — Full Cache Hit (same email, same birth_input_hash, same context_hash)
    if (cacheCase === "A" && existingChart && existingBlueprint) {
      const patch: Record<string, unknown> = {};
      if (!existingChart.birth_input_hash) {
        patch.birth_input_hash = birthInputHash;
      }
      if (params.userId && !existingChart.user_id) {
        patch.user_id = params.userId;
      }
      if (Object.keys(patch).length > 0) {
        const { error: patchErr } = await admin
          .from("natal_charts")
          .update(patch)
          .eq("id", existingChart.id);
        if (patchErr) assertMigrationError(patchErr);
      }

      if (params.userId && !existingBlueprint.user_id) {
        await admin
          .from("blueprints")
          .update({ user_id: params.userId })
          .eq("id", existingBlueprint.id);
      }

      await upsertProfileIfAuthenticated(admin, {
        userId: params.userId,
        email: normalizedEmail,
        firstName: params.firstName,
        relationshipStatus: params.relationshipStatus,
        careerMode: params.careerMode,
        careerField: params.careerField,
      });

      return {
        cached: true,
        apiCallsMade: 0,
        chartId: existingChart.id,
        sessionId: existingChart.session_token,
        sessionToken: existingChart.session_token,
        precisionMode: existingChart.precision_mode,
        moonBoundaryFlag: existingChart.moon_boundary_flag,
        normalizedChart: existingChart.normalized_chart_json,
        freePayload: existingBlueprint.hook_proof_json,
        hasBlueprint: true,
        hardResetFeedback: existingBlueprint.accuracy_feedback,
        birthInputHash,
        cacheCase: "A",
      };
    }

    // Case B — Context-Only Change (same email, same birth_input_hash, different context_hash)
    if (cacheCase === "B" && existingChart) {
      const { error: updateErr } = await admin
        .from("natal_charts")
        .update({
          email: normalizedEmail,
          birth_input_hash: birthInputHash,
          first_name: params.firstName,
          relationship_status: params.relationshipStatus,
          career_mode: params.careerMode,
          career_field: params.careerField,
          user_id: existingChart.user_id ?? params.userId ?? null,
        })
        .eq("id", existingChart.id);
      if (updateErr) assertMigrationError(updateErr);

      await upsertProfileIfAuthenticated(admin, {
        userId: params.userId,
        email: normalizedEmail,
        firstName: params.firstName,
        relationshipStatus: params.relationshipStatus,
        careerMode: params.careerMode,
        careerField: params.careerField,
      });

      return {
        cached: true,
        apiCallsMade: 0,
        chartId: existingChart.id,
        sessionId: existingChart.session_token,
        sessionToken: existingChart.session_token,
        precisionMode: existingChart.precision_mode,
        moonBoundaryFlag: existingChart.moon_boundary_flag,
        normalizedChart: existingChart.normalized_chart_json,
        freePayload: null,
        hasBlueprint: false,
        hardResetFeedback: existingBlueprint?.accuracy_feedback ?? null,
        birthInputHash,
        cacheCase: "B",
      };
    }

    // Case C — Birth Data Updated (same email, different birth_input_hash)
    if (cacheCase === "C" && existingChart) {
      const provider = deps?.astroProvider ?? getAstroProvider();
      const bundle = await provider.fetchChartBundle({
        firstName: params.firstName,
        dob: dobIso,
        tob: params.birthTime,
        birthWindow: params.birthWindow,
        precisionMode: astroPrecision,
        birthCity: params.birthCity,
        lat: params.birthLat,
        lon: params.birthLon,
        tz: params.birthTz,
      });

      const { error: updateChartErr } = await admin
        .from("natal_charts")
        .update({
          user_id: existingChart.user_id ?? params.userId ?? null,
          email: normalizedEmail,
          birth_input_hash: birthInputHash,
          dob: dobIso,
          tob: storedTob,
          birth_window:
            astroPrecision === "approx_window" ? params.birthWindow : null,
          precision_mode: astroPrecision,
          birth_city: params.birthCity,
          lat: params.birthLat,
          lon: params.birthLon,
          tz: params.birthTz,
          moon_boundary_flag: bundle.moonBoundaryFlag,
          first_name: params.firstName,
          relationship_status: params.relationshipStatus,
          career_mode: params.careerMode,
          career_field: params.careerField,
          raw_astro_json: bundle.rawAstroJson,
          normalized_chart_json: bundle.normalizedChartJson,
        })
        .eq("id", existingChart.id);
      if (updateChartErr) assertMigrationError(updateChartErr);

      // Mark existing blueprint context_hash stale in place WITHOUT deleting
      // so id, user_id, and is_paid are preserved across synthesis re-run.
      if (existingBlueprint) {
        const { error: staleBpErr } = await admin
          .from("blueprints")
          .update({ context_hash: null })
          .eq("id", existingBlueprint.id);
        if (staleBpErr) assertMigrationError(staleBpErr);
      }

      await upsertProfileIfAuthenticated(admin, {
        userId: params.userId,
        email: normalizedEmail,
        firstName: params.firstName,
        relationshipStatus: params.relationshipStatus,
        careerMode: params.careerMode,
        careerField: params.careerField,
      });

      return {
        cached: false,
        apiCallsMade: bundle.apiCallsMade,
        chartId: existingChart.id,
        sessionId: existingChart.session_token,
        sessionToken: existingChart.session_token,
        precisionMode: astroPrecision,
        moonBoundaryFlag: bundle.moonBoundaryFlag,
        normalizedChart: bundle.normalizedChartJson,
        freePayload: null,
        hasBlueprint: false,
        hardResetFeedback: existingBlueprint?.accuracy_feedback ?? null,
        birthInputHash,
        cacheCase: "C",
      };
    }

    // Case D — Brand-New Email (insert 1 row into natal_charts)
    const reusableRow = await findReusableChartByBirthCoords(admin, {
      dobIso,
      storedTob,
      astroPrecision,
      birthLat: params.birthLat,
      birthLon: params.birthLon,
      birthTz: params.birthTz,
      birthInputHash,
    });

    let rawAstroJson: RawAstroBundle;
    let normalizedChartJson: NormalizedChartJson;
    let moonBoundaryFlag: boolean;
    let apiCallsMade = 0;
    let cached = false;

    if (reusableRow) {
      rawAstroJson = reusableRow.raw_astro_json;
      normalizedChartJson = reusableRow.normalized_chart_json;
      moonBoundaryFlag = reusableRow.moon_boundary_flag;
      cached = true;
      apiCallsMade = 0;
    } else {
      const provider = deps?.astroProvider ?? getAstroProvider();
      const bundle = await provider.fetchChartBundle({
        firstName: params.firstName,
        dob: dobIso,
        tob: params.birthTime,
        birthWindow: params.birthWindow,
        precisionMode: astroPrecision,
        birthCity: params.birthCity,
        lat: params.birthLat,
        lon: params.birthLon,
        tz: params.birthTz,
      });
      rawAstroJson = bundle.rawAstroJson;
      normalizedChartJson = bundle.normalizedChartJson;
      moonBoundaryFlag = bundle.moonBoundaryFlag;
      apiCallsMade = bundle.apiCallsMade;
    }

    // Avoid hijacking a session_token that already belongs to a different email
    let sessionToken = requestedToken || `pb_${randomUUID()}`;
    if (requestedToken) {
      const { data: tokenOwner } = await admin
        .from("natal_charts")
        .select("id, email")
        .eq("session_token", requestedToken)
        .maybeSingle<{ id: string; email: string | null }>();
      if (tokenOwner && tokenOwner.email && tokenOwner.email !== normalizedEmail) {
        sessionToken = `pb_${randomUUID()}`;
      }
    }

    const { data: savedChart, error: upsertChartErr } = await admin
      .from("natal_charts")
      .upsert(
        {
          user_id: params.userId ?? null,
          session_token: sessionToken,
          email: normalizedEmail,
          birth_input_hash: birthInputHash,
          dob: dobIso,
          tob: storedTob,
          birth_window:
            astroPrecision === "approx_window" ? params.birthWindow : null,
          precision_mode: astroPrecision,
          birth_city: params.birthCity,
          lat: params.birthLat,
          lon: params.birthLon,
          tz: params.birthTz,
          moon_boundary_flag: moonBoundaryFlag,
          first_name: params.firstName,
          relationship_status: params.relationshipStatus,
          career_mode: params.careerMode,
          career_field: params.careerField,
          raw_astro_json: rawAstroJson,
          normalized_chart_json: normalizedChartJson,
        },
        { onConflict: "session_token" }
      )
      .select("id")
      .single<{ id: string }>();

    if (upsertChartErr) assertMigrationError(upsertChartErr);

    await upsertProfileIfAuthenticated(admin, {
      userId: params.userId,
      email: normalizedEmail,
      firstName: params.firstName,
      relationshipStatus: params.relationshipStatus,
      careerMode: params.careerMode,
      careerField: params.careerField,
    });

    return {
      cached,
      apiCallsMade,
      chartId: savedChart!.id,
      sessionId: sessionToken,
      sessionToken,
      precisionMode: astroPrecision,
      moonBoundaryFlag,
      normalizedChart: normalizedChartJson,
      freePayload: null,
      hasBlueprint: false,
      hardResetFeedback: null,
      birthInputHash,
      cacheCase: "D",
    };
  }

  // ===========================================================================
  // LEGACY ANONYMOUS PATH (No email provided, e.g., Slice 2 unit tests)
  // ===========================================================================
  if (requestedToken) {
    const { data: tokenRow, error: tokenErr } = await admin
      .from("natal_charts")
      .select("*")
      .eq("session_token", requestedToken)
      .maybeSingle<NatalChartRow>();

    if (tokenErr) assertMigrationError(tokenErr);

    if (
      tokenRow &&
      tokenRow.dob === dobIso &&
      (tokenRow.tob ?? null) === storedTob &&
      tokenRow.precision_mode === astroPrecision &&
      Math.abs(tokenRow.lat - params.birthLat) < 0.001 &&
      Math.abs(tokenRow.lon - params.birthLon) < 0.001 &&
      tokenRow.tz === params.birthTz
    ) {
      await admin
        .from("natal_charts")
        .update({
          first_name: params.firstName,
          relationship_status: params.relationshipStatus,
          career_mode: params.careerMode,
          career_field: params.careerField,
          birth_input_hash: birthInputHash,
        })
        .eq("id", tokenRow.id);

      const { data: bpRow, error: bpErr } = await admin
        .from("blueprints")
        .select(
          "id, chart_id, user_id, session_token, hook_proof_json, accuracy_feedback, model_version, is_paid"
        )
        .eq("chart_id", tokenRow.id)
        .not("model_version", "is", null)
        .maybeSingle<BlueprintRow>();

      if (bpErr) assertMigrationError(bpErr);

      return {
        cached: true,
        apiCallsMade: 0,
        chartId: tokenRow.id,
        sessionId: requestedToken,
        sessionToken: requestedToken,
        precisionMode: tokenRow.precision_mode,
        moonBoundaryFlag: tokenRow.moon_boundary_flag,
        normalizedChart: tokenRow.normalized_chart_json,
        freePayload: bpRow?.hook_proof_json ?? null,
        hasBlueprint: Boolean(bpRow),
        hardResetFeedback: bpRow?.accuracy_feedback ?? null,
        birthInputHash,
      };
    }

    if (tokenRow) {
      await admin.from("blueprints").delete().eq("chart_id", tokenRow.id);
    }
  }

  const reusableRow = await findReusableChartByBirthCoords(admin, {
    dobIso,
    storedTob,
    astroPrecision,
    birthLat: params.birthLat,
    birthLon: params.birthLon,
    birthTz: params.birthTz,
    userId: params.userId,
    birthInputHash,
  });

  if (reusableRow && !requestedToken) {
    const { data: bpRow, error: bpErr } = await admin
      .from("blueprints")
      .select(
        "id, chart_id, user_id, session_token, hook_proof_json, accuracy_feedback, model_version, is_paid"
      )
      .eq("chart_id", reusableRow.id)
      .not("model_version", "is", null)
      .maybeSingle<BlueprintRow>();

    if (bpErr) assertMigrationError(bpErr);

    return {
      cached: true,
      apiCallsMade: 0,
      chartId: reusableRow.id,
      sessionId: reusableRow.session_token,
      sessionToken: reusableRow.session_token,
      precisionMode: reusableRow.precision_mode,
      moonBoundaryFlag: reusableRow.moon_boundary_flag,
      normalizedChart: reusableRow.normalized_chart_json,
      freePayload: bpRow?.hook_proof_json ?? null,
      hasBlueprint: Boolean(bpRow),
      hardResetFeedback: bpRow?.accuracy_feedback ?? null,
      birthInputHash,
    };
  }

  const sessionToken = requestedToken || `pb_${randomUUID()}`;

  let rawAstroJson: RawAstroBundle;
  let normalizedChartJson: NormalizedChartJson;
  let moonBoundaryFlag: boolean;
  let apiCallsMade = 0;
  let cached = false;

  if (reusableRow) {
    rawAstroJson = reusableRow.raw_astro_json;
    normalizedChartJson = reusableRow.normalized_chart_json;
    moonBoundaryFlag = reusableRow.moon_boundary_flag;
    cached = true;
    apiCallsMade = 0;
  } else {
    const provider = deps?.astroProvider ?? getAstroProvider();
    const bundle = await provider.fetchChartBundle({
      firstName: params.firstName,
      dob: dobIso,
      tob: params.birthTime,
      birthWindow: params.birthWindow,
      precisionMode: astroPrecision,
      birthCity: params.birthCity,
      lat: params.birthLat,
      lon: params.birthLon,
      tz: params.birthTz,
    });

    rawAstroJson = bundle.rawAstroJson;
    normalizedChartJson = bundle.normalizedChartJson;
    moonBoundaryFlag = bundle.moonBoundaryFlag;
    apiCallsMade = bundle.apiCallsMade;
  }

  const { data: savedChart, error: upsertChartErr } = await admin
    .from("natal_charts")
    .upsert(
      {
        user_id: params.userId ?? null,
        session_token: sessionToken,
        birth_input_hash: birthInputHash,
        dob: dobIso,
        tob: storedTob,
        birth_window:
          astroPrecision === "approx_window" ? params.birthWindow : null,
        precision_mode: astroPrecision,
        birth_city: params.birthCity,
        lat: params.birthLat,
        lon: params.birthLon,
        tz: params.birthTz,
        moon_boundary_flag: moonBoundaryFlag,
        first_name: params.firstName,
        relationship_status: params.relationshipStatus,
        career_mode: params.careerMode,
        career_field: params.careerField,
        raw_astro_json: rawAstroJson,
        normalized_chart_json: normalizedChartJson,
      },
      { onConflict: "session_token" }
    )
    .select("id")
    .single<{ id: string }>();

  if (upsertChartErr) assertMigrationError(upsertChartErr);

  await upsertProfileIfAuthenticated(admin, {
    userId: params.userId,
    firstName: params.firstName,
    relationshipStatus: params.relationshipStatus,
    careerMode: params.careerMode,
    careerField: params.careerField,
  });

  return {
    cached,
    apiCallsMade,
    chartId: savedChart!.id,
    sessionId: sessionToken,
    sessionToken,
    precisionMode: astroPrecision,
    moonBoundaryFlag,
    normalizedChart: normalizedChartJson,
    freePayload: null,
    hasBlueprint: false,
    hardResetFeedback: null,
    birthInputHash,
  };
}

export async function claimSessionForUser(
  params: {
    sessionToken?: string | null;
    userId: string;
    userEmail?: string | null;
    firstName?: string;
    relationshipStatus?: RelationshipStatus;
    careerMode?: CareerMode;
    careerField?: string;
  },
  deps?: { admin?: Pick<SupabaseClient, "from"> }
): Promise<{
  chartId: string | null;
  blueprintId: string | null;
  sessionToken: string | null;
  isPaid: boolean;
}> {
  const admin = deps?.admin ?? getSupabaseAdminClient();
  const { sessionToken, userId } = params;
  const normalizedEmail = normalizeOptionalEmail(params.userEmail);

  type ClaimChartRow = Pick<
    NatalChartRow,
    | "id"
    | "user_id"
    | "session_token"
    | "email"
    | "first_name"
    | "relationship_status"
    | "career_mode"
    | "career_field"
  >;

  let chartRow: ClaimChartRow | null = null;

  // 1. Prefer lookup by normalized email so we link cleanly without duplicates
  if (normalizedEmail) {
    const { data: emailChart, error: emailErr } = await admin
      .from("natal_charts")
      .select(
        "id, user_id, session_token, email, first_name, relationship_status, career_mode, career_field"
      )
      .eq("email", normalizedEmail)
      .maybeSingle<ClaimChartRow>();
    if (emailErr) assertMigrationError(emailErr);
    if (emailChart) {
      chartRow = emailChart;
    }
  }

  // 2. Fallback lookup by session_token
  if (!chartRow && sessionToken) {
    const { data: tokenChart, error: findErr } = await admin
      .from("natal_charts")
      .select(
        "id, user_id, session_token, email, first_name, relationship_status, career_mode, career_field"
      )
      .eq("session_token", sessionToken)
      .maybeSingle<ClaimChartRow>();
    if (findErr) assertMigrationError(findErr);
    if (tokenChart) {
      chartRow = tokenChart;
    }
  }

  if (!chartRow) {
    if (params.firstName || normalizedEmail) {
      await upsertProfileIfAuthenticated(admin, {
        userId,
        email: normalizedEmail,
        firstName: params.firstName || "Friend",
        relationshipStatus: params.relationshipStatus ?? "single",
        careerMode: params.careerMode ?? "employed",
        careerField: params.careerField ?? "",
      });
    }
    return {
      chartId: null,
      blueprintId: null,
      sessionToken: sessionToken ?? null,
      isPaid: false,
    };
  }

  if (chartRow.user_id && chartRow.user_id !== userId) {
    throw new Error("This chart session is already claimed by another account.");
  }

  const effectiveEmail = normalizedEmail ?? chartRow.email ?? null;

  if (!chartRow.user_id || (!chartRow.email && effectiveEmail)) {
    const chartPatch: Record<string, unknown> = { user_id: userId };
    if (!chartRow.email && effectiveEmail) {
      chartPatch.email = effectiveEmail;
    }
    const { error: updateChartErr } = await admin
      .from("natal_charts")
      .update(chartPatch)
      .eq("id", chartRow.id);
    if (updateChartErr) assertMigrationError(updateChartErr);
  }

  const bpPatch: Record<string, unknown> = { user_id: userId };
  if (effectiveEmail) {
    bpPatch.email = effectiveEmail;
  }

  const { data: bpRow, error: updateBpErr } = await admin
    .from("blueprints")
    .update(bpPatch)
    .eq("chart_id", chartRow.id)
    .select("id, is_paid")
    .maybeSingle<Pick<BlueprintCacheRow, "id" | "is_paid">>();

  if (updateBpErr) assertMigrationError(updateBpErr);

  // Also link any unclaimed blueprint row matching this normalized email
  if (!bpRow && effectiveEmail) {
    await admin
      .from("blueprints")
      .update({ user_id: userId })
      .eq("email", effectiveEmail)
      .is("user_id", null);
  }

  const profileFirstName =
    params.firstName?.trim() || chartRow.first_name?.trim() || "Friend";
  await upsertProfileIfAuthenticated(admin, {
    userId,
    email: effectiveEmail,
    firstName: profileFirstName,
    relationshipStatus:
      params.relationshipStatus ?? chartRow.relationship_status ?? "single",
    careerMode: params.careerMode ?? chartRow.career_mode ?? "employed",
    careerField: params.careerField ?? chartRow.career_field ?? "",
  });

  return {
    chartId: chartRow.id,
    blueprintId: bpRow?.id ?? null,
    sessionToken: chartRow.session_token,
    isPaid: Boolean(bpRow?.is_paid),
  };
}
