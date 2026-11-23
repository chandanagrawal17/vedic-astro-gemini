import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AstroPrecisionMode,
  NormalizedChartJson,
  RawAstroBundle,
  toAstroPrecisionMode,
} from "@/lib/astro/types";
import { FullBlueprintPayload, HookProofPayload } from "@/lib/llm/blueprintSchema";
import {
  BirthWindow,
  CareerMode,
  EntryHook,
  HardResetFeedback,
  PrecisionMode as UiPrecisionMode,
  RelationshipStatus,
  UnlockSource,
} from "@/lib/types/blueprint";

export const EXISTING_PAID_ACCOUNT_MESSAGE =
  "This email already has an unlocked Blueprint. Please sign in to access or update it.";

export class ExistingPaidAccountError extends Error {
  public readonly status = "existing_paid_account" as const;
  public readonly statusCode = 409;

  constructor(message = EXISTING_PAID_ACCOUNT_MESSAGE) {
    super(message);
    this.name = "ExistingPaidAccountError";
  }
}

export type CacheAdminClient = Pick<SupabaseClient, "from">;

export interface NatalChartCacheRow {
  id: string;
  user_id: string | null;
  session_token: string;
  email: string | null;
  birth_input_hash: string | null;
  dob: string;
  tob: string | null;
  birth_window: BirthWindow | null;
  precision_mode: AstroPrecisionMode;
  birth_city: string;
  lat: number;
  lon: number;
  tz: number;
  moon_boundary_flag: boolean;
  first_name?: string | null;
  relationship_status?: RelationshipStatus | null;
  career_mode?: CareerMode | null;
  career_field?: string | null;
  raw_astro_json: RawAstroBundle;
  normalized_chart_json: NormalizedChartJson;
  created_at?: string;
  updated_at?: string;
}

export interface BlueprintCacheRow {
  id: string;
  chart_id: string;
  user_id: string | null;
  session_token: string;
  email: string | null;
  context_hash: string | null;
  hook_proof_json: HookProofPayload;
  full_blueprint_json: FullBlueprintPayload;
  accuracy_feedback: HardResetFeedback | null;
  model_version: string | null;
  is_paid: boolean;
  unlock_tier: "one_time_19" | "annual_39" | null;
  unlock_source?: UnlockSource | null;
  unlocked_at?: string | null;
  unlocked_email_sent_at?: string | null;
  entry_hook?: EntryHook | null;
  utm_source?: string | null;
  created_at: string;
  updated_at?: string;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeOptionalEmail(email?: string | null): string | null {
  if (!email) return null;
  const normalized = normalizeEmail(email);
  return normalized.length > 0 ? normalized : null;
}

function roundCoord(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  const safe = Object.is(rounded, -0) ? 0 : rounded;
  return safe.toFixed(3);
}

export function computeBirthInputHash(input: {
  dob: string;
  tob?: string | null;
  precisionMode: UiPrecisionMode | AstroPrecisionMode;
  lat: number;
  lon: number;
  tz: number;
}): string {
  const astroPrecision = toAstroPrecisionMode(input.precisionMode);
  const dobPart = input.dob.trim();
  const tobPart = astroPrecision === "date_only" ? "" : (input.tob ?? "").trim();
  const latPart = roundCoord(input.lat);
  const lonPart = roundCoord(input.lon);
  const tzNum = Number(input.tz);
  const tzPart = String(Object.is(tzNum, -0) ? 0 : tzNum);

  const canonical = [
    dobPart,
    tobPart,
    astroPrecision,
    latPart,
    lonPart,
    tzPart,
  ].join("|");

  return createHash("sha256").update(canonical).digest("hex");
}

export const BLUEPRINT_ENGINE_VERSION = "v2_hr_career_tiered";

export function computeContextHash(input: {
  firstName: string;
  relationshipStatus: RelationshipStatus;
  careerMode: CareerMode;
  careerField?: string | null;
}): string {
  const canonical = [
    BLUEPRINT_ENGINE_VERSION,
    input.firstName.trim().toLowerCase(),
    input.relationshipStatus.trim().toLowerCase(),
    input.careerMode.trim().toLowerCase(),
    (input.careerField ?? "").trim().toLowerCase(),
  ].join("|");

  return createHash("sha256").update(canonical).digest("hex");
}

export function isAuthorizedForExistingRecord(params: {
  chartUserId?: string | null;
  blueprintUserId?: string | null;
  recordEmail?: string | null;
  authUserId?: string | null;
  authUserEmail?: string | null;
}): boolean {
  const authUid = params.authUserId ?? null;
  const authEmail = normalizeOptionalEmail(params.authUserEmail);
  const targetEmail = normalizeOptionalEmail(params.recordEmail);

  if (authUid && (params.chartUserId === authUid || params.blueprintUserId === authUid)) {
    return true;
  }

  if (authEmail && targetEmail && authEmail === targetEmail) {
    return true;
  }

  return false;
}

export async function lookupEmailCacheRecord(
  admin: CacheAdminClient,
  normalizedEmail: string
): Promise<{
  chart: NatalChartCacheRow | null;
  blueprint: BlueprintCacheRow | null;
}> {
  const { data: chart, error: chartErr } = await admin
    .from("natal_charts")
    .select("*")
    .eq("email", normalizedEmail)
    .maybeSingle<NatalChartCacheRow>();

  if (chartErr) {
    throw chartErr;
  }

  if (chart) {
    const { data: blueprint, error: bpErr } = await admin
      .from("blueprints")
      .select("*")
      .eq("chart_id", chart.id)
      .maybeSingle<BlueprintCacheRow>();

    if (bpErr) {
      throw bpErr;
    }

    return { chart, blueprint: blueprint ?? null };
  }

  // Fallback check if an orphaned blueprint row exists with that email
  const { data: blueprintByEmail, error: bpEmailErr } = await admin
    .from("blueprints")
    .select("*")
    .eq("email", normalizedEmail)
    .maybeSingle<BlueprintCacheRow>();

  if (bpEmailErr) {
    throw bpEmailErr;
  }

  return { chart: null, blueprint: blueprintByEmail ?? null };
}

export type EmailCacheEvaluation =
  | {
      status: "existing_paid_account";
      message: string;
    }
  | {
      status: "ready";
      cacheCase: "A" | "B" | "C" | "D";
      normalizedEmail: string;
      birthInputHash: string;
      contextHash: string;
      existingChart: NatalChartCacheRow | null;
      existingBlueprint: BlueprintCacheRow | null;
    };

export async function evaluateEmailCacheState(params: {
  admin: CacheAdminClient;
  email: string;
  birthInputHash: string;
  contextHash: string;
  authUserId?: string | null;
  authUserEmail?: string | null;
  sessionToken?: string | null;
  intent?: string | null;
}): Promise<EmailCacheEvaluation> {
  const normalizedEmail = normalizeEmail(params.email);
  const { chart, blueprint } = await lookupEmailCacheRecord(
    params.admin,
    normalizedEmail
  );

  const isVerifiedBetaRefresh = Boolean(
    params.intent === "birth_time_upgrade" &&
      params.sessionToken &&
      chart &&
      params.sessionToken === chart.session_token &&
      (blueprint?.unlock_source === "beta_free" ||
        blueprint?.unlock_source === "beta_code")
  );

  // Paid Account Privacy Guardrail
  if (
    blueprint?.is_paid === true &&
    !isVerifiedBetaRefresh &&
    !isAuthorizedForExistingRecord({
      chartUserId: chart?.user_id,
      blueprintUserId: blueprint.user_id,
      recordEmail: normalizedEmail,
      authUserId: params.authUserId,
      authUserEmail: params.authUserEmail,
    })
  ) {
    return {
      status: "existing_paid_account",
      message: EXISTING_PAID_ACCOUNT_MESSAGE,
    };
  }

  if (!chart) {
    return {
      status: "ready",
      cacheCase: "D",
      normalizedEmail,
      birthInputHash: params.birthInputHash,
      contextHash: params.contextHash,
      existingChart: null,
      existingBlueprint: blueprint,
    };
  }

  const storedBirthHash =
    chart.birth_input_hash ??
    computeBirthInputHash({
      dob: chart.dob,
      tob: chart.tob,
      precisionMode: chart.precision_mode,
      lat: chart.lat,
      lon: chart.lon,
      tz: chart.tz,
    });

  if (storedBirthHash !== params.birthInputHash) {
    return {
      status: "ready",
      cacheCase: "C",
      normalizedEmail,
      birthInputHash: params.birthInputHash,
      contextHash: params.contextHash,
      existingChart: chart,
      existingBlueprint: blueprint,
    };
  }

  const hasMatchingBlueprint = Boolean(
    blueprint &&
      blueprint.model_version &&
      blueprint.context_hash === params.contextHash
  );

  return {
    status: "ready",
    cacheCase: hasMatchingBlueprint ? "A" : "B",
    normalizedEmail,
    birthInputHash: params.birthInputHash,
    contextHash: params.contextHash,
    existingChart: chart,
    existingBlueprint: blueprint,
  };
}
