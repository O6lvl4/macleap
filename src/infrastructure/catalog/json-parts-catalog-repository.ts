import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { PartsCatalogRepository } from "../../application/ports.js";
import type {
  PartItem,
  PriceObservation,
} from "../../domain/catalog/parts-catalog.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class JsonPartsCatalogRepository implements PartsCatalogRepository {
  async loadItems(): Promise<PartItem[]> {
    const path = join(
      __dirname,
      "..",
      "..",
      "..",
      "data",
      "catalog",
      "items.json",
    );
    const raw = readFileSync(path, "utf-8");
    return (JSON.parse(raw) as { items: PartItem[] }).items;
  }

  /** prices.jsonl は1行=1観測の JSON Lines。空行は読み飛ばす。 */
  async loadPrices(): Promise<PriceObservation[]> {
    const path = join(
      __dirname,
      "..",
      "..",
      "..",
      "data",
      "catalog",
      "prices.jsonl",
    );
    const raw = readFileSync(path, "utf-8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as PriceObservation);
  }
}
