import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logFunnelEvent } from "@/lib/funnel/events";
import { enforceRateLimit } from "@/lib/rateLimit";
import { BlueprintServiceError } from "@/lib/supabase/blueprintSession";
import {
  extractRequestIdentity,
  toggleDailyMemoryTag,
} from "@/lib/supabase/dailySession";

const MemoryTagBodySchema = z.object({
  tag: z.enum(["hit_home", "helped_pause", "took_action", "felt_off"]),
  sessionToken: z.string().trim().min(4).max(128).optional(),
  tzOffsetHours: z.coerce.number().finite().min(-12).max(14).optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ chartId: string }> }
) {
  const rateLimited = enforceRateLimit(req, {
    namespace: "daily_memory_tag",
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  try {
    const { chartId } = await context.params;
    if (!chartId || chartId === "demo-session") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = MemoryTagBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid memory tag payload.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const identity = await extractRequestIdentity(req, parsed.data.sessionToken);
    const { checkinDate, memoryTags, meta } = await toggleDailyMemoryTag({
      chartIdOrToken: chartId,
      tag: parsed.data.tag,
      userId: identity.userId,
      userEmail: identity.userEmail,
      sessionToken: identity.sessionToken,
      tzOffsetHours: parsed.data.tzOffsetHours,
    });

    await logFunnelEvent({
      chartId: meta.chartId,
      email: meta.email,
      eventName: "daily_memory_tagged",
      entryHook: meta.entryHook,
      metadata: {
        checkin_date: checkinDate,
        tag: parsed.data.tag,
        active_tags: memoryTags,
      },
    });

    return NextResponse.json(
      { ok: true, checkinDate, memoryTags },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof BlueprintServiceError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }

    console.error("[POST /api/daily/[chartId]/memory-tag] Error:", err);
    return NextResponse.json(
      { error: "Failed to save memory tag." },
      { status: 500 }
    );
  }
}
