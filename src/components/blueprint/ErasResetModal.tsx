"use client";

import React, { useEffect } from "react";
import { Check, Flame, ShieldAlert, Sparkles, X } from "lucide-react";
import type { HardResetDeepDivePayload } from "@/lib/llm/blueprintSchema";

type HardResetPaidChapter = HardResetDeepDivePayload["chapters"][number];

export type ErasPopupDotItem =
  | {
      id: string;
      kind: "chapter";
      shortLabel: string;
      yearRange: string;
      isPrimary?: boolean;
      chapter: HardResetPaidChapter;
    }
  | {
      id: "next_window";
      kind: "next";
      shortLabel: string;
      yearRange: string;
      nextPressureWindow: HardResetDeepDivePayload["nextPressureWindow"];
    };

interface ErasResetModalProps {
  dots: ErasPopupDotItem[];
  activeDotId: string | null;
  confirmedFlashpointIds: string[];
  onSelectDot: (dotId: string) => void;
  onToggleFlashpoint: (flashpointId: string) => void;
  onClose: () => void;
}

export function ErasResetModal({
  dots,
  activeDotId,
  confirmedFlashpointIds,
  onSelectDot,
  onToggleFlashpoint,
  onClose,
}: ErasResetModalProps) {
  const activeItem = dots.find((d) => d.id === activeDotId) ?? null;

  useEffect(() => {
    if (!activeItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeItem, onClose]);

  if (!activeItem) return null;

  const isNext = activeItem.kind === "next";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={
        isNext
          ? activeItem.nextPressureWindow.windowTitle
          : `${activeItem.yearRange} ${activeItem.chapter.chapterTitle}`
      }
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4"
    >
      <div className="flex w-full max-w-[430px] max-h-[86vh] flex-col overflow-hidden rounded-[24px] border border-[#F5A65B]/30 bg-[#16100C] shadow-2xl">
        {/* Sticky Modal Header */}
        <div className="border-b border-[#F5A65B]/15 bg-[#1C130E]/95 px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {isNext ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4ADE80]/40 bg-[#4ADE80]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#4ADE80]">
                    <ShieldAlert className="h-3 w-3" />
                    <span>Next High-Pressure Window</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FF6B2B]/40 bg-[#FF6B2B]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#F5A65B]">
                    <Flame className="h-3 w-3 text-[#FF6B2B]" />
                    <span>{activeItem.yearRange}</span>
                  </span>
                )}
              </div>

              <h3 className="mt-1.5 font-serif text-[22px] leading-snug text-[#FDF6EE]">
                {isNext
                  ? activeItem.nextPressureWindow.windowTitle
                  : activeItem.chapter.chapterTitle}
              </h3>

              {isNext && (
                <div className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#F5A65B]">
                  <Sparkles className="h-3 w-3" />
                  <span>{activeItem.nextPressureWindow.monthRange}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close pop-up"
              className="shrink-0 rounded-full p-1.5 text-[#8E7F75] transition hover:bg-[#FDF6EE]/10 hover:text-[#FDF6EE]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* In-Modal Dot Switcher */}
          {dots.length > 1 && (
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {dots.map((dot) => {
                const isSelected = dot.id === activeItem.id;
                return (
                  <button
                    key={dot.id}
                    type="button"
                    onClick={() => onSelectDot(dot.id)}
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                      isSelected
                        ? "border-[#FF6B2B] bg-[#FF6B2B]/20 text-[#FDF6EE]"
                        : "border-[#F5A65B]/20 bg-[#120C09] text-[#8E7F75] hover:text-[#D9CEC5]"
                    }`}
                  >
                    {dot.shortLabel}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Scrollable Pointers Body */}
        <div className="space-y-3 overflow-y-auto p-4">
          {isNext ? (
            <>
              <p className="text-[14px] leading-relaxed text-[#D9CEC5]">
                {activeItem.nextPressureWindow.whatToExpect}
              </p>

              <div className="space-y-2 pt-1">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#F5A65B]">
                  3 Grounded Prep Moves
                </div>
                <ul className="space-y-2">
                  {activeItem.nextPressureWindow.prepMoves.map((move, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/85 p-3 text-[13.5px] leading-relaxed text-[#E6DDD6]"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FF6B2B]/20 text-[11px] font-semibold text-[#F5A65B]">
                        {idx + 1}
                      </span>
                      <span>{move}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2.5">
                {activeItem.chapter.flashpoints.map((fp) => {
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

              <div className="rounded-xl border border-[#F5A65B]/15 bg-[#120C09]/75 p-3.5">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#F5A65B]">
                  How It Felt Inside
                </div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[#D9CEC5]">
                  {activeItem.chapter.howItFeltInside}
                </p>
              </div>

              <div className="rounded-xl border border-[#4ADE80]/20 bg-[#120C09]/75 p-3.5">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-[#4ADE80]">
                  What It Rewired In You
                </div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[#D9CEC5]">
                  {activeItem.chapter.whatItRewired}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
