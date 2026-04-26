import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { ConfigSpec, MacModel } from "./lineup.js";

export interface ChannelDef {
  label: string;
  multiplier: number;
}

export interface TradeinModel {
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
  amountJPY: number;
}

export async function loadTradeinModel(): Promise<TradeinModel> {
  const here = dirname(fileURLToPath(import.meta.url));
  const dataPath = resolve(here, "..", "data", "tradein-model.json");
  const raw = await readFile(dataPath, "utf-8");
  return JSON.parse(raw) as TradeinModel;
}

function monthsBetween(from: { year: number; month: number }, to: Date): number {
  const fromMonths = from.year * 12 + (from.month - 1);
  const toMonths = to.getFullYear() * 12 + to.getMonth();
  return Math.max(0, toMonths - fromMonths);
}

function roundToThousand(amount: number): number {
  return Math.round(amount / 1000) * 1000;
}

export function estimateTradeIn(
  model: MacModel,
  config: ConfigSpec,
  tradeinModel: TradeinModel,
  options: { condition?: string; asOf?: Date } = {},
): TradeinEstimate[] {
  const condition = options.condition ?? "asNew";
  const conditionDef = tradeinModel.conditions[condition];
  if (!conditionDef) {
    throw new Error(
      `Unknown condition: ${condition}. Available: ${Object.keys(tradeinModel.conditions).join(", ")}`,
    );
  }

  const asOf = options.asOf ?? new Date();
  const months = monthsBetween(
    { year: model.releaseYear, month: model.releaseMonth },
    asOf,
  );

  const baseValue =
    config.priceJPY *
    tradeinModel.initialResidualRate *
    Math.pow(tradeinModel.monthlyDecayRate, months);

  const estimates: TradeinEstimate[] = [];
  for (const [channel, channelDef] of Object.entries(tradeinModel.channels)) {
    estimates.push({
      channel,
      channelLabel: channelDef.label,
      condition,
      conditionLabel: conditionDef.label,
      amountJPY: roundToThousand(baseValue * channelDef.multiplier * conditionDef.multiplier),
    });
  }
  return estimates;
}

export function bestEstimate(estimates: TradeinEstimate[]): TradeinEstimate | null {
  if (estimates.length === 0) return null;
  return estimates.reduce((best, e) => (e.amountJPY > best.amountJPY ? e : best));
}
