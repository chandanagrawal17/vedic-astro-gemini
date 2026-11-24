"use client";

import React, { useState } from "react";
import {
  Activity,
  Check,
  Heart,
  History,
  Lock,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { ObsidianCard } from "@/components/ui/ObsidianCard";
import type {
  RelationshipDeepDivePayload,
  RelationshipProofPayload,
} from "@/lib/llm/blueprintSchema";
import type {
  CanonicalRelationshipStatus,
  LoveAccuracyFeedback,
} from "@/lib/types/blueprint";

const STATUS_META: Record<
  CanonicalRelationshipStatus,
  { pill: string; button: string }
> = {
  single: { pill: "Single", button: "Single" },
  dating: { pill: "Dating Someone", button: "Dating Someone" },
  married: { pill: "Married", button: "Married" },
};

const LOVE_ACCURACY_OPTIONS: { value: LoveAccuracyFeedback; label: string }[] = [
  { value: "weirdly_accurate", label: "Okay, weirdly accurate" },
  { value: "pretty_close", label: "Pretty close" },
  { value: "not_really", label: "Not really" },
];

function StatusGatePanel(props: {
  activeStatus?: CanonicalRelationshipStatus;
  switchingStatus?: boolean;
  statusSwitchError?: string | null;
  onSelectStatus: (status: CanonicalRelationshipStatus) => void;
  onCancel?: () => void;
}) {
  const {
    activeStatus,
    switchingStatus = false,
    statusSwitchError = null,
    onSelectStatus,
    onCancel,
  } = props;

  return (
    <div className="rounded-2xl border border-[#F5A65B]/25 bg-[#120C09]/90 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
          Relationship Mirror
        </span>
        {onCancel && !switchingStatus && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[11px] text-[#8E7F75] hover:text-[#FDF6EE] transition"
          >
            Cancel
          </button>
        )}
      </div>

      <p className="mt-2 font-serif text-[20px] leading-snug text-[#FDF6EE]">
        Quick check so this actually fits your life right now:
      </p>

      <div className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(["single", "dating", "married"] as const).map((status) => {
          const isCurrent = activeStatus === status;
          return (
            <button
              key={status}
              type="button"
              disabled={switchingStatus}
              onClick={() => onSelectStatus(status)}
              className={`rounded-full border px-4 py-2.5 text-[13px] font-semibold transition active:scale-[0.98] disabled:opacity-60 ${
                isCurrent
                  ? "border-[#FF6B2B] bg-[#FF6B2B]/20 text-[#FDF6EE] shadow-[0_0_16px_rgba(255,107,43,0.22)]"
                  : "border-[#F5A65B]/25 bg-[#1C130E] text-[#D9CEC5] hover:border-[#FF6B2B]/55 hover:text-[#FDF6EE]"
              }`}
            >
              {STATUS_META[status].button}
            </button>
          );
        })}
      </div>

      {switchingStatus && (
        <p className="mt-3 text-[12px] text-[#F5A65B]">
          Calibrating your Relationship Mirror...
        </p>
      )}
      {statusSwitchError && (
        <p className="mt-2 text-[12px] text-[#F87171]">{statusSwitchError}</p>
      )}
    </div>
  );
}

interface RelationshipFreeSectionProps {
  relationship: RelationshipProofPayload;
  loveAccuracyFeedback: LoveAccuracyFeedback | null;
  showStatusGate?: boolean;
  switchingStatus?: boolean;
  statusSwitchError?: string | null;
  onSelectStatus: (status: CanonicalRelationshipStatus) => void;
  onOpenStatusGate: () => void;
  onCloseStatusGate: () => void;
  onSelectLoveFeedback: (value: LoveAccuracyFeedback) => void;
  onLockedRelationshipClick: () => void;
}

export function RelationshipFreeSection({
  relationship,
  loveAccuracyFeedback,
  showStatusGate = false,
  switchingStatus = false,
  statusSwitchError = null,
  onSelectStatus,
  onOpenStatusGate,
  onCloseStatusGate,
  onSelectLoveFeedback,
  onLockedRelationshipClick,
}: RelationshipFreeSectionProps) {
  const [selectedFeedback, setSelectedFeedback] =
    useState<LoveAccuracyFeedback | null>(loveAccuracyFeedback);
  const [showSavedBadge, setShowSavedBadge] = useState(false);

  const activeFeedback = loveAccuracyFeedback ?? selectedFeedback;
  const endYearMatch = /\d{4}$/.exec(relationship.lockedTimingYearLabel.trim());
  const lockedYearTail = endYearMatch ? endYearMatch[0] : "2027";

  const handleChooseFeedback = (val: LoveAccuracyFeedback) => {
    setSelectedFeedback(val);
    onSelectLoveFeedback(val);
    setShowSavedBadge(true);
    setTimeout(() => setShowSavedBadge(false), 3000);
  };

  return (
    <ObsidianCard>
      {/* Top Bar: Eyebrow + Active Status Pill + Change link */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Heart className="h-3.5 w-3.5 text-[#FF6B2B]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
            Relationship Mirror
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#FF6B2B]/35 bg-[#FF6B2B]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#FDF6EE]">
            {STATUS_META[relationship.relationshipStatus].pill}
          </span>
          <button
            type="button"
            onClick={onOpenStatusGate}
            className="text-[11px] font-medium text-[#8E7F75] underline decoration-[#8E7F75]/40 underline-offset-2 hover:text-[#FDF6EE] transition"
          >
            Change
          </button>
        </div>
      </div>

      {showStatusGate ? (
        <div className="mt-4">
          <StatusGatePanel
            activeStatus={relationship.relationshipStatus}
            switchingStatus={switchingStatus}
            statusSwitchError={statusSwitchError}
            onSelectStatus={onSelectStatus}
            onCancel={onCloseStatusGate}
          />
        </div>
      ) : (
        <>
          {/* Lovable Contradiction Headline */}
          <h3 className="mt-3 font-serif text-[25px] leading-[1.18] text-[#FDF6EE]">
            &ldquo;{relationship.lovableContradictionHeadline}&rdquo;
          </h3>

          {/* 3 Caught-Red-Handed Cards */}
          <div className="mt-4 space-y-2.5">
            {/* Card A: Texting / Everyday Tell */}
            <div className="rounded-2xl border border-[#F5A65B]/18 bg-[#120C09]/85 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5A65B]">
                <MessageCircle className="h-3.5 w-3.5 text-[#FF6B2B]" />
                <span>Your Everyday Tell</span>
              </div>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#E6DDD6]">
                {relationship.caughtRedHandedTell}
              </p>
            </div>

            {/* Card B: Somatic Body Tell */}
            <div className="rounded-2xl border border-[#F5A65B]/18 bg-[#120C09]/85 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5A65B]">
                <Activity className="h-3.5 w-3.5 text-[#FF6B2B]" />
                <span>Your Body Tell</span>
              </div>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#E6DDD6]">
                {relationship.somaticBodyTell}
              </p>
            </div>

            {/* Card C: Past Love Shift (Yearly Range Only) + 1-Tap Accuracy Check */}
            <div className="rounded-2xl border border-[#FF6B2B]/28 bg-[#18100C]/90 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5A65B]">
                  <History className="h-3.5 w-3.5 text-[#FF6B2B]" />
                  <span>Your Past Love Shift</span>
                </div>
                <span className="rounded-full border border-[#FF6B2B]/40 bg-[#FF6B2B]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#FDF6EE]">
                  {relationship.pastLoveShift.yearRange}
                </span>
              </div>

              <p className="mt-2 text-[13.5px] leading-relaxed text-[#E6DDD6]">
                {relationship.pastLoveShift.whatShifted}
              </p>

              {/* 1-Tap Love Mirror Accuracy Check */}
              <div className="mt-3.5 border-t border-[#F5A65B]/15 pt-3">
                <p className="text-[12px] font-medium text-[#B8A99E]">
                  {relationship.pastLoveShift.accuracyPrompt}
                </p>

                <div className="mt-2.5 flex flex-wrap gap-2">
                  {LOVE_ACCURACY_OPTIONS.map((opt) => {
                    const isSelected = activeFeedback === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleChooseFeedback(opt.value)}
                        className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition active:scale-[0.97] ${
                          isSelected
                            ? "border-[#FF6B2B] bg-[#FF6B2B]/20 text-[#FDF6EE] shadow-[0_0_14px_rgba(255,107,43,0.28)]"
                            : "border-[#F5A65B]/20 bg-[#120C09]/75 text-[#B8A99E] hover:border-[#F5A65B]/45 hover:text-[#FDF6EE]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {showSavedBadge && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-[#FF6B2B]/30 bg-[#FF6B2B]/15 px-3 py-1 text-[11px] text-[#F5A65B]">
                    <Check className="h-3 w-3" />
                    <span>Logged—locking your pattern thread</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Half-Unlocked Cliffhanger + Locked Teaser Box */}
          <div className="mt-4 rounded-2xl border border-[#FF6B2B]/30 bg-gradient-to-br from-[#23140C]/90 to-[#140D09]/95 p-4">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#4ADE80]">
              What Instantly Sparks You
            </div>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#E6DDD6]">
              {relationship.halfUnlockedCliffhanger.unlockedHalf}
            </p>

            <button
              type="button"
              onClick={onLockedRelationshipClick}
              className="mt-3.5 w-full space-y-2 rounded-xl border border-[#F5A65B]/20 bg-[#120C09]/85 p-3 text-left transition hover:border-[#FF6B2B]/60 active:scale-[0.99]"
            >
              <div className="flex items-start gap-2 text-[12.5px] font-medium text-[#FDF6EE]">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF6B2B]" />
                <span>{relationship.halfUnlockedCliffhanger.lockedHalfTeaser}</span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F5A65B]/12 pt-2 text-[12px] text-[#D9CEC5]">
                <div className="flex items-center gap-2">
                  <Lock className="h-3 w-3 shrink-0 text-[#F5A65B]" />
                  <span>
                    Your Best Months Ahead ({relationship.lockedTimingYearLabel}):{" "}
                    <span className="rounded border border-[#F5A65B]/20 bg-[#1C130E] px-1.5 py-0.5 font-mono text-[11px]">
                      <span className="blur-[3px] select-none">███ – ███</span>{" "}
                      {lockedYearTail}
                    </span>
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-[#FF6B2B]">
                  Unlock &rarr;
                </span>
              </div>
            </button>
          </div>

          {/* Quiet Footer Change Status */}
          <div className="mt-3 flex items-center justify-end">
            <button
              type="button"
              onClick={onOpenStatusGate}
              className="text-[11.5px] text-[#8E7F75] hover:text-[#FDF6EE] transition"
            >
              Change status
            </button>
          </div>
        </>
      )}
    </ObsidianCard>
  );
}

interface RelationshipPaidSectionProps {
  paidRelationship: RelationshipDeepDivePayload;
  switchingStatus?: boolean;
  statusSwitchError?: string | null;
  onSelectStatus: (status: CanonicalRelationshipStatus) => void;
}

export function RelationshipPaidSection({
  paidRelationship,
  switchingStatus = false,
  statusSwitchError = null,
  onSelectStatus,
}: RelationshipPaidSectionProps) {
  const [editingStatus, setEditingStatus] = useState(false);

  const handleStatusPick = (nextStatus: CanonicalRelationshipStatus) => {
    setEditingStatus(false);
    onSelectStatus(nextStatus);
  };

  return (
    <div className="space-y-4">
      {/* Header Status Switch Bar */}
      <ObsidianCard>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-[#FF6B2B]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
              Relationship Mirror ·{" "}
              {STATUS_META[paidRelationship.relationshipStatus].pill}
            </span>
          </div>

          <button
            type="button"
            disabled={switchingStatus}
            onClick={() => setEditingStatus((prev) => !prev)}
            className="text-[11.5px] font-medium text-[#B8A99E] underline decoration-[#B8A99E]/40 underline-offset-2 hover:text-[#FDF6EE] transition"
          >
            {editingStatus ? "Close" : "Change status"}
          </button>
        </div>

        {(editingStatus || switchingStatus || statusSwitchError) && (
          <div className="mt-3">
            <StatusGatePanel
              activeStatus={paidRelationship.relationshipStatus}
              switchingStatus={switchingStatus}
              statusSwitchError={statusSwitchError}
              onSelectStatus={handleStatusPick}
              onCancel={() => setEditingStatus(false)}
            />
          </div>
        )}
      </ObsidianCard>

      {/* SINGLE BRANCH */}
      {paidRelationship.relationshipStatus === "single" && (
        <>
          <ObsidianCard warmTint>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
              Spark vs. Staying Power
            </span>

            <div className="mt-3 space-y-2.5">
              <div className="rounded-xl border border-[#F5A65B]/18 bg-[#120C09]/80 p-3.5">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#F5A65B]">
                  Who Catches Your Eye
                </div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[#E6DDD6]">
                  {paidRelationship.sparkVsPeace.whoCatchesYourEye}
                </p>
              </div>

              <div className="rounded-xl border border-[#F59E0B]/22 bg-[#120C09]/80 p-3.5">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#F59E0B]">
                  The Gap That Drains You
                </div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[#D9CEC5]">
                  {paidRelationship.sparkVsPeace.whereTheGapHides}
                </p>
              </div>

              <div className="rounded-xl border border-[#F87171]/25 bg-[#120C09]/80 p-3.5">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#F87171]">
                  What to Stop Excusing
                </div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[#D9CEC5]">
                  {paidRelationship.sparkVsPeace.whatToStopExcusing}
                </p>
              </div>
            </div>
          </ObsidianCard>

          <ObsidianCard>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F59E0B]">
              Your #1 Single Blind Spot
            </span>
            <h3 className="mt-1.5 font-serif text-[23px] text-[#FDF6EE]">
              {paidRelationship.singleBlindSpot.loopName}
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-[#D9CEC5]">
              {paidRelationship.singleBlindSpot.howItPlaysOut}
            </p>

            <div className="mt-3.5 rounded-xl border border-[#4ADE80]/25 bg-[#120C09]/85 p-3.5">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#4ADE80]">
                Warm Mentor Reset
              </div>
              <p className="mt-1 text-[13.5px] leading-relaxed text-[#E6DDD6]">
                {paidRelationship.singleBlindSpot.gentleMentorReset}
              </p>
            </div>
          </ObsidianCard>

          <ObsidianCard>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#4ADE80]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4ADE80]">
                Your Real Green-Flag Body Check
              </span>
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-[#E6DDD6]">
              {paidRelationship.greenFlagBodyCheck}
            </p>
          </ObsidianCard>
        </>
      )}

      {/* DATING BRANCH */}
      {paidRelationship.relationshipStatus === "dating" && (
        <>
          <ObsidianCard warmTint>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
              Real Alignment Check
            </span>
            <p className="mt-2 text-[14px] leading-relaxed text-[#E6DDD6]">
              {paidRelationship.realAlignmentCheck.sparkVsPace}
            </p>

            <div className="mt-3.5 space-y-2">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#4ADE80]">
                3 Clear Signs You&rsquo;re Actually Aligned
              </div>
              {paidRelationship.realAlignmentCheck.threeAlignmentSigns.map(
                (signText, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-[#4ADE80]/20 bg-[#120C09]/80 p-3"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4ADE80]" />
                    <span className="text-[13.5px] leading-relaxed text-[#D9CEC5]">
                      {signText}
                    </span>
                  </div>
                )
              )}
            </div>
          </ObsidianCard>

          <ObsidianCard>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F59E0B]">
              Your Early-Dating Friction Loop
            </span>
            <h3 className="mt-1.5 font-serif text-[23px] text-[#FDF6EE]">
              {paidRelationship.earlyDatingFriction.loopName}
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-[#D9CEC5]">
              {paidRelationship.earlyDatingFriction.howItShowsUp}
            </p>

            <div className="mt-3.5 rounded-xl border border-[#FF6B2B]/30 bg-[#18100C]/90 p-3.5">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#F5A65B]">
                The 10-Second Shift
              </div>
              <p className="mt-1 text-[13.5px] leading-relaxed text-[#FDF6EE]">
                {paidRelationship.earlyDatingFriction.tenSecondShift}
              </p>
            </div>
          </ObsidianCard>

          <ObsidianCard>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
              Pacing &amp; Boundary Playbook
            </span>
            <p className="mt-2 text-[14px] leading-relaxed text-[#D9CEC5]">
              {paidRelationship.pacingAndBoundariesTip}
            </p>
          </ObsidianCard>
        </>
      )}

      {/* MARRIED BRANCH */}
      {paidRelationship.relationshipStatus === "married" && (
        <>
          <ObsidianCard warmTint>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
              Where You Click vs. Silent Friction
            </span>

            <div className="mt-3 space-y-2.5">
              <div className="rounded-xl border border-[#4ADE80]/22 bg-[#120C09]/80 p-3.5">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#4ADE80]">
                  Where You Truly Click
                </div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[#E6DDD6]">
                  {paidRelationship.marriageBlueprint.whereYouTrulyClick}
                </p>
              </div>

              <div className="rounded-xl border border-[#F59E0B]/25 bg-[#120C09]/80 p-3.5">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#F59E0B]">
                  The Silent Friction Point
                </div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[#D9CEC5]">
                  {paidRelationship.marriageBlueprint.silentFrictionPoint}
                </p>
              </div>
            </div>
          </ObsidianCard>

          <ObsidianCard>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
              Leaving Outside Stress at the Door
            </span>
            <p className="mt-2 text-[14px] leading-relaxed text-[#D9CEC5]">
              {paidRelationship.marriageBlueprint.leavingOutsideStressAtDoor}
            </p>
          </ObsidianCard>

          <ObsidianCard>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF6B2B]">
              The 10-Second Shift
            </span>

            <div className="mt-3 rounded-xl border border-[#FF6B2B]/35 bg-[#18100C]/90 p-3.5">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#F5A65B]">
                Exact Phrasing to Try
              </div>
              <p className="mt-1.5 font-serif text-[18px] leading-snug text-[#FDF6EE]">
                {paidRelationship.tenSecondShift.exactPhraseToTry}
              </p>
            </div>

            <p className="mt-3 text-[13.5px] leading-relaxed text-[#D9CEC5]">
              {paidRelationship.tenSecondShift.whyItSoftensTheRoom}
            </p>
          </ObsidianCard>
        </>
      )}
    </div>
  );
}
