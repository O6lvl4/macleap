import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { CatalogRepository } from "../../application/ports.js";
import type { Catalog } from "../../domain/catalog/catalog.js";
import type { ConfigSpec, MacModel } from "../../domain/catalog/mac-model.js";
import type { ChipSpec } from "../../domain/catalog/chip.js";
import type { Family } from "../../domain/catalog/family.js";
import { money } from "../../domain/market/money.js";
import { regionCode, type RegionCode } from "../../domain/market/region.js";

interface RawConfig {
  memoryGB: number;
  storageGB: number;
  cpuCores: number;
  gpuCores: number;
  priceJPY?: number;
  priceUSD?: number;
  isStandard: boolean;
}

interface RawModel {
  id: string;
  family: Family;
  screenSizeInch: number;
  chip: ChipSpec;
  releaseYear: number;
  releaseMonth: number;
  configs: RawConfig[];
}

interface RawCatalogFile {
  currency: string;
  region: string;
  updatedAt: string;
  models: RawModel[];
}

function dataDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "..", "..", "data");
}

function pickPrice(raw: RawConfig, currency: string): number {
  if (currency === "JPY" && raw.priceJPY !== undefined) return raw.priceJPY;
  if (currency === "USD" && raw.priceUSD !== undefined) return raw.priceUSD;
  if (raw.priceJPY !== undefined) return raw.priceJPY;
  if (raw.priceUSD !== undefined) return raw.priceUSD;
  throw new Error(`No price found for currency ${currency}`);
}

function toModel(raw: RawModel, currency: string): MacModel {
  const configs: ConfigSpec[] = raw.configs.map((c) => ({
    memoryGB: c.memoryGB,
    storageGB: c.storageGB,
    cpuCores: c.cpuCores,
    gpuCores: c.gpuCores,
    price: money(pickPrice(c, currency), currency),
    isStandard: c.isStandard,
  }));
  return {
    id: raw.id,
    family: raw.family,
    screenSizeInch: raw.screenSizeInch,
    chip: raw.chip,
    releaseYear: raw.releaseYear,
    releaseMonth: raw.releaseMonth,
    configs,
  };
}

async function loadFile(region: RegionCode, name: string): Promise<RawCatalogFile> {
  const path = resolve(dataDir(), "regions", region, name);
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as RawCatalogFile;
}

export class JsonCatalogRepository implements CatalogRepository {
  async load(region: RegionCode): Promise<Catalog> {
    const [lineup, historical] = await Promise.all([
      loadFile(region, "lineup.json"),
      loadFile(region, "historical.json"),
    ]);
    return {
      region: regionCode(region),
      updatedAt: lineup.updatedAt,
      current: lineup.models.map((m) => toModel(m, lineup.currency)),
      historical: historical.models.map((m) => toModel(m, historical.currency)),
    };
  }
}
