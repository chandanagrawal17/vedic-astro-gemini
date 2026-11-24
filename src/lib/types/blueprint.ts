import type {
  FullBlueprintPayload,
  HookProofPayload,
} from "@/lib/llm/blueprintSchema";

export type PrecisionMode = "exact" | "window" | "dob_only";

export type BirthWindow = "morning" | "afternoon" | "evening" | "late_night";

export type CanonicalRelationshipStatus = "single" | "dating" | "married";

export type RelationshipStatus =
  | "single"
  | "dating"
  | "relationship"
  | "married"
  | "shifting";

export type CareerMode =
  | "employed"
  | "employed_hybrid"
  | "founder"
  | "freelance_hybrid"
  | "in_transition"
  | "freelance"
  | "transition";

export type HardResetFeedback =
  | "scarily_accurate"
  | "close"
  | "off";

export type LoveAccuracyFeedback =
  | "weirdly_accurate"
  | "pretty_close"
  | "not_really";

export type HookKey =
  | "hard_reset"
  | "relationship"
  | "career"
  | "self_sabotage"
  | "eras";

export type EntryHook =
  | "hard-reset"
  | "3-eras"
  | "career-audit"
  | "love-mirror"
  | "self-sabotage"
  | "direct";

export type UnlockSource = "beta_free" | "beta_code" | "stripe";

export type FunnelEventName =
  | "landing_view"
  | "onboarding_started"
  | "chart_calculated"
  | "proof_viewed"
  | "accuracy_rated"
  | "rated_love_mirror_accuracy"
  | "clicked_locked_monthly_timeline"
  | "clicked_locked_career_blueprint"
  | "clicked_locked_relationship_guide"
  | "paywall_viewed"
  | "paywall_cta_clicked"
  | "beta_unlocked"
  | "brag_card_shared"
  | "birth_time_upgraded"
  | "daily_command_viewed"
  | "daily_memory_tagged"
  | "somatic_reset_completed"
  | "text_or_wait_checked"
  | "focus_calendar_audited"
  | "synergy_link_created"
  | "synergy_invite_viewed"
  | "synergy_compared";

export type SynergyRelationshipContext =
  | "romantic"
  | "close_friend"
  | "creative_partner";

export type SynergyDimensionKey =
  | "nervousSystemPacing"
  | "domesticFlow"
  | "mentalFriendship"
  | "dailyRhythm"
  | "physicalRapport"
  | "sharedValues"
  | "stressTemperament"
  | "mutualInfluence";

export type SynergyDimensionTone = "aligned" | "moderate" | "growth";

export interface SynergyDimensionScore {
  key: SynergyDimensionKey;
  label: string;
  earned: number;
  max: number;
  tone: SynergyDimensionTone;
  summary: string;
}

export interface SynergyComparisonPayload {
  engineVersion: string;
  relationshipContext: SynergyRelationshipContext;
  precisionBadge: {
    mode: PrecisionMode;
    label: string;
    note: string;
  };
  participants: {
    ownerFirstName: string;
    partnerFirstName: string;
  };
  overallScore: number;
  rawPoints: {
    earned: number;
    max: number;
  };
  headline: string;
  coreLenses: {
    attractionAndChemistry: {
      label: string;
      score: number;
      insight: string;
    };
    innerBondAndDurability: {
      label: string;
      score: number;
      insight: string;
    };
  };
  participantStyles: {
    ownerSummary: string;
    partnerSummary: string;
    sharedAnchor: string;
  };
  dimensions: SynergyDimensionScore[];
  frictionAndAgency: {
    title: string;
    growthEdgeNote: string;
    driveHeatActive: boolean;
    tenSecondRepair: string;
  };
}

export type DailyToneStatus = "GREEN" | "YELLOW" | "RED";
export type DailyMemoryTag =
  | "hit_home"
  | "helped_pause"
  | "took_action"
  | "felt_off";
export type TextOrWaitIntent = "dating" | "work" | "conflict" | "money";
export type CalendarDayMode = "PITCH" | "STEADY" | "FOCUS";
export type MoveAuditAction = "pitch" | "hard_talk" | "deep_work" | "sign_deal" | "rest_reset";

export interface DailyPeakFrictionWindow {
  label: string;
  note: string;
}

export interface DailyCalendarDay {
  dateIso: string;
  dayShort: string;
  dayNumber: string;
  mode: CalendarDayMode;
  headline: string;
  guidance: string;
  bandwidthScore: number;
  status: DailyToneStatus;
}

export interface DailySomaticPhase {
  step: 1 | 2 | 3;
  title: string;
  instruction: string;
}

export interface DailyCommandCenterPayload {
  checkinDate: string;
  precisionMode: PrecisionMode;
  precisionNote: string | null;
  bandwidthScore: number;
  toneStatus: DailyToneStatus;
  toneLabel: string;
  summary: string;
  peakWindow: DailyPeakFrictionWindow;
  frictionWindow: DailyPeakFrictionWindow;
  dailyDirective: {
    directiveId: string;
    text: string;
    antiRepetitionWindowDays: number;
  };
  memoryTags: DailyMemoryTag[];
  somaticResetsCompletedToday: number;
  somaticReset: {
    durationSeconds: 90;
    personalizedAnchor: string;
    phases: [DailySomaticPhase, DailySomaticPhase, DailySomaticPhase];
  };
  defaultTextOrWait: {
    intent: TextOrWaitIntent;
    verdict: DailyToneStatus;
    badge: string;
    guidance: string;
    speakableScript: string;
  };
  sevenDayCalendar: DailyCalendarDay[];
}

export interface TextOrWaitResult {
  intent: TextOrWaitIntent;
  verdict: DailyToneStatus;
  badge: string;
  guidance: string;
  speakableScript: string;
  waitMinutes: number;
}

export interface MoveAuditResult {
  dateIso: string;
  dayLabel: string;
  action: MoveAuditAction;
  verdict: DailyToneStatus;
  headline: string;
  guidance: string;
  recommendedAlternativeDate: {
    dateIso: string;
    dayLabel: string;
    mode: CalendarDayMode;
  } | null;
}

export interface LocationOption {
  cityName: string;
  region: string;
  lat: number;
  lon: number;
  tzOffset: number;
}

export interface OnboardingInput {
  email: string;
  firstName: string;
  birthDate: string; // YYYY-MM-DD
  birthCity: string;
  birthLat: number;
  birthLon: number;
  birthTz: number;
  precisionMode: PrecisionMode;
  birthTime: string | null; // HH:MM
  birthWindow: BirthWindow | null;
  relationshipStatus: RelationshipStatus;
  careerMode: CareerMode;
  careerField: string;
  entryHook?: EntryHook;
  utmSource?: string;
}

export interface EraSummary {
  id: "era1" | "era2";
  label: string;
  title: string;
  dateRange: string;
  summary: string;
}

export type BlueprintFreePayload = HookProofPayload;
export type BlueprintPaidPayload = FullBlueprintPayload;

export interface ReflectionNote {
  id: string;
  hookKey: HookKey;
  noteText: string;
  createdAt: string;
}

export interface BlueprintSession {
  chartId?: string;
  sessionId: string;
  sessionToken?: string;
  moonBoundaryFlag?: boolean;
  modelVersion?: string | null;
  input: OnboardingInput;
  freePayload: BlueprintFreePayload;
  paidPayload: BlueprintPaidPayload | null;
  hardResetFeedback: HardResetFeedback | null;
  loveAccuracyFeedback?: LoveAccuracyFeedback | null;
  confirmedFlashpointIds?: string[];
  savedAlternativeLanes?: string[];
  isUnlocked: boolean;
  unlockTier: "one_time_19" | "annual_39" | null;
  karmaSubscriptionActive?: boolean;
  unlockSource?: UnlockSource | null;
  unlockedAt?: string | null;
  entryHook?: EntryHook | null;
  utmSource?: string | null;
  reflections: ReflectionNote[];
  createdAt: string;
}
