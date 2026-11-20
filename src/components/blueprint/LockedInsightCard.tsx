import React from "react";
import { Lock } from "lucide-react";

interface LockedInsightCardProps {
  eyebrow: string;
  headline: string;
  ctaLabel?: string;
  onUnlockClick?: () => void;
}

export function LockedInsightCard({
  eyebrow,
  headline,
  ctaLabel = "Unlock with Full Blueprint",
  onUnlockClick,
}: LockedInsightCardProps) {
  return (
    <div className="relative mt-4 overflow-hidden rounded-2xl border border-[#F5A65B]/15 bg-[#120C09]/80 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
        {eyebrow}
      </p>
      <p className="mt-1 font-serif text-[18px] leading-snug text-[#FDF6EE]">
        {headline}
      </p>

      {/* Dummy placeholder skeleton copy — never real secret text in the DOM */}
      <div
        aria-hidden="true"
        className="mt-3 space-y-2 select-none blur-[6px] opacity-45 pointer-events-none"
      >
        <p className="text-[13px] leading-relaxed text-[#D9CEC5]">
          Your primary leverage sits where independent execution meets structured
          long-term systems rather than reactive short cycles.
        </p>
        <p className="text-[13px] leading-relaxed text-[#D9CEC5]">
          Shifting focus away from consensus-driven tasks unlocks higher clarity
          and steady momentum over the next twelve months.
        </p>
      </div>

      {/* Frosted Lock Pill Overlay */}
      <div className="absolute inset-x-0 bottom-3 flex justify-center px-4">
        <button
          type="button"
          onClick={onUnlockClick}
          className="inline-flex items-center gap-2 rounded-full border border-[#F5A65B]/35 bg-[#1C130E]/90 px-4 py-2 text-[12px] font-medium text-[#FDF6EE] shadow-[0_8px_24px_rgba(0,0,0,0.6)] backdrop-blur-md transition hover:border-[#FF6B2B]/70 active:scale-[0.98]"
        >
          <Lock className="h-3.5 w-3.5 text-[#F5A65B]" />
          <span>{ctaLabel}</span>
        </button>
      </div>
    </div>
  );
}
