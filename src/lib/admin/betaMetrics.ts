import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeOptionalEmail } from "@/lib/cache/blueprintCache";
import { readCleanEnv } from "@/lib/env";
import { ENTRY_HOOK_VALUES, normalizeEntryHook } from "@/lib/funnel/events";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { EntryHook, FunnelEventName, HardResetFeedback } from "@/lib/types/blueprint";

export function getAllowedAdminEmails(): Set<string> {
  const raw = readCleanEnv("ADMIN_EMAILS");
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function verifyAdminBetaAccess(params: {
  authUserEmail?: string | null;
  devHeaderEmail?: string | null;
  nodeEnv?: string;
}): { authorized: boolean; adminEmail: string | null } {
  const allowed = getAllowedAdminEmails();
  if (allowed.size === 0) {
    return { authorized: false, adminEmail: null };
  }

  const authEmail = normalizeOptionalEmail(params.authUserEmail);
  if (authEmail && allowed.has(authEmail)) {
    return { authorized: true, adminEmail: authEmail };
  }

  const env = params.nodeEnv ?? process.env.NODE_ENV;
  if (env !== "production") {
    const devEmail = normalizeOptionalEmail(params.devHeaderEmail);
    if (devEmail && allowed.has(devEmail)) {
      return { authorized: true, adminEmail: devEmail };
    }
  }

  return { authorized: false, adminEmail: null };
}

export interface EntryHookBreakdownRow {
  entryHook: EntryHook;
  landingViews: number;
  onboardingStarted: number;
  chartsCalculated: number;
  proofViewed: number;
  paywallCtaClicked: number;
  betaUnlocks: number;
  wtpPct: number;
  unlockPct: number;
}

export interface BetaDashboardMetrics {
  totalUniqueUsers: number;
  totalCharts: number;
  onboardingStartedCount: number;
  chartsCalculatedCount: number;
  proofViewedCount: number;
  onboardingToProofPct: number;
  accuracy: {
    total: number;
    scarilyAccurate: number;
    close: number;
    off: number;
    scarilyAccuratePct: number;
    closePct: number;
    offPct: number;
  };
  willingnessToPay: {
    proofViewed: number;
    paywallViewed: number;
    paywallCtaClicked: number;
    ratePct: number;
  };
  engagement: {
    betaUnlocks: number;
    bragCardShares: number;
    birthTimeUpgrades: number;
  };
  byEntryHook: EntryHookBreakdownRow[];
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export async function fetchBetaDashboardMetrics(
  admin: Pick<SupabaseClient, "from"> = getSupabaseAdminClient()
): Promise<BetaDashboardMetrics> {
  const [chartsRes, blueprintsRes, eventsRes] = await Promise.all([
    admin.from("natal_charts").select("id, email, precision_mode").limit(10000),
    admin
      .from("blueprints")
      .select("id, chart_id, email, is_paid, unlock_source, accuracy_feedback, entry_hook")
      .limit(10000),
    admin
      .from("funnel_events")
      .select("id, chart_id, email, event_name, entry_hook")
      .limit(10000),
  ]);

  const charts = (chartsRes.data ?? []) as Array<{
    id: string;
    email: string | null;
    precision_mode: string;
  }>;
  const blueprints = (blueprintsRes.data ?? []) as Array<{
    id: string;
    chart_id: string;
    email: string | null;
    is_paid: boolean;
    unlock_source: string | null;
    accuracy_feedback: HardResetFeedback | null;
    entry_hook: string | null;
  }>;
  const events = (eventsRes.data ?? []) as Array<{
    id: string;
    chart_id: string | null;
    email: string | null;
    event_name: FunnelEventName;
    entry_hook: string | null;
  }>;

  const uniqueEmails = new Set<string>();
  for (const c of charts) {
    const em = normalizeOptionalEmail(c.email);
    if (em) uniqueEmails.add(em);
  }
  for (const b of blueprints) {
    const em = normalizeOptionalEmail(b.email);
    if (em) uniqueEmails.add(em);
  }
  for (const e of events) {
    const em = normalizeOptionalEmail(e.email);
    if (em) uniqueEmails.add(em);
  }

  const eventDistinctSets = new Map<FunnelEventName, Set<string>>();
  const hookDistinctSets = new Map<
    EntryHook,
    {
      proofViewed: Set<string>;
      paywallCtaClicked: Set<string>;
      betaUnlocks: Set<string>;
    }
  >();

  const chartHookMap = new Map<string, EntryHook>();
  for (const b of blueprints) {
    if (b.chart_id && b.entry_hook) {
      chartHookMap.set(b.chart_id, normalizeEntryHook(b.entry_hook));
    }
  }

  const hookStats = new Map<EntryHook, EntryHookBreakdownRow>();
  for (const hook of ENTRY_HOOK_VALUES) {
    hookStats.set(hook, {
      entryHook: hook,
      landingViews: 0,
      onboardingStarted: 0,
      chartsCalculated: 0,
      proofViewed: 0,
      paywallCtaClicked: 0,
      betaUnlocks: 0,
      wtpPct: 0,
      unlockPct: 0,
    });
    hookDistinctSets.set(hook, {
      proofViewed: new Set<string>(),
      paywallCtaClicked: new Set<string>(),
      betaUnlocks: new Set<string>(),
    });
  }

  for (const evt of events) {
    const distinctKey = evt.chart_id || evt.email || evt.id;
    let evtSet = eventDistinctSets.get(evt.event_name);
    if (!evtSet) {
      evtSet = new Set<string>();
      eventDistinctSets.set(evt.event_name, evtSet);
    }
    evtSet.add(distinctKey);

    const resolvedHook = evt.entry_hook
      ? normalizeEntryHook(evt.entry_hook)
      : evt.chart_id
        ? chartHookMap.get(evt.chart_id) ?? "direct"
        : "direct";
    const row = hookStats.get(resolvedHook)!;
    const rowSets = hookDistinctSets.get(resolvedHook)!;

    if (evt.event_name === "landing_view") row.landingViews += 1;
    else if (evt.event_name === "onboarding_started") row.onboardingStarted += 1;
    else if (evt.event_name === "chart_calculated") row.chartsCalculated += 1;
    else if (evt.event_name === "proof_viewed") rowSets.proofViewed.add(distinctKey);
    else if (evt.event_name === "paywall_cta_clicked")
      rowSets.paywallCtaClicked.add(distinctKey);
    else if (evt.event_name === "beta_unlocked")
      rowSets.betaUnlocks.add(distinctKey);
  }

  const byEntryHook = Array.from(hookStats.values()).map((row) => {
    const sets = hookDistinctSets.get(row.entryHook)!;
    const proofViewed = sets.proofViewed.size;
    const paywallCtaClicked = sets.paywallCtaClicked.size;
    const betaUnlocks = sets.betaUnlocks.size;
    return {
      ...row,
      proofViewed,
      paywallCtaClicked,
      betaUnlocks,
      wtpPct: pct(paywallCtaClicked, proofViewed),
      unlockPct: pct(betaUnlocks, proofViewed),
    };
  });

  let scarilyAccurate = 0;
  let close = 0;
  let off = 0;
  for (const bp of blueprints) {
    if (bp.accuracy_feedback === "scarily_accurate") scarilyAccurate += 1;
    else if (bp.accuracy_feedback === "close") close += 1;
    else if (bp.accuracy_feedback === "off") off += 1;
  }
  const accuracyTotal = scarilyAccurate + close + off;

  const onboardingStartedCount =
    eventDistinctSets.get("onboarding_started")?.size ?? 0;
  const chartsCalculatedCount =
    eventDistinctSets.get("chart_calculated")?.size ?? charts.length;
  const proofViewedCount = eventDistinctSets.get("proof_viewed")?.size ?? 0;
  const paywallViewedCount = eventDistinctSets.get("paywall_viewed")?.size ?? 0;
  const paywallCtaClickedCount =
    eventDistinctSets.get("paywall_cta_clicked")?.size ?? 0;

  const betaUnlocksFromEvents =
    eventDistinctSets.get("beta_unlocked")?.size ?? 0;
  const betaUnlocksFromTable = blueprints.filter((b) => b.is_paid).length;

  const completionDenominator =
    onboardingStartedCount > 0 ? onboardingStartedCount : chartsCalculatedCount;

  return {
    totalUniqueUsers: uniqueEmails.size || charts.length,
    totalCharts: charts.length,
    onboardingStartedCount,
    chartsCalculatedCount,
    proofViewedCount,
    onboardingToProofPct: pct(proofViewedCount, completionDenominator),
    accuracy: {
      total: accuracyTotal,
      scarilyAccurate,
      close,
      off,
      scarilyAccuratePct: pct(scarilyAccurate, accuracyTotal),
      closePct: pct(close, accuracyTotal),
      offPct: pct(off, accuracyTotal),
    },
    willingnessToPay: {
      proofViewed: proofViewedCount,
      paywallViewed: paywallViewedCount,
      paywallCtaClicked: paywallCtaClickedCount,
      ratePct: pct(paywallCtaClickedCount, proofViewedCount),
    },
    engagement: {
      betaUnlocks: Math.max(betaUnlocksFromEvents, betaUnlocksFromTable),
      bragCardShares: eventDistinctSets.get("brag_card_shared")?.size ?? 0,
      birthTimeUpgrades:
        eventDistinctSets.get("birth_time_upgraded")?.size ?? 0,
    },
    byEntryHook,
  };
}
