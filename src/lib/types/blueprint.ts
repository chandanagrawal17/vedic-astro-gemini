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
  | "birth_time_upgraded";

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
  unlockSource?: UnlockSource | null;
  unlockedAt?: string | null;
  entryHook?: EntryHook | null;
  utmSource?: string | null;
  reflections: ReflectionNote[];
  createdAt: string;
}
