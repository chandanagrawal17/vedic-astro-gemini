"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Clock,
  Eye,
  Lock,
  MessageCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  buildDemoPersonalNatureResponse,
  type PersonalNatureCategorySlug,
} from "@/lib/astro/personalNatureCatalog";
import { toAstroPrecisionMode } from "@/lib/astro/types";
import type {
  PersonalNatureAccuracyRating,
  PersonalNatureApiResponse,
  PersonalNatureTellCardDto,
} from "@/lib/llm/personalNatureSchema";
import type { PrecisionMode } from "@/lib/types/blueprint";
import { ObsidianCard } from "@/components/ui/ObsidianCard";

export interface PersonalNatureSectionProps {
  chartId?: string;
  sessionToken?: string;
  firstName: string;
  precisionMode: PrecisionMode;
  onOpenBirthTimeModal?: () => void;
}

export interface PersonalNatureViewProps {
  data: PersonalNatureApiResponse;
  activeCategorySlug: PersonalNatureCategorySlug | null;
  onToggleCategory: (slug: PersonalNatureCategorySlug) => void;
  previewDay2: boolean;
  togglingPreview: boolean;
  onTogglePreviewDay2: () => void;
  draftNotes: Record<string, string>;
  onChangeDraftNote: (tellId: string, value: string) => void;
  savingTellId: string | null;
  savedToastId: string | null;
  onRateTell: (
    tell: PersonalNatureTellCardDto,
    rating: PersonalNatureAccuracyRating,
    reflection?: string | null
  ) => void;
  onOpenBirthTimeModal?: () => void;
}

const RATING_OPTIONS: {
  value: PersonalNatureAccuracyRating;
  label: string;
}[] = [
  { value: "uncanny", label: "Uncanny" },
  { value: "mostly_me", label: "Mostly me" },
  { value: "not_really", label: "Not really" },
];

const QUICK_REFLECTION_CHIPS: Record<PersonalNatureAccuracyRating, string[]> = {
  uncanny: [
    "Shows up most when I'm tired",
    "Only my closest people see this",
    "Learning to be gentler here",
  ],
  mostly_me: [
    "Used to do this even more",
    "Depends on how safe I feel",
    "Working on softening this habit",
  ],
  not_really: [
    "I handle this more openly now",
    "Shows up differently for me",
    "Outgrew this in recent years",
  ],
};

export function PersonalNatureView({
  data,
  activeCategorySlug,
  onToggleCategory,
  previewDay2,
  togglingPreview,
  onTogglePreviewDay2,
  draftNotes,
  onChangeDraftNote,
  savingTellId,
  savedToastId,
  onRateTell,
  onOpenBirthTimeModal,
}: PersonalNatureViewProps) {
  const totalUnlocked = data.categories.reduce(
    (sum, cat) => sum + cat.unlockedTells.length,
    0
  );
  const totalTells = data.categories.reduce(
    (sum, cat) => sum + cat.totalCount,
    0
  );
  const remainingLocked = Math.max(0, totalTells - totalUnlocked);

  return (
    <div className="space-y-3.5">
      {/* Compact 1-Screen Personal Mirror Header */}
      <div className="px-0.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
              Personal Mirror
            </p>
            <h2 className="mt-0.5 font-serif text-[23px] leading-snug text-[#FDF6EE]">
              4 Quiet Layers of Who You Are
            </h2>
          </div>
          <span className="shrink-0 rounded-full border border-[#F5A65B]/30 bg-[#1C130E]/90 px-2.5 py-1 text-[11px] font-semibold text-[#FDF6EE]">
            {totalUnlocked} / {totalTells} Open
          </span>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[#B8A99E]">
          Tap any chapter below to open your unlocked moments—everything stays
          neatly tucked on one screen.
        </p>
      </div>

      {/* Subtle Dev Preview Pill (non-production DEV_UNLOCK_PREVIEW=true or demo) */}
      {data.canPreviewDay2 && (
        <div className="flex items-center justify-between gap-2.5 rounded-2xl border border-[#F5A65B]/20 bg-[#16100C]/85 px-3.5 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="h-3.5 w-3.5 shrink-0 text-[#F5A65B]" />
            <span className="truncate text-[11.5px] text-[#B8A99E]">
              {previewDay2
                ? "Preview active · All 18 moments unlocked"
                : `Day 1 active · ${remainingLocked} more unlock tomorrow`}
            </span>
          </div>
          <button
            type="button"
            disabled={togglingPreview}
            onClick={onTogglePreviewDay2}
            className="shrink-0 rounded-full border border-[#FF6B2B]/45 bg-[#FF6B2B]/15 px-2.5 py-1 text-[11px] font-semibold text-[#FDF6EE] hover:bg-[#FF6B2B]/25 disabled:opacity-50 transition"
          >
            {togglingPreview
              ? "Loading..."
              : previewDay2
                ? "Show Day 1 Only"
                : "Preview All 18"}
          </button>
        </div>
      )}

      {/* Soft Birth-Time Verification Nudge if 2+ house-dependent tells rated "not_really" */}
      {data.showBirthTimeVerifyHint && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#F5A65B]" />
            <p className="text-[12.5px] leading-snug text-[#FDF6EE]">
              A couple of outer-impression reads felt off—even 15 minutes on a
              birth certificate can shift those lenses. Want to double-check
              your birth time?
            </p>
          </div>
          {onOpenBirthTimeModal && (
            <button
              type="button"
              onClick={onOpenBirthTimeModal}
              className="shrink-0 rounded-full border border-[#F5A65B]/40 bg-[#1C130E] px-3 py-1.5 text-[11px] font-semibold text-[#F5A65B] hover:border-[#FF6B2B] transition"
            >
              Check Time
            </button>
          )}
        </div>
      )}

      {/* 4 Collapsible Category Cards (Zero serial numbering; all 4 fit on 1 screen collapsed) */}
      <div className="space-y-3">
        {data.categories.map((category) => {
          const isOpen = activeCategorySlug === category.slug;
          const unlockedCount = category.unlockedTells.length;
          const lockedCount = category.lockedTeasers.length;
          const ratedCount = category.unlockedTells.filter(
            (t) => t.accuracyRating !== null
          ).length;
          const hasNew = category.unlockedTells.some((t) => t.isNew);
          const progressPct =
            category.totalCount > 0
              ? Math.round((unlockedCount / category.totalCount) * 100)
              : 0;
          const panelId = `personal-category-panel-${category.slug}`;

          const statusHint = isOpen
            ? "Tap to collapse"
            : ratedCount > 0
              ? `${ratedCount}/${unlockedCount} rated`
              : lockedCount > 0
                ? `+${lockedCount} tomorrow`
                : "Tap to open";

          return (
            <div
              key={category.slug}
              className={`overflow-hidden rounded-[22px] backdrop-blur-xl transition-all duration-200 ${
                isOpen
                  ? "border border-[#FF6B2B]/50 bg-[#241811]/90 shadow-[0_14px_40px_rgba(0,0,0,0.55)]"
                  : "border border-[#F5A65B]/20 bg-[#1C130E]/78 shadow-[0_12px_36px_rgba(0,0,0,0.45)] hover:border-[#F5A65B]/40"
              }`}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => onToggleCategory(category.slug)}
                className="w-full p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B2B]/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#F5A65B]">
                        {unlockedCount} of {category.totalCount} moments open
                      </span>
                      {hasNew && (
                        <span className="rounded-full border border-[#F5A65B]/35 bg-[#F5A65B]/15 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-[#F5A65B]">
                          New
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1 font-serif text-[23px] leading-[1.16] text-[#FDF6EE]">
                      {category.title}
                    </h3>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-[#B8A99E]">
                      {category.subtitle}
                    </p>
                  </div>

                  <span
                    className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
                      isOpen
                        ? "border-[#FF6B2B]/50 bg-[#FF6B2B]/20 text-[#FDF6EE]"
                        : "border-[#F5A65B]/20 bg-[#120C09]/80 text-[#F5A65B]"
                    }`}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2.5">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#F5A65B]/12">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#FF6B2B] to-[#F5A65B] transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-[#8E7F75]">
                    {statusHint}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div
                  id={panelId}
                  role="region"
                  aria-label={category.title}
                  className="space-y-3 border-t border-[#F5A65B]/15 bg-[#120C09]/55 px-3.5 py-3.5"
                >
                  {category.unlockedTells.map((tell) => {
                    const selectedRating = tell.accuracyRating;
                    const draftNote = draftNotes[tell.tellId] ?? "";
                    const quickChips = selectedRating
                      ? QUICK_REFLECTION_CHIPS[selectedRating]
                      : [];

                    return (
                      <div
                        key={tell.tellId}
                        className="rounded-[18px] border border-[#F5A65B]/18 bg-[#1C130E]/90 p-4"
                      >
                        {tell.isNew && (
                          <div className="mb-1.5 inline-flex items-center gap-1 rounded-full border border-[#F5A65B]/35 bg-[#F5A65B]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#F5A65B]">
                            <Sparkles className="h-3 w-3" />
                            <span>New · Day 2</span>
                          </div>
                        )}

                        <h4 className="font-serif text-[20px] leading-[1.22] text-[#FDF6EE]">
                          {tell.headline}
                        </h4>

                        <p className="mt-2 text-[14px] leading-[1.62] text-[#D9CEC5]">
                          {tell.body}
                        </p>

                        {/* 1-Tap Accuracy Pulse */}
                        <div className="mt-3.5 border-t border-[#F5A65B]/12 pt-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-[#8E7F75]">
                              How close does this feel?
                            </span>
                            {savedToastId === tell.tellId && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#4ADE80]">
                                <Check className="h-3 w-3" />
                                <span>Saved</span>
                              </span>
                            )}
                          </div>

                          <div className="mt-2 grid grid-cols-3 gap-1.5">
                            {RATING_OPTIONS.map((opt) => {
                              const active = selectedRating === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  disabled={savingTellId === tell.tellId}
                                  onClick={() => onRateTell(tell, opt.value)}
                                  className={`rounded-full border py-1.5 px-2 text-[11.5px] font-medium transition ${
                                    active
                                      ? "border-[#FF6B2B] bg-[#FF6B2B]/20 font-semibold text-[#FDF6EE]"
                                      : "border-[#F5A65B]/20 bg-[#120C09]/80 text-[#B8A99E] hover:border-[#F5A65B]/45 hover:text-[#FDF6EE]"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Gentle Follow-Up Reflection Prompt once rated */}
                          {selectedRating && (
                            <div className="mt-3 rounded-xl border border-[#F5A65B]/18 bg-[#120C09]/85 p-3 space-y-2.5">
                              <div className="flex items-start gap-2">
                                <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F5A65B]" />
                                <p className="text-[12.5px] font-medium leading-snug text-[#FDF6EE]">
                                  {tell.followUpPill}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                {quickChips.map((chip) => {
                                  const chipSelected =
                                    tell.userReflection === chip;
                                  return (
                                    <button
                                      key={chip}
                                      type="button"
                                      onClick={() => {
                                        onChangeDraftNote(tell.tellId, chip);
                                        onRateTell(tell, selectedRating, chip);
                                      }}
                                      className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                                        chipSelected
                                          ? "border-[#F5A65B] bg-[#F5A65B]/20 font-semibold text-[#FDF6EE]"
                                          : "border-[#F5A65B]/18 bg-[#1C130E]/90 text-[#B8A99E] hover:border-[#F5A65B]/40"
                                      }`}
                                    >
                                      {chip}
                                    </button>
                                  );
                                })}
                              </div>

                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  onRateTell(
                                    tell,
                                    selectedRating,
                                    draftNote.trim() || null
                                  );
                                }}
                                className="flex items-center gap-2 pt-0.5"
                              >
                                <input
                                  type="text"
                                  value={draftNote}
                                  onChange={(e) =>
                                    onChangeDraftNote(
                                      tell.tellId,
                                      e.target.value
                                    )
                                  }
                                  placeholder="Or jot a quiet 1-line note..."
                                  maxLength={280}
                                  className="flex-1 rounded-full border border-[#F5A65B]/20 bg-[#1C130E]/90 px-3 py-1.5 text-[12px] text-[#FDF6EE] placeholder-[#7C6E65] focus:border-[#FF6B2B] focus:outline-none"
                                />
                                <button
                                  type="submit"
                                  disabled={savingTellId === tell.tellId}
                                  className="shrink-0 rounded-full border border-[#F5A65B]/30 bg-[#1C130E] px-3 py-1.5 text-[11px] font-semibold text-[#F5A65B] hover:border-[#FF6B2B] transition"
                                >
                                  Save
                                </button>
                              </form>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Compact Locked Day-2 Teaser Rows (zero secret text in DOM) */}
                  {category.lockedTeasers.map((teaser) => (
                    <div
                      key={teaser.tellId}
                      className="flex items-center justify-between gap-2.5 rounded-[16px] border border-[#F5A65B]/14 bg-[#16100C]/80 px-3.5 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#F5A65B]/25 bg-[#FF6B2B]/10 text-[#F5A65B]">
                          <Lock className="h-3 w-3" />
                        </span>
                        <span className="truncate font-serif text-[16px] text-[#FDF6EE]/85">
                          {teaser.teaserTitle}
                        </span>
                      </div>
                      <span className="shrink-0 rounded-full border border-[#F5A65B]/20 bg-[#1C130E] px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-[#F5A65B]/90">
                        Tomorrow
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PersonalNatureSection({
  chartId,
  sessionToken,
  firstName,
  precisionMode,
  onOpenBirthTimeModal,
}: PersonalNatureSectionProps) {
  const targetId = chartId || sessionToken || null;
  const isDemo = !targetId || targetId === "demo-session";

  const [data, setData] = useState<PersonalNatureApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingPreview, setTogglingPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewDay2, setPreviewDay2] = useState(false);
  // Starts all collapsed so all 4 category cards fit cleanly on 1 screen
  const [activeCategorySlug, setActiveCategorySlug] =
    useState<PersonalNatureCategorySlug | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [savingTellId, setSavingTellId] = useState<string | null>(null);
  const [savedToastId, setSavedToastId] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showSavedToast = (tellId: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setSavedToastId(tellId);
    toastTimerRef.current = setTimeout(() => {
      setSavedToastId((curr) => (curr === tellId ? null : curr));
    }, 2000);
  };

  const loadPersonalNature = useCallback(
    async (wantPreviewDay2: boolean, isToggle = false) => {
      setErrorMsg(null);
      if (isToggle) {
        setTogglingPreview(true);
      } else {
        setLoading(true);
      }

      if (isDemo) {
        const demo = buildDemoPersonalNatureResponse({
          firstName,
          precisionMode: toAstroPrecisionMode(precisionMode),
          previewDay2: wantPreviewDay2,
        });
        setData(demo);
        setLoading(false);
        setTogglingPreview(false);
        return;
      }

      try {
        const query = wantPreviewDay2 ? "?previewDay2=true" : "";
        const res = await fetch(
          `/api/personal-nature/${encodeURIComponent(targetId!)}${query}`,
          {
            headers: sessionToken
              ? { "x-session-token": sessionToken }
              : undefined,
          }
        );
        const json = (await res.json()) as PersonalNatureApiResponse & {
          error?: string;
        };
        if (!res.ok) {
          throw new Error(
            json.error || "Unable to load your Personal insights."
          );
        }
        setData(json);
        const initialNotes: Record<string, string> = {};
        for (const cat of json.categories) {
          for (const tell of cat.unlockedTells) {
            if (tell.userReflection) {
              initialNotes[tell.tellId] = tell.userReflection;
            }
          }
        }
        setDraftNotes((prev) => ({ ...initialNotes, ...prev }));
      } catch (err) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : "Unable to load Personal insights right now."
        );
      } finally {
        setLoading(false);
        setTogglingPreview(false);
      }
    },
    [isDemo, firstName, precisionMode, targetId, sessionToken]
  );

  useEffect(() => {
    hasLoadedOnceRef.current = false;
    setActiveCategorySlug(null);
  }, [targetId]);

  useEffect(() => {
    const isToggle = hasLoadedOnceRef.current;
    hasLoadedOnceRef.current = true;
    void loadPersonalNature(previewDay2, isToggle);
  }, [loadPersonalNature, previewDay2]);

  const updateLocalTell = (
    tellId: string,
    patch: Partial<PersonalNatureTellCardDto>
  ) => {
    setData((prev) => {
      if (!prev) return prev;
      const nextCategories = prev.categories.map((cat) => ({
        ...cat,
        unlockedTells: cat.unlockedTells.map((t) =>
          t.tellId === tellId ? { ...t, ...patch } : t
        ),
      }));

      let houseMisses = 0;
      for (const cat of nextCategories) {
        for (const t of cat.unlockedTells) {
          if (t.houseDependent && t.accuracyRating === "not_really") {
            houseMisses += 1;
          }
        }
      }

      return {
        ...prev,
        showBirthTimeVerifyHint: houseMisses >= 2,
        categories: nextCategories,
      };
    });
  };

  const persistFeedback = async (
    tell: PersonalNatureTellCardDto,
    nextRating: PersonalNatureAccuracyRating,
    nextReflection?: string | null
  ) => {
    const prevRating = tell.accuracyRating;
    const prevReflection = tell.userReflection;

    updateLocalTell(tell.tellId, {
      accuracyRating: nextRating,
      ...(nextReflection !== undefined
        ? { userReflection: nextReflection }
        : {}),
    });

    if (isDemo || !targetId) {
      showSavedToast(tell.tellId);
      return;
    }

    setSavingTellId(tell.tellId);
    try {
      const res = await fetch(
        `/api/personal-nature/${encodeURIComponent(targetId)}/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(sessionToken ? { "x-session-token": sessionToken } : {}),
          },
          body: JSON.stringify({
            tellId: tell.tellId,
            accuracyRating: nextRating,
            userReflection:
              nextReflection !== undefined
                ? nextReflection
                : tell.userReflection,
            sessionToken,
          }),
        }
      );
      if (!res.ok) {
        throw new Error("Failed to save rating");
      }
      const saved = (await res.json()) as {
        accuracyRating: PersonalNatureAccuracyRating;
        userReflection: string | null;
        showBirthTimeVerifyHint: boolean;
      };
      setData((d) =>
        d
          ? {
              ...d,
              showBirthTimeVerifyHint: saved.showBirthTimeVerifyHint,
            }
          : d
      );
      showSavedToast(tell.tellId);
    } catch {
      updateLocalTell(tell.tellId, {
        accuracyRating: prevRating,
        userReflection: prevReflection,
      });
    } finally {
      setSavingTellId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-12 w-full rounded-2xl bg-[#1C130E]/75 animate-pulse" />
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="h-24 w-full rounded-[22px] border border-[#F5A65B]/15 bg-[#1C130E]/75 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <ObsidianCard>
        <p className="font-serif text-[22px] text-[#FDF6EE]">
          Personal Mirror Is Taking a Breath
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#B8A99E]">
          {errorMsg || "Unable to load your Personal insights right now."}
        </p>
        <button
          type="button"
          onClick={() => void loadPersonalNature(previewDay2)}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#F5A65B]/30 bg-[#120C09] px-4 py-2 text-[12px] font-semibold text-[#F5A65B] hover:border-[#FF6B2B] transition"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Try Again</span>
        </button>
      </ObsidianCard>
    );
  }

  return (
    <PersonalNatureView
      data={data}
      activeCategorySlug={activeCategorySlug}
      onToggleCategory={(slug) =>
        setActiveCategorySlug((prev) => (prev === slug ? null : slug))
      }
      previewDay2={previewDay2}
      togglingPreview={togglingPreview}
      onTogglePreviewDay2={() => setPreviewDay2((prev) => !prev)}
      draftNotes={draftNotes}
      onChangeDraftNote={(tellId, value) =>
        setDraftNotes((prev) => ({ ...prev, [tellId]: value }))
      }
      savingTellId={savingTellId}
      savedToastId={savedToastId}
      onRateTell={(tell, rating, reflection) =>
        void persistFeedback(tell, rating, reflection)
      }
      onOpenBirthTimeModal={onOpenBirthTimeModal}
    />
  );
}
