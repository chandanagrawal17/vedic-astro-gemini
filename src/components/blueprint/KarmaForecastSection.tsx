"use client";

import React, { useEffect, useState } from "react";
import {
  Briefcase,
  CalendarClock,
  Check,
  Heart,
  HeartPulse,
  Lock,
  Sparkles,
  X,
} from "lucide-react";
import { ObsidianCard } from "@/components/ui/ObsidianCard";
import type {
  CareerDeepDivePayload,
  RelationshipDeepDivePayload,
} from "@/lib/llm/blueprintSchema";
import { trackFunnelEvent } from "@/lib/store/attributionStore";
import type { EntryHook } from "@/lib/types/blueprint";

interface KarmaForecastSectionProps {
  paidCareer: CareerDeepDivePayload;
  paidRelationship: RelationshipDeepDivePayload;
  isSubscribed: boolean;
  chartId?: string;
  sessionToken?: string;
  email?: string;
  entryHook?: EntryHook | null;
  onToggleSubscription: (active: boolean) => void;
}

export function KarmaForecastSection({
  paidCareer,
  paidRelationship,
  isSubscribed,
  chartId,
  sessionToken,
  email,
  entryHook,
  onToggleSubscription,
}: KarmaForecastSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  const loveHeading =
    paidRelationship.relationshipStatus === "married"
      ? "Your Next 12 Months Together"
      : paidRelationship.relationshipStatus === "dating"
        ? "Your Next 12 Months in Dating"
        : "Your Next 12 Months as a Single";

  const careerWindows = paidCareer.next12Months.tightMonthlyWindows;
  const loveWindows = paidRelationship.next12Months.tightMonthlyWindows;

  const handleOpenSubscribeModal = () => {
    trackFunnelEvent({
      eventName: "paywall_cta_clicked",
      chartId,
      sessionToken,
      email,
      entryHook: entryHook ?? null,
      dedupeKey: `karma_forecast_cta_${chartId ?? sessionToken ?? "demo"}`,
      metadata: {
        selected_tier: "karma_monthly_5_99",
        price_shown: 5.99,
      },
    });
    setModalOpen(true);
  };

  const handleActivateBeta = () => {
    onToggleSubscription(true);
    setModalOpen(false);
  };

  if (!isSubscribed) {
    return (
      <>
        <ObsidianCard warmTint>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-[#FF6B2B]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                Your Next 12 Months
              </span>
            </div>
            <span className="rounded-full border border-[#FF6B2B]/40 bg-[#FF6B2B]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#FDF6EE]">
              $5.99/mo
            </span>
          </div>

          <h3 className="mt-2 font-serif text-[23px] leading-snug text-[#FDF6EE]">
            Career &amp; Love 12-Month Timing Forecast
          </h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#D9CEC5]">
            Unlock your exact 1-to-3-month action windows across both{" "}
            <strong className="text-[#FDF6EE]">Career</strong> and{" "}
            <strong className="text-[#FDF6EE]">Love</strong>, plus pacing cues
            for the year ahead.
          </p>

          <div className="mt-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[#F5A65B]/20 bg-[#120C09]/85 px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <Lock className="h-3.5 w-3.5 shrink-0 text-[#F5A65B]" />
                <span className="truncate text-[13px] font-medium text-[#FDF6EE]">
                  Career Timing ({careerWindows.length} tight windows)
                </span>
              </div>
              <span className="shrink-0 rounded border border-[#F5A65B]/20 bg-[#1C130E] px-2 py-0.5 font-mono text-[11px] text-[#B8A99E]">
                <span className="blur-[3px] select-none">███ – ███</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-xl border border-[#F5A65B]/20 bg-[#120C09]/85 px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <Lock className="h-3.5 w-3.5 shrink-0 text-[#F5A65B]" />
                <span className="truncate text-[13px] font-medium text-[#FDF6EE]">
                  Love Timing ({loveWindows.length} tight windows)
                </span>
              </div>
              <span className="shrink-0 rounded border border-[#F5A65B]/20 bg-[#1C130E] px-2 py-0.5 font-mono text-[11px] text-[#B8A99E]">
                <span className="blur-[3px] select-none">███ – ███</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenSubscribeModal}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 px-6 font-sans text-[14px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_28px_-6px_rgba(255,107,43,0.45)] active:scale-[0.98] transition"
          >
            <Sparkles className="h-4 w-4" />
            <span>Unlock 12-Month Forecast — $5.99/mo</span>
          </button>

          <p className="mt-2 text-center text-[11.5px] text-[#8E7F75]">
            Includes Career &amp; Love monthly windows · Cancel anytime
          </p>
        </ObsidianCard>

        {modalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Karma 12-Month Forecast Subscription"
            onClick={(e) => {
              if (e.target === e.currentTarget) setModalOpen(false);
            }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
          >
            <div className="relative w-full max-w-[430px] rounded-t-[26px] sm:rounded-[26px] border border-[#F5A65B]/30 bg-[#16100C] p-6 shadow-[0_-12px_50px_rgba(0,0,0,0.8)]">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close subscription modal"
                className="absolute right-5 top-5 rounded-full p-1.5 text-[#8E7F75] hover:bg-white/5 hover:text-[#FDF6EE] transition"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#4ADE80]/30 bg-[#4ADE80]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4ADE80]">
                <Sparkles className="h-3 w-3" />
                <span>Karma Forecast · $5.99/mo</span>
              </div>

              <h3 className="mt-3 font-serif text-[25px] leading-tight text-[#FDF6EE]">
                Your Next 12 Months ($0 in Early Beta instead of $5.99/mo)
              </h3>

              <p className="mt-2 text-[13.5px] leading-relaxed text-[#B8A99E]">
                Get full access to your upcoming Career and Love monthly timing
                windows inside Karma. Free to test during Early Beta.
              </p>

              <ul className="mt-4 space-y-2 text-[13px] text-[#D9CEC5]">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4ADE80]" />
                  <span>
                    {careerWindows.length} Career monthly windows + Mind-Body
                    pacing cue
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4ADE80]" />
                  <span>
                    {loveWindows.length} Love &amp; Relationship timing windows
                  </span>
                </li>
              </ul>

              <button
                type="button"
                onClick={handleActivateBeta}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 px-6 font-sans text-[14.5px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_28px_-6px_rgba(255,107,43,0.45)] active:scale-[0.98] transition"
              >
                <Sparkles className="h-4 w-4" />
                <span>Activate 12-Month Forecast ($5.99/mo · Beta Free)</span>
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#4ADE80]/40 bg-[#4ADE80]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#4ADE80]">
            Karma Forecast Active · $5.99/mo
          </span>
        </div>
        <button
          type="button"
          onClick={() => onToggleSubscription(false)}
          className="text-[11px] text-[#8E7F75] underline decoration-[#8E7F75]/40 underline-offset-2 hover:text-[#FDF6EE] transition"
        >
          Preview Locked
        </button>
      </div>

      {/* Career: Your Next 12 Months */}
      <ObsidianCard warmTint>
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-[#FF6B2B]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
            Career · Your Next 12 Months
          </span>
        </div>

        <p className="mt-2.5 text-[14.5px] leading-relaxed text-[#FDF6EE]">
          {paidCareer.next12Months.bigPictureSummary}
        </p>

        {careerWindows.length > 0 && (
          <div className="mt-3.5 space-y-2.5">
            {careerWindows.map((win) => (
              <div
                key={win.id}
                className="rounded-2xl border border-[#FF6B2B]/25 bg-[#120C09]/85 p-3.5"
              >
                <span className="inline-block rounded-full border border-[#FF6B2B]/40 bg-[#FF6B2B]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#F5A65B]">
                  {win.monthRange}
                </span>
                <h4 className="mt-1.5 text-[15px] font-semibold text-[#FDF6EE]">
                  {win.windowTitle}
                </h4>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[#D9CEC5]">
                  {win.practicalGuidance}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-[#F5A65B]/20 bg-[#120C09]/80 p-3.5">
          <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-[#F5A65B]" />
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#F5A65B]">
              Mind-Body Pacing Tip
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-[#D9CEC5]">
              {paidCareer.next12Months.mindBodyPacingTip}
            </p>
          </div>
        </div>
      </ObsidianCard>

      {/* Love: Your Next 12 Months */}
      <ObsidianCard warmTint>
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-[#FF6B2B]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
            Love · {loveHeading}
          </span>
        </div>

        <p className="mt-2.5 text-[14.5px] leading-relaxed text-[#FDF6EE]">
          {paidRelationship.next12Months.bigPictureSummary}
        </p>

        {loveWindows.length > 0 && (
          <div className="mt-3.5 space-y-2.5">
            {loveWindows.map((win) => (
              <div
                key={win.id}
                className="rounded-2xl border border-[#FF6B2B]/25 bg-[#120C09]/85 p-3.5"
              >
                <span className="inline-block rounded-full border border-[#FF6B2B]/40 bg-[#FF6B2B]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#F5A65B]">
                  {win.monthRange}
                </span>
                <h4 className="mt-1.5 text-[15px] font-semibold text-[#FDF6EE]">
                  {win.windowTitle}
                </h4>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[#D9CEC5]">
                  {win.practicalGuidance}
                </p>
              </div>
            ))}
          </div>
        )}
      </ObsidianCard>
    </div>
  );
}
