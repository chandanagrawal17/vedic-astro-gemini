import { NextRequest, NextResponse } from "next/server";
import {
  getSynergyInviteByToken,
  SynergyServiceError,
} from "@/lib/supabase/synergySession";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const result = await getSynergyInviteByToken(token);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof SynergyServiceError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      );
    }

    console.error("[GET /api/synergy/[token]] Error:", err);
    return NextResponse.json(
      { error: "Unable to load Synergy invite." },
      { status: 500 }
    );
  }
}
