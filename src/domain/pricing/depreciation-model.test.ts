import { describe, expect, it } from "vitest";
import type { ConfigSpec, MacModel } from "../catalog/mac-model.js";
import { money } from "../market/money.js";
import { bestEstimate, estimateTradein, type DepreciationModel } from "./depreciation-model.js";

const model: MacModel = {
  id: "test",
  family: "MacBook Pro",
  screenSizeInch: 14,
  chip: { family: "M", generation: 3, variant: "" },
  releaseYear: 2023,
  releaseMonth: 11,
  configs: [],
};

const config: ConfigSpec = {
  memoryGB: 24,
  storageGB: 512,
  cpuCores: 8,
  gpuCores: 10,
  price: money(308800, "JPY"),
  isStandard: true,
};

const depreciation: DepreciationModel = {
  initialResidualRate: 0.75,
  monthlyDecayRate: 0.995,
  channels: {
    appleTradeIn: { label: "Apple Trade In", multiplier: 0.75 },
    privateMedian: { label: "Private (median)", multiplier: 0.85 },
    privateHigh: { label: "Private (best)", multiplier: 1.0 },
  },
  conditions: {
    asNew: { label: "As-new", multiplier: 1.0 },
    fair: { label: "Fair", multiplier: 0.7 },
  },
};

describe("estimateTradein", () => {
  it("decays the price over months elapsed", () => {
    const fresh = estimateTradein(model, config, depreciation, {
      condition: "asNew",
      asOf: new Date("2023-11-01"),
    });
    const old = estimateTradein(model, config, depreciation, {
      condition: "asNew",
      asOf: new Date("2026-04-01"),
    });
    const freshBest = bestEstimate(fresh)!.amount.amount;
    const oldBest = bestEstimate(old)!.amount.amount;
    expect(oldBest).toBeLessThan(freshBest);
  });

  it("orders channels: privateHigh > privateMedian > appleTradeIn", () => {
    const estimates = estimateTradein(model, config, depreciation, {
      condition: "asNew",
      asOf: new Date("2026-04-01"),
    });
    const byChannel = Object.fromEntries(estimates.map((e) => [e.channel, e.amount.amount]));
    expect(byChannel.privateHigh).toBeGreaterThan(byChannel.privateMedian);
    expect(byChannel.privateMedian).toBeGreaterThan(byChannel.appleTradeIn);
  });

  it("applies condition multiplier", () => {
    const asNew = estimateTradein(model, config, depreciation, {
      condition: "asNew",
      asOf: new Date("2026-04-01"),
    });
    const fair = estimateTradein(model, config, depreciation, {
      condition: "fair",
      asOf: new Date("2026-04-01"),
    });
    expect(bestEstimate(fair)!.amount.amount).toBeLessThan(bestEstimate(asNew)!.amount.amount);
  });

  it("throws on unknown condition", () => {
    expect(() =>
      estimateTradein(model, config, depreciation, { condition: "broken" }),
    ).toThrow();
  });

  it("returns money in the same currency as the original price", () => {
    const estimates = estimateTradein(model, config, depreciation, { condition: "asNew" });
    for (const e of estimates) {
      expect(e.amount.currency).toBe("JPY");
    }
  });
});
