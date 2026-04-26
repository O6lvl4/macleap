import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { DepreciationModelRepository } from "../../application/ports.js";
import type { DepreciationModel } from "../../domain/pricing/depreciation-model.js";
import type { RegionCode } from "../../domain/market/region.js";

function dataDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "..", "..", "data");
}

export class JsonDepreciationRepository implements DepreciationModelRepository {
  async load(region: RegionCode): Promise<DepreciationModel> {
    const path = resolve(dataDir(), "regions", region, "tradein-model.json");
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as DepreciationModel;
  }
}
