import { describe, expect, it } from "vitest";
import { chipLabel, chipScore, chipsEqual } from "./chip.js";

describe("chipScore", () => {
  it("ranks M-series above A-series", () => {
    expect(chipScore({ family: "M", generation: 1, variant: "" })).toBeGreaterThan(
      chipScore({ family: "A", generation: 18, variant: "Pro" }),
    );
  });

  it("ranks higher generation above lower", () => {
    expect(chipScore({ family: "M", generation: 5, variant: "" })).toBeGreaterThan(
      chipScore({ family: "M", generation: 3, variant: "" }),
    );
  });

  it("ranks Max above Pro above plain within the same generation", () => {
    const base = { family: "M" as const, generation: 5 };
    expect(chipScore({ ...base, variant: "Max" })).toBeGreaterThan(
      chipScore({ ...base, variant: "Pro" }),
    );
    expect(chipScore({ ...base, variant: "Pro" })).toBeGreaterThan(
      chipScore({ ...base, variant: "" }),
    );
  });
});

describe("chipLabel", () => {
  it("formats plain chip without variant", () => {
    expect(chipLabel({ family: "M", generation: 3, variant: "" })).toBe("M3");
  });
  it("formats chip with variant", () => {
    expect(chipLabel({ family: "M", generation: 5, variant: "Pro" })).toBe("M5 Pro");
  });
});

describe("chipsEqual", () => {
  it("matches identical chips", () => {
    expect(
      chipsEqual(
        { family: "M", generation: 3, variant: "" },
        { family: "M", generation: 3, variant: "" },
      ),
    ).toBe(true);
  });
  it("differentiates variants", () => {
    expect(
      chipsEqual(
        { family: "M", generation: 3, variant: "" },
        { family: "M", generation: 3, variant: "Pro" },
      ),
    ).toBe(false);
  });
});
