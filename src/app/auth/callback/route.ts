import { NextRequest, NextResponse } from "next/server";
import { claimSessionForUser } from "@/lib/supabase/chartSession";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") || "/blueprint";
  let nextPath = rawNext.startsWith("/") ? rawNext : "/blueprint";
  const querySessionToken = searchParams.get("session_token");
  const cookieSessionToken = req.cookies.get("pb_session_token")?.value;
  const rawSessionToken = querySessionToken || cookieSessionToken;
  const sessionToken =
    rawSessionToken && rawSessionToken !== "demo-session"
      ? rawSessionToken
      : null;

  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data.user && (sessionToken || data.user.email)) {
        const claimed = await claimSessionForUser({
          sessionToken,
          userId: data.user.id,
          userEmail: data.user.email ?? null,
        }).catch((err) => {
          console.warn("[/auth/callback] Failed to claim session:", err);
          return null;
        });

        if (
          claimed?.sessionToken &&
          nextPath === "/blueprint" &&
          !nextPath.includes("session=")
        ) {
          nextPath = `/blueprint?session=${encodeURIComponent(claimed.sessionToken)}`;
        }
      }
    } catch (err) {
      console.error("[/auth/callback] Code exchange error:", err);
    }
  }

  return NextResponse.redirect(`${origin}${nextPath}`);
}
