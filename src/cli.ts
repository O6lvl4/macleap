import { detectMac } from "./detect.js";
import { toBaseline } from "./baseline.js";
import { loadLineup, chipLabel } from "./lineup.js";
import { suggest, type SuggestOptions } from "./match.js";

const formatYen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });

function storageLabel(gb: number): string {
  return gb >= 1024 ? `${gb / 1024}TB` : `${gb}GB`;
}

async function cmdDetect(): Promise<void> {
  const spec = await detectMac();
  console.log("=== Current Mac ===");
  console.log(`Model:        ${spec.modelName} (${spec.modelIdentifier})`);
  console.log(`Chip:         ${spec.chip}`);
  const coreDetail =
    spec.performanceCores !== undefined && spec.efficiencyCores !== undefined
      ? ` (${spec.performanceCores}P + ${spec.efficiencyCores}E)`
      : "";
  console.log(`CPU cores:    ${spec.cpuCores}${coreDetail}`);
  if (spec.gpuCores) console.log(`GPU cores:    ${spec.gpuCores}`);
  console.log(`Memory:       ${spec.memoryGB} GB`);
  console.log(`Storage:      ${spec.storageGB} GB`);
  if (spec.displayResolution) console.log(`Display:      ${spec.displayResolution}`);
  console.log(`Serial:       ${spec.serialNumber}`);
}

function parseSuggestArgs(args: string[]): SuggestOptions {
  const opts: SuggestOptions = { maxResults: 10 };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--budget" || arg === "-b") {
      const value = args[++i];
      if (!value) throw new Error("--budget requires a value");
      opts.budgetJPY = Number.parseInt(value.replace(/[,_]/g, ""), 10);
    } else if (arg === "--allow-smaller-screen") {
      opts.allowSmallerScreen = true;
    } else if (arg === "--limit") {
      const value = args[++i];
      if (!value) throw new Error("--limit requires a value");
      opts.maxResults = Number.parseInt(value, 10);
    } else if (arg === "--all") {
      opts.maxResults = undefined;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return opts;
}

async function cmdSuggest(args: string[]): Promise<void> {
  const opts = parseSuggestArgs(args);
  const spec = await detectMac();
  const baseline = toBaseline(spec);
  const lineup = await loadLineup();

  console.log("=== Current Mac ===");
  console.log(
    `${baseline.family} ${baseline.screenSizeInch}" / ${chipLabel(baseline.chip)} / ${baseline.memoryGB}GB / ${storageLabel(baseline.storageGB)}`,
  );
  console.log("");
  const budgetLabel = opts.budgetJPY !== undefined ? ` (within ${formatYen.format(opts.budgetJPY)})` : "";
  console.log(`=== Equal-or-better current models${budgetLabel} ===`);
  console.log(`(lineup data updated ${lineup.updatedAt})`);
  console.log("");

  const results = suggest(baseline, lineup, opts);
  if (results.length === 0) {
    console.log("No matching current models found. Try --allow-smaller-screen or relax --budget.");
    return;
  }

  for (const [i, s] of results.entries()) {
    const num = String(i + 1).padStart(2, " ");
    const title = `${s.model.family} ${s.model.screenSizeInch}" ${chipLabel(s.model.chip)}`;
    const cfg = `${s.config.memoryGB}GB / ${storageLabel(s.config.storageGB)}`;
    const price = formatYen.format(s.config.priceJPY);
    console.log(`${num}. ${title.padEnd(34)} ${cfg.padEnd(16)} ${price.padStart(10)}`);
    console.log(`    [${s.reasons.join(", ")}]`);
  }
}

function printHelp(): void {
  console.log(`macleap — detect your Mac and find equal-or-better current models

Usage:
  macleap [detect]                          Show current Mac specs
  macleap suggest [options]                 Suggest equal-or-better current models

Options for suggest:
  -b, --budget <yen>                        Maximum price (e.g. 400000)
  --allow-smaller-screen                    Allow smaller screen sizes in suggestions
  --limit <n>                               Limit number of results (default: 10)
  --all                                     Show all matches, no limit

Other:
  -h, --help                                Show this help`);
}

export async function run(argv: string[]): Promise<void> {
  const [cmd, ...rest] = argv;

  if (cmd === "-h" || cmd === "--help" || cmd === "help") {
    printHelp();
    return;
  }

  if (!cmd || cmd === "detect") {
    await cmdDetect();
    return;
  }

  if (cmd === "suggest") {
    await cmdSuggest(rest);
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  printHelp();
  process.exit(1);
}
