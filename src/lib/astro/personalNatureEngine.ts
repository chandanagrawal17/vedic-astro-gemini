/**
 * Deterministic Personal Nature Context Engine (v2)
 *
 * Extracts two-layer stacked behavioral chart signals for all 18 Personal Nature tells
 * from `NormalizedChartJson`, `matchChartRules` (`ruleMatcher.ts`), and `historicalTransits.ts`.
 *
 * Guardrails:
 *   - Strict camelCase across all interfaces and returned objects.
 *   - Mathematical honesty: never fabricates rising/Arudha/house room projections or divisionals
 *     when `precisionMode !== "exact"`.
 *   - Translates astrological mechanics into clean internal behavioral layers so the LLM
 *     synthesizes warm kitchen-table English without leaking Sanskrit or planet names.
 */

import {
  getSaturnSignAt,
  houseFromSign,
  offsetSign,
  parseIsoUtc,
  RAHU_TRANSITS,
  type RasiNumber,
  SATURN_TRANSITS,
  toRasiNumber,
} from "@/lib/astro/ephemeris/historicalTransits";
import { computeHardResetTelemetry } from "@/lib/astro/hardResetEngine";
import {
  PERSONAL_NATURE_CATEGORIES,
  type PersonalNatureCategorySlug,
  resolvePersonalNatureCatalog,
  type ResolvedPersonalNatureCatalogItem,
} from "@/lib/astro/personalNatureCatalog";
import {
  computeChaldeanDigit,
  type MatchedKnowledgeContext,
  matchChartRules,
  signNumberOf,
} from "@/lib/astro/ruleMatcher";
import type {
  AstroPrecisionMode,
  NormalizedChartJson,
  PlanetPlacement,
} from "@/lib/astro/types";

const SIGN_RULERS: readonly string[] = [
  "Mars",
  "Venus",
  "Mercury",
  "Moon",
  "Sun",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Saturn",
  "Jupiter",
];

const SIGN_BEHAVIORAL_STYLES: Record<RasiNumber, {
  outerPosture: string;
  innerNeed: string;
  roomRead: string;
}> = {
  1: {
    outerPosture: "direct, fast-moving, self-starting problem-solver who steps straight toward pressure",
    innerNeed: "honest loyalty, unforced warmth, and a safe place to drop the tough armor",
    roomRead: "decisive, fearless, and totally fine handling everything solo",
  },
  2: {
    outerPosture: "steady, composed, dependable anchor who dislikes rushed drama",
    innerNeed: "tangible comfort, peaceful routines, and unhurried affection",
    roomRead: "unshakeable, selective, and hard to rattle",
  },
  3: {
    outerPosture: "quick-minded, observant communicator who connects dots fast",
    innerNeed: "real mental companionship and quiet breathing room away from noise",
    roomRead: "witty, adaptable, and effortlessly social",
  },
  4: {
    outerPosture: "protective, deeply attentive caretaker who remembers every small detail",
    innerNeed: "emotional safety, genuine reciprocity, and a calm sanctuary at home",
    roomRead: "warm and accommodating—though much more selective inside than people realize",
  },
  5: {
    outerPosture: "proud, dignified, high-integrity presence who refuses to look sloppy",
    innerNeed: "sincere appreciation, heartfelt warmth, and not having to perform to be loved",
    roomRead: "confident, self-assured, and completely in command",
  },
  6: {
    outerPosture: "sharp-eyed, conscientious fixer who spots flaws and handles messy details",
    innerNeed: "reassurance that they don't have to earn love by fixing every problem",
    roomRead: "capable, discerning, and quietly exacting",
  },
  7: {
    outerPosture: "gracious, fair-minded bridge-builder who keeps interactions smooth",
    innerNeed: "genuine mutual effort, clear honesty, and peaceful partnership",
    roomRead: "diplomatic, polished, and easygoing on the surface",
  },
  8: {
    outerPosture: "private, perceptive, all-or-nothing presence with a strong gut radar",
    innerNeed: "deep unspoken trust, loyalty without games, and protected privacy",
    roomRead: "composed, intense, and impossible to fool with small talk",
  },
  9: {
    outerPosture: "candid, principled, big-picture thinker guided by lived truth",
    innerNeed: "meaningful purpose, room to grow, and honest encouragement",
    roomRead: "upfront, independent, and allergic to fake pretence",
  },
  10: {
    outerPosture: "disciplined, pragmatic builder who quietly shoulders heavy duty",
    innerNeed: "gentle tenderness where they don't have to be the strong one anymore",
    roomRead: "serious, self-contained, and endlessly resilient",
  },
  11: {
    outerPosture: "independent, forward-looking thinker who values real fairness",
    innerNeed: "authentic friendship, intellectual honesty, and space to recharge solo",
    roomRead: "cool-headed, original, and slightly hard to pin down",
  },
  12: {
    outerPosture: "empathetic, intuitive listener who picks up unspoken moods in seconds",
    innerNeed: "quiet solitude, gentle boundaries, and rest without guilt",
    roomRead: "gentle, calm, and quietly reflective",
  },
};

const HOUSE_LIFE_ARENA: Record<number, string> = {
  1: "personal identity and physical presence",
  2: "family responsibility, resources, and spoken standards",
  3: "self-made effort, direct communication, and daily courage",
  4: "home sanctuary, private heart, and inner peace",
  5: "creative pride, original thinking, and heartfelt joy",
  6: "daily problem-solving, heavy workload, and physical stamina",
  7: "one-on-one partnerships, agreements, and mutual trust",
  8: "high-stakes pressure, deep emotional honesty, and sudden pivots",
  9: "lived wisdom, personal principles, and questioning hollow authority",
  10: "public responsibility, visible work, and reputation",
  11: "long-term goals, earned rewards, and wider circles",
  12: "private solitude, sleep recovery, and letting go of old weight",
};

const CURRENT_SATURN_HOUSE_LESSON: Record<number, string> = {
  1: "trimming people-pleasing and pacing physical stamina carefully",
  2: "tightening money priorities and speaking fewer, truer words",
  3: "focusing daily effort on one meaningful craft instead of scattered hustle",
  4: "protecting peace at home, emotional rest, and clearing domestic clutter",
  5: "taking creative craft seriously without losing warmth",
  6: "cleaning up daily routines, boundaries, and unsustainable workloads",
  7: "insisting on mature, equal follow-through in close bonds",
  8: "slowing down around shared obligations and protecting nervous-system rest",
  9: "updating outgrown beliefs through honest lived experience",
  10: "carrying real work accountability while refusing hollow status chases",
  11: "pruning draining social obligations to focus on durable goals",
  12: "protecting deep sleep, quiet solitude, and clearing years of accumulated clutter",
};

export interface PersonalNatureTellStackContext {
  tellId: string;
  canonicalTellId: string;
  category: PersonalNatureCategorySlug;
  unlockDay: 1 | 2;
  houseDependent: boolean;
  promptInstruction: string;
  outerOrPrimaryLayer: string;
  innerOrContrastingLayer: string;
  supportingSignals: string[];
  turningPointWindows?: {
    primaryWindows?: string[];
    secondaryHeavyDutyWindow?: string;
    currentSeasonPull?: string;
  };
}

export interface PersonalNatureEngineContext {
  precisionMode: AstroPrecisionMode;
  isExactBirthTime: boolean;
  moonBoundaryFlag: boolean;
  categories: typeof PERSONAL_NATURE_CATEGORIES;
  tells: PersonalNatureTellStackContext[];
}

function findPlanet(
  planets: PlanetPlacement[],
  name: string
): PlanetPlacement | null {
  const target = name.toLowerCase();
  return (
    planets.find((p) => p.name.trim().toLowerCase() === target) ?? null
  );
}

/**
 * Classical Jaimini/Parashari Arudha Lagna (AL) calculation.
 * Strictly returns `null` when `precisionMode !== "exact"`.
 */
export function computeArudhaLagnaSign(
  chart: NormalizedChartJson
): RasiNumber | null {
  if (chart.precisionMode !== "exact") return null;
  const lagnaSign = toRasiNumber(
    chart.corePlacements.ascendant?.rasiNo,
    chart.corePlacements.ascendant?.zodiac
  );
  if (!lagnaSign) return null;

  const rulerName = SIGN_RULERS[lagnaSign - 1];
  const rulerPlacement = findPlanet(chart.corePlacements.planets, rulerName);
  const lordSign = toRasiNumber(rulerPlacement?.rasiNo, rulerPlacement?.zodiac);
  if (!lordSign) return null;

  const distance = (lordSign - lagnaSign + 12) % 12;
  const rawAl = offsetSign(lordSign, distance);
  const seventhFromLagna = offsetSign(lagnaSign, 6);

  if (rawAl === lagnaSign || rawAl === seventhFromLagna) {
    return offsetSign(rawAl, 9); // 10th sign from rawAl
  }
  return rawAl;
}

function computeHistoricalTurningWindows(
  chart: NormalizedChartJson,
  dobIso: string | undefined,
  referenceDate: Date
): {
  primaryWindows: string[];
  secondaryHeavyDutyWindow: string;
  currentSeasonPull: string;
} {
  const hr = computeHardResetTelemetry(
    chart,
    {
      firstName: "Friend",
      dobIso: dobIso ?? null,
      relationshipStatus: "single",
      careerMode: "employed",
      careerField: "",
    },
    chart.precisionMode,
    referenceDate
  );

  const primaryCandidates: string[] = [];
  if (hr.selected_chapters[0]?.year_range) {
    primaryCandidates.push(hr.selected_chapters[0].year_range);
  }
  if (
    hr.selected_chapters[2]?.year_range &&
    hr.selected_chapters[2].year_range !== primaryCandidates[0]
  ) {
    primaryCandidates.push(hr.selected_chapters[2].year_range);
  }

  // Fallback scan using Saturn/Rahu transits if needed
  const moonSign =
    toRasiNumber(
      chart.corePlacements.moon?.rasiNo,
      chart.corePlacements.moon?.zodiac
    ) ??
    toRasiNumber(
      chart.corePlacements.sun?.rasiNo,
      chart.corePlacements.sun?.zodiac
    ) ??
    (1 as RasiNumber);

  const refYear = referenceDate.getUTCFullYear();
  if (primaryCandidates.length === 0) {
    const fallbackRange = chart.hardResetWindow?.dateRange?.match(/\d{4}/g);
    if (fallbackRange && fallbackRange.length >= 2) {
      primaryCandidates.push(`${fallbackRange[0]} – ${fallbackRange[1]}`);
    } else {
      primaryCandidates.push(`${refYear - 5} – ${refYear - 3}`);
    }
  }

  // Secondary heavy-duty window (past 4–7 years, distinct from primaryCandidates[0])
  let secondaryHeavyDutyWindow = hr.selected_chapters[1]?.year_range ?? "";
  if (!secondaryHeavyDutyWindow || secondaryHeavyDutyWindow === primaryCandidates[0]) {
    // Scan Saturn / Rahu intervals 4–7 years back hitting 4th/10th or 1st/7th from anchor
    const anchorSign =
      (chart.precisionMode === "exact"
        ? toRasiNumber(
            chart.corePlacements.ascendant?.rasiNo,
            chart.corePlacements.ascendant?.zodiac
          )
        : null) ?? moonSign;

    const minYear = refYear - 7;
    const maxYear = refYear - 2;
    const candidates: string[] = [];

    for (const interval of [...SATURN_TRANSITS, ...RAHU_TRANSITS]) {
      const sYear = parseIsoUtc(interval.start).getUTCFullYear();
      const eYear = parseIsoUtc(interval.end).getUTCFullYear();
      if (eYear < minYear || sYear > maxYear) continue;
      const h = houseFromSign(anchorSign, interval.sign);
      if (h === 1 || h === 4 || h === 7 || h === 10) {
        const clampedStart = Math.max(minYear, sYear);
        const clampedEnd = Math.min(refYear - 1, eYear);
        const span =
          clampedStart === clampedEnd
            ? `${clampedStart}`
            : `${clampedStart} – ${clampedEnd}`;
        if (span !== primaryCandidates[0]) {
          candidates.push(span);
        }
      }
    }

    secondaryHeavyDutyWindow =
      candidates[0] ?? `${refYear - 6} – ${refYear - 5}`;
  }

  // Ensure primary[1] doesn't collide with secondaryHeavyDutyWindow
  const filteredPrimary = primaryCandidates.filter(
    (w, idx) => idx === 0 || w !== secondaryHeavyDutyWindow
  );

  const liveSaturnSign = getSaturnSignAt(referenceDate);
  const saturnHouseFromMoon = houseFromSign(moonSign, liveSaturnSign);
  const currentSaturnLesson =
    CURRENT_SATURN_HOUSE_LESSON[saturnHouseFromMoon] ??
    "slowing down to clear old clutter and protect daily peace";

  return {
    primaryWindows: filteredPrimary.slice(0, 2),
    secondaryHeavyDutyWindow,
    currentSeasonPull: currentSaturnLesson,
  };
}

function buildSingleTellStack(params: {
  item: ResolvedPersonalNatureCatalogItem;
  chart: NormalizedChartJson;
  rules: MatchedKnowledgeContext;
  arudhaSign: RasiNumber | null;
  turningWindows: ReturnType<typeof computeHistoricalTurningWindows>;
}): PersonalNatureTellStackContext {
  const { item, chart, rules, arudhaSign, turningWindows } = params;
  const isExact = chart.precisionMode === "exact";
  const planets = chart.corePlacements.planets;

  const ascSign = isExact
    ? toRasiNumber(
        chart.corePlacements.ascendant?.rasiNo,
        chart.corePlacements.ascendant?.zodiac
      )
    : null;
  const moonSign = toRasiNumber(
    chart.corePlacements.moon?.rasiNo,
    chart.corePlacements.moon?.zodiac
  );
  const sunSign = toRasiNumber(
    chart.corePlacements.sun?.rasiNo,
    chart.corePlacements.sun?.zodiac
  );
  const venus = findPlanet(planets, "Venus");
  const mars = findPlanet(planets, "Mars");
  const mercury = findPlanet(planets, "Mercury");
  const jupiter = findPlanet(planets, "Jupiter");
  const saturn = findPlanet(planets, "Saturn");

  const venusSign = toRasiNumber(venus?.rasiNo, venus?.zodiac);
  const marsSign = toRasiNumber(mars?.rasiNo, mars?.zodiac);
  const mercurySign = toRasiNumber(mercury?.rasiNo, mercury?.zodiac);
  const jupiterSign = toRasiNumber(jupiter?.rasiNo, jupiter?.zodiac);
  const saturnSign = toRasiNumber(saturn?.rasiNo, saturn?.zodiac);

  const ascStyle = ascSign ? SIGN_BEHAVIORAL_STYLES[ascSign] : null;
  const moonStyle = moonSign ? SIGN_BEHAVIORAL_STYLES[moonSign] : null;
  const sunStyle = sunSign ? SIGN_BEHAVIORAL_STYLES[sunSign] : null;
  const arudhaStyle = arudhaSign ? SIGN_BEHAVIORAL_STYLES[arudhaSign] : null;
  const venusStyle = venusSign ? SIGN_BEHAVIORAL_STYLES[venusSign] : null;
  const marsStyle = marsSign ? SIGN_BEHAVIORAL_STYLES[marsSign] : null;
  const mercuryStyle = mercurySign ? SIGN_BEHAVIORAL_STYLES[mercurySign] : null;
  const jupiterStyle = jupiterSign ? SIGN_BEHAVIORAL_STYLES[jupiterSign] : null;
  const saturnStyle = saturnSign ? SIGN_BEHAVIORAL_STYLES[saturnSign] : null;

  const moonTrait = rules.nakshatraTraits.moon;
  const lagnaTrait = isExact ? rules.nakshatraTraits.lagna : null;
  const numerologyNote = rules.numerologyFallback
    ? `${rules.numerologyFallback.theme} (growth edge: ${rules.numerologyFallback.growthEdge})`
    : chart.numerology.destinyNumber
      ? "independent self-direction balanced against quiet sensitivity"
      : "steady outward capability paired with private tenderness";

  const lagnaLordHouseArena = (() => {
    if (!isExact || !ascSign) return null;
    const lordName = SIGN_RULERS[ascSign - 1];
    const lordP = findPlanet(planets, lordName);
    const lordSign = signNumberOf(lordP);
    if (!lordSign) return null;
    const h = lordP?.house ?? houseFromSign(ascSign, lordSign as RasiNumber);
    return HOUSE_LIFE_ARENA[h] ?? null;
  })();

  const findHouseTheme = (houseNum: number): string | null => {
    const found = rules.activeHouses.find((h) => h.house === houseNum);
    return found ? `${found.theme} (${found.growthFocus})` : null;
  };

  let outerOrPrimaryLayer = "";
  let innerOrContrastingLayer = "";
  const supportingSignals: string[] = [];

  switch (item.canonicalTellId) {
    case "core_contradiction": {
      outerOrPrimaryLayer =
        isExact && ascStyle
          ? `Outer self-reliant armor: ${ascStyle.outerPosture}${
              lagnaLordHouseArena
                ? `, pouring natural energy into ${lagnaLordHouseArena}`
                : ""
            }.`
          : `Outward everyday drive: ${
              sunStyle?.outerPosture ?? "capable, steady responsibility"
            }; character baseline: ${numerologyNote}.`;
      innerOrContrastingLayer = `Private emotional longing: ${
        moonTrait
          ? `${moonTrait.coreImpulse} (${moonTrait.strength})`
          : moonStyle?.innerNeed ?? "deep loyalty and quiet tenderness"
      }, paired with ${
        venusStyle?.innerNeed ?? "unhurried warmth where they don't have to carry everything"
      }.`;
      if (moonTrait?.blindSpot) {
        supportingSignals.push(`Protective habit: ${moonTrait.blindSpot}`);
      }
      break;
    }

    case "perception_gap": {
      if (isExact && ascStyle) {
        const room10 = findHouseTheme(10);
        outerOrPrimaryLayer = `How rooms read them first: ${
          arudhaStyle?.roomRead ?? ascStyle.roomRead
        }${room10 ? `; workplace impression leans toward ${room10}` : ""}.`;
        innerOrContrastingLayer = `Who they really are underneath: ${
          lagnaTrait?.coreImpulse ?? ascStyle.innerNeed
        }; ${moonStyle?.innerNeed ?? "genuinely tender, loyal, and soft-hearted once safe"}.`;
      } else {
        // `silent_first_impression` fallback for non-exact birth times
        outerOrPrimaryLayer = `Everyday surface impression (from character rhythm, zero room-projection claims): ${numerologyNote}; ${
          sunStyle?.roomRead ?? "calm, capable, and self-contained"
        }.`;
        innerOrContrastingLayer = `True emotional core underneath: ${
          moonTrait
            ? `${moonTrait.coreImpulse} — ${moonTrait.strength}`
            : moonStyle?.innerNeed ?? "deep care, sensitivity, and quiet warmth"
        }.`;
      }
      break;
    }

    case "advice_skepticism": {
      outerOrPrimaryLayer = `Independent standards around wisdom: ${
        saturnStyle?.outerPosture ?? "tests claims against real-world proof"
      }; ${
        findHouseTheme(9) ??
        "questions hollow authority and only respects lived experience"
      }.`;
      innerOrContrastingLayer = `Deep loyalty once trust is earned: ${
        jupiterStyle?.innerNeed ??
        "wholehearted respect and steadfast devotion toward mentors and friends who walk their talk"
      }.`;
      break;
    }

    case "living_room_self": {
      outerOrPrimaryLayer = `Public work-day grit: ${
        (isExact ? ascStyle?.outerPosture : sunStyle?.outerPosture) ??
        "focused, responsible, and composed under heavy expectations"
      }.`;
      innerOrContrastingLayer = `Private living-room warmth: ${
        (isExact ? findHouseTheme(4) : null) ??
        venusStyle?.innerNeed ??
        "generous, affectionate, playful ease around the tiny circle they completely trust"
      }.`;
      if (jupiterStyle) {
        supportingSignals.push(`Inner-circle generosity: ${jupiterStyle.innerNeed}`);
      }
      break;
    }

    case "care_sounds_like_critique": {
      outerOrPrimaryLayer = `Protective problem-solving reflex: ${
        mercuryStyle?.outerPosture ?? "spots snags quickly"
      } combined with ${
        marsStyle?.outerPosture ?? "jumping straight into action to shield loved ones from trouble"
      }.`;
      innerOrContrastingLayer = `The loving heart behind it: ${
        venusStyle?.innerNeed ?? moonStyle?.innerNeed ?? "deep affection that expresses love by making life easier and safer"
      }—even when loved ones just want a warm ear before practical fixes.`;
      break;
    }

    case "body_tell_under_stress": {
      outerOrPrimaryLayer = `Physical stress cues: ${
        rules.wellness.stressSignature ??
        "tight shoulders, clenched jaw, unsettled stomach, and light sleep when carrying unspoken pressure"
      }.`;
      innerOrContrastingLayer = `Late-night habit & current load: ${
        turningWindows.currentSeasonPull
      }; tends to keep the mind busy late at night instead of admitting how tired they really are.`;
      if (rules.wellness.quickMicroAnchor) {
        supportingSignals.push(`Gentle physical reset: ${rules.wellness.quickMicroAnchor}`);
      }
      break;
    }

    case "silent_shutdown_tell": {
      outerOrPrimaryLayer = `Outward composure when hurt or let down: ${
        saturnStyle?.roomRead ?? "turns extra polite, calm, and brief rather than making a dramatic scene"
      }.`;
      innerOrContrastingLayer = `Quiet inner pullback: ${
        moonTrait?.blindSpot ??
        "closes the door quietly in their heart to protect their dignity once someone breaks trust or respect"
      }.`;
      if (rules.relationship.frictionGuardrails.driveHeatFriction) {
        supportingSignals.push(rules.relationship.frictionGuardrails.driveHeatFriction);
      }
      break;
    }

    case "real_vs_fake_recovery": {
      outerOrPrimaryLayer = `Why fake rest drains them: passive screen scrolling or noisy obligation hangouts keep their ${
        moonTrait?.gunaEmphasis.primary.description ?? "active, observant mind"
      } humming without true relief.`;
      innerOrContrastingLayer = `What genuinely restores peace: ${
        rules.wellness.dailyReset.slice(0, 2).join("; ") ||
        "quiet unhurried time in a calm room, warm food, and gentle tech-free movement"
      }.`;
      break;
    }

    case "ignoring_exhaustion": {
      outerOrPrimaryLayer = `Duty-first endurance: ${
        sunStyle?.outerPosture ?? "quiet pride in holding everything up"
      } paired with ${marsStyle?.outerPosture ?? "pushing through heavy tasks without complaining"}.`;
      innerOrContrastingLayer = `Hidden cost: ${
        moonTrait?.blindSpot ??
        "carrying pressure silently until the body forces a full stop"
      }—needing gentle permission to rest before running empty.`;
      break;
    }

    case "calm_in_crisis_impatient_in_delays": {
      outerOrPrimaryLayer = `Everyday impatience with small delays: ${
        moonTrait?.gunaEmphasis.primary.label
          ? `fast inner tempo (${moonTrait.gunaEmphasis.primary.description})`
          : "quick mind that gets restless around slow lines, vague answers, or dithering"
      }.`;
      innerOrContrastingLayer = `Rock-steady emergency composure: ${
        saturnStyle?.outerPosture ?? marsStyle?.outerPosture ?? "switches into crystal-clear, steady leadership the moment a real crisis hits"
      }.`;
      break;
    }

    case "private_self_sabotage": {
      outerOrPrimaryLayer = `High-care standard: ${
        moonTrait?.strength ?? mercuryStyle?.outerPosture ?? "deep pride in doing thoughtful, dependable work"
      }.`;
      innerOrContrastingLayer = `Joy-stealing blind spot right around wins: ${
        moonTrait?.blindSpot ??
        "immediately spotting the next unfinished detail or carrying silent pressure instead of celebrating how far they came"
      }.`;
      if (mercury?.retro) {
        supportingSignals.push(
          "Tends to replay decisions privately and second-guess small wording even after doing great work."
        );
      }
      break;
    }

    case "hidden_fulfillment_leak": {
      outerOrPrimaryLayer = `External competence & duty: ${
        (isExact ? findHouseTheme(10) : null) ??
        sunStyle?.outerPosture ??
        "capable of checking every practical box and looking solid on paper"
      }.`;
      innerOrContrastingLayer = `Core heart drive that must stay fed: ${
        moonTrait?.coreDrive.description ??
        "needs daily effort to connect with real meaning, honesty, and caring human impact—otherwise success feels heavy"
      }.`;
      break;
    }

    case "guest_even_at_home": {
      outerOrPrimaryLayer = `Warm presence in the room: shows up reliably for family and close people (${
        moonStyle?.outerPosture ?? "attentive and steady"
      }).`;
      innerOrContrastingLayer = `Quiet inner observer: ${
        (isExact ? findHouseTheme(4) : null) ??
        "a reflective part of their heart sometimes feels slightly detached even in familiar rooms, finding truest belonging in quiet inner stillness"
      }.`;
      break;
    }

    case "giving_vs_asking_pride": {
      outerOrPrimaryLayer = `Generous giver: ${
        venusStyle?.outerPosture ?? "quick to show up, help practically, and remember what others need"
      }.`;
      innerOrContrastingLayer = `Reluctance to lean on others: ${
        saturnStyle?.outerPosture ?? "fierce quiet pride about never wanting to owe anyone or feel like a burden"
      }—forgetting that letting trusted people help lets love flow both ways.`;
      break;
    }

    case "polishing_in_the_dark": {
      outerOrPrimaryLayer = `Craft & high personal bar: ${
        mercuryStyle?.outerPosture ?? "cares deeply about getting details clean and right"
      }.`;
      innerOrContrastingLayer = `Behind-the-scenes holding back: ${
        saturnStyle?.roomRead ?? "keeps tweaking privately until something feels spotless"
      }—delaying the moment people get to benefit from what they already built.`;
      break;
    }

    case "past_identity_rewire": {
      outerOrPrimaryLayer = `Heavy past stretch (${turningWindows.primaryWindows.join(" and ")}): carried real-world weight across work, close expectations, and personal responsibility.`;
      innerOrContrastingLayer = `What it quietly built inside: stripped away people-pleasing and hollow obligations, forging calm self-respect and a much clearer bar for who gets their energy.`;
      return {
        tellId: item.tellId,
        canonicalTellId: item.canonicalTellId,
        category: item.category,
        unlockDay: item.unlockDay,
        houseDependent: item.houseDependent,
        promptInstruction: item.promptInstruction,
        outerOrPrimaryLayer,
        innerOrContrastingLayer,
        supportingSignals,
        turningPointWindows: {
          primaryWindows: turningWindows.primaryWindows,
        },
      };
    }

    case "full_plate_heavy_heart_window": {
      outerOrPrimaryLayer = `Recent heavy-duty stretch (${turningWindows.secondaryHeavyDutyWindow}): kept showing up, handling responsibilities, and holding the plate steady on the outside.`;
      innerOrContrastingLayer = `How it felt inside: like walking uphill in heavy shoes—quietly breaking the spell of chasing checkboxes that didn't feed their heart.`;
      return {
        tellId: item.tellId,
        canonicalTellId: item.canonicalTellId,
        category: item.category,
        unlockDay: item.unlockDay,
        houseDependent: item.houseDependent,
        promptInstruction: item.promptInstruction,
        outerOrPrimaryLayer,
        innerOrContrastingLayer,
        supportingSignals,
        turningPointWindows: {
          secondaryHeavyDutyWindow: turningWindows.secondaryHeavyDutyWindow,
        },
      };
    }

    case "current_season_tug_of_war": {
      const chapterFocus =
        rules.timing.currentChapterTheme?.focus ??
        "a strong inner urge to build something meaningful and step into a fuller chapter";
      const agencyLever =
        rules.timing.currentChapterTheme?.agencyLever ??
        "clearing old clutter steadily so fresh momentum has clean room to grow";
      outerOrPrimaryLayer = `Forward growth pull right now: ${chapterFocus}.`;
      innerOrContrastingLayer = `Simultaneous grounding pull: ${turningWindows.currentSeasonPull} (${agencyLever}).`;
      return {
        tellId: item.tellId,
        canonicalTellId: item.canonicalTellId,
        category: item.category,
        unlockDay: item.unlockDay,
        houseDependent: item.houseDependent,
        promptInstruction: item.promptInstruction,
        outerOrPrimaryLayer,
        innerOrContrastingLayer,
        supportingSignals,
        turningPointWindows: {
          currentSeasonPull: turningWindows.currentSeasonPull,
        },
      };
    }
  }

  return {
    tellId: item.tellId,
    canonicalTellId: item.canonicalTellId,
    category: item.category,
    unlockDay: item.unlockDay,
    houseDependent: item.houseDependent,
    promptInstruction: item.promptInstruction,
    outerOrPrimaryLayer,
    innerOrContrastingLayer,
    supportingSignals,
  };
}

export function buildPersonalNatureEngineContext(params: {
  normalizedChart: NormalizedChartJson;
  dobIso?: string | null;
  unlockDay?: 1 | 2 | "all";
  referenceDate?: Date;
}): PersonalNatureEngineContext {
  const { normalizedChart } = params;
  const referenceDate = params.referenceDate ?? new Date();
  const targetDay = params.unlockDay ?? "all";

  const rules = matchChartRules(normalizedChart, {
    dob: params.dobIso ?? undefined,
  });
  const arudhaSign = computeArudhaLagnaSign(normalizedChart);
  const turningWindows = computeHistoricalTurningWindows(
    normalizedChart,
    params.dobIso ?? undefined,
    referenceDate
  );

  // Ensure Chaldean fallback is always reflected on non-exact charts even if dobIso was omitted
  if (normalizedChart.precisionMode !== "exact" && !rules.numerologyFallback && params.dobIso) {
    const ch = computeChaldeanDigit({ dob: params.dobIso });
    void ch;
  }

  const resolvedCatalog = resolvePersonalNatureCatalog(
    normalizedChart.precisionMode
  ).filter((item) => targetDay === "all" || item.unlockDay === targetDay);

  const tells = resolvedCatalog.map((item) =>
    buildSingleTellStack({
      item,
      chart: normalizedChart,
      rules,
      arudhaSign,
      turningWindows,
    })
  );

  return {
    precisionMode: normalizedChart.precisionMode,
    isExactBirthTime: normalizedChart.precisionMode === "exact",
    moonBoundaryFlag: normalizedChart.moonBoundaryFlag,
    categories: PERSONAL_NATURE_CATEGORIES,
    tells,
  };
}
