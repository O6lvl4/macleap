import type { Money } from "../../../domain/market/money.js";

const FORMATTERS = new Map<string, Intl.NumberFormat>();

const LOCALE_BY_CURRENCY: Record<string, string> = {
  JPY: "ja-JP",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
};

function formatter(currency: string): Intl.NumberFormat {
  const cached = FORMATTERS.get(currency);
  if (cached) return cached;
  const locale = LOCALE_BY_CURRENCY[currency] ?? "en-US";
  const fmt = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  FORMATTERS.set(currency, fmt);
  return fmt;
}

export function formatMoney(m: Money): string {
  return formatter(m.currency).format(m.amount);
}
