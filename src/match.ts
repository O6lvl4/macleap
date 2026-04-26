import type { ChipSpec, ConfigSpec, Family, Lineup, MacModel } from "./lineup.js";
import { chipLabel, chipScore } from "./lineup.js";

export interface CurrentMacBaseline {
  family: Family;
  screenSizeInch: number;
  chip: ChipSpec;
  memoryGB: number;
  storageGB: number;
}

export interface Suggestion {
  model: MacModel;
  config: ConfigSpec;
  reasons: string[];
  upgradeScore: number;
}

export interface SuggestOptions {
  budgetJPY?: number;
  allowSmallerScreen?: boolean;
  maxResults?: number;
}

export function isEqualOrBetter(
  current: CurrentMacBaseline,
  model: MacModel,
  config: ConfigSpec,
  options: { allowSmallerScreen?: boolean } = {},
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];

  const currentScore = chipScore(current.chip);
  const candidateScore = chipScore(model.chip);
  if (candidateScore < currentScore) {
    return { ok: false, reasons: [`chip ${chipLabel(model.chip)} < ${chipLabel(current.chip)}`] };
  }
  if (candidateScore > currentScore) {
    reasons.push(`chip ${chipLabel(model.chip)} > ${chipLabel(current.chip)}`);
  } else {
    reasons.push(`chip same generation`);
  }

  if (config.memoryGB < current.memoryGB) {
    return { ok: false, reasons: [`memory ${config.memoryGB}GB < ${current.memoryGB}GB`] };
  }
  if (config.memoryGB > current.memoryGB) {
    reasons.push(`+${config.memoryGB - current.memoryGB}GB memory`);
  }

  if (config.storageGB < current.storageGB) {
    return { ok: false, reasons: [`storage ${config.storageGB}GB < ${current.storageGB}GB`] };
  }
  if (config.storageGB > current.storageGB) {
    reasons.push(`+${config.storageGB - current.storageGB}GB storage`);
  }

  if (!options.allowSmallerScreen && model.screenSizeInch < current.screenSizeInch) {
    return {
      ok: false,
      reasons: [`screen ${model.screenSizeInch}" < ${current.screenSizeInch}"`],
    };
  }
  if (model.screenSizeInch > current.screenSizeInch) {
    reasons.push(`+${model.screenSizeInch - current.screenSizeInch}" screen`);
  }

  return { ok: true, reasons };
}

function upgradeScore(
  current: CurrentMacBaseline,
  model: MacModel,
  config: ConfigSpec,
): number {
  const chipDelta = chipScore(model.chip) - chipScore(current.chip);
  const memDelta = config.memoryGB - current.memoryGB;
  const storageDelta = (config.storageGB - current.storageGB) / 256;
  const screenDelta = model.screenSizeInch - current.screenSizeInch;
  return chipDelta * 5 + memDelta * 2 + storageDelta * 1 + screenDelta * 3;
}

export function suggest(
  current: CurrentMacBaseline,
  lineup: Lineup,
  options: SuggestOptions = {},
): Suggestion[] {
  const results: Suggestion[] = [];

  for (const model of lineup.models) {
    for (const config of model.configs) {
      if (options.budgetJPY !== undefined && config.priceJPY > options.budgetJPY) continue;
      const check = isEqualOrBetter(current, model, config, {
        allowSmallerScreen: options.allowSmallerScreen,
      });
      if (!check.ok) continue;
      results.push({
        model,
        config,
        reasons: check.reasons,
        upgradeScore: upgradeScore(current, model, config),
      });
    }
  }

  results.sort((a, b) => {
    if (a.config.priceJPY !== b.config.priceJPY) return a.config.priceJPY - b.config.priceJPY;
    return b.upgradeScore - a.upgradeScore;
  });

  if (options.maxResults !== undefined) {
    return results.slice(0, options.maxResults);
  }
  return results;
}
