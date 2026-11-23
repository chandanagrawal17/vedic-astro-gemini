"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  KeyRound,
  Lock,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { SolarShell } from "@/components/ui/SolarShell";
import { ObsidianCard } from "@/components/ui/ObsidianCard";
import { BetaUnlockMode } from "@/lib/payments/provider";
import { trackFunnelEvent } from "@/lib/store/attributionStore";
import {
  loadSession,
  loadStoredSession,
  saveSynthesizedSession,
  unlockSession,
} from "@/lib/store/sessionStore";
import { DEFAULT_ONBOARDING_INPUT } from "@/lib/mock/blueprintMock";
import {
  BlueprintFreePayload,
  BlueprintPaidPayload,
  BlueprintSession,
  EntryHook,
  HardResetFeedback,
  OnboardingInput,
  UnlockSource,
} from "@/lib/types/blueprint";

const REPORT_CHECKLIST = [
  "Tight 1-to-3-Month Hard Reset Timeline — exact peak pressure months across your last 10+ years + your exact upcoming prep months",
  "Full Career Guide — 3-path fit scores (9–5 vs. Solo vs. Side Build), field audit, hidden alternative lanes & next 12 months",
  "Relationship Alignment, Silent Friction Pattern & 2 Practical Communication Shifts",
  "Self-Sabotage Trigger Map & 3-Step Grounded Antidote",
  "Era 3 Current Playbook & Era 4 Preview",
];

interface UnlockPaywallClientProps {
  betaUnlockMode: BetaUnlockMode;
}

export function UnlockPaywallClient({
  betaUnlockMode,
}: UnlockPaywallClientProps) {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<BlueprintSession | null>(null);
  const [selectedTier, setSelectedTier] = useState<"one_time_19" | "annual_39">(
    "one_time_19"
  );
  const [betaModalOpen, setBetaModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    const sid = params?.sessionId;
    if (!sid || sid === "demo-session") {
      setSession(loadSession("demo-session"));
      return;
    }

    const stored = loadStoredSession(sid);
    if (stored && stored.input?.email) {
      setSession(stored);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const resolvedToken =
          stored?.sessionToken || (sid.startsWith("pb_") ? sid : null);
        const res = await fetch(
          `/api/blueprint/${encodeURIComponent(sid)}`,
          resolvedToken
            ? { headers: { "x-session-token": resolvedToken } }
            : undefined
        );
        if (res.ok && !cancelled) {
          const data = (await res.json()) as {
            chartId: string;
            sessionId: string;
            sessionToken: string;
            moonBoundaryFlag?: boolean;
            modelVersion?: string | null;
            isUnlocked?: boolean;
            unlockTier?: "one_time_19" | "annual_39" | null;
            unlockSource?: UnlockSource | null;
            unlockedAt?: string | null;
            entryHook?: EntryHook | null;
            utmSource?: string | null;
            accuracyFeedback?: HardResetFeedback | null;
            hook_proof_json: BlueprintFreePayload;
            full_blueprint_json: BlueprintPaidPayload | null;
            input?: OnboardingInput;
          };
          const hydrated = saveSynthesizedSession(
            data.input ?? DEFAULT_ONBOARDING_INPUT,
            {
              chartId: data.chartId,
              sessionId: data.sessionId,
              sessionToken: data.sessionToken,
              freePayload: data.hook_proof_json,
              paidPayload: data.full_blueprint_json,
              isUnlocked: data.isUnlocked,
              unlockTier: data.unlockTier,
              unlockSource: data.unlockSource,
              unlockedAt: data.unlockedAt,
              entryHook: data.entryHook,
              utmSource: data.utmSource,
              moonBoundaryFlag: data.moonBoundaryFlag,
              hardResetFeedback: data.accuracyFeedback,
              modelVersion: data.modelVersion,
            }
          );
          setSession(hydrated);
          return;
        }
      } catch {
        // Fallback below
      }
      if (!cancelled) {
        setSession(loadSession(sid));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params?.sessionId]);

  useEffect(() => {
    if (!session) return;
    trackFunnelEvent({
      eventName: "paywall_viewed",
      chartId: session.chartId,
      sessionToken: session.sessionToken ?? session.sessionId,
      email: session.input.email,
      entryHook: session.entryHook ?? session.input.entryHook ?? null,
      dedupeKey: `paywall_viewed_${session.chartId ?? session.sessionId}`,
    });
  }, [session]);

  const handlePaywallCtaClick = () => {
    setClaimError(null);
    trackFunnelEvent({
      eventName: "paywall_cta_clicked",
      chartId: session?.chartId,
      sessionToken: session?.sessionToken ?? session?.sessionId,
      email: session?.input.email,
      entryHook: session?.entryHook ?? session?.input.entryHook ?? null,
      dedupeKey: `paywall_cta_${session?.chartId ?? session?.sessionId ?? "demo"}`,
      metadata: {
        selected_tier: selectedTier,
        price_shown: selectedTier === "one_time_19" ? 19 : 39,
      },
    });
    setBetaModalOpen(true);
  };

  const handleClaimBetaUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setClaimError(null);

    const targetId =
      session?.chartId || session?.sessionId || params?.sessionId || "";

    if (!targetId || targetId === "demo-session") {
      unlockSession(selectedTier);
      router.push("/blueprint");
      return;
    }

    if (betaUnlockMode === "code_required" && !inviteCode.trim()) {
      setClaimError("Please enter your beta invite code.");
      return;
    }

    setClaiming(true);
    try {
      const res = await fetch(
        `/api/blueprint/${encodeURIComponent(targetId)}/beta-unlock`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionToken: session?.sessionToken ?? session?.sessionId,
            email: session?.input.email || undefined,
            inviteCode:
              betaUnlockMode === "code_required" ? inviteCode.trim() : undefined,
            unlockTier: selectedTier,
          }),
        }
      );

      const data = (await res.json().catch(() => ({}))) as {
        unlocked?: boolean;
        unlockSource?: UnlockSource;
        unlockedAt?: string;
        sessionToken?: string;
        error?: string;
      };

      if (!res.ok || !data.unlocked) {
        throw new Error(
          data.error || "Unable to complete beta unlock right now."
        );
      }

      if (session) {
        saveSynthesizedSession(session.input, {
          chartId: session.chartId ?? targetId,
          sessionId: session.sessionId,
          sessionToken:
            data.sessionToken ?? session.sessionToken ?? session.sessionId,
          freePayload: session.freePayload,
          paidPayload: session.paidPayload,
          isUnlocked: true,
          unlockTier: selectedTier,
          unlockSource: data.unlockSource ?? "beta_free",
          unlockedAt: data.unlockedAt ?? new Date().toISOString(),
        });
      }

      router.push(
        `/blueprint?session=${encodeURIComponent(
          data.sessionToken ?? session?.sessionId ?? targetId
        )}`
      );
    } catch (err) {
      setClaimError(
        err instanceof Error
          ? err.message
          : "Unable to complete beta unlock right now."
      );
    } finally {
      setClaiming(false);
    }
  };

  const firstName = session?.input.firstName || "Your";

  return (
    <SolarShell>
      <div className="flex-1 px-5 pt-6 pb-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-[13px] text-[#B8A99E] hover:text-[#FDF6EE] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Preview</span>
        </button>

        <div className="mt-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF6B2B]/15 border border-[#FF6B2B]/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
            <Sparkles className="h-3 w-3" />
            <span>{firstName}&rsquo;s Blueprint Ready</span>
          </span>

          <h1 className="mt-3 font-serif text-[30px] leading-[1.15] text-[#FDF6EE]">
            Your 5 Personalized Reports Ready
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[#B8A99E]">
            Unlock every module, your complete Current Era Playbook, and private
            reflection notes.
          </p>
        </div>

        {/* Personalized Checklist */}
        <ObsidianCard className="mt-5">
          <ul className="space-y-3">
            {REPORT_CHECKLIST.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FF6B2B]/20 text-[#F5A65B]">
                  <Check className="h-3 w-3 stroke-[2.5]" />
                </div>
                <span className="text-[13px] leading-snug text-[#D9CEC5]">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </ObsidianCard>

        {/* Pricing Cards */}
        <div className="mt-5 space-y-3">
          {/* $19 One-Time Unlock */}
          <button
            type="button"
            onClick={() => setSelectedTier("one_time_19")}
            className={`relative w-full rounded-[22px] border p-5 text-left transition ${
              selectedTier === "one_time_19"
                ? "border-[#FF6B2B] bg-[#24150D]/90 shadow-[0_0_28px_rgba(255,107,43,0.22)]"
                : "border-[#F5A65B]/20 bg-[#1C130E]/70"
            }`}
          >
            <span className="absolute -top-2.5 right-5 rounded-full bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#0D0907]">
              Most Popular
            </span>

            <div className="flex items-baseline justify-between">
              <div>
                <h2 className="font-serif text-[22px] text-[#FDF6EE]">
                  Full Blueprint Unlock
                </h2>
                <p className="mt-0.5 text-[12px] text-[#B8A99E]">
                  Pay once · Lifetime access to all 5 modules
                </p>
              </div>
              <div className="text-right">
                <span className="font-serif text-[32px] leading-none font-semibold text-[#FDF6EE]">
                  $19
                </span>
                <div className="text-[11px] text-[#8E7F75]">one-time</div>
              </div>
            </div>
          </button>

          {/* $39/yr Blueprint Pass */}
          <button
            type="button"
            onClick={() => setSelectedTier("annual_39")}
            className={`w-full rounded-[22px] border p-5 text-left transition ${
              selectedTier === "annual_39"
                ? "border-[#FF6B2B] bg-[#24150D]/90 shadow-[0_0_28px_rgba(255,107,43,0.22)]"
                : "border-[#F5A65B]/20 bg-[#1C130E]/70"
            }`}
          >
            <div className="flex items-baseline justify-between">
              <div>
                <h2 className="font-serif text-[22px] text-[#FDF6EE]">
                  Blueprint Pass
                </h2>
                <p className="mt-0.5 text-[12px] text-[#B8A99E]">
                  Unlimited chart refreshes + early access to v2 live tools
                </p>
              </div>
              <div className="text-right">
                <span className="font-serif text-[32px] leading-none font-semibold text-[#FDF6EE]">
                  $39
                </span>
                <div className="text-[11px] text-[#8E7F75]">per year</div>
              </div>
            </div>
          </button>
        </div>

        {/* Willingness-to-Pay CTA */}
        <div className="mt-6">
          <button
            type="button"
            onClick={handlePaywallCtaClick}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 px-6 font-sans text-[15px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_28px_-6px_rgba(255,107,43,0.5)] active:scale-[0.98] transition"
          >
            <Lock className="h-4 w-4" />
            <span>
              {selectedTier === "one_time_19"
                ? "Unlock Full Blueprint — $19"
                : "Unlock Full Blueprint — $39/yr"}
            </span>
          </button>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-[#8E7F75]">
            <ShieldCheck className="h-4 w-4 text-[#F5A65B]" />
            <span>Instant access · 100% private · One-time payment</span>
          </div>
        </div>
      </div>

      {/* Early Beta Free Unlock Modal */}
      {betaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
          <div className="relative w-full max-w-[430px] rounded-t-[26px] sm:rounded-[26px] border border-[#F5A65B]/30 bg-[#16100C] p-6 shadow-[0_-12px_50px_rgba(0,0,0,0.8)]">
            <button
              type="button"
              onClick={() => setBetaModalOpen(false)}
              aria-label="Close beta modal"
              className="absolute right-5 top-5 rounded-full p-1.5 text-[#8E7F75] hover:bg-white/5 hover:text-[#FDF6EE] transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#4ADE80]/15 border border-[#4ADE80]/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4ADE80]">
              <Sparkles className="h-3 w-3" />
              <span>Early Beta Access</span>
            </div>

            <h3 className="mt-3 font-serif text-[26px] leading-tight text-[#FDF6EE]">
              You&rsquo;re in the Early Beta — Yours Free ($0 instead of $19)
            </h3>

            <p className="mt-2.5 text-[14px] leading-relaxed text-[#B8A99E]">
              Thank you for testing v1 before public billing goes live. Your full
              5-module Personal Blueprint is unlocked on the house—just share
              honest feedback as you explore.
            </p>

            <form onSubmit={handleClaimBetaUnlock} className="mt-5 space-y-3">
              {betaUnlockMode === "code_required" && (
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E7F75]" />
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter your beta invite code"
                    className="w-full rounded-full border border-[#F5A65B]/25 bg-[#120C09] py-3.5 pl-11 pr-4 text-[14px] text-[#FDF6EE] placeholder:text-[#7C6E65] focus:border-[#FF6B2B] focus:outline-none"
                  />
                </div>
              )}

              {claimError && (
                <p className="px-2 text-[12px] text-[#F87171]">{claimError}</p>
              )}

              <button
                type="submit"
                disabled={claiming}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 px-6 font-sans text-[15px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_28px_-6px_rgba(255,107,43,0.5)] active:scale-[0.98] transition disabled:opacity-70"
              >
                <Sparkles className="h-4 w-4" />
                <span>
                  {claiming
                    ? "Unlocking Your Blueprint..."
                    : "Claim Free Beta Unlock"}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </SolarShell>
  );
}
