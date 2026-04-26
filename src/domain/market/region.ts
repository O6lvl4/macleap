import type { Brand } from "../../shared/brand.js";

export type RegionCode = Brand<string, "RegionCode">;

export interface MarketRegion {
  code: RegionCode;
  label: string;
  defaultCurrency: string;
  newsroomFeedUrl: string;
}

export const SUPPORTED_REGIONS: MarketRegion[] = [
  {
    code: "jp" as RegionCode,
    label: "Japan",
    defaultCurrency: "JPY",
    newsroomFeedUrl: "https://www.apple.com/jp/newsroom/rss-feed.rss",
  },
];

export function findRegion(code: string): MarketRegion | null {
  return SUPPORTED_REGIONS.find((r) => r.code === code) ?? null;
}

export function regionCode(code: string): RegionCode {
  return code as RegionCode;
}
