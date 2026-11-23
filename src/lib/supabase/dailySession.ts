import type { NextRequest } from "next/server";
import {
  buildDailyCommandCenterData,
  buildSevenDayCalendar,
  evaluateMoveAudit,
  evaluateTextOrWait,
} from "@/lib/astro/dailyTransitEngine";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  assertDbError,
  assertOwnership,
  BlueprintServiceError,
  findNatalChart,
  isDevUnlockPreviewEnabled,
  resolveProfileContext,
  SupabaseAdminLike,
} from "@/lib/supabase/blueprintSession";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  DailyCommandCenterPayload,
  DailyMemoryTag,
  EntryHook,
  MoveAuditAction,
  MoveAuditResult,
  TextOrWaitIntent,
  TextOrWaitResult,
} from "@/lib/types/blueprint";

interface DailyCheckinDbRow {
  id: string;
  chart_id: string;
  blueprint_id: string;
  checkin_date: string;
  bandwidth_score: number;
  tone_status: "GREEN" | "YELLOW" | "RED";
  directive_id: string;
  directive_text: string;
  memory_tags: DailyMemoryTag[] | null;
  somatic_resets_completed: number;
}

export interface DailyAuthContext {
  chartId: string;
  email: string | null;
  entryHook: EntryHook | null;
}

function getLocalDateIso(utcDate: Date, tzOffsetHours: number): string {
  const shifted = new Date(utcDate.getTime() + tzOffsetHours * 3600000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth() + 1;
  const d = shifted.getUTCDate();
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${y}-${pad(m)}-${pad(d)}`;
}

function shiftDateIso(dateIso: string, deltaDays: number): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export async function extractRequestIdentity(
  req: NextRequest,
  bodySessionToken?: string | null
): Promise<{
  sessionToken: string | null;
  userId: string | null;
  userEmail: string | null;
}> {
  const sessionToken =
    bodySessionToken ??
    req.cookies.get("pb_session_token")?.value ??
    req.headers.get("x-session-token") ??
    req.nextUrl.searchParams.get("sessionToken") ??
    null;

  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
    userEmail = data.user?.email ?? null;
  } catch {
    // Anonymous or cookie-token session
  }

  return { sessionToken, userId, userEmail };
}

async function resolveUnlockedBlueprintContext(params: {
  chartIdOrToken: string;
  userId?: string | null;
  userEmail?: string | null;
  sessionToken?: string | null;
  admin: SupabaseAdminLike;
}) {
  const chart = await findNatalChart(params.chartIdOrToken, params.admin);
  if (!chart) {
    throw new BlueprintServiceError("Blueprint chart not found.", 404);
  }

  assertOwnership(chart, params.userId, params.sessionToken, params.userEmail);

  const { data: bp, error: bpErr } = await params.admin
    .from("blueprints")
    .select("id, chart_id, is_paid, email, entry_hook")
    .eq("chart_id", chart.id)
    .maybeSingle<{
      id: string;
      chart_id: string;
      is_paid: boolean;
      email: string | null;
      entry_hook: EntryHook | null;
    }>();

  if (bpErr) assertDbError(bpErr);
  if (!bp) {
    throw new BlueprintServiceError("Blueprint has not been synthesized yet.", 404);
  }

  const isUnlocked = Boolean(bp.is_paid) || isDevUnlockPreviewEnabled();
  if (!isUnlocked) {
    throw new BlueprintServiceError(
      "Daily Command Center requires an unlocked Blueprint.",
      403
    );
  }

  const profile = await resolveProfileContext(chart, undefined, params.admin);
  return { chart, bp, profile };
}

function resolveActiveTzOffset(
  tzOffsetHours: number | undefined,
  fallbackTz: number
): number {
  if (typeof tzOffsetHours === "number" && Number.isFinite(tzOffsetHours)) {
    return Math.max(-12, Math.min(14, tzOffsetHours));
  }
  return fallbackTz;
}

export async function getOrInitDailyCommandCenter(params: {
  chartIdOrToken: string;
  userId?: string | null;
  userEmail?: string | null;
  sessionToken?: string | null;
  tzOffsetHours?: number;
  referenceDate?: Date;
  admin?: SupabaseAdminLike;
}): Promise<{
  payload: DailyCommandCenterPayload;
  meta: DailyAuthContext;
}> {
  const admin = params.admin ?? getSupabaseAdminClient();
  const { chart, bp, profile } = await resolveUnlockedBlueprintContext({
    chartIdOrToken: params.chartIdOrToken,
    userId: params.userId,
    userEmail: params.userEmail,
    sessionToken: params.sessionToken,
    admin,
  });

  const activeTz = resolveActiveTzOffset(params.tzOffsetHours, chart.tz);
  const now = params.referenceDate ?? new Date();
  const todayIso = getLocalDateIso(now, activeTz);
  const lookbackIso = shiftDateIso(todayIso, -3);

  const { data: recentRows, error: recentErr } = await admin
    .from("daily_checkins")
    .select("*")
    .eq("chart_id", chart.id)
    .gte("checkin_date", lookbackIso)
    .limit(10);

  if (recentErr) assertDbError(recentErr);

  const rows = (recentRows ?? []) as DailyCheckinDbRow[];
  const todayRow = rows.find((r) => r.checkin_date === todayIso) ?? null;
  const excludedDirectiveIds = rows
    .filter((r) => r.checkin_date < todayIso)
    .map((r) => r.directive_id);

  const payload = buildDailyCommandCenterData({
    chartId: chart.id,
    normalizedChart: chart.normalized_chart_json,
    tzOffsetHours: activeTz,
    careerMode: profile.careerMode,
    relationshipStatus: profile.relationshipStatus,
    excludedDirectiveIds,
    existingDirective: todayRow
      ? { directiveId: todayRow.directive_id, text: todayRow.directive_text }
      : null,
    memoryTags: Array.isArray(todayRow?.memory_tags) ? todayRow.memory_tags : [],
    somaticResetsCompletedToday: todayRow?.somatic_resets_completed ?? 0,
    referenceDate: now,
  });

  if (!todayRow) {
    const { error: upsertErr } = await admin.from("daily_checkins").upsert(
      {
        chart_id: chart.id,
        blueprint_id: bp.id,
        checkin_date: payload.checkinDate,
        bandwidth_score: payload.bandwidthScore,
        tone_status: payload.toneStatus,
        directive_id: payload.dailyDirective.directiveId,
        directive_text: payload.dailyDirective.text,
        memory_tags: [],
        somatic_resets_completed: 0,
      },
      { onConflict: "chart_id,checkin_date" }
    );
    if (upsertErr) assertDbError(upsertErr);
  }

  return {
    payload,
    meta: {
      chartId: chart.id,
      email: bp.email ?? chart.email ?? null,
      entryHook: bp.entry_hook ?? null,
    },
  };
}

export async function toggleDailyMemoryTag(params: {
  chartIdOrToken: string;
  tag: DailyMemoryTag;
  userId?: string | null;
  userEmail?: string | null;
  sessionToken?: string | null;
  tzOffsetHours?: number;
  referenceDate?: Date;
  admin?: SupabaseAdminLike;
}): Promise<{
  checkinDate: string;
  memoryTags: DailyMemoryTag[];
  meta: DailyAuthContext;
}> {
  const admin = params.admin ?? getSupabaseAdminClient();
  const { payload, meta } = await getOrInitDailyCommandCenter({
    chartIdOrToken: params.chartIdOrToken,
    userId: params.userId,
    userEmail: params.userEmail,
    sessionToken: params.sessionToken,
    tzOffsetHours: params.tzOffsetHours,
    referenceDate: params.referenceDate,
    admin,
  });

  const existing = payload.memoryTags;
  const nextTags = existing.includes(params.tag)
    ? existing.filter((t) => t !== params.tag)
    : [...existing, params.tag];

  const { error: updateErr } = await admin
    .from("daily_checkins")
    .update({ memory_tags: nextTags })
    .eq("chart_id", meta.chartId)
    .eq("checkin_date", payload.checkinDate);

  if (updateErr) assertDbError(updateErr);

  return {
    checkinDate: payload.checkinDate,
    memoryTags: nextTags,
    meta,
  };
}

export async function recordSomaticResetCompletion(params: {
  chartIdOrToken: string;
  userId?: string | null;
  userEmail?: string | null;
  sessionToken?: string | null;
  tzOffsetHours?: number;
  referenceDate?: Date;
  admin?: SupabaseAdminLike;
}): Promise<{
  checkinDate: string;
  somaticResetsCompletedToday: number;
  meta: DailyAuthContext;
}> {
  const admin = params.admin ?? getSupabaseAdminClient();
  const { payload, meta } = await getOrInitDailyCommandCenter({
    chartIdOrToken: params.chartIdOrToken,
    userId: params.userId,
    userEmail: params.userEmail,
    sessionToken: params.sessionToken,
    tzOffsetHours: params.tzOffsetHours,
    referenceDate: params.referenceDate,
    admin,
  });

  const nextCount = payload.somaticResetsCompletedToday + 1;
  const { error: updateErr } = await admin
    .from("daily_checkins")
    .update({ somatic_resets_completed: nextCount })
    .eq("chart_id", meta.chartId)
    .eq("checkin_date", payload.checkinDate);

  if (updateErr) assertDbError(updateErr);

  return {
    checkinDate: payload.checkinDate,
    somaticResetsCompletedToday: nextCount,
    meta,
  };
}

export async function checkTextOrWaitAndLog(params: {
  chartIdOrToken: string;
  intent: TextOrWaitIntent;
  urgency?: "now" | "can_wait";
  userId?: string | null;
  userEmail?: string | null;
  sessionToken?: string | null;
  tzOffsetHours?: number;
  referenceDate?: Date;
  admin?: SupabaseAdminLike;
}): Promise<{ result: TextOrWaitResult; meta: DailyAuthContext }> {
  const admin = params.admin ?? getSupabaseAdminClient();
  const { chart, bp } = await resolveUnlockedBlueprintContext({
    chartIdOrToken: params.chartIdOrToken,
    userId: params.userId,
    userEmail: params.userEmail,
    sessionToken: params.sessionToken,
    admin,
  });

  const activeTz = resolveActiveTzOffset(params.tzOffsetHours, chart.tz);
  const result = evaluateTextOrWait({
    normalizedChart: chart.normalized_chart_json,
    tzOffsetHours: activeTz,
    intent: params.intent,
    urgency: params.urgency,
    referenceDate: params.referenceDate,
  });

  const { error: logErr } = await admin.from("decision_logs").insert({
    chart_id: chart.id,
    tool_type: "text_or_wait",
    input_context: {
      intent: params.intent,
      urgency: params.urgency ?? "now",
    },
    verdict: result.verdict,
  });
  if (logErr) assertDbError(logErr);

  return {
    result,
    meta: {
      chartId: chart.id,
      email: bp.email ?? chart.email ?? null,
      entryHook: bp.entry_hook ?? null,
    },
  };
}

export async function auditCalendarMoveAndLog(params: {
  chartIdOrToken: string;
  dateIso: string;
  action: MoveAuditAction;
  userId?: string | null;
  userEmail?: string | null;
  sessionToken?: string | null;
  tzOffsetHours?: number;
  referenceDate?: Date;
  admin?: SupabaseAdminLike;
}): Promise<{ result: MoveAuditResult; meta: DailyAuthContext }> {
  const admin = params.admin ?? getSupabaseAdminClient();
  const { chart, bp } = await resolveUnlockedBlueprintContext({
    chartIdOrToken: params.chartIdOrToken,
    userId: params.userId,
    userEmail: params.userEmail,
    sessionToken: params.sessionToken,
    admin,
  });

  const activeTz = resolveActiveTzOffset(params.tzOffsetHours, chart.tz);
  const calendar = buildSevenDayCalendar({
    normalizedChart: chart.normalized_chart_json,
    tzOffsetHours: activeTz,
    referenceDate: params.referenceDate,
  });
  const result = evaluateMoveAudit({
    calendar,
    dateIso: params.dateIso,
    action: params.action,
  });

  const { error: logErr } = await admin.from("decision_logs").insert({
    chart_id: chart.id,
    tool_type: "focus_vs_pitch_audit",
    input_context: {
      dateIso: params.dateIso,
      action: params.action,
    },
    verdict: result.verdict,
  });
  if (logErr) assertDbError(logErr);

  return {
    result,
    meta: {
      chartId: chart.id,
      email: bp.email ?? chart.email ?? null,
      entryHook: bp.entry_hook ?? null,
    },
  };
}
