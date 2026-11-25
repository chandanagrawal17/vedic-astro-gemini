import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AstroPrecisionMode } from "@/lib/astro/types";
import { getLlmProvider } from "@/lib/llm/geminiProvider";
import {
  auditMentorTone,
  BANNED_ROBOTIC_BUZZWORDS,
  BlueprintGuardrailError,
} from "@/lib/llm/guardrails";
import type { LlmProvider } from "@/lib/llm/provider";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DailyToneStatus } from "@/lib/types/blueprint";

export type MentorPrecisionMode = AstroPrecisionMode | "approximate";

export interface VoiceProfile {
  id: string;
  label: string;
  isActive: boolean;
  systemPersona: string;
  rules: string[];
  bannedAstroTerms: string[];
  bannedRoboticTerms: string[];
}

/**
 * SQL boundary row shape for `public.app_voice_profiles`.
 */
export interface VoiceProfileDbRow {
  id: string;
  label: string;
  is_active: boolean;
  system_persona: string;
  rules: unknown;
  banned_astro_terms: unknown;
  banned_robotic_terms: unknown;
  created_at?: string;
  updated_at?: string;
}

export const ELDER_MENTOR_VOICE_V1: VoiceProfile = {
  id: "elder_mentor_v1",
  label: "Warm Kitchen-Table Elder Mentor (v1)",
  isActive: true,
  systemPersona:
    "You are a warm, deeply empathetic mentor—like a wise, loving elder family member sitting across the kitchen table over a cup of tea. You speak with quiet affection, steadiness, and gentle honesty. You always see the good heart and protective care behind someone's habits, and you never judge, lecture, diagnose, or talk down.",
  rules: [
    "Empathy First, Truth Second: Always validate the protective reason or caring intention behind a habit before softly naming the blind spot.",
    "Kitchen-Table English: Write the way a loving human mentor talks aloud. Use short, breathable sentences and natural contractions (you're, don't, isn't, let's).",
    "Zero Astrology or Esoteric Jargon: Never output planet names, zodiac signs, house numbers, Sanskrit terms, Ayurvedic dosha/guna labels, or cosmic phrasing.",
    "Zero Corporate, Tech, or Clinical Buzzwords: Never use mechanical, diagnostic, or consultant buzzwords.",
    "No Medical or Fatalistic Claims: Never diagnose health conditions, predict doom, or imply fixed destiny. Frame every insight around self-awareness and gentle choice.",
    "Stack, Don't Flatten: Synthesize at least two contrasting layers (e.g., outer capability vs. inner tenderness, strength vs. quiet toll) so every insight feels deeply personal rather than generic.",
  ],
  bannedAstroTerms: [
    "astrology",
    "horoscope",
    "vedic",
    "jyotish",
    "lagna",
    "ascendant",
    "moon",
    "sun",
    "mars",
    "venus",
    "mercury",
    "jupiter",
    "saturn",
    "rahu",
    "ketu",
    "nakshatra",
    "dasha",
    "mahadasha",
    "antardasha",
    "dosha",
    "pitta",
    "vata",
    "kapha",
    "guna",
    "sattva",
    "rajas",
    "tamas",
    "karma",
    "kundali",
    "arudha",
    "navamsha",
    "dashamsha",
    "sade sati",
    "dhaiya",
    "transit",
    "numerology",
    "life path number",
    "aries..pisces",
    "1st house..12th house",
  ],
  bannedRoboticTerms: [...BANNED_ROBOTIC_BUZZWORDS],
};

function toStringArray(raw: unknown, fallback: string[]): string[] {
  if (Array.isArray(raw)) {
    const cleaned = raw
      .filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      )
      .map((item) => item.trim());
    if (cleaned.length > 0) return cleaned;
  }
  return fallback;
}

export function mapVoiceProfileRow(row: VoiceProfileDbRow): VoiceProfile {
  return {
    id: row.id || ELDER_MENTOR_VOICE_V1.id,
    label: row.label || ELDER_MENTOR_VOICE_V1.label,
    isActive: Boolean(row.is_active),
    systemPersona:
      row.system_persona?.trim() || ELDER_MENTOR_VOICE_V1.systemPersona,
    rules: toStringArray(row.rules, ELDER_MENTOR_VOICE_V1.rules),
    bannedAstroTerms: toStringArray(
      row.banned_astro_terms,
      ELDER_MENTOR_VOICE_V1.bannedAstroTerms
    ),
    bannedRoboticTerms: toStringArray(
      row.banned_robotic_terms,
      ELDER_MENTOR_VOICE_V1.bannedRoboticTerms
    ),
  };
}

let cachedDefaultProfile: { profile: VoiceProfile; expiresAt: number } | null =
  null;
const VOICE_CACHE_TTL_MS = 60_000;

export async function loadActiveVoiceProfile(
  admin?: Pick<SupabaseClient, "from"> | null
): Promise<VoiceProfile> {
  if (
    !admin &&
    cachedDefaultProfile &&
    Date.now() < cachedDefaultProfile.expiresAt
  ) {
    return cachedDefaultProfile.profile;
  }

  try {
    const client = admin ?? getSupabaseAdminClient();
    const { data, error } = await client
      .from("app_voice_profiles")
      .select("*")
      .eq("is_active", true)
      .maybeSingle<VoiceProfileDbRow>();

    if (!error && data) {
      const mapped = mapVoiceProfileRow(data);
      if (!admin) {
        cachedDefaultProfile = {
          profile: mapped,
          expiresAt: Date.now() + VOICE_CACHE_TTL_MS,
        };
      }
      return mapped;
    }
  } catch {
    // Graceful fallback when running offline/unit tests without Supabase credentials
  }

  return ELDER_MENTOR_VOICE_V1;
}

export function buildMentorSystemPrompt(params: {
  voiceProfile?: VoiceProfile | VoiceProfileDbRow;
  moduleInstructions: string;
  precisionMode: MentorPrecisionMode;
}): string {
  const rawProfile = params.voiceProfile ?? ELDER_MENTOR_VOICE_V1;
  const profile: VoiceProfile =
    "systemPersona" in rawProfile
      ? rawProfile
      : mapVoiceProfileRow(rawProfile);

  const normalizedPrecision =
    params.precisionMode === "approx_window"
      ? "approximate"
      : params.precisionMode;

  const precisionGuidance =
    normalizedPrecision === "exact"
      ? `- Exact birth time is available. You may weave contrasts between inner heart and public first-impression dynamics, work authority, and relationship rhythms—expressed purely in warm everyday human language.`
      : normalizedPrecision === "approximate"
        ? `- Approximate birth window only. Avoid fabricating hyper-exact rising-degree perceptions, divisional-chart claims, or exact day-level transitions. Ground insights honestly in emotional rhythm, core character, and multi-month/yearly patterns.`
        : `- Birth date only (no exact birth time). NEVER reference exact house-dependent perceptions (such as public room projection or divisional charts). Synthesize strictly from emotional core, character drives, macro yearly cycles, and fallback character numbers.`;

  return `
${profile.systemPersona}

NON-NEGOTIABLE VOICE & SAFETY RULES:
${profile.rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}

STRICTLY FORBIDDEN WORDS & PHRASES:
- Astrology/Sanskrit terms: ${profile.bannedAstroTerms.join(", ")}
- Robotic/Corporate/Clinical terms: ${profile.bannedRoboticTerms.join(", ")}

BIRTH TIME PRECISION MODE: ${normalizedPrecision}
${precisionGuidance}

MODULE INSTRUCTIONS:
${params.moduleInstructions.trim()}
`.trim();
}

export const DailyBriefDirectiveSchema = z.object({
  directiveText: z
    .string()
    .min(25)
    .max(240)
    .describe("1–2 warm, breathable kitchen-table mentor sentences for today."),
});

export function buildDailyBriefMentorSystemPrompt(params: {
  precisionMode: MentorPrecisionMode;
  toneStatus: DailyToneStatus;
  voiceProfile?: VoiceProfile;
}): string {
  return buildMentorSystemPrompt({
    voiceProfile: params.voiceProfile ?? ELDER_MENTOR_VOICE_V1,
    precisionMode: params.precisionMode,
    moduleInstructions: `DAILY BRIEF — KITCHEN-TABLE MORNING CHECK-IN (toneStatus = "${params.toneStatus}"):
Write one warm, grounded daily note (25–45 words) helping the user pace their heart, work, and close conversations today.
- Acknowledge how their day feels first, then offer one simple, loving practical choice.
- Never repeat any directive theme listed in \`recentDirectives\`.
- Zero astrology/Sanskrit terms, zero robotic/corporate buzzwords, and zero medical or fatalistic claims.`,
  });
}

export async function synthesizeDailyBriefDirective(
  params: {
    precisionMode: MentorPrecisionMode;
    toneStatus: DailyToneStatus;
    toneLabel: string;
    summary: string;
    careerMode?: string | null;
    relationshipStatus?: string | null;
    recentDirectives?: string[];
    voiceProfile?: VoiceProfile;
  },
  provider: LlmProvider = getLlmProvider()
): Promise<{ directiveText: string; repairedAfterAudit: boolean }> {
  const systemPrompt = buildDailyBriefMentorSystemPrompt({
    precisionMode: params.precisionMode,
    toneStatus: params.toneStatus,
    voiceProfile: params.voiceProfile,
  });

  const userPayload = {
    toneStatus: params.toneStatus,
    toneLabel: params.toneLabel,
    daySummary: params.summary,
    careerMode: params.careerMode ?? "employed",
    relationshipStatus: params.relationshipStatus ?? "single",
    recentDirectives: params.recentDirectives ?? [],
  };

  let draft = await provider.generateStructuredJson(
    systemPrompt,
    userPayload,
    DailyBriefDirectiveSchema,
    { temperature: 0.35 }
  );

  let audit = auditMentorTone(draft);
  let repairedAfterAudit = false;

  if (!audit.passed) {
    repairedAfterAudit = true;
    const repairPrompt = `${systemPrompt}

REPAIR INSTRUCTION:
Your previous daily note contained forbidden terms: ${audit.flaggedTerms.join(", ")}.
Rewrite \`directiveText\` in warm, plain kitchen-table English with zero astrology jargon and zero robotic/corporate buzzwords.`;

    draft = await provider.generateStructuredJson(
      repairPrompt,
      {
        originalContext: userPayload,
        draftToRepair: draft,
        flaggedTerms: audit.flaggedTerms,
      },
      DailyBriefDirectiveSchema,
      { temperature: 0.25 }
    );
    audit = auditMentorTone(draft);
    if (!audit.passed) {
      throw new BlueprintGuardrailError(
        `Daily Brief failed mentor tone audit after retry (flagged: ${audit.flaggedTerms.join(", ")}).`,
        audit.violations,
        audit.flaggedTerms
      );
    }
  }

  return {
    directiveText: draft.directiveText.trim(),
    repairedAfterAudit,
  };
}
