import Table from "cli-table3";
import pc from "picocolors";
import type {
  CatalogRow,
  PartItem,
} from "../../../domain/catalog/parts-catalog.js";
import { money } from "../../../domain/market/money.js";
import { formatMoney } from "./money.js";

export function renderCatalog(rows: CatalogRow[]): string {
  const table = new Table({
    head: ["Name", "Kind", "GB6 SC/MC", "Memory", "LLM", "Price (latest)"].map(
      (h) => pc.bold(h),
    ),
    colAligns: ["left", "left", "left", "left", "left", "left"],
  });

  for (const { item, latestPrice } of rows) {
    table.push([
      item.name,
      item.kind,
      formatGb6(item),
      formatMemory(item),
      formatLlm(item),
      formatPrice(latestPrice),
    ]);
  }

  return table.toString();
}

function formatGb6(item: PartItem): string {
  const g = item.benchmarks?.geekbench6;
  if (!g || (g.single == null && g.multi == null)) return pc.dim("—");
  return `${g.single ?? "?"}/${g.multi ?? "?"}`;
}

function formatMemory(item: PartItem): string {
  const s = item.specs;
  if (!s) return pc.dim("—");
  if (s.vramGB != null) return `VRAM ${s.vramGB}GB`;
  const cap = s.memoryMaxGB ?? s.memoryGB;
  if (cap == null) return pc.dim("—");
  return s.memBandwidthGBs ? `${cap}GB @${s.memBandwidthGBs}GB/s` : `${cap}GB`;
}

function formatLlm(item: PartItem): string {
  if (!item.llm || item.llm.length === 0) return pc.dim("—");
  // tok/s が判明している代表モデルを1つ。無ければ最初のモデル名。
  const withSpeed = item.llm.find((l) => l.tokPerSec != null);
  if (withSpeed) return `${withSpeed.model} ${withSpeed.tokPerSec}tok/s`;
  return item.llm[0].model;
}

function formatPrice(price?: CatalogRow["latestPrice"]): string {
  if (!price) return pc.dim("—");
  const amount = formatMoney(money(price.price, price.currency));
  const lead =
    price.leadTimeDays != null
      ? `${price.leadTimeDays}d`
      : price.leadTimeWeeks
        ? `${price.leadTimeWeeks}wk`
        : price.leadTimeNote ?? "";
  const meta = [price.availability, lead].filter(Boolean).join(" ");
  return meta ? `${amount} ${pc.dim(`(${meta})`)}` : amount;
}
