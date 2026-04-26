import type { Money } from "../market/money.js";
import type { ChipSpec } from "./chip.js";
import type { Family } from "./family.js";

export interface ConfigSpec {
  memoryGB: number;
  storageGB: number;
  cpuCores: number;
  gpuCores: number;
  price: Money;
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

export interface CurrentMacBaseline {
  family: Family;
  screenSizeInch: number;
  chip: ChipSpec;
  memoryGB: number;
  storageGB: number;
}
