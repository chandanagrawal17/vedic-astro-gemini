"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Calendar,
  Check,
  Clock,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { ObsidianCard } from "@/components/ui/ObsidianCard";
import {
  DailyCommandCenterPayload,
  DailyMemoryTag,
  DailyToneStatus,
  MoveAuditAction,
  MoveAuditResult,
  TextOrWaitIntent,
  TextOrWaitResult,
} from "@/lib/types/blueprint";

interface DailyCommandCenterProps {
  chartId?: string;
  sessionToken?: string;
  firstName: string;
}

const MEMORY_TAG_OPTIONS: { id: DailyMemoryTag; label: string }[] = [
  { id: "hit_home", label: "Hit Home" },
  { id: "helped_pause", label: "Helped Me Pause" },
  { id: "took_action", label: "Took Action" },
  { id: "felt_off", label: "Felt Off" },
];

const TOW_INTENT_OPTIONS: { id: TextOrWaitIntent; label: string }[] = [
  { id: "dating", label: "Dating" },
  { id: "work", label: "Work / Pitch" },
  { id: "conflict", label: "Hard Talk" },
  { id: "money", label: "Money" },
];

const MOVE_AUDIT_OPTIONS: { id: MoveAuditAction; label: string }[] = [
  { id: "pitch", label: "Pitch / Ask" },
  { id: "hard_talk", label: "Hard Talk" },
  { id: "deep_work", label: "Deep Focus" },
  { id: "sign_deal", label: "Sign / Commit" },
  { id: "rest_reset", label: "Rest / Reset" },
];

function statusStyle(status: DailyToneStatus): {
  text: string;
  border: string;
  bg: string;
  stroke: string;
} {
  if (status === "GREEN") {
    return {
      text: "text-[#4ADE80]",
      border: "border-[#4ADE80]/35",
      bg: "bg-[#4ADE80]/15",
      stroke: "#4ADE80",
    };
  }
  if (status === "RED") {
    return {
      text: "text-[#F87171]",
      border: "border-[#F87171]/35",
      bg: "bg-[#F87171]/15",
      stroke: "#F87171",
    };
  }
  return {
    text: "text-[#F5A65B]",
    border: "border-[#F5A65B]/35",
    bg: "bg-[#F5A65B]/15",
    stroke: "#F5A65B",
  };
}

function buildDemoFallback(): DailyCommandCenterPayload {
  const today = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const toIso = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const sevenDayCalendar = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(today.getTime() + i * 86400000);
    const modes = ["PITCH", "PITCH", "FOCUS", "STEADY", "FOCUS", "PITCH", "STEADY"] as const;
    const statuses = ["GREEN", "GREEN", "YELLOW", "GREEN", "RED", "GREEN", "YELLOW"] as const;
    const mode = modes[i];
    const status = statuses[i];
    return {
      dateIso: toIso(dt),
      dayShort: dayNames[dt.getDay()],
      dayNumber: String(dt.getDate()),
      mode,
      headline:
        mode === "PITCH"
          ? "High-Leverage Outreach"
          : mode === "STEADY"
            ? "Steady Follow-Through"
            : "Deep Focus & Cleanup",
      guidance:
        mode === "PITCH"
          ? "Clear outward presence—great window for pitches, warm outreach, and clear asks."
          : mode === "STEADY"
            ? "Keep agreements in simple writing and pace commitments calmly."
            : "Lower outward tolerance today—protect solo focus and defer reactive texts.",
      bandwidthScore: status === "GREEN" ? 84 : status === "YELLOW" ? 61 : 46,
      status,
    };
  });

  return {
    checkinDate: toIso(today),
    precisionMode: "exact",
    precisionNote: null,
    bandwidthScore: 84,
    toneStatus: "GREEN",
    toneLabel: "Open & Expressive",
    summary:
      "Clear personal presence and steady mental stamina today. Strong morning window for honest check-ins and high-leverage asks.",
    peakWindow: { label: "9:00 AM – 12:00 PM", note: "Pitch, ship, decide" },
    frictionWindow: {
      label: "3:30 PM – 6:00 PM",
      note: "Short fuse—pause before sharp replies",
    },
    dailyDirective: {
      directiveId: "dir_own_lane_01",
      text: "Lead with the single outcome you want to own today—don’t volunteer to rescue someone else’s messy thread before noon.",
      antiRepetitionWindowDays: 3,
    },
    memoryTags: [],
    somaticResetsCompletedToday: 0,
    somaticReset: {
      durationSeconds: 90,
      personalizedAnchor:
        "Drop your shoulders, unclench your jaw, and press both feet flat into the floor.",
      phases: [
        {
          step: 1,
          title: "Body Anchor",
          instruction:
            "Drop your shoulders, unclench your jaw, and press both feet flat into the floor.",
        },
        {
          step: 2,
          title: "Breath Pause",
          instruction:
            "Take a few slow, unforced breaths and notice the brief quiet pause at the end of each exhale.",
        },
        {
          step: 3,
          title: "Witness Shift",
          instruction:
            "Step back from the racing thought—observe it as passing weather rather than an urgent command.",
        },
      ],
    },
    defaultTextOrWait: {
      intent: "work",
      verdict: "GREEN",
      badge: "GREEN · PITCH NOW",
      guidance:
        "Strong clarity for proposals and claiming ownership. Lead with the concrete outcome in your first two lines.",
      speakableScript:
        "Here’s the two-sentence plan I’d like to own this week—let me know if we’re aligned.",
    },
    sevenDayCalendar,
  };
}

function getBrowserTzOffsetHours(): number {
  return Math.max(
    -12,
    Math.min(14, Math.round((-new Date().getTimezoneOffset() / 60) * 4) / 4)
  );
}

export function DailyCommandCenter({
  chartId,
  sessionToken,
  firstName,
}: DailyCommandCenterProps) {
  const targetId = chartId || sessionToken || null;
  const isDemo = !targetId || targetId === "demo-session";

  const [data, setData] = useState<DailyCommandCenterPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Text or Wait state
  const [towIntent, setTowIntent] = useState<TextOrWaitIntent>("work");
  const [towResult, setTowResult] = useState<TextOrWaitResult | null>(null);
  const [towLoading, setTowLoading] = useState(false);

  // 90s Somatic Reset state
  const [somaticSeconds, setSomaticSeconds] = useState(90);
  const [somaticRunning, setSomaticRunning] = useState(false);
  const somaticCompletedRef = useRef(false);

  // 7-Day Calendar & Move Audit state
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [selectedMove, setSelectedMove] = useState<MoveAuditAction>("pitch");
  const [moveAudit, setMoveAudit] = useState<MoveAuditResult | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const authHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (sessionToken) h["x-session-token"] = sessionToken;
    return h;
  }, [sessionToken]);

  const loadDaily = useCallback(async () => {
    setErrorMsg(null);
    if (isDemo) {
      const demo = buildDemoFallback();
      setData(demo);
      setTowIntent(demo.defaultTextOrWait.intent);
      setTowResult({ ...demo.defaultTextOrWait, waitMinutes: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const tzOffsetHours = getBrowserTzOffsetHours();
      const res = await fetch(
        `/api/daily/${encodeURIComponent(targetId!)}?tzOffsetHours=${encodeURIComponent(String(tzOffsetHours))}`,
        {
          headers: sessionToken
            ? { "x-session-token": sessionToken }
            : undefined,
        }
      );
      const json = (await res.json()) as DailyCommandCenterPayload & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Unable to load Daily Command Center.");
      }
      setData(json);
      setTowIntent(json.defaultTextOrWait.intent);
      setTowResult({
        ...json.defaultTextOrWait,
        waitMinutes:
          json.defaultTextOrWait.verdict === "GREEN"
            ? 0
            : json.defaultTextOrWait.verdict === "YELLOW"
              ? 20
              : 1440,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Unable to load today's rhythm."
      );
    } finally {
      setLoading(false);
    }
  }, [isDemo, targetId, sessionToken]);

  useEffect(() => {
    void loadDaily();
  }, [loadDaily]);

  // 90-second timer tick + completion persistence
  useEffect(() => {
    if (!somaticRunning) return;
    const timer = setInterval(() => {
      setSomaticSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setSomaticRunning(false);
          if (!somaticCompletedRef.current) {
            somaticCompletedRef.current = true;
            if (!isDemo && targetId) {
              fetch(`/api/daily/${encodeURIComponent(targetId)}/somatic-reset`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                  sessionToken,
                  tzOffsetHours: getBrowserTzOffsetHours(),
                }),
              })
                .then((r) => r.json())
                .then((res: { somaticResetsCompletedToday?: number }) => {
                  if (typeof res.somaticResetsCompletedToday === "number") {
                    setData((d) =>
                      d
                        ? {
                            ...d,
                            somaticResetsCompletedToday:
                              res.somaticResetsCompletedToday!,
                          }
                        : d
                    );
                  }
                })
                .catch(() => {});
            } else {
              setData((d) =>
                d
                  ? {
                      ...d,
                      somaticResetsCompletedToday:
                        d.somaticResetsCompletedToday + 1,
                    }
                  : d
              );
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [somaticRunning, isDemo, targetId, sessionToken, authHeaders]);

  const handleToggleMemoryTag = async (tag: DailyMemoryTag) => {
    if (!data) return;
    const prevTags = data.memoryTags;
    const nextTags = prevTags.includes(tag)
      ? prevTags.filter((t) => t !== tag)
      : [...prevTags, tag];
    setData({ ...data, memoryTags: nextTags });

    if (isDemo || !targetId) return;
    try {
      const res = await fetch(
        `/api/daily/${encodeURIComponent(targetId)}/memory-tag`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            tag,
            sessionToken,
            tzOffsetHours: getBrowserTzOffsetHours(),
          }),
        }
      );
      if (res.ok) {
        const json = (await res.json()) as { memoryTags: DailyMemoryTag[] };
        setData((d) => (d ? { ...d, memoryTags: json.memoryTags } : d));
      }
    } catch {
      setData((d) => (d ? { ...d, memoryTags: prevTags } : d));
    }
  };

  const handleCheckTextOrWait = async (intent: TextOrWaitIntent) => {
    setTowIntent(intent);
    if (!data) return;
    if (isDemo || !targetId) {
      const verdict = data.toneStatus;
      setTowResult({
        intent,
        verdict,
        badge:
          verdict === "GREEN"
            ? "GREEN · SEND CLEANLY"
            : verdict === "YELLOW"
              ? "YELLOW · WAIT 20 MIN"
              : "RED · WAIT 24 HOURS",
        waitMinutes: verdict === "GREEN" ? 0 : verdict === "YELLOW" ? 20 : 1440,
        guidance: data.summary,
        speakableScript: data.defaultTextOrWait.speakableScript,
      });
      return;
    }

    setTowLoading(true);
    try {
      const res = await fetch(
        `/api/daily/${encodeURIComponent(targetId)}/text-or-wait`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            intent,
            urgency: "now",
            sessionToken,
            tzOffsetHours: getBrowserTzOffsetHours(),
          }),
        }
      );
      if (res.ok) {
        const json = (await res.json()) as TextOrWaitResult;
        setTowResult(json);
      }
    } finally {
      setTowLoading(false);
    }
  };

  const handleAuditMove = async (dayIdx: number, action: MoveAuditAction) => {
    setSelectedDayIdx(dayIdx);
    setSelectedMove(action);
    if (!data) return;
    const day = data.sevenDayCalendar[dayIdx];
    if (!day) return;

    if (isDemo || !targetId) {
      const aligned =
        (action === "pitch" && day.mode === "PITCH") ||
        (action === "deep_work" && day.mode === "FOCUS") ||
        action === "rest_reset";
      setMoveAudit({
        dateIso: day.dateIso,
        dayLabel: `${day.dayShort} ${day.dayNumber}`,
        action,
        verdict: aligned ? "GREEN" : day.status === "RED" ? "RED" : "YELLOW",
        headline: aligned ? "Aligned Window — Go Forward" : "Better to Pace or Shift",
        guidance: day.guidance,
        recommendedAlternativeDate: null,
      });
      return;
    }

    setAuditLoading(true);
    try {
      const res = await fetch(
        `/api/daily/${encodeURIComponent(targetId)}/move-audit`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            dateIso: day.dateIso,
            action,
            sessionToken,
            tzOffsetHours: getBrowserTzOffsetHours(),
          }),
        }
      );
      if (res.ok) {
        const json = (await res.json()) as MoveAuditResult;
        setMoveAudit(json);
      }
    } finally {
      setAuditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <ObsidianCard warmTint>
          <div className="h-4 w-36 rounded-full bg-[#F5A65B]/15 animate-pulse" />
          <div className="mt-4 h-20 w-full rounded-2xl bg-[#120C09]/60 animate-pulse" />
          <div className="mt-3 h-16 w-full rounded-2xl bg-[#120C09]/60 animate-pulse" />
        </ObsidianCard>
        <ObsidianCard>
          <div className="h-32 w-full rounded-2xl bg-[#120C09]/60 animate-pulse" />
        </ObsidianCard>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <ObsidianCard>
        <p className="font-serif text-[20px] text-[#FDF6EE]">
          Today&rsquo;s Command Center Unavailable
        </p>
        <p className="mt-1.5 text-[13px] text-[#B8A99E]">
          {errorMsg || "Unable to load your daily rhythm right now."}
        </p>
        <button
          type="button"
          onClick={() => void loadDaily()}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#F5A65B]/30 bg-[#120C09] px-4 py-2 text-[12px] font-semibold text-[#F5A65B]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Retry</span>
        </button>
      </ObsidianCard>
    );
  }

  const toneStyle = statusStyle(data.toneStatus);
  const clampedScore = Math.max(0, Math.min(100, data.bandwidthScore));
  const arcLen = Math.PI * 48;
  const arcOffset = arcLen - (clampedScore / 100) * arcLen;

  const activePhaseIndex =
    somaticSeconds > 60 ? 0 : somaticSeconds > 30 ? 1 : 2;
  const currentPhase = data.somaticReset.phases[activePhaseIndex];
  const mins = Math.floor(somaticSeconds / 60);
  const secs = somaticSeconds % 60;
  const timerLabel = `0${mins}:${secs < 10 ? `0${secs}` : secs}`;

  const selectedDay = data.sevenDayCalendar[selectedDayIdx] ?? data.sevenDayCalendar[0];

  return (
    <div className="space-y-4">
      {data.precisionNote && (
        <div className="rounded-2xl border border-[#F59E0B]/25 bg-[#F59E0B]/10 px-4 py-2.5 text-[12px] leading-snug text-[#F5A65B]">
          {data.precisionNote}
        </div>
      )}

      {/* CARD 1: Daily Cognitive Bandwidth + Peak/Friction Windows + Rotating Directive + 1-Tap Memory Tags */}
      <ObsidianCard warmTint>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-[#F5A65B]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
              Cognitive Bandwidth
            </span>
          </div>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${toneStyle.bg} ${toneStyle.border} ${toneStyle.text}`}
          >
            {data.toneLabel}
          </span>
        </div>

        {/* Semi-circular Score Gauge + Summary */}
        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-[68px] w-[114px] shrink-0 flex items-end justify-center">
            <svg viewBox="0 0 120 70" className="h-full w-full overflow-visible">
              <path
                d="M 12 62 A 48 48 0 0 1 108 62"
                fill="none"
                stroke="rgba(245, 166, 91, 0.16)"
                strokeWidth="9"
                strokeLinecap="round"
              />
              <path
                d="M 12 62 A 48 48 0 0 1 108 62"
                fill="none"
                stroke={toneStyle.stroke}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={arcLen}
                strokeDashoffset={arcOffset}
              />
            </svg>
            <div className="absolute bottom-0 text-center">
              <span className="font-serif text-[30px] leading-none font-semibold text-[#FDF6EE]">
                {clampedScore}
              </span>
              <span className="text-[11px] text-[#8E7F75]">/100</span>
            </div>
          </div>

          <p className="text-[13px] leading-relaxed text-[#D9CEC5]">
            {data.summary}
          </p>
        </div>

        {/* Peak & Friction Windows */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-[#4ADE80]/25 bg-[#120C09]/80 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4ADE80]">
              Peak Focus Window
            </div>
            <div className="mt-1 text-[13px] font-semibold text-[#FDF6EE]">
              {data.peakWindow.label}
            </div>
            <div className="mt-0.5 text-[11px] text-[#B8A99E]">
              {data.peakWindow.note}
            </div>
          </div>

          <div className="rounded-xl border border-[#F59E0B]/25 bg-[#120C09]/80 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F59E0B]">
              Friction Watch
            </div>
            <div className="mt-1 text-[13px] font-semibold text-[#FDF6EE]">
              {data.frictionWindow.label}
            </div>
            <div className="mt-0.5 text-[11px] text-[#B8A99E]">
              {data.frictionWindow.note}
            </div>
          </div>
        </div>

        {/* Rotating Directive (3-Day Anti-Repetition) + 1-Tap Memory Tags */}
        <div className="mt-4 rounded-2xl border border-[#F5A65B]/20 bg-[#120C09]/90 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
              {firstName}&rsquo;s Daily Directive
            </span>
            <span className="text-[10px] text-[#8E7F75]">
              {data.dailyDirective.antiRepetitionWindowDays}-day fresh rotation
            </span>
          </div>

          <p className="mt-1.5 text-[14px] leading-relaxed text-[#FDF6EE]">
            {data.dailyDirective.text}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] uppercase tracking-wider text-[#7C6E65]">
              Memory tag:
            </span>
            {MEMORY_TAG_OPTIONS.map((opt) => {
              const active = data.memoryTags.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => void handleToggleMemoryTag(opt.id)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition ${
                    active
                      ? "border-[#FF6B2B] bg-[#FF6B2B]/20 font-semibold text-[#FDF6EE]"
                      : "border-[#F5A65B]/20 bg-[#1C130E] text-[#B8A99E] hover:border-[#F5A65B]/45"
                  }`}
                >
                  {active && <Check className="h-3 w-3 text-[#F5A65B]" />}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </ObsidianCard>

      {/* CARD 2: "Text or Wait?" Decision Filter */}
      <ObsidianCard>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#F5A65B]" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                Decision Filter
              </p>
              <h2 className="font-serif text-[22px] leading-tight text-[#FDF6EE]">
                Text or Wait?
              </h2>
            </div>
          </div>

          {towResult && (
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                statusStyle(towResult.verdict).bg
              } ${statusStyle(towResult.verdict).border} ${
                statusStyle(towResult.verdict).text
              }`}
            >
              {towResult.badge}
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {TOW_INTENT_OPTIONS.map((opt) => {
            const active = towIntent === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={towLoading}
                onClick={() => void handleCheckTextOrWait(opt.id)}
                className={`rounded-xl border px-1.5 py-2 text-[11px] font-medium transition ${
                  active
                    ? "border-[#FF6B2B] bg-[#FF6B2B]/20 font-semibold text-[#FDF6EE]"
                    : "border-[#F5A65B]/20 bg-[#120C09]/80 text-[#B8A99E] hover:border-[#F5A65B]/45"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {towResult && (
          <div className="mt-3 space-y-2 rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/85 p-3.5">
            <p className="text-[13px] leading-relaxed text-[#D9CEC5]">
              {towResult.guidance}
            </p>
            <div className="rounded-lg border border-[#F5A65B]/15 bg-[#1C130E]/80 px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#F5A65B]">
                Ready-to-Use Phrasing
              </span>
              <p className="mt-0.5 text-[12px] italic text-[#FDF6EE]">
                &ldquo;{towResult.speakableScript}&rdquo;
              </p>
            </div>
          </div>
        )}
      </ObsidianCard>

      {/* CARD 3: 90-Second Somatic Reset Timer */}
      <ObsidianCard>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#F5A65B]" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                Nervous System Reset
              </p>
              <h2 className="font-serif text-[22px] leading-tight text-[#FDF6EE]">
                90-Second Somatic Reset
              </h2>
            </div>
          </div>
          <div className="text-right">
            <div className="font-serif text-[28px] leading-none tabular-nums text-[#FDF6EE]">
              {timerLabel}
            </div>
            {data.somaticResetsCompletedToday > 0 && (
              <div className="mt-0.5 text-[10px] text-[#4ADE80]">
                {data.somaticResetsCompletedToday} completed today
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          {data.somaticReset.phases.map((phase, idx) => {
            const isActive = idx === activePhaseIndex;
            return (
              <div
                key={phase.step}
                className={`rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition ${
                  isActive
                    ? "border-[#FF6B2B] bg-[#FF6B2B]/20 text-[#FDF6EE]"
                    : "border-[#F5A65B]/15 bg-[#120C09]/80 text-[#8E7F75]"
                }`}
              >
                {phase.step}. {phase.title}
              </div>
            );
          })}
        </div>

        <p className="mt-3 rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/80 p-3 text-[13px] leading-relaxed text-[#D9CEC5]">
          {somaticSeconds === 0
            ? "Reset complete. Your nervous system has extra room—choose one calm next step."
            : currentPhase.instruction}
        </p>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (somaticSeconds === 0) {
                somaticCompletedRef.current = false;
                setSomaticSeconds(90);
              }
              setSomaticRunning((r) => !r);
            }}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 px-4 text-[13px] font-semibold text-[#0D0907] bg-gradient-to-r from-[#FF7E42] to-[#F5A65B] active:scale-[0.98] transition"
          >
            {somaticRunning ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                <span>Pause Timer</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                <span>
                  {somaticSeconds === 0
                    ? "Run Again"
                    : somaticSeconds < 90
                      ? "Resume Reset"
                      : "Start 90s Reset"}
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setSomaticRunning(false);
              somaticCompletedRef.current = false;
              setSomaticSeconds(90);
            }}
            className="rounded-full border border-[#F5A65B]/25 bg-[#120C09] py-2.5 px-4 text-[12px] font-medium text-[#B8A99E] hover:text-[#FDF6EE] transition"
          >
            Reset
          </button>
        </div>
      </ObsidianCard>

      {/* CARD 4: 7-Day "Focus vs. Pitch" Calendar + Move Audit */}
      <ObsidianCard>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#F5A65B]" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                Next 7 Days
              </p>
              <h2 className="font-serif text-[22px] leading-tight text-[#FDF6EE]">
                Focus vs. Pitch Calendar
              </h2>
            </div>
          </div>
          <span className="text-[11px] text-[#8E7F75]">Tap day to audit</span>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {data.sevenDayCalendar.map((day, idx) => {
            const isSelected = idx === selectedDayIdx;
            const modeColor =
              day.mode === "PITCH"
                ? "text-[#4ADE80]"
                : day.mode === "STEADY"
                  ? "text-[#F5A65B]"
                  : "text-[#F87171]";
            const dotBg =
              day.mode === "PITCH"
                ? "bg-[#4ADE80]"
                : day.mode === "STEADY"
                  ? "bg-[#F5A65B]"
                  : "bg-[#F87171]";

            return (
              <button
                key={day.dateIso}
                type="button"
                onClick={() => void handleAuditMove(idx, selectedMove)}
                className={`flex flex-col items-center gap-1 rounded-xl border py-2 px-1 transition ${
                  isSelected
                    ? "border-[#FF6B2B] bg-[#FF6B2B]/20"
                    : "border-[#F5A65B]/15 bg-[#120C09]/80 hover:border-[#F5A65B]/40"
                }`}
              >
                <span className="text-[9px] uppercase text-[#8E7F75]">
                  {day.dayShort}
                </span>
                <span className="text-[13px] font-semibold text-[#FDF6EE]">
                  {day.dayNumber}
                </span>
                <span className={`h-1.5 w-1.5 rounded-full ${dotBg}`} />
                <span className={`text-[8px] font-bold tracking-tight ${modeColor}`}>
                  {day.mode}
                </span>
              </button>
            );
          })}
        </div>

        {selectedDay && (
          <div className="mt-3 space-y-3 rounded-2xl border border-[#F5A65B]/15 bg-[#120C09]/85 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold text-[#FDF6EE]">
                {selectedDay.dayShort} · {selectedDay.headline}
              </span>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                  statusStyle(selectedDay.status).bg
                } ${statusStyle(selectedDay.status).border} ${
                  statusStyle(selectedDay.status).text
                }`}
              >
                {selectedDay.mode} · {selectedDay.bandwidthScore}
              </span>
            </div>

            <p className="text-[12px] leading-relaxed text-[#B8A99E]">
              {selectedDay.guidance}
            </p>

            <div className="border-t border-[#F5A65B]/10 pt-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#F5A65B]">
                <Sparkles className="h-3 w-3" />
                <span>Audit a Planned Move on This Day</span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {MOVE_AUDIT_OPTIONS.map((opt) => {
                  const active = selectedMove === opt.id && moveAudit?.dateIso === selectedDay.dateIso;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={auditLoading}
                      onClick={() => void handleAuditMove(selectedDayIdx, opt.id)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                        active
                          ? "border-[#FF6B2B] bg-[#FF6B2B]/20 font-semibold text-[#FDF6EE]"
                          : "border-[#F5A65B]/20 bg-[#1C130E] text-[#B8A99E] hover:border-[#F5A65B]/45"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {moveAudit && moveAudit.dateIso === selectedDay.dateIso && (
                <div className="mt-2.5 rounded-xl border border-[#F5A65B]/15 bg-[#1C130E]/75 p-3">
                  <div
                    className={`text-[12px] font-semibold ${
                      statusStyle(moveAudit.verdict).text
                    }`}
                  >
                    {moveAudit.headline}
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#D9CEC5]">
                    {moveAudit.guidance}
                  </p>
                  {moveAudit.recommendedAlternativeDate && (
                    <p className="mt-1.5 text-[11px] font-medium text-[#F5A65B]">
                      Better nearby window: {moveAudit.recommendedAlternativeDate.dayLabel} (
                      {moveAudit.recommendedAlternativeDate.mode})
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </ObsidianCard>
    </div>
  );
}
