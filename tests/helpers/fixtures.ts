import type { ChartBundleResult, RawAstroBundle } from "@/lib/astro/types";
import { normalizeAstroBundle } from "@/lib/astro/normalizer";
import type { SynthesizedBlueprintPayload } from "@/lib/llm/blueprintSchema";

export function makeRawAstroBundle(options?: {
  includeDivisionals?: boolean;
  moonCrossed?: boolean;
}): RawAstroBundle {
  const includeDivisionals = options?.includeDivisionals ?? true;

  const basePlanets = {
    response: {
      "0": {
        name: "As",
        full_name: "Ascendant",
        zodiac: "Aries",
        rasi_no: 1,
        house: 1,
        local_degree: 14.2,
        nakshatra: "Bharani",
        nakshatra_lord: "Venus",
        nakshatra_pada: 1,
        retro: false,
      },
      "1": {
        name: "Su",
        full_name: "Sun",
        zodiac: "Virgo",
        rasi_no: 6,
        house: 6,
        local_degree: 1.5,
        nakshatra: "Uttara Phalguni",
        nakshatra_lord: "Sun",
        nakshatra_pada: 2,
        retro: false,
      },
      "2": {
        name: "Mo",
        full_name: "Moon",
        zodiac: "Aries",
        rasi_no: 1,
        house: 1,
        local_degree: 18.4,
        nakshatra: "Bharani",
        nakshatra_lord: "Venus",
        nakshatra_pada: 2,
        retro: false,
      },
      "3": {
        name: "Sa",
        full_name: "Saturn",
        zodiac: "Sagittarius",
        rasi_no: 9,
        house: 9,
        local_degree: 13.8,
        nakshatra: "Purva Ashadha",
        nakshatra_lord: "Venus",
        nakshatra_pada: 1,
        retro: false,
      },
    },
  };

  return {
    planetDetails: basePlanets,
    mahaDasha: {
      response: {
        dasha_start_date: "17/09/1989",
        mahadasha: ["Venus", "Sun", "Moon", "Mars", "Rahu"],
        mahadasha_order: [
          "17/09/2003",
          "17/09/2009",
          "17/09/2019",
          "17/09/2026",
          "17/09/2044",
        ],
      },
    },
    antarDasha: {
      response: {
        antardashas: [
          ["Moon/Moon", "Moon/Mars", "Moon/Rahu"],
          ["Mars/Mars", "Mars/Rahu", "Mars/Jupiter", "Mars/Saturn"],
        ],
        antardasha_order: [
          ["17/07/2010", "17/02/2011", "17/08/2012"],
          ["12/02/2020", "01/03/2021", "05/02/2022", "15/03/2023"],
        ],
      },
    },
    sadeSatiTable: {
      response: [
        {
          type: "Sade Sati",
          direction: "Setting",
          start_date: "02/11/2014",
          end_date: "26/01/2017",
        },
        {
          type: "Sade Sati",
          direction: "Rising",
          start_date: "29/03/2025",
          end_date: "03/06/2027",
        },
      ],
    },
    numerology: {
      response: {
        destiny: { number: "5" },
        personality: { number: "8" },
        attitude: { number: "7" },
        character: { number: "3" },
        soul: { number: "2" },
        purpose: { number: "6" },
      },
    },
    divisionalD9: includeDivisionals
      ? { response: { "0": { name: "As", zodiac: "Leo", house: 1 } } }
      : null,
    divisionalD10: includeDivisionals
      ? { response: { "0": { name: "As", zodiac: "Capricorn", house: 1 } } }
      : null,
    divisionalD30: includeDivisionals
      ? { response: { "0": { name: "As", zodiac: "Libra", house: 1 } } }
      : null,
    moonBoundaryCheck: options?.moonCrossed
      ? {
          midnightPlanets: basePlanets,
          endOfDayPlanets: {
            response: {
              "2": {
                name: "Mo",
                full_name: "Moon",
                zodiac: "Taurus",
                rasi_no: 2,
                nakshatra: "Krittika",
              },
            },
          },
        }
      : null,
  };
}

export function makeChartBundleResult(
  precisionMode: "exact" | "approx_window" | "date_only" = "exact"
): ChartBundleResult {
  const isExact = precisionMode === "exact";
  const effectiveTob =
    precisionMode === "date_only"
      ? "12:00"
      : precisionMode === "approx_window"
        ? "09:00"
        : "20:54";
  const raw = makeRawAstroBundle({ includeDivisionals: isExact });
  const normalizedChartJson = normalizeAstroBundle({
    raw,
    dobIso: "1989-09-17",
    effectiveTob,
    precisionMode,
    moonBoundaryFlag: false,
  });

  return {
    dobIso: "1989-09-17",
    dobFormatted: "17/09/1989",
    effectiveTob,
    precisionMode,
    moonBoundaryFlag: false,
    rawAstroJson: raw,
    normalizedChartJson,
    apiCallsMade: isExact ? 8 : precisionMode === "date_only" ? 7 : 5,
  };
}

export function makeChandanExactChart(): ChartBundleResult {
  const base = makeChartBundleResult("exact");
  const fullPlanets = [
    {
      code: "As",
      name: "Ascendant",
      zodiac: "Aries",
      rasiNo: 1,
      house: 1,
      localDegree: 14.2,
      nakshatra: "Bharani",
      nakshatraLord: "Venus",
      nakshatraPada: 1,
      retro: false,
    },
    {
      code: "Mo",
      name: "Moon",
      zodiac: "Aries",
      rasiNo: 1,
      house: 1,
      localDegree: 18.4,
      nakshatra: "Bharani",
      nakshatraLord: "Venus",
      nakshatraPada: 2,
      retro: false,
    },
    {
      code: "Su",
      name: "Sun",
      zodiac: "Virgo",
      rasiNo: 6,
      house: 6,
      localDegree: 1.5,
      nakshatra: "Uttara Phalguni",
      nakshatraLord: "Sun",
      nakshatraPada: 2,
      retro: false,
    },
    {
      code: "Ma",
      name: "Mars",
      zodiac: "Virgo",
      rasiNo: 6,
      house: 6,
      localDegree: 4.1,
      nakshatra: "Uttara Phalguni",
      nakshatraLord: "Sun",
      nakshatraPada: 3,
      retro: false,
    },
    {
      code: "Me",
      name: "Mercury",
      zodiac: "Virgo",
      rasiNo: 6,
      house: 6,
      localDegree: 15.8,
      nakshatra: "Hasta",
      nakshatraLord: "Moon",
      nakshatraPada: 2,
      retro: true,
    },
    {
      code: "Ve",
      name: "Venus",
      zodiac: "Libra",
      rasiNo: 7,
      house: 7,
      localDegree: 11.3,
      nakshatra: "Swati",
      nakshatraLord: "Rahu",
      nakshatraPada: 2,
      retro: false,
    },
    {
      code: "Ju",
      name: "Jupiter",
      zodiac: "Gemini",
      rasiNo: 3,
      house: 3,
      localDegree: 15.2,
      nakshatra: "Ardra",
      nakshatraLord: "Rahu",
      nakshatraPada: 3,
      retro: false,
    },
    {
      code: "Sa",
      name: "Saturn",
      zodiac: "Sagittarius",
      rasiNo: 9,
      house: 9,
      localDegree: 13.8,
      nakshatra: "Purva Ashadha",
      nakshatraLord: "Venus",
      nakshatraPada: 1,
      retro: false,
    },
    {
      code: "Ra",
      name: "Rahu",
      zodiac: "Capricorn",
      rasiNo: 10,
      house: 10,
      localDegree: 29.4,
      nakshatra: "Dhanishta",
      nakshatraLord: "Mars",
      nakshatraPada: 2,
      retro: true,
    },
    {
      code: "Ke",
      name: "Ketu",
      zodiac: "Cancer",
      rasiNo: 4,
      house: 4,
      localDegree: 29.4,
      nakshatra: "Ashlesha",
      nakshatraLord: "Mercury",
      nakshatraPada: 4,
      retro: true,
    },
  ];

  return {
    ...base,
    effectiveTob: "20:56",
    normalizedChartJson: {
      ...base.normalizedChartJson,
      effectiveTob: "20:56",
      corePlacements: {
        ascendant: fullPlanets[0],
        moon: fullPlanets[1],
        sun: fullPlanets[2],
        planets: fullPlanets,
      },
    },
  };
}

export function makeCleanBlueprintPayload(): SynthesizedBlueprintPayload {
  return {
    hook_proof_json: {
      hardReset: {
        primaryYearRange: "2022 – 2023",
        primaryChapterTitle: "The Identity Overhaul & Honesty Test",
        introHook:
          "Between 2022 and 2023, going through the motions stopped working—forcing sharper standards.",
        concreteRealLifeThemes: [
          "A sharp shift from enduring the grind to feeling caged inside conventional boxes—sparking an intense urge to build something genuinely yours.",
          "A truth-serum stretch in close one-on-one bonds where polite autopilot stopped working, forcing sudden detachment, a blunt honesty talk, or a firm boundary.",
        ],
        whatItRewired:
          "You walked out with calm self-respect and zero patience for hollow commitments.",
        secondaryYearWindow: {
          yearRange: "2020 – 2021",
          chapterTitle: "The Heavy Career & Home Squeeze",
          oneLineSnapshot:
            "Long hours in an under-leveraged role colliding with domestic restlessness and personal pressure.",
        },
        lockedMonthlyTimelineTeaser: {
          totalLockedFlashpoints: 6,
          lockedChaptersSpan: "2014 – 2023",
          previewItems: [
            { id: "fp_2022_01", yearLabel: "2022", title: "The Boiling Point" },
            {
              id: "fp_2022_02",
              yearLabel: "2022",
              title: "The Relationship Truth Serum",
            },
          ],
          paywallCtaLine:
            "Unlock your tight monthly flashpoints and exact upcoming prep months inside the Full Blueprint.",
        },
      },
      relationship: {
        branch: "partnered",
        archetype: "Fiercely Devoted, Guarded Under Fatigue",
        teaserBadge: "1 Core Partner Friction Trigger Detected",
      },
      career: {
        currentPathFitScore: 63,
        fitHeadline: "Great at the job, hungry for something deeper",
        sweetSpotLabel: "Problem-Solver -> Builder of Your Own Thing",
        whyYouAreGood:
          "Honestly, you're the person everyone turns to when things get messy—you spot what's broken and fix it fast.",
        whyItFeelsEmptyOrShifting:
          "You have the grit to crush a tough 9–5, and weirdly that's your trap—you want your effort to belong to you and truly help people.",
        howWorkSeesYou:
          "Inside you think like a builder, while coworkers mostly read you as an indispensable crisis fixer.",
        lockedTeaser: {
          fieldAuditQuestion: "Does Software really fit you?",
          alternativeLanesCount: 4,
          timingYearLabel: "2027",
          paywallCtaLine:
            "Unlock your 3-path score breakdown, hidden alternative lanes, and best months ahead.",
        },
      },
      selfSabotage: {
        loopName: "The Urgency Loop",
        symptomSentence:
          "You mistake emotional tension for an immediate deadline and over-deliver before anyone asks.",
      },
      eras: {
        era1: {
          id: "era1",
          label: "Era 1",
          title: "The Unanchored Climb",
          dateRange: "2009 – 2019",
          summary:
            "You built deep range and resilience by saying yes to demanding rooms.",
        },
        era2: {
          id: "era2",
          label: "Era 2",
          title: "The Structural Reset",
          dateRange: "2019 – 2026",
          summary:
            "Outdated commitments fell away as you sharpened your true standards.",
        },
        era3Preview: {
          title: "The Architecture Cycle",
          dateRange: "Sep 2019 – Sep 2026",
          percentComplete: 64,
        },
      },
      upgrade_hint: null,
    },
    full_blueprint_json: {
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
                  "Impatience with autopilot routines spiked hard, pushing you to reject conventional expectations.",
              },
              {
                id: "fp_2022_02",
                monthRange: "Late Oct – Nov 2022",
                title: "The Relationship Truth Serum",
                realLifeEvent:
                  "Illusions dropped fast in a close bond, forcing a blunt honesty conversation or firm boundary.",
              },
            ],
            howItFeltInside:
              "A racing mind late at night, shorter fuse under small delays, and sprint-and-crash fatigue.",
            whatItRewired:
              "You earned sharp self-respect—just watch the leftover reflex to carry every battle completely alone.",
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
                  "Responsibility piled up under tight constraints while domestic bandwidth shrank.",
              },
              {
                id: "fp_2021_01",
                monthRange: "Sept – Nov 2021",
                title: "Work Bleeding Into Home",
                realLifeEvent:
                  "Daily firefighting spilled into personal life, testing whether your schedule left room to breathe.",
              },
            ],
            howItFeltInside:
              "Quiet mental burnout and replaying unfinished work problems long after closing your laptop.",
            whatItRewired:
              "You proved you stay composed under pressure, while learning not to confuse exhaustion with traction.",
          },
        ],
        corePatternThread:
          "Across both chapters, borrowed obligations fell away so you could trust your own standards and build on solid ground.",
        nextPressureWindow: {
          monthRange: "June – Aug 2027",
          windowTitle: "The Foundation Stress-Test",
          whatToExpect:
            "A grounded accountability checkpoint that rewards whatever cash cushions and clean habits you've locked in.",
          prepMoves: [
            "Keep a steady cash buffer before adding major fixed costs.",
            "Prune low-value commitments early so your top bet gets clean focus.",
            "Protect a firm evening shutdown so sleep and nerves stay steady.",
          ],
        },
      },
      relationship: {
        coreAlignmentProfile:
          "You bond through reliability, clear expectations, and practical follow-through rather than noisy gestures.",
        silentFrictionPattern:
          "When overloaded, you turn hyper-independent and solve tension alone, which a partner can misread as emotional distance.",
        communicationShifts: [
          "State your recovery window explicitly before going quiet after a demanding day.",
          "Separate logistical planning from emotional check-ins each week.",
        ],
        clarityWindow: "Next 6 Months · Grounded Partnership Alignment",
      },
      career: {
        pathComparison: [
          {
            pathKey: "day_job",
            pathLabel: "Sticking Purely to a 9–5",
            fitScore: 60,
            isRecommended: false,
            honestMentorTake:
              "You can crush a demanding role inside a company, and the steady paycheck helps. Over time, though, slow politics quietly wear down your spark.",
          },
          {
            pathKey: "going_solo",
            pathLabel: "Full Solo Leap",
            fitScore: 72,
            isRecommended: false,
            honestMentorTake:
              "You have real drive and client instincts to run your own show. Jumping with zero safety net right now puts extra strain on your nerves.",
          },
          {
            pathKey: "hybrid_side_build",
            pathLabel: "Building on the Side First",
            fitScore: 91,
            isRecommended: true,
            honestMentorTake:
              "Keeping your steady base while shipping a lean side project protects your cash cushion and lets real paying users prove the idea first.",
          },
        ],
        fieldAudit: {
          statedFieldLabel: "Software",
          whatFitsLikeAGlove:
            "You shine when untangling messy systems and turning confusion into clean, dependable setups.",
          whatIsMissing:
            "Too much behind-the-scenes upkeep with too little direct human connection or true ownership.",
          yourBestNextStep:
            "Bridge your problem-solving craft into something people-facing where you guide real humans or own a small focused product.",
        },
        hiddenAlternativeLanes: [
          {
            laneId: "holistic_health_wellness_performance",
            laneName: "Holistic Health & Burnout Coaching",
            whyItFitsYou:
              "Your diagnostic eye fits naturally with helping busy people fix sleep, stress, and daily routines.",
          },
          {
            laneId: "strategy_consulting_turnarounds",
            laneName: "Independent Advisory & Turnarounds",
            whyItFitsYou:
              "You spot bottlenecks fast and can bring calm clarity to teams that feel stuck.",
          },
          {
            laneId: "mentoring_teaching_media",
            laneName: "Coaching, Writing & Practical Education",
            whyItFitsYou:
              "You translate complex topics into warm, plain-English guidance everyday people can use.",
          },
        ],
        perceptionGap: {
          insideYourHead:
            "You think like an independent builder who wants meaningful ownership and honest rooms.",
          whatCoworkersSee:
            "Coworkers often see an intense, ultra-capable crisis fixer who gets impatient with red tape.",
          simpleShiftToTry:
            "Stop quietly volunteering for invisible cleanup—claim one visible outcome and share your thinking calmly.",
        },
        moneyAndLeaks: {
          howMoneyGrowsForYou:
            "Your wealth compounds through durable reputation, repeatable products, and steady long-term trust.",
          quietHabitCostingYou:
            "Over-polishing in private before charging, or staying a year too long in safe under-leveraged roles.",
        },
        next12Months: {
          bigPictureSummary:
            "Treat the next six months as your quiet workshop: protect cash runway and ship small real-world tests.",
          tightMonthlyWindows: [
            {
              id: "cw_01",
              monthRange: "Dec 2026 – Jan 2027",
              windowTitle: "Great Time to Put It Out There",
              practicalGuidance:
                "Your messaging clicks here—ship a simple first version to real users and have warm network chats.",
            },
            {
              id: "cw_02",
              monthRange: "Mar – May 2027",
              windowTitle: "Stay Cool Under Friction",
              practicalGuidance:
                "Slow approvals or workplace friction could test your patience—stay calm, get agreements in writing, and keep building.",
            },
            {
              id: "cw_03",
              monthRange: "June – Aug 2027",
              windowTitle: "Focused Accountability Chapter",
              practicalGuidance:
                "Prune distractions and double down on the one offer showing genuine traction with paying users.",
            },
          ],
          mindBodyPacingTip:
            "Set a hard evening screen shutdown and take a short walk after work so fast sprints don't turn into burnout.",
        },
      },
      selfSabotage: {
        triggerMapLove:
          "When uncertainty lingers, you push for immediate resolution instead of letting trust unfold naturally.",
        triggerMapCareer:
          "You accept tight deadlines and over-polish your work past diminishing returns out of fear of slowing down.",
        antidoteSteps: [
          "Pause 24 hours on non-urgent high-emotion messages before hitting send.",
          "Take 90 seconds of slow nasal exhales before responding to sudden pressure.",
          "Ask whether the deadline is external reality or internal restlessness.",
        ],
      },
      eras: {
        era3Playbook: {
          coreMandate:
            "Build quiet, compounding systems and protect deep-focus execution blocks.",
          doubleDown:
            "Written architecture, selective high-leverage bets, and morning deep work.",
          eliminate:
            "Reactive late-night decisions and low-impact consensus meetings.",
        },
        era4Preview: {
          title: "The Expansion Cycle",
          dateRange: "Sep 2026 – Sep 2044",
          theme:
            "Wider strategic authority and harvesting the systems you are locking in today.",
        },
      },
    },
  };
}
