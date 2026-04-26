import { describe, expect, it } from "vitest";
import { addMoney, money, scaleMoney, subMoney } from "./money.js";

describe("Money", () => {
  it("adds same-currency money", () => {
    expect(addMoney(money(100, "JPY"), money(50, "JPY"))).toEqual(money(150, "JPY"));
  });
  it("subtracts same-currency money", () => {
    expect(subMoney(money(100, "JPY"), money(30, "JPY"))).toEqual(money(70, "JPY"));
  });
  it("rejects mixed currency addition", () => {
    expect(() => addMoney(money(100, "JPY"), money(1, "USD"))).toThrow();
  });
  it("scales and rounds", () => {
    expect(scaleMoney(money(1000, "JPY"), 0.333)).toEqual(money(333, "JPY"));
  });
});
