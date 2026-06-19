/**
 * パーツ性能カタログのドメイン型。
 * 性能(不変寄り)は PartItem、価格(変動)は PriceObservation に分離し、id で結合する。
 * data/catalog/items.json と data/catalog/prices.jsonl に対応する。
 */

export type PartKind =
  | "apple-machine"
  | "apu"
  | "cpu"
  | "gpu"
  | "machine";

export interface Geekbench6 {
  single?: number;
  multi?: number;
  note?: string;
}

export interface PartSpecs {
  cpuCores?: number;
  threads?: number;
  gpuCores?: number;
  memoryGB?: number;
  memoryMaxGB?: number;
  memBandwidthGBs?: number;
  vramGB?: number;
  tdpW?: number;
  [key: string]: unknown;
}

export interface LlmResult {
  model: string;
  quant?: string;
  tokPerSec: number | null;
  note?: string;
}

export interface PartSource {
  url: string;
  measuredAt: string;
  note?: string;
}

export interface PartItem {
  id: string;
  kind: PartKind;
  name: string;
  specs?: PartSpecs;
  benchmarks?: { geekbench6?: Geekbench6 };
  llm?: LlmResult[];
  components?: string[];
  sources?: PartSource[];
}

export interface PriceObservation {
  itemId: string;
  observedAt: string;
  region: string;
  currency: string;
  price: number;
  availability?: string;
  leadTimeDays?: number;
  leadTimeWeeks?: string;
  leadTimeNote?: string;
  sourceUrl?: string;
  note?: string;
}

/** 性能itemに、そのitemの最新価格観測を結合した1行。 */
export interface CatalogRow {
  item: PartItem;
  latestPrice?: PriceObservation;
}
