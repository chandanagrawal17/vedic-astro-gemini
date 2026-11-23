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
  email: "alex@example.com",
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
): BlueprintSession & { paidPayload: BlueprintPaidPayload } {
  const rawName = input.firstName.trim() || "Alex";
  const name = rawName.split(/\s+/)[0];
  const isPartnered =
    input.relationshipStatus === "married" ||
    input.relationshipStatus === "relationship";
  const isExact = input.precisionMode === "exact";
  const fieldLabel = input.careerField.trim() || "your current field";

  const resetWindow = "2022 – 2023";
  const era1Dates = "2016 – 2019";
  const era2Dates = "2020 – 2023";
  const era3Dates = isExact ? "Jan 2024 – Apr 2027" : "2024 – 2027";
  const era4Dates = isExact ? "May 2027 – 2030" : "2027 – 2030";

  const isTransition =
    input.careerMode === "in_transition" || input.careerMode === "transition";

  const careerScoreMap: Record<OnboardingInput["careerMode"], number> = {
    employed: 60,
    employed_hybrid: 63,
    founder: 72,
    freelance_hybrid: 86,
    freelance: 86,
    in_transition: 63,
    transition: 63,
  };

  const careerHeadlineMap: Record<OnboardingInput["careerMode"], string> = {
    employed: "Great at the job, hungry for something deeper",
    employed_hybrid: "Great at the job, hungry for something deeper",
    founder: "Built to own outcomes, careful not to carry it all alone",
    freelance_hybrid: "Strong autonomy, ready for repeatable leverage",
    freelance: "Strong autonomy, ready for repeatable leverage",
    in_transition: "Why your last chapter felt outgrown",
    transition: "Why your last chapter felt outgrown",
  };

  const sweetSpotMap: Record<OnboardingInput["careerMode"], string> = {
    employed: "Problem-Solver → Builder of Your Own Thing",
    employed_hybrid: "Problem-Solver → Builder of Your Own Thing",
    founder: "Systems Builder → Focused Independent Owner",
    freelance_hybrid: "Trusted Advisor → Repeatable Product Builder",
    freelance: "Trusted Advisor → Repeatable Product Builder",
    in_transition: "Sharp Fixer → Autonomous People-Focused Builder",
    transition: "Sharp Fixer → Autonomous People-Focused Builder",
  };

  const freePayload: BlueprintFreePayload = {
    hardReset: {
      primaryYearRange: resetWindow,
      primaryChapterTitle: "The Identity Overhaul & Honesty Test",
      introHook: `${name}, between ${resetWindow}, going through the motions stopped working—forcing a sharper look at what you actually want to build.`,
      concreteRealLifeThemes: [
        "A sharp shift from enduring the grind to feeling caged inside conventional boxes—sparking an intense urge to build something genuinely yours.",
        "A truth-serum stretch in close one-on-one bonds where polite autopilot stopped working, forcing sudden detachment, a blunt honesty talk, or a firm boundary.",
        "High-speed ambition colliding with domestic restlessness, leaving your mind swinging between intense sprints and abrupt mental exhaustion.",
      ],
      whatItRewired:
        "You walked out with a calibrated radar for hollow commitments and a fierce refusal to waste energy on misaligned rooms.",
      secondaryYearWindow: {
        yearRange: "2020 – 2021",
        chapterTitle: "The Heavy Career & Home Squeeze",
        oneLineSnapshot:
          "Long hours in an under-leveraged role colliding with domestic restlessness and personal pressure.",
      },
      lockedMonthlyTimelineTeaser: {
        totalLockedFlashpoints: 9,
        lockedChaptersSpan: "2014 – 2023",
        previewItems: [
          { id: "fp_2022_01", yearLabel: "2022", title: "The Boiling Point" },
          {
            id: "fp_2022_02",
            yearLabel: "2022",
            title: "The Relationship Truth Serum",
          },
          {
            id: "fp_2023_01",
            yearLabel: "2023",
            title: "Big Vision vs. Domestic Unrest",
          },
        ],
        paywallCtaLine:
          "Unlock all 9 exact 1-to-3-month flashpoints across 2014–2023 plus the exact months of your next pressure window.",
      },
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
      currentPathFitScore: careerScoreMap[input.careerMode],
      fitHeadline: careerHeadlineMap[input.careerMode],
      sweetSpotLabel: sweetSpotMap[input.careerMode],
      whyYouAreGood:
        "Honestly, you're the person everyone turns to when things get messy. Drop you into a broken setup or a stressful deadline, and your brain clicks into gear—you spot what's wrong and fix it faster than almost anyone else in the room.",
      whyItFeelsEmptyOrShifting: isTransition
        ? "Your last chapter ran its course because you outgrew pouring all that problem-solving grit into someone else's machine. You don't hate hard work—you just want your next move to belong to you and actually help real people."
        : "You have the grit to crush a tough 9–5, and weirdly, that's your trap. You don't hate hard work—you're just getting tired of pouring all that energy into someone else's machine without feeling like it truly helps people or belongs to you.",
      howWorkSeesYou:
        "Inside your head, you think like a builder who wants room to create something meaningful. On the outside, coworkers mostly see an intense, dependable firefighter—so they keep handing you messy cleanup jobs instead of real ownership.",
      lockedTeaser: {
        fieldAuditQuestion: input.careerField.trim()
          ? `Does ${fieldLabel} really fit you?`
          : "Does your current track really fit you?",
        alternativeLanesCount: 4,
        timingYearLabel: "2027",
        paywallCtaLine:
          "Unlock your 3-path score breakdown, 4 hidden alternative lanes, and your best months ahead.",
      },
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
    upgrade_hint: isExact
      ? null
      : "Add your exact birth time anytime to sharpen your workplace perception and monthly timing windows for free.",
  };

  const paidPayload: BlueprintPaidPayload = {
    hardReset: {
      chapters: [
        {
          chapterId: "ch_2022_2023",
          yearRange: "2022 – 2023",
          chapterTitle: "The Identity Overhaul & Honesty Test",
          flashpoints: [
            {
              id: "fp_2022_01",
              monthRange: "Late June – early Aug 2022",
              title: "The Boiling Point",
              realLifeEvent:
                "Impatience with autopilot routines spiked hard—making conventional expectations feel suffocating and triggering a shorter fuse when people moved too slowly.",
            },
            {
              id: "fp_2022_02",
              monthRange: "Late Oct – Nov 2022",
              title: "The Relationship Truth Serum",
              realLifeEvent:
                "Illusions dropped fast in a close one-on-one bond—triggering either sudden emotional detachment, a make-or-break honesty talk, or drawing a firm boundary.",
            },
            {
              id: "fp_2023_01",
              monthRange: "May – June 2023",
              title: "Big Vision vs. Domestic Unrest",
              realLifeEvent:
                "An unconventional ambition surge collided with unsettled energy at home, making it tough to switch off your brain at night.",
            },
          ],
          howItFeltInside:
            "A racing mind that refused to idle, sharper impatience spikes, and classic sprint-and-crash fatigue whenever you pushed too hard without recovery.",
          whatItRewired:
            "You earned fierce clarity around self-respect and autonomy—just watch the leftover reflex to assume you have to fight every battle alone.",
        },
        {
          chapterId: "ch_2020_2021",
          yearRange: "2020 – 2021",
          chapterTitle: "The Heavy Career & Home Squeeze",
          flashpoints: [
            {
              id: "fp_2020_01",
              monthRange: "Late Mar – early May 2020",
              title: "Sudden Heavy Load",
              realLifeEvent:
                "Responsibility piled up overnight under rigid constraints, forcing you to hold everything together while personal bandwidth shrank.",
            },
            {
              id: "fp_2021_01",
              monthRange: "Sept – Nov 2021",
              title: "Grind Bleeding Into Home",
              realLifeEvent:
                "Daily firefighting and peer friction spilled over into personal life, testing whether your schedule left room for real connection.",
            },
          ],
          howItFeltInside:
            "Quiet mental burnout and late-night overthinking—replaying work problems in bed long after the laptop closed.",
          whatItRewired:
            "You proved you can stay composed under heavy pressure, but the leftover habit is mistaking exhaustion for proof that you're doing enough.",
        },
      ],
      corePatternThread:
        "Across these chapters, life kept pruning borrowed goals and quiet people-pleasing so you'd finally trust your own standards and build on solid ground.",
      nextPressureWindow: {
        monthRange: "June – Aug 2027",
        windowTitle: "The Foundation Stress-Test",
        whatToExpect:
          "A serious accountability checkpoint that strips away distractions and rewards whatever habits, cash buffers, and systems you've already locked in.",
        prepMoves: [
          "Keep a calm 6-month cash cushion before taking on major fixed expenses.",
          "Prune low-value side commitments early so your top bet gets clean focus.",
          "Lock in a non-negotiable evening shutdown to protect sleep and nerves.",
        ],
      },
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
      pathComparison: [
        {
          pathKey: "day_job",
          pathLabel: "Sticking Purely to a 9–5",
          fitScore: 60,
          isRecommended: false,
          honestMentorTake:
            "You're plenty capable of succeeding inside a structured company, and the steady paycheck keeps stress low. The catch is that rigid politics and slow approvals will quietly wear down your spark over time.",
        },
        {
          pathKey: "going_solo",
          pathLabel: "Quitting Cold Turkey / Full Solo Leap",
          fitScore: 72,
          isRecommended: false,
          honestMentorTake:
            "You genuinely have the drive and client sense to run your own show. Jumping with zero safety net right now, though, puts unnecessary pressure on your nerves and tempts you to over-tinker instead of shipping.",
        },
        {
          pathKey: "hybrid_side_build",
          pathLabel: isTransition
            ? "Steady Income / Consulting + Building Your Own Thing"
            : "Building on the Side First",
          fitScore: 91,
          isRecommended: true,
          honestMentorTake: isTransition
            ? "Pairing a clean, steady role or consulting income with your own focused side project protects your cash cushion while giving your builder side room to breathe. Once real paying customers show up, you can scale on your own terms."
            : "Keeping your steady base while shipping a lean side project on evenings or weekends is your clear sweet spot right now. It protects your cash cushion, kills panic decisions, and lets real paying users prove the idea first.",
        },
      ],
      fieldAudit: {
        statedFieldLabel: input.careerField.trim() || "Your Current Track",
        whatFitsLikeAGlove:
          "You shine whenever a role asks you to untangle messy problems, bring order to chaos, and build clean, dependable systems that actually work.",
        whatIsMissing:
          "What's quietly draining you is too much behind-the-scenes maintenance with too little direct human connection, creative ownership, or visible upside.",
        yourBestNextStep:
          "Don't blow up your hard-earned skills—bridge them into something people-facing where you guide real humans or own a small, focused product of your own.",
      },
      hiddenAlternativeLanes: [
        {
          laneId: "holistic_health_wellness_performance",
          laneName: "Holistic Health, Burnout Coaching & Performance",
          whyItFitsYou:
            "Your sharp diagnostic eye pairs naturally with helping high-achievers fix sleep, stress, nutrition, and sustainable daily routines.",
        },
        {
          laneId: "strategy_consulting_turnarounds",
          laneName: "Advisory & Operations Turnarounds",
          whyItFitsYou:
            "You spot bottlenecks in minutes—making you a natural independent troubleshooter for founders who need calm, clear systems.",
        },
        {
          laneId: "partnerships_deals_consumer_brands",
          laneName: "Partnerships, Deal-Making & Curated Brands",
          whyItFitsYou:
            "You have strong taste and relational instincts when you're building real win-win partnerships rather than pushing cold scripts.",
        },
        {
          laneId: "mentoring_teaching_media",
          laneName: "Coaching, Writing & Practical Education",
          whyItFitsYou:
            "You have a knack for translating complicated subjects into plain, honest guidance that everyday people can actually use.",
        },
      ],
      perceptionGap: {
        insideYourHead:
          "You think like an independent architect who wants meaningful ownership, honest conversations, and room to build things right.",
        whatCoworkersSee:
          "People around you often see an intense, ultra-capable crisis fixer who gets impatient with slow red tape.",
        simpleShiftToTry:
          "Stop quietly volunteering for invisible cleanup jobs—claim one visible outcome each quarter and communicate your thinking calmly before frustration builds.",
      },
      moneyAndLeaks: {
        howMoneyGrowsForYou:
          "Your wealth compounds steadily through durable reputation, repeatable products or advisory retainers, and long-term trust—not flashy overnight bets.",
        quietHabitCostingYou:
          "Over-polishing in private before charging real money, or staying a year too long in safe rooms that under-use your real ceiling.",
      },
      next12Months: {
        bigPictureSummary:
          "Treat the next six months as your quiet workshop: protect your cash runway, avoid impulsive leaps, and ship small real-world tests to actual people.",
        tightMonthlyWindows: [
          {
            id: "cw_01",
            monthRange: "Dec 2026 – Jan 2027",
            windowTitle: "Great Time to Put It Out There",
            practicalGuidance:
              "Your clarity and messaging click here—ship a simple first version to real users or reach out to warm contacts instead of polishing in private.",
          },
          {
            id: "cw_02",
            monthRange: "Mar – May 2027",
            windowTitle: "Watch Your Patience Under Friction",
            practicalGuidance: isTransition
              ? "Slow recruiters or drawn-out interviews could test your patience here—don't settle for a panic role out of frustration, and keep leaning on warm intros."
              : "Office politics or slow managers will test your patience more than usual here—stay cool, get agreements in writing, and channel that heat into your own build.",
          },
          {
            id: "cw_03",
            monthRange: "June – Aug 2027",
            windowTitle: "Serious Focus Chapter Begins",
            practicalGuidance:
              "A grounded two-year accountability chapter kicks off—prune distractions and double down on the one offer or lane bringing real traction.",
          },
        ],
        mindBodyPacingTip:
          "Your mind runs hot and fast when you care deeply—set a hard 9:30 PM screen shutdown and a short walk after work so sprints don't turn into burnout.",
      },
    },
    selfSabotage: {
      triggerMapLove:
        "When a dynamic feels uncertain, you rush to force a 'define-the-moment' conversation just to relieve the tension of not knowing—even when patience would give you better data.",
      triggerMapCareer:
        "You say yes to tight timelines or over-polish your work past the point of diminishing returns because slowing down feels momentarily like falling behind.",
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
    confirmedFlashpointIds: [],
    savedAlternativeLanes: [],
    isUnlocked: false,
    unlockTier: null,
    reflections: [],
    createdAt: new Date().toISOString(),
  };
}
