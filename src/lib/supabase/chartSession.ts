import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AstroProvider } from "@/lib/astro/provider";
import {
  AstroPrecisionMode,
  NormalizedChartJson,
  RawAstroBundle,
  toAstroPrecisionMode,
  toUiPrecisionMode,
} from "@/lib/astro/types";
import {
  getAstroProvider,
  normalizeDobFormats,
  resolveEffectiveTob,
} from "@/lib/astro/vedicAstroProvider";
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
}

interface NatalChartRow {
  id: string;
  user_id: string | null;
  session_token: string;
  dob: string;
  tob: string | null;
  birth_window: BirthWindow | null;
  precision_mode: AstroPrecisionMode;
  birth_city: string;
  lat: number;
  lon: number;
  tz: number;
  moon_boundary_flag: boolean;
  raw_astro_json: RawAstroBundle;
  normalized_chart_json: NormalizedChartJson;
}

interface BlueprintRow {
  id: string;
  chart_id: string;
  user_id: string | null;
  session_token: string;
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
      "Supabase schema out of date. Please run supabase/migrations/001_slice2_core.sql and 002_slice3_blueprints.sql in your Supabase SQL Editor."
    );
  }
  throw new Error(error.message || "Supabase database error");
}

export interface CalculateChartDeps {
  admin?: Pick<SupabaseClient, "from">;
  astroProvider?: AstroProvider;
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

  const requestedToken = params.sessionToken?.trim() || null;

  // 1. Check for exact session_token cache hit with identical birth inputs
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
      // Keep profile context fresh on natal_charts if user edited relationship/career context
      await admin
        .from("natal_charts")
        .update({
          first_name: params.firstName,
          relationship_status: params.relationshipStatus,
          career_mode: params.careerMode,
          career_field: params.careerField,
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
      };
    }

    // If requestedToken exists with DIFFERENT birth inputs (e.g., exact birth time added),
    // invalidate any stale blueprint so synthesis re-runs cleanly.
    if (tokenRow) {
      await admin.from("blueprints").delete().eq("chart_id", tokenRow.id);
    }
  }

  // 2. Check for an existing chart with identical birth coordinates/date/time (never pay twice!)
  let matchQuery = admin
    .from("natal_charts")
    .select("*")
    .eq("dob", dobIso)
    .eq("precision_mode", astroPrecision)
    .eq("tz", params.birthTz)
    .gte("lat", params.birthLat - 0.001)
    .lte("lat", params.birthLat + 0.001)
    .gte("lon", params.birthLon - 0.001)
    .lte("lon", params.birthLon + 0.001);

  if (storedTob === null) {
    matchQuery = matchQuery.is("tob", null);
  } else {
    matchQuery = matchQuery.eq("tob", storedTob);
  }

  if (params.userId) {
    matchQuery = matchQuery.eq("user_id", params.userId);
  }

  const { data: existingMatches, error: matchErr } = await matchQuery.limit(1);
  if (matchErr) assertMigrationError(matchErr);

  const reusableRow = existingMatches?.[0] as NatalChartRow | undefined;

  if (reusableRow && !requestedToken) {
    // Return the existing cached row directly
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
    };
  }

  const sessionToken = requestedToken || `pb_${randomUUID()}`;

  let rawAstroJson: RawAstroBundle;
  let normalizedChartJson: NormalizedChartJson;
  let moonBoundaryFlag: boolean;
  let apiCallsMade = 0;
  let cached = false;

  if (reusableRow) {
    // Reuse raw & normalized math from cache (0 external API calls!)
    rawAstroJson = reusableRow.raw_astro_json;
    normalizedChartJson = reusableRow.normalized_chart_json;
    moonBoundaryFlag = reusableRow.moon_boundary_flag;
    cached = true;
    apiCallsMade = 0;
  } else {
    // 3. Cache miss -> Call VedicAstroAPI
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

  // 4. Persist natal_charts in Supabase (blueprints row is created by Slice 3 LLM synthesis)
  const { data: savedChart, error: upsertChartErr } = await admin
    .from("natal_charts")
    .upsert(
      {
        user_id: params.userId ?? null,
        session_token: sessionToken,
        dob: dobIso,
        tob: storedTob,
        birth_window: astroPrecision === "approx_window" ? params.birthWindow : null,
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

  if (params.userId) {
    await admin.from("profiles").upsert(
      {
        user_id: params.userId,
        first_name: params.firstName,
        relationship_status: params.relationshipStatus,
        career_mode: params.careerMode,
        career_field: params.careerField,
      },
      { onConflict: "user_id" }
    );
  }

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
  };
}

export async function claimSessionForUser(params: {
  sessionToken: string;
  userId: string;
  firstName?: string;
  relationshipStatus?: RelationshipStatus;
  careerMode?: CareerMode;
  careerField?: string;
}): Promise<{ chartId: string | null; blueprintId: string | null }> {
  const admin = getSupabaseAdminClient();
  const { sessionToken, userId } = params;

  const { data: chartRow, error: findErr } = await admin
    .from("natal_charts")
    .select("id, user_id")
    .eq("session_token", sessionToken)
    .maybeSingle<{ id: string; user_id: string | null }>();

  if (findErr) assertMigrationError(findErr);

  if (!chartRow) {
    return { chartId: null, blueprintId: null };
  }

  if (chartRow.user_id && chartRow.user_id !== userId) {
    throw new Error("This chart session is already claimed by another account.");
  }

  if (!chartRow.user_id) {
    const { error: updateChartErr } = await admin
      .from("natal_charts")
      .update({ user_id: userId })
      .eq("id", chartRow.id);
    if (updateChartErr) assertMigrationError(updateChartErr);
  }

  const { data: bpRow, error: updateBpErr } = await admin
    .from("blueprints")
    .update({ user_id: userId })
    .eq("chart_id", chartRow.id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (updateBpErr) assertMigrationError(updateBpErr);

  if (params.firstName) {
    await admin.from("profiles").upsert(
      {
        user_id: userId,
        first_name: params.firstName,
        relationship_status: params.relationshipStatus ?? null,
        career_mode: params.careerMode ?? "employed",
        career_field: params.careerField ?? "",
      },
      { onConflict: "user_id" }
    );
  }

  return {
    chartId: chartRow.id,
    blueprintId: bpRow?.id ?? null,
  };
}
