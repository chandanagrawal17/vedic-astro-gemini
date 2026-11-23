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

export function makeCleanBlueprintPayload(): SynthesizedBlueprintPayload {
  return {
    hook_proof_json: {
      hardReset: {
        window: "2014 – 2017",
        chapterLabel: "The Structural Stripping",
        description:
          "Between 2014 and 2017, borrowed expectations fell away so you could build real internal authority. You carried quiet pressure behind closed doors while recalibrating what success actually meant.",
      },
      relationship: {
        branch: "partnered",
        archetype: "Fiercely Devoted, Guarded Under Fatigue",
        teaserBadge: "1 Core Partner Friction Trigger Detected",
      },
      career: {
        alignmentScore: 74,
        subtitle: "High Stamina, Strategic",
        idealModePill: "Systems Architect",
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
        deepBreakdown:
          "That multi-year compression phase forced you to replace external approval with durable personal systems and boundaries.",
        resilienceBuilt:
          "You gained calm composure under pressure and stopped confusing constant motion with genuine traction.",
        nextPressureWindow: "2025 – 2027",
        preparationNote:
          "Document your operating rules now so upcoming responsibilities amplify your leverage instead of draining your bandwidth.",
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
        verdictBadge: "Hybrid Builder -> Autonomous Lead",
        jobVsBusinessVerdict:
          "You thrive where you own strategic architecture and measurable outcomes rather than navigating pure bureaucracy.",
        currentFieldMatch:
          "In Software Engineering, your natural edge shines in turning ambiguous technical debt into crisp, repeatable systems.",
        dutyVsPurposeGap:
          "Protect dedicated strategy hours each week so routine execution never crowds out long-term ownership.",
        timingPosture:
          "Consolidate leverage and raise your strategic scope in place over the next 12 months before any major transition.",
      },
      selfSabotage: {
        triggerMapLove:
          "When uncertainty lingers, you push for immediate resolution instead of letting trust unfold naturally.",
        triggerMapCareer:
          "You accept tight deadlines and over-polish deliverables past diminishing returns out of fear of slowing down.",
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
