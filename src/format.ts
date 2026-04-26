import pc from "picocolors";
import Table from "cli-table3";

export const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

export function storageLabel(gb: number): string {
  return gb >= 1024 ? `${gb / 1024}TB` : `${gb}GB`;
}

export function header(text: string): string {
  return pc.bold(pc.cyan(text));
}

export function priceCell(amountJPY: number): string {
  return yen.format(amountJPY);
}

export function netCell(amountJPY: number): string {
  if (amountJPY <= 0) return pc.green(yen.format(amountJPY));
  return pc.bold(yen.format(amountJPY));
}

export interface SuggestRow {
  rank: number;
  title: string;
  config: string;
  price: string;
  net?: string;
  reasons: string;
}

export function renderSuggestTable(rows: SuggestRow[], includeNet: boolean): string {
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

  for (const row of rows) {
    const cells = includeNet
      ? [String(row.rank), row.title, row.config, row.price, row.net ?? "-", row.reasons]
      : [String(row.rank), row.title, row.config, row.price, row.reasons];
    table.push(cells);
  }

  return table.toString();
}

export interface KeyValueRow {
  key: string;
  value: string;
}

export function renderKeyValue(rows: KeyValueRow[]): string {
  const keyWidth = Math.max(...rows.map((r) => r.key.length));
  return rows.map((r) => `  ${pc.dim(r.key.padEnd(keyWidth))}  ${r.value}`).join("\n");
}

export function renderTradeinTable(
  rows: Array<{ channel: string; amount: number }>,
): string {
  const table = new Table({
    head: [pc.bold("Channel"), pc.bold("Estimate")],
    colWidths: [22, 14],
    style: { head: [], border: [] },
  });
  for (const r of rows) {
    table.push([r.channel, { content: yen.format(r.amount), hAlign: "right" }]);
  }
  return table.toString();
}
