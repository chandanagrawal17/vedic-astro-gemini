import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logFunnelEvent } from "@/lib/funnel/events";
import { enforceRateLimit } from "@/lib/rateLimit";
import { BlueprintServiceError } from "@/lib/supabase/blueprintSession";
import {
  extractRequestIdentity,
  recordSomaticResetCompletion,
} from "@/lib/supabase/dailySession";

const SomaticResetBodySchema = z.object({
  sessionToken: z.string().trim().min(4).max(128).optional(),
  tzOffsetHours: z.coerce.number().finite().min(-12).max(14).optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ chartId: string }> }
) {
  const rateLimited = enforceRateLimit(req, {
    namespace: "daily_somatic_reset",
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  try {
    const { chartId } = await context.params;
    if (!chartId || chartId === "demo-session") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rawBody = await req.json().catch(() => ({}));
    const parsed = SomaticResetBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid somatic reset payload." },
        { status: 400 }
      );
    }

    const identity = await extractRequestIdentity(req, parsed.data.sessionToken);
    const { checkinDate, somaticResetsCompletedToday, meta } =
      await recordSomaticResetCompletion({
        chartIdOrToken: chartId,
        userId: identity.userId,
        userEmail: identity.userEmail,
        sessionToken: identity.sessionToken,
        tzOffsetHours: parsed.data.tzOffsetHours,
      });

    await logFunnelEvent({
      chartId: meta.chartId,
      email: meta.email,
      eventName: "somatic_reset_completed",
      entryHook: meta.entryHook,
      metadata: {
        checkin_date: checkinDate,
        completed_today: somaticResetsCompletedToday,
      },
    });

    return NextResponse.json(
      { ok: true, checkinDate, somaticResetsCompletedToday },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof BlueprintServiceError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }

    console.error("[POST /api/daily/[chartId]/somatic-reset] Error:", err);
    return NextResponse.json(
      { error: "Failed to log somatic reset." },
      { status: 500 }
    );
  }
}
