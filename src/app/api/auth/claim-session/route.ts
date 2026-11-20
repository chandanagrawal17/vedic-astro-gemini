import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { claimSessionForUser } from "@/lib/supabase/chartSession";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ClaimSchema = z.object({
  sessionToken: z.string().trim().min(4).max(128).optional(),
  firstName: z.string().trim().min(1).max(80).optional(),
  relationshipStatus: z
    .enum(["single", "relationship", "married", "shifting"])
    .optional(),
  careerMode: z
    .enum(["employed", "founder", "freelance", "transition"])
    .optional(),
  careerField: z.string().max(120).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: "Authentication required to claim a chart session." },
        { status: 401 }
      );
    }

    const rawBody = await req.json().catch(() => ({}));
    const parsed = ClaimSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid claim payload.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const sessionToken =
      parsed.data.sessionToken ?? req.cookies.get("pb_session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Missing sessionToken to claim." },
        { status: 400 }
      );
    }

    const result = await claimSessionForUser({
      sessionToken,
      userId: user.id,
      firstName: parsed.data.firstName,
      relationshipStatus: parsed.data.relationshipStatus,
      careerMode: parsed.data.careerMode,
      careerField: parsed.data.careerField,
    });

    return NextResponse.json({
      ok: true,
      userId: user.id,
      sessionToken,
      chartId: result.chartId,
      blueprintId: result.blueprintId,
    });
  } catch (err) {
    console.error("[POST /api/auth/claim-session] Error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to claim chart session.",
      },
      { status: 500 }
    );
  }
}
