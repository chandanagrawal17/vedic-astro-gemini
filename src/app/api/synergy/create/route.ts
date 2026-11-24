import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rateLimit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createSynergyInviteLink,
  SynergyServiceError,
} from "@/lib/supabase/synergySession";

const CreateSynergySchema = z.object({
  chartId: z.string().trim().min(4).max(128),
  relationshipContext: z
    .enum(["romantic", "close_friend", "creative_partner"])
    .optional()
    .default("romantic"),
  sessionToken: z.string().trim().min(4).max(128).optional(),
});

export async function POST(req: NextRequest) {
  const rateLimited = enforceRateLimit(req, {
    namespace: "synergy_create",
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  try {
    const rawBody = await req.json();
    const parsed = CreateSynergySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid Synergy invite request.",
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
      // Anonymous session authorized via pb_session_token
    }

    const result = await createSynergyInviteLink({
      chartIdOrToken: parsed.data.chartId,
      relationshipContext: parsed.data.relationshipContext,
      sessionToken,
      userId,
      userEmail,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof SynergyServiceError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }

    console.error("[POST /api/synergy/create] Error:", err);
    return NextResponse.json(
      { error: "Unable to create Synergy invite link." },
      { status: 500 }
    );
  }
}
