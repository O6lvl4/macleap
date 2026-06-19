import { money, type Money } from "../../domain/market/money.js";
import type { MarketRegion } from "../../domain/market/region.js";
import type { SuggestOptions } from "../../domain/upgrade/suggestion.js";

export interface CommonFlags {
  json?: boolean;
  region?: string;
}

export interface SuggestFlags extends CommonFlags {
  budget?: string;
  allowSmallerScreen?: boolean;
  limit?: string;
  all?: boolean;
}

export interface TradeinFlags extends CommonFlags {
  condition?: string;
}

export type PlanFlags = SuggestFlags & TradeinFlags;

export interface CatalogFlags extends CommonFlags {
  kind?: string;
}

function parseAmount(value: string): number {
  const n = Number.parseInt(value.replace(/[,_]/g, ""), 10);
  if (Number.isNaN(n)) throw new Error(`Invalid budget value: ${value}`);
  return n;
}

export function parseBudget(value: string | undefined, region: MarketRegion): Money | undefined {
  if (value === undefined) return undefined;
  return money(parseAmount(value), region.defaultCurrency);
}

export function toSuggestOptions(flags: SuggestFlags, region: MarketRegion): SuggestOptions {
  const opts: SuggestOptions = {};
  opts.budget = parseBudget(flags.budget, region);
  opts.allowSmallerScreen = flags.allowSmallerScreen;
  if (flags.all) {
    opts.maxResults = undefined;
  } else if (flags.limit !== undefined) {
    opts.maxResults = Number.parseInt(flags.limit, 10);
  } else {
    opts.maxResults = 10;
  }
  return opts;
}
