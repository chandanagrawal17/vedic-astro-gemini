"use client";

import { EntryHook, FunnelEventName } from "@/lib/types/blueprint";

const ATTRIBUTION_KEY = "personal_blueprint_attribution_v1";
const DEDUPE_PREFIX = "pb_evt_sent_";

const VALID_HOOKS = new Set<EntryHook>([
  "hard-reset",
  "3-eras",
  "career-audit",
  "love-mirror",
  "self-sabotage",
  "direct",
]);

export interface AttributionData {
  entryHook: EntryHook;
  utmSource?: string;
}

export function parseEntryHook(raw?: string | null): EntryHook {
  if (!raw) return "direct";
  const cleaned = raw.trim().toLowerCase() as EntryHook;
  return VALID_HOOKS.has(cleaned) ? cleaned : "direct";
}

export function saveAttribution(data: Partial<AttributionData>): AttributionData {
  const existing = loadAttribution();
  const next: AttributionData = {
    entryHook: data.entryHook ? parseEntryHook(data.entryHook) : existing.entryHook,
    utmSource: data.utmSource?.trim() || existing.utmSource,
  };

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage failures
    }
  }
  return next;
}

export function loadAttribution(): AttributionData {
  if (typeof window === "undefined") {
    return { entryHook: "direct" };
  }
  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return { entryHook: "direct" };
    const parsed = JSON.parse(raw) as Partial<AttributionData>;
    return {
      entryHook: parseEntryHook(parsed.entryHook),
      utmSource: parsed.utmSource?.trim() || undefined,
    };
  } catch {
    return { entryHook: "direct" };
  }
}

export function trackFunnelEvent(params: {
  eventName: FunnelEventName;
  chartId?: string | null;
  sessionToken?: string | null;
  email?: string | null;
  entryHook?: EntryHook | null;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
}): void {
  if (typeof window === "undefined") return;

  if (params.dedupeKey) {
    try {
      const flagKey = `${DEDUPE_PREFIX}${params.dedupeKey}`;
      if (window.sessionStorage.getItem(flagKey) === "1") {
        return;
      }
      window.sessionStorage.setItem(flagKey, "1");
    } catch {
      // Proceed without dedupe if storage blocked
    }
  }

  const attribution = loadAttribution();
  const entryHook = params.entryHook ?? attribution.entryHook;

  fetch("/api/funnel/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      eventName: params.eventName,
      chartId: params.chartId ?? undefined,
      sessionToken: params.sessionToken ?? undefined,
      email: params.email?.trim() || undefined,
      entryHook,
      metadata: {
        ...(params.metadata ?? {}),
        utm_source: attribution.utmSource ?? null,
      },
    }),
  }).catch(() => {
    // Non-blocking telemetry
  });
}
