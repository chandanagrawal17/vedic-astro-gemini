import { NormalizedChartJson } from "@/lib/astro/types";
import { buildMockBlueprint } from "@/lib/mock/blueprintMock";
import {
  BlueprintFreePayload,
  BlueprintPaidPayload,
  OnboardingInput,
} from "@/lib/types/blueprint";

export function buildSlice2BlueprintPayloads(
  input: OnboardingInput,
  normalizedChart: NormalizedChartJson,
  sessionId: string
): {
  freePayload: BlueprintFreePayload;
  paidPayload: BlueprintPaidPayload;
} {
  const base = buildMockBlueprint(input, sessionId);
  const isExact = normalizedChart.precisionMode === "exact";

  const rawResetRange = normalizedChart.hardResetWindow.dateRange;
  const resetWindow = isExact
    ? rawResetRange
    : `${rawResetRange} (approx.)`;

  const freePayload: BlueprintFreePayload = {
    ...base.freePayload,
    hardReset: {
      ...base.freePayload.hardReset,
      window: resetWindow,
      description: `Between ${resetWindow}, you were forced to dismantle an identity, role, or expectation that looked stable on paper but felt quietly suffocating. You likely carried heavy responsibility behind closed doors while questioning who you were without external validation.`,
    },
    eras: {
      era1: {
        ...base.freePayload.eras.era1,
        dateRange: normalizedChart.eras.era1.dateRange,
      },
      era2: {
        ...base.freePayload.eras.era2,
        dateRange: normalizedChart.eras.era2.dateRange,
      },
      era3Preview: {
        ...base.freePayload.eras.era3Preview,
        dateRange: normalizedChart.eras.era3.dateRange,
        percentComplete:
          normalizedChart.eras.era3.percentComplete ??
          base.freePayload.eras.era3Preview.percentComplete,
      },
    },
  };

  const paidPayload: BlueprintPaidPayload = {
    ...base.paidPayload,
    hardReset: {
      ...base.paidPayload.hardReset,
      deepBreakdown: `Your ${resetWindow} stretch was never meant to be comfortable—it was a compression phase designed to strip away borrowed goals. Every time you tried to rely on charm, speed, or sheer overwork to bypass a bottleneck, the environment forced you to slow down and build real boundaries.`,
      nextPressureWindow: normalizedChart.nextPressureWindow,
    },
    eras: {
      ...base.paidPayload.eras,
      era4Preview: {
        ...base.paidPayload.eras.era4Preview,
        dateRange: normalizedChart.eras.era4.dateRange,
      },
    },
  };

  return { freePayload, paidPayload };
}
