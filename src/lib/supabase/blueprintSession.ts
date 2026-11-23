import type { SupabaseClient } from "@supabase/supabase-js";
import { AstroPrecisionMode, NormalizedChartJson, toUiPrecisionMode } from "@/lib/astro/types";
import {
  computeContextHash,
  ExistingPaidAccountError,
  isAuthorizedForExistingRecord,
  normalizeEmail,
  normalizeOptionalEmail,
} from "@/lib/cache/blueprintCache";
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
  email?: string | null;
  birth_input_hash?: string | null;
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
  email?: string | null;
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
  email?: string | null;
  context_hash?: string | null;
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
  contextHash?: string | null;
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
      "Supabase schema out of date. Please run supabase/migrations/001_slice2_core.sql, 002_slice3_blueprints.sql, and 003_slice35_email_caching.sql in your Supabase SQL Editor.",
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
  sessionToken?: string | null,
  userEmail?: string | null
): void {
  const matchesUser = Boolean(userId && chart.user_id && chart.user_id === userId);
  const matchesToken = Boolean(
    sessionToken && chart.session_token === sessionToken
  );
  const matchesEmail = Boolean(
    userEmail &&
      chart.email &&
      normalizeEmail(userEmail) === normalizeEmail(chart.email)
  );

  if (matchesUser || matchesToken || matchesEmail) {
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
    email: chart.email ?? "",
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
    contextHash: bp.context_hash ?? null,
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
        "user_id, email, first_name, relationship_status, career_mode, career_field"
      )
      .eq("user_id", chart.user_id)
      .maybeSingle<ProfileDbRow>();
    if (!error && data) {
      profileRow = data;
    }
  }

  return {
    firstName:
      override?.firstName?.trim() ||
      chart.first_name?.trim() ||
      profileRow?.first_name?.trim() ||
      "Friend",
    relationshipStatus:
      override?.relationshipStatus ||
      chart.relationship_status ||
      profileRow?.relationship_status ||
      "single",
    careerMode:
      override?.careerMode ||
      chart.career_mode ||
      profileRow?.career_mode ||
      "employed",
    careerField:
      override?.careerField !== undefined
        ? override.careerField
        : chart.career_field ?? profileRow?.career_field ?? "",
  };
}

export async function synthesizeAndPersistBlueprint(params: {
  chartId: string;
  sessionToken?: string | null;
  email?: string | null;
  userId?: string | null;
  userEmail?: string | null;
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
  let chart = await findNatalChart(params.chartId, admin);

  const requestedEmail = normalizeOptionalEmail(params.email);

  if (!chart && requestedEmail) {
    const { data: emailChart, error: emailChartErr } = await admin
      .from("natal_charts")
      .select("*")
      .eq("email", requestedEmail)
      .maybeSingle<NatalChartDbRow>();
    if (emailChartErr) assertDbError(emailChartErr);
    chart = emailChart ?? null;
  }

  if (!chart) {
    throw new BlueprintServiceError("Natal chart not found.", 404);
  }

  const effectiveEmail = requestedEmail ?? normalizeOptionalEmail(chart.email);

  const { data: existingBp, error: existingErr } = await admin
    .from("blueprints")
    .select("*")
    .eq("chart_id", chart.id)
    .maybeSingle<BlueprintDbRow>();

  if (existingErr) assertDbError(existingErr);

  // Paid Account Privacy Guardrail: never overwrite or leak paid blueprint to unauthenticated callers
  if (
    existingBp?.is_paid === true &&
    !isAuthorizedForExistingRecord({
      chartUserId: chart.user_id,
      blueprintUserId: existingBp.user_id,
      recordEmail: effectiveEmail ?? existingBp.email ?? chart.email,
      authUserId: params.userId,
      authUserEmail: params.userEmail,
    })
  ) {
    throw new ExistingPaidAccountError();
  }

  if (!existingBp && effectiveEmail) {
    const { data: paidByEmail, error: paidEmailErr } = await admin
      .from("blueprints")
      .select("id, user_id, email, is_paid")
      .eq("email", effectiveEmail)
      .eq("is_paid", true)
      .maybeSingle<Pick<BlueprintDbRow, "id" | "user_id" | "email" | "is_paid">>();
    if (paidEmailErr) assertDbError(paidEmailErr);
    if (
      paidByEmail &&
      !isAuthorizedForExistingRecord({
        chartUserId: chart.user_id,
        blueprintUserId: paidByEmail.user_id,
        recordEmail: effectiveEmail,
        authUserId: params.userId,
        authUserEmail: params.userEmail,
      })
    ) {
      throw new ExistingPaidAccountError();
    }
  }

  assertOwnership(chart, params.userId, params.sessionToken, params.userEmail);

  const profile = await resolveProfileContext(chart, params.profileOverride, admin);
  const newContextHash = computeContextHash(profile);
  const inputSummary = buildInputSummary(
    { ...chart, email: effectiveEmail ?? chart.email },
    profile
  );

  // 1. Case A — Full Cache Hit: synthesized blueprint exists AND context_hash matches!
  //    Return it immediately with 0 Gemini API calls.
  if (
    existingBp &&
    existingBp.model_version &&
    existingBp.context_hash === newContextHash
  ) {
    return formatSanitizedResponse({
      bp: existingBp,
      chart,
      input: inputSummary,
      cached: true,
      llmCallsMade: 0,
    });
  }

  // Keep chart context fields synced if caller supplied overrides or email
  const chartContextPatch: Record<string, unknown> = {};
  if (params.profileOverride?.firstName) {
    chartContextPatch.first_name = profile.firstName;
  }
  if (params.profileOverride?.relationshipStatus) {
    chartContextPatch.relationship_status = profile.relationshipStatus;
  }
  if (params.profileOverride?.careerMode) {
    chartContextPatch.career_mode = profile.careerMode;
  }
  if (params.profileOverride?.careerField !== undefined) {
    chartContextPatch.career_field = profile.careerField;
  }
  if (effectiveEmail && !chart.email) {
    chartContextPatch.email = effectiveEmail;
  }
  if (Object.keys(chartContextPatch).length > 0) {
    const { error: chartPatchErr } = await admin
      .from("natal_charts")
      .update(chartContextPatch)
      .eq("id", chart.id);
    if (chartPatchErr) assertDbError(chartPatchErr);
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

  // 3. Persist both hook_proof_json and full_blueprint_json to Supabase.
  //    If existingBp already exists (Case B context change or Case C birth time update),
  //    UPDATE in place preserving id, user_id, session_token, and is_paid!
  let savedBp: BlueprintDbRow | null = null;

  if (existingBp) {
    const { data: updatedBp, error: updateErr } = await admin
      .from("blueprints")
      .update({
        user_id: existingBp.user_id ?? chart.user_id ?? params.userId ?? null,
        email: effectiveEmail ?? existingBp.email ?? null,
        context_hash: newContextHash,
        hook_proof_json: synthesized.payload.hook_proof_json,
        full_blueprint_json: synthesized.payload.full_blueprint_json,
        model_version: synthesized.modelVersion,
      })
      .eq("id", existingBp.id)
      .select("*")
      .single<BlueprintDbRow>();

    if (updateErr) assertDbError(updateErr);
    savedBp = updatedBp;
  } else {
    const { data: insertedBp, error: upsertErr } = await admin
      .from("blueprints")
      .upsert(
        {
          chart_id: chart.id,
          user_id: chart.user_id ?? params.userId ?? null,
          session_token: chart.session_token,
          email: effectiveEmail,
          context_hash: newContextHash,
          hook_proof_json: synthesized.payload.hook_proof_json,
          full_blueprint_json: synthesized.payload.full_blueprint_json,
          model_version: synthesized.modelVersion,
        },
        { onConflict: "chart_id" }
      )
      .select("*")
      .single<BlueprintDbRow>();

    if (upsertErr) assertDbError(upsertErr);
    savedBp = insertedBp;
  }

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
  userEmail?: string | null;
  sessionToken?: string | null;
  admin?: SupabaseAdminLike;
}): Promise<BlueprintApiResponse> {
  const admin = params.admin ?? getSupabaseAdminClient();
  const chart = await findNatalChart(params.chartIdOrToken, admin);
  if (!chart) {
    throw new BlueprintServiceError("Blueprint chart not found.", 404);
  }

  assertOwnership(chart, params.userId, params.sessionToken, params.userEmail);

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
  userEmail?: string | null;
  sessionToken?: string | null;
  admin?: SupabaseAdminLike;
}): Promise<{ ok: true; accuracyFeedback: HardResetFeedback; chartId: string }> {
  const admin = params.admin ?? getSupabaseAdminClient();
  const chart = await findNatalChart(params.chartIdOrToken, admin);
  if (!chart) {
    throw new BlueprintServiceError("Blueprint chart not found.", 404);
  }

  assertOwnership(chart, params.userId, params.sessionToken, params.userEmail);

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
