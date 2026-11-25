import { NextRequest, NextResponse } from "next/server";
import { getOrInitPersonalNature } from "@/lib/llm/personalNatureSchema";
import { enforceRateLimit } from "@/lib/rateLimit";
import { BlueprintServiceError } from "@/lib/supabase/blueprintSession";
import { extractRequestIdentity } from "@/lib/supabase/dailySession";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ chartId: string }> }
) {
  const rateLimited = enforceRateLimit(req, {
    namespace: "personal_nature_get",
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  try {
    const { chartId } = await context.params;
    if (!chartId || chartId === "demo-session") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const previewParam = req.nextUrl.searchParams.get("previewDay2");
    const previewDay2 = previewParam === "true" || previewParam === "1";

    const identity = await extractRequestIdentity(req);
    const response = await getOrInitPersonalNature({
      chartIdOrToken: chartId,
      userId: identity.userId,
      userEmail: identity.userEmail,
      sessionToken: identity.sessionToken,
      previewDay2,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    if (err instanceof BlueprintServiceError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }

    console.error("[GET /api/personal-nature/[chartId]] Error:", err);
    return NextResponse.json(
      { error: "Failed to load Personal Nature insights." },
      { status: 500 }
    );
  }
}
