import { findOriginal, type OriginalMatch } from "../../domain/catalog/catalog.js";
import type { CurrentMacBaseline } from "../../domain/catalog/mac-model.js";
import type { MarketRegion } from "../../domain/market/region.js";
import {
  bestEstimate,
  estimateTradein,
  type TradeinEstimate,
} from "../../domain/pricing/depreciation-model.js";
import type {
  CatalogRepository,
  DepreciationModelRepository,
  DetectedMac,
  MacDetector,
} from "../ports.js";

export interface EstimateTradeinInput {
  region: MarketRegion;
  condition?: string;
  asOf?: Date;
}

export interface EstimateTradeinResult {
  detected: DetectedMac;
  baseline: CurrentMacBaseline;
  original: OriginalMatch | null;
  estimates: TradeinEstimate[];
  best: TradeinEstimate | null;
  condition: string;
}

export async function estimateTradeinUseCase(
  deps: {
    detector: MacDetector;
    catalogs: CatalogRepository;
    depreciation: DepreciationModelRepository;
  },
  input: EstimateTradeinInput,
): Promise<EstimateTradeinResult> {
  const detected = await deps.detector.detect();
  const baseline = deps.detector.toBaseline(detected);
  const catalog = await deps.catalogs.load(input.region.code);
  const original = findOriginal(baseline, catalog);
  const condition = input.condition ?? "asNew";

  if (!original) {
    return { detected, baseline, original: null, estimates: [], best: null, condition };
  }

  const depreciation = await deps.depreciation.load(input.region.code);
  const estimates = estimateTradein(original.model, original.config, depreciation, {
    condition,
    asOf: input.asOf,
  });
  return {
    detected,
    baseline,
    original,
    estimates,
    best: bestEstimate(estimates),
    condition,
  };
}
