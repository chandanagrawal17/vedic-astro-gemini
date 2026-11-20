"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { SolarShell } from "@/components/ui/SolarShell";
import { SolarOrbHero } from "@/components/ui/SolarOrbHero";
import { loadSession, saveCalculatedSession } from "@/lib/store/sessionStore";
import { BlueprintFreePayload } from "@/lib/types/blueprint";

const STATUS_LINES = [
  "Mapping your last 10 years...",
  "Scanning core friction loops...",
  "Building your Personal Blueprint...",
];

interface CalculateApiResponse {
  sessionId: string;
  sessionToken: string;
  moonBoundaryFlag: boolean;
  freePayload: BlueprintFreePayload;
  error?: string;
  isTimeout?: boolean;
}

export default function SynthesizingPage() {
  const router = useRouter();
  const [lineIndex, setLineIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const mountedRef = useRef(true);

  const runSynthesis = useCallback(async () => {
    setErrorMsg(null);
    setLineIndex(0);

    const session = loadSession();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const minAnimationPromise = new Promise<void>((resolve) => {
      setTimeout(resolve, 3050);
    });

    const apiPromise = (async () => {
      const res = await fetch("/api/charts/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          ...session.input,
          sessionToken: session.sessionToken,
        }),
      });

      const data = (await res.json()) as CalculateApiResponse;
      if (!res.ok) {
        throw new Error(
          data.error ||
            (res.status === 504
              ? "Pattern engine timed out. Please retry."
              : "Unable to calculate your chart right now.")
        );
      }
      return data;
    })();

    try {
      const [, calcResult] = await Promise.all([
        minAnimationPromise,
        apiPromise,
      ]);

      if (!mountedRef.current) return;

      saveCalculatedSession(session.input, {
        sessionId: calcResult.sessionId,
        sessionToken: calcResult.sessionToken,
        freePayload: calcResult.freePayload,
        moonBoundaryFlag: calcResult.moonBoundaryFlag,
      });

      router.replace(`/preview/${calcResult.sessionId}`);
    } catch (err) {
      if (!mountedRef.current) return;
      const isAbort = err instanceof Error && err.name === "AbortError";
      setErrorMsg(
        isAbort
          ? "The pattern engine took too long to respond. Please try again."
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
    const t1 = setTimeout(() => setLineIndex(1), 1000);
    const t2 = setTimeout(() => setLineIndex(2), 2050);

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
        <SolarOrbHero size="lg" animateSpin={!errorMsg} />

        {!errorMsg ? (
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
    </SolarShell>
  );
}
