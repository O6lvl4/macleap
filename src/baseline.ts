import type { MacSpec } from "./detect.js";
import type { ChipSpec, ChipVariant, Family } from "./lineup.js";
import type { CurrentMacBaseline } from "./match.js";

const RESOLUTION_TO_SIZE: Array<{ pattern: RegExp; sizeInch: number; family: Family }> = [
  { pattern: /3456\s*x\s*2234/, sizeInch: 16, family: "MacBook Pro" },
  { pattern: /3024\s*x\s*1964/, sizeInch: 14, family: "MacBook Pro" },
  { pattern: /2880\s*x\s*1864/, sizeInch: 15, family: "MacBook Air" },
  { pattern: /2560\s*x\s*1664/, sizeInch: 13, family: "MacBook Air" },
  { pattern: /2408\s*x\s*1506/, sizeInch: 13, family: "MacBook Neo" },
];

export function parseChip(chipText: string): ChipSpec {
  const cleaned = chipText.replace(/^Apple\s+/i, "").trim();
  const m = cleaned.match(/^M(\d+)(?:\s+(Pro|Max|Ultra))?/i);
  if (m) {
    const variant = (m[2] ?? "") as ChipVariant;
    return {
      family: "M",
      generation: Number.parseInt(m[1], 10),
      variant,
    };
  }
  const a = cleaned.match(/^A(\d+)(?:\s+(Pro|Max))?/i);
  if (a) {
    return {
      family: "A",
      generation: Number.parseInt(a[1], 10),
      variant: (a[2] ?? "") as ChipVariant,
    };
  }
  return { family: "M", generation: 0, variant: "" };
}

function inferFamilyAndSize(spec: MacSpec): { family: Family; screenSizeInch: number } {
  if (spec.displayResolution) {
    for (const entry of RESOLUTION_TO_SIZE) {
      if (entry.pattern.test(spec.displayResolution)) {
        return { family: entry.family, screenSizeInch: entry.sizeInch };
      }
    }
  }

  const name = spec.modelName.toLowerCase();
  if (name.includes("macbook pro")) return { family: "MacBook Pro", screenSizeInch: 14 };
  if (name.includes("macbook air")) return { family: "MacBook Air", screenSizeInch: 13 };
  if (name === "macbook") return { family: "MacBook Neo", screenSizeInch: 13 };
  if (name.includes("imac")) return { family: "iMac", screenSizeInch: 24 };
  if (name.includes("mac mini")) return { family: "Mac mini", screenSizeInch: 0 };
  if (name.includes("mac studio")) return { family: "Mac Studio", screenSizeInch: 0 };
  if (name.includes("mac pro")) return { family: "Mac Pro", screenSizeInch: 0 };

  return { family: "MacBook Pro", screenSizeInch: 14 };
}

const STORAGE_TIERS = [128, 256, 512, 1024, 2048, 4096, 8192];

function normalizeStorage(gb: number): number {
  for (const tier of STORAGE_TIERS) {
    if (gb <= tier) return tier;
  }
  return STORAGE_TIERS[STORAGE_TIERS.length - 1];
}

export function toBaseline(spec: MacSpec): CurrentMacBaseline {
  const { family, screenSizeInch } = inferFamilyAndSize(spec);
  return {
    family,
    screenSizeInch,
    chip: parseChip(spec.chip),
    memoryGB: spec.memoryGB,
    storageGB: normalizeStorage(spec.storageGB),
  };
}
