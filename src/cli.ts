import { Command } from "commander";
import yoctoSpinner from "yocto-spinner";
import pc from "picocolors";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { detectMac, type MacSpec } from "./detect.js";
import { toBaseline } from "./baseline.js";
import { loadLineup, chipLabel, type Lineup } from "./lineup.js";
import { suggest, type Suggestion, type SuggestOptions } from "./match.js";
import { findOriginal, loadHistorical } from "./historical.js";
import {
  bestEstimate,
  estimateTradeIn,
  loadTradeinModel,
  type TradeinEstimate,
} from "./tradein.js";
import {
  header,
  netCell,
  priceCell,
  renderKeyValue,
  renderSuggestTable,
  renderTradeinTable,
  storageLabel,
  yen,
} from "./format.js";

interface CommonFlags {
  json?: boolean;
}

interface SuggestFlags extends CommonFlags {
  budget?: string;
  allowSmallerScreen?: boolean;
  limit?: string;
  all?: boolean;
}

interface TradeinFlags extends CommonFlags {
  condition?: string;
}

type PlanFlags = SuggestFlags & TradeinFlags;

async function loadPackageVersion(): Promise<string> {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgPath = resolve(here, "..", "package.json");
  const raw = await readFile(pkgPath, "utf-8");
  return (JSON.parse(raw) as { version: string }).version;
}

function parseBudget(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number.parseInt(value.replace(/[,_]/g, ""), 10);
  if (Number.isNaN(n)) throw new Error(`Invalid --budget: ${value}`);
  return n;
}

function toSuggestOptions(flags: SuggestFlags): SuggestOptions {
  const opts: SuggestOptions = {};
  opts.budgetJPY = parseBudget(flags.budget);
  opts.allowSmallerScreen = flags.allowSmallerScreen;
  if (flags.all) {
    opts.maxResults = undefined;
  } else if (flags.limit !== undefined) {
    opts.maxResults = Number.parseInt(flags.limit, 10);
  } else {
    opts.maxResults = 10;
  }
  return opts;
}

async function detectWithSpinner(json: boolean | undefined): Promise<MacSpec> {
  if (json) return detectMac();
  const spinner = yoctoSpinner({ text: "Detecting current Mac…" }).start();
  try {
    const spec = await detectMac();
    spinner.success("Detected current Mac");
    return spec;
  } catch (err) {
    spinner.error("Detection failed");
    throw err;
  }
}

async function loadDataWithSpinner<T>(
  text: string,
  loader: () => Promise<T>,
  json: boolean | undefined,
): Promise<T> {
  if (json) return loader();
  const spinner = yoctoSpinner({ text }).start();
  try {
    const data = await loader();
    spinner.stop();
    return data;
  } catch (err) {
    spinner.error(`${text} failed`);
    throw err;
  }
}

function printCurrentMacBlock(spec: MacSpec): void {
  console.log(header("Current Mac"));
  const coreDetail =
    spec.performanceCores !== undefined && spec.efficiencyCores !== undefined
      ? ` (${spec.performanceCores}P + ${spec.efficiencyCores}E)`
      : "";
  console.log(
    renderKeyValue([
      { key: "Model", value: `${spec.modelName} ${pc.dim(`(${spec.modelIdentifier})`)}` },
      { key: "Chip", value: spec.chip },
      { key: "CPU cores", value: `${spec.cpuCores}${coreDetail}` },
      ...(spec.gpuCores ? [{ key: "GPU cores", value: String(spec.gpuCores) }] : []),
      { key: "Memory", value: `${spec.memoryGB} GB` },
      { key: "Storage", value: `${spec.storageGB} GB` },
      ...(spec.displayResolution
        ? [{ key: "Display", value: spec.displayResolution }]
        : []),
      { key: "Serial", value: spec.serialNumber },
    ]),
  );
}

function suggestionRows(
  suggestions: Suggestion[],
  bestTradein: number,
): Array<{ rank: number; title: string; config: string; price: string; net?: string; reasons: string }> {
  return suggestions.map((s, i) => ({
    rank: i + 1,
    title: `${s.model.family} ${s.model.screenSizeInch}" ${chipLabel(s.model.chip)}`,
    config: `${s.config.memoryGB}GB / ${storageLabel(s.config.storageGB)}`,
    price: priceCell(s.config.priceJPY),
    net: bestTradein > 0 ? netCell(s.config.priceJPY - bestTradein) : undefined,
    reasons: s.reasons.map(colorReason).join(", "),
  }));
}

function colorReason(reason: string): string {
  if (reason.startsWith("chip ") && reason.includes(" > ")) return pc.green(reason);
  if (reason.startsWith("+")) return pc.green(reason);
  if (reason.startsWith("chip same")) return pc.dim(reason);
  return reason;
}

function tradeinRowsForTable(estimates: TradeinEstimate[]): Array<{ channel: string; amount: number }> {
  return estimates.map((e) => ({ channel: e.channelLabel, amount: e.amountJPY }));
}

async function cmdDetect(flags: CommonFlags): Promise<void> {
  const spec = await detectWithSpinner(flags.json);
  if (flags.json) {
    console.log(JSON.stringify(spec, null, 2));
    return;
  }
  console.log("");
  printCurrentMacBlock(spec);
}

async function cmdSuggest(flags: SuggestFlags): Promise<void> {
  const opts = toSuggestOptions(flags);
  const spec = await detectWithSpinner(flags.json);
  const baseline = toBaseline(spec);
  const lineup = await loadDataWithSpinner<Lineup>(
    "Loading current Mac lineup…",
    loadLineup,
    flags.json,
  );

  const results = suggest(baseline, lineup, opts);

  if (flags.json) {
    console.log(JSON.stringify({ baseline, suggestions: results }, null, 2));
    return;
  }

  console.log("");
  printCurrentMacBlock(spec);
  console.log("");
  const budgetLabel = opts.budgetJPY !== undefined ? ` ${pc.dim(`(within ${yen.format(opts.budgetJPY)})`)}` : "";
  console.log(header("Equal-or-better current models") + budgetLabel);
  console.log(pc.dim(`(lineup data updated ${lineup.updatedAt})`));
  console.log("");

  if (results.length === 0) {
    console.log(pc.yellow("No matching current models found. Try --allow-smaller-screen or relax --budget."));
    return;
  }

  console.log(renderSuggestTable(suggestionRows(results, 0), false));
}

async function cmdTradein(flags: TradeinFlags): Promise<void> {
  const spec = await detectWithSpinner(flags.json);
  const baseline = toBaseline(spec);
  const historical = await loadDataWithSpinner("Loading historical Mac data…", loadHistorical, flags.json);
  const tradeinModel = await loadDataWithSpinner(
    "Loading trade-in model…",
    loadTradeinModel,
    flags.json,
  );

  const original = findOriginal(baseline, historical);
  if (!original) {
    if (flags.json) {
      console.log(JSON.stringify({ baseline, error: "no historical data" }, null, 2));
      return;
    }
    console.log("");
    printCurrentMacBlock(spec);
    console.log("");
    console.log(
      pc.yellow(
        `No historical data for ${baseline.family} ${baseline.screenSizeInch}" ${chipLabel(baseline.chip)}.`,
      ),
    );
    console.log(pc.dim("Add it to data/historical.json to enable trade-in estimation."));
    return;
  }

  const estimates = estimateTradeIn(original.model, original.config, tradeinModel, {
    condition: flags.condition,
  });

  if (flags.json) {
    console.log(
      JSON.stringify(
        {
          baseline,
          original: {
            modelId: original.model.id,
            release: `${original.model.releaseYear}-${String(original.model.releaseMonth).padStart(2, "0")}`,
            originalRetailJPY: original.config.priceJPY,
            exact: original.exact,
          },
          condition: flags.condition ?? "asNew",
          estimates,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log("");
  printCurrentMacBlock(spec);
  console.log("");
  console.log(header("Matched historical model"));
  console.log(
    renderKeyValue([
      {
        key: "Model",
        value: `${original.model.family} ${original.model.screenSizeInch}" ${chipLabel(original.model.chip)} / ${original.config.memoryGB}GB / ${storageLabel(original.config.storageGB)}${original.exact ? "" : pc.dim(" (closest config)")}`,
      },
      {
        key: "Released",
        value: `${original.model.releaseYear}/${String(original.model.releaseMonth).padStart(2, "0")}`,
      },
      { key: "Original retail", value: priceCell(original.config.priceJPY) },
    ]),
  );
  console.log("");
  console.log(header(`Estimated trade-in value`) + pc.dim(` (condition: ${flags.condition ?? "asNew"})`));
  console.log(renderTradeinTable(tradeinRowsForTable(estimates)));
  console.log(pc.dim("Estimates are approximate. Confirm with Apple Trade In or buyback sites."));
}

async function cmdPlan(flags: PlanFlags): Promise<void> {
  const opts = toSuggestOptions(flags);
  const spec = await detectWithSpinner(flags.json);
  const baseline = toBaseline(spec);
  const lineup = await loadDataWithSpinner("Loading current Mac lineup…", loadLineup, flags.json);
  const historical = await loadDataWithSpinner(
    "Loading historical Mac data…",
    loadHistorical,
    flags.json,
  );
  const tradeinModel = await loadDataWithSpinner(
    "Loading trade-in model…",
    loadTradeinModel,
    flags.json,
  );

  const original = findOriginal(baseline, historical);
  let estimates: TradeinEstimate[] = [];
  let bestAmount = 0;
  let bestLabel = "";
  if (original) {
    estimates = estimateTradeIn(original.model, original.config, tradeinModel, {
      condition: flags.condition,
    });
    const best = bestEstimate(estimates);
    if (best) {
      bestAmount = best.amountJPY;
      bestLabel = best.channelLabel;
    }
  }

  const results = suggest(baseline, lineup, opts);

  if (flags.json) {
    console.log(
      JSON.stringify(
        {
          baseline,
          original: original
            ? {
                modelId: original.model.id,
                release: `${original.model.releaseYear}-${String(original.model.releaseMonth).padStart(2, "0")}`,
                originalRetailJPY: original.config.priceJPY,
                exact: original.exact,
              }
            : null,
          condition: flags.condition ?? "asNew",
          tradein: { estimates, best: bestAmount > 0 ? { channel: bestLabel, amountJPY: bestAmount } : null },
          suggestions: results.map((s) => ({
            modelId: s.model.id,
            family: s.model.family,
            screenSizeInch: s.model.screenSizeInch,
            chip: s.model.chip,
            config: s.config,
            netJPY: bestAmount > 0 ? s.config.priceJPY - bestAmount : s.config.priceJPY,
            reasons: s.reasons,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log("");
  printCurrentMacBlock(spec);

  if (original) {
    console.log("");
    console.log(header("Trade-in estimate") + pc.dim(` (condition: ${flags.condition ?? "asNew"})`));
    console.log(
      pc.dim(
        `Matched ${original.model.family} ${original.model.screenSizeInch}" ${chipLabel(original.model.chip)} / ${original.config.memoryGB}GB / ${storageLabel(original.config.storageGB)} (${original.model.releaseYear}/${String(original.model.releaseMonth).padStart(2, "0")}, retail ${yen.format(original.config.priceJPY)})`,
      ),
    );
    console.log(renderTradeinTable(tradeinRowsForTable(estimates)));
  } else {
    console.log("");
    console.log(pc.yellow("No historical data found — net cost will equal sticker price."));
  }

  console.log("");
  const budgetLabel = opts.budgetJPY !== undefined ? ` ${pc.dim(`(within ${yen.format(opts.budgetJPY)})`)}` : "";
  console.log(header("Equal-or-better current models — net upgrade cost") + budgetLabel);
  console.log("");

  if (results.length === 0) {
    console.log(pc.yellow("No matching current models found. Try --allow-smaller-screen or relax --budget."));
    return;
  }

  console.log(renderSuggestTable(suggestionRows(results, bestAmount), bestAmount > 0));

  if (bestAmount > 0) {
    console.log("");
    console.log(pc.dim(`Net cost assumes best trade-in: ${bestLabel} (${yen.format(bestAmount)}).`));
  }
}

export async function run(argv: string[]): Promise<void> {
  const program = new Command();
  const version = await loadPackageVersion();

  program
    .name("macleap")
    .description("Detect your Mac, find equal-or-better current models, estimate net upgrade cost.")
    .version(version, "-v, --version", "Show version")
    .option("--json", "Output machine-readable JSON");

  program
    .command("detect", { isDefault: true })
    .description("Show current Mac specs")
    .action(async () => {
      await cmdDetect(program.opts<CommonFlags>());
    });

  program
    .command("suggest")
    .description("Suggest equal-or-better current models")
    .option("-b, --budget <yen>", "Maximum price (e.g. 400000)")
    .option("--allow-smaller-screen", "Allow smaller screens in suggestions")
    .option("--limit <n>", "Limit number of results", "10")
    .option("--all", "Show all matches, no limit")
    .action(async (cmdFlags: SuggestFlags) => {
      await cmdSuggest({ ...program.opts<CommonFlags>(), ...cmdFlags });
    });

  program
    .command("tradein")
    .description("Estimate trade-in value for current Mac")
    .option("-c, --condition <state>", "Condition: asNew | good | fair", "asNew")
    .action(async (cmdFlags: TradeinFlags) => {
      await cmdTradein({ ...program.opts<CommonFlags>(), ...cmdFlags });
    });

  program
    .command("plan")
    .description("Combined: suggest + trade-in with net upgrade cost")
    .option("-b, --budget <yen>", "Maximum price (e.g. 400000)")
    .option("-c, --condition <state>", "Condition: asNew | good | fair", "asNew")
    .option("--allow-smaller-screen", "Allow smaller screens in suggestions")
    .option("--limit <n>", "Limit number of results", "10")
    .option("--all", "Show all matches, no limit")
    .action(async (cmdFlags: PlanFlags) => {
      await cmdPlan({ ...program.opts<CommonFlags>(), ...cmdFlags });
    });

  await program.parseAsync(argv, { from: "user" });
}
