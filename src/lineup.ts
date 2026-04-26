import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export type ChipFamily = "M" | "A";
export type ChipVariant = "" | "Pro" | "Max" | "Ultra";
export type Family =
  | "MacBook Air"
  | "MacBook Pro"
  | "MacBook Neo"
  | "iMac"
  | "Mac mini"
  | "Mac Studio"
  | "Mac Pro";

export interface ChipSpec {
  family: ChipFamily;
  generation: number;
  variant: ChipVariant;
}

export interface ConfigSpec {
  memoryGB: number;
  storageGB: number;
  cpuCores: number;
  gpuCores: number;
  priceJPY: number;
  isStandard: boolean;
}

export interface MacModel {
  id: string;
  family: Family;
  screenSizeInch: number;
  chip: ChipSpec;
  releaseYear: number;
  releaseMonth: number;
  configs: ConfigSpec[];
}

export interface Lineup {
  currency: string;
  region: string;
  updatedAt: string;
  models: MacModel[];
}

const CHIP_VARIANT_RANK: Record<ChipVariant, number> = {
  "": 0,
  Pro: 1,
  Max: 2,
  Ultra: 3,
};

export function chipScore(chip: ChipSpec): number {
  const familyWeight = chip.family === "M" ? 1000 : 500;
  return familyWeight + chip.generation * 10 + CHIP_VARIANT_RANK[chip.variant];
}

export function chipLabel(chip: ChipSpec): string {
  const variant = chip.variant ? ` ${chip.variant}` : "";
  return `${chip.family}${chip.generation}${variant}`;
}

export async function loadLineup(): Promise<Lineup> {
  const here = dirname(fileURLToPath(import.meta.url));
  const dataPath = resolve(here, "..", "data", "lineup.json");
  const raw = await readFile(dataPath, "utf-8");
  return JSON.parse(raw) as Lineup;
}
