export const BANNED_ASTROLOGY_REGEX =
  /\b(astrolog\w*|horoscope|vedic|jyotish|zodiac|planet|planets|planetary|transit|transits|transited|transiting|lagna|ascendant|rising\s+sign|rashi|rashis|dasha|dasa|mahadasha|antardasha|pratyantardasha|nakshatra|pada|charan|kundali|kundli|rahu|ketu|shani|saturn|mangal|manglik|mars|shukr\w*|venus|budh\w*|mercury|surya|chandra\w*|guru|brihaspati|jupiter|pluto|uranus|neptune|retrograde|vakriya|sade\s*sati|dhaiya|panauti|dusthana|kendra|trikona|upachaya|bhava|graha|yoga|navamsha|navamsa|dashamsha|dashamsa|upapada|darapada|arudha|sudarshana|ashtakavarga|shadbala|gochar|karm[ai]\w*|upaay|tantr\w*|mantra|chakra|remedy|remedies|pitta|vata|kapha|dosha|sattva|rajas|tamas|purushartha|dharma|artha|kama|moksha|numerolog\w*|life\s*path\s*number|aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces|mesha|vrishabha|mithuna|karka|simha|kanya|tula|vrishchika|dhanu|makara|kumbha|meena|(?:1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|11th|12th)\s+house)\b/gi;

export const BANNED_FATALISTIC_REGEX =
  /\b(divorce|infidelity|cheating|cursed|doomed|bad\s+luck|unlucky|early\s+death|clinical\s+depression|diagnose|therapy|therapist)\b/gi;

export interface GuardrailViolation {
  path: string;
  category: "astrology_jargon" | "fatalistic_clinical";
  term: string;
  snippet: string;
}

export interface GuardrailAuditResult {
  passed: boolean;
  violations: GuardrailViolation[];
  flaggedTerms: string[];
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

function scanString(
  text: string,
  path: string,
  violations: GuardrailViolation[]
): void {
  const scanRegex = (
    regex: RegExp,
    category: GuardrailViolation["category"]
  ) => {
    const fresh = new RegExp(regex.source, regex.flags);
    let match: RegExpExecArray | null;
    while ((match = fresh.exec(text)) !== null) {
      const term = match[0];
      const start = Math.max(0, match.index - 24);
      const end = Math.min(text.length, match.index + term.length + 24);
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
  };

  scanRegex(BANNED_ASTROLOGY_REGEX, "astrology_jargon");
  scanRegex(BANNED_FATALISTIC_REGEX, "fatalistic_clinical");
}

function walkValue(
  value: unknown,
  path: string,
  violations: GuardrailViolation[]
): void {
  if (typeof value === "string") {
    scanString(value, path, violations);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      walkValue(item, `${path}[${index}]`, violations);
    });
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>
    )) {
      const nextPath = path ? `${path}.${key}` : key;
      walkValue(nested, nextPath, violations);
    }
  }
}

/**
 * Recursively inspects every string value in a generated Blueprint JSON object
 * for banned astrology/Sanskrit jargon and fatalistic/clinical phrasing.
 */
export function auditBlueprintOutput(jsonObject: unknown): GuardrailAuditResult {
  const violations: GuardrailViolation[] = [];
  walkValue(jsonObject, "", violations);

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
