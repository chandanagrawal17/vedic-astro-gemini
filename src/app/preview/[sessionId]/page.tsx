"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Flame,
  Lock,
  Sparkles,
} from "lucide-react";
import { SolarShell } from "@/components/ui/SolarShell";
import { ObsidianCard } from "@/components/ui/ObsidianCard";
import { AccuracyCheck } from "@/components/blueprint/AccuracyCheck";
import { LifeChaptersArc } from "@/components/blueprint/LifeChaptersArc";
import { AlignmentMeter } from "@/components/blueprint/AlignmentMeter";
import { LockedInsightCard } from "@/components/blueprint/LockedInsightCard";
import { SoftAuthModal } from "@/components/blueprint/SoftAuthModal";
import { BlueprintSession, HardResetFeedback } from "@/lib/types/blueprint";
import { loadSession, updateSessionFeedback } from "@/lib/store/sessionStore";

export default function PreviewSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [session, setSession] = useState<BlueprintSession | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const stepParam = searchParams.get("step");
  const activeStep: 1 | 2 = stepParam === "2" ? 2 : 1;

  useEffect(() => {
    setSession(loadSession(params?.sessionId));
  }, [params?.sessionId]);

  if (!session) {
    return (
      <SolarShell showDisclaimer={false}>
        <div className="flex flex-1 items-center justify-center">
          <p className="font-serif text-[20px] text-[#B8A99E]">
            Loading preview...
          </p>
        </div>
      </SolarShell>
    );
  }

  const { freePayload, input } = session;

  const handleFeedback = (val: HardResetFeedback) => {
    const updated = updateSessionFeedback(val);
    setSession(updated);
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

        {/* PROOF SCREEN 1 */}
        {activeStep === 1 && (
          <div className="mt-5 space-y-4">
            {/* Hero Card: Hard Reset Pinpoint */}
            <ObsidianCard warmTint>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#F5A65B] to-[#C8420E] shadow-[0_0_18px_rgba(255,107,43,0.45)]">
                  <Flame className="h-4 w-4 text-[#0D0907]" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                  The Hard Reset Pinpoint
                </span>
              </div>

              <div className="mt-4 font-serif text-[36px] leading-none tracking-[-0.01em] text-[#FDF6EE]">
                {freePayload.hardReset.window}
              </div>
              <p className="mt-1.5 font-serif text-[20px] italic text-[#F5A65B]">
                {freePayload.hardReset.chapterLabel}
              </p>

              <p className="mt-3 text-[15px] leading-[1.6] text-[#D9CEC5]">
                {freePayload.hardReset.description}
              </p>

              <AccuracyCheck
                initialValue={session.hardResetFeedback}
                onSelect={handleFeedback}
              />
            </ObsidianCard>

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

            {/* Card 2: Career Alignment Audit */}
            <ObsidianCard>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                  Career Alignment Audit
                </span>
                <span className="rounded-full bg-[#FF6B2B]/15 border border-[#FF6B2B]/35 px-2.5 py-0.5 text-[11px] font-semibold text-[#FDF6EE]">
                  {freePayload.career.idealModePill}
                </span>
              </div>

              <AlignmentMeter
                score={freePayload.career.alignmentScore}
                subtitle={freePayload.career.subtitle}
              />

              <LockedInsightCard
                eyebrow="Career Verdict"
                headline="Full Job vs. Business Verdict & Role Match Locked"
                onUnlockClick={() => setAuthModalOpen(true)}
              />
            </ObsidianCard>

            {/* Card 3: Relationship Mirror */}
            <ObsidianCard>
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                Relationship Mirror ·{" "}
                {freePayload.relationship.branch === "partnered"
                  ? "Partnership"
                  : "Solo & Dating"}
              </span>

              <h3 className="mt-1.5 font-serif text-[24px] leading-[1.2] text-[#FDF6EE]">
                &ldquo;{freePayload.relationship.archetype}&rdquo;
              </h3>

              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#F5A65B]/25 bg-[#120C09] px-3 py-1 text-[11px] font-medium text-[#F5A65B]">
                <Lock className="h-3 w-3" />
                <span>{freePayload.relationship.teaserBadge}</span>
              </div>

              <LockedInsightCard
                eyebrow="Relational Deep Dive"
                headline="Silent Friction Pattern, 2 Communication Shifts & Timing"
                onUnlockClick={() => setAuthModalOpen(true)}
              />
            </ObsidianCard>
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
        onClose={() => setAuthModalOpen(false)}
        onContinue={handleAuthContinue}
      />
    </SolarShell>
  );
}
