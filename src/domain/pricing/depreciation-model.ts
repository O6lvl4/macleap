import type { ConfigSpec, MacModel } from "../catalog/mac-model.js";
import { money, scaleMoney, type Money } from "../market/money.js";

export interface ChannelDef {
  label: string;
  multiplier: number;
}

export interface DepreciationModel {
  initialResidualRate: number;
  monthlyDecayRate: number;
  channels: Record<string, ChannelDef>;
  conditions: Record<string, ChannelDef>;
}

export interface TradeinEstimate {
  channel: string;
  channelLabel: string;
  condition: string;
  conditionLabel: string;
  amount: Money;
}

function monthsBetween(from: { year: number; month: number }, to: Date): number {
  const fromMonths = from.year * 12 + (from.month - 1);
  const toMonths = to.getFullYear() * 12 + to.getMonth();
  return Math.max(0, toMonths - fromMonths);
}

function roundMoneyToThousand(m: Money): Money {
  return money(Math.round(m.amount / 1000) * 1000, m.currency);
}

export function estimateTradein(
  model: MacModel,
  config: ConfigSpec,
  depreciation: DepreciationModel,
  options: { condition?: string; asOf?: Date } = {},
): TradeinEstimate[] {
  const condition = options.condition ?? "asNew";
  const conditionDef = depreciation.conditions[condition];
  if (!conditionDef) {
    throw new Error(
      `Unknown condition: ${condition}. Available: ${Object.keys(depreciation.conditions).join(", ")}`,
    );
  }

  const asOf = options.asOf ?? new Date();
  const months = monthsBetween(
    { year: model.releaseYear, month: model.releaseMonth },
    asOf,
  );
  const baseFactor =
    depreciation.initialResidualRate * Math.pow(depreciation.monthlyDecayRate, months);

  const estimates: TradeinEstimate[] = [];
  for (const [channel, channelDef] of Object.entries(depreciation.channels)) {
    const factor = baseFactor * channelDef.multiplier * conditionDef.multiplier;
    estimates.push({
      channel,
      channelLabel: channelDef.label,
      condition,
      conditionLabel: conditionDef.label,
      amount: roundMoneyToThousand(scaleMoney(config.price, factor)),
    });
  }
  return estimates;
}

export function bestEstimate(estimates: TradeinEstimate[]): TradeinEstimate | null {
  if (estimates.length === 0) return null;
  return estimates.reduce((best, e) => (e.amount.amount > best.amount.amount ? e : best));
}
