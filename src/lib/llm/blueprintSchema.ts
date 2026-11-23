import { z } from "zod";

// ============================================================================
// HOOK #1: HARD RESET (FREE YEARLY PROOF vs. PAID TIGHT MONTHLY TIMELINE)
// ============================================================================
export const LockedMonthlyTeaserSchema = z.object({
  id: z.string().min(1),
  yearLabel: z
    .string()
    .regex(/^\d{4}$/, "Must be a 4-digit year only (e.g., '2022'). Never include month names."),
  title: z
    .string()
    .min(3)
    .max(90)
    .describe("3-5 word visceral flashpoint title to create curiosity without revealing the month."),
});

export const HardResetProofSchema = z.object({
  primaryYearRange: z
    .string()
    .min(4)
    .max(32)
    .describe("Exact yearly span only, e.g. '2022 – 2023'. NEVER include months or seasons."),
  primaryChapterTitle: z.string().min(3).max(110),
  introHook: z.string().min(15).max(340),
  concreteRealLifeThemes: z
    .array(z.string().min(20).max(380))
    .min(2)
    .max(3)
    .describe("2-3 sharp, personalized everyday life themes for this yearly stretch. Zero clichés, zero month names."),
  whatItRewired: z
    .string()
    .min(15)
    .max(340)
    .describe("1 crisp sentence on the lasting shift this yearly chapter forged."),
  secondaryYearWindow: z.object({
    yearRange: z.string().min(4).max(32).describe("Yearly span only, e.g. '2020 – 2021'."),
    chapterTitle: z.string().min(3).max(110),
    oneLineSnapshot: z.string().min(15).max(340),
  }),
  lockedMonthlyTimelineTeaser: z.object({
    totalLockedFlashpoints: z.number().int().min(3).max(16),
    lockedChaptersSpan: z.string().min(4).max(40).describe("e.g., '2014 – 2023'"),
    previewItems: z
      .array(LockedMonthlyTeaserSchema)
      .min(2)
      .max(3)
      .describe("2-3 blurred-date teaser titles from the primary chapter. Year only, NO month names."),
    paywallCtaLine: z.string().min(15).max(300),
  }),
});

export const PaidMonthlyFlashpointSchema = z.object({
  id: z.string().min(1),
  monthRange: z
    .string()
    .min(5)
    .max(40)
    .describe("Exact 1-to-3-month range copied verbatim from hardResetTelemetry, e.g. 'Late Oct – Nov 2022'."),
  title: z
    .string()
    .min(3)
    .max(90)
    .describe("3-5 word visceral title matching or deepening the locked teaser."),
  realLifeEvent: z
    .string()
    .min(25)
    .max(420)
    .describe("1-2 sharp sentences naming concrete everyday events, emotions, or physical signals."),
});

export const HardResetPaidChapterSchema = z.object({
  chapterId: z.string().min(1),
  yearRange: z.string().min(4).max(24),
  chapterTitle: z.string().min(3).max(75),
  flashpoints: z
    .array(PaidMonthlyFlashpointSchema)
    .min(2)
    .max(4)
    .describe("Tight 1-to-3-month pressure spikes inside this yearly chapter."),
  howItFeltInside: z
    .string()
    .min(25)
    .max(440)
    .describe("Internal psychology + somatic/nervous-system stress signals (sleep, digestion, mental heat, fatigue)."),
  whatItRewired: z
    .string()
    .min(20)
    .max(380)
    .describe("Earned resilience AND the leftover survival reflex to watch out for today."),
});

export const HardResetDeepDiveSchema = z.object({
  chapters: z
    .array(HardResetPaidChapterSchema)
    .min(2)
    .max(4)
    .describe(
      "REQUIRED: Emit one entry for EVERY chapter in hardResetTelemetry.selected_chapters (minimum 2, up to 4 chapters; never emit only 1)."
    ),
  corePatternThread: z
    .string()
    .min(20)
    .max(420)
    .describe("1-2 sentences tying all reset chapters into one coherent evolution story."),
  nextPressureWindow: z.object({
    monthRange: z.string().min(4).max(40).describe("Exact upcoming 2-to-3-month window copied verbatim from telemetry."),
    windowTitle: z.string().min(3).max(100),
    whatToExpect: z.string().min(20).max(380),
    prepMoves: z.tuple([
      z.string().min(10).max(260),
      z.string().min(10).max(260),
      z.string().min(10).max(260),
    ]),
  }),
});

// ============================================================================
// HOOK #3: CAREER & BUSINESS ALIGNMENT (FREE FIT TEASER vs. PAID CAREER GUIDE)
// ============================================================================
export const CareerProofSchema = z.object({
  currentPathFitScore: z
    .number()
    .int()
    .min(35)
    .max(96)
    .describe("Must match careerTelemetry.scores.current_path_fit_score verbatim."),
  fitHeadline: z
    .string()
    .min(8)
    .max(140)
    .describe("Warm, everyday mentor summary, e.g. 'Great at the job, hungry for something deeper'."),
  sweetSpotLabel: z
    .string()
    .min(6)
    .max(110)
    .describe("Plain-English ideal mode, e.g. 'Problem-Solver -> Builder of Your Own Thing'."),
  whyYouAreGood: z
    .string()
    .min(25)
    .max(400)
    .describe("1-2 friendly mentor sentences explaining their natural edge."),
  whyItFeelsEmptyOrShifting: z
    .string()
    .min(25)
    .max(400)
    .describe("1-2 candid sentences naming the Competence Trap or transition clarity. Zero month names."),
  howWorkSeesYou: z
    .string()
    .min(25)
    .max(380)
    .describe("1-2 relatable sentences naming the workplace perception gap."),
  lockedTeaser: z.object({
    fieldAuditQuestion: z
      .string()
      .min(8)
      .max(130)
      .describe("e.g., 'Does Tech really fit you?' or 'Does your current track really fit you?'"),
    alternativeLanesCount: z.number().int().min(3).max(5),
    timingYearLabel: z
      .string()
      .regex(/^\d{4}(\s?[–-]\s?\d{4})?$/, "Year or year-span only (e.g. '2027' or '2026 – 2027'). NEVER include months."),
    paywallCtaLine: z.string().min(12).max(280),
  }),
});

export const CareerPathScoreItemSchema = z.object({
  pathKey: z.enum(["day_job", "going_solo", "hybrid_side_build"]),
  pathLabel: z.string().min(3).max(65),
  fitScore: z.number().int().min(35).max(96),
  isRecommended: z.boolean(),
  honestMentorTake: z
    .string()
    .min(25)
    .max(420)
    .describe("2 warm, plain-English sentences explaining why this score fits them right now."),
});

export const AlternativeLaneSchema = z.object({
  laneId: z.string().min(2),
  laneName: z.string().min(3).max(110),
  whyItFitsYou: z.string().min(25).max(380),
});

export const ForwardCareerWindowSchema = z.object({
  id: z.string().min(1),
  monthRange: z
    .string()
    .min(5)
    .max(40)
    .describe("Exact 1-to-3-month range copied verbatim from careerTelemetry.forward_12m_timing.upcoming_windows."),
  windowTitle: z
    .string()
    .min(4)
    .max(100)
    .describe("Friendly, human label, e.g. 'Great Time to Put It Out There' or 'Watch Your Patience at Work'."),
  practicalGuidance: z
    .string()
    .min(30)
    .max(420)
    .describe("2 warm, actionable mentor sentences on what to do and what to avoid in these exact months."),
});

export const CareerDeepDiveSchema = z.object({
  pathComparison: z
    .array(CareerPathScoreItemSchema)
    .length(3)
    .describe("Must contain day_job, going_solo, and hybrid_side_build with exact telemetry scores."),
  fieldAudit: z.object({
    statedFieldLabel: z.string().min(2).max(75),
    whatFitsLikeAGlove: z.string().min(25).max(400),
    whatIsMissing: z.string().min(25).max(400),
    yourBestNextStep: z.string().min(30).max(420),
  }),
  hiddenAlternativeLanes: z.array(AlternativeLaneSchema).min(3).max(5),
  perceptionGap: z.object({
    insideYourHead: z.string().min(20).max(360),
    whatCoworkersSee: z.string().min(20).max(360),
    simpleShiftToTry: z.string().min(25).max(380),
  }),
  moneyAndLeaks: z.object({
    howMoneyGrowsForYou: z.string().min(25).max(400),
    quietHabitCostingYou: z.string().min(25).max(400),
  }),
  next12Months: z.object({
    bigPictureSummary: z.string().min(30).max(420),
    tightMonthlyWindows: z.array(ForwardCareerWindowSchema).min(2).max(4),
    mindBodyPacingTip: z
      .string()
      .min(25)
      .max(400)
      .describe("1 grounded everyday habit to protect sleep, nerves, and focus without burnout."),
  }),
});

// ============================================================================
// HOOK #2: CONDITIONAL RELATIONSHIP MIRROR (SINGLE-BRANCH, YEARLY FREE -> MONTHLY PAID)
// ============================================================================
export const RelationshipProofSchema = z.object({
  relationshipStatus: z.enum(["single", "dating", "married"]),
  lovableContradictionHeadline: z
    .string()
    .min(18)
    .max(140)
    .describe("Warm, playful contradiction headline contrasting outer armor vs. inner heart."),
  caughtRedHandedTell: z
    .string()
    .min(55)
    .max(440)
    .describe("Hyper-specific texting, date-night, or everyday interaction habit that makes them laugh and feel seen."),
  somaticBodyTell: z
    .string()
    .min(45)
    .max(360)
    .describe("Concrete physical/nervous-system tell when emotional uncertainty or tension hits."),
  pastLoveShift: z.object({
    yearRange: z
      .string()
      .regex(/^\d{4}(\s?[–-]\s?\d{4})?$/, "Yearly range only (e.g. '2022 – 2023'). NEVER include month names."),
    whatShifted: z
      .string()
      .min(50)
      .max(360)
      .describe("Warm, relatable reflection on how their standards or love life shifted in that yearly stretch."),
    accuracyPrompt: z.string().min(12).max(160),
  }),
  halfUnlockedCliffhanger: z.object({
    unlockedHalf: z
      .string()
      .min(35)
      .max(300)
      .describe("Give away who sparks their interest or what makes them click to prove accuracy."),
    lockedHalfTeaser: z
      .string()
      .min(30)
      .max(260)
      .describe("Curiosity gap teasing the exact trait/loop unlocked in the $19 guide."),
  }),
  lockedTimingYearLabel: z
    .string()
    .regex(/^\d{4}(\s?[–-]\s?\d{4})?$/, "Year or year-span only. NEVER include month names."),
});

export const ForwardLoveWindowSchema = z.object({
  id: z.string().min(1),
  monthRange: z
    .string()
    .min(5)
    .max(40)
    .describe("Exact 1-to-3-month range copied verbatim from relationshipTelemetry.paidLayerSignals.forward12mTiming."),
  windowTitle: z.string().min(5).max(95),
  practicalGuidance: z.string().min(55).max(380),
});

export const SharedPaidRelationshipTimingSchema = z.object({
  bigPictureSummary: z.string().min(50).max(380),
  tightMonthlyWindows: z
    .array(ForwardLoveWindowSchema)
    .min(2)
    .max(4)
    .describe(
      "REQUIRED: Emit 2 to 4 upcoming monthly timing windows matching telemetry verbatim (minimum 2)."
    ),
});

export const SinglePaidRelationshipSchema = z.object({
  relationshipStatus: z.literal("single"),
  sparkVsPeace: z.object({
    whoCatchesYourEye: z.string().min(45).max(360),
    whereTheGapHides: z.string().min(55).max(380),
    whatToStopExcusing: z.string().min(40).max(320),
  }),
  singleBlindSpot: z.object({
    loopName: z.string().min(5).max(95),
    howItPlaysOut: z.string().min(60).max(400),
    gentleMentorReset: z.string().min(50).max(360),
  }),
  greenFlagBodyCheck: z.string().min(50).max(360),
  next12Months: SharedPaidRelationshipTimingSchema,
});

export const DatingPaidRelationshipSchema = z.object({
  relationshipStatus: z.literal("dating"),
  realAlignmentCheck: z.object({
    sparkVsPace: z.string().min(55).max(380),
    threeAlignmentSigns: z.array(z.string().min(25).max(260)).length(3),
  }),
  earlyDatingFriction: z.object({
    loopName: z.string().min(5).max(95),
    howItShowsUp: z.string().min(55).max(380),
    tenSecondShift: z.string().min(50).max(360),
  }),
  pacingAndBoundariesTip: z.string().min(50).max(360),
  next12Months: SharedPaidRelationshipTimingSchema,
});

export const MarriedPaidRelationshipSchema = z.object({
  relationshipStatus: z.literal("married"),
  marriageBlueprint: z.object({
    whereYouTrulyClick: z.string().min(55).max(380),
    silentFrictionPoint: z.string().min(60).max(400),
    leavingOutsideStressAtDoor: z.string().min(50).max(360),
  }),
  tenSecondShift: z.object({
    exactPhraseToTry: z.string().min(30).max(300),
    whyItSoftensTheRoom: z.string().min(45).max(360),
  }),
  next12Months: SharedPaidRelationshipTimingSchema,
});

export const RelationshipDeepDiveSchema = z.discriminatedUnion("relationshipStatus", [
  SinglePaidRelationshipSchema,
  DatingPaidRelationshipSchema,
  MarriedPaidRelationshipSchema,
]);

export const RelationshipOnlySchema = z.object({
  hookProofRelationship: RelationshipProofSchema,
  fullBlueprintRelationship: RelationshipDeepDiveSchema,
});

// ============================================================================
// COMBINED FREE PROOF & PAID FULL BLUEPRINT SCHEMAS
// ============================================================================
export const HookProofSchema = z.object({
  hardReset: HardResetProofSchema,
  relationship: RelationshipProofSchema,
  career: CareerProofSchema,
  selfSabotage: z.object({
    loopName: z
      .string()
      .min(4)
      .describe("Crisp evocative loop name, e.g. 'The Urgency Loop'."),
    symptomSentence: z
      .string()
      .min(15)
      .describe("1 painfully relatable sentence describing how this loop feels in real life."),
  }),
  eras: z.object({
    era1: z.object({
      id: z.literal("era1"),
      label: z.literal("Era 1"),
      title: z.string().min(3).describe("2-4 word evocative chapter title."),
      dateRange: z.string().min(4).describe("Exact Era 1 dateRange from input."),
      summary: z.string().min(15).describe("1-2 concise sentences summarizing Era 1."),
    }),
    era2: z.object({
      id: z.literal("era2"),
      label: z.literal("Era 2"),
      title: z.string().min(3).describe("2-4 word evocative chapter title."),
      dateRange: z.string().min(4).describe("Exact Era 2 dateRange from input."),
      summary: z.string().min(15).describe("1-2 concise sentences summarizing Era 2."),
    }),
    era3Preview: z.object({
      title: z.string().min(3).describe("2-4 word title for the current chapter."),
      dateRange: z.string().min(4).describe("Exact Era 3 dateRange from input."),
      percentComplete: z
        .number()
        .int()
        .min(0)
        .max(100)
        .describe("Exact Era 3 completion percentage from input."),
    }),
  }),
  upgrade_hint: z
    .string()
    .nullable()
    .describe(
      "Null when precisionMode is 'exact'. Otherwise a warm 1-sentence hint noting that adding an exact birth time later unlocks deeper career and timeline precision for free."
    ),
});

export const FullBlueprintSchema = z.object({
  hardReset: HardResetDeepDiveSchema,
  relationship: RelationshipDeepDiveSchema,
  career: CareerDeepDiveSchema,
  selfSabotage: z.object({
    triggerMapLove: z
      .string()
      .min(20)
      .describe("How this #1 self-sabotage loop quietly shows up in love/relationships."),
    triggerMapCareer: z
      .string()
      .min(20)
      .describe("How this #1 self-sabotage loop quietly shows up in career/decisions."),
    antidoteSteps: z
      .tuple([z.string().min(12), z.string().min(12), z.string().min(12)])
      .describe("Exactly 3 grounded, secular cognitive/somatic antidote steps."),
  }),
  eras: z.object({
    era3Playbook: z.object({
      coreMandate: z
        .string()
        .min(20)
        .describe("Core strategic mandate for the current Era 3 chapter."),
      doubleDown: z
        .string()
        .min(20)
        .describe("Specific behaviors, environments, and bets to double down on now."),
      eliminate: z
        .string()
        .min(20)
        .describe("Specific patterns, obligations, and energy leaks to eliminate now."),
    }),
    era4Preview: z.object({
      title: z.string().min(3).describe("2-4 word title for the upcoming Era 4 chapter."),
      dateRange: z.string().min(4).describe("Exact Era 4 dateRange from input."),
      theme: z.string().min(20).describe("High-level theme and opportunity of Era 4."),
    }),
  }),
});

export const SynthesizedBlueprintSchema = z.object({
  hook_proof_json: HookProofSchema,
  full_blueprint_json: FullBlueprintSchema,
});

export type HardResetProofPayload = z.infer<typeof HardResetProofSchema>;
export type HardResetDeepDivePayload = z.infer<typeof HardResetDeepDiveSchema>;
export type RelationshipProofPayload = z.infer<typeof RelationshipProofSchema>;
export type RelationshipDeepDivePayload = z.infer<typeof RelationshipDeepDiveSchema>;
export type RelationshipOnlyPayload = z.infer<typeof RelationshipOnlySchema>;
export type CareerProofPayload = z.infer<typeof CareerProofSchema>;
export type CareerDeepDivePayload = z.infer<typeof CareerDeepDiveSchema>;
export type HookProofPayload = z.infer<typeof HookProofSchema>;
export type FullBlueprintPayload = z.infer<typeof FullBlueprintSchema>;
export type SynthesizedBlueprintPayload = z.infer<
  typeof SynthesizedBlueprintSchema
>;
