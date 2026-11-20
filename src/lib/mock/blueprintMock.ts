import {
  BlueprintPaidPayload,
  BlueprintFreePayload,
  BlueprintSession,
  LocationOption,
  OnboardingInput,
} from "@/lib/types/blueprint";

export const BANNED_TERMS_REGEX =
  /\b(astrolog\w*|horoscope|vedic|jyotish|kundal[ia]|rashi|nakshatra|pada|charan|lagna|ascendant|navamsha|dashamsha|upapada|darapada|arudha|sudarshana|ashtakavarga|shadbala|mahadasha|antardasha|pratyantardasha|dasha|dasa|gochar|transit\w*|sade\s*sati|dhaiya|panauti|dusthana|kendra|trikona|upachaya|bhava|graha|yoga|dosha|mangal\w*|shani|rahu|ketu|shukr\w*|budh\w*|surya|chandra\w*|guru|brihaspati|mesha|vrishabha|mithuna|karka|simha|kanya|tula|vrishchika|dhanu|makara|kumbha|meena|aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces|saturn|jupiter|mars|venus|mercury|pluto|uranus|neptune|retrograde|vakriya|karm[ai]\w*|upaay|tantr\w*|mantra|chakra|pitta|vata|kapha|sattva|rajas|tamas|purushartha|dharma|artha|kama|moksha|numerolog\w*|life\s*path\s*number|1st\s*house|2nd\s*house|3rd\s*house|4th\s*house|5th\s*house|6th\s*house|7th\s*house|8th\s*house|9th\s*house|10th\s*house|11th\s*house|12th\s*house)\b/gi;

export const MOCK_CITIES: LocationOption[] = [
  // North America
  { cityName: "New York, NY", region: "United States", lat: 40.7128, lon: -74.006, tzOffset: -5 },
  { cityName: "Los Angeles, CA", region: "United States", lat: 34.0522, lon: -118.2437, tzOffset: -8 },
  { cityName: "Chicago, IL", region: "United States", lat: 41.8781, lon: -87.6298, tzOffset: -6 },
  { cityName: "Austin, TX", region: "United States", lat: 30.2672, lon: -97.7431, tzOffset: -6 },
  { cityName: "San Francisco, CA", region: "United States", lat: 37.7749, lon: -122.4194, tzOffset: -8 },
  { cityName: "Seattle, WA", region: "United States", lat: 47.6062, lon: -122.3321, tzOffset: -8 },
  { cityName: "Miami, FL", region: "United States", lat: 25.7617, lon: -80.1918, tzOffset: -5 },
  { cityName: "Boston, MA", region: "United States", lat: 42.3601, lon: -71.0589, tzOffset: -5 },
  { cityName: "Toronto, ON", region: "Canada", lat: 43.6532, lon: -79.3832, tzOffset: -5 },
  { cityName: "Vancouver, BC", region: "Canada", lat: 49.2827, lon: -123.1207, tzOffset: -8 },
  { cityName: "Mexico City", region: "Mexico", lat: 19.4326, lon: -99.1332, tzOffset: -6 },

  // Europe
  { cityName: "London", region: "United Kingdom", lat: 51.5072, lon: -0.1276, tzOffset: 0 },
  { cityName: "Paris", region: "France", lat: 48.8566, lon: 2.3522, tzOffset: 1 },
  { cityName: "Berlin", region: "Germany", lat: 52.52, lon: 13.405, tzOffset: 1 },
  { cityName: "Amsterdam", region: "Netherlands", lat: 52.3676, lon: 4.9041, tzOffset: 1 },
  { cityName: "Madrid", region: "Spain", lat: 40.4168, lon: -3.7038, tzOffset: 1 },
  { cityName: "Barcelona", region: "Spain", lat: 41.3874, lon: 2.1686, tzOffset: 1 },
  { cityName: "Rome", region: "Italy", lat: 41.9028, lon: 12.4964, tzOffset: 1 },
  { cityName: "Zurich", region: "Switzerland", lat: 47.3769, lon: 8.5417, tzOffset: 1 },
  { cityName: "Dublin", region: "Ireland", lat: 53.3498, lon: -6.2603, tzOffset: 0 },
  { cityName: "Stockholm", region: "Sweden", lat: 59.3293, lon: 18.0686, tzOffset: 1 },
  { cityName: "Istanbul", region: "Turkey", lat: 41.0082, lon: 28.9784, tzOffset: 3 },

  // Asia & Middle East
  { cityName: "Mumbai", region: "India", lat: 19.076, lon: 72.8777, tzOffset: 5.5 },
  { cityName: "New Delhi", region: "India", lat: 28.6139, lon: 77.209, tzOffset: 5.5 },
  { cityName: "Bengaluru", region: "India", lat: 12.9716, lon: 77.5946, tzOffset: 5.5 },
  { cityName: "Hyderabad", region: "India", lat: 17.385, lon: 78.4867, tzOffset: 5.5 },
  { cityName: "Chennai", region: "India", lat: 13.0827, lon: 80.2707, tzOffset: 5.5 },
  { cityName: "Dubai", region: "UAE", lat: 25.2048, lon: 55.2708, tzOffset: 4 },
  { cityName: "Riyadh", region: "Saudi Arabia", lat: 24.7136, lon: 46.6753, tzOffset: 3 },
  { cityName: "Singapore", region: "Singapore", lat: 1.3521, lon: 103.8198, tzOffset: 8 },
  { cityName: "Tokyo", region: "Japan", lat: 35.6762, lon: 139.6503, tzOffset: 9 },
  { cityName: "Seoul", region: "South Korea", lat: 37.5665, lon: 126.978, tzOffset: 9 },
  { cityName: "Hong Kong", region: "China", lat: 22.3193, lon: 114.1694, tzOffset: 8 },
  { cityName: "Bangkok", region: "Thailand", lat: 13.7563, lon: 100.5018, tzOffset: 7 },
  { cityName: "Jakarta", region: "Indonesia", lat: -6.2088, lon: 106.8456, tzOffset: 7 },
  { cityName: "Manila", region: "Philippines", lat: 14.5995, lon: 120.9842, tzOffset: 8 },

  // South America, Africa & Oceania
  { cityName: "São Paulo", region: "Brazil", lat: -23.5505, lon: -46.6333, tzOffset: -3 },
  { cityName: "Buenos Aires", region: "Argentina", lat: -34.6037, lon: -58.3816, tzOffset: -3 },
  { cityName: "Bogotá", region: "Colombia", lat: 4.711, lon: -74.0721, tzOffset: -5 },
  { cityName: "Cairo", region: "Egypt", lat: 30.0444, lon: 31.2357, tzOffset: 2 },
  { cityName: "Lagos", region: "Nigeria", lat: 6.5244, lon: 3.3792, tzOffset: 1 },
  { cityName: "Nairobi", region: "Kenya", lat: -1.2921, lon: 36.8219, tzOffset: 3 },
  { cityName: "Cape Town", region: "South Africa", lat: -33.9249, lon: 18.4241, tzOffset: 2 },
  { cityName: "Sydney", region: "Australia", lat: -33.8688, lon: 151.2093, tzOffset: 10 },
  { cityName: "Melbourne", region: "Australia", lat: -37.8136, lon: 144.9631, tzOffset: 10 },
  { cityName: "Auckland", region: "New Zealand", lat: -36.8485, lon: 174.7633, tzOffset: 12 },
];

export const DEFAULT_ONBOARDING_INPUT: OnboardingInput = {
  firstName: "Alex",
  birthDate: "1994-08-14",
  birthCity: "Chicago, IL",
  birthLat: 41.8781,
  birthLon: -87.6298,
  birthTz: -6,
  precisionMode: "exact",
  birthTime: "08:42",
  birthWindow: null,
  relationshipStatus: "single",
  careerMode: "employed",
  careerField: "Product Strategy",
};

export function buildMockBlueprint(
  input: OnboardingInput,
  sessionId = "demo-session"
): BlueprintSession {
  const rawName = input.firstName.trim() || "Alex";
  const name = rawName.split(/\s+/)[0];
  const isPartnered =
    input.relationshipStatus === "married" ||
    input.relationshipStatus === "relationship";
  const isExact = input.precisionMode === "exact";
  const fieldLabel = input.careerField.trim() || "your current field";

  const resetWindow = isExact ? "2021 – 2023" : "2021 – 2023 (approx.)";
  const era1Dates = isExact ? "2016 – 2019" : "2016 – 2019";
  const era2Dates = isExact ? "2020 – 2023" : "2020 – 2023";
  const era3Dates = isExact ? "Jan 2024 – Apr 2027" : "2024 – 2027";
  const era4Dates = isExact ? "May 2027 – 2030" : "2027 – 2030";

  const careerScoreMap: Record<OnboardingInput["careerMode"], number> = {
    employed: 64,
    founder: 78,
    freelance: 72,
    transition: 54,
  };

  const careerSubtitleMap: Record<OnboardingInput["careerMode"], string> = {
    employed: "High Stamina, Low Fulfillment",
    founder: "High Vision, Scattered Ops",
    freelance: "Strong Autonomy, Cap on Scale",
    transition: "Outgrown Shell, Ready to Pivot",
  };

  const idealModeMap: Record<OnboardingInput["careerMode"], string> = {
    employed: "Systems Architect",
    founder: "Independent Strategist",
    freelance: "Bridge-Builder",
    transition: "Autonomous Operator",
  };

  const freePayload: BlueprintFreePayload = {
    hardReset: {
      window: resetWindow,
      chapterLabel: "The Structural Stripping",
      description: `Between ${resetWindow}, you were forced to dismantle an identity, role, or expectation that looked stable on paper but felt quietly suffocating. You likely carried heavy responsibility behind closed doors while questioning who you were without external validation.`,
    },
    relationship: isPartnered
      ? {
          branch: "partnered",
          archetype: "Fiercely Devoted, Guarded Under Fatigue",
          teaserBadge: "1 Core Partner Friction Trigger Detected",
        }
      : {
          branch: "solo",
          archetype: "High Loyalty, Zero Tolerance for Ambiguity",
          teaserBadge: "1 Core Attraction Pattern Trigger Detected",
        },
    career: {
      alignmentScore: careerScoreMap[input.careerMode],
      subtitle: careerSubtitleMap[input.careerMode],
      idealModePill: idealModeMap[input.careerMode],
    },
    selfSabotage: {
      loopName: "The Urgency Loop",
      symptomSentence:
        "You mistake emotional intensity for a deadline—forcing premature decisions or over-delivering before anyone even asked.",
    },
    eras: {
      era1: {
        id: "era1",
        label: "Era 1",
        title: "The Unanchored Climb",
        dateRange: era1Dates,
        summary:
          "You said yes to nearly everything to prove your range, building grit and adaptability while quietly absorbing other people's priorities.",
      },
      era2: {
        id: "era2",
        label: "Era 2",
        title: "The Structural Stripping",
        dateRange: era2Dates,
        summary:
          "Unsustainable commitments, draining dynamics, and surface-level ambitions fell away—leaving you leaner, clearer, and unwilling to perform.",
      },
      era3Preview: {
        title: "The Architecture Cycle",
        dateRange: era3Dates,
        percentComplete: 64,
      },
    },
  };

  const paidPayload: BlueprintPaidPayload = {
    hardReset: {
      deepBreakdown: `Your ${resetWindow} stretch was never meant to be comfortable—it was a compression phase designed to strip away borrowed goals. Every time you tried to rely on charm, speed, or sheer overwork to bypass a bottleneck, the environment forced you to slow down and build real boundaries.`,
      resilienceBuilt:
        "You walked out of that window with a calibrated BS detector and the ability to stay composed when plans collapse. You no longer confuse busyness with traction.",
      nextPressureWindow: isExact ? "Late 2028 – Mid 2029" : "2028 – 2029",
      preparationNote:
        "Unlike the last reset, this upcoming audit rewards what you have already systematized. Document your decision rules now so you don't carry every problem alone later.",
    },
    relationship: isPartnered
      ? {
          coreAlignmentProfile: `${name}, you bond through reliability and shared problem-solving rather than constant verbal reassurance. You feel safest when expectations are explicit and both partners honor their word.`,
          silentFrictionPattern:
            "When you feel depleted, you tend to go hyper-independent and solve everything silently—which your partner can misread as emotional withdrawal or quiet resentment.",
          communicationShifts: [
            "Name your bandwidth before you hit empty: say 'I need 45 minutes to decompress, then I'm fully present' instead of going quiet.",
            "Separate logistical debriefs from emotional check-ins so partnership never starts feeling like a project status meeting.",
          ],
          clarityWindow: isExact
            ? "Next 6 Months · Deepening & Honest Recalibration"
            : "Current Year · Grounded Alignment Window",
        }
      : {
          coreAlignmentProfile: `${name}, you are magnetized toward sharp, self-directed people—but you only stay peaceful with someone whose actions match their words without dramatic guesswork.`,
          silentFrictionPattern:
            "You often over-invest early to 'test' whether someone can meet your intensity, then pull back abruptly the moment you sense inconsistency.",
          communicationShifts: [
            "Slow down the first 30 days: let someone's consistency over time—not one electric conversation—earn your trust.",
            "State your baseline standard calmly instead of testing whether a partner can guess what you need.",
          ],
          clarityWindow: isExact
            ? "Q2 – Q4 · High-Clarity Connection Window"
            : "Next 9 Months · High-Clarity Connection Window",
        },
    career: {
      verdictBadge:
        input.careerMode === "founder"
          ? "Focused Operator"
          : "Hybrid Builder → Autonomous Lead",
      jobVsBusinessVerdict:
        "You thrive best with high decision autonomy and visible ownership of outcomes. Purely bureaucratic roles drain your edge, while pure solo chaos burns your nervous system—you win as a lead architect or focused founder with clean operational support.",
      currentFieldMatch: `In ${fieldLabel}, your natural pattern excels at diagnosing messy systems and turning ambiguity into a repeatable playbook. Where you lose energy is endless consensus-building or executing tasks you have already mastered.`,
      dutyVsPurposeGap:
        "Right now, part of your stamina goes toward proving reliability in rooms that don't stretch your actual ceiling. Shifting even 20% of your week toward high-leverage strategy closes that gap fast.",
      timingPosture:
        "The next 12 months strongly favor building durable systems, raising your rates or scope, and consolidating leverage in place—rather than making an impulsive, unbacked leap.",
    },
    selfSabotage: {
      triggerMapLove:
        "When a dynamic feels uncertain, you rush to force a 'define-the-moment' conversation just to relieve the tension of not knowing—even when patience would give you better data.",
      triggerMapCareer:
        "You say yes to tight timelines or over-polish deliverables past the point of diminishing returns because slowing down feels momentarily like falling behind.",
      antidoteSteps: [
        "Apply the 24-Hour Pause Rule: whenever an urge feels like an emergency, write the message or decision down and wait one full sleep cycle before sending.",
        "Down-regulate physically first: 90 seconds of slow nasal exhales (4s in, 6s out) before responding to high-stakes friction.",
        "Ask one clarifying question: 'Is this an actual deadline, or am I trying to outrun discomfort?'",
      ],
    },
    eras: {
      era3Playbook: {
        coreMandate:
          "Build quiet, compounding infrastructure. This chapter rewards depth, selective commitments, and mastery over noisy visibility.",
        doubleDown:
          "Written strategy, owning a clear niche or core system, and protecting 2-hour uninterrupted deep-work blocks every morning.",
        eliminate:
          "People-pleasing yeses, reactive late-night decisions, and staying in rooms where your standards are treated as 'too intense.'",
      },
      era4Preview: {
        title: "The Expansion Cycle",
        dateRange: era4Dates,
        theme:
          "Visible authority, wider reach, and harvesting the leverage of the systems you are quietly locking in today.",
      },
    },
  };

  return {
    sessionId,
    input,
    freePayload,
    paidPayload,
    hardResetFeedback: null,
    isUnlocked: false,
    unlockTier: null,
    reflections: [],
    createdAt: new Date().toISOString(),
  };
}
