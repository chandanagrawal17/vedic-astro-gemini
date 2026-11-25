import { type AstroPrecisionMode, toUiPrecisionMode } from "@/lib/astro/types";
import type {
  PersonalNatureApiResponse,
  PersonalNatureTellOutput,
} from "@/lib/llm/personalNatureSchema";

export const PERSONAL_NATURE_CATEGORY_SLUGS = [
  "inside_vs_outside",
  "under_pressure",
  "blind_spots_and_drive",
  "turning_points",
] as const;

export type PersonalNatureCategorySlug =
  (typeof PERSONAL_NATURE_CATEGORY_SLUGS)[number];

export interface PersonalNatureCategoryMeta {
  slug: PersonalNatureCategorySlug;
  title: string;
  subtitle: string;
  day1Count: number;
  day2Count: number;
  totalCount: number;
}

/**
 * 4 permanent Personal Nature categories ("Mind & Rhythm" is intentionally excluded).
 */
export const PERSONAL_NATURE_CATEGORIES: readonly PersonalNatureCategoryMeta[] = [
  {
    slug: "inside_vs_outside",
    title: "Inside vs. Outside",
    subtitle: "Who you are in your heart vs. how people read you",
    day1Count: 2,
    day2Count: 3,
    totalCount: 5,
  },
  {
    slug: "under_pressure",
    title: "Under Pressure",
    subtitle: "How stress shows up in your body, reactions & rest",
    day1Count: 3,
    day2Count: 2,
    totalCount: 5,
  },
  {
    slug: "blind_spots_and_drive",
    title: "Blind Spots & Drive",
    subtitle: "Quiet habits that drain you & what makes life feel full",
    day1Count: 2,
    day2Count: 3,
    totalCount: 5,
  },
  {
    slug: "turning_points",
    title: "Turning Points",
    subtitle: "The chapters that quietly shaped who you are today",
    day1Count: 1,
    day2Count: 2,
    totalCount: 3,
  },
] as const;

export interface PersonalNatureCatalogItem {
  orderIndex: number;
  tellId: string;
  dateOnlyFallbackTellId?: string;
  category: PersonalNatureCategorySlug;
  unlockDay: 1 | 2;
  requiresExactTime: boolean;
  houseDependent: boolean;
  lockedTeaserTitle: string;
  promptInstruction: string;
  dateOnlyPromptInstruction: string;
}

export interface ResolvedPersonalNatureCatalogItem {
  orderIndex: number;
  canonicalTellId: string;
  tellId: string;
  category: PersonalNatureCategorySlug;
  unlockDay: 1 | 2;
  houseDependent: boolean;
  lockedTeaserTitle: string;
  promptInstruction: string;
}

export const PERSONAL_NATURE_CATALOG: readonly PersonalNatureCatalogItem[] = [
  // =========================================================================
  // Category 1: Inside vs. Outside (2 Day-1 + 3 Day-2 = 5)
  // =========================================================================
  {
    orderIndex: 1,
    tellId: "core_contradiction",
    category: "inside_vs_outside",
    unlockDay: 1,
    requiresExactTime: false,
    houseDependent: false,
    lockedTeaserTitle: "The Tender Contrast Beneath Your Capable Armor",
    promptInstruction:
      "Gently reveal the tender contrast between the capable, self-reliant armor they wear in public and what their heart quietly longs for in private.",
    dateOnlyPromptInstruction:
      "Gently reveal the tender contrast between the capable outward drive people notice first and what their heart quietly longs for in private—without claiming rising-sign room projection.",
  },
  {
    orderIndex: 2,
    tellId: "perception_gap",
    dateOnlyFallbackTellId: "silent_first_impression",
    category: "inside_vs_outside",
    unlockDay: 1,
    requiresExactTime: true,
    houseDependent: true,
    lockedTeaserTitle: "Why People Often Misread Your Calm Composure at First",
    promptInstruction:
      "Reassure them warmly about why rooms often misread their composure, focus, or directness before really knowing the soft-hearted person underneath.",
    dateOnlyPromptInstruction:
      "Speak warmly to the contrast between their steady everyday character drive and their deeper emotional sensitivity—reassuring them why new acquaintances only catch the surface calm before earning their real warmth. Do NOT reference room-entry impressions or house-dependent public projection.",
  },
  {
    orderIndex: 3,
    tellId: "advice_skepticism",
    category: "inside_vs_outside",
    unlockDay: 2,
    requiresExactTime: false,
    houseDependent: false,
    lockedTeaserTitle: "Why You Rarely Take Advice at Face Value",
    promptInstruction:
      "Explain warmly why they never take advice purely because of someone's title, how they quietly test wisdom against real lived experience, and how deeply loyal they become once trust is truly earned.",
    dateOnlyPromptInstruction:
      "Explain warmly why they never swallow advice purely because of someone's title, how they test ideas against lived reality first, and how loyal they become once someone proves genuine.",
  },
  {
    orderIndex: 4,
    tellId: "living_room_self",
    category: "inside_vs_outside",
    unlockDay: 2,
    requiresExactTime: false,
    houseDependent: true,
    lockedTeaserTitle: "The Warm, Playful Side Only Your Inner Circle Sees",
    promptInstruction:
      "Speak tenderly about the warm, generous, playful living-room version of themselves that comes out at home with the tiny circle they completely trust.",
    dateOnlyPromptInstruction:
      "Speak tenderly about the warm, generous, silly side of them that only comes out around the few people who make their heart feel completely safe.",
  },
  {
    orderIndex: 5,
    tellId: "care_sounds_like_critique",
    category: "inside_vs_outside",
    unlockDay: 2,
    requiresExactTime: false,
    houseDependent: false,
    lockedTeaserTitle: "When Your Deepest Care Sounds Like Fixing",
    promptInstruction:
      "Validate first that when they jump straight into spotting snags and offering practical fixes for someone they love, it comes purely from caring deeply—then softly show why loved ones sometimes just need a hug or quiet comfort first.",
    dateOnlyPromptInstruction:
      "Validate first that jumping straight into problem-solving for someone they love comes purely from a caring, protective heart—then softly show why loved ones sometimes just need quiet comfort before solutions.",
  },

  // =========================================================================
  // Category 2: Under Pressure (3 Day-1 + 2 Day-2 = 5)
  // =========================================================================
  {
    orderIndex: 6,
    tellId: "body_tell_under_stress",
    category: "under_pressure",
    unlockDay: 1,
    requiresExactTime: false,
    houseDependent: false,
    lockedTeaserTitle: "How Your Body Whispers Before You Admit You're Tired",
    promptInstruction:
      "Gently name 2 everyday physical cues (such as an unsettled stomach, tight jaw, light sleep, or tense shoulders) and 1 late-night habit that tip them off before they admit they're worn thin. Zero clinical or medical claims.",
    dateOnlyPromptInstruction:
      "Gently name 2 everyday physical cues (such as light sleep, tight shoulders, or an unsettled stomach) and 1 late-night habit that show up before they admit they're tired. Zero clinical or medical claims.",
  },
  {
    orderIndex: 7,
    tellId: "silent_shutdown_tell",
    category: "under_pressure",
    unlockDay: 1,
    requiresExactTime: false,
    houseDependent: false,
    lockedTeaserTitle: "The Quiet Way You Step Back When Let Down",
    promptInstruction:
      "Describe with deep compassion the subtle way they pull back when disrespected or let down—such as going quiet and extra polite, closing the door in their heart long before making a scene.",
    dateOnlyPromptInstruction:
      "Describe with deep compassion the subtle way they pull back when let down—staying calm and polite on the outside while quietly stepping back inside their heart.",
  },
  {
    orderIndex: 8,
    tellId: "real_vs_fake_recovery",
    category: "under_pressure",
    unlockDay: 1,
    requiresExactTime: false,
    houseDependent: true,
    lockedTeaserTitle: "Why Ordinary 'Downtime' Still Leaves You Tired",
    promptInstruction:
      "Gently name 1 common 'fake rest' habit (like late-night phone scrolling or noisy group plans) that still leaves them humming with tiredness, then offer 2 simple, comforting ways their shoulders genuinely drop.",
    dateOnlyPromptInstruction:
      "Gently name 1 common 'fake rest' habit (like endless screen scrolling or half-hearted socializing) that doesn't really recharge them, then offer 2 simple, grounding habits that truly let them exhale.",
  },
  {
    orderIndex: 9,
    tellId: "ignoring_exhaustion",
    category: "under_pressure",
    unlockDay: 2,
    requiresExactTime: false,
    houseDependent: false,
    lockedTeaserTitle: "Why You Push Past Tiredness Out of Quiet Duty",
    promptInstruction:
      "Compassionately honor how much responsibility they carry—calling out how they push quietly past their own tiredness out of pride and care until their body forces a pause, and reminding them they don't have to run empty to earn rest.",
    dateOnlyPromptInstruction:
      "Compassionately honor their sense of duty—showing how they keep pushing past tiredness out of quiet pride until they hit a wall, and reminding them rest doesn't have to be earned by running empty.",
  },
  {
    orderIndex: 10,
    tellId: "calm_in_crisis_impatient_in_delays",
    category: "under_pressure",
    unlockDay: 2,
    requiresExactTime: false,
    houseDependent: false,
    lockedTeaserTitle: "Steady in a Real Storm, Tested by Small Delays",
    promptInstruction:
      "Affectionately point out the endearing contradiction where minor everyday slowness or messy small talk tests their patience quickly, yet during a real emergency they become the calmest, steadiest anchor in the room.",
    dateOnlyPromptInstruction:
      "Affectionately point out how small everyday delays can test their patience in seconds, yet when a real storm hits they turn into the steadiest, clearest person everyone leans on.",
  },

  // =========================================================================
  // Category 3: Blind Spots & Drive (2 Day-1 + 3 Day-2 = 5)
  // =========================================================================
  {
    orderIndex: 11,
    tellId: "private_self_sabotage",
    category: "blind_spots_and_drive",
    unlockDay: 1,
    requiresExactTime: false,
    houseDependent: false,
    lockedTeaserTitle: "The Quiet Habit That Steals Joy Right After a Win",
    promptInstruction:
      "Validate their high standards first, then warmly name the one quiet habit that steals their joy right around a win—like carrying pressure in silence, spotting the next flaw within a day, or rushing past celebration.",
    dateOnlyPromptInstruction:
      "Validate how much they care about doing things right, then warmly name the quiet habit that steals joy right after a milestone—like spotting what's still unfinished instead of letting themselves feel proud.",
  },
  {
    orderIndex: 12,
    tellId: "hidden_fulfillment_leak",
    category: "blind_spots_and_drive",
    unlockDay: 1,
    requiresExactTime: false,
    houseDependent: false,
    lockedTeaserTitle: "Why Looking Successful on Paper Still Feels Heavy",
    promptInstruction:
      "Validate why checking all the practical boxes on paper can still leave a quiet heaviness in their chest whenever daily effort loses touch with real meaning, honesty, and human care.",
    dateOnlyPromptInstruction:
      "Validate why steady outward progress still feels quietly hollow whenever their day-to-day effort gets disconnected from real meaning, sincerity, and caring for actual people.",
  },
  {
    orderIndex: 13,
    tellId: "guest_even_at_home",
    category: "blind_spots_and_drive",
    unlockDay: 2,
    requiresExactTime: false,
    houseDependent: true,
    lockedTeaserTitle: "Feeling Half-Detached Even in Familiar Rooms",
    promptInstruction:
      "Reassure them tenderly if a quiet part of them sometimes feels like an observer even in comfortable spaces—reminding them nothing is wrong with them, and their truest sense of home lives inside their own quiet peace.",
    dateOnlyPromptInstruction:
      "Reassure them tenderly if a quiet part of their heart sometimes feels slightly separate from noisy crowds—reminding them their deepest sense of belonging comes from peaceful, honest moments rather than fitting every room.",
  },
  {
    orderIndex: 14,
    tellId: "giving_vs_asking_pride",
    category: "blind_spots_and_drive",
    unlockDay: 2,
    requiresExactTime: false,
    houseDependent: false,
    lockedTeaserTitle: "Quick to Show Up for Others, Slow to Ask for Help",
    promptInstruction:
      "Acknowledge their generous heart and quiet pride about never wanting to burden or owe anyone—then gently remind them that letting trusted people help is one of the sweetest ways to let others love them back.",
    dateOnlyPromptInstruction:
      "Acknowledge how generously they show up for people they love while hating to ask for anything themselves—then gently remind them that letting someone support them lets love flow both ways.",
  },
  {
    orderIndex: 15,
    tellId: "polishing_in_the_dark",
    category: "blind_spots_and_drive",
    unlockDay: 2,
    requiresExactTime: false,
    houseDependent: false,
    lockedTeaserTitle: "Why You Keep Tweaking Details Behind Closed Doors",
    promptInstruction:
      "Speak warmly to why they keep quietly refining details behind the scenes long after their work is already good—honoring their craft while reassuring them people need their real voice, not spotless perfection.",
    dateOnlyPromptInstruction:
      "Speak warmly to why they keep refining things in private long after they're ready—honoring their pride in good craft while reassuring them the real thing they made already carries real value.",
  },

  // =========================================================================
  // Category 4: Turning Points (1 Day-1 + 2 Day-2 = 3)
  // =========================================================================
  {
    orderIndex: 16,
    tellId: "past_identity_rewire",
    category: "turning_points",
    unlockDay: 1,
    requiresExactTime: false,
    houseDependent: false,
    lockedTeaserTitle: "The Heavy Years That Quietly Built Your Backbone",
    promptInstruction:
      "Reference the exact 1–2 past year windows provided in `turningPointWindows.primaryWindows` (never say 'a few years ago') and speak warmly about how carrying that stretch quietly built their backbone and raised their self-respect.",
    dateOnlyPromptInstruction:
      "Reference the exact 1–2 past year windows provided in `turningPointWindows.primaryWindows` (yearly spans only, never vague 'a few years ago') and speak warmly about how those years quietly reshaped what they're willing to settle for.",
  },
  {
    orderIndex: 17,
    tellId: "full_plate_heavy_heart_window",
    category: "turning_points",
    unlockDay: 2,
    requiresExactTime: false,
    houseDependent: false,
    lockedTeaserTitle: "The Stretch Where You Carried Duty on a Tired Heart",
    promptInstruction:
      "Reference the exact recent year window in `turningPointWindows.secondaryHeavyDutyWindow` and validate how hard they worked while feeling like they were walking uphill in heavy shoes—breaking the spell of chasing empty checkboxes.",
    dateOnlyPromptInstruction:
      "Reference the exact recent year window in `turningPointWindows.secondaryHeavyDutyWindow` (yearly span only) and validate how carrying heavy responsibility on a tired heart taught them empty checkboxes aren't enough.",
  },
  {
    orderIndex: 18,
    tellId: "current_season_tug_of_war",
    category: "turning_points",
    unlockDay: 2,
    requiresExactTime: false,
    houseDependent: false,
    lockedTeaserTitle: "Today's Quiet Pull Between Bold Growth & Peace",
    promptInstruction:
      "Name the gentle two-way pull they feel right now between wanting to build something bold and life nudging them to protect their peace, rest, and clear old clutter—reassuring them they aren't stalling, they're clearing the table.",
    dateOnlyPromptInstruction:
      "Name the gentle two-way pull they feel right now between wanting fresh forward momentum and needing to protect their peace and clear old clutter—reassuring them they aren't behind, they're setting a cleaner foundation.",
  },
] as const;

/**
 * Resolves the 18 catalog items for a given chart precision mode, swapping
 * `perception_gap` -> `silent_first_impression` when exact birth time is unavailable.
 */
export function resolvePersonalNatureCatalog(
  precisionMode: AstroPrecisionMode
): ResolvedPersonalNatureCatalogItem[] {
  const isExact = precisionMode === "exact";

  return PERSONAL_NATURE_CATALOG.map((item) => {
    const useDateOnly = !isExact;
    const resolvedTellId =
      useDateOnly && item.dateOnlyFallbackTellId
        ? item.dateOnlyFallbackTellId
        : item.tellId;

    return {
      orderIndex: item.orderIndex,
      canonicalTellId: item.tellId,
      tellId: resolvedTellId,
      category: item.category,
      unlockDay: item.unlockDay,
      houseDependent: isExact ? item.houseDependent : false,
      lockedTeaserTitle: item.lockedTeaserTitle,
      promptInstruction: useDateOnly
        ? item.dateOnlyPromptInstruction
        : item.promptInstruction,
    };
  });
}

export function isHouseDependentTellId(
  tellId: string,
  precisionMode: AstroPrecisionMode
): boolean {
  if (precisionMode !== "exact") return false;
  const found = PERSONAL_NATURE_CATALOG.find((item) => item.tellId === tellId);
  return Boolean(found?.houseDependent);
}

const DEMO_TELL_COPY: Record<
  string,
  { headline: string; body: string; followUpPill: string }
> = {
  core_contradiction: {
    headline: "Capable Armor Around a Quietly Tender Heart",
    body: "You step up so naturally when things get messy that people assume you never need anyone to lean on. Underneath that steady competence, though, your heart quietly longs for one safe corner where you don't have to be the strong, capable one holding every detail together by yourself anymore.",
    followUpPill:
      "Who in your life lets you drop the strong armor without asking why?",
  },
  perception_gap: {
    headline: "Why Rooms Read Composure Before Your Warmth",
    body: "Because you listen carefully and carry yourself with calm focus, new rooms often read you as ultra-composed or hard to rattle before you even say much. They rarely guess how deeply you care underneath, or how quickly your warmth comes out once you know someone is genuinely sincere.",
    followUpPill:
      "Have people ever told you they found you intimidating before knowing you?",
  },
  silent_first_impression: {
    headline: "Calm on the Surface, Deeply Feeling Underneath",
    body: "People meeting you in everyday life usually notice your steady, self-contained calm long before they realize how much your heart picks up quietly. You protect your softer side out of self-respect, opening up completely only after someone's everyday actions match the kindness in their words.",
    followUpPill:
      "What small sign tells you someone is genuinely safe to open up around?",
  },
  advice_skepticism: {
    headline: "Why You Never Take Advice on Title Alone",
    body: "You have too much respect for real life to swallow someone's advice just because they hold a fancy title. You quietly test every big claim against lived reality first, which protects your integrity—and once someone actually walks their talk, there isn't a steadier, more loyal person in their corner.",
    followUpPill:
      "Whose quiet example has earned your deepest trust over the years?",
  },
  living_room_self: {
    headline: "The Playful Living-Room Side Almost Nobody Sees",
    body: "Most of the world only meets your focused, responsible daytime self who keeps promises and handles heavy tasks cleanly. Yet behind closed doors with the two or three people your heart completely trusts, a warm, generous, surprisingly silly side of you comes out and finally lets your shoulders drop.",
    followUpPill:
      "When was the last evening you felt that easy, unguarded laugh at home?",
  },
  care_sounds_like_critique: {
    headline: "When Deep Care Accidentally Sounds Like Fixing",
    body: "When someone you love is hurting or stressed, your caring heart jumps straight into spotting snags and solving the problem so they won't struggle. That impulse comes from pure devotion, even if loved ones sometimes just need you to sit close and hold their hand before fixing anything.",
    followUpPill:
      "How does it feel when you pause fixing and simply sit with someone?",
  },
  body_tell_under_stress: {
    headline: "How Your Body Whispers Before You Admit Fatigue",
    body: "Long before you ever complain out loud, your body keeps honest score for you—showing up as tight shoulders, a clenched jaw, an unsettled stomach, or weirdly light sleep. Catching yourself tidying late at night or replaying tomorrow's list is your gentle cue to put the kettle on and rest.",
    followUpPill:
      "Which physical cue usually tips you off first when you're stretched thin?",
  },
  silent_shutdown_tell: {
    headline: "Going Extra Polite When Your Heart Steps Back",
    body: "You protect your dignity by refusing to beg for basic respect or start loud, messy scenes when someone lets you down. Instead, you turn extra calm, brief, and polite on the outside while quietly closing the door in your heart—already halfway gone before the other person notices.",
    followUpPill:
      "Is there a moment where naming hurt early could save a good bond?",
  },
  real_vs_fake_recovery: {
    headline: "Why Scrolling Never Truly Lets Your Shoulders Drop",
    body: "After a demanding week, collapsing onto the couch with a glowing screen or noisy group plans looks like downtime, yet leaves your mind humming with tired static. Real recovery for you lives in quiet, unhurried simple things—a warm meal, an unscheduled walk outside, and a peaceful room.",
    followUpPill:
      "What simple evening ritual actually leaves you feeling rested the next morning?",
  },
  ignoring_exhaustion: {
    headline: "Pushing Past Tiredness Out of Quiet Pride",
    body: "Because people count on your steadiness, you have a habit of tucking your own tiredness away and pushing through until the job is done. That sense of duty is admirable, yet you don't have to run yourself completely empty just to feel you've earned an honest night off.",
    followUpPill:
      "Where could you give yourself permission to stop at eighty percent tonight?",
  },
  calm_in_crisis_impatient_in_delays: {
    headline: "Tested by Slow Lines, Rock-Steady in Real Storms",
    body: "It might make you smile how quickly slow replies, vague plans, or small everyday delays test your patience when life is ordinary. Yet the second a genuine emergency hits the room, all that restlessness vanishes—and you turn into the calmest, clearest person everyone else leans on.",
    followUpPill:
      "Do you notice how calm your voice gets when things turn genuinely serious?",
  },
  private_self_sabotage: {
    headline: "Spotting the Next Flaw Right After Winning",
    body: "You care so deeply about doing meaningful, solid work that you rarely let a finished milestone actually sink in and warm your chest. Within hours of pulling off something difficult, your eyes quietly drift to the one tiny flaw or the next uphill task instead of celebrating.",
    followUpPill:
      "What recent win deserves five quiet minutes of genuine pride right now?",
  },
  hidden_fulfillment_leak: {
    headline: "Why Checking Every Box Can Still Feel Hollow",
    body: "You're plenty capable of succeeding on paper and keeping every practical responsibility running smoothly, which is why people assume you're set. Still, a quiet heaviness creeps in whenever your daily effort loses touch with real sincerity, honest purpose, and knowing your work genuinely helps real human beings.",
    followUpPill:
      "Which part of your week currently feels most honest and alive to you?",
  },
  guest_even_at_home: {
    headline: "The Quiet Observer Even in Familiar Rooms",
    body: "Even when you're surrounded by people you care about in a comfortable room, a small, reflective part of you sometimes watches life from half a step back. Nothing is wrong with your heart—your deepest sense of home simply lives inside quiet moments of truth and unforced stillness.",
    followUpPill: "Where do you feel most effortlessly at home inside yourself?",
  },
  giving_vs_asking_pride: {
    headline: "First to Show Up, Last to Ask Help",
    body: "You show love generously by remembering small details, stepping in early, and never wanting anyone to feel burdened by your needs. That quiet pride protects you, yet letting someone you trust carry a corner of the load is often how people feel closest to you.",
    followUpPill:
      "What is one small thing you could let someone help you with this week?",
  },
  polishing_in_the_dark: {
    headline: "Quietly Tweaking Details Long After It's Good",
    body: "Because your personal bar for quality is genuinely high, you often keep refining drafts, plans, or ideas behind closed doors long after they're ready to help people. Your care is a gift—just remember the world needs your warm, real work far more than spotless perfection.",
    followUpPill:
      "What good thing have you been holding back until it feels completely spotless?",
  },
  past_identity_rewire: {
    headline: "How 2022 – 2023 Quietly Built Your Backbone",
    body: "Looking back at 2022 – 2023 and 2015 – 2016, you carried far heavier pressure behind the scenes than most people around you ever realized. Walking through those stretches stripped away polite people-pleasing and quietly built the calm backbone and self-respect you stand on today.",
    followUpPill:
      "Looking back at 2022 – 2023, what boundary are you proudest you kept?",
  },
  full_plate_heavy_heart_window: {
    headline: "Carrying Heavy Duty Through 2020 – 2021",
    body: "Around 2020 – 2021, you kept showing up and holding your responsibilities together on the outside even while your heart felt like it was walking uphill in heavy shoes. That chapter quietly broke the spell of chasing empty checkboxes that never truly fed your spirit.",
    followUpPill: "What old expectation lost its hold on you after 2020 – 2021?",
  },
  current_season_tug_of_war: {
    headline: "Today's Gentle Pull Between Boldness and Peace",
    body: "Right now you may feel a quiet two-way pull—one hand eager to build something bold and meaningful, the other nudging you to protect your sleep, simplify home life, and clear old clutter. You aren't stalling at all; you're clearing the kitchen table before cooking something real.",
    followUpPill:
      "What piece of old clutter would feel liberating to set down this month?",
  },
};

export function buildMockPersonalNatureBatch(
  precisionMode: AstroPrecisionMode,
  unlockDay: 1 | 2 | "all" = "all",
  firstName = "{{FIRST_NAME}}"
): PersonalNatureTellOutput[] {
  const catalog = resolvePersonalNatureCatalog(precisionMode).filter(
    (item) => unlockDay === "all" || item.unlockDay === unlockDay
  );

  return catalog.map((item) => {
    const template =
      DEMO_TELL_COPY[item.tellId] ?? DEMO_TELL_COPY[item.canonicalTellId];
    return {
      tellId: item.tellId,
      category: item.category,
      headline: template.headline,
      body: template.body.replace(/\{\{FIRST_NAME\}\}/g, firstName),
      followUpPill: template.followUpPill,
    };
  });
}

export function buildDemoPersonalNatureResponse(params?: {
  firstName?: string;
  precisionMode?: AstroPrecisionMode;
  previewDay2?: boolean;
}): PersonalNatureApiResponse {
  const precisionMode = params?.precisionMode ?? "exact";
  const previewDay2Active = Boolean(params?.previewDay2);
  const catalog = resolvePersonalNatureCatalog(precisionMode);
  const allMock = buildMockPersonalNatureBatch(
    precisionMode,
    "all",
    params?.firstName ?? "Alex"
  );
  const byId = new Map(allMock.map((t) => [t.tellId, t]));
  const nowIso = new Date().toISOString();

  const categories = PERSONAL_NATURE_CATEGORIES.map((catMeta) => {
    const items = catalog.filter((c) => c.category === catMeta.slug);
    const unlockedTells = items
      .filter((item) => item.unlockDay === 1 || previewDay2Active)
      .map((item) => {
        const copy = byId.get(item.tellId)!;
        return {
          tellId: item.tellId,
          category: catMeta.slug,
          unlockDay: item.unlockDay,
          isUnlocked: true as const,
          unlockedAt: nowIso,
          isNew: item.unlockDay === 2,
          houseDependent: item.houseDependent,
          headline: copy.headline,
          body: copy.body,
          followUpPill: copy.followUpPill,
          accuracyRating: null,
          userReflection: null,
        };
      });

    const lockedTeasers = previewDay2Active
      ? []
      : items
          .filter((item) => item.unlockDay === 2)
          .map((item) => ({
            tellId: item.tellId,
            category: catMeta.slug,
            unlockDay: 2 as const,
            teaserTitle: item.lockedTeaserTitle,
            unlockLabel: "Unlocks Tomorrow",
          }));

    return {
      slug: catMeta.slug,
      title: catMeta.title,
      subtitle: catMeta.subtitle,
      totalCount: catMeta.totalCount,
      unlockedTells,
      lockedTeasers,
    };
  });

  return {
    chartId: "demo-session",
    voiceProfileId: "elder_mentor_v1",
    precisionMode: toUiPrecisionMode(precisionMode),
    canPreviewDay2: true,
    previewDay2Active,
    day2Unlocked: previewDay2Active,
    showBirthTimeVerifyHint: false,
    categories,
  };
}
