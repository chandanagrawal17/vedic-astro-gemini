import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EntryHookSchema, logFunnelEvent } from "@/lib/funnel/events";
import { enforceRateLimit } from "@/lib/rateLimit";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server-authoritative events (chart_calculated, accuracy_rated, beta_unlocked,
// birth_time_upgraded) are logged directly inside their respective API routes.
const ClientFunnelEventNameSchema = z.enum([
  "landing_view",
  "onboarding_started",
  "proof_viewed",
  "clicked_locked_monthly_timeline",
  "clicked_locked_career_blueprint",
  "paywall_viewed",
  "paywall_cta_clicked",
  "brag_card_shared",
]);

const FunnelEventBodySchema = z.object({
  eventName: ClientFunnelEventNameSchema,
  chartId: z.string().trim().max(128).optional().nullable(),
  sessionToken: z.string().trim().max(128).optional().nullable(),
  email: z.string().trim().email().max(254).optional().nullable(),
  entryHook: EntryHookSchema.optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const rateLimited = enforceRateLimit(req, {
    namespace: "funnel_event",
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = FunnelEventBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid funnel event payload." },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdminClient();
    let resolvedChartId: string | null = null;
    let resolvedEmail: string | null = parsed.data.email ?? null;
    let resolvedEntryHook = parsed.data.entryHook ?? null;

    const candidateId = parsed.data.chartId;
    const candidateToken =
      parsed.data.sessionToken ??
      req.cookies.get("pb_session_token")?.value ??
      null;

    if (candidateId && UUID_REGEX.test(candidateId)) {
      resolvedChartId = candidateId;
    } else if (candidateToken && candidateToken !== "demo-session") {
      const { data: chart } = await admin
        .from("natal_charts")
        .select("id, email")
        .eq("session_token", candidateToken)
        .maybeSingle<{ id: string; email: string | null }>();
      if (chart) {
        resolvedChartId = chart.id;
        resolvedEmail = resolvedEmail ?? chart.email;
      }
    }

    if (resolvedChartId && (!resolvedEmail || !resolvedEntryHook)) {
      const { data: bp } = await admin
        .from("blueprints")
        .select("email, entry_hook")
        .eq("chart_id", resolvedChartId)
        .maybeSingle<{ email: string | null; entry_hook: string | null }>();
      if (bp) {
        resolvedEmail = resolvedEmail ?? bp.email;
        if (!resolvedEntryHook && bp.entry_hook) {
          const parsedHook = EntryHookSchema.safeParse(bp.entry_hook);
          if (parsedHook.success) {
            resolvedEntryHook = parsedHook.data;
          }
        }
      }
    }

    const result = await logFunnelEvent({
      chartId: resolvedChartId,
      email: resolvedEmail,
      eventName: parsed.data.eventName,
      entryHook: resolvedEntryHook,
      metadata: parsed.data.metadata ?? {},
      admin,
    });

    return NextResponse.json({ ok: true, logged: result.logged }, { status: 200 });
  } catch (err) {
    console.warn("[POST /api/funnel/event] Error:", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
