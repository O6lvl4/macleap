import { describe, expect, it } from "vitest";
import type { ConfigSpec, CurrentMacBaseline, MacModel } from "../catalog/mac-model.js";
import { money } from "../market/money.js";
import { isEqualOrBetter, upgradeScore } from "./match.js";

const baseline: CurrentMacBaseline = {
  family: "MacBook Pro",
  screenSizeInch: 14,
  chip: { family: "M", generation: 3, variant: "" },
  memoryGB: 24,
  storageGB: 512,
};

function makeConfig(memoryGB: number, storageGB: number): ConfigSpec {
  return {
    memoryGB,
    storageGB,
    cpuCores: 10,
    gpuCores: 10,
    price: money(300000, "JPY"),
    isStandard: true,
  };
}

function makeModel(
  family: MacModel["family"],
  screenSizeInch: number,
  chip: MacModel["chip"],
): MacModel {
  return {
    id: "test",
    family,
    screenSizeInch,
    chip,
    releaseYear: 2026,
    releaseMonth: 3,
    configs: [],
  };
}

describe("isEqualOrBetter", () => {
  it("rejects older chip", () => {
    const model = makeModel("MacBook Pro", 14, { family: "M", generation: 2, variant: "" });
    const result = isEqualOrBetter(baseline, model, makeConfig(24, 512));
    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toContain("chip M2 < M3");
  });

  it("accepts equal chip with more memory", () => {
    const model = makeModel("MacBook Pro", 14, { family: "M", generation: 3, variant: "" });
    const result = isEqualOrBetter(baseline, model, makeConfig(32, 512));
    expect(result.ok).toBe(true);
    expect(result.reasons).toContain("+8GB memory");
  });

  it("rejects less memory", () => {
    const model = makeModel("MacBook Pro", 14, { family: "M", generation: 5, variant: "Pro" });
    const result = isEqualOrBetter(baseline, model, makeConfig(16, 1024));
    expect(result.ok).toBe(false);
  });

  it("rejects smaller screen by default", () => {
    const model = makeModel("MacBook Air", 13, { family: "M", generation: 5, variant: "" });
    const result = isEqualOrBetter(baseline, model, makeConfig(24, 1024));
    expect(result.ok).toBe(false);
    expect(result.reasons[0]).toContain("screen 13");
  });

  it("allows smaller screen when option set", () => {
    const model = makeModel("MacBook Air", 13, { family: "M", generation: 5, variant: "" });
    const result = isEqualOrBetter(baseline, model, makeConfig(24, 1024), {
      allowSmallerScreen: true,
    });
    expect(result.ok).toBe(true);
  });

  it("reports chip upgrade and storage upgrade together", () => {
    const model = makeModel("MacBook Pro", 14, { family: "M", generation: 5, variant: "Pro" });
    const result = isEqualOrBetter(baseline, model, makeConfig(24, 1024));
    expect(result.ok).toBe(true);
    expect(result.reasons).toContain("chip M5 Pro > M3");
    expect(result.reasons).toContain("+512GB storage");
  });
});

describe("upgradeScore", () => {
  it("scores chip jump higher than storage jump", () => {
    const m5pro = makeModel("MacBook Pro", 14, { family: "M", generation: 5, variant: "Pro" });
    const m3same = makeModel("MacBook Pro", 14, { family: "M", generation: 3, variant: "" });
    expect(upgradeScore(baseline, m5pro, makeConfig(24, 512))).toBeGreaterThan(
      upgradeScore(baseline, m3same, makeConfig(24, 2048)),
    );
  });
});
