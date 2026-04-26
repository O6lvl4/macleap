import type { Catalog } from "../../domain/catalog/catalog.js";
import type { CurrentMacBaseline } from "../../domain/catalog/mac-model.js";
import type { MarketRegion } from "../../domain/market/region.js";
import { suggest, type Suggestion, type SuggestOptions } from "../../domain/upgrade/suggestion.js";
import type { CatalogRepository, DetectedMac, MacDetector } from "../ports.js";

export interface SuggestUpgradesInput {
  region: MarketRegion;
  options?: SuggestOptions;
}

export interface SuggestUpgradesResult {
  detected: DetectedMac;
  baseline: CurrentMacBaseline;
  catalog: Catalog;
  suggestions: Suggestion[];
}

export async function suggestUpgradesUseCase(
  deps: { detector: MacDetector; catalogs: CatalogRepository },
  input: SuggestUpgradesInput,
): Promise<SuggestUpgradesResult> {
  const detected = await deps.detector.detect();
  const baseline = deps.detector.toBaseline(detected);
  const catalog = await deps.catalogs.load(input.region.code);
  const suggestions = suggest(baseline, catalog, input.options);
  return { detected, baseline, catalog, suggestions };
}
