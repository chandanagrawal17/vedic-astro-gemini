"use client";

import React from "react";
import { Check, Flame, Lock, ShieldAlert, Sparkles } from "lucide-react";
import { ObsidianCard } from "@/components/ui/ObsidianCard";
import { AccuracyCheck } from "@/components/blueprint/AccuracyCheck";
import type {
  HardResetDeepDivePayload,
  HardResetProofPayload,
} from "@/lib/llm/blueprintSchema";
import type { HardResetFeedback } from "@/lib/types/blueprint";

interface HardResetFreeSectionProps {
  hardReset: HardResetProofPayload;
  feedback: HardResetFeedback | null;
  onSelectFeedback: (value: HardResetFeedback) => void;
  onLockedTimelineClick: () => void;
}

export function HardResetFreeSection({
  hardReset,
  feedback,
  onSelectFeedback,
  onLockedTimelineClick,
}: HardResetFreeSectionProps) {
  return (
    <div className="space-y-4">
      {/* Primary Reset Yearly Card (Free — Yearly Ranges Only) */}
      <ObsidianCard warmTint>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#F5A65B] to-[#C8420E] shadow-[0_0_18px_rgba(255,107,43,0.45)]">
            <Flame className="h-4 w-4 text-[#0D0907]" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
            Hard Reset Pinpoint
          </span>
        </div>

        <div className="mt-4 inline-flex items-center rounded-full border border-[#FF6B2B]/40 bg-[#FF6B2B]/15 px-3.5 py-1 font-serif text-[26px] leading-none tracking-[-0.01em] text-[#FDF6EE] shadow-[0_0_24px_rgba(255,107,43,0.22)]">
          {hardReset.primaryYearRange}
        </div>

        <h2 className="mt-3 font-serif text-[23px] leading-[1.2] text-[#FDF6EE]">
          {hardReset.primaryChapterTitle}
        </h2>

        <p className="mt-2 text-[14px] leading-[1.55] text-[#D9CEC5]">
          {hardReset.introHook}
        </p>

        {/* 2–3 Sharp, Concrete Real-Life Themes */}
        <ul className="mt-3.5 space-y-2.5">
          {hardReset.concreteRealLifeThemes.map((theme, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/75 p-3 text-[13.5px] leading-[1.55] text-[#E6DDD6]"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF6B2B]" />
              <span>{theme}</span>
            </li>
          ))}
        </ul>

        {/* 1-Line What It Rewired */}
        <div className="mt-3.5 rounded-xl border border-[#4ADE80]/20 bg-[#120C09]/80 px-3.5 py-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4ADE80]">
            What It Rewired In You
          </span>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[#D9CEC5]">
            {hardReset.whatItRewired}
          </p>
        </div>

        {/* Secondary Reset Yearly Strip */}
        <div className="mt-3.5 rounded-xl border border-[#F5A65B]/20 bg-[#18100C]/85 px-3.5 py-3">
          <div className="text-[11px] font-semibold text-[#F5A65B]">
            Also detected: {hardReset.secondaryYearWindow.yearRange} ·{" "}
            {hardReset.secondaryYearWindow.chapterTitle}
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-[#B8A99E]">
            {hardReset.secondaryYearWindow.oneLineSnapshot}
          </p>
        </div>

        <AccuracyCheck initialValue={feedback} onSelect={onSelectFeedback} />
      </ObsidianCard>

      {/* Locked Tight Monthly Timeline Conversion Card */}
      <ObsidianCard>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
            <Lock className="h-3 w-3 text-[#FF6B2B]" />
            <span>Tight Monthly Timeline Detected</span>
          </span>
          <span className="rounded-full border border-[#FF6B2B]/35 bg-[#FF6B2B]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#FDF6EE]">
            {hardReset.lockedMonthlyTimelineTeaser.totalLockedFlashpoints} Flashpoints
          </span>
        </div>

        <h3 className="mt-2.5 font-serif text-[20px] leading-snug text-[#FDF6EE]">
          Want the exact 1-to-3-month pressure spikes inside these years?
        </h3>

        <div className="mt-3.5 space-y-2">
          {hardReset.lockedMonthlyTimelineTeaser.previewItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={onLockedTimelineClick}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#F5A65B]/20 bg-[#120C09]/85 px-3.5 py-2.5 text-left transition hover:border-[#FF6B2B]/55 active:scale-[0.99]"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Lock className="h-3.5 w-3.5 shrink-0 text-[#F5A65B]" />
                <span className="shrink-0 rounded-md border border-[#F5A65B]/20 bg-[#1C130E] px-2 py-0.5 font-mono text-[11px] text-[#B8A99E]">
                  <span className="blur-[3px] select-none">███ – ███</span>{" "}
                  {item.yearLabel}
                </span>
                <span className="truncate text-[13px] font-medium text-[#FDF6EE]">
                  {item.title}
                </span>
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-[#FF6B2B]">
                Unlock
              </span>
            </button>
          ))}
        </div>

        <p className="mt-3 text-[12.5px] leading-relaxed text-[#B8A99E]">
          We pinpointed{" "}
          <strong className="text-[#FDF6EE]">
            {hardReset.lockedMonthlyTimelineTeaser.totalLockedFlashpoints} exact
            1-to-3-month flashpoints
          </strong>{" "}
          across {hardReset.lockedMonthlyTimelineTeaser.lockedChaptersSpan}—plus
          the exact months of your next pressure window.{" "}
          {hardReset.lockedMonthlyTimelineTeaser.paywallCtaLine}
        </p>
      </ObsidianCard>
    </div>
  );
}

interface HardResetPaidSectionProps {
  hardReset: HardResetDeepDivePayload;
  confirmedFlashpointIds: string[];
  onToggleFlashpoint: (id: string) => void;
}

export function HardResetPaidSection({
  hardReset,
  confirmedFlashpointIds,
  onToggleFlashpoint,
}: HardResetPaidSectionProps) {
  return (
    <div className="space-y-4">
      {/* Core Evolution Thread */}
      <ObsidianCard warmTint>
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-[#FF6B2B]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
            Full Tight Monthly Timeline
          </span>
        </div>
        <p className="mt-2.5 text-[14.5px] leading-[1.6] text-[#E6DDD6]">
          {hardReset.corePatternThread}
        </p>
      </ObsidianCard>

      {/* Historical Reset Chapters with 1-to-3-Month Flashpoints */}
      {hardReset.chapters.map((chapter) => (
        <ObsidianCard key={chapter.chapterId}>
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full border border-[#FF6B2B]/35 bg-[#FF6B2B]/15 px-3 py-0.5 text-[12px] font-semibold text-[#FDF6EE]">
              {chapter.yearRange}
            </span>
            <span className="text-[11px] text-[#8E7F75]">
              {chapter.flashpoints.length} pressure spikes
            </span>
          </div>

          <h3 className="mt-2.5 font-serif text-[22px] leading-tight text-[#FDF6EE]">
            {chapter.chapterTitle}
          </h3>

          {/* Exact 1-to-3-Month Flashpoint Cards */}
          <div className="mt-3.5 space-y-2.5">
            {chapter.flashpoints.map((fp) => {
              const confirmed = confirmedFlashpointIds.includes(fp.id);
              return (
                <div
                  key={fp.id}
                  className="rounded-2xl border border-[#F5A65B]/18 bg-[#120C09]/85 p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block rounded-full border border-[#FF6B2B]/40 bg-[#FF6B2B]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#F5A65B]">
                        {fp.monthRange}
                      </span>
                      <h4 className="mt-1.5 text-[15px] font-semibold text-[#FDF6EE]">
                        {fp.title}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleFlashpoint(fp.id)}
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                        confirmed
                          ? "border-[#4ADE80]/50 bg-[#4ADE80]/15 text-[#4ADE80]"
                          : "border-[#F5A65B]/25 bg-[#1C130E] text-[#B8A99E] hover:border-[#F5A65B]/55"
                      }`}
                    >
                      <Check className="h-3 w-3" />
                      <span>{confirmed ? "Confirmed" : "This month hit"}</span>
                    </button>
                  </div>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-[#D9CEC5]">
                    {fp.realLifeEvent}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid gap-2.5">
            <div className="rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/70 p-3">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#F5A65B]">
                How It Felt Inside
              </div>
              <p className="mt-1 text-[13.5px] leading-relaxed text-[#D9CEC5]">
                {chapter.howItFeltInside}
              </p>
            </div>
            <div className="rounded-xl border border-[#4ADE80]/20 bg-[#120C09]/70 p-3">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#4ADE80]">
                What It Rewired In You
              </div>
              <p className="mt-1 text-[13.5px] leading-relaxed text-[#D9CEC5]">
                {chapter.whatItRewired}
              </p>
            </div>
          </div>
        </ObsidianCard>
      ))}

      {/* Next High-Pressure Window Prep Card */}
      <ObsidianCard warmTint>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-[#F5A65B]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
            Next High-Pressure Window Prep
          </span>
        </div>

        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#FF6B2B]/40 bg-[#FF6B2B]/15 px-3 py-1 text-[13px] font-semibold text-[#FDF6EE]">
          <Sparkles className="h-3.5 w-3.5 text-[#F5A65B]" />
          <span>{hardReset.nextPressureWindow.monthRange}</span>
        </div>

        <h3 className="mt-2 font-serif text-[22px] text-[#FDF6EE]">
          {hardReset.nextPressureWindow.windowTitle}
        </h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[#D9CEC5]">
          {hardReset.nextPressureWindow.whatToExpect}
        </p>

        <ul className="mt-3.5 space-y-2">
          {hardReset.nextPressureWindow.prepMoves.map((move, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/80 p-3 text-[13.5px] leading-relaxed text-[#E6DDD6]"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FF6B2B]/20 text-[11px] font-semibold text-[#F5A65B]">
                {idx + 1}
              </span>
              <span>{move}</span>
            </li>
          ))}
        </ul>
      </ObsidianCard>
    </div>
  );
}
