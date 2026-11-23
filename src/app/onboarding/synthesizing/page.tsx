"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, RotateCcw } from "lucide-react";
import { SolarShell } from "@/components/ui/SolarShell";
import { SolarOrbHero } from "@/components/ui/SolarOrbHero";
import { SoftAuthModal } from "@/components/blueprint/SoftAuthModal";
import {
  loadSession,
  saveSynthesizedSession,
} from "@/lib/store/sessionStore";
import {
  BlueprintFreePayload,
  BlueprintPaidPayload,
  HardResetFeedback,
  OnboardingInput,
} from "@/lib/types/blueprint";

const STATUS_LINES = [
  "Mapping personal rhythms...",
  "Tracing your last 10 years...",
  "Synthesizing your blueprint...",
];

interface CalculateApiResponse {
  status?: "ok" | "existing_paid_account";
  message?: string;
  chartId: string;
  sessionId: string;
  sessionToken: string;
  moonBoundaryFlag: boolean;
  error?: string;
}

interface SynthesizeApiResponse {
  status?: "ok" | "existing_paid_account";
  message?: string;
  chartId: string;
  sessionId: string;
  sessionToken: string;
  moonBoundaryFlag: boolean;
  modelVersion: string | null;
  isUnlocked: boolean;
  unlockTier: "one_time_19" | "annual_39" | null;
  accuracyFeedback: HardResetFeedback | null;
  hook_proof_json: BlueprintFreePayload;
  full_blueprint_json: BlueprintPaidPayload | null;
  error?: string;
  isTimeout?: boolean;
}

class ExistingPaidAccountClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExistingPaidAccountClientError";
  }
}

export default function SynthesizingPage() {
  const router = useRouter();
  const [lineIndex, setLineIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paidAccountMsg, setPaidAccountMsg] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeInput, setActiveInput] = useState<OnboardingInput | null>(null);
  const [attempt, setAttempt] = useState(0);
  const mountedRef = useRef(true);

  const runSynthesis = useCallback(async () => {
    setErrorMsg(null);
    setPaidAccountMsg(null);
    setLineIndex(0);

    const session = loadSession();
    setActiveInput(session.input);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const minAnimationPromise = new Promise<void>((resolve) => {
      setTimeout(resolve, 2800);
    });

    const pipelinePromise = (async () => {
      // Step 1: Calculate & cache natal chart math
      const calcRes = await fetch("/api/charts/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          ...session.input,
          sessionToken: session.sessionToken,
        }),
      });

      const calcData = (await calcRes.json()) as CalculateApiResponse;
      if (calcData.status === "existing_paid_account") {
        throw new ExistingPaidAccountClientError(
          calcData.message ||
            "This email already has an unlocked Blueprint. Please sign in to access or update it."
        );
      }

      if (!calcRes.ok) {
        throw new Error(
          calcData.error ||
            (calcRes.status === 504
              ? "Pattern engine timed out. Please retry."
              : "Unable to calculate your chart right now.")
        );
      }

      if (mountedRef.current) {
        setLineIndex((prev) => (prev < 1 ? 1 : prev));
      }

      // Step 2: Synthesize 5-Hook Blueprint via Gemini + Guardrail
      const synthTimer = setTimeout(() => {
        if (mountedRef.current) {
          setLineIndex(2);
        }
      }, 900);

      try {
        const synthRes = await fetch("/api/blueprint/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            chartId: calcData.chartId,
            sessionToken: calcData.sessionToken,
            email: session.input.email,
            firstName: session.input.firstName,
            relationshipStatus: session.input.relationshipStatus,
            careerMode: session.input.careerMode,
            careerField: session.input.careerField,
          }),
        });

        const synthData = (await synthRes.json()) as SynthesizeApiResponse;
        if (synthData.status === "existing_paid_account") {
          throw new ExistingPaidAccountClientError(
            synthData.message ||
              "This email already has an unlocked Blueprint. Please sign in to access or update it."
          );
        }

        if (!synthRes.ok) {
          throw new Error(
            synthData.error ||
              (synthRes.status === 504
                ? "Blueprint synthesis timed out. Please try again."
                : "Unable to synthesize your Blueprint right now.")
          );
        }

        return synthData;
      } finally {
        clearTimeout(synthTimer);
      }
    })();

    try {
      const [, synthResult] = await Promise.all([
        minAnimationPromise,
        pipelinePromise,
      ]);

      if (!mountedRef.current) return;

      saveSynthesizedSession(session.input, {
        chartId: synthResult.chartId,
        sessionId: synthResult.sessionId,
        sessionToken: synthResult.sessionToken,
        freePayload: synthResult.hook_proof_json,
        paidPayload: synthResult.full_blueprint_json,
        isUnlocked: synthResult.isUnlocked,
        unlockTier: synthResult.unlockTier,
        moonBoundaryFlag: synthResult.moonBoundaryFlag,
        hardResetFeedback: synthResult.accuracyFeedback,
        modelVersion: synthResult.modelVersion,
      });

      if (synthResult.isUnlocked) {
        router.replace(
          `/blueprint?session=${encodeURIComponent(synthResult.sessionId)}`
        );
      } else {
        router.replace(`/preview/${synthResult.sessionId}`);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      if (err instanceof ExistingPaidAccountClientError) {
        setPaidAccountMsg(err.message);
        setAuthModalOpen(true);
        return;
      }
      const isAbort = err instanceof Error && err.name === "AbortError";
      setErrorMsg(
        isAbort
          ? "The synthesis engine took a little too long to respond. Please try again."
          : err instanceof Error
            ? err.message
            : "Something went wrong while calibrating your chart."
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }, [router]);

  useEffect(() => {
    mountedRef.current = true;
    const t1 = setTimeout(() => setLineIndex((p) => (p < 1 ? 1 : p)), 1000);
    const t2 = setTimeout(() => setLineIndex(2), 2100);

    void runSynthesis();

    return () => {
      mountedRef.current = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [attempt, runSynthesis]);

  return (
    <SolarShell showDisclaimer={false}>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <SolarOrbHero size="lg" animateSpin={!errorMsg && !paidAccountMsg} />

        {!errorMsg && !paidAccountMsg ? (
          <>
            <div className="mt-10 h-16 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={lineIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="font-serif text-[25px] leading-snug text-[#FDF6EE]"
                >
                  {STATUS_LINES[lineIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            <p className="mt-2 text-[12px] tracking-wide text-[#8E7F75]">
              Calibrating cycles &amp; behavioral patterns
            </p>
          </>
        ) : paidAccountMsg ? (
          <div className="mt-8 w-full max-w-[340px] rounded-[22px] border border-[#F5A65B]/25 bg-[#1C130E]/85 p-5">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6B2B]/15 border border-[#FF6B2B]/35 text-[#F5A65B]">
              <Lock className="h-4 w-4" />
            </div>
            <p className="mt-3 font-serif text-[22px] text-[#FDF6EE]">
              Existing Blueprint Found
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#B8A99E]">
              {paidAccountMsg}
            </p>
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 px-5 font-sans text-[14px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_28px_-6px_rgba(255,107,43,0.5)] active:scale-[0.98] transition"
            >
              <span>Sign In to Access Blueprint</span>
            </button>
            <button
              type="button"
              onClick={() => router.replace("/onboarding")}
              className="mt-3 w-full text-[12px] text-[#8E7F75] hover:text-[#FDF6EE] transition"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="mt-8 w-full max-w-[340px] rounded-[22px] border border-[#F5A65B]/20 bg-[#1C130E]/85 p-5">
            <p className="font-serif text-[22px] text-[#FDF6EE]">
              Calibration Interrupted
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#B8A99E]">
              {errorMsg}
            </p>
            <button
              type="button"
              onClick={() => setAttempt((a) => a + 1)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 px-5 font-sans text-[14px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_28px_-6px_rgba(255,107,43,0.5)] active:scale-[0.98] transition"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retry Synthesis</span>
            </button>
            <button
              type="button"
              onClick={() => router.replace("/onboarding")}
              className="mt-3 w-full text-[12px] text-[#8E7F75] hover:text-[#FDF6EE] transition"
            >
              Edit birth details
            </button>
          </div>
        )}
      </div>

      <SoftAuthModal
        isOpen={authModalOpen}
        firstName={activeInput?.firstName || "Your"}
        initialEmail={activeInput?.email || ""}
        onboardingInput={activeInput ?? undefined}
        titleOverride="Sign in to access your unlocked Blueprint."
        descriptionOverride={
          paidAccountMsg ||
          "This email already has an unlocked Blueprint. Sign in to view or update it."
        }
        nextPathOverride="/blueprint"
        onClose={() => setAuthModalOpen(false)}
        onContinue={() => {
          setAuthModalOpen(false);
          setPaidAccountMsg(null);
          setAttempt((a) => a + 1);
        }}
      />
    </SolarShell>
  );
}
