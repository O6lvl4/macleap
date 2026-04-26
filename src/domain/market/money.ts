import type { Brand } from "../../shared/brand.js";

export type CurrencyCode = Brand<string, "CurrencyCode">;

export interface Money {
  readonly amount: number;
  readonly currency: CurrencyCode;
}

export function money(amount: number, currency: string): Money {
  return { amount, currency: currency as CurrencyCode };
}

export function currencyCode(code: string): CurrencyCode {
  return code as CurrencyCode;
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add ${a.currency} and ${b.currency}`);
  }
  return { amount: a.amount + b.amount, currency: a.currency };
}

export function subMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot subtract ${a.currency} and ${b.currency}`);
  }
  return { amount: a.amount - b.amount, currency: a.currency };
}

export function scaleMoney(m: Money, factor: number): Money {
  return { amount: Math.round(m.amount * factor), currency: m.currency };
}

export function compareMoney(a: Money, b: Money): number {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot compare ${a.currency} and ${b.currency}`);
  }
  return a.amount - b.amount;
}
