import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { ConfigSpec, Lineup, MacModel } from "./lineup.js";
import type { CurrentMacBaseline } from "./match.js";

export async function loadHistorical(): Promise<Lineup> {
  const here = dirname(fileURLToPath(import.meta.url));
  const dataPath = resolve(here, "..", "data", "historical.json");
  const raw = await readFile(dataPath, "utf-8");
  return JSON.parse(raw) as Lineup;
}

export interface OriginalMatch {
  model: MacModel;
  config: ConfigSpec;
  exact: boolean;
}

export function findOriginal(
  baseline: CurrentMacBaseline,
  historical: Lineup,
): OriginalMatch | null {
  const candidates = historical.models.filter(
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
