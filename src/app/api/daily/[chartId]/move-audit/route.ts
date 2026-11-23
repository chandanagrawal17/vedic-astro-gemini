import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logFunnelEvent } from "@/lib/funnel/events";
import { enforceRateLimit } from "@/lib/rateLimit";
import { BlueprintServiceError } from "@/lib/supabase/blueprintSession";
import {
  auditCalendarMoveAndLog,
  extractRequestIdentity,
} from "@/lib/supabase/dailySession";

const MoveAuditBodySchema = z.object({
  dateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  action: z.enum(["pitch", "hard_talk", "deep_work", "sign_deal", "rest_reset"]),
  sessionToken: z.string().trim().min(4).max(128).optional(),
  tzOffsetHours: z.coerce.number().finite().min(-12).max(14).optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ chartId: string }> }
) {
  const rateLimited = enforceRateLimit(req, {
    namespace: "daily_move_audit",
    limit: 40,
    windowMs: 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  try {
    const { chartId } = await context.params;
    if (!chartId || chartId === "demo-session") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = MoveAuditBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid Move Audit request.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const identity = await extractRequestIdentity(req, parsed.data.sessionToken);
    const { result, meta } = await auditCalendarMoveAndLog({
      chartIdOrToken: chartId,
      dateIso: parsed.data.dateIso,
      action: parsed.data.action,
      userId: identity.userId,
      userEmail: identity.userEmail,
      sessionToken: identity.sessionToken,
      tzOffsetHours: parsed.data.tzOffsetHours,
    });

    await logFunnelEvent({
      chartId: meta.chartId,
      email: meta.email,
      eventName: "focus_calendar_audited",
      entryHook: meta.entryHook,
      metadata: {
        date_iso: result.dateIso,
        action: result.action,
        verdict: result.verdict,
      },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof BlueprintServiceError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }

    console.error("[POST /api/daily/[chartId]/move-audit] Error:", err);
    return NextResponse.json(
      { error: "Failed to audit calendar move." },
      { status: 500 }
    );
  }
}
