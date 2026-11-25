import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  isHouseDependentTellId,
  PERSONAL_NATURE_CATEGORIES,
  PERSONAL_NATURE_CATEGORY_SLUGS,
  type PersonalNatureCategorySlug,
  resolvePersonalNatureCatalog,
} from "@/lib/astro/personalNatureCatalog";
import {
  buildPersonalNatureEngineContext,
  type PersonalNatureTellStackContext,
} from "@/lib/astro/personalNatureEngine";
import { type NormalizedChartJson, toUiPrecisionMode } from "@/lib/astro/types";
import { readCleanEnv } from "@/lib/env";
import { getLlmProvider } from "@/lib/llm/geminiProvider";
import {
  auditMentorTone,
  BlueprintGuardrailError,
  type GuardrailViolation,
} from "@/lib/llm/guardrails";
import type { LlmProvider } from "@/lib/llm/provider";
import {
  FIRST_NAME_PLACEHOLDER,
  interpolateFirstName,
} from "@/lib/llm/synthesizeBlueprint";
import {
  buildMentorSystemPrompt,
  ELDER_MENTOR_VOICE_V1,
  loadActiveVoiceProfile,
  type VoiceProfile,
} from "@/lib/llm/voiceProfile";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  assertDbError,
  assertOwnership,
  BlueprintServiceError,
  findNatalChart,
  isDevUnlockPreviewEnabled,
  resolveProfileContext,
  type SupabaseAdminLike,
} from "@/lib/supabase/blueprintSession";

export const PersonalNatureCategorySchema = z.enum(PERSONAL_NATURE_CATEGORY_SLUGS);

export const PersonalNatureAccuracyRatingSchema = z.enum([
  "uncanny",
  "mostly_me",
  "not_really",
]);

export type PersonalNatureAccuracyRating = z.infer<
  typeof PersonalNatureAccuracyRatingSchema
>;

export const PersonalNatureTellSchema = z.object({
  tellId: z.string().min(1).describe("Exact tellId copied verbatim from input."),
  category: PersonalNatureCategorySchema,
  headline: z
    .string()
    .min(8)
    .max(95)
    .describe("4–8 warm, human words naming the tell gently."),
  body: z
    .string()
    .min(140)
    .max(480)
    .describe("45–65 warm kitchen-table words (strictly 35–75 words)."),
  followUpPill: z
    .string()
    .min(10)
    .max(160)
    .describe("1 gentle, affectionate reflection question."),
});

export type PersonalNatureTellOutput = z.infer<typeof PersonalNatureTellSchema>;

export const PersonalNatureBatchSchema = z.object({
  tells: z.array(PersonalNatureTellSchema).min(1),
});

export type PersonalNatureBatchOutput = z.infer<typeof PersonalNatureBatchSchema>;

export const PersonalNatureFeedbackRequestSchema = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
    const obj = raw as Record<string, unknown>;
    const rawReflection = obj.userReflection ?? obj.user_reflection;
    const sanitizedReflection =
      typeof rawReflection === "string"
        ? rawReflection.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        : rawReflection;
    return {
      tellId: obj.tellId ?? obj.tell_id,
      accuracyRating: obj.accuracyRating ?? obj.accuracy_rating,
      userReflection: sanitizedReflection,
      sessionToken: obj.sessionToken ?? obj.session_token,
    };
  },
  z.object({
    tellId: z.string().min(1).max(80),
    accuracyRating: PersonalNatureAccuracyRatingSchema,
    userReflection: z.string().max(600).optional().nullable(),
    sessionToken: z.string().max(160).optional().nullable(),
  })
);

export type PersonalNatureFeedbackRequest = z.infer<
  typeof PersonalNatureFeedbackRequestSchema
>;

export interface PersonalNatureTellCardDto {
  tellId: string;
  category: z.infer<typeof PersonalNatureCategorySchema>;
  unlockDay: 1 | 2;
  isUnlocked: true;
  unlockedAt: string | null;
  isNew: boolean;
  houseDependent: boolean;
  headline: string;
  body: string;
  followUpPill: string;
  accuracyRating: PersonalNatureAccuracyRating | null;
  userReflection: string | null;
}

export interface PersonalNatureLockedTeaserDto {
  tellId: string;
  category: z.infer<typeof PersonalNatureCategorySchema>;
  unlockDay: 2;
  teaserTitle: string;
  unlockLabel: string;
}

export interface PersonalNatureCategoryDto {
  slug: z.infer<typeof PersonalNatureCategorySchema>;
  title: string;
  subtitle: string;
  totalCount: number;
  unlockedTells: PersonalNatureTellCardDto[];
  lockedTeasers: PersonalNatureLockedTeaserDto[];
}

export interface PersonalNatureApiResponse {
  chartId: string;
  voiceProfileId: string;
  precisionMode: "exact" | "window" | "dob_only";
  canPreviewDay2: boolean;
  previewDay2Active: boolean;
  day2Unlocked: boolean;
  showBirthTimeVerifyHint: boolean;
  categories: PersonalNatureCategoryDto[];
}

/* -------------------------------------------------------------------------- */
/*              Batched Elder-Mentor Personal Nature Synthesizer               */
/* -------------------------------------------------------------------------- */

export interface SynthesizePersonalNatureInput {
  normalizedChart: NormalizedChartJson;
  firstName: string;
  dobIso?: string | null;
  unlockDay: 1 | 2 | "all";
  referenceDate?: Date;
  voiceProfile?: VoiceProfile;
  admin?: Pick<SupabaseClient, "from"> | null;
}

export interface SynthesizePersonalNatureResult {
  tells: PersonalNatureTellOutput[];
  voiceProfileId: string;
  modelVersion: string;
  llmCallsMade: number;
  repairedAfterAudit: boolean;
}

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function auditPersonalNatureBatch(
  draftTells: PersonalNatureTellOutput[],
  expectedStacks: PersonalNatureTellStackContext[]
): {
  passed: boolean;
  flaggedTerms: string[];
  violations: GuardrailViolation[];
  structuralIssues: string[];
} {
  const toneAudit = auditMentorTone({ tells: draftTells });
  const structuralIssues: string[] = [];

  const byId = new Map(draftTells.map((t) => [t.tellId, t]));
  for (const expected of expectedStacks) {
    const found = byId.get(expected.tellId);
    if (!found) {
      structuralIssues.push(`Missing required tellId "${expected.tellId}".`);
      continue;
    }
    const words = countWords(found.body);
    if (words < 35 || words > 75) {
      structuralIssues.push(
        `Tell "${expected.tellId}" body has ${words} words (must be strictly 35–75 words, ideally 45–65 words).`
      );
    }
  }

  return {
    passed: toneAudit.passed && structuralIssues.length === 0,
    flaggedTerms: toneAudit.flaggedTerms,
    violations: toneAudit.violations,
    structuralIssues,
  };
}

function normalizeAndOrderTells(
  draftTells: PersonalNatureTellOutput[],
  expectedStacks: PersonalNatureTellStackContext[]
): PersonalNatureTellOutput[] {
  const byId = new Map(draftTells.map((t) => [t.tellId, t]));
  return expectedStacks.map((expected, idx) => {
    const matched = byId.get(expected.tellId) ?? draftTells[idx];
    if (!matched) {
      throw new Error(`Missing synthesized tell for ${expected.tellId}`);
    }
    return {
      tellId: expected.tellId,
      category: expected.category,
      headline: matched.headline.trim(),
      body: matched.body.trim(),
      followUpPill: matched.followUpPill.trim(),
    };
  });
}

export async function synthesizePersonalNatureBatch(
  input: SynthesizePersonalNatureInput,
  provider: LlmProvider = getLlmProvider()
): Promise<SynthesizePersonalNatureResult> {
  const voiceProfile =
    input.voiceProfile ?? (await loadActiveVoiceProfile(input.admin));

  const engineContext = buildPersonalNatureEngineContext({
    normalizedChart: input.normalizedChart,
    dobIso: input.dobIso,
    unlockDay: input.unlockDay,
    referenceDate: input.referenceDate,
  });

  const expectedStacks = engineContext.tells;
  const systemPrompt = buildMentorSystemPrompt({
    voiceProfile,
    precisionMode: input.normalizedChart.precisionMode,
    moduleInstructions: `PERSONAL NATURE DISCOVERY HUB — BATCHED ELDER-MENTOR SYNTHESIS:
Generate warm, deeply human Personal Nature tell cards for every entry in \`tellsToSynthesize\` (exactly ${expectedStacks.length} tells in the exact same order).
Speak directly to the user ("you", optionally using the literal token ${FIRST_NAME_PLACEHOLDER} sparingly and affectionately—never invent another name).

CARD FORMAT & LENGTH RULES (NON-NEGOTIABLE):
1. Copy each \`tellId\` and \`category\` VERBATIM from \`tellsToSynthesize\`.
2. \`headline\`: 4–8 warm, human words.
3. \`body\`: Strictly 45–65 warm kitchen-table words (must stay within 35–75 words). Validate their caring intention first, weave \`outerOrPrimaryLayer\` with \`innerOrContrastingLayer\` into one everyday scene, and end with a gentle takeaway.
4. \`followUpPill\`: 1 gentle, affectionate reflection question (8–18 words, ending with "?").
5. Turning Points (\`turning_points\` category): Always cite exact yearly spans in \`turningPointWindows\` verbatim (never say "a few years ago").`,
  });

  const userPayload = {
    firstName: FIRST_NAME_PLACEHOLDER,
    precisionMode: engineContext.precisionMode,
    moonBoundaryFlag: engineContext.moonBoundaryFlag,
    tellsToSynthesize: expectedStacks.map((stack) => ({
      tellId: stack.tellId,
      category: stack.category,
      unlockDay: stack.unlockDay,
      promptInstruction: stack.promptInstruction,
      outerOrPrimaryLayer: stack.outerOrPrimaryLayer,
      innerOrContrastingLayer: stack.innerOrContrastingLayer,
      supportingSignals: stack.supportingSignals,
      ...(stack.turningPointWindows
        ? { turningPointWindows: stack.turningPointWindows }
        : {}),
    })),
  };

  let llmCallsMade = 1;
  let repairedAfterAudit = false;

  const rawDraft = await provider.generateStructuredJson(
    systemPrompt,
    userPayload,
    PersonalNatureBatchSchema,
    { temperature: 0.35 }
  );

  let orderedTells = normalizeAndOrderTells(rawDraft.tells, expectedStacks);
  let audit = auditPersonalNatureBatch(orderedTells, expectedStacks);

  if (!audit.passed) {
    repairedAfterAudit = true;
    llmCallsMade += 1;

    const repairPrompt = `${systemPrompt}

REPAIR INSTRUCTION:
Your previous Personal Nature batch failed strict Elder-Mentor Tone or Length validation.
${audit.flaggedTerms.length > 0 ? `Flagged forbidden terms: ${audit.flaggedTerms.join(", ")}` : ""}
${audit.violations
  .map((v) => `- [${v.category}] At "${v.path}": found "${v.term}" inside "...${v.snippet}..."`)
  .join("\n")}
${audit.structuralIssues.map((s) => `- [structure/word-count] ${s}`).join("\n")}

Rewrite ONLY the offending cards in warm, plain kitchen-table English with zero banned terms and strictly 45–65 words per \`body\`.`;

    const repairedDraft = await provider.generateStructuredJson(
      repairPrompt,
      {
        originalContext: userPayload,
        draftToRepair: { tells: orderedTells },
        flaggedTerms: audit.flaggedTerms,
        structuralIssues: audit.structuralIssues,
      },
      PersonalNatureBatchSchema,
      { temperature: 0.25 }
    );

    orderedTells = normalizeAndOrderTells(repairedDraft.tells, expectedStacks);
    audit = auditPersonalNatureBatch(orderedTells, expectedStacks);

    if (!audit.passed) {
      const combinedReasons = [
        ...audit.flaggedTerms,
        ...audit.structuralIssues,
      ];
      throw new BlueprintGuardrailError(
        `Personal Nature synthesis failed mentor tone/length guardrail after retry (${combinedReasons.join("; ")}).`,
        audit.violations,
        audit.flaggedTerms.length > 0 ? audit.flaggedTerms : audit.structuralIssues
      );
    }
  }

  return {
    tells: interpolateFirstName(orderedTells, input.firstName),
    voiceProfileId: voiceProfile.id,
    modelVersion: provider.modelName,
    llmCallsMade,
    repairedAfterAudit,
  };
}

/* -------------------------------------------------------------------------- */
/*                Supabase Drip Persistence & Feedback Service                */
/* -------------------------------------------------------------------------- */

interface PersonalNatureTellDbRow {
  id: string;
  chart_id: string;
  user_id: string | null;
  category: PersonalNatureCategorySlug;
  tell_id: string;
  unlock_day: number;
  is_unlocked: boolean;
  unlocked_at: string | null;
  headline: string;
  body: string;
  follow_up_pill: string;
  accuracy_rating: PersonalNatureAccuracyRating | null;
  user_reflection: string | null;
  voice_profile_id: string;
  precision_mode: string;
  created_at: string;
  updated_at?: string;
}

const DAY2_DRIP_DELAY_MS = 24 * 60 * 60 * 1000;
const inFlightPersonalNature = new Map<string, Promise<PersonalNatureApiResponse>>();

export function isDay2PreviewFeatureEnabled(): boolean {
  return (
    isDevUnlockPreviewEnabled() ||
    (process.env.NODE_ENV !== "production" &&
      readCleanEnv("NEXT_PUBLIC_ENABLE_DAY2_PREVIEW") === "true")
  );
}

async function assertUnlockedBlueprintAccess(
  admin: SupabaseAdminLike,
  chartId: string
): Promise<void> {
  if (isDevUnlockPreviewEnabled()) return;

  const { data: bp, error: bpErr } = await admin
    .from("blueprints")
    .select("id, is_paid")
    .eq("chart_id", chartId)
    .maybeSingle<{ id: string; is_paid: boolean }>();

  if (bpErr) assertDbError(bpErr);
  if (!bp || !bp.is_paid) {
    throw new BlueprintServiceError(
      "Personal insights require an unlocked Blueprint.",
      403
    );
  }
}

async function ensureVoiceProfileSeeded(
  admin: SupabaseAdminLike,
  voiceProfile: VoiceProfile
): Promise<void> {
  const { data } = await admin
    .from("app_voice_profiles")
    .select("id")
    .eq("id", voiceProfile.id)
    .maybeSingle<{ id: string }>();

  if (!data) {
    await admin.from("app_voice_profiles").upsert(
      {
        id: voiceProfile.id,
        label: voiceProfile.label,
        is_active: voiceProfile.isActive,
        system_persona: voiceProfile.systemPersona,
        rules: voiceProfile.rules,
        banned_astro_terms: voiceProfile.bannedAstroTerms,
        banned_robotic_terms: voiceProfile.bannedRoboticTerms,
      },
      { onConflict: "id" }
    );
  }
}

async function upsertSynthesizedTells(params: {
  admin: SupabaseAdminLike;
  chartId: string;
  userId: string | null;
  precisionMode: string;
  voiceProfileId: string;
  unlockDay: 1 | 2;
  tells: PersonalNatureTellOutput[];
  existingByTellId: Map<string, PersonalNatureTellDbRow>;
  nowIso: string;
}): Promise<void> {
  for (const tell of params.tells) {
    const prev = params.existingByTellId.get(tell.tellId);
    const { error } = await params.admin.from("personal_nature_tells").upsert(
      {
        chart_id: params.chartId,
        user_id: params.userId,
        category: tell.category,
        tell_id: tell.tellId,
        unlock_day: params.unlockDay,
        is_unlocked: true,
        unlocked_at: prev?.unlocked_at ?? params.nowIso,
        headline: tell.headline,
        body: tell.body,
        follow_up_pill: tell.followUpPill,
        accuracy_rating: prev?.accuracy_rating ?? null,
        user_reflection: prev?.user_reflection ?? null,
        voice_profile_id: params.voiceProfileId,
        precision_mode: params.precisionMode,
      },
      { onConflict: "chart_id,tell_id" }
    );
    if (error) assertDbError(error);
  }
}

export async function getOrInitPersonalNature(params: {
  chartIdOrToken: string;
  userId?: string | null;
  userEmail?: string | null;
  sessionToken?: string | null;
  previewDay2?: boolean;
  referenceDate?: Date;
  llmProvider?: LlmProvider;
  admin?: SupabaseAdminLike;
}): Promise<PersonalNatureApiResponse> {
  const admin = params.admin ?? getSupabaseAdminClient();
  const chart = await findNatalChart(params.chartIdOrToken, admin);
  if (!chart) {
    throw new BlueprintServiceError("Blueprint chart not found.", 404);
  }

  assertOwnership(chart, params.userId, params.sessionToken, params.userEmail);
  await assertUnlockedBlueprintAccess(admin, chart.id);

  const now = params.referenceDate ?? new Date();
  const canPreviewDay2 = isDay2PreviewFeatureEnabled();
  const previewDay2Active = Boolean(params.previewDay2 && canPreviewDay2);
  const flightKey = !params.admin
    ? `${chart.id}:${previewDay2Active ? "d2" : "d1"}`
    : null;

  if (flightKey) {
    const existingFlight = inFlightPersonalNature.get(flightKey);
    if (existingFlight) return existingFlight;
  }

  const runWork = async (): Promise<PersonalNatureApiResponse> => {
    const nowIso = now.toISOString();
    const activeVoiceProfile =
      (await loadActiveVoiceProfile(admin)) ?? ELDER_MENTOR_VOICE_V1;
    await ensureVoiceProfileSeeded(admin, activeVoiceProfile);

    const profile = await resolveProfileContext(chart, undefined, admin);
    const catalog = resolvePersonalNatureCatalog(chart.precision_mode);
    const day1Catalog = catalog.filter((c) => c.unlockDay === 1);
    const day2Catalog = catalog.filter((c) => c.unlockDay === 2);

    const { data: initialRows, error: fetchErr } = await admin
      .from("personal_nature_tells")
      .select("*")
      .eq("chart_id", chart.id);
    if (fetchErr) assertDbError(fetchErr);

    let rows = (initialRows ?? []) as PersonalNatureTellDbRow[];
    const existingMap = new Map(rows.map((r) => [r.tell_id, r]));

    const needsDay1Generation = day1Catalog.some((item) => {
      const row = existingMap.get(item.tellId);
      return (
        !row ||
        !row.is_unlocked ||
        row.voice_profile_id !== activeVoiceProfile.id ||
        row.precision_mode !== chart.precision_mode
      );
    });

    if (needsDay1Generation) {
      try {
        const synthDay1 = await synthesizePersonalNatureBatch(
          {
            normalizedChart: chart.normalized_chart_json,
            firstName: profile.firstName,
            dobIso: chart.dob,
            unlockDay: 1,
            referenceDate: now,
            voiceProfile: activeVoiceProfile,
            admin,
          },
          params.llmProvider
        );

        await upsertSynthesizedTells({
          admin,
          chartId: chart.id,
          userId: chart.user_id ?? params.userId ?? null,
          precisionMode: chart.precision_mode,
          voiceProfileId: activeVoiceProfile.id,
          unlockDay: 1,
          tells: synthDay1.tells,
          existingByTellId: existingMap,
          nowIso,
        });
      } catch (err) {
        if (err instanceof BlueprintGuardrailError) {
          throw new BlueprintServiceError(
            "Personal Nature synthesis did not pass mentor tone guardrails. Please try again.",
            422,
            { flaggedTerms: err.flaggedTerms }
          );
        }
        throw err;
      }

      const { data: refreshed, error: refErr } = await admin
        .from("personal_nature_tells")
        .select("*")
        .eq("chart_id", chart.id);
      if (refErr) assertDbError(refErr);
      rows = (refreshed ?? []) as PersonalNatureTellDbRow[];
      existingMap.clear();
      rows.forEach((r) => existingMap.set(r.tell_id, r));
    }

    const day1UnlockTimestamps = day1Catalog
      .map((c) => existingMap.get(c.tellId)?.unlocked_at)
      .filter((ts): ts is string => Boolean(ts))
      .map((ts) => new Date(ts).getTime())
      .filter((ms) => Number.isFinite(ms));

    const baselineUnlockMs =
      day1UnlockTimestamps.length > 0
        ? Math.min(...day1UnlockTimestamps)
        : new Date(chart.created_at).getTime();

    const naturallyUnlockedDay2 =
      Number.isFinite(baselineUnlockMs) &&
      now.getTime() >= baselineUnlockMs + DAY2_DRIP_DELAY_MS;

    const shouldExposeDay2 = naturallyUnlockedDay2 || previewDay2Active;

    if (shouldExposeDay2) {
      const needsDay2Generation = day2Catalog.some((item) => {
        const row = existingMap.get(item.tellId);
        return (
          !row ||
          !row.is_unlocked ||
          row.voice_profile_id !== activeVoiceProfile.id ||
          row.precision_mode !== chart.precision_mode
        );
      });

      if (needsDay2Generation) {
        try {
          const synthDay2 = await synthesizePersonalNatureBatch(
            {
              normalizedChart: chart.normalized_chart_json,
              firstName: profile.firstName,
              dobIso: chart.dob,
              unlockDay: 2,
              referenceDate: now,
              voiceProfile: activeVoiceProfile,
              admin,
            },
            params.llmProvider
          );

          await upsertSynthesizedTells({
            admin,
            chartId: chart.id,
            userId: chart.user_id ?? params.userId ?? null,
            precisionMode: chart.precision_mode,
            voiceProfileId: activeVoiceProfile.id,
            unlockDay: 2,
            tells: synthDay2.tells,
            existingByTellId: existingMap,
            nowIso,
          });
        } catch (err) {
          if (err instanceof BlueprintGuardrailError) {
            throw new BlueprintServiceError(
              "Personal Nature Day 2 synthesis did not pass mentor tone guardrails. Please try again.",
              422,
              { flaggedTerms: err.flaggedTerms }
            );
          }
          throw err;
        }

        const { data: refreshed2, error: refErr2 } = await admin
          .from("personal_nature_tells")
          .select("*")
          .eq("chart_id", chart.id);
        if (refErr2) assertDbError(refErr2);
        rows = (refreshed2 ?? []) as PersonalNatureTellDbRow[];
        existingMap.clear();
        rows.forEach((r) => existingMap.set(r.tell_id, r));
      }
    }

    let houseDependentMisses = 0;
    for (const r of rows) {
      if (
        r.accuracy_rating === "not_really" &&
        isHouseDependentTellId(r.tell_id, chart.precision_mode)
      ) {
        houseDependentMisses += 1;
      }
    }

    const categories: PersonalNatureCategoryDto[] =
      PERSONAL_NATURE_CATEGORIES.map((catMeta) => {
        const catCatalog = catalog.filter((c) => c.category === catMeta.slug);
        const unlockedTells: PersonalNatureTellCardDto[] = [];
        const lockedTeasers: PersonalNatureCategoryDto["lockedTeasers"] = [];

        for (const item of catCatalog) {
          const isItemVisible = item.unlockDay === 1 || shouldExposeDay2;
          const row = existingMap.get(item.tellId);

          if (isItemVisible && row && row.is_unlocked) {
            const unlockedMs = row.unlocked_at
              ? new Date(row.unlocked_at).getTime()
              : now.getTime();
            const isFreshDay2 =
              item.unlockDay === 2 &&
              (previewDay2Active ||
                now.getTime() - unlockedMs < DAY2_DRIP_DELAY_MS);

            unlockedTells.push({
              tellId: item.tellId,
              category: catMeta.slug,
              unlockDay: item.unlockDay,
              isUnlocked: true,
              unlockedAt: row.unlocked_at,
              isNew: isFreshDay2,
              houseDependent: item.houseDependent,
              headline: row.headline,
              body: row.body,
              followUpPill: row.follow_up_pill,
              accuracyRating: row.accuracy_rating ?? null,
              userReflection: row.user_reflection ?? null,
            });
          } else if (item.unlockDay === 2) {
            lockedTeasers.push({
              tellId: item.tellId,
              category: catMeta.slug,
              unlockDay: 2,
              teaserTitle: item.lockedTeaserTitle,
              unlockLabel: "Unlocks Tomorrow",
            });
          }
        }

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
      chartId: chart.id,
      voiceProfileId: activeVoiceProfile.id,
      precisionMode: toUiPrecisionMode(chart.precision_mode),
      canPreviewDay2,
      previewDay2Active,
      day2Unlocked: shouldExposeDay2,
      showBirthTimeVerifyHint: houseDependentMisses >= 2,
      categories,
    };
  };

  if (!flightKey) return runWork();

  const promise = runWork().finally(() => {
    inFlightPersonalNature.delete(flightKey);
  });
  inFlightPersonalNature.set(flightKey, promise);
  return promise;
}

export async function savePersonalNatureFeedback(params: {
  chartIdOrToken: string;
  tellId: string;
  accuracyRating: PersonalNatureAccuracyRating;
  userReflection?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  sessionToken?: string | null;
  admin?: SupabaseAdminLike;
}): Promise<{
  ok: true;
  chartId: string;
  tellId: string;
  accuracyRating: PersonalNatureAccuracyRating;
  userReflection: string | null;
  showBirthTimeVerifyHint: boolean;
}> {
  const admin = params.admin ?? getSupabaseAdminClient();
  const chart = await findNatalChart(params.chartIdOrToken, admin);
  if (!chart) {
    throw new BlueprintServiceError("Blueprint chart not found.", 404);
  }

  assertOwnership(chart, params.userId, params.sessionToken, params.userEmail);
  await assertUnlockedBlueprintAccess(admin, chart.id);

  const cleanedReflection =
    params.userReflection !== undefined
      ? params.userReflection?.trim() || null
      : undefined;

  const updatePatch: Record<string, unknown> = {
    accuracy_rating: params.accuracyRating,
  };
  if (cleanedReflection !== undefined) {
    updatePatch.user_reflection = cleanedReflection;
  }

  const { data: updated, error: updateErr } = await admin
    .from("personal_nature_tells")
    .update(updatePatch)
    .eq("chart_id", chart.id)
    .eq("tell_id", params.tellId)
    .eq("is_unlocked", true)
    .select("*")
    .maybeSingle<PersonalNatureTellDbRow>();

  if (updateErr) assertDbError(updateErr);
  if (!updated) {
    throw new BlueprintServiceError(
      `Personal Nature tell "${params.tellId}" not found for this chart.`,
      404
    );
  }

  try {
    await admin.from("user_memory").upsert(
      {
        chart_id: chart.id,
        user_id: chart.user_id ?? params.userId ?? null,
        source: "personal_nature",
        reference_id: params.tellId,
        memory_tag: `${params.tellId}:${params.accuracyRating}`,
        note_text: updated.user_reflection ?? null,
        metadata: {
          category: updated.category,
          headline: updated.headline,
          accuracyRating: params.accuracyRating,
        },
      },
      { onConflict: "chart_id,source,reference_id" }
    );
  } catch (memErr) {
    console.warn(
      "[savePersonalNatureFeedback] Non-blocking user_memory write skipped:",
      memErr instanceof Error ? memErr.message : memErr
    );
  }

  const { data: allRows } = await admin
    .from("personal_nature_tells")
    .select("tell_id, accuracy_rating")
    .eq("chart_id", chart.id);

  const houseMisses = ((allRows ?? []) as Array<{
    tell_id: string;
    accuracy_rating: PersonalNatureAccuracyRating | null;
  }>).filter(
    (r) =>
      r.accuracy_rating === "not_really" &&
      isHouseDependentTellId(r.tell_id, chart.precision_mode)
  ).length;

  return {
    ok: true,
    chartId: chart.id,
    tellId: updated.tell_id,
    accuracyRating: params.accuracyRating,
    userReflection: updated.user_reflection ?? null,
    showBirthTimeVerifyHint: houseMisses >= 2,
  };
}
