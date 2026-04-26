import type { RegionCode } from "../market/region.js";
import type { CurrentMacBaseline, MacModel, ConfigSpec } from "./mac-model.js";

export interface Catalog {
  region: RegionCode;
  updatedAt: string;
  current: MacModel[];
  historical: MacModel[];
}

export interface OriginalMatch {
  model: MacModel;
  config: ConfigSpec;
  exact: boolean;
}

export function findOriginal(
  baseline: CurrentMacBaseline,
  catalog: Catalog,
): OriginalMatch | null {
  const candidates = catalog.historical.filter(
    (m) =>
      m.family === baseline.family &&
      m.screenSizeInch === baseline.screenSizeInch &&
      m.chip.family === baseline.chip.family &&
      m.chip.generation === baseline.chip.generation &&
      m.chip.variant === baseline.chip.variant,
  );

  for (const model of candidates) {
    const exact = model.configs.find(
      (c) => c.memoryGB === baseline.memoryGB && c.storageGB === baseline.storageGB,
    );
    if (exact) return { model, config: exact, exact: true };
  }

  for (const model of candidates) {
    const sameMem = model.configs.filter((c) => c.memoryGB === baseline.memoryGB);
    if (sameMem.length > 0) {
      sameMem.sort(
        (a, b) =>
          Math.abs(a.storageGB - baseline.storageGB) - Math.abs(b.storageGB - baseline.storageGB),
      );
      return { model, config: sameMem[0], exact: false };
    }
  }

  for (const model of candidates) {
    const sameStorage = model.configs.filter((c) => c.storageGB === baseline.storageGB);
    if (sameStorage.length > 0) {
      sameStorage.sort(
        (a, b) =>
          Math.abs(a.memoryGB - baseline.memoryGB) - Math.abs(b.memoryGB - baseline.memoryGB),
      );
      return { model, config: sameStorage[0], exact: false };
    }
  }

  if (candidates.length > 0) {
    return { model: candidates[0], config: candidates[0].configs[0], exact: false };
  }

  return null;
}
