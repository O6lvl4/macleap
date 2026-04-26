import type { Catalog } from "../../domain/catalog/catalog.js";
import type { CurrentMacBaseline } from "../../domain/catalog/mac-model.js";
import type { MarketRegion } from "../../domain/market/region.js";
import { suggest, type Suggestion, type SuggestOptions } from "../../domain/upgrade/suggestion.js";
import {
  bestEstimate,
  estimateTradein,
  type TradeinEstimate,
} from "../../domain/pricing/depreciation-model.js";
import { findOriginal, type OriginalMatch } from "../../domain/catalog/catalog.js";
import type {
  CatalogRepository,
  DepreciationModelRepository,
  DetectedMac,
  MacDetector,
} from "../ports.js";

export interface PlanUpgradeInput {
  region: MarketRegion;
  options?: SuggestOptions;
  condition?: string;
  asOf?: Date;
}

export interface PlanUpgradeResult {
  detected: DetectedMac;
  baseline: CurrentMacBaseline;
  catalog: Catalog;
  original: OriginalMatch | null;
  estimates: TradeinEstimate[];
  best: TradeinEstimate | null;
  condition: string;
  suggestions: Suggestion[];
}

export async function planUpgradeUseCase(
  deps: {
    detector: MacDetector;
    catalogs: CatalogRepository;
    depreciation: DepreciationModelRepository;
  },
  input: PlanUpgradeInput,
): Promise<PlanUpgradeResult> {
  const detected = await deps.detector.detect();
  const baseline = deps.detector.toBaseline(detected);
  const catalog = await deps.catalogs.load(input.region.code);
  const original = findOriginal(baseline, catalog);
  const condition = input.condition ?? "asNew";

  let estimates: TradeinEstimate[] = [];
  let best: TradeinEstimate | null = null;
  if (original) {
    const depreciation = await deps.depreciation.load(input.region.code);
    estimates = estimateTradein(original.model, original.config, depreciation, {
      condition,
      asOf: input.asOf,
    });
    best = bestEstimate(estimates);
  }

  const suggestions = suggest(baseline, catalog, input.options);

  return {
    detected,
    baseline,
    catalog,
    original,
    estimates,
    best,
    condition,
    suggestions,
  };
}
