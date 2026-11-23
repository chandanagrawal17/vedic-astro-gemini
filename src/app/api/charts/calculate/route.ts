import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AstroProviderError } from "@/lib/astro/vedicAstroProvider";
import { ExistingPaidAccountError } from "@/lib/cache/blueprintCache";
import { calculateAndPersistChart } from "@/lib/supabase/chartSession";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const CalculateChartSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address.").max(254),
  firstName: z.string().trim().min(1).max(80),
  birthDate: z.string().trim().min(8).max(20),
  birthCity: z.string().trim().min(1).max(160),
  birthLat: z.coerce.number().min(-90).max(90),
  birthLon: z.coerce.number().min(-180).max(180),
  birthTz: z.coerce.number().min(-12).max(14),
  precisionMode: z.enum([
    "exact",
    "window",
    "dob_only",
    "approx_window",
    "date_only",
  ]),
  birthTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional()
    .default(null),
  birthWindow: z
    .enum(["morning", "afternoon", "evening", "late_night"])
    .nullable()
    .optional()
    .default(null),
  relationshipStatus: z
    .enum(["single", "relationship", "married", "shifting"])
    .optional()
    .default("single"),
  careerMode: z
    .enum(["employed", "founder", "freelance", "transition"])
    .optional()
    .default("employed"),
  careerField: z.string().max(120).optional().default(""),
  sessionToken: z.string().trim().min(4).max(128).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsed = CalculateChartSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid chart calculation inputs.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const cookieToken = req.cookies.get("pb_session_token")?.value;
    const sessionToken = parsed.data.sessionToken ?? cookieToken;

    let userId: string | null = null;
    let userEmail: string | null = null;
    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
      userEmail = data.user?.email ?? null;
    } catch {
      // Anonymous onboarding session
    }

    const result = await calculateAndPersistChart({
      ...parsed.data,
      sessionToken,
      userId,
      userEmail,
    });

    const response = NextResponse.json(result, { status: 200 });
    response.cookies.set("pb_session_token", result.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (err) {
    if (err instanceof ExistingPaidAccountError) {
      return NextResponse.json(
        {
          status: err.status,
          message: err.message,
        },
        { status: err.statusCode }
      );
    }

    if (err instanceof AstroProviderError) {
      return NextResponse.json(
        {
          error: err.message,
          isTimeout: err.isTimeout,
        },
        { status: err.statusCode }
      );
    }

    console.error("[POST /api/charts/calculate] Error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Unexpected error calculating chart.",
      },
      { status: 500 }
    );
  }
}
