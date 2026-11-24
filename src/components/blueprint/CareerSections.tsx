"use client";

import React from "react";
import {
  Bookmark,
  Briefcase,
  CalendarClock,
  Compass,
  Eye,
  HeartPulse,
  Lock,
  Sparkles,
  Wallet,
} from "lucide-react";
import { ObsidianCard } from "@/components/ui/ObsidianCard";
import { AlignmentMeter } from "@/components/blueprint/AlignmentMeter";
import { ForecastSubscriptionCard } from "@/components/blueprint/ForecastSubscriptionCard";
import type {
  CareerDeepDivePayload,
  CareerProofPayload,
} from "@/lib/llm/blueprintSchema";
import type { EntryHook } from "@/lib/types/blueprint";

interface CareerFreeSectionProps {
  career: CareerProofPayload;
  isTransition?: boolean;
  onLockedCareerClick: () => void;
}

export function CareerFreeSection({
  career,
  isTransition = false,
  onLockedCareerClick,
}: CareerFreeSectionProps) {
  return (
    <ObsidianCard>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
          Career &amp; Path Audit
        </span>
      </div>

      {/* Hero Alignment Meter */}
      <AlignmentMeter
        score={career.currentPathFitScore}
        subtitle={career.fitHeadline}
      />

      {/* Sweet Spot Pill */}
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#FF6B2B]/35 bg-[#FF6B2B]/12 px-3 py-1 text-[11.5px] font-semibold text-[#FDF6EE]">
        <Sparkles className="h-3 w-3 shrink-0 text-[#F5A65B]" />
        <span>Your Sweet Spot: {career.sweetSpotLabel}</span>
      </div>

      {/* 3 Warm Mentor Observations */}
      <div className="mt-4 space-y-2.5">
        <div className="rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/80 p-3.5">
          <div className="text-[11px] font-semibold text-[#F5A65B]">
            Why you&apos;re so good at what you do
          </div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[#D9CEC5]">
            {career.whyYouAreGood}
          </p>
        </div>

        <div className="rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/80 p-3.5">
          <div className="text-[11px] font-semibold text-[#F5A65B]">
            {isTransition
              ? "Why your last chapter felt outgrown"
              : "Why it still feels a little empty"}
          </div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[#D9CEC5]">
            {career.whyItFeelsEmptyOrShifting}
          </p>
        </div>

        <div className="rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/80 p-3.5">
          <div className="text-[11px] font-semibold text-[#F5A65B]">
            How people at work actually see you
          </div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[#D9CEC5]">
            {career.howWorkSeesYou}
          </p>
        </div>
      </div>

      {/* Locked Paid Teaser Strip (Zero Leaked Scores or Months) */}
      <button
        type="button"
        onClick={onLockedCareerClick}
        className="mt-4 w-full rounded-2xl border border-[#FF6B2B]/30 bg-gradient-to-br from-[#23140C]/90 to-[#140D09]/95 p-4 text-left transition hover:border-[#FF6B2B]/65 active:scale-[0.99]"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
            <Lock className="h-3 w-3 text-[#FF6B2B]" />
            <span>Full Career Guide Locked</span>
          </span>
          <span className="text-[11px] font-semibold text-[#FF6B2B]">
            Unlock →
          </span>
        </div>

        {/* Blurred 3-Path Comparison Bars */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: "9–5" },
            { label: "Going Solo" },
            { label: "Building on the Side First" },
          ].map((bar) => (
            <div
              key={bar.label}
              className="flex flex-col justify-between rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/85 px-2 py-2 text-center"
            >
              <div className="text-[10px] leading-tight text-[#8E7F75]">
                {bar.label}
              </div>
              <div className="mt-1 font-mono text-[14px] font-semibold text-[#FDF6EE]">
                <span className="blur-[3.5px] select-none">██</span>%
              </div>
            </div>
          ))}
        </div>

        {/* 3 Locked Checklist Teasers */}
        <ul className="mt-3 space-y-1.5 text-[12.5px] text-[#D9CEC5]">
          <li className="flex items-center gap-2">
            <Lock className="h-3 w-3 shrink-0 text-[#F5A65B]" />
            <span>
              {career.lockedTeaser.fieldAuditQuestion}{" "}
              <span className="text-[#8E7F75]">
                (+ {career.lockedTeaser.alternativeLanesCount} hidden alternative
                lanes)
              </span>
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Lock className="h-3 w-3 shrink-0 text-[#F5A65B]" />
            <span>
              How money grows for you (and the quiet habit costing you income)
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Lock className="h-3 w-3 shrink-0 text-[#F5A65B]" />
            <span>
              Your Best Months Ahead:{" "}
              <span className="rounded border border-[#F5A65B]/20 bg-[#1C130E] px-1.5 py-0.5 font-mono text-[11px]">
                <span className="blur-[3px] select-none">███ – ███</span>{" "}
                {career.lockedTeaser.timingYearLabel}
              </span>
            </span>
          </li>
        </ul>

        <p className="mt-2.5 text-[11.5px] text-[#B8A99E]">
          {career.lockedTeaser.paywallCtaLine}
        </p>
      </button>
    </ObsidianCard>
  );
}

interface CareerPaidSectionProps {
  freeCareer: CareerProofPayload;
  paidCareer: CareerDeepDivePayload;
  savedAlternativeLanes: string[];
  onToggleLane: (laneId: string) => void;
  isForecastSubscribed?: boolean;
  loveWindowsCount?: number;
  chartId?: string;
  sessionToken?: string;
  email?: string;
  entryHook?: EntryHook | null;
  onToggleForecastSubscription?: (active: boolean) => void;
}

export function CareerPaidSection({
  freeCareer,
  paidCareer,
  savedAlternativeLanes,
  onToggleLane,
  isForecastSubscribed = false,
  loveWindowsCount,
  chartId,
  sessionToken,
  email,
  entryHook,
  onToggleForecastSubscription,
}: CareerPaidSectionProps) {
  return (
    <div className="space-y-4">
      {/* 1. Day Job vs. Doing Your Own Thing (3-Path Scorecard) */}
      <ObsidianCard warmTint>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-[#FF6B2B]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
              Day Job vs. Doing Your Own Thing
            </span>
          </div>
        </div>

        <p className="mt-2 text-[12.5px] text-[#B8A99E]">
          Sweet Spot:{" "}
          <span className="font-semibold text-[#FDF6EE]">
            {freeCareer.sweetSpotLabel}
          </span>
        </p>

        <div className="mt-3.5 space-y-3">
          {paidCareer.pathComparison.map((path) => (
            <div
              key={path.pathKey}
              className={`rounded-2xl border p-3.5 ${
                path.isRecommended
                  ? "border-[#FF6B2B] bg-[#24140B]/90 shadow-[0_0_24px_rgba(255,107,43,0.18)]"
                  : "border-[#F5A65B]/15 bg-[#120C09]/80"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-[#FDF6EE]">
                    {path.pathLabel}
                  </span>
                  {path.isRecommended && (
                    <span className="rounded-full bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#0D0907]">
                      Best Fit Now
                    </span>
                  )}
                </div>
                <span className="font-serif text-[22px] font-semibold text-[#FDF6EE]">
                  {path.fitScore}%
                </span>
              </div>

              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#241913]">
                <div
                  className={`h-full rounded-full ${
                    path.isRecommended
                      ? "bg-gradient-to-r from-[#FF6B2B] to-[#F5A65B]"
                      : "bg-[#F5A65B]/55"
                  }`}
                  style={{ width: `${path.fitScore}%` }}
                />
              </div>

              <p className="mt-2.5 text-[13.5px] leading-relaxed text-[#D9CEC5]">
                {path.honestMentorTake}
              </p>
            </div>
          ))}
        </div>
      </ObsidianCard>

      {/* 2. Field Audit Card */}
      <ObsidianCard>
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-[#F5A65B]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
            Field Audit
          </span>
        </div>
        <h3 className="mt-1.5 font-serif text-[22px] text-[#FDF6EE]">
          Does {paidCareer.fieldAudit.statedFieldLabel} actually fit you?
        </h3>

        <div className="mt-3.5 space-y-2.5">
          <div className="rounded-xl border border-[#4ADE80]/20 bg-[#120C09]/80 p-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4ADE80]">
              What Fits You Like a Glove
            </div>
            <p className="mt-1 text-[13.5px] leading-relaxed text-[#D9CEC5]">
              {paidCareer.fieldAudit.whatFitsLikeAGlove}
            </p>
          </div>
          <div className="rounded-xl border border-[#F59E0B]/20 bg-[#120C09]/80 p-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F59E0B]">
              What&apos;s Missing
            </div>
            <p className="mt-1 text-[13.5px] leading-relaxed text-[#D9CEC5]">
              {paidCareer.fieldAudit.whatIsMissing}
            </p>
          </div>
          <div className="rounded-xl border border-[#FF6B2B]/25 bg-[#120C09]/80 p-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#FF6B2B]">
              Your Best Next Step
            </div>
            <p className="mt-1 text-[13.5px] leading-relaxed text-[#E6DDD6]">
              {paidCareer.fieldAudit.yourBestNextStep}
            </p>
          </div>
        </div>
      </ObsidianCard>

      {/* 3. Hidden Alternative Lanes (Bookmarkable) */}
      <ObsidianCard>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
            Hidden Alternative Lanes
          </span>
          <span className="text-[11px] text-[#8E7F75]">Tap to save</span>
        </div>

        <div className="mt-3 space-y-2.5">
          {paidCareer.hiddenAlternativeLanes.map((lane) => {
            const saved = savedAlternativeLanes.includes(lane.laneId);
            return (
              <div
                key={lane.laneId}
                className="rounded-2xl border border-[#F5A65B]/15 bg-[#120C09]/80 p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-[14.5px] font-semibold text-[#FDF6EE]">
                    {lane.laneName}
                  </h4>
                  <button
                    type="button"
                    onClick={() => onToggleLane(lane.laneId)}
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                      saved
                        ? "border-[#FF6B2B]/55 bg-[#FF6B2B]/15 text-[#F5A65B]"
                        : "border-[#F5A65B]/25 bg-[#1C130E] text-[#B8A99E] hover:border-[#F5A65B]/50"
                    }`}
                  >
                    <Bookmark
                      className={`h-3 w-3 ${saved ? "fill-[#F5A65B]" : ""}`}
                    />
                    <span>{saved ? "Saved" : "Save"}</span>
                  </button>
                </div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#D9CEC5]">
                  {lane.whyItFitsYou}
                </p>
              </div>
            );
          })}
        </div>
      </ObsidianCard>

      {/* 4. Who You Really Are vs. How Work Sees You */}
      <ObsidianCard>
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-[#F5A65B]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
            Who You Really Are vs. How Work Sees You
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/80 p-3.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#F5A65B]">
              Inside Your Head
            </div>
            <p className="mt-1 text-[13.5px] leading-relaxed text-[#D9CEC5]">
              {paidCareer.perceptionGap.insideYourHead}
            </p>
          </div>
          <div className="rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/80 p-3.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#B8A99E]">
              What Coworkers See
            </div>
            <p className="mt-1 text-[13.5px] leading-relaxed text-[#D9CEC5]">
              {paidCareer.perceptionGap.whatCoworkersSee}
            </p>
          </div>
        </div>

        <div className="mt-2.5 rounded-xl border border-[#4ADE80]/20 bg-[#120C09]/85 p-3.5">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#4ADE80]">
            1 Simple Shift To Try
          </div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[#E6DDD6]">
            {paidCareer.perceptionGap.simpleShiftToTry}
          </p>
        </div>
      </ObsidianCard>

      {/* 5. How Money Grows & Quiet Leak */}
      <ObsidianCard>
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-[#F5A65B]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
            How Money Grows For You
          </span>
        </div>

        <div className="mt-3 space-y-2.5">
          <div className="rounded-xl border border-[#4ADE80]/20 bg-[#120C09]/80 p-3.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#4ADE80]">
              What Compounds Wealth
            </div>
            <p className="mt-1 text-[13.5px] leading-relaxed text-[#D9CEC5]">
              {paidCareer.moneyAndLeaks.howMoneyGrowsForYou}
            </p>
          </div>
          <div className="rounded-xl border border-[#F87171]/25 bg-[#120C09]/80 p-3.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#F87171]">
              The Quiet Habit Costing You
            </div>
            <p className="mt-1 text-[13.5px] leading-relaxed text-[#D9CEC5]">
              {paidCareer.moneyAndLeaks.quietHabitCostingYou}
            </p>
          </div>
        </div>
      </ObsidianCard>

      {/* 6. Your Next 12 Months ($5.99/mo Subscription Gate) */}
      {isForecastSubscribed ? (
        <ObsidianCard warmTint>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-[#FF6B2B]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                Your Next 12 Months
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[#4ADE80]/40 bg-[#4ADE80]/15 px-2 py-0.5 text-[10px] font-semibold text-[#4ADE80]">
                Active · $5.99/mo
              </span>
              {onToggleForecastSubscription && (
                <button
                  type="button"
                  onClick={() => onToggleForecastSubscription(false)}
                  className="text-[10.5px] text-[#8E7F75] underline decoration-[#8E7F75]/40 underline-offset-2 hover:text-[#FDF6EE] transition"
                >
                  Preview Locked
                </button>
              )}
            </div>
          </div>

          <p className="mt-2.5 text-[14.5px] leading-relaxed text-[#FDF6EE]">
            {paidCareer.next12Months.bigPictureSummary}
          </p>

          {paidCareer.next12Months.tightMonthlyWindows.length > 0 && (
            <div className="mt-3.5 space-y-2.5">
              {paidCareer.next12Months.tightMonthlyWindows.map((win) => (
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
      ) : (
        <ForecastSubscriptionCard
          heading="Your Next 12 Months"
          domainLabel="Career"
          windowsCount={paidCareer.next12Months.tightMonthlyWindows.length}
          careerWindowsCount={paidCareer.next12Months.tightMonthlyWindows.length}
          loveWindowsCount={loveWindowsCount}
          chartId={chartId}
          sessionToken={sessionToken}
          email={email}
          entryHook={entryHook}
          onActivateSubscription={() => onToggleForecastSubscription?.(true)}
        />
      )}
    </div>
  );
}
