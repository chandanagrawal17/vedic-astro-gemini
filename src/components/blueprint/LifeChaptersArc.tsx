"use client";

import React, { useState } from "react";
import { Lock } from "lucide-react";
import { BlueprintFreePayload } from "@/lib/types/blueprint";

interface LifeChaptersArcProps {
  eras: BlueprintFreePayload["eras"];
  isUnlocked?: boolean;
  era4Preview?: {
    title: string;
    dateRange: string;
    theme: string;
  };
  onEra3LockedClick?: () => void;
}

type ActiveNode = "era1" | "era2" | "era3" | "era4";

export function LifeChaptersArc({
  eras,
  isUnlocked = false,
  era4Preview,
  onEra3LockedClick,
}: LifeChaptersArcProps) {
  const [active, setActive] = useState<ActiveNode>(
    isUnlocked ? "era3" : "era2"
  );

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

  return (
    <div className="mt-2">
      {/* Curved Orbital SVG Arc */}
      <div className="relative w-full">
        <svg viewBox="0 0 360 105" className="w-full overflow-visible">
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
        </svg>
      </div>

      {/* Selected Era Summary Box */}
      <div className="mt-2 rounded-2xl border border-[#F5A65B]/15 bg-[#120C09]/85 p-4 transition-all">
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
          </div>
        )}
      </div>
    </div>
  );
}
