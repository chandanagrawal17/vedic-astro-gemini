"use client";

import React, { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import {
  ErasPopupDotItem,
  ErasResetModal,
} from "@/components/blueprint/ErasResetModal";
import type { HardResetDeepDivePayload } from "@/lib/llm/blueprintSchema";
import { BlueprintFreePayload } from "@/lib/types/blueprint";

interface LifeChaptersArcProps {
  eras: BlueprintFreePayload["eras"];
  isUnlocked?: boolean;
  era4Preview?: {
    title: string;
    dateRange: string;
    theme: string;
  };
  hardReset?: HardResetDeepDivePayload;
  confirmedFlashpointIds?: string[];
  onToggleFlashpoint?: (flashpointId: string) => void;
  onEra3LockedClick?: () => void;
}

type ActiveNode = "era1" | "era2" | "era3" | "era4";

function extractYearBounds(range: string): [number, number] | null {
  const matches = range.match(/\d{4}/g);
  if (!matches || matches.length === 0) return null;
  const nums = matches.map((m) => Number(m));
  return [Math.min(...nums), Math.max(...nums)];
}

function formatShortYearRange(range: string): string {
  const years = range.match(/\d{4}/g);
  if (years && years.length >= 2) {
    return `${years[0]}–${years[1].slice(2)}`;
  }
  if (years && years.length === 1) {
    return years[0];
  }
  return range.length > 12 ? `${range.slice(0, 11)}…` : range;
}

function pointOnTrajectoryArc(t: number): { x: number; y: number } {
  const oneMinusT = 1 - t;
  const x = oneMinusT * oneMinusT * 24 + 2 * oneMinusT * t * 180 + t * t * 336;
  const y = oneMinusT * oneMinusT * 82 + 2 * oneMinusT * t * 4 + t * t * 68;
  return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
}

function getChapterArcTs(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0.49];
  if (count === 2) return [0.21, 0.5];
  if (count === 3) return [0.2, 0.44, 0.56];
  return [0.19, 0.42, 0.54, 0.74];
}

export function LifeChaptersArc({
  eras,
  isUnlocked = false,
  era4Preview,
  hardReset,
  confirmedFlashpointIds = [],
  onToggleFlashpoint,
  onEra3LockedClick,
}: LifeChaptersArcProps) {
  const [active, setActive] = useState<ActiveNode>(
    isUnlocked ? "era3" : "era2"
  );
  const [activePopupDotId, setActivePopupDotId] = useState<string | null>(null);

  const popupDots = useMemo<ErasPopupDotItem[]>(() => {
    if (!isUnlocked || !hardReset) return [];

    const sortedChapters = [...hardReset.chapters].sort((a, b) => {
      const aBounds = extractYearBounds(a.yearRange);
      const bBounds = extractYearBounds(b.yearRange);
      if (aBounds && bBounds) return aBounds[0] - bBounds[0];
      return 0;
    });

    const mostRecentIdx = sortedChapters.length - 1;
    const chapterDots: ErasPopupDotItem[] = sortedChapters.map((ch, idx) => ({
      id: ch.chapterId,
      kind: "chapter",
      shortLabel: formatShortYearRange(ch.yearRange),
      yearRange: ch.yearRange,
      isPrimary: idx === mostRecentIdx,
      chapter: ch,
    }));

    return [
      ...chapterDots,
      {
        id: "next_window",
        kind: "next",
        shortLabel: "Next Window",
        yearRange: hardReset.nextPressureWindow.monthRange,
        nextPressureWindow: hardReset.nextPressureWindow,
      },
    ];
  }, [isUnlocked, hardReset]);

  const arcDotCoords = useMemo(() => {
    const chapterCount = popupDots.filter((d) => d.kind === "chapter").length;
    const chapterTs = getChapterArcTs(chapterCount);
    let chapterIdx = 0;

    return popupDots.map((dot) => {
      const t =
        dot.kind === "next"
          ? 0.81
          : chapterTs[chapterIdx++] ?? 0.5;
      return {
        dot,
        ...pointOnTrajectoryArc(t),
      };
    });
  }, [popupDots]);

  const nodes: {
    id: ActiveNode;
    x: number;
    y: number;
    label: string;
    years: string;
    isCurrent?: boolean;
    locked?: boolean;
  }[] = [
    {
      id: "era1",
      x: 44,
      y: 72,
      label: "Era 1",
      years: eras.era1.dateRange,
    },
    {
      id: "era2",
      x: 132,
      y: 44,
      label: "Era 2",
      years: eras.era2.dateRange,
    },
    {
      id: "era3",
      x: 228,
      y: 28,
      label: "Era 3 · Now",
      years: eras.era3Preview.dateRange,
      isCurrent: true,
    },
    {
      id: "era4",
      x: 316,
      y: 58,
      label: "Era 4",
      years: era4Preview?.dateRange ?? "Next",
      locked: !isUnlocked,
    },
  ];

  const handleNodeClick = (node: (typeof nodes)[number]) => {
    if (node.id === "era4" && !isUnlocked) {
      onEra3LockedClick?.();
      return;
    }
    setActive(node.id);
  };

  const findLinkedDotForEra = (eraYears: string, eraId: ActiveNode): ErasPopupDotItem | null => {
    if (popupDots.length === 0) return null;
    const eraBounds = extractYearBounds(eraYears);
    if (eraBounds) {
      const overlapping = popupDots.find((d) => {
        if (d.kind !== "chapter") return false;
        const chBounds = extractYearBounds(d.yearRange);
        if (!chBounds) return false;
        return chBounds[0] <= eraBounds[1] && chBounds[1] >= eraBounds[0];
      });
      if (overlapping) return overlapping;
    }
    if (eraId === "era3") {
      return popupDots.find((d) => d.kind === "next") ?? null;
    }
    return null;
  };

  const renderEraPopupShortcut = (eraYears: string, eraId: ActiveNode) => {
    const linked = findLinkedDotForEra(eraYears, eraId);
    if (!linked) return null;
    const isNext = linked.kind === "next";
    return (
      <button
        type="button"
        onClick={() => setActivePopupDotId(linked.id)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#FF6B2B]/40 bg-[#FF6B2B]/12 px-3 py-1 text-[11.5px] font-semibold text-[#F5A65B] transition hover:bg-[#FF6B2B]/20"
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isNext ? "bg-[#4ADE80]" : "bg-[#FF6B2B]"
          }`}
        />
        <span>
          {isNext
            ? `Open ${linked.yearRange} Prep Pop-Up`
            : `Open ${linked.yearRange} (${linked.chapter.flashpoints.length} monthly pointers)`}{" "}
          &rarr;
        </span>
      </button>
    );
  };

  return (
    <div className="mt-2">
      {/* Curved Orbital SVG Arc */}
      <div className="relative w-full">
        <svg
          viewBox={popupDots.length > 0 ? "0 -10 360 118" : "0 0 360 105"}
          className="w-full overflow-visible"
        >
          <defs>
            <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(245,166,91,0.25)" />
              <stop offset="63%" stopColor="#FF6B2B" />
              <stop offset="100%" stopColor="rgba(245,166,91,0.18)" />
            </linearGradient>
          </defs>

          {/* Base Quadratic Bézier Arc */}
          <path
            d="M 24 82 Q 180 4 336 68"
            fill="none"
            stroke="url(#arcGrad)"
            strokeWidth="2"
          />

          {/* Active Progress Arc up to Era 3 */}
          <path
            d="M 24 82 Q 130 22 228 28"
            fill="none"
            stroke="#FF6B2B"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {nodes.map((node) => {
            const isSelected = active === node.id;
            return (
              <g
                key={node.id}
                onClick={() => handleNodeClick(node)}
                className="cursor-pointer"
              >
                {/* Invisible larger tap target */}
                <circle cx={node.x} cy={node.y} r="20" fill="transparent" />

                {node.isCurrent && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="14"
                    fill="rgba(255, 107, 43, 0.22)"
                  />
                )}

                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.isCurrent ? 8 : isSelected ? 7 : 5.5}
                  fill={
                    node.isCurrent || isSelected ? "#FF6B2B" : "#1C130E"
                  }
                  stroke={
                    node.locked
                      ? "rgba(245,166,91,0.28)"
                      : isSelected || node.isCurrent
                        ? "#FDF6EE"
                        : "#F5A65B"
                  }
                  strokeWidth={isSelected || node.isCurrent ? "2" : "1.5"}
                />

                <text
                  x={node.x}
                  y={node.y + 22}
                  textAnchor="middle"
                  className="fill-[#B8A99E] text-[9.5px] font-medium"
                >
                  {node.label}
                </text>
              </g>
            );
          })}

          {/* Clickable Reset & Pressure Dots on Trajectory */}
          {arcDotCoords.map(({ dot, x, y }) => {
            const isNext = dot.kind === "next";
            const dotColor = isNext
              ? "#4ADE80"
              : dot.isPrimary
                ? "#FF6B2B"
                : "#F5A65B";
            const isOpen = activePopupDotId === dot.id;
            return (
              <g
                key={dot.id}
                onClick={() => setActivePopupDotId(dot.id)}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`Open ${dot.yearRange} pointers`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActivePopupDotId(dot.id);
                  }
                }}
              >
                <circle cx={x} cy={y} r="16" fill="transparent" />
                <circle
                  cx={x}
                  cy={y}
                  r={isOpen ? 10 : 8}
                  fill={dotColor}
                  opacity={isOpen ? 0.35 : 0.2}
                />
                <circle
                  cx={x}
                  cy={y}
                  r="4.5"
                  fill={dotColor}
                  stroke="#0D0907"
                  strokeWidth="1.5"
                />
                <text
                  x={x}
                  y={y - 11}
                  textAnchor="middle"
                  fill={dotColor}
                  className="text-[8.5px] font-bold"
                >
                  {dot.shortLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Clickable Reset & Pressure Dot Chips */}
      {popupDots.length > 0 && (
        <div className="mt-2 border-t border-[#F5A65B]/15 pt-3">
          <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#B8A99E]">
            Reset &amp; Pressure Dots · Tap for monthly pointers
          </div>
          <div className="flex flex-wrap gap-2">
            {popupDots.map((dot) => {
              const isNext = dot.kind === "next";
              const isOpen = activePopupDotId === dot.id;
              const dotBg = isNext
                ? "bg-[#4ADE80]"
                : dot.isPrimary
                  ? "bg-[#FF6B2B]"
                  : "bg-[#F5A65B]";
              const countTag = isNext
                ? "Prep"
                : `${dot.chapter.flashpoints.length} spikes`;
              return (
                <button
                  key={dot.id}
                  type="button"
                  onClick={() => setActivePopupDotId(dot.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                    isOpen
                      ? "border-[#FF6B2B] bg-[#FF6B2B]/20 text-[#FDF6EE]"
                      : "border-[#F5A65B]/25 bg-[#120C09]/90 text-[#D9CEC5] hover:border-[#FF6B2B]/60"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${dotBg}`} />
                  <span>{dot.yearRange}</span>
                  <span className="text-[10px] text-[#8E7F75]">
                    · {countTag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Era Summary Box */}
      <div className="mt-3 rounded-2xl border border-[#F5A65B]/15 bg-[#120C09]/85 p-4 transition-all">
        {active === "era1" && (
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                Era 1 · {eras.era1.dateRange}
              </span>
            </div>
            <h4 className="mt-1 font-serif text-[20px] text-[#FDF6EE]">
              {eras.era1.title}
            </h4>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#D9CEC5]">
              {eras.era1.summary}
            </p>
            {renderEraPopupShortcut(eras.era1.dateRange, "era1")}
          </div>
        )}

        {active === "era2" && (
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                Era 2 · {eras.era2.dateRange}
              </span>
            </div>
            <h4 className="mt-1 font-serif text-[20px] text-[#FDF6EE]">
              {eras.era2.title}
            </h4>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#D9CEC5]">
              {eras.era2.summary}
            </p>
            {renderEraPopupShortcut(eras.era2.dateRange, "era2")}
          </div>
        )}

        {active === "era3" && (
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF6B2B]">
                Current Chapter · {eras.era3Preview.dateRange}
              </span>
              <span className="rounded-full bg-[#FF6B2B]/15 border border-[#FF6B2B]/40 px-2.5 py-0.5 text-[11px] font-semibold text-[#F5A65B]">
                {eras.era3Preview.percentComplete}% Complete
              </span>
            </div>
            <h4 className="mt-1 font-serif text-[20px] text-[#FDF6EE]">
              {eras.era3Preview.title}
            </h4>
            {renderEraPopupShortcut(eras.era3Preview.dateRange, "era3")}

            {!isUnlocked && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#F5A65B]/15 bg-[#1C130E]/70 px-3.5 py-2.5">
                <span className="text-[12px] text-[#B8A99E]">
                  Current Era Playbook &amp; Era 4 Preview
                </span>
                <button
                  type="button"
                  onClick={onEra3LockedClick}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#FF6B2B]/15 border border-[#FF6B2B]/40 px-3 py-1 text-[11px] font-semibold text-[#FDF6EE] hover:bg-[#FF6B2B]/25 transition"
                >
                  <Lock className="h-3 w-3 text-[#F5A65B]" />
                  Locked
                </button>
              </div>
            )}
          </div>
        )}

        {active === "era4" && isUnlocked && era4Preview && (
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                Era 4 Preview · {era4Preview.dateRange}
              </span>
            </div>
            <h4 className="mt-1 font-serif text-[20px] text-[#FDF6EE]">
              {era4Preview.title}
            </h4>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#D9CEC5]">
              {era4Preview.theme}
            </p>
            {renderEraPopupShortcut(era4Preview.dateRange, "era4")}
          </div>
        )}
      </div>

      {/* Year-Range Pop-Up Modal */}
      {popupDots.length > 0 && (
        <ErasResetModal
          dots={popupDots}
          activeDotId={activePopupDotId}
          confirmedFlashpointIds={confirmedFlashpointIds}
          onSelectDot={(dotId) => setActivePopupDotId(dotId)}
          onToggleFlashpoint={(fpId) => onToggleFlashpoint?.(fpId)}
          onClose={() => setActivePopupDotId(null)}
        />
      )}
    </div>
  );
}

