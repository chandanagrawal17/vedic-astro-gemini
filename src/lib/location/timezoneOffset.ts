/**
 * Resolves historical UTC offset (in hours, e.g. 5.5 or -5) for an IANA timezone
 * at a given birth date & optional birth time so VedicAstroAPI receives exact DST offsets.
 */

export function parseGmtOffsetLabel(tzPart: string): number | null {
  const trimmed = tzPart.trim();
  if (!trimmed) return null;
  if (trimmed === "GMT" || trimmed === "UTC") return 0;

  const match = trimmed.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?$/i);
  if (!match) return null;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const mins = match[3] ? Number(match[3]) / 60 : 0;
  return Number((sign * (hours + mins)).toFixed(2));
}

function parseDobParts(
  dob?: string | null
): { year: number; month: number; day: number } | null {
  if (!dob) return null;
  const trimmed = dob.trim();

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    };
  }

  const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    return {
      year: Number(slashMatch[3]),
      month: Number(slashMatch[2]),
      day: Number(slashMatch[1]),
    };
  }

  return null;
}

function parseTobParts(tob?: string | null): { hour: number; minute: number } {
  if (!tob) return { hour: 12, minute: 0 };
  const match = tob.trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) return { hour: 12, minute: 0 };
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return { hour, minute };
}

function formatOffsetAtInstant(ianaTimeZone: string, utcMs: number): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: ianaTimeZone,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date(utcMs));
    const tzPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    return parseGmtOffsetLabel(tzPart);
  } catch {
    return null;
  }
}

export function resolveHistoricalUtcOffsetHours(
  ianaTimeZone?: string | null,
  dob?: string | null,
  tob?: string | null
): number | null {
  const zone = ianaTimeZone?.trim();
  if (!zone) return null;

  const dobParts = parseDobParts(dob);
  if (!dobParts) {
    return formatOffsetAtInstant(zone, Date.now());
  }

  const { hour, minute } = parseTobParts(tob);
  const nominalUtcMs = Date.UTC(
    dobParts.year,
    dobParts.month - 1,
    dobParts.day,
    hour,
    minute,
    0
  );

  // Pass 1: estimate offset around that date
  const firstPass = formatOffsetAtInstant(zone, nominalUtcMs);
  if (firstPass === null) return null;

  // Pass 2: refine UTC instant using pass-1 local offset (handles DST switch days)
  const refinedUtcMs = nominalUtcMs - firstPass * 3600000;
  return formatOffsetAtInstant(zone, refinedUtcMs) ?? firstPass;
}
