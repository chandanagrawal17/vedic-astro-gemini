import { readCleanEnv } from "@/lib/env";

export type EmailMode = "sandbox" | "live";

export interface BlueprintEmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  resumeUrl?: string;
}

export interface SendEmailResult {
  sent: boolean;
  skipped: boolean;
  reason?: "sandbox_mode" | "missing_api_key" | "send_failed";
  id?: string;
  error?: string;
}

export function getEmailMode(): EmailMode {
  const mode = readCleanEnv("EMAIL_MODE").toLowerCase();
  return mode === "live" ? "live" : "sandbox";
}

export function getSandboxRecipient(): string | null {
  const raw = readCleanEnv("EMAIL_SANDBOX_RECIPIENT").toLowerCase();
  return raw.length > 0 ? raw : null;
}

export function buildBlueprintUnlockedEmail(params: {
  firstName: string;
  email: string;
  resumeUrl: string;
}): BlueprintEmailPayload {
  const safeName = params.firstName.trim() || "Friend";
  const subject = `${safeName}, your Personal Blueprint is unlocked`;

  const text = [
    `Hi ${safeName},`,
    "",
    "Your full 5-module Personal Blueprint is now unlocked.",
    "Open your Blueprint anytime with your private link:",
    params.resumeUrl,
    "",
    "Know your patterns. Own your life.",
    "— Personal Blueprint",
  ].join("\n");

  const html = `
  <div style="background:#0D0907;color:#FDF6EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:32px 20px;">
    <div style="max-width:460px;margin:0 auto;background:#16100C;border:1px solid rgba(245,166,91,0.22);border-radius:20px;padding:28px;">
      <p style="margin:0;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#F5A65B;font-weight:600;">
        Personal Blueprint
      </p>
      <h1 style="margin:12px 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:600;color:#FDF6EE;line-height:1.2;">
        ${safeName}, your full Blueprint is unlocked.
      </h1>
      <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#B8A99E;">
        All 5 modules—including your Hard Reset deep breakdown, Era 3 playbook, Career audit, Relationship mirror, and Self-Sabotage antidote—are ready.
      </p>
      <a href="${params.resumeUrl}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:linear-gradient(135deg,#FF7E42,#F5A65B);color:#0D0907;font-size:14px;font-weight:700;text-decoration:none;">
        Open My Blueprint
      </a>
      <p style="margin:24px 0 0;font-size:11px;color:#7C6E65;line-height:1.5;">
        Know your patterns. Own your life. · Private self-reflection only.
      </p>
    </div>
  </div>`.trim();

  return {
    to: params.email.trim().toLowerCase(),
    subject,
    html,
    text,
    resumeUrl: params.resumeUrl,
  };
}

export async function sendBlueprintEmail(
  payload: BlueprintEmailPayload,
  options?: { fetchFn?: typeof fetch }
): Promise<SendEmailResult> {
  const normalizedTo = payload.to.trim().toLowerCase();
  const mode = getEmailMode();
  const sandboxRecipient = getSandboxRecipient();

  if (mode === "sandbox") {
    if (!sandboxRecipient || normalizedTo !== sandboxRecipient) {
      console.info("[Resend Sandbox] Skipped external send", {
        to: normalizedTo,
        subject: payload.subject,
        resumeUrl: payload.resumeUrl ?? null,
      });
      return {
        sent: false,
        skipped: true,
        reason: "sandbox_mode",
      };
    }
  }

  const apiKey = readCleanEnv("RESEND_API_KEY");
  if (!apiKey) {
    console.info("[Resend] RESEND_API_KEY not configured; skipping send", {
      to: normalizedTo,
      subject: payload.subject,
      resumeUrl: payload.resumeUrl ?? null,
    });
    return {
      sent: false,
      skipped: true,
      reason: "missing_api_key",
    };
  }

  const fromAddress =
    readCleanEnv("EMAIL_FROM") || "Personal Blueprint <onboarding@resend.dev>";
  const doFetch = options?.fetchFn ?? fetch;

  try {
    const res = await doFetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [normalizedTo],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn("[Resend] Send returned non-2xx:", res.status, errText);
      return {
        sent: false,
        skipped: false,
        reason: "send_failed",
        error: `HTTP ${res.status}`,
      };
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return {
      sent: true,
      skipped: false,
      id: data.id,
    };
  } catch (err) {
    console.warn("[Resend] Network error (non-blocking):", err);
    return {
      sent: false,
      skipped: false,
      reason: "send_failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
