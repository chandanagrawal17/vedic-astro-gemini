import { NextRequest, NextResponse } from "next/server";
import {
  PersonalNatureFeedbackRequestSchema,
  savePersonalNatureFeedback,
} from "@/lib/llm/personalNatureSchema";
import { enforceRateLimit } from "@/lib/rateLimit";
import { BlueprintServiceError } from "@/lib/supabase/blueprintSession";
import { extractRequestIdentity } from "@/lib/supabase/dailySession";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ chartId: string }> }
) {
  const rateLimited = enforceRateLimit(req, {
    namespace: "personal_nature_feedback",
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  try {
    const { chartId } = await context.params;
    if (!chartId || chartId === "demo-session") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = PersonalNatureFeedbackRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid feedback payload.",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const identity = await extractRequestIdentity(
      req,
      parsed.data.sessionToken ?? null
    );

    const result = await savePersonalNatureFeedback({
      chartIdOrToken: chartId,
      tellId: parsed.data.tellId,
      accuracyRating: parsed.data.accuracyRating,
      userReflection: parsed.data.userReflection,
      userId: identity.userId,
      userEmail: identity.userEmail,
      sessionToken: identity.sessionToken,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof BlueprintServiceError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }

    console.error("[POST /api/personal-nature/[chartId]/feedback] Error:", err);
    return NextResponse.json(
      { error: "Failed to save Personal Nature feedback." },
      { status: 500 }
    );
  }
}
