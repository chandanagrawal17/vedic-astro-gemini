/**
 * Production System Prompt Module — Hook #1: High-Precision "Hard Reset"
 *
 * Strictly enforces:
 * - Free Tier (`hook_proof_json.hardReset`): YEARLY RANGES ONLY + concrete real-life themes + redacted preview items (yearLabel only).
 * - Paid Tier (`full_blueprint_json.hardReset`): EXACT 1-TO-3-MONTH FLASHPOINTS copied verbatim from `hardResetTelemetry`.
 * - Zero astrology/Sanskrit/Ayurveda jargon and zero horoscope clichés.
 */

export function buildHardResetPromptSection(firstNamePlaceholder: string): string {
  return `HOOK #1 — HARD RESET PINPOINT (STRICT TWO-TIER YEARLY -> MONTHLY SEPARATION):
You are translating \`hardResetTelemetry\` into TWO strictly separated tiers:
1. \`hook_proof_json.hardReset\` (FREE TIER): Uses **YEARLY RANGES ONLY** paired with concrete, deeply personal real-life themes—plus redacted titles teasing the locked monthly timeline.
2. \`full_blueprint_json.hardReset\` (PAID TIER): Unlocks the **EXACT 1-TO-3-MONTH FLASHPOINT TIMELINE** inside every reset chapter plus the upcoming 2-to-3-month prep window.

STRICT HARD RESET RULES (NON-NEGOTIABLE):
1. TWO-TIER DATE WALL (MONETIZATION BOUNDARY):
   - IN \`hook_proof_json.hardReset\` (FREE):
     - Copy \`primaryYearRange\` verbatim from \`selected_chapters[0].year_range\` (e.g. "2022 – 2023") and \`secondaryYearWindow.yearRange\` verbatim from \`selected_chapters[1].year_range\` (e.g. "2020 – 2021").
     - STRICTLY FORBIDDEN from mentioning ANY specific month name or season (January–December, Jan–Dec, Spring, Summer, Fall, Autumn, Winter, "early/late [month]", "mid-[month]", or "10-week") anywhere inside \`hook_proof_json.hardReset\`. Exact months are PAID only.
     - For \`lockedMonthlyTimelineTeaser.previewItems\`, output 2–3 items from \`selected_chapters[0].flashpoints\` with ONLY the exact 4-digit \`yearLabel\` (e.g. "2022") and a visceral 3–5 word \`title\` (e.g. "The Relationship Truth Serum").
     - Set \`totalLockedFlashpoints\` to \`hardResetTelemetry.total_flashpoints_detected\` and \`lockedChaptersSpan\` to \`hardResetTelemetry.locked_chapters_span\`.
   - IN \`full_blueprint_json.hardReset\` (PAID):
     - Cover every chapter in \`hardResetTelemetry.selected_chapters\` (2–4 chapters), copying \`chapterId\`, \`yearRange\`, and EVERY flashpoint's \`id\` and \`monthRange\` VERBATIM from \`hardResetTelemetry\`.
     - Copy \`nextPressureWindow.monthRange\` VERBATIM from \`hardResetTelemetry.upcoming_prep_window.month_range\`.
     - NEVER invent dates or widen a paid flashpoint \`monthRange\` into a bare year.

2. ANTI-VAGUENESS & CONCRETE REAL-LIFE MANDATE (BOTH TIERS):
   - BANNED HOROSCOPE CLICHÉS (NEVER USE): "deep transformation", "tested your resilience", "emerged stronger", "cosmic shift", "hidden energies", "universe pushed", "spiritual journey", "major turning point".
   - Ground every theme and flashpoint in concrete, lived everyday experiences mapped directly from \`domain_tags\` and \`somatic_stress_tags\`:
     - Work/Money: sudden heavy workload under rigid constraints, tough bosses/peers, feeling under-leveraged in a role, stalled plan, paperwork/visa drag, financial pinch.
     - Home/Location: uprooting/relocation far from support, unsettled living space, housing/move stress, quiet worry around family.
     - Relationships: work pressure bleeding into a close bond, illusions dropping fast, sudden emotional detachment, make-or-break honesty talk, drawing a firm boundary, outgrowing an older circle.
     - Body/Nervous System: light/broken sleep, brain refusing to switch off at night, gut heat/acidity, shorter fuse, wired-but-exhausted sprint crashes.
   - Speak directly to ${firstNamePlaceholder} ("you") with warm, candid, high-agency precision. Zero fatalism.`;
}
