import { chipLabel, chipScore } from "../catalog/chip.js";
import type { CurrentMacBaseline, ConfigSpec, MacModel } from "../catalog/mac-model.js";

export interface MatchOptions {
  allowSmallerScreen?: boolean;
}

export interface MatchResult {
  ok: boolean;
  reasons: string[];
}

export function isEqualOrBetter(
  current: CurrentMacBaseline,
  model: MacModel,
  config: ConfigSpec,
  options: MatchOptions = {},
): MatchResult {
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

export function upgradeScore(
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
