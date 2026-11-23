"use client";

import {
  BlueprintFreePayload,
  BlueprintPaidPayload,
  BlueprintSession,
  HardResetFeedback,
  HookKey,
  OnboardingInput,
} from "@/lib/types/blueprint";
import {
  buildMockBlueprint,
  DEFAULT_ONBOARDING_INPUT,
} from "@/lib/mock/blueprintMock";

const STORAGE_KEY = "personal_blueprint_session_v1";

function generateClientSessionToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `pb_${crypto.randomUUID()}`;
  }
  return `pb_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createAndSaveSession(input: OnboardingInput): BlueprintSession {
  const sessionToken = generateClientSessionToken();
  const base = buildMockBlueprint(input, sessionToken);
  const session: BlueprintSession = {
    ...base,
    sessionToken,
    paidPayload: null,
    modelVersion: null,
  };
  saveSession(session);
  return session;
}

export function saveSynthesizedSession(
  input: OnboardingInput,
  payload: {
    chartId?: string;
    sessionId: string;
    sessionToken: string;
    freePayload: BlueprintFreePayload;
    paidPayload?: BlueprintPaidPayload | null;
    isUnlocked?: boolean;
    unlockTier?: "one_time_19" | "annual_39" | null;
    moonBoundaryFlag?: boolean;
    hardResetFeedback?: HardResetFeedback | null;
    modelVersion?: string | null;
  }
): BlueprintSession {
  const existing = loadStoredSession(payload.sessionId);
  const updated: BlueprintSession = {
    chartId: payload.chartId ?? existing?.chartId,
    sessionId: payload.sessionId,
    sessionToken: payload.sessionToken,
    moonBoundaryFlag: payload.moonBoundaryFlag ?? existing?.moonBoundaryFlag ?? false,
    modelVersion: payload.modelVersion ?? existing?.modelVersion ?? null,
    input,
    freePayload: payload.freePayload,
    paidPayload:
      payload.paidPayload !== undefined
        ? payload.paidPayload
        : existing?.paidPayload ?? null,
    hardResetFeedback:
      payload.hardResetFeedback !== undefined
        ? payload.hardResetFeedback
        : existing?.hardResetFeedback ?? null,
    isUnlocked:
      payload.isUnlocked !== undefined
        ? payload.isUnlocked
        : existing?.isUnlocked ?? false,
    unlockTier:
      payload.unlockTier !== undefined
        ? payload.unlockTier
        : existing?.unlockTier ?? null,
    reflections: existing?.reflections ?? [],
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  saveSession(updated);
  return updated;
}

export function saveSession(session: BlueprintSession): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage quota issues in restricted browsers
  }
}

export function loadStoredSession(
  sessionIdOrChartId?: string
): BlueprintSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BlueprintSession;
    if (
      !sessionIdOrChartId ||
      parsed.sessionId === sessionIdOrChartId ||
      parsed.chartId === sessionIdOrChartId
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function loadSession(sessionId?: string): BlueprintSession {
  const stored = loadStoredSession(sessionId);
  if (stored) return stored;
  const fallback = buildMockBlueprint(
    DEFAULT_ONBOARDING_INPUT,
    sessionId || "demo-session"
  );
  saveSession(fallback);
  return fallback;
}

export function hasStoredSession(sessionId?: string): boolean {
  return loadStoredSession(sessionId) !== null;
}

export function updateSessionFeedback(
  feedback: HardResetFeedback
): BlueprintSession {
  const current = loadSession();
  const updated: BlueprintSession = {
    ...current,
    hardResetFeedback: feedback,
  };
  saveSession(updated);
  return updated;
}

export function unlockSession(
  tier: "one_time_19" | "annual_39"
): BlueprintSession {
  const current = loadSession();
  const updated: BlueprintSession = {
    ...current,
    isUnlocked: true,
    unlockTier: tier,
  };
  saveSession(updated);
  return updated;
}

export function addReflection(
  hookKey: HookKey,
  noteText: string
): BlueprintSession {
  const current = loadSession();
  const note = {
    id: `ref-${Date.now()}`,
    hookKey,
    noteText: noteText.trim(),
    createdAt: new Date().toISOString(),
  };
  const updated: BlueprintSession = {
    ...current,
    reflections: [note, ...current.reflections],
  };
  saveSession(updated);
  return updated;
}
