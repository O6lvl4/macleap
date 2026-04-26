import pc from "picocolors";

export function header(text: string): string {
  return pc.bold(pc.cyan(text));
}

export function storageLabel(gb: number): string {
  return gb >= 1024 ? `${gb / 1024}TB` : `${gb}GB`;
}

export function colorReason(reason: string): string {
  if (reason.startsWith("chip ") && reason.includes(" > ")) return pc.green(reason);
  if (reason.startsWith("+")) return pc.green(reason);
  if (reason.startsWith("chip same")) return pc.dim(reason);
  return reason;
}

export interface KeyValueRow {
  key: string;
  value: string;
}

export function renderKeyValue(rows: KeyValueRow[]): string {
  const keyWidth = Math.max(...rows.map((r) => r.key.length));
  return rows.map((r) => `  ${pc.dim(r.key.padEnd(keyWidth))}  ${r.value}`).join("\n");
}
