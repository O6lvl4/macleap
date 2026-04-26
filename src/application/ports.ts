import type { Catalog } from "../domain/catalog/catalog.js";
import type { CurrentMacBaseline } from "../domain/catalog/mac-model.js";
import type { DepreciationModel } from "../domain/pricing/depreciation-model.js";
import type { MarketRegion, RegionCode } from "../domain/market/region.js";

export interface DetectedMac {
  modelName: string;
  modelIdentifier: string;
  modelNumber?: string;
  chip: string;
  cpuCores: number;
  performanceCores?: number;
  efficiencyCores?: number;
  gpuCores?: number;
  memoryGB: number;
  storageGB: number;
  serialNumber: string;
  displayResolution?: string;
}

export interface MacDetector {
  detect(): Promise<DetectedMac>;
  toBaseline(detected: DetectedMac): CurrentMacBaseline;
}

export interface CatalogRepository {
  load(region: RegionCode): Promise<Catalog>;
}

export interface DepreciationModelRepository {
  load(region: RegionCode): Promise<DepreciationModel>;
}

export interface RegionResolver {
  resolve(code: string): MarketRegion;
}
