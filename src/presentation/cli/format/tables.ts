import Table from "cli-table3";
import pc from "picocolors";
import type { Suggestion } from "../../../domain/upgrade/suggestion.js";
import type { TradeinEstimate } from "../../../domain/pricing/depreciation-model.js";
import { chipLabel } from "../../../domain/catalog/chip.js";
import { subMoney } from "../../../domain/market/money.js";
import { formatMoney } from "./money.js";
import { colorReason, storageLabel } from "./text.js";

export function renderSuggestTable(
  suggestions: Suggestion[],
  best: TradeinEstimate | null,
): string {
  const includeNet = best !== null;
  const head = includeNet
    ? ["#", "Model", "Config", "Price", "Net", "Reasons"].map((h) => pc.bold(h))
    : ["#", "Model", "Config", "Price", "Reasons"].map((h) => pc.bold(h));
  const colWidths = includeNet ? [4, 28, 14, 12, 12, 36] : [4, 28, 14, 12, 36];

  const table = new Table({
    head,
    colWidths,
    wordWrap: true,
    style: { head: [], border: [] },
  });

  for (const [i, s] of suggestions.entries()) {
    const title = `${s.model.family} ${s.model.screenSizeInch}" ${chipLabel(s.model.chip)}`;
    const cfg = `${s.config.memoryGB}GB / ${storageLabel(s.config.storageGB)}`;
    const price = formatMoney(s.config.price);
    const reasons = s.reasons.map(colorReason).join(", ");

    if (includeNet && best) {
      const net =
        s.config.price.currency === best.amount.currency
          ? subMoney(s.config.price, best.amount)
          : s.config.price;
      const netLabel = net.amount <= 0 ? pc.green(formatMoney(net)) : pc.bold(formatMoney(net));
      table.push([String(i + 1), title, cfg, price, netLabel, reasons]);
    } else {
      table.push([String(i + 1), title, cfg, price, reasons]);
    }
  }

  return table.toString();
}

export function renderTradeinTable(estimates: TradeinEstimate[]): string {
  const table = new Table({
    head: [pc.bold("Channel"), pc.bold("Estimate")],
    colWidths: [22, 14],
    style: { head: [], border: [] },
  });
  for (const e of estimates) {
    table.push([e.channelLabel, { content: formatMoney(e.amount), hAlign: "right" }]);
  }
  return table.toString();
}
