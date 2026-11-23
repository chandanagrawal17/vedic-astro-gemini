import { NextRequest, NextResponse } from "next/server";
import {
  BlueprintServiceError,
  getBlueprintById,
} from "@/lib/supabase/blueprintSession";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ chartId: string }> }
) {
  try {
    const { chartId } = await context.params;
    if (!chartId || chartId === "demo-session") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const sessionToken =
      req.cookies.get("pb_session_token")?.value ??
      req.headers.get("x-session-token") ??
      req.nextUrl.searchParams.get("sessionToken") ??
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

    const result = await getBlueprintById({
      chartIdOrToken: chartId,
      userId,
      userEmail,
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

    console.error("[GET /api/blueprint/[chartId]] Error:", err);
    return NextResponse.json(
      { error: "Failed to load Blueprint." },
      { status: 500 }
    );
  }
}
