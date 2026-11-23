import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { LlmProviderError } from "@/lib/llm/geminiProvider";
import {
  BlueprintServiceError,
  synthesizeAndPersistBlueprint,
} from "@/lib/supabase/blueprintSession";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SynthesizeRequestSchema = z.object({
  chartId: z.string().trim().min(4).max(128),
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
    const rawBody = await req.json();
    const parsed = SynthesizeRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid synthesis request payload.",
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
    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    } catch {
      // Anonymous session
    }

    const result = await synthesizeAndPersistBlueprint({
      chartId: parsed.data.chartId,
      sessionToken,
      userId,
      profileOverride: {
        firstName: parsed.data.firstName,
        relationshipStatus: parsed.data.relationshipStatus,
        careerMode: parsed.data.careerMode,
        careerField: parsed.data.careerField,
      },
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
    if (err instanceof LlmProviderError) {
      return NextResponse.json(
        {
          error: err.message,
          isTimeout: err.isTimeout,
        },
        { status: err.statusCode }
      );
    }

    if (err instanceof BlueprintServiceError) {
      return NextResponse.json(
        {
          error: err.message,
        },
        { status: err.statusCode }
      );
    }

    console.error("[POST /api/blueprint/synthesize] Error:", err);
    return NextResponse.json(
      {
        error: "Unexpected error synthesizing Blueprint.",
      },
      { status: 500 }
    );
  }
}
