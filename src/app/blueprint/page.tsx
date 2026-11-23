"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Briefcase,
  Clock,
  Flame,
  Heart,
  Lock,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { SolarShell } from "@/components/ui/SolarShell";
import { ObsidianCard } from "@/components/ui/ObsidianCard";
import { SolarOrbHero } from "@/components/ui/SolarOrbHero";
import { LifeChaptersArc } from "@/components/blueprint/LifeChaptersArc";
import { AlignmentMeter } from "@/components/blueprint/AlignmentMeter";
import {
  BlueprintFreePayload,
  BlueprintPaidPayload,
  BlueprintSession,
  HardResetFeedback,
  HookKey,
  OnboardingInput,
} from "@/lib/types/blueprint";
import {
  addReflection,
  loadSession,
  loadStoredSession,
  saveSynthesizedSession,
} from "@/lib/store/sessionStore";
import { DEFAULT_ONBOARDING_INPUT } from "@/lib/mock/blueprintMock";

type HubTab = "overview" | "eras" | "career" | "love" | "blind_spot";

const TABS: { id: HubTab; label: string; hookKey: HookKey }[] = [
  { id: "overview", label: "Overview", hookKey: "hard_reset" },
  { id: "eras", label: "Eras", hookKey: "eras" },
  { id: "career", label: "Career", hookKey: "career" },
  { id: "love", label: "Love", hookKey: "relationship" },
  { id: "blind_spot", label: "Blind Spot", hookKey: "self_sabotage" },
];

interface BlueprintApiResponse {
  chartId: string;
  sessionId: string;
  sessionToken: string;
  moonBoundaryFlag?: boolean;
  modelVersion?: string | null;
  isUnlocked: boolean;
  unlockTier?: "one_time_19" | "annual_39" | null;
  accuracyFeedback?: HardResetFeedback | null;
  hook_proof_json: BlueprintFreePayload;
  full_blueprint_json: BlueprintPaidPayload | null;
  input?: OnboardingInput;
  error?: string;
}

function BlueprintLoadingSkeleton() {
  return (
    <SolarShell showDisclaimer={false}>
      <div className="flex-1 px-5 pt-7 pb-12 space-y-5">
        <div className="flex flex-col items-center">
          <SolarOrbHero size="sm" />
          <div className="mt-3 h-7 w-48 rounded-lg bg-[#FDF6EE]/10 animate-pulse" />
          <div className="mt-2 h-3.5 w-36 rounded-full bg-[#B8A99E]/15 animate-pulse" />
        </div>
        <div className="h-10 w-full rounded-xl bg-[#1C130E]/80 animate-pulse" />
        <ObsidianCard warmTint>
          <div className="h-4 w-36 rounded-full bg-[#F5A65B]/15 animate-pulse" />
          <div className="mt-4 h-8 w-44 rounded-lg bg-[#FDF6EE]/10 animate-pulse" />
          <div className="mt-4 space-y-2">
            <div className="h-3.5 w-full rounded bg-[#D9CEC5]/10 animate-pulse" />
            <div className="h-3.5 w-5/6 rounded bg-[#D9CEC5]/10 animate-pulse" />
            <div className="h-3.5 w-4/6 rounded bg-[#D9CEC5]/10 animate-pulse" />
          </div>
        </ObsidianCard>
      </div>
    </SolarShell>
  );
}

function BlueprintHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryTargetId =
    searchParams.get("session") || searchParams.get("chartId");

  const [session, setSession] = useState<BlueprintSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HubTab>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [newTime, setNewTime] = useState("08:30");
  const [refreshingTime, setRefreshingTime] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const loadBlueprint = useCallback(async (targetId: string) => {
    setErrorMsg(null);
    setLoading(true);
    const stored = loadStoredSession(targetId);

    try {
      const tokenParam = stored?.sessionToken
        ? `?sessionToken=${encodeURIComponent(stored.sessionToken)}`
        : "";
      const res = await fetch(
        `/api/blueprint/${encodeURIComponent(targetId)}${tokenParam}`
      );
      const data = (await res.json()) as BlueprintApiResponse;
      if (!res.ok) {
        throw new Error(data.error || "Unable to load your Blueprint.");
      }

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
          moonBoundaryFlag: data.moonBoundaryFlag,
          hardResetFeedback: data.accuracyFeedback,
          modelVersion: data.modelVersion,
        }
      );
      setSession(hydrated);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Unable to load your Blueprint."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = loadStoredSession();
    const targetId =
      queryTargetId || stored?.chartId || stored?.sessionId || null;

    if (!targetId || targetId === "demo-session") {
      setSession(loadSession("demo-session"));
      setLoading(false);
      return;
    }

    void loadBlueprint(targetId);
  }, [queryTargetId, loadBlueprint]);

  if (loading) {
    return <BlueprintLoadingSkeleton />;
  }

  if (!session && errorMsg) {
    const retryId = queryTargetId || loadStoredSession()?.chartId || loadStoredSession()?.sessionId;
    return (
      <SolarShell showDisclaimer={false}>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="w-full max-w-[340px] rounded-[22px] border border-[#F5A65B]/20 bg-[#1C130E]/85 p-6">
            <p className="font-serif text-[22px] text-[#FDF6EE]">
              Unable to Open Blueprint
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#B8A99E]">
              {errorMsg}
            </p>
            {retryId && (
              <button
                type="button"
                onClick={() => void loadBlueprint(retryId)}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 px-5 font-sans text-[14px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B]"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>
      </SolarShell>
    );
  }

  if (!session) {
    return <BlueprintLoadingSkeleton />;
  }

  const { input, freePayload, paidPayload, reflections } = session;

  // Enforce paywall state: if server redacted full_blueprint_json, never show mock data
  if (!paidPayload) {
    return (
      <SolarShell>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="w-full max-w-[360px] rounded-[24px] border border-[#F5A65B]/25 bg-[#1C130E]/85 p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FF6B2B]/15 border border-[#FF6B2B]/35 text-[#F5A65B]">
              <Lock className="h-5 w-5" />
            </div>
            <h1 className="mt-4 font-serif text-[26px] leading-tight text-[#FDF6EE]">
              {input.firstName}&rsquo;s Full Blueprint Is Locked
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-[#B8A99E]">
              Unlock your complete 5-module Blueprint to access your full Hard
              Reset analysis, Era 3 Playbook, Career Verdict, Relationship
              Shifts, and Self-Sabotage Antidote.
            </p>
            <button
              type="button"
              onClick={() => router.push(`/unlock/${session.sessionId}`)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 px-6 font-sans text-[15px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] shadow-[0_8px_28px_-6px_rgba(255,107,43,0.5)] active:scale-[0.98] transition"
            >
              <Sparkles className="h-4 w-4" />
              <span>Unlock Full Blueprint</span>
            </button>
          </div>
        </div>
      </SolarShell>
    );
  }

  const currentTabConfig = TABS.find((t) => t.id === activeTab)!;
  const tabReflections = reflections.filter(
    (r) => r.hookKey === currentTabConfig.hookKey
  );

  const handleSaveReflection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    const updated = addReflection(currentTabConfig.hookKey, noteInput);
    setSession(updated);
    setNoteInput("");
    setDrawerOpen(false);
  };

  const handleRefreshBirthTime = async (e: React.FormEvent) => {
    e.preventDefault();
    setRefreshError(null);
    setRefreshingTime(true);

    try {
      const updatedInput: OnboardingInput = {
        ...session.input,
        precisionMode: "exact",
        birthTime: newTime,
        birthWindow: null,
      };

      const calcRes = await fetch("/api/charts/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updatedInput,
          sessionToken: session.sessionToken ?? session.sessionId,
        }),
      });
      const calcData = (await calcRes.json()) as {
        chartId?: string;
        sessionToken?: string;
        error?: string;
      };
      if (!calcRes.ok || !calcData.chartId) {
        throw new Error(calcData.error || "Failed to recalculate chart.");
      }

      const synthRes = await fetch("/api/blueprint/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chartId: calcData.chartId,
          sessionToken: calcData.sessionToken,
          email: updatedInput.email,
          firstName: updatedInput.firstName,
          relationshipStatus: updatedInput.relationshipStatus,
          careerMode: updatedInput.careerMode,
          careerField: updatedInput.careerField,
        }),
      });
      const synthData = (await synthRes.json()) as BlueprintApiResponse;
      if (!synthRes.ok) {
        throw new Error(
          synthData.error || "Failed to refresh Blueprint synthesis."
        );
      }

      const refreshed = saveSynthesizedSession(updatedInput, {
        chartId: synthData.chartId,
        sessionId: synthData.sessionId,
        sessionToken: synthData.sessionToken,
        freePayload: synthData.hook_proof_json,
        paidPayload: synthData.full_blueprint_json,
        isUnlocked: synthData.isUnlocked,
        unlockTier: synthData.unlockTier,
        moonBoundaryFlag: synthData.moonBoundaryFlag,
        hardResetFeedback: synthData.accuracyFeedback,
        modelVersion: synthData.modelVersion,
      });
      setSession(refreshed);
      setShowTimeModal(false);
    } catch (err) {
      setRefreshError(
        err instanceof Error ? err.message : "Unable to refresh right now."
      );
    } finally {
      setRefreshingTime(false);
    }
  };

  return (
    <SolarShell>
      <div className="flex-1 px-5 pt-7 pb-12">
        {/* Editorial Greeting Header */}
        <div className="flex flex-col items-center text-center">
          <SolarOrbHero size="sm" />
          <h1 className="mt-2 font-serif text-[32px] leading-tight text-[#FDF6EE]">
            {input.firstName}&rsquo;s Blueprint
          </h1>
          <p className="mt-1 text-[13px] text-[#B8A99E]">
            Know your patterns. Own your life.
          </p>
        </div>

        {/* Free Birth-Time Upgrade Banner if precisionMode !== "exact" */}
        {input.precisionMode !== "exact" && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#F5A65B]" />
              <p className="text-[12px] leading-snug text-[#FDF6EE]">
                {freePayload.upgrade_hint ||
                  "Found your exact birth time? Add it anytime for a free Deep Blueprint refresh."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTimeModal(true)}
              className="shrink-0 rounded-full border border-[#F5A65B]/40 bg-[#1C130E] px-3 py-1.5 text-[11px] font-semibold text-[#F5A65B] hover:border-[#FF6B2B] transition"
            >
              Add Time
            </button>
          </div>
        )}

        {/* Horizontal Underline Sub-Tabs */}
        <div className="mt-6 flex items-center gap-1 overflow-x-auto border-b border-[#F5A65B]/15 no-scrollbar">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setDrawerOpen(false);
                }}
                className={`relative shrink-0 px-3.5 py-2.5 text-[13px] font-semibold transition ${
                  isActive
                    ? "text-[#FDF6EE]"
                    : "text-[#8E7F75] hover:text-[#B8A99E]"
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-gradient-to-r from-[#FF7E42] to-[#F5A65B]" />
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW (Hard Reset Deep Dive + Quick Snapshot) */}
        {activeTab === "overview" && (
          <div className="mt-5 space-y-4">
            <ObsidianCard warmTint>
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-[#FF6B2B]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                  Hard Reset Deep Breakdown
                </span>
              </div>

              <div className="mt-3 font-serif text-[30px] leading-none text-[#FDF6EE]">
                {freePayload.hardReset.window}
              </div>
              <p className="mt-1 font-serif text-[18px] italic text-[#F5A65B]">
                {freePayload.hardReset.chapterLabel}
              </p>

              <p className="mt-3 text-[15px] leading-[1.6] text-[#D9CEC5]">
                {paidPayload.hardReset.deepBreakdown}
              </p>

              <div className="mt-4 rounded-2xl border border-[#F5A65B]/15 bg-[#120C09]/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4ADE80]">
                  Permanent Resilience Built
                </p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#D9CEC5]">
                  {paidPayload.hardReset.resilienceBuilt}
                </p>
              </div>
            </ObsidianCard>

            <ObsidianCard>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                Next Pressure-Test Window
              </p>
              <h3 className="mt-1.5 font-serif text-[22px] text-[#FDF6EE]">
                {paidPayload.hardReset.nextPressureWindow}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#D9CEC5]">
                {paidPayload.hardReset.preparationNote}
              </p>
            </ObsidianCard>
          </div>
        )}

        {/* TAB 2: ERAS */}
        {activeTab === "eras" && (
          <div className="mt-5 space-y-4">
            <ObsidianCard>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                Life Chapters · Interactive Arc
              </p>
              <h2 className="mt-1 font-serif text-[24px] text-[#FDF6EE]">
                Your 10-Year Trajectory
              </h2>

              <LifeChaptersArc
                eras={freePayload.eras}
                isUnlocked={true}
                era4Preview={paidPayload.eras.era4Preview}
              />
            </ObsidianCard>

            <ObsidianCard warmTint>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF6B2B]">
                  Current Era Playbook
                </span>
                <span className="rounded-full bg-[#FF6B2B]/15 border border-[#FF6B2B]/35 px-2.5 py-0.5 text-[11px] font-semibold text-[#F5A65B]">
                  {freePayload.eras.era3Preview.percentComplete}% Complete
                </span>
              </div>

              <h3 className="mt-2 font-serif text-[24px] text-[#FDF6EE]">
                {freePayload.eras.era3Preview.title}
              </h3>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/80 p-3.5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5A65B]">
                    Core Mandate
                  </div>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#D9CEC5]">
                    {paidPayload.eras.era3Playbook.coreMandate}
                  </p>
                </div>

                <div className="rounded-xl border border-[#4ADE80]/20 bg-[#120C09]/80 p-3.5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4ADE80]">
                    Where to Double Down
                  </div>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#D9CEC5]">
                    {paidPayload.eras.era3Playbook.doubleDown}
                  </p>
                </div>

                <div className="rounded-xl border border-[#F87171]/20 bg-[#120C09]/80 p-3.5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F87171]">
                    What to Eliminate
                  </div>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#D9CEC5]">
                    {paidPayload.eras.era3Playbook.eliminate}
                  </p>
                </div>
              </div>
            </ObsidianCard>
          </div>
        )}

        {/* TAB 3: CAREER */}
        {activeTab === "career" && (
          <div className="mt-5 space-y-4">
            <ObsidianCard>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-[#F5A65B]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                    Career Alignment Audit
                  </span>
                </div>
                <span className="rounded-full bg-[#FF6B2B]/15 border border-[#FF6B2B]/35 px-2.5 py-0.5 text-[11px] font-semibold text-[#FDF6EE]">
                  {freePayload.career.idealModePill}
                </span>
              </div>

              <AlignmentMeter
                score={freePayload.career.alignmentScore}
                subtitle={freePayload.career.subtitle}
              />

              <div className="mt-4 rounded-2xl border border-[#F5A65B]/20 bg-[#120C09]/85 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5A65B]">
                  Job vs. Business Verdict · {paidPayload.career.verdictBadge}
                </div>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#D9CEC5]">
                  {paidPayload.career.jobVsBusinessVerdict}
                </p>
              </div>
            </ObsidianCard>

            <ObsidianCard>
              <h3 className="font-serif text-[22px] text-[#FDF6EE]">
                Field Match &amp; Timing Posture
              </h3>

              <div className="mt-3 space-y-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5A65B]">
                    Current Field Match
                  </div>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#D9CEC5]">
                    {paidPayload.career.currentFieldMatch}
                  </p>
                </div>

                <div className="border-t border-[#F5A65B]/15 pt-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5A65B]">
                    The Duty vs. Purpose Gap
                  </div>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#D9CEC5]">
                    {paidPayload.career.dutyVsPurposeGap}
                  </p>
                </div>

                <div className="border-t border-[#F5A65B]/15 pt-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4ADE80]">
                    Next 12 Months Timing Posture
                  </div>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#D9CEC5]">
                    {paidPayload.career.timingPosture}
                  </p>
                </div>
              </div>
            </ObsidianCard>
          </div>
        )}

        {/* TAB 4: LOVE */}
        {activeTab === "love" && (
          <div className="mt-5 space-y-4">
            <ObsidianCard warmTint>
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-[#FF6B2B]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                  Relationship Mirror ·{" "}
                  {freePayload.relationship.branch === "partnered"
                    ? "Partnership"
                    : "Solo & Dating"}
                </span>
              </div>

              <h2 className="mt-2 font-serif text-[26px] leading-snug text-[#FDF6EE]">
                &ldquo;{freePayload.relationship.archetype}&rdquo;
              </h2>

              <p className="mt-3 text-[15px] leading-[1.6] text-[#D9CEC5]">
                {paidPayload.relationship.coreAlignmentProfile}
              </p>

              <div className="mt-4 rounded-2xl border border-[#F59E0B]/25 bg-[#120C09]/85 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F59E0B]">
                  The Silent Friction Pattern
                </div>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#D9CEC5]">
                  {paidPayload.relationship.silentFrictionPattern}
                </p>
              </div>
            </ObsidianCard>

            <ObsidianCard>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5A65B]">
                2 Practical Communication Shifts
              </div>
              <ul className="mt-3 space-y-3">
                {paidPayload.relationship.communicationShifts.map(
                  (shift, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/70 p-3.5"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF6B2B]/20 text-[12px] font-semibold text-[#F5A65B]">
                        {idx + 1}
                      </span>
                      <span className="text-[14px] leading-relaxed text-[#D9CEC5]">
                        {shift}
                      </span>
                    </li>
                  )
                )}
              </ul>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#4ADE80]/20 bg-[#120C09]/70 px-3.5 py-2.5 text-[12px] text-[#4ADE80]">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>{paidPayload.relationship.clarityWindow}</span>
              </div>
            </ObsidianCard>
          </div>
        )}

        {/* TAB 5: BLIND SPOT */}
        {activeTab === "blind_spot" && (
          <div className="mt-5 space-y-4">
            <ObsidianCard warmTint>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[#F59E0B]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F59E0B]">
                  #1 Self-Sabotage Loop
                </span>
              </div>

              <h2 className="mt-2 font-serif text-[28px] text-[#FDF6EE]">
                {freePayload.selfSabotage.loopName}
              </h2>

              <p className="mt-2 text-[15px] leading-[1.6] text-[#D9CEC5]">
                {freePayload.selfSabotage.symptomSentence}
              </p>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/80 p-3.5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5A65B]">
                    How It Shows Up in Love
                  </div>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#D9CEC5]">
                    {paidPayload.selfSabotage.triggerMapLove}
                  </p>
                </div>

                <div className="rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/80 p-3.5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5A65B]">
                    How It Shows Up in Career
                  </div>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#D9CEC5]">
                    {paidPayload.selfSabotage.triggerMapCareer}
                  </p>
                </div>
              </div>
            </ObsidianCard>

            <ObsidianCard>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4ADE80]">
                3-Step Practical Antidote
              </div>
              <ol className="mt-3 space-y-3">
                {paidPayload.selfSabotage.antidoteSteps.map((stepText, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/70 p-3.5"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF6B2B]/20 text-[12px] font-semibold text-[#F5A65B]">
                      {idx + 1}
                    </span>
                    <span className="text-[14px] leading-relaxed text-[#D9CEC5]">
                      {stepText}
                    </span>
                  </li>
                ))}
              </ol>
            </ObsidianCard>
          </div>
        )}

        {/* Inline "+ Save a personal reflection" Drawer */}
        <div className="mt-5">
          {!drawerOpen ? (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-[#F5A65B]/25 bg-[#1C130E]/80 py-3 px-4 text-[13px] font-medium text-[#FDF6EE] hover:border-[#FF6B2B]/60 transition"
            >
              <Plus className="h-4 w-4 text-[#F5A65B]" />
              <span>Save a personal reflection</span>
            </button>
          ) : (
            <ObsidianCard>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                  Private Reflection · {currentTabConfig.label}
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="text-[#8E7F75] hover:text-[#FDF6EE]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleSaveReflection} className="mt-3 space-y-3">
                <textarea
                  rows={3}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="What resonated here? Capture a pattern or decision rule..."
                  className="w-full rounded-xl border border-[#F5A65B]/20 bg-[#120C09] p-3 text-[14px] text-[#FDF6EE] placeholder:text-[#7C6E65] focus:border-[#FF6B2B] focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full rounded-full py-2.5 px-5 text-[13px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B]"
                >
                  Save Note
                </button>
              </form>
            </ObsidianCard>
          )}

          {tabReflections.length > 0 && (
            <div className="mt-3 space-y-2">
              {tabReflections.map((note) => (
                <div
                  key={note.id}
                  className="rounded-2xl border border-[#F5A65B]/15 bg-[#16100C]/90 px-4 py-3"
                >
                  <p className="text-[13px] leading-relaxed text-[#D9CEC5]">
                    {note.noteText}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-[#7C6E65]">
                    Saved Reflection
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal to Add Exact Birth Time for Free Refresh */}
      {showTimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-[390px] rounded-[24px] border border-[#F5A65B]/25 bg-[#16100C] p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowTimeModal(false)}
              className="absolute right-4 top-4 text-[#8E7F75] hover:text-[#FDF6EE]"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="font-serif text-[24px] text-[#FDF6EE]">
              Add Exact Birth Time
            </h3>
            <p className="mt-1.5 text-[13px] text-[#B8A99E]">
              We&rsquo;ll sharpen your era boundaries and timing windows at no
              extra cost.
            </p>

            <form onSubmit={handleRefreshBirthTime} className="mt-4 space-y-4">
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full rounded-xl border border-[#F5A65B]/20 bg-[#120C09] px-3.5 py-3 text-[15px] text-[#FDF6EE] focus:border-[#FF6B2B] focus:outline-none"
              />
              {refreshError && (
                <p className="text-[12px] text-[#F87171]">{refreshError}</p>
              )}
              <button
                type="submit"
                disabled={refreshingTime}
                className="w-full rounded-full py-3 px-5 text-[14px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] disabled:opacity-60"
              >
                {refreshingTime ? "Refreshing Blueprint..." : "Refresh My Blueprint"}
              </button>
            </form>
          </div>
        </div>
      )}
    </SolarShell>
  );
}

export default function BlueprintHubPage() {
  return (
    <Suspense fallback={<BlueprintLoadingSkeleton />}>
      <BlueprintHubContent />
    </Suspense>
  );
}
