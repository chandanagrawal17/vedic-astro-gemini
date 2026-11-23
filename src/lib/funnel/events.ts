import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { normalizeOptionalEmail } from "@/lib/cache/blueprintCache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { EntryHook, FunnelEventName } from "@/lib/types/blueprint";

export const ENTRY_HOOK_VALUES = [
  "hard-reset",
  "3-eras",
  "career-audit",
  "love-mirror",
  "self-sabotage",
  "direct",
] as const;

export const FUNNEL_EVENT_VALUES = [
  "landing_view",
  "onboarding_started",
  "chart_calculated",
  "proof_viewed",
  "accuracy_rated",
  "paywall_viewed",
  "paywall_cta_clicked",
  "beta_unlocked",
  "brag_card_shared",
  "birth_time_upgraded",
] as const;

export const EntryHookSchema = z.enum(ENTRY_HOOK_VALUES);
export const FunnelEventNameSchema = z.enum(FUNNEL_EVENT_VALUES);

export function normalizeEntryHook(raw?: string | null): EntryHook {
  if (!raw) return "direct";
  const cleaned = raw.trim().toLowerCase();
  const parsed = EntryHookSchema.safeParse(cleaned);
  return parsed.success ? parsed.data : "direct";
}

export interface LogFunnelEventParams {
  chartId?: string | null;
  email?: string | null;
  eventName: FunnelEventName;
  entryHook?: EntryHook | string | null;
  metadata?: Record<string, unknown>;
  admin?: Pick<SupabaseClient, "from">;
}

export async function logFunnelEvent(
  params: LogFunnelEventParams
): Promise<{ logged: boolean }> {
  try {
    const admin = params.admin ?? getSupabaseAdminClient();
    const { error } = await admin.from("funnel_events").insert({
      chart_id: params.chartId ?? null,
      email: normalizeOptionalEmail(params.email),
      event_name: params.eventName,
      entry_hook: params.entryHook
        ? normalizeEntryHook(params.entryHook)
        : null,
      metadata: params.metadata ?? {},
    });

    if (error) {
      console.warn(
        "[logFunnelEvent] Failed to insert event:",
        params.eventName,
        error.message
      );
      return { logged: false };
    }

    return { logged: true };
  } catch (err) {
    console.warn(
      "[logFunnelEvent] Non-blocking error:",
      params.eventName,
      err instanceof Error ? err.message : err
    );
    return { logged: false };
  }
}
