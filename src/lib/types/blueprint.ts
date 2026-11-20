export type PrecisionMode = "exact" | "window" | "dob_only";

export type BirthWindow = "morning" | "afternoon" | "evening" | "late_night";

export type RelationshipStatus =
  | "single"
  | "relationship"
  | "married"
  | "shifting";

export type CareerMode =
  | "employed"
  | "founder"
  | "freelance"
  | "transition";

export type HardResetFeedback =
  | "scarily_accurate"
  | "partially_true"
  | "not_quite";

export type HookKey =
  | "hard_reset"
  | "relationship"
  | "career"
  | "self_sabotage"
  | "eras";

export interface LocationOption {
  cityName: string;
  region: string;
  lat: number;
  lon: number;
  tzOffset: number;
}

export interface OnboardingInput {
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
}

export interface EraSummary {
  id: "era1" | "era2";
  label: string;
  title: string;
  dateRange: string;
  summary: string;
}

export interface BlueprintFreePayload {
  hardReset: {
    window: string;
    chapterLabel: string;
    description: string;
  };
  relationship: {
    branch: "partnered" | "solo";
    archetype: string;
    teaserBadge: string;
  };
  career: {
    alignmentScore: number;
    subtitle: string;
    idealModePill: string;
  };
  selfSabotage: {
    loopName: string;
    symptomSentence: string;
  };
  eras: {
    era1: EraSummary;
    era2: EraSummary;
    era3Preview: {
      title: string;
      dateRange: string;
      percentComplete: number;
    };
  };
}

export interface BlueprintPaidPayload {
  hardReset: {
    deepBreakdown: string;
    resilienceBuilt: string;
    nextPressureWindow: string;
    preparationNote: string;
  };
  relationship: {
    coreAlignmentProfile: string;
    silentFrictionPattern: string;
    communicationShifts: [string, string];
    clarityWindow: string;
  };
  career: {
    verdictBadge: string;
    jobVsBusinessVerdict: string;
    currentFieldMatch: string;
    dutyVsPurposeGap: string;
    timingPosture: string;
  };
  selfSabotage: {
    triggerMapLove: string;
    triggerMapCareer: string;
    antidoteSteps: [string, string, string];
  };
  eras: {
    era3Playbook: {
      coreMandate: string;
      doubleDown: string;
      eliminate: string;
    };
    era4Preview: {
      title: string;
      dateRange: string;
      theme: string;
    };
  };
}

export interface ReflectionNote {
  id: string;
  hookKey: HookKey;
  noteText: string;
  createdAt: string;
}

export interface BlueprintSession {
  sessionId: string;
  sessionToken?: string;
  moonBoundaryFlag?: boolean;
  input: OnboardingInput;
  freePayload: BlueprintFreePayload;
  paidPayload: BlueprintPaidPayload;
  hardResetFeedback: HardResetFeedback | null;
  isUnlocked: boolean;
  unlockTier: "one_time_19" | "annual_39" | null;
  reflections: ReflectionNote[];
  createdAt: string;
}
