"use client";

import React, { useEffect, useState } from "react";
import { CalendarClock, Check, Lock, Sparkles, X } from "lucide-react";
import { ObsidianCard } from "@/components/ui/ObsidianCard";
import { trackFunnelEvent } from "@/lib/store/attributionStore";
import type { EntryHook } from "@/lib/types/blueprint";

interface ForecastSubscriptionCardProps {
  heading: string;
  domainLabel: "Career" | "Love";
  windowsCount: number;
  careerWindowsCount?: number;
  loveWindowsCount?: number;
  chartId?: string;
  sessionToken?: string;
  email?: string;
  entryHook?: EntryHook | null;
  onActivateSubscription: () => void;
}

export function ForecastSubscriptionCard({
  heading,
  domainLabel,
  windowsCount,
  careerWindowsCount,
  loveWindowsCount,
  chartId,
  sessionToken,
  email,
  entryHook,
  onActivateSubscription,
}: ForecastSubscriptionCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  const handleOpenSubscribeModal = () => {
    trackFunnelEvent({
      eventName: "paywall_cta_clicked",
      chartId,
      sessionToken,
      email,
      entryHook: entryHook ?? null,
      dedupeKey: `forecast_sub_cta_${domainLabel.toLowerCase()}_${chartId ?? sessionToken ?? "demo"}`,
      metadata: {
        selected_tier: "forecast_monthly_5_99",
        price_shown: 5.99,
        surface: domainLabel.toLowerCase(),
      },
    });
    setModalOpen(true);
  };

  const handleActivateBeta = () => {
    onActivateSubscription();
    setModalOpen(false);
  };

  return (
    <>
      <ObsidianCard warmTint>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-[#FF6B2B]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
              {heading}
            </span>
          </div>
          <span className="rounded-full border border-[#FF6B2B]/40 bg-[#FF6B2B]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#FDF6EE]">
            $5.99/mo
          </span>
        </div>

        <h3 className="mt-2 font-serif text-[22px] leading-snug text-[#FDF6EE]">
          Unlock Your Next 12 Months
        </h3>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#D9CEC5]">
          See your exact 1-to-3-month {domainLabel.toLowerCase()} timing windows
          ahead—one subscription unlocks both{" "}
          <strong className="text-[#FDF6EE]">Career</strong> and{" "}
          <strong className="text-[#FDF6EE]">Love</strong> forecasts.
        </p>

        <div className="mt-3.5 flex items-center justify-between gap-2 rounded-xl border border-[#F5A65B]/20 bg-[#120C09]/85 px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <Lock className="h-3.5 w-3.5 shrink-0 text-[#F5A65B]" />
            <span className="truncate text-[13px] font-medium text-[#FDF6EE]">
              {domainLabel} Timing ({windowsCount} tight monthly{" "}
              {windowsCount === 1 ? "window" : "windows"})
            </span>
          </div>
          <span className="shrink-0 rounded border border-[#F5A65B]/20 bg-[#1C130E] px-2 py-0.5 font-mono text-[11px] text-[#B8A99E]">
            <span className="blur-[3px] select-none">███ – ███</span>
          </span>
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
          Includes Career &amp; Love 12-Month windows · Cancel anytime
        </p>
      </ObsidianCard>

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="12-Month Forecast Subscription"
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
              <span>12-Month Forecast · $5.99/mo</span>
            </div>

            <h3 className="mt-3 font-serif text-[25px] leading-tight text-[#FDF6EE]">
              Your Next 12 Months ($0 in Early Beta instead of $5.99/mo)
            </h3>

            <p className="mt-2 text-[13.5px] leading-relaxed text-[#B8A99E]">
              Unlock your upcoming Career and Love monthly timing windows across
              both tabs. Free to test during Early Beta.
            </p>

            <ul className="mt-4 space-y-2 text-[13px] text-[#D9CEC5]">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4ADE80]" />
                <span>
                  {careerWindowsCount ?? windowsCount} Career monthly windows +
                  Mind-Body pacing cue
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4ADE80]" />
                <span>
                  {loveWindowsCount ?? windowsCount} Love &amp; Relationship
                  timing windows
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
