import { detectMac } from "./detect.js";
import { toBaseline } from "./baseline.js";
import { loadLineup, chipLabel } from "./lineup.js";
import { suggest, type SuggestOptions } from "./match.js";
import { findOriginal, loadHistorical } from "./historical.js";
import { bestEstimate, estimateTradeIn, loadTradeinModel } from "./tradein.js";

const formatYen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

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

interface CommonOptions extends SuggestOptions {
  condition?: string;
}

function parseCommonArgs(args: string[]): CommonOptions {
  const opts: CommonOptions = { maxResults: 10 };
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
    } else if (arg === "--condition" || arg === "-c") {
      opts.condition = args[++i];
      if (!opts.condition) throw new Error("--condition requires a value");
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return opts;
}

async function cmdSuggest(args: string[]): Promise<void> {
  const opts = parseCommonArgs(args);
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

async function cmdTradein(args: string[]): Promise<void> {
  const opts = parseCommonArgs(args);
  const spec = await detectMac();
  const baseline = toBaseline(spec);
  const historical = await loadHistorical();
  const tradeinModel = await loadTradeinModel();

  console.log("=== Current Mac ===");
  console.log(
    `${baseline.family} ${baseline.screenSizeInch}" / ${chipLabel(baseline.chip)} / ${baseline.memoryGB}GB / ${storageLabel(baseline.storageGB)}`,
  );
  console.log("");

  const original = findOriginal(baseline, historical);
  if (!original) {
    console.log(
      `No historical data for ${baseline.family} ${baseline.screenSizeInch}" ${chipLabel(baseline.chip)}.`,
    );
    console.log(`Add it to data/historical.json to enable trade-in estimation.`);
    return;
  }

  console.log(
    `Matched: ${original.model.family} ${original.model.screenSizeInch}" ${chipLabel(original.model.chip)} / ${original.config.memoryGB}GB / ${storageLabel(original.config.storageGB)}${original.exact ? "" : " (closest config)"}`,
  );
  console.log(
    `Released: ${original.model.releaseYear}/${String(original.model.releaseMonth).padStart(2, "0")}`,
  );
  console.log(`Original retail: ${formatYen.format(original.config.priceJPY)}`);
  console.log("");
  console.log(`=== Estimated trade-in value (condition: ${opts.condition ?? "asNew"}) ===`);

  const estimates = estimateTradeIn(original.model, original.config, tradeinModel, {
    condition: opts.condition,
  });
  for (const e of estimates) {
    console.log(`  ${e.channelLabel.padEnd(20)} ${formatYen.format(e.amountJPY).padStart(10)}`);
  }
  console.log("");
  console.log("Estimates are approximate. Confirm with Apple Trade In or buyback sites.");
}

async function cmdPlan(args: string[]): Promise<void> {
  const opts = parseCommonArgs(args);
  const spec = await detectMac();
  const baseline = toBaseline(spec);
  const lineup = await loadLineup();
  const historical = await loadHistorical();
  const tradeinModel = await loadTradeinModel();

  console.log("=== Current Mac ===");
  console.log(
    `${baseline.family} ${baseline.screenSizeInch}" / ${chipLabel(baseline.chip)} / ${baseline.memoryGB}GB / ${storageLabel(baseline.storageGB)}`,
  );

  const original = findOriginal(baseline, historical);
  let bestAmount = 0;
  let bestLabel = "";
  if (original) {
    const estimates = estimateTradeIn(original.model, original.config, tradeinModel, {
      condition: opts.condition,
    });
    const best = bestEstimate(estimates);
    if (best) {
      bestAmount = best.amountJPY;
      bestLabel = best.channelLabel;
    }
    console.log(`Original retail: ${formatYen.format(original.config.priceJPY)}`);
    console.log("");
    console.log(`=== Estimated trade-in value (condition: ${opts.condition ?? "asNew"}) ===`);
    for (const e of estimates) {
      console.log(`  ${e.channelLabel.padEnd(20)} ${formatYen.format(e.amountJPY).padStart(10)}`);
    }
  } else {
    console.log("(No historical data found — net cost will equal sticker price.)");
  }

  console.log("");
  const budgetLabel = opts.budgetJPY !== undefined ? ` (within ${formatYen.format(opts.budgetJPY)})` : "";
  console.log(`=== Equal-or-better current models${budgetLabel}, with net upgrade cost ===`);

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
    const net = s.config.priceJPY - bestAmount;
    const netLabel = bestAmount > 0 ? `   net ${formatYen.format(net).padStart(10)}` : "";
    console.log(`${num}. ${title.padEnd(34)} ${cfg.padEnd(16)} ${price.padStart(10)}${netLabel}`);
  }
  if (bestAmount > 0) {
    console.log("");
    console.log(`Net cost assumes best trade-in: ${bestLabel} (${formatYen.format(bestAmount)}).`);
  }
}

function printHelp(): void {
  console.log(`macleap — detect your Mac, find equal-or-better current models, estimate net upgrade cost.

Usage:
  macleap [detect]                          Show current Mac specs
  macleap suggest [options]                 Suggest equal-or-better current models
  macleap tradein [options]                 Estimate trade-in value for current Mac
  macleap plan [options]                    Combined suggest + tradein with net upgrade cost

Options:
  -b, --budget <yen>                        Maximum price (e.g. 400000)
  -c, --condition <asNew|good|fair>         Condition of current Mac (default: asNew)
  --allow-smaller-screen                    Allow smaller screens in suggestions
  --limit <n>                               Limit number of results (default: 10)
  --all                                     Show all matches, no limit
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

  if (cmd === "tradein") {
    await cmdTradein(rest);
    return;
  }

  if (cmd === "plan") {
    await cmdPlan(rest);
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  printHelp();
  process.exit(1);
}
