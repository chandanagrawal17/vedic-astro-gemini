import type { CareerTelemetry } from "@/lib/astro/careerEngine";
import type { HardResetTelemetry } from "@/lib/astro/hardResetEngine";

export const BANNED_ASTROLOGY_REGEX =
  /\b(astrolog\w*|horoscope|vedic|jyotish|zodiac|planet|planets|planetary|transit|transits|transited|transiting|eclipse|eclipses|lagna|ascendant|rising\s+sign|rashi|rashis|dasha|dasa|mahadasha|antardasha|pratyantardasha|nakshatra|pada|charan|kundali|kundli|rahu|ketu|shani|saturn|mangal|manglik|mars|shukr\w*|venus|budh\w*|mercury|surya|chandra\w*|guru|brihaspati|jupiter|pluto|uranus|neptune|retrograde|vakriya|sade\s*sati|dhaiya|panauti|dusthana|kendra|trikona|upachaya|bhava|graha|yoga|navamsha|navamsa|dashamsha|dashamsa|upapada|darapada|arudha|sudarshana|ashtakavarga|shadbala|gochar|karm[ai]\w*|upaay|tantr\w*|mantra|chakra|remedy|remedies|pitta|vata|kapha|dosha|sattva|rajas|tamas|purushartha|dharma|artha|kama|moksha|numerolog\w*|life\s*path\s*number|aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces|mesha|vrishabha|mithuna|karka|simha|kanya|tula|vrishchika|dhanu|makara|kumbha|meena|(?:1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|11th|12th)\s+house)\b/gi;

export const BANNED_FATALISTIC_REGEX =
  /\b(divorce|infidelity|cheating|cursed|doomed|bad\s+luck|unlucky|early\s+death|clinical\s+depression|diagnose|therapy|therapist)\b/gi;

export const CLICHE_REGEX =
  /\b(deep transformation|tested your resilience|emerged stronger|cosmic shift|hidden energies|universe pushed|spiritual journey|major turning point)\b/gi;

export const CORPORATE_BUZZWORD_REGEX =
  /\b(synerg\w*|operational footprint|surgical diagnostic|deliverables|value proposition|paradigm|tactical posture|stakeholder alignment|scalable ecosystem|maximize upside)\b/gi;

/**
 * Detects leaked month names or seasons inside Free Tier Hard Reset & Career copy,
 * while avoiding false positives on everyday English verbs/nouns like "you may feel",
 * "don't fall into", "spring into action", or "march forward".
 */
export const FREE_TIER_UNAMBIGUOUS_MONTH_REGEX =
  /\b(january|february|april|june|july|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec|summer|autumn|winter|mid-(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*|(?:early|late)\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*|10-week)\b/gi;

const FREE_TIER_CONTEXTUAL_MONTH_REGEX =
  /(?:\b(?:in|during|by|until|through|from|to|next|this|last|early|late|around)\s+(?:spring|fall|march|may|august)\b|\b(?:spring|fall|march|may|august)\s*(?:\d{4}|[–-]))/gi;

const FREE_TIER_CAPITALIZED_MONTH_REGEX =
  /(?:^|[\s,(–-])(March|May|August)(?=\s*(?:\d{4}|[–-]|,|of\b))/g;

const IN_TRANSITION_FORBIDDEN_REGEX =
  /\b(at your day job|don't quit your job|do not quit your job|stay at your day job)\b/gi;

export type GuardrailCategory =
  | "astrology_jargon"
  | "fatalistic_clinical"
  | "horoscope_cliche"
  | "corporate_buzzword"
  | "free_tier_month_leak"
  | "free_tier_score_leak"
  | "paid_date_fidelity"
  | "paid_score_fidelity"
  | "transition_empathy";

export interface GuardrailViolation {
  path: string;
  category: GuardrailCategory;
  term: string;
  snippet: string;
}

export interface GuardrailAuditResult {
  passed: boolean;
  violations: GuardrailViolation[];
  flaggedTerms: string[];
}

export interface GuardrailAuditOptions {
  hardResetTelemetry?: HardResetTelemetry;
  careerTelemetry?: CareerTelemetry;
}

export class BlueprintGuardrailError extends Error {
  constructor(
    message: string,
    public readonly violations: GuardrailViolation[],
    public readonly flaggedTerms: string[]
  ) {
    super(message);
    this.name = "BlueprintGuardrailError";
  }
}

function runRegexOnText(
  text: string,
  path: string,
  regex: RegExp,
  category: GuardrailCategory,
  violations: GuardrailViolation[]
): void {
  const fresh = new RegExp(regex.source, regex.flags);
  let match: RegExpExecArray | null;
  while ((match = fresh.exec(text)) !== null) {
    const term = (match[1] ?? match[0]).trim();
    const start = Math.max(0, match.index - 24);
    const end = Math.min(text.length, match.index + match[0].length + 24);
    violations.push({
      path,
      category,
      term,
      snippet: text.slice(start, end).trim(),
    });
    if (match.index === fresh.lastIndex) {
      fresh.lastIndex += 1;
    }
  }
}

function scanGlobalString(
  text: string,
  path: string,
  violations: GuardrailViolation[]
): void {
  runRegexOnText(text, path, BANNED_ASTROLOGY_REGEX, "astrology_jargon", violations);
  runRegexOnText(text, path, BANNED_FATALISTIC_REGEX, "fatalistic_clinical", violations);
  runRegexOnText(text, path, CLICHE_REGEX, "horoscope_cliche", violations);
  runRegexOnText(text, path, CORPORATE_BUZZWORD_REGEX, "corporate_buzzword", violations);
}

function scanFreeMonthLeaks(
  text: string,
  path: string,
  violations: GuardrailViolation[]
): void {
  runRegexOnText(text, path, FREE_TIER_UNAMBIGUOUS_MONTH_REGEX, "free_tier_month_leak", violations);
  runRegexOnText(text, path, FREE_TIER_CONTEXTUAL_MONTH_REGEX, "free_tier_month_leak", violations);
  runRegexOnText(text, path, FREE_TIER_CAPITALIZED_MONTH_REGEX, "free_tier_month_leak", violations);
}

function walkStrings(
  value: unknown,
  path: string,
  visitor: (text: string, currentPath: string) => void
): void {
  if (typeof value === "string") {
    visitor(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      walkStrings(item, `${path}[${index}]`, visitor);
    });
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const nextPath = path ? `${path}.${key}` : key;
      walkStrings(nested, nextPath, visitor);
    }
  }
}

function auditTieredConstraints(
  root: Record<string, unknown>,
  options: GuardrailAuditOptions | undefined,
  violations: GuardrailViolation[]
): void {
  const hookProof =
    root.hook_proof_json && typeof root.hook_proof_json === "object"
      ? (root.hook_proof_json as Record<string, unknown>)
      : null;
  const fullBlueprint =
    root.full_blueprint_json && typeof root.full_blueprint_json === "object"
      ? (root.full_blueprint_json as Record<string, unknown>)
      : null;

  // 1. Free-tier Hard Reset & Career month/season leak scan
  const freeHardReset = hookProof?.hardReset ?? hookProof?.hard_reset;
  if (freeHardReset) {
    walkStrings(freeHardReset, "hook_proof_json.hardReset", (text, p) => {
      scanFreeMonthLeaks(text, p, violations);
    });
  }

  const freeCareer = hookProof?.career;
  if (freeCareer) {
    walkStrings(freeCareer, "hook_proof_json.career", (text, p) => {
      scanFreeMonthLeaks(text, p, violations);
    });
  }

  // 2. Free-tier Career paid-score leak scan + in_transition empathy check
  if (options?.careerTelemetry) {
    const { scores, user_context, forward_12m_timing } = options.careerTelemetry;

    if (freeCareer) {
      const leakedScores = [
        scores.day_job_score,
        scores.going_solo_score,
        scores.hybrid_side_build_score,
      ].filter((s) => s !== scores.current_path_fit_score);

      walkStrings(freeCareer, "hook_proof_json.career", (text, p) => {
        for (const leaked of leakedScores) {
          const pctRegex = new RegExp(
            `\\b${leaked}\\s*(?:%|percent\\b|/\\s*100\\b|out\\s+of\\s+100\\b)`,
            "gi"
          );
          runRegexOnText(text, p, pctRegex, "free_tier_score_leak", violations);
        }
      });
    }

    if (user_context.career_mode === "in_transition") {
      if (freeCareer) {
        walkStrings(freeCareer, "hook_proof_json.career", (text, p) => {
          runRegexOnText(text, p, IN_TRANSITION_FORBIDDEN_REGEX, "transition_empathy", violations);
        });
      }
      if (fullBlueprint?.career) {
        walkStrings(fullBlueprint.career, "full_blueprint_json.career", (text, p) => {
          runRegexOnText(text, p, IN_TRANSITION_FORBIDDEN_REGEX, "transition_empathy", violations);
        });
      }
    }

    // 3. Paid-tier Career deterministic score & monthRange fidelity check
    if (fullBlueprint?.career && typeof fullBlueprint.career === "object") {
      const paidCareer = fullBlueprint.career as Record<string, unknown>;
      const comparison = Array.isArray(paidCareer.pathComparison)
        ? (paidCareer.pathComparison as Array<Record<string, unknown>>)
        : [];

      const expectedByKey: Record<string, number> = {
        day_job: scores.day_job_score,
        going_solo: scores.going_solo_score,
        hybrid_side_build: scores.hybrid_side_build_score,
      };

      for (const [key, expectedScore] of Object.entries(expectedByKey)) {
        const entry = comparison.find((c) => c.pathKey === key);
        if (!entry || entry.fitScore !== expectedScore) {
          violations.push({
            path: `full_blueprint_json.career.pathComparison.${key}`,
            category: "paid_score_fidelity",
            term: `${key}:${entry?.fitScore ?? "missing"}`,
            snippet: `Expected exact fitScore ${expectedScore} for ${key}`,
          });
        }
      }

      const next12 =
        paidCareer.next12Months && typeof paidCareer.next12Months === "object"
          ? (paidCareer.next12Months as Record<string, unknown>)
          : null;
      const windows = Array.isArray(next12?.tightMonthlyWindows)
        ? (next12.tightMonthlyWindows as Array<Record<string, unknown>>)
        : [];
      const allowedCareerRanges = new Set(
        forward_12m_timing.upcoming_windows.map((w) => w.month_range)
      );

      windows.forEach((win, idx) => {
        const mr = typeof win.monthRange === "string" ? win.monthRange : "";
        if (!allowedCareerRanges.has(mr)) {
          violations.push({
            path: `full_blueprint_json.career.next12Months.tightMonthlyWindows[${idx}].monthRange`,
            category: "paid_date_fidelity",
            term: mr || "missing",
            snippet: `Month range "${mr}" does not match careerTelemetry`,
          });
        }
      });
    }
  }

  // 4. Paid-tier Hard Reset exact monthRange fidelity check
  if (options?.hardResetTelemetry && fullBlueprint) {
    const paidHardReset = (fullBlueprint.hardReset ?? fullBlueprint.hard_reset) as
      | Record<string, unknown>
      | undefined;

    if (paidHardReset && typeof paidHardReset === "object") {
      const allowedResetRanges = new Set(
        options.hardResetTelemetry.selected_chapters.flatMap((ch) =>
          ch.flashpoints.map((fp) => fp.month_range)
        )
      );
      const chapters = Array.isArray(paidHardReset.chapters)
        ? (paidHardReset.chapters as Array<Record<string, unknown>>)
        : [];

      chapters.forEach((ch, chIdx) => {
        const fps = Array.isArray(ch.flashpoints)
          ? (ch.flashpoints as Array<Record<string, unknown>>)
          : [];
        fps.forEach((fp, fpIdx) => {
          const mr = typeof fp.monthRange === "string" ? fp.monthRange : "";
          if (!allowedResetRanges.has(mr)) {
            violations.push({
              path: `full_blueprint_json.hardReset.chapters[${chIdx}].flashpoints[${fpIdx}].monthRange`,
              category: "paid_date_fidelity",
              term: mr || "missing",
              snippet: `Flashpoint monthRange "${mr}" does not match hardResetTelemetry`,
            });
          }
        });
      });

      const nextWin =
        paidHardReset.nextPressureWindow &&
        typeof paidHardReset.nextPressureWindow === "object"
          ? (paidHardReset.nextPressureWindow as Record<string, unknown>)
          : null;
      const expectedNext = options.hardResetTelemetry.upcoming_prep_window.month_range;
      if (nextWin && nextWin.monthRange !== expectedNext) {
        violations.push({
          path: "full_blueprint_json.hardReset.nextPressureWindow.monthRange",
          category: "paid_date_fidelity",
          term: String(nextWin.monthRange ?? "missing"),
          snippet: `Expected upcoming monthRange "${expectedNext}"`,
        });
      }
    }
  }
}

/**
 * Recursively inspects a generated Blueprint JSON object for:
 * - Banned astrology/Sanskrit/Ayurveda jargon & fatalistic/clinical phrasing
 * - Horoscope clichés & stiff corporate buzzwords
 * - Free-tier month/season leaks and paid career score leaks
 * - Paid-tier deterministic score & exact monthRange fidelity (when telemetry provided)
 */
export function auditBlueprintOutput(
  jsonObject: unknown,
  options?: GuardrailAuditOptions
): GuardrailAuditResult {
  const violations: GuardrailViolation[] = [];

  walkStrings(jsonObject, "", (text, path) => {
    scanGlobalString(text, path, violations);
  });

  if (jsonObject && typeof jsonObject === "object") {
    auditTieredConstraints(
      jsonObject as Record<string, unknown>,
      options,
      violations
    );
  }

  const seen = new Set<string>();
  const flaggedTerms: string[] = [];
  for (const v of violations) {
    const normalized = v.term.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      flaggedTerms.push(v.term);
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    flaggedTerms,
  };
}
