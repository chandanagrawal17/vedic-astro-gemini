import type { SupabaseClient } from "@supabase/supabase-js";
import { readCleanEnv } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { UnlockSource } from "@/lib/types/blueprint";

export type BetaUnlockMode = "instant" | "code_required";

export interface UnlockBlueprintOptions {
  unlockTier?: "one_time_19" | "annual_39";
}

export interface UnlockBlueprintResult {
  unlocked: boolean;
  chartId: string;
  unlockSource: UnlockSource;
  unlockedAt: string;
  alreadyUnlocked: boolean;
}

export interface PaymentProvider {
  readonly providerName: string;
  unlockBlueprint(
    chartId: string,
    source: UnlockSource,
    options?: UnlockBlueprintOptions
  ): Promise<UnlockBlueprintResult>;
}

export function getBetaUnlockMode(): BetaUnlockMode {
  const mode = readCleanEnv("BETA_UNLOCK_MODE").toLowerCase();
  return mode === "code_required" ? "code_required" : "instant";
}

export function verifyBetaInviteCode(submittedCode?: string | null): boolean {
  const expected = readCleanEnv("BETA_INVITE_CODE");
  if (!expected) return false;
  const candidate = (submittedCode ?? "").trim();
  if (!candidate || candidate.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ candidate.charCodeAt(i);
  }
  return diff === 0;
}

export class BetaUnlockProvider implements PaymentProvider {
  public readonly providerName = "beta";

  constructor(
    private readonly admin: Pick<SupabaseClient, "from"> = getSupabaseAdminClient()
  ) {}

  async unlockBlueprint(
    chartId: string,
    source: UnlockSource,
    options?: UnlockBlueprintOptions
  ): Promise<UnlockBlueprintResult> {
    const { data: existing, error: findErr } = await this.admin
      .from("blueprints")
      .select("id, is_paid, unlock_source, unlocked_at, unlock_tier")
      .eq("chart_id", chartId)
      .maybeSingle<{
        id: string;
        is_paid: boolean;
        unlock_source: UnlockSource | null;
        unlocked_at: string | null;
        unlock_tier: "one_time_19" | "annual_39" | null;
      }>();

    if (findErr) {
      throw new Error(findErr.message || "Failed to look up Blueprint.");
    }
    if (!existing) {
      throw new Error("Blueprint not found for this chart.");
    }

    if (existing.is_paid && existing.unlocked_at) {
      return {
        unlocked: true,
        chartId,
        unlockSource: existing.unlock_source ?? source,
        unlockedAt: existing.unlocked_at,
        alreadyUnlocked: true,
      };
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: updateErr } = await this.admin
      .from("blueprints")
      .update({
        is_paid: true,
        unlock_source: existing.unlock_source ?? source,
        unlocked_at: existing.unlocked_at ?? nowIso,
        unlock_tier:
          existing.unlock_tier ?? options?.unlockTier ?? "one_time_19",
      })
      .eq("id", existing.id)
      .select("chart_id, is_paid, unlock_source, unlocked_at")
      .single<{
        chart_id: string;
        is_paid: boolean;
        unlock_source: UnlockSource;
        unlocked_at: string;
      }>();

    if (updateErr || !updated) {
      throw new Error(updateErr?.message || "Failed to unlock Blueprint.");
    }

    return {
      unlocked: Boolean(updated.is_paid),
      chartId: updated.chart_id,
      unlockSource: updated.unlock_source,
      unlockedAt: updated.unlocked_at,
      alreadyUnlocked: false,
    };
  }
}

export function getPaymentProvider(
  admin: Pick<SupabaseClient, "from"> = getSupabaseAdminClient()
): PaymentProvider {
  return new BetaUnlockProvider(admin);
}
