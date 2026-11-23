"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Share2,
  Sparkles,
} from "lucide-react";
import { SolarShell } from "@/components/ui/SolarShell";
import { ObsidianCard } from "@/components/ui/ObsidianCard";
import { BragCardModal } from "@/components/blueprint/BragCardModal";
import { CareerFreeSection } from "@/components/blueprint/CareerSections";
import { HardResetFreeSection } from "@/components/blueprint/HardResetSections";
import { LifeChaptersArc } from "@/components/blueprint/LifeChaptersArc";
import { LockedInsightCard } from "@/components/blueprint/LockedInsightCard";
import { RelationshipFreeSection } from "@/components/blueprint/RelationshipSections";
import { SoftAuthModal } from "@/components/blueprint/SoftAuthModal";
import { normalizeFreePayloadForUi } from "@/lib/blueprint/normalizePayload";
import { buildMockBlueprint, DEFAULT_ONBOARDING_INPUT } from "@/lib/mock/blueprintMock";
import { trackFunnelEvent } from "@/lib/store/attributionStore";
import {
  BlueprintFreePayload,
  BlueprintPaidPayload,
  BlueprintSession,
  CanonicalRelationshipStatus,
  EntryHook,
  HardResetFeedback,
  LoveAccuracyFeedback,
  OnboardingInput,
  UnlockSource,
} from "@/lib/types/blueprint";
import {
  loadSession,
  loadStoredSession,
  saveSynthesizedSession,
  updateSessionFeedback,
  updateSessionLoveFeedback,
} from "@/lib/store/sessionStore";

interface BlueprintApiResponse {
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
  loveAccuracyFeedback?: LoveAccuracyFeedback | null;
  hook_proof_json: BlueprintFreePayload;
  full_blueprint_json: BlueprintPaidPayload | null;
  input?: OnboardingInput;
  error?: string;
}

function PreviewLoadingSkeleton() {
  return (
    <SolarShell showDisclaimer={false}>
      <div className="flex-1 px-5 pt-6 pb-24 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-32 rounded-full bg-[#F5A65B]/15 animate-pulse" />
          <div className="h-6 w-14 rounded-full bg-[#1C130E] border border-[#F5A65B]/15 animate-pulse" />
        </div>

        <ObsidianCard warmTint>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-[#F5A65B]/20 animate-pulse" />
            <div className="h-3 w-36 rounded-full bg-[#F5A65B]/15 animate-pulse" />
          </div>
          <div className="mt-5 h-9 w-40 rounded-lg bg-[#FDF6EE]/10 animate-pulse" />
          <div className="mt-2 h-5 w-48 rounded-lg bg-[#F5A65B]/15 animate-pulse" />
          <div className="mt-4 space-y-2">
            <div className="h-3.5 w-full rounded bg-[#D9CEC5]/10 animate-pulse" />
            <div className="h-3.5 w-5/6 rounded bg-[#D9CEC5]/10 animate-pulse" />
          </div>
        </ObsidianCard>

        <ObsidianCard>
          <div className="h-3 w-36 rounded-full bg-[#F5A65B]/15 animate-pulse" />
          <div className="mt-2 h-6 w-56 rounded-lg bg-[#FDF6EE]/10 animate-pulse" />
          <div className="mt-6 h-24 w-full rounded-2xl bg-[#120C09]/80 animate-pulse" />
        </ObsidianCard>
      </div>
    </SolarShell>
  );
}

export default function PreviewSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [session, setSession] = useState<BlueprintSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [bragModalOpen, setBragModalOpen] = useState(false);
  const [showStatusGate, setShowStatusGate] = useState(false);
  const [switchingStatus, setSwitchingStatus] = useState(false);
  const [statusSwitchError, setStatusSwitchError] = useState<string | null>(null);

  const stepParam = searchParams.get("step");
  const activeStep: 1 | 2 = stepParam === "2" ? 2 : 1;

  const hydrateFromApi = useCallback(
    async (sid: string, forceSynthesize = false) => {
      setErrorMsg(null);
      if (forceSynthesize) {
        setRetrying(true);
      } else {
        setLoading(true);
      }

      const stored = loadStoredSession(sid);

      try {
        if (forceSynthesize) {
          const synthRes = await fetch("/api/blueprint/synthesize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chartId: stored?.chartId ?? sid,
              sessionToken: stored?.sessionToken ?? sid,
              email: stored?.input.email,
              firstName: stored?.input.firstName,
              relationshipStatus: stored?.input.relationshipStatus,
              careerMode: stored?.input.careerMode,
              careerField: stored?.input.careerField,
            }),
          });
          const synthData = (await synthRes.json()) as BlueprintApiResponse;
          if (!synthRes.ok) {
            throw new Error(
              synthData.error || "Unable to synthesize your Blueprint right now."
            );
          }

          const hydrated = saveSynthesizedSession(
            synthData.input ?? stored?.input ?? DEFAULT_ONBOARDING_INPUT,
            {
              chartId: synthData.chartId,
              sessionId: synthData.sessionId,
              sessionToken: synthData.sessionToken,
              freePayload: synthData.hook_proof_json,
              paidPayload: synthData.full_blueprint_json,
              isUnlocked: synthData.isUnlocked,
              unlockTier: synthData.unlockTier,
              unlockSource: synthData.unlockSource,
              unlockedAt: synthData.unlockedAt,
              entryHook: synthData.entryHook,
              utmSource: synthData.utmSource,
              moonBoundaryFlag: synthData.moonBoundaryFlag,
              hardResetFeedback: synthData.accuracyFeedback,
              loveAccuracyFeedback: synthData.loveAccuracyFeedback,
              modelVersion: synthData.modelVersion,
            }
          );
          setSession(hydrated);
          return;
        }

        const tokenParam = stored?.sessionToken
          ? `?sessionToken=${encodeURIComponent(stored.sessionToken)}`
          : "";
        const res = await fetch(
          `/api/blueprint/${encodeURIComponent(sid)}${tokenParam}`
        );

        if (res.ok) {
          const data = (await res.json()) as BlueprintApiResponse;
          const hydrated = saveSynthesizedSession(
            data.input ?? stored?.input ?? DEFAULT_ONBOARDING_INPUT,
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
              loveAccuracyFeedback: data.loveAccuracyFeedback,
              modelVersion: data.modelVersion,
            }
          );
          setSession(hydrated);
          return;
        }

        // If chart exists in sessionStorage and wasn't synthesized yet (404), allow calm retry
        const errData = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          errData.error || "Unable to load your Blueprint preview."
        );
      } catch (err) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Unable to load your Blueprint preview."
        );
      } finally {
        setLoading(false);
        setRetrying(false);
      }
    },
    []
  );

  useEffect(() => {
    const sid = params?.sessionId;
    if (!sid || sid === "demo-session") {
      setSession(loadSession("demo-session"));
      setLoading(false);
      return;
    }

    const stored = loadStoredSession(sid);
    if (stored && stored.modelVersion) {
      setSession(stored);
      setLoading(false);
      return;
    }

    void hydrateFromApi(sid, false);
  }, [params?.sessionId, hydrateFromApi]);

  useEffect(() => {
    if (!session) return;
    trackFunnelEvent({
      eventName: "proof_viewed",
      chartId: session.chartId,
      sessionToken: session.sessionToken ?? session.sessionId,
      email: session.input.email,
      entryHook: session.entryHook ?? session.input.entryHook ?? null,
      metadata: { step: activeStep },
      dedupeKey: `proof_viewed_${session.chartId ?? session.sessionId}`,
    });
  }, [session, activeStep]);

  if (loading) {
    return <PreviewLoadingSkeleton />;
  }

  if (!session && errorMsg) {
    return (
      <SolarShell showDisclaimer={false}>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="w-full max-w-[340px] rounded-[22px] border border-[#F5A65B]/20 bg-[#1C130E]/85 p-6">
            <p className="font-serif text-[22px] text-[#FDF6EE]">
              Preview Unavailable
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#B8A99E]">
              {errorMsg}
            </p>
            <button
              type="button"
              disabled={retrying}
              onClick={() =>
                void hydrateFromApi(params?.sessionId || "", true)
              }
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 px-5 font-sans text-[14px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_28px_-6px_rgba(255,107,43,0.5)] active:scale-[0.98] transition disabled:opacity-60"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{retrying ? "Synthesizing..." : "Retry Synthesis"}</span>
            </button>
            <button
              type="button"
              onClick={() => router.replace("/onboarding")}
              className="mt-3 w-full text-[12px] text-[#8E7F75] hover:text-[#FDF6EE] transition"
            >
              Start over
            </button>
          </div>
        </div>
      </SolarShell>
    );
  }

  if (!session) {
    return <PreviewLoadingSkeleton />;
  }

  const freePayload = normalizeFreePayloadForUi(session.freePayload);
  const { input } = session;

  const handleLockedMonthlyClick = () => {
    trackFunnelEvent({
      eventName: "clicked_locked_monthly_timeline",
      chartId: session.chartId,
      sessionToken: session.sessionToken ?? session.sessionId,
      email: session.input.email,
      entryHook: session.entryHook ?? session.input.entryHook ?? null,
    });
    setAuthModalOpen(true);
  };

  const handleLockedCareerClick = () => {
    trackFunnelEvent({
      eventName: "clicked_locked_career_blueprint",
      chartId: session.chartId,
      sessionToken: session.sessionToken ?? session.sessionId,
      email: session.input.email,
      entryHook: session.entryHook ?? session.input.entryHook ?? null,
    });
    setAuthModalOpen(true);
  };

  const handleLockedRelationshipClick = () => {
    trackFunnelEvent({
      eventName: "clicked_locked_relationship_guide",
      chartId: session.chartId,
      sessionToken: session.sessionToken ?? session.sessionId,
      email: session.input.email,
      entryHook: session.entryHook ?? session.input.entryHook ?? null,
    });
    setAuthModalOpen(true);
  };

  const handleFeedback = (val: HardResetFeedback) => {
    const updated = updateSessionFeedback(val);
    setSession(updated);
    const targetId = session.chartId ?? session.sessionId;
    if (targetId && targetId !== "demo-session") {
      fetch(`/api/blueprint/${encodeURIComponent(targetId)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: val,
          sessionToken: session.sessionToken ?? session.sessionId,
        }),
      }).catch(() => {
        // Non-blocking background persistence
      });
    }
  };

  const handleLoveFeedback = (val: LoveAccuracyFeedback) => {
    const updated = updateSessionLoveFeedback(val);
    setSession(updated);
    const targetId = session.chartId ?? session.sessionId;
    if (targetId && targetId !== "demo-session") {
      fetch(`/api/blueprint/${encodeURIComponent(targetId)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loveFeedback: val,
          sessionToken: session.sessionToken ?? session.sessionId,
        }),
      }).catch(() => {
        // Non-blocking background persistence
      });
    }
  };

  const handleChangeRelationshipStatus = async (
    nextStatus: CanonicalRelationshipStatus
  ) => {
    setStatusSwitchError(null);
    const targetId = session.chartId ?? session.sessionId;
    if (!targetId || targetId === "demo-session") {
      const nextInput = { ...session.input, relationshipStatus: nextStatus };
      const rebuilt = buildMockBlueprint(nextInput, session.sessionId);
      const saved = saveSynthesizedSession(nextInput, {
        chartId: session.chartId,
        sessionId: session.sessionId,
        sessionToken: session.sessionToken ?? session.sessionId,
        freePayload: {
          ...freePayload,
          relationship: rebuilt.freePayload.relationship,
        },
        paidPayload: session.paidPayload
          ? {
              ...session.paidPayload,
              relationship: rebuilt.paidPayload.relationship,
            }
          : null,
        loveAccuracyFeedback: null,
      });
      setSession(saved);
      setShowStatusGate(false);
      return;
    }

    setSwitchingStatus(true);
    try {
      const res = await fetch(
        `/api/blueprint/${encodeURIComponent(targetId)}/relationship-status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            relationshipStatus: nextStatus,
            sessionToken: session.sessionToken ?? session.sessionId,
          }),
        }
      );
      const data = (await res.json()) as BlueprintApiResponse;
      if (!res.ok) {
        throw new Error(data.error || "Unable to update relationship status.");
      }

      const hydrated = saveSynthesizedSession(
        data.input ?? { ...session.input, relationshipStatus: nextStatus },
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
          loveAccuracyFeedback: data.loveAccuracyFeedback,
          modelVersion: data.modelVersion,
        }
      );
      setSession(hydrated);
      setShowStatusGate(false);
    } catch (err) {
      setStatusSwitchError(
        err instanceof Error
          ? err.message
          : "Unable to switch status right now."
      );
    } finally {
      setSwitchingStatus(false);
    }
  };

  const goToStep = (step: 1 | 2) => {
    const base = `/preview/${session.sessionId}`;
    router.push(step === 2 ? `${base}?step=2` : base);
  };

  const handleAuthContinue = () => {
    setAuthModalOpen(false);
    router.push(`/unlock/${session.sessionId}`);
  };

  return (
    <SolarShell>
      <div className="flex-1 px-5 pt-6 pb-28">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          {activeStep === 2 ? (
            <button
              type="button"
              onClick={() => goToStep(1)}
              className="inline-flex items-center gap-1.5 text-[13px] text-[#B8A99E] hover:text-[#FDF6EE] transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Reset</span>
            </button>
          ) : (
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
              {input.firstName}&rsquo;s Pattern Proof
            </span>
          )}

          <span className="rounded-full border border-[#F5A65B]/20 bg-[#1C130E]/80 px-3 py-1 text-[11px] font-medium text-[#B8A99E]">
            {activeStep} of 2
          </span>
        </div>

        {/* Precision Mode Hint (when birth time is missing) */}
        {freePayload.upgrade_hint && (
          <div className="mt-4 rounded-2xl border border-[#F5A65B]/25 bg-[#1C130E]/80 px-3.5 py-2.5 text-[12px] leading-relaxed text-[#D9CEC5]">
            <span className="font-semibold text-[#F5A65B]">Precision Note: </span>
            {freePayload.upgrade_hint}
          </div>
        )}

        {/* PROOF SCREEN 1 */}
        {activeStep === 1 && (
          <div className="mt-5 space-y-4">
            {/* Hero Card: Hard Reset Pinpoint + Locked Tight Monthly Timeline */}
            <HardResetFreeSection
              hardReset={freePayload.hardReset}
              feedback={session.hardResetFeedback}
              onSelectFeedback={handleFeedback}
              onLockedTimelineClick={handleLockedMonthlyClick}
            />

            {/* Card 2: Your Last 10 Years in 3 Eras */}
            <ObsidianCard>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                Life Chapters · 10-Year Arc
              </p>
              <h2 className="mt-1 font-serif text-[24px] leading-[1.2] text-[#FDF6EE]">
                Your Last 10 Years in 3 Eras
              </h2>

              <LifeChaptersArc
                eras={freePayload.eras}
                isUnlocked={false}
                onEra3LockedClick={() => setAuthModalOpen(true)}
              />

              <button
                type="button"
                onClick={() => setBragModalOpen(true)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#F5A65B]/25 bg-[#120C09]/85 py-2.5 px-4 text-[13px] font-medium text-[#FDF6EE] hover:border-[#FF6B2B]/60 transition"
              >
                <Share2 className="h-3.5 w-3.5 text-[#F5A65B]" />
                <span>Share My 3 Eras</span>
              </button>
            </ObsidianCard>
          </div>
        )}

        {/* PROOF SCREEN 2 */}
        {activeStep === 2 && (
          <div className="mt-5 space-y-4">
            {/* Card 1: #1 Self-Sabotage Loop */}
            <ObsidianCard warmTint>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F59E0B]/15 border border-[#F59E0B]/35 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F59E0B]">
                #1 Self-Sabotage Loop
              </span>

              <h2 className="mt-2.5 font-serif text-[28px] leading-[1.15] text-[#FDF6EE]">
                {freePayload.selfSabotage.loopName}
              </h2>

              <p className="mt-2.5 text-[15px] leading-[1.6] text-[#D9CEC5]">
                {freePayload.selfSabotage.symptomSentence}
              </p>

              <LockedInsightCard
                eyebrow="Trigger Map & 3-Step Antidote"
                headline="How this loop shows up in love & career + how to break it"
                onUnlockClick={() => setAuthModalOpen(true)}
              />
            </ObsidianCard>

            {/* Card 2: Career & Path Audit (Free Fit Teaser + Locked Career Guide) */}
            <CareerFreeSection
              career={freePayload.career}
              isTransition={
                input.careerMode === "in_transition" ||
                input.careerMode === "transition"
              }
              onLockedCareerClick={handleLockedCareerClick}
            />

            {/* Card 3: Relationship Mirror (Single-Branch Lovable Proof + 1-Tap Accuracy) */}
            <RelationshipFreeSection
              relationship={freePayload.relationship}
              loveAccuracyFeedback={session.loveAccuracyFeedback ?? null}
              showStatusGate={showStatusGate || !session.input.relationshipStatus}
              switchingStatus={switchingStatus}
              statusSwitchError={statusSwitchError}
              onSelectStatus={(nextStatus) =>
                void handleChangeRelationshipStatus(nextStatus)
              }
              onOpenStatusGate={() => {
                setStatusSwitchError(null);
                setShowStatusGate(true);
              }}
              onCloseStatusGate={() => {
                setStatusSwitchError(null);
                setShowStatusGate(false);
              }}
              onSelectLoveFeedback={handleLoveFeedback}
              onLockedRelationshipClick={handleLockedRelationshipClick}
            />
          </div>
        )}
      </div>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 bg-gradient-to-t from-[#0D0907] via-[#0D0907]/95 to-transparent px-5 pt-6 pb-5">
        {activeStep === 1 ? (
          <button
            type="button"
            onClick={() => goToStep(2)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 px-6 font-sans text-[15px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_28px_-6px_rgba(255,107,43,0.5)] active:scale-[0.98] transition"
          >
            <span>See Your Blind Spot &amp; Alignment</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 px-6 font-sans text-[15px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_28px_-6px_rgba(255,107,43,0.5)] active:scale-[0.98] transition"
          >
            <Sparkles className="h-4 w-4" />
            <span>Unlock My Complete Blueprint</span>
          </button>
        )}
      </div>

      <SoftAuthModal
        isOpen={authModalOpen}
        firstName={input.firstName}
        sessionId={session.sessionId}
        sessionToken={session.sessionToken ?? session.sessionId}
        onboardingInput={input}
        allowDirectBetaContinue={true}
        onClose={() => setAuthModalOpen(false)}
        onContinue={handleAuthContinue}
      />

      <BragCardModal
        isOpen={bragModalOpen}
        initialMode="3_eras"
        allowModeSwitch={false}
        firstName={input.firstName}
        freePayload={freePayload}
        chartId={session.chartId}
        sessionToken={session.sessionToken ?? session.sessionId}
        email={input.email}
        entryHook={session.entryHook ?? input.entryHook ?? null}
        onClose={() => setBragModalOpen(false)}
      />
    </SolarShell>
  );
}
