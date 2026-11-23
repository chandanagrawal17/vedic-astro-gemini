import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { LlmProviderError } from "@/lib/llm/geminiProvider";
import { enforceRateLimit } from "@/lib/rateLimit";
import {
  BlueprintServiceError,
  updateRelationshipStatusAndResynthesize,
} from "@/lib/supabase/blueprintSession";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const RelationshipStatusRequestSchema = z.object({
  relationshipStatus: z.enum([
    "single",
    "dating",
    "relationship",
    "married",
    "shifting",
  ]),
  sessionToken: z.string().trim().min(4).max(128).optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ chartId: string }> }
) {
  const rateLimited = enforceRateLimit(req, {
    namespace: "relationship_status_switch",
    limit: 15,
    windowMs: 60 * 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  try {
    const { chartId } = await context.params;
    if (!chartId || chartId === "demo-session") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = RelationshipStatusRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid relationship status payload.",
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
    let userEmail: string | null = null;
    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
      userEmail = data.user?.email ?? null;
    } catch {
      // Anonymous session
    }

    const result = await updateRelationshipStatusAndResynthesize({
      chartIdOrToken: chartId,
      relationshipStatus: parsed.data.relationshipStatus,
      userId,
      userEmail,
      sessionToken,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof LlmProviderError) {
      return NextResponse.json(
        { error: err.message, isTimeout: err.isTimeout },
        { status: err.statusCode }
      );
    }
    if (err instanceof BlueprintServiceError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }
    console.error(
      "[POST /api/blueprint/[chartId]/relationship-status] Error:",
      err
    );
    return NextResponse.json(
      { error: "Failed to update relationship status." },
      { status: 500 }
    );
  }
}
