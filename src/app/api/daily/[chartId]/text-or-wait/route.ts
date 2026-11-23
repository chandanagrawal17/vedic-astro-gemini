import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logFunnelEvent } from "@/lib/funnel/events";
import { enforceRateLimit } from "@/lib/rateLimit";
import { BlueprintServiceError } from "@/lib/supabase/blueprintSession";
import {
  checkTextOrWaitAndLog,
  extractRequestIdentity,
} from "@/lib/supabase/dailySession";

const TextOrWaitBodySchema = z.object({
  intent: z.enum(["dating", "work", "conflict", "money"]),
  urgency: z.enum(["now", "can_wait"]).optional(),
  sessionToken: z.string().trim().min(4).max(128).optional(),
  tzOffsetHours: z.coerce.number().finite().min(-12).max(14).optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ chartId: string }> }
) {
  const rateLimited = enforceRateLimit(req, {
    namespace: "daily_text_or_wait",
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
    const parsed = TextOrWaitBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid Text or Wait request.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const identity = await extractRequestIdentity(req, parsed.data.sessionToken);
    const { result, meta } = await checkTextOrWaitAndLog({
      chartIdOrToken: chartId,
      intent: parsed.data.intent,
      urgency: parsed.data.urgency,
      userId: identity.userId,
      userEmail: identity.userEmail,
      sessionToken: identity.sessionToken,
      tzOffsetHours: parsed.data.tzOffsetHours,
    });

    await logFunnelEvent({
      chartId: meta.chartId,
      email: meta.email,
      eventName: "text_or_wait_checked",
      entryHook: meta.entryHook,
      metadata: {
        intent: result.intent,
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

    console.error("[POST /api/daily/[chartId]/text-or-wait] Error:", err);
    return NextResponse.json(
      { error: "Failed to run Text or Wait filter." },
      { status: 500 }
    );
  }
}
