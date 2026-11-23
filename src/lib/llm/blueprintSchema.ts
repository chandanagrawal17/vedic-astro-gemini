import { z } from "zod";

export const HookProofSchema = z.object({
  hardReset: z.object({
    window: z
      .string()
      .min(4)
      .describe("Exact year range of the Hard Reset period provided in input."),
    chapterLabel: z
      .string()
      .min(3)
      .describe("Crisp 2-4 word evocative chapter title, e.g. 'The Structural Stripping'."),
    description: z
      .string()
      .min(20)
      .describe("Exactly 2 sharp, candid sentences capturing the emotional weight of that period."),
  }),
  relationship: z.object({
    branch: z.enum(["partnered", "solo"]),
    archetype: z
      .string()
      .min(6)
      .describe("1 crisp relational archetype line tailored to their relationship status."),
    teaserBadge: z
      .string()
      .min(6)
      .describe("Short locked friction teaser badge, e.g. '1 Core Partner Friction Trigger Detected'."),
  }),
  career: z.object({
    alignmentScore: z
      .number()
      .int()
      .min(35)
      .max(96)
      .describe("Integer 35-96 career alignment fit score."),
    subtitle: z
      .string()
      .min(4)
      .describe("Crisp 3-4 word fit label, e.g. 'High Stamina, Low Fulfillment'."),
    idealModePill: z
      .string()
      .min(3)
      .describe("1-2 word ideal operating mode label, e.g. 'Systems Architect' or 'Strategist'."),
  }),
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
      "Null when precisionMode is 'exact'. Otherwise a warm 1-sentence hint noting that adding an exact birth time later unlocks deeper career and partnership precision for free."
    ),
});

export const FullBlueprintSchema = z.object({
  hardReset: z.object({
    deepBreakdown: z
      .string()
      .min(30)
      .describe("Deep structural lesson of why that reset period happened in plain behavioral terms."),
    resilienceBuilt: z
      .string()
      .min(20)
      .describe("The permanent skill, boundary, or emotional resilience forged during that window."),
    nextPressureWindow: z
      .string()
      .min(4)
      .describe("Exact nextPressureWindow string from input."),
    preparationNote: z
      .string()
      .min(20)
      .describe("Proactive, high-agency preparation advice for the next pressure window."),
  }),
  relationship: z.object({
    coreAlignmentProfile: z
      .string()
      .min(30)
      .describe("How they bond, feel safe, and experience alignment—tailored to Married/Relationship vs Single/Shifting."),
    silentFrictionPattern: z
      .string()
      .min(25)
      .describe("The subtle friction dynamic framed constructively with zero fatalism or doom."),
    communicationShifts: z
      .tuple([z.string().min(12), z.string().min(12)])
      .describe("Exactly 2 concrete, practical communication shifts."),
    clarityWindow: z
      .string()
      .min(6)
      .describe("Upcoming relationship clarity window grounded in their timing."),
  }),
  career: z.object({
    verdictBadge: z
      .string()
      .min(4)
      .describe("Short verdict badge, e.g. 'Hybrid Builder -> Autonomous Lead'."),
    jobVsBusinessVerdict: z
      .string()
      .min(30)
      .describe("Clear Job vs. Business verdict comparing natural edge vs. how leadership/peers read them."),
    currentFieldMatch: z
      .string()
      .min(25)
      .describe("Direct evaluation of their stated careerField (or current trajectory if blank)."),
    dutyVsPurposeGap: z
      .string()
      .min(20)
      .describe("How to bridge practical stability with genuine internal fulfillment."),
    timingPosture: z
      .string()
      .min(25)
      .describe("1 concrete next move and 12-month timing posture."),
  }),
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

export type HookProofPayload = z.infer<typeof HookProofSchema>;
export type FullBlueprintPayload = z.infer<typeof FullBlueprintSchema>;
export type SynthesizedBlueprintPayload = z.infer<
  typeof SynthesizedBlueprintSchema
>;
