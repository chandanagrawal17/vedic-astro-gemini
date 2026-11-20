import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { toUiPrecisionMode } from "@/lib/astro/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const FeedbackSchema = z.object({
  feedback: z.enum(["scarily_accurate", "partially_true", "not_quite"]),
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ sessionToken: string }> }
) {
  try {
    const { sessionToken } = await context.params;
    if (!sessionToken || sessionToken === "demo-session") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const cookieToken = req.cookies.get("pb_session_token")?.value;
    let userId: string | null = null;
    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    } catch {
      // Anonymous preview
    }

    const admin = getSupabaseAdminClient();
    const { data: chart, error: chartErr } = await admin
      .from("natal_charts")
      .select(
        "id, user_id, session_token, dob, tob, birth_window, precision_mode, birth_city, lat, lon, tz, moon_boundary_flag, normalized_chart_json, created_at"
      )
      .eq("session_token", sessionToken)
      .maybeSingle();

    if (chartErr || !chart) {
      return NextResponse.json({ error: "Chart not found" }, { status: 404 });
    }

    // Verify ownership: either matching cookie token or authenticated user_id
    const isOwner =
      (cookieToken && cookieToken === chart.session_token) ||
      (userId && chart.user_id === userId);
    if (!isOwner && chart.user_id !== null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: bp } = await admin
      .from("blueprints")
      .select("hook_proof_json, hard_reset_feedback, is_paid, unlock_tier")
      .eq("chart_id", chart.id)
      .maybeSingle();

    return NextResponse.json({
      sessionId: chart.session_token,
      chartId: chart.id,
      precisionMode: toUiPrecisionMode(chart.precision_mode),
      moonBoundaryFlag: chart.moon_boundary_flag,
      normalizedChart: chart.normalized_chart_json,
      freePayload: bp?.hook_proof_json ?? null,
      hardResetFeedback: bp?.hard_reset_feedback ?? null,
      isUnlocked: Boolean(bp?.is_paid),
      unlockTier: bp?.unlock_tier ?? null,
      input: {
        birthDate: chart.dob,
        birthCity: chart.birth_city,
        birthLat: chart.lat,
        birthLon: chart.lon,
        birthTz: chart.tz,
        precisionMode: toUiPrecisionMode(chart.precision_mode),
        birthTime: chart.tob,
        birthWindow: chart.birth_window,
      },
    });
  } catch (err) {
    console.error("[GET /api/charts/[sessionToken]] Error:", err);
    return NextResponse.json(
      { error: "Failed to load chart session" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ sessionToken: string }> }
) {
  try {
    const { sessionToken } = await context.params;
    const body = await req.json();
    const parsed = FeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid feedback" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    const { error } = await admin
      .from("blueprints")
      .update({ hard_reset_feedback: parsed.data.feedback })
      .eq("session_token", sessionToken);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/charts/[sessionToken]] Error:", err);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }
}
