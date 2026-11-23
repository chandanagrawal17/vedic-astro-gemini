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
  const rawResetRange = normalizedChart.hardResetWindow.dateRange;

  const freePayload: BlueprintFreePayload = {
    ...base.freePayload,
    hardReset: {
      ...base.freePayload.hardReset,
      primaryYearRange: rawResetRange,
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
      nextPressureWindow: {
        ...base.paidPayload.hardReset.nextPressureWindow,
        monthRange: normalizedChart.nextPressureWindow,
      },
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
