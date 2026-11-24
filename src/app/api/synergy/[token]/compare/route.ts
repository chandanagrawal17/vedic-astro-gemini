import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AstroProviderError } from "@/lib/astro/vedicAstroProvider";
import { enforceRateLimit } from "@/lib/rateLimit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  compareSynergyWithPartner,
  SynergyServiceError,
} from "@/lib/supabase/synergySession";

const ComparePartnerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .max(254)
    .optional()
    .or(z.literal("")),
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
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const rateLimited = enforceRateLimit(req, {
    namespace: "synergy_compare",
    limit: 12,
    windowMs: 60 * 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  try {
    const { token } = await context.params;
    const rawBody = await req.json();
    const parsed = ComparePartnerSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Please check the birth details and try again.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    let userId: string | null = null;
    let userEmail: string | null = null;
    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
      userEmail = data.user?.email ?? null;
    } catch {
      // Anonymous partner comparison
    }

    const result = await compareSynergyWithPartner({
      shareToken: token,
      firstName: parsed.data.firstName,
      email: parsed.data.email || null,
      birthDate: parsed.data.birthDate,
      birthCity: parsed.data.birthCity,
      birthLat: parsed.data.birthLat,
      birthLon: parsed.data.birthLon,
      birthTz: parsed.data.birthTz,
      precisionMode: parsed.data.precisionMode,
      birthTime: parsed.data.birthTime,
      birthWindow: parsed.data.birthWindow,
      userId,
      userEmail,
    });

    const response = NextResponse.json(result, { status: 200 });
    // Only set pb_session_token if Partner B persisted with email and caller has no existing session cookie
    if (
      result.persistedToDb &&
      result.partnerSessionToken &&
      !req.cookies.get("pb_session_token")?.value
    ) {
      response.cookies.set("pb_session_token", result.partnerSessionToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (err) {
    if (err instanceof SynergyServiceError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }
    if (err instanceof AstroProviderError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }

    console.error("[POST /api/synergy/[token]/compare] Error:", err);
    return NextResponse.json(
      { error: "Unable to calculate Synergy comparison right now." },
      { status: 500 }
    );
  }
}
