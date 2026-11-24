import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { performBetaUnlock } from "@/lib/payments/betaUnlockService";
import { enforceRateLimit } from "@/lib/rateLimit";
import { BlueprintServiceError } from "@/lib/supabase/blueprintSession";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BetaUnlockBodySchema = z.object({
  sessionToken: z.string().trim().min(4).max(128).optional(),
  email: z.string().trim().email().max(254).optional(),
  inviteCode: z.string().trim().max(64).optional(),
  unlockTier: z.enum(["one_time_19", "annual_39"]).optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ chartId: string }> }
) {
  const rateLimited = enforceRateLimit(req, {
    namespace: "beta_unlock",
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  try {
    const { chartId } = await context.params;
    if (!chartId || chartId === "demo-session") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rawBody = await req.json().catch(() => ({}));
    const parsed = BetaUnlockBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid beta unlock request payload.",
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
      // Non-inbox-blocked beta flow supports sessionToken + email
    }

    const result = await performBetaUnlock({
      chartIdOrToken: chartId,
      sessionToken,
      email: parsed.data.email,
      inviteCode: parsed.data.inviteCode,
      unlockTier: parsed.data.unlockTier,
      userId,
      userEmail,
      origin: req.nextUrl.origin,
    });

    const response = NextResponse.json(result, { status: 200 });
    response.cookies.set("pb_session_token", result.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (err) {
    if (err instanceof BlueprintServiceError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }

    console.error("[POST /api/blueprint/[chartId]/beta-unlock] Error:", err);
    return NextResponse.json(
      { error: "Unable to complete beta unlock right now." },
      { status: 500 }
    );
  }
}
