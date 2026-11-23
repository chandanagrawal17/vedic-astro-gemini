import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logFunnelEvent } from "@/lib/funnel/events";
import { enforceRateLimit } from "@/lib/rateLimit";
import { BlueprintServiceError } from "@/lib/supabase/blueprintSession";
import {
  extractRequestIdentity,
  getOrInitDailyCommandCenter,
} from "@/lib/supabase/dailySession";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ chartId: string }> }
) {
  const rateLimited = enforceRateLimit(req, {
    namespace: "daily_command_get",
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  try {
    const { chartId } = await context.params;
    if (!chartId || chartId === "demo-session") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rawTz = req.nextUrl.searchParams.get("tzOffsetHours");
    let tzOffsetHours: number | undefined;
    if (rawTz !== null && rawTz.trim() !== "") {
      const parsedTz = z.coerce
        .number()
        .finite()
        .min(-12)
        .max(14)
        .safeParse(rawTz);
      if (!parsedTz.success) {
        return NextResponse.json(
          { error: "Invalid tzOffsetHours parameter" },
          { status: 400 }
        );
      }
      tzOffsetHours = parsedTz.data;
    }

    const identity = await extractRequestIdentity(req);
    const { payload, meta } = await getOrInitDailyCommandCenter({
      chartIdOrToken: chartId,
      userId: identity.userId,
      userEmail: identity.userEmail,
      sessionToken: identity.sessionToken,
      tzOffsetHours,
    });

    await logFunnelEvent({
      chartId: meta.chartId,
      email: meta.email,
      eventName: "daily_command_viewed",
      entryHook: meta.entryHook,
      metadata: {
        checkin_date: payload.checkinDate,
        bandwidth_score: payload.bandwidthScore,
        tone_status: payload.toneStatus,
      },
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    if (err instanceof BlueprintServiceError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }

    console.error("[GET /api/daily/[chartId]] Error:", err);
    return NextResponse.json(
      { error: "Failed to load Daily Command Center." },
      { status: 500 }
    );
  }
}
