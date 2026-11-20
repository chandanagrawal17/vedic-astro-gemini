import {
  ChartBundleResult,
  ChartCalculationInput,
  NormalizedLocation,
} from "@/lib/astro/types";

export interface AstroProvider {
  readonly providerName: string;
  searchLocation(cityQuery: string): Promise<NormalizedLocation[]>;
  fetchChartBundle(input: ChartCalculationInput): Promise<ChartBundleResult>;
}
