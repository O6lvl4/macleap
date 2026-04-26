import type { Catalog } from "../catalog/catalog.js";
import type { ConfigSpec, CurrentMacBaseline, MacModel } from "../catalog/mac-model.js";
import type { Money } from "../market/money.js";
import { isEqualOrBetter, upgradeScore } from "./match.js";

export interface Suggestion {
  model: MacModel;
  config: ConfigSpec;
  reasons: string[];
  upgradeScore: number;
}

export interface SuggestOptions {
  budget?: Money;
  allowSmallerScreen?: boolean;
  maxResults?: number;
}

export function suggest(
  current: CurrentMacBaseline,
  catalog: Catalog,
  options: SuggestOptions = {},
): Suggestion[] {
  const results: Suggestion[] = [];

  for (const model of catalog.current) {
    for (const config of model.configs) {
      if (
        options.budget !== undefined &&
        config.price.currency === options.budget.currency &&
        config.price.amount > options.budget.amount
      ) {
        continue;
      }
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
    if (a.config.price.amount !== b.config.price.amount) {
      return a.config.price.amount - b.config.price.amount;
    }
    return b.upgradeScore - a.upgradeScore;
  });

  if (options.maxResults !== undefined) {
    return results.slice(0, options.maxResults);
  }
  return results;
}
