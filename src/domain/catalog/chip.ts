export type ChipFamily = "M" | "A";
export type ChipVariant = "" | "Pro" | "Max" | "Ultra";

export interface ChipSpec {
  family: ChipFamily;
  generation: number;
  variant: ChipVariant;
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

export function chipsEqual(a: ChipSpec, b: ChipSpec): boolean {
  return a.family === b.family && a.generation === b.generation && a.variant === b.variant;
}
