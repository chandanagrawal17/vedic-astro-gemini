import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AstroProvider } from "@/lib/astro/provider";
import {
  computeSynergyComparison,
  SYNERGY_ENGINE_VERSION,
} from "@/lib/astro/synergyEngine";
import {
  AstroPrecisionMode,
  NormalizedChartJson,
  toAstroPrecisionMode,
} from "@/lib/astro/types";
import {
  getAstroProvider,
  normalizeDobFormats,
  resolveEffectiveTob,
} from "@/lib/astro/vedicAstroProvider";
import {
  ExistingPaidAccountError,
  normalizeOptionalEmail,
} from "@/lib/cache/blueprintCache";
import { logFunnelEvent } from "@/lib/funnel/events";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { assertDbError } from "@/lib/supabase/blueprintSession";
import { calculateAndPersistChart } from "@/lib/supabase/chartSession";
import type {
  BirthWindow,
  PrecisionMode,
  SynergyComparisonPayload,
  SynergyRelationshipContext,
} from "@/lib/types/blueprint";

const SHARE_TOKEN_REGEX = /^syn_[A-Za-z0-9_-]{8,48}$/;

export class SynergyServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500
  ) {
    super(message);
    this.name = "SynergyServiceError";
  }
}

interface SynergyLinkDbRow {
  id: string;
  share_token: string;
  owner_chart_id: string;
  partner_chart_id: string | null;
  relationship_context: SynergyRelationshipContext;
  owner_display_name: string;
  owner_vibe_line: string | null;
  partner_display_name: string | null;
  precision_mode: AstroPrecisionMode;
  synergy_json: SynergyComparisonPayload | null;
  engine_version: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

interface OwnerChartDbRow {
  id: string;
  user_id: string | null;
  session_token: string;
  email: string | null;
  first_name: string | null;
  dob: string;
  precision_mode: AstroPrecisionMode;
  moon_boundary_flag: boolean;
  normalized_chart_json: NormalizedChartJson;
}

export interface SynergyInvitePublicResponse {
  status: "awaiting_partner" | "ready";
  shareToken: string;
  relationshipContext: SynergyRelationshipContext;
  ownerDisplayName: string;
  ownerVibeLine: string | null;
  hasSavedPartnerChart: boolean;
  comparison: SynergyComparisonPayload | null;
}

export interface SynergyCreateResult {
  shareToken: string;
  sharePath: string;
  relationshipContext: SynergyRelationshipContext;
  ownerDisplayName: string;
  ownerVibeLine: string | null;
}

export interface SynergyCompareResult {
  status: "ready";
  shareToken: string;
  persistedToDb: boolean;
  storageMode: "saved_to_account" | "local_only";
  partnerChartId: string | null;
  partnerSessionToken: string | null;
  comparison: SynergyComparisonPayload;
}

export interface SynergyDeps {
  admin?: Pick<SupabaseClient, "from">;
  astroProvider?: AstroProvider;
}

function generateShareToken(): string {
  return `syn_${randomBytes(12).toString("base64url")}`;
}

function sanitizeDisplayFirstName(raw?: string | null, fallback = "Someone"): string {
  const first = (raw ?? "").trim().split(/\s+/)[0] ?? "";
  const cleaned = first.replace(/[^a-zA-Z0-9'’-]/g, "").slice(0, 32);
  return cleaned || fallback;
}

function lowerAstroPrecision(
  a: AstroPrecisionMode,
  b: AstroPrecisionMode
): AstroPrecisionMode {
  if (a === "date_only" || b === "date_only") return "date_only";
  if (a === "approx_window" || b === "approx_window") return "approx_window";
  return "exact";
}

function assertSynergyDbError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.message?.includes("does not exist")
  ) {
    throw new SynergyServiceError(
      "Supabase schema out of date. Please run supabase/migrations/008_shareable_synergy.sql in your Supabase SQL Editor.",
      500
    );
  }
  assertDbError(error);
}

export function isValidShareToken(token: string): boolean {
  return SHARE_TOKEN_REGEX.test(token.trim());
}

export async function createSynergyInviteLink(
  params: {
    chartIdOrToken: string;
    relationshipContext: SynergyRelationshipContext;
    sessionToken?: string | null;
    userId?: string | null;
    userEmail?: string | null;
  },
  deps?: SynergyDeps
): Promise<SynergyCreateResult> {
  const admin = deps?.admin ?? getSupabaseAdminClient();
  const identifier = params.chartIdOrToken.trim();
  if (!identifier) {
    throw new SynergyServiceError("Missing chart identifier.", 400);
  }

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      identifier
    );

  const { data: chart, error: chartErr } = await admin
    .from("natal_charts")
    .select(
      "id, user_id, session_token, email, first_name, dob, precision_mode, moon_boundary_flag, normalized_chart_json"
    )
    .eq(isUuid ? "id" : "session_token", identifier)
    .maybeSingle<OwnerChartDbRow>();

  assertSynergyDbError(chartErr);
  if (!chart) {
    throw new SynergyServiceError("Blueprint chart not found.", 404);
  }

  const normalizedAuthEmail = normalizeOptionalEmail(params.userEmail);
  const normalizedChartEmail = normalizeOptionalEmail(chart.email);

  const authorized =
    (params.userId && chart.user_id && params.userId === chart.user_id) ||
    (normalizedAuthEmail &&
      normalizedChartEmail &&
      normalizedAuthEmail === normalizedChartEmail) ||
    (params.sessionToken && params.sessionToken === chart.session_token);

  if (!authorized) {
    throw new SynergyServiceError(
      "You are not authorized to share a Synergy link for this Blueprint.",
      403
    );
  }

  // Pull only the safe 1-line relational vibe headline (never PII)
  const { data: blueprintRow, error: bpErr } = await admin
    .from("blueprints")
    .select("hook_proof_json")
    .eq("chart_id", chart.id)
    .maybeSingle<{
      hook_proof_json?: {
        relationship?: { lovableContradictionHeadline?: string };
      };
    }>();

  assertSynergyDbError(bpErr);

  const ownerDisplayName = sanitizeDisplayFirstName(chart.first_name, "Your friend");
  const ownerVibeLine =
    blueprintRow?.hook_proof_json?.relationship?.lovableContradictionHeadline?.trim() ||
    null;

  const shareToken = generateShareToken();
  const { error: insertErr } = await admin.from("synergy_links").insert({
    share_token: shareToken,
    owner_chart_id: chart.id,
    relationship_context: params.relationshipContext,
    owner_display_name: ownerDisplayName,
    owner_vibe_line: ownerVibeLine,
    precision_mode: chart.precision_mode,
    engine_version: SYNERGY_ENGINE_VERSION,
  });

  assertSynergyDbError(insertErr);

  await logFunnelEvent({
    chartId: chart.id,
    email: chart.email,
    eventName: "synergy_link_created",
    metadata: {
      relationshipContext: params.relationshipContext,
      precisionMode: chart.precision_mode,
    },
    admin,
  });

  return {
    shareToken,
    sharePath: `/synergy/${shareToken}`,
    relationshipContext: params.relationshipContext,
    ownerDisplayName,
    ownerVibeLine,
  };
}

export async function getSynergyInviteByToken(
  shareToken: string,
  deps?: SynergyDeps
): Promise<SynergyInvitePublicResponse> {
  const token = shareToken.trim();
  if (!isValidShareToken(token)) {
    throw new SynergyServiceError("Synergy invite link not found.", 404);
  }

  const admin = deps?.admin ?? getSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("synergy_links")
    .select("*")
    .eq("share_token", token)
    .maybeSingle<SynergyLinkDbRow>();

  assertSynergyDbError(error);
  if (!row) {
    throw new SynergyServiceError("Synergy invite link not found.", 404);
  }

  // Non-blocking view counter increment
  void admin
    .from("synergy_links")
    .update({ view_count: (row.view_count ?? 0) + 1 })
    .eq("id", row.id);

  let comparison = row.synergy_json;
  const hasSavedPartnerChart = Boolean(row.partner_chart_id);

  // Self-healing cache refresh if engine version advanced for a saved pair
  if (
    hasSavedPartnerChart &&
    row.partner_chart_id &&
    (!comparison || comparison.engineVersion !== SYNERGY_ENGINE_VERSION)
  ) {
    const [{ data: ownerChart }, { data: partnerChart }] = await Promise.all([
      admin
        .from("natal_charts")
        .select("id, first_name, dob, precision_mode, normalized_chart_json")
        .eq("id", row.owner_chart_id)
        .maybeSingle<OwnerChartDbRow>(),
      admin
        .from("natal_charts")
        .select("id, first_name, dob, precision_mode, normalized_chart_json")
        .eq("id", row.partner_chart_id)
        .maybeSingle<OwnerChartDbRow>(),
    ]);

    if (ownerChart && partnerChart) {
      comparison = computeSynergyComparison({
        ownerFirstName: row.owner_display_name,
        ownerDob: ownerChart.dob,
        ownerChart: ownerChart.normalized_chart_json,
        partnerFirstName:
          row.partner_display_name ||
          sanitizeDisplayFirstName(partnerChart.first_name, "Partner"),
        partnerDob: partnerChart.dob,
        partnerChart: partnerChart.normalized_chart_json,
        relationshipContext: row.relationship_context,
      });

      await admin
        .from("synergy_links")
        .update({
          synergy_json: comparison,
          engine_version: SYNERGY_ENGINE_VERSION,
        })
        .eq("id", row.id);
    }
  }

  if (!comparison) {
    await logFunnelEvent({
      chartId: row.owner_chart_id,
      eventName: "synergy_invite_viewed",
      metadata: {
        relationshipContext: row.relationship_context,
      },
      admin,
    });
  }

  return {
    status: comparison ? "ready" : "awaiting_partner",
    shareToken: row.share_token,
    relationshipContext: row.relationship_context,
    ownerDisplayName: row.owner_display_name,
    ownerVibeLine: row.owner_vibe_line,
    hasSavedPartnerChart,
    comparison,
  };
}

export interface CompareSynergyPartnerParams {
  shareToken: string;
  firstName: string;
  email?: string | null;
  birthDate: string;
  birthCity: string;
  birthLat: number;
  birthLon: number;
  birthTz: number;
  precisionMode: PrecisionMode | AstroPrecisionMode;
  birthTime: string | null;
  birthWindow: BirthWindow | null;
  userId?: string | null;
  userEmail?: string | null;
}

export async function compareSynergyWithPartner(
  params: CompareSynergyPartnerParams,
  deps?: SynergyDeps
): Promise<SynergyCompareResult> {
  const token = params.shareToken.trim();
  if (!isValidShareToken(token)) {
    throw new SynergyServiceError("Synergy invite link not found.", 404);
  }

  const admin = deps?.admin ?? getSupabaseAdminClient();
  const { data: linkRow, error: linkErr } = await admin
    .from("synergy_links")
    .select("*")
    .eq("share_token", token)
    .maybeSingle<SynergyLinkDbRow>();

  assertSynergyDbError(linkErr);
  if (!linkRow) {
    throw new SynergyServiceError("Synergy invite link not found.", 404);
  }
  if (linkRow.partner_chart_id) {
    throw new SynergyServiceError(
      "This Synergy invite link has already been completed. Ask for a fresh link to compare another profile.",
      409
    );
  }

  const { data: ownerChart, error: ownerErr } = await admin
    .from("natal_charts")
    .select(
      "id, user_id, session_token, email, first_name, dob, precision_mode, moon_boundary_flag, normalized_chart_json"
    )
    .eq("id", linkRow.owner_chart_id)
    .maybeSingle<OwnerChartDbRow>();

  assertSynergyDbError(ownerErr);
  if (!ownerChart) {
    throw new SynergyServiceError("Owner chart is no longer available.", 404);
  }

  const partnerEmail = normalizeOptionalEmail(params.email);
  const partnerFirstName = sanitizeDisplayFirstName(params.firstName, "Partner");
  const { dobIso } = normalizeDobFormats(params.birthDate);
  const astroPrecision = toAstroPrecisionMode(params.precisionMode);
  const effectiveTob = resolveEffectiveTob(
    astroPrecision,
    params.birthTime,
    params.birthWindow
  );

  let partnerChartJson: NormalizedChartJson | null = null;
  let partnerChartId: string | null = null;
  let partnerSessionToken: string | null = null;
  let persistedToDb = false;

  // 1. If Partner B provided an email, persist via existing cache-first chart pipeline.
  //    If email is omitted, keep Partner B's birth details strictly local (never write to DB).
  if (partnerEmail) {
    try {
      const persisted = await calculateAndPersistChart(
        {
          email: partnerEmail,
          firstName: partnerFirstName,
          birthDate: params.birthDate,
          birthCity: params.birthCity,
          birthLat: params.birthLat,
          birthLon: params.birthLon,
          birthTz: params.birthTz,
          precisionMode: params.precisionMode,
          birthTime: params.birthTime,
          birthWindow: params.birthWindow,
          relationshipStatus: "single",
          careerMode: "employed",
          careerField: "",
          userId: params.userId,
          userEmail: params.userEmail,
        },
        { admin, astroProvider: deps?.astroProvider }
      );

      partnerChartJson = persisted.normalizedChart;
      partnerChartId = persisted.chartId;
      partnerSessionToken = persisted.sessionToken;
      persistedToDb = true;
    } catch (err) {
      if (!(err instanceof ExistingPaidAccountError)) {
        throw err;
      }
      // Paid account protection: do not expose or overwrite an unauthenticated paid account's chart;
      // fall through to ephemeral calculation in local-only mode.
    }
  }

  if (!partnerChartJson) {
    const provider = deps?.astroProvider ?? getAstroProvider();
    const bundle = await provider.fetchChartBundle({
      firstName: partnerFirstName,
      dob: dobIso,
      tob: astroPrecision === "date_only" ? null : effectiveTob,
      birthWindow: params.birthWindow,
      precisionMode: astroPrecision,
      birthCity: params.birthCity,
      lat: params.birthLat,
      lon: params.birthLon,
      tz: params.birthTz,
    });
    partnerChartJson = bundle.normalizedChartJson;
  }

  const comparison = computeSynergyComparison({
    ownerFirstName: linkRow.owner_display_name,
    ownerDob: ownerChart.dob,
    ownerChart: ownerChart.normalized_chart_json,
    partnerFirstName,
    partnerDob: dobIso,
    partnerChart: partnerChartJson,
    relationshipContext: linkRow.relationship_context,
  });

  // Only persist partner link & comparison JSON in DB when Partner B opted in with an email
  if (persistedToDb && partnerChartId) {
    const effectivePrecision = lowerAstroPrecision(
      ownerChart.precision_mode,
      partnerChartJson.precisionMode
    );
    const { error: updateErr } = await admin
      .from("synergy_links")
      .update({
        partner_chart_id: partnerChartId,
        partner_display_name: partnerFirstName,
        precision_mode: effectivePrecision,
        synergy_json: comparison,
        engine_version: SYNERGY_ENGINE_VERSION,
      })
      .eq("id", linkRow.id);

    assertSynergyDbError(updateErr);
  }

  await logFunnelEvent({
    chartId: linkRow.owner_chart_id,
    eventName: "synergy_compared",
    metadata: {
      relationshipContext: linkRow.relationship_context,
      storageMode: persistedToDb ? "saved_to_account" : "local_only",
      precisionMode: comparison.precisionBadge.mode,
      overallScore: comparison.overallScore,
    },
    admin,
  });

  return {
    status: "ready",
    shareToken: linkRow.share_token,
    persistedToDb,
    storageMode: persistedToDb ? "saved_to_account" : "local_only",
    partnerChartId,
    partnerSessionToken,
    comparison,
  };
}
