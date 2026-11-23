/**
 * Backwards-compatibility normalizer so older cached v1 Supabase blueprints
 * render cleanly in the v2 UI without crashing or duplicating conditional logic.
 */

import type {
  BlueprintFreePayload,
  BlueprintPaidPayload,
} from "@/lib/types/blueprint";

export function isV2HardResetProof(hr: unknown): boolean {
  return Boolean(
    hr && typeof hr === "object" && "primaryYearRange" in hr && "lockedMonthlyTimelineTeaser" in hr
  );
}

export function isV2CareerProof(c: unknown): boolean {
  return Boolean(
    c && typeof c === "object" && "currentPathFitScore" in c && "lockedTeaser" in c
  );
}

export function isV2HardResetPaid(hr: unknown): boolean {
  return Boolean(hr && typeof hr === "object" && Array.isArray((hr as Record<string, unknown>).chapters));
}

export function isV2CareerPaid(c: unknown): boolean {
  return Boolean(
    c && typeof c === "object" && Array.isArray((c as Record<string, unknown>).pathComparison)
  );
}

export function normalizeFreePayloadForUi(
  raw: BlueprintFreePayload
): BlueprintFreePayload {
  const hrRaw = raw.hardReset as unknown as Record<string, unknown>;
  const cRaw = raw.career as unknown as Record<string, unknown>;

  const hardReset: BlueprintFreePayload["hardReset"] = isV2HardResetProof(hrRaw)
    ? raw.hardReset
    : {
        primaryYearRange: String(hrRaw.window ?? "2021 – 2023"),
        primaryChapterTitle: String(hrRaw.chapterLabel ?? "The Structural Reset"),
        introHook: String(hrRaw.description ?? ""),
        concreteRealLifeThemes: [
          String(hrRaw.description ?? "A pivotal stretch that forced sharper personal boundaries."),
          "Old routines stopped fitting, pushing you toward a more honest next chapter.",
        ],
        whatItRewired:
          "You came out clearer about your standards and less willing to waste energy on misaligned commitments.",
        secondaryYearWindow: {
          yearRange: "Prior Cycle",
          chapterTitle: "The Earlier Stress-Test",
          oneLineSnapshot: "Heavy responsibilities colliding with quiet personal restlessness.",
        },
        lockedMonthlyTimelineTeaser: {
          totalLockedFlashpoints: 6,
          lockedChaptersSpan: String(hrRaw.window ?? "Past 10 Years"),
          previewItems: [
            { id: "legacy_1", yearLabel: "2022", title: "The Turning Point" },
            { id: "legacy_2", yearLabel: "2023", title: "Boundary Reset" },
          ],
          paywallCtaLine:
            "Unlock your full deep breakdown and upcoming pressure window inside the Full Blueprint.",
        },
      };

  const career: BlueprintFreePayload["career"] = isV2CareerProof(cRaw)
    ? raw.career
    : {
        currentPathFitScore: Number(cRaw.alignmentScore ?? 65),
        fitHeadline: String(cRaw.subtitle ?? "Strong execution, ready for more ownership"),
        sweetSpotLabel: String(cRaw.idealModePill ?? "Systems Builder"),
        whyYouAreGood:
          "You bring steady problem-solving stamina and calm judgment when things get complex.",
        whyItFeelsEmptyOrShifting:
          "Pure routine without meaningful ownership or human impact quietly drains your motivation over time.",
        howWorkSeesYou:
          "People rely on you as a dependable fixer—sometimes overlooking the bigger builder vision you carry inside.",
        lockedTeaser: {
          fieldAuditQuestion: "Does your current path really fit you?",
          alternativeLanesCount: 4,
          timingYearLabel: "2027",
          paywallCtaLine:
            "Unlock your 3-path score breakdown, hidden alternative lanes, and next 12 months.",
        },
      };

  return {
    ...raw,
    hardReset,
    career,
  };
}

export function normalizePaidPayloadForUi(
  raw: BlueprintPaidPayload | null
): BlueprintPaidPayload | null {
  if (!raw) return null;

  const hrRaw = raw.hardReset as unknown as Record<string, unknown>;
  const cRaw = raw.career as unknown as Record<string, unknown>;

  const hardReset: BlueprintPaidPayload["hardReset"] = isV2HardResetPaid(hrRaw)
    ? raw.hardReset
    : {
        chapters: [
          {
            chapterId: "legacy_ch_1",
            yearRange: "Primary Reset",
            chapterTitle: "Hard Reset Breakdown",
            flashpoints: [
              {
                id: "legacy_fp_1",
                monthRange: "Core Pressure Peak",
                title: "The Structural Compression",
                realLifeEvent: String(hrRaw.deepBreakdown ?? ""),
              },
            ],
            howItFeltInside: String(hrRaw.deepBreakdown ?? ""),
            whatItRewired: String(hrRaw.resilienceBuilt ?? ""),
          },
        ],
        corePatternThread: String(hrRaw.resilienceBuilt ?? ""),
        nextPressureWindow: {
          monthRange: String(hrRaw.nextPressureWindow ?? "Upcoming Window"),
          windowTitle: "Next Pressure Checkpoint",
          whatToExpect: String(hrRaw.preparationNote ?? ""),
          prepMoves: [
            "Protect your cash buffer and avoid impulsive leaps.",
            "Simplify low-leverage commitments early.",
            "Keep a consistent evening recovery habit.",
          ],
        },
      };

  const career: BlueprintPaidPayload["career"] = isV2CareerPaid(cRaw)
    ? raw.career
    : {
        pathComparison: [
          {
            pathKey: "day_job",
            pathLabel: "Sticking Purely to a 9–5",
            fitScore: 62,
            isRecommended: false,
            honestMentorTake: String(cRaw.jobVsBusinessVerdict ?? ""),
          },
          {
            pathKey: "going_solo",
            pathLabel: "Full Solo Leap",
            fitScore: 70,
            isRecommended: false,
            honestMentorTake: String(cRaw.dutyVsPurposeGap ?? ""),
          },
          {
            pathKey: "hybrid_side_build",
            pathLabel: String(cRaw.verdictBadge ?? "Building on the Side First"),
            fitScore: 86,
            isRecommended: true,
            honestMentorTake: String(cRaw.jobVsBusinessVerdict ?? ""),
          },
        ],
        fieldAudit: {
          statedFieldLabel: "Your Current Track",
          whatFitsLikeAGlove: String(cRaw.currentFieldMatch ?? ""),
          whatIsMissing: String(cRaw.dutyVsPurposeGap ?? ""),
          yourBestNextStep: String(cRaw.timingPosture ?? ""),
        },
        hiddenAlternativeLanes: [
          {
            laneId: "advisory_systems",
            laneName: "Independent Advisory & Strategy",
            whyItFitsYou: "Turns your hard-won judgment into high-leverage guidance.",
          },
        ],
        perceptionGap: {
          insideYourHead: "You want meaningful ownership and clean standards.",
          whatCoworkersSee: "A dependable problem-solver they lean on under pressure.",
          simpleShiftToTry: "Claim visible strategic outcomes rather than invisible cleanup.",
        },
        moneyAndLeaks: {
          howMoneyGrowsForYou: "Compounds through trust, durable systems, and repeatable leverage.",
          quietHabitCostingYou: "Staying too long in under-leveraged roles or over-polishing before charging.",
        },
        next12Months: {
          bigPictureSummary: String(cRaw.timingPosture ?? ""),
          tightMonthlyWindows: [],
          mindBodyPacingTip: "Protect a clear evening shutdown to prevent sprint-and-crash fatigue.",
        },
      };

  return {
    ...raw,
    hardReset,
    career,
  };
}
