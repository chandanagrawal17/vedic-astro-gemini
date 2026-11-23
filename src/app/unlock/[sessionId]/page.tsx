"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { SolarShell } from "@/components/ui/SolarShell";
import { ObsidianCard } from "@/components/ui/ObsidianCard";
import {
  BlueprintFreePayload,
  BlueprintPaidPayload,
  BlueprintSession,
  HardResetFeedback,
  OnboardingInput,
} from "@/lib/types/blueprint";
import {
  loadSession,
  loadStoredSession,
  saveSynthesizedSession,
} from "@/lib/store/sessionStore";
import { DEFAULT_ONBOARDING_INPUT } from "@/lib/mock/blueprintMock";

const REPORT_CHECKLIST = [
  "Hard Reset Deep Breakdown & Next Pressure Window",
  "Era 3 Current Playbook & Era 4 Preview",
  "Job vs. Business Verdict & 12-Month Timing Posture",
  "Relationship Alignment, Silent Friction & 2 Shifts",
  "Self-Sabotage Trigger Map & 3-Step Practical Antidote",
];

export default function UnlockPaywallPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<BlueprintSession | null>(null);
  const [selectedTier, setSelectedTier] = useState<"one_time_19" | "annual_39">(
    "one_time_19"
  );
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const sid = params?.sessionId;
    if (!sid || sid === "demo-session") {
      setSession(loadSession("demo-session"));
      return;
    }

    const stored = loadStoredSession(sid);
    if (stored) {
      setSession(stored);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/blueprint/${encodeURIComponent(sid)}`);
        if (res.ok && !cancelled) {
          const data = (await res.json()) as {
            chartId: string;
            sessionId: string;
            sessionToken: string;
            moonBoundaryFlag?: boolean;
            modelVersion?: string | null;
            isUnlocked?: boolean;
            unlockTier?: "one_time_19" | "annual_39" | null;
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

  const handleCheckout = () => {
    setProcessing(true);
    const targetId = session?.chartId || session?.sessionId || params?.sessionId;
    setTimeout(() => {
      if (targetId && targetId !== "demo-session") {
        router.push(`/blueprint?session=${encodeURIComponent(targetId)}`);
      } else {
        router.push("/blueprint");
      }
    }, 350);
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

        {/* Checkout CTA */}
        <div className="mt-6">
          <button
            type="button"
            disabled={processing}
            onClick={handleCheckout}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 px-6 font-sans text-[15px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_28px_-6px_rgba(255,107,43,0.5)] active:scale-[0.98] transition disabled:opacity-70"
          >
            <Lock className="h-4 w-4" />
            <span>
              {processing
                ? "Unlocking Your Blueprint..."
                : `Unlock Now — ${selectedTier === "one_time_19" ? "$19" : "$39/yr"}`}
            </span>
          </button>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-[#8E7F75]">
            <ShieldCheck className="h-4 w-4 text-[#F5A65B]" />
            <span>Instant access · 100% private · One-time payment</span>
          </div>
        </div>
      </div>
    </SolarShell>
  );
}
