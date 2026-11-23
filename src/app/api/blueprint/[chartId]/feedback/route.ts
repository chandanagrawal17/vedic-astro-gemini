import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  BlueprintServiceError,
  saveBlueprintFeedback,
} from "@/lib/supabase/blueprintSession";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const FeedbackBodySchema = z.object({
  feedback: z.enum(["scarily_accurate", "close", "off"]),
  sessionToken: z.string().trim().min(4).max(128).optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ chartId: string }> }
) {
  try {
    const { chartId } = await context.params;
    if (!chartId || chartId === "demo-session") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rawBody = await req.json();
    const parsed = FeedbackBodySchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid feedback value. Expected scarily_accurate, close, or off.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const sessionToken =
      parsed.data.sessionToken ??
      req.cookies.get("pb_session_token")?.value ??
      req.headers.get("x-session-token") ??
      null;

    let userId: string | null = null;
    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    } catch {
      // Anonymous session
    }

    const result = await saveBlueprintFeedback({
      chartIdOrToken: chartId,
      feedback: parsed.data.feedback,
      userId,
      sessionToken,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof BlueprintServiceError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }

    console.error("[POST /api/blueprint/[chartId]/feedback] Error:", err);
    return NextResponse.json(
      { error: "Failed to save accuracy feedback." },
      { status: 500 }
    );
  }
}
