import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeEmail,
  normalizeOptionalEmail,
} from "@/lib/cache/blueprintCache";
import {
  buildBlueprintUnlockedEmail,
  sendBlueprintEmail,
  SendEmailResult,
} from "@/lib/email/resend";
import { logFunnelEvent } from "@/lib/funnel/events";
import {
  getBetaUnlockMode,
  getPaymentProvider,
  verifyBetaInviteCode,
} from "@/lib/payments/provider";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { BlueprintServiceError } from "@/lib/supabase/blueprintSession";
import { EntryHook, UnlockSource } from "@/lib/types/blueprint";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PerformBetaUnlockParams {
  chartIdOrToken: string;
  sessionToken?: string | null;
  email?: string | null;
  inviteCode?: string | null;
  unlockTier?: "one_time_19" | "annual_39";
  userId?: string | null;
  userEmail?: string | null;
  origin?: string;
  admin?: Pick<SupabaseClient, "from">;
  emailFetchFn?: typeof fetch;
}

export interface PerformBetaUnlockResult {
  unlocked: true;
  unlockSource: UnlockSource;
  unlockedAt: string;
  chartId: string;
  sessionToken: string;
  emailResult: SendEmailResult | { sent: false; skipped: true; reason: string };
}

export async function performBetaUnlock(
  params: PerformBetaUnlockParams
): Promise<PerformBetaUnlockResult> {
  const admin = params.admin ?? getSupabaseAdminClient();
  const column = UUID_REGEX.test(params.chartIdOrToken) ? "id" : "session_token";

  const { data: chart, error: chartErr } = await admin
    .from("natal_charts")
    .select("id, user_id, session_token, email, first_name")
    .eq(column, params.chartIdOrToken)
    .maybeSingle<{
      id: string;
      user_id: string | null;
      session_token: string;
      email: string | null;
      first_name: string | null;
    }>();

  if (chartErr) {
    throw new BlueprintServiceError(
      chartErr.message || "Failed to look up chart.",
      500
    );
  }
  if (!chart) {
    throw new BlueprintServiceError("Blueprint chart not found.", 404);
  }

  const { data: bp, error: bpErr } = await admin
    .from("blueprints")
    .select("id, user_id, email, is_paid, unlocked_email_sent_at, entry_hook")
    .eq("chart_id", chart.id)
    .maybeSingle<{
      id: string;
      user_id: string | null;
      email: string | null;
      is_paid: boolean;
      unlocked_email_sent_at: string | null;
      entry_hook: EntryHook | null;
    }>();

  if (bpErr) {
    throw new BlueprintServiceError(
      bpErr.message || "Failed to look up Blueprint.",
      500
    );
  }
  if (!bp) {
    throw new BlueprintServiceError("Blueprint not found for this chart.", 404);
  }

  const recordEmail = normalizeOptionalEmail(chart.email ?? bp.email);
  const suppliedEmail = normalizeOptionalEmail(params.email);
  const authEmail = normalizeOptionalEmail(params.userEmail);

  const authorizedByAuthSession =
    Boolean(
      params.userId &&
        (chart.user_id === params.userId || bp.user_id === params.userId)
    ) || Boolean(authEmail && recordEmail && authEmail === recordEmail);

  const tokenMatches = Boolean(
    params.sessionToken && params.sessionToken === chart.session_token
  );
  const emailMatches = recordEmail
    ? Boolean(suppliedEmail && suppliedEmail === recordEmail)
    : true;
  const authorizedByOnboardingToken = tokenMatches && emailMatches;

  if (!authorizedByAuthSession && !authorizedByOnboardingToken) {
    throw new BlueprintServiceError(
      "Unauthorized: matching session token and email or signed-in session required.",
      403
    );
  }

  const mode = getBetaUnlockMode();
  let source: UnlockSource = "beta_free";
  if (mode === "code_required") {
    if (!verifyBetaInviteCode(params.inviteCode)) {
      throw new BlueprintServiceError(
        "Invalid beta invite code. Please check your invite code and try again.",
        403
      );
    }
    source = "beta_code";
  }

  const paymentProvider = getPaymentProvider(admin);
  const unlockResult = await paymentProvider.unlockBlueprint(chart.id, source, {
    unlockTier: params.unlockTier ?? "one_time_19",
  });

  const recipientEmail = recordEmail ?? suppliedEmail ?? authEmail;

  if (!unlockResult.alreadyUnlocked) {
    await logFunnelEvent({
      chartId: chart.id,
      email: recipientEmail,
      eventName: "beta_unlocked",
      entryHook: bp.entry_hook,
      metadata: {
        unlock_source: unlockResult.unlockSource,
        unlock_tier: params.unlockTier ?? "one_time_19",
      },
      admin,
    });
  }

  let emailResult:
    | SendEmailResult
    | { sent: false; skipped: true; reason: string } = {
    sent: false,
    skipped: true,
    reason: bp.unlocked_email_sent_at ? "already_sent" : "no_recipient_email",
  };

  if (!bp.unlocked_email_sent_at && recipientEmail) {
    const baseOrigin = params.origin || "http://localhost:3000";
    const resumeUrl = `${baseOrigin}/blueprint?session=${encodeURIComponent(
      chart.session_token
    )}`;
    const emailPayload = buildBlueprintUnlockedEmail({
      firstName: chart.first_name || "Friend",
      email: normalizeEmail(recipientEmail),
      resumeUrl,
    });
    emailResult = await sendBlueprintEmail(emailPayload, {
      fetchFn: params.emailFetchFn,
    });

    if (emailResult.sent) {
      await admin
        .from("blueprints")
        .update({ unlocked_email_sent_at: new Date().toISOString() })
        .eq("id", bp.id);
    }
  }

  return {
    unlocked: true,
    unlockSource: unlockResult.unlockSource,
    unlockedAt: unlockResult.unlockedAt,
    chartId: chart.id,
    sessionToken: chart.session_token,
    emailResult,
  };
}
