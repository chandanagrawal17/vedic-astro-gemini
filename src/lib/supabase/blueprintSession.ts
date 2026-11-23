import type { SupabaseClient } from "@supabase/supabase-js";
import { AstroPrecisionMode, NormalizedChartJson, toUiPrecisionMode } from "@/lib/astro/types";
import { FullBlueprintPayload, HookProofPayload } from "@/lib/llm/blueprintSchema";
import { BlueprintGuardrailError } from "@/lib/llm/guardrails";
import { LlmProvider } from "@/lib/llm/provider";
import { synthesizeBlueprint } from "@/lib/llm/synthesizeBlueprint";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  BirthWindow,
  CareerMode,
  HardResetFeedback,
  OnboardingInput,
  RelationshipStatus,
} from "@/lib/types/blueprint";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class BlueprintServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "BlueprintServiceError";
  }
}

export function isDevUnlockPreviewEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_UNLOCK_PREVIEW === "true"
  );
}

interface NatalChartDbRow {
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
  normalized_chart_json: NormalizedChartJson;
  first_name?: string | null;
  relationship_status?: RelationshipStatus | null;
  career_mode?: CareerMode | null;
  career_field?: string | null;
  created_at: string;
}

interface ProfileDbRow {
  user_id: string;
  first_name: string;
  relationship_status: RelationshipStatus | null;
  career_mode: CareerMode;
  career_field: string | null;
}

interface BlueprintDbRow {
  id: string;
  chart_id: string;
  user_id: string | null;
  session_token: string;
  hook_proof_json: HookProofPayload;
  full_blueprint_json: FullBlueprintPayload;
  accuracy_feedback: HardResetFeedback | null;
  model_version: string | null;
  is_paid: boolean;
  unlock_tier: "one_time_19" | "annual_39" | null;
  created_at: string;
}

export interface BlueprintApiResponse {
  blueprintId: string;
  chartId: string;
  sessionId: string;
  sessionToken: string;
  cached: boolean;
  llmCallsMade: number;
  modelVersion: string | null;
  precisionMode: ReturnType<typeof toUiPrecisionMode>;
  moonBoundaryFlag: boolean;
  isPaid: boolean;
  isUnlocked: boolean;
  unlockTier: "one_time_19" | "annual_39" | null;
  accuracyFeedback: HardResetFeedback | null;
  hook_proof_json: HookProofPayload;
  full_blueprint_json: FullBlueprintPayload | null;
  input: OnboardingInput;
  createdAt: string;
}

function assertDbError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.message?.includes("does not exist")
  ) {
    throw new BlueprintServiceError(
      "Supabase schema out of date. Please run supabase/migrations/001_slice2_core.sql and 002_slice3_blueprints.sql in your Supabase SQL Editor.",
      500
    );
  }
  throw new BlueprintServiceError(
    error.message || "Supabase database error.",
    500
  );
}

export type SupabaseAdminLike = Pick<SupabaseClient, "from">;

async function findNatalChart(
  chartIdOrToken: string,
  admin: SupabaseAdminLike = getSupabaseAdminClient()
): Promise<NatalChartDbRow | null> {
  const column = UUID_REGEX.test(chartIdOrToken) ? "id" : "session_token";
  const { data, error } = await admin
    .from("natal_charts")
    .select("*")
    .eq(column, chartIdOrToken)
    .maybeSingle<NatalChartDbRow>();

  if (error) assertDbError(error);
  return data ?? null;
}

function assertOwnership(
  chart: NatalChartDbRow,
  userId?: string | null,
  sessionToken?: string | null
): void {
  const matchesUser = Boolean(userId && chart.user_id && chart.user_id === userId);
  const matchesToken = Boolean(
    sessionToken && chart.session_token === sessionToken
  );

  if (matchesUser || matchesToken) {
    return;
  }

  throw new BlueprintServiceError(
    "Unauthorized access to this Blueprint session.",
    403
  );
}

function buildInputSummary(
  chart: NatalChartDbRow,
  profile: {
    firstName: string;
    relationshipStatus: RelationshipStatus;
    careerMode: CareerMode;
    careerField: string;
  }
): OnboardingInput {
  return {
    firstName: profile.firstName,
    birthDate: chart.dob,
    birthCity: chart.birth_city,
    birthLat: chart.lat,
    birthLon: chart.lon,
    birthTz: chart.tz,
    precisionMode: toUiPrecisionMode(chart.precision_mode),
    birthTime: chart.tob,
    birthWindow: chart.birth_window,
    relationshipStatus: profile.relationshipStatus,
    careerMode: profile.careerMode,
    careerField: profile.careerField,
  };
}

function formatSanitizedResponse(params: {
  bp: BlueprintDbRow;
  chart: NatalChartDbRow;
  input: OnboardingInput;
  cached: boolean;
  llmCallsMade: number;
}): BlueprintApiResponse {
  const { bp, chart, input, cached, llmCallsMade } = params;
  const isUnlocked = Boolean(bp.is_paid) || isDevUnlockPreviewEnabled();

  return {
    blueprintId: bp.id,
    chartId: chart.id,
    sessionId: chart.session_token,
    sessionToken: chart.session_token,
    cached,
    llmCallsMade,
    modelVersion: bp.model_version,
    precisionMode: toUiPrecisionMode(chart.precision_mode),
    moonBoundaryFlag: chart.moon_boundary_flag,
    isPaid: Boolean(bp.is_paid),
    isUnlocked,
    unlockTier: bp.unlock_tier,
    accuracyFeedback: bp.accuracy_feedback,
    hook_proof_json: bp.hook_proof_json,
    // CRITICAL SERVER-SIDE REDACTION RULE:
    full_blueprint_json: isUnlocked ? bp.full_blueprint_json : null,
    input,
    createdAt: bp.created_at,
  };
}

async function resolveProfileContext(
  chart: NatalChartDbRow,
  override?: Partial<{
    firstName: string;
    relationshipStatus: RelationshipStatus;
    careerMode: CareerMode;
    careerField: string;
  }>,
  admin: SupabaseAdminLike = getSupabaseAdminClient()
): Promise<{
  firstName: string;
  relationshipStatus: RelationshipStatus;
  careerMode: CareerMode;
  careerField: string;
}> {
  let profileRow: ProfileDbRow | null = null;
  if (chart.user_id) {
    const { data, error } = await admin
      .from("profiles")
      .select(
        "user_id, first_name, relationship_status, career_mode, career_field"
      )
      .eq("user_id", chart.user_id)
      .maybeSingle<ProfileDbRow>();
    if (!error && data) {
      profileRow = data;
    }
  }

  return {
    firstName:
      chart.first_name?.trim() ||
      profileRow?.first_name?.trim() ||
      override?.firstName?.trim() ||
      "Friend",
    relationshipStatus:
      chart.relationship_status ||
      profileRow?.relationship_status ||
      override?.relationshipStatus ||
      "single",
    careerMode:
      chart.career_mode ||
      profileRow?.career_mode ||
      override?.careerMode ||
      "employed",
    careerField:
      chart.career_field ??
      profileRow?.career_field ??
      override?.careerField ??
      "",
  };
}

export async function synthesizeAndPersistBlueprint(params: {
  chartId: string;
  sessionToken?: string | null;
  userId?: string | null;
  profileOverride?: Partial<{
    firstName: string;
    relationshipStatus: RelationshipStatus;
    careerMode: CareerMode;
    careerField: string;
  }>;
  llmProvider?: LlmProvider;
  admin?: SupabaseAdminLike;
}): Promise<BlueprintApiResponse> {
  const admin = params.admin ?? getSupabaseAdminClient();
  const chart = await findNatalChart(params.chartId, admin);
  if (!chart) {
    throw new BlueprintServiceError("Natal chart not found.", 404);
  }

  assertOwnership(chart, params.userId, params.sessionToken);

  const profile = await resolveProfileContext(chart, params.profileOverride, admin);
  const inputSummary = buildInputSummary(chart, profile);

  // 1. Idempotency check: if a synthesized blueprints row already exists for chartId,
  //    return it immediately with 0 Gemini API calls!
  const { data: existingBp, error: existingErr } = await admin
    .from("blueprints")
    .select("*")
    .eq("chart_id", chart.id)
    .not("model_version", "is", null)
    .maybeSingle<BlueprintDbRow>();

  if (existingErr) assertDbError(existingErr);

  if (existingBp) {
    return formatSanitizedResponse({
      bp: existingBp,
      chart,
      input: inputSummary,
      cached: true,
      llmCallsMade: 0,
    });
  }

  // 2. Run Gemini AI Synthesis + Guardrail Audit (+1 auto-repair retry if needed)
  let synthesized;
  try {
    synthesized = await synthesizeBlueprint(
      {
        normalizedChart: chart.normalized_chart_json,
        profile,
      },
      params.llmProvider
    );
  } catch (err) {
    if (err instanceof BlueprintGuardrailError) {
      throw new BlueprintServiceError(
        "Blueprint synthesis did not pass quality guardrails. Please try again.",
        422,
        { flaggedTerms: err.flaggedTerms }
      );
    }
    throw err;
  }

  // 3. Persist both hook_proof_json and full_blueprint_json to Supabase
  const { data: savedBp, error: upsertErr } = await admin
    .from("blueprints")
    .upsert(
      {
        chart_id: chart.id,
        user_id: chart.user_id ?? params.userId ?? null,
        session_token: chart.session_token,
        hook_proof_json: synthesized.payload.hook_proof_json,
        full_blueprint_json: synthesized.payload.full_blueprint_json,
        model_version: synthesized.modelVersion,
      },
      { onConflict: "session_token" }
    )
    .select("*")
    .single<BlueprintDbRow>();

  if (upsertErr) assertDbError(upsertErr);

  return formatSanitizedResponse({
    bp: savedBp!,
    chart,
    input: inputSummary,
    cached: false,
    llmCallsMade: synthesized.llmCallsMade,
  });
}

export async function getBlueprintById(params: {
  chartIdOrToken: string;
  userId?: string | null;
  sessionToken?: string | null;
  admin?: SupabaseAdminLike;
}): Promise<BlueprintApiResponse> {
  const admin = params.admin ?? getSupabaseAdminClient();
  const chart = await findNatalChart(params.chartIdOrToken, admin);
  if (!chart) {
    throw new BlueprintServiceError("Blueprint chart not found.", 404);
  }

  assertOwnership(chart, params.userId, params.sessionToken);

  const { data: bp, error: bpErr } = await admin
    .from("blueprints")
    .select("*")
    .eq("chart_id", chart.id)
    .not("model_version", "is", null)
    .maybeSingle<BlueprintDbRow>();

  if (bpErr) assertDbError(bpErr);

  if (!bp) {
    throw new BlueprintServiceError(
      "Blueprint has not been synthesized yet.",
      404
    );
  }

  const profile = await resolveProfileContext(chart, undefined, admin);
  const inputSummary = buildInputSummary(chart, profile);

  return formatSanitizedResponse({
    bp,
    chart,
    input: inputSummary,
    cached: true,
    llmCallsMade: 0,
  });
}

export async function saveBlueprintFeedback(params: {
  chartIdOrToken: string;
  feedback: HardResetFeedback;
  userId?: string | null;
  sessionToken?: string | null;
  admin?: SupabaseAdminLike;
}): Promise<{ ok: true; accuracyFeedback: HardResetFeedback; chartId: string }> {
  const admin = params.admin ?? getSupabaseAdminClient();
  const chart = await findNatalChart(params.chartIdOrToken, admin);
  if (!chart) {
    throw new BlueprintServiceError("Blueprint chart not found.", 404);
  }

  assertOwnership(chart, params.userId, params.sessionToken);

  const { data: updated, error } = await admin
    .from("blueprints")
    .update({ accuracy_feedback: params.feedback })
    .eq("chart_id", chart.id)
    .select("chart_id, accuracy_feedback")
    .maybeSingle<{ chart_id: string; accuracy_feedback: HardResetFeedback }>();

  if (error) assertDbError(error);
  if (!updated) {
    throw new BlueprintServiceError("Blueprint not found for this chart.", 404);
  }

  return {
    ok: true,
    chartId: updated.chart_id,
    accuracyFeedback: updated.accuracy_feedback,
  };
}
