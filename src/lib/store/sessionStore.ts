"use client";

import {
  BlueprintSession,
  HardResetFeedback,
  HookKey,
  OnboardingInput,
  PrecisionMode,
} from "@/lib/types/blueprint";
import {
  buildMockBlueprint,
  DEFAULT_ONBOARDING_INPUT,
} from "@/lib/mock/blueprintMock";

const STORAGE_KEY = "personal_blueprint_session_v1";

export function createAndSaveSession(input: OnboardingInput): BlueprintSession {
  const sessionId = "demo-session";
  const session = buildMockBlueprint(input, sessionId);
  saveSession(session);
  return session;
}

export function saveSession(session: BlueprintSession): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage quota issues in restricted browsers
  }
}

export function loadSession(sessionId?: string): BlueprintSession {
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as BlueprintSession;
        if (!sessionId || parsed.sessionId === sessionId) {
          return parsed;
        }
      }
    } catch {
      // Fallback to default deterministic session
    }
  }
  const fallback = buildMockBlueprint(
    DEFAULT_ONBOARDING_INPUT,
    sessionId || "demo-session"
  );
  saveSession(fallback);
  return fallback;
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

export function refreshSessionBirthTime(birthTime: string): BlueprintSession {
  const current = loadSession();
  const updatedInput: OnboardingInput = {
    ...current.input,
    precisionMode: "exact" as PrecisionMode,
    birthTime,
    birthWindow: null,
  };
  const regenerated = buildMockBlueprint(updatedInput, current.sessionId);
  const updated: BlueprintSession = {
    ...regenerated,
    hardResetFeedback: current.hardResetFeedback,
    isUnlocked: current.isUnlocked,
    unlockTier: current.unlockTier,
    reflections: current.reflections,
  };
  saveSession(updated);
  return updated;
}
