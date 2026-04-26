import { Command } from "commander";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Deps } from "./deps.js";
import { detectCommand } from "./commands/detect.js";
import { suggestCommand } from "./commands/suggest.js";
import { tradeinCommand } from "./commands/tradein.js";
import { planCommand } from "./commands/plan.js";
import type { CommonFlags, PlanFlags, SuggestFlags, TradeinFlags } from "./parse.js";

async function loadVersion(): Promise<string> {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgPath = resolve(here, "..", "..", "..", "package.json");
  const raw = await readFile(pkgPath, "utf-8");
  return (JSON.parse(raw) as { version: string }).version;
}

export async function run(deps: Deps, argv: string[]): Promise<void> {
  const program = new Command();
  const version = await loadVersion();

  program
    .name("macleap")
    .description("Detect your Mac, find equal-or-better current models, estimate net upgrade cost.")
    .version(version, "-v, --version", "Show version")
    .option("--json", "Output machine-readable JSON")
    .option("--region <code>", "Market region code (default: jp)", "jp");

  program
    .command("detect", { isDefault: true })
    .description("Show current Mac specs")
    .action(async () => {
      await detectCommand(deps, program.opts<CommonFlags>());
    });

  program
    .command("suggest")
    .description("Suggest equal-or-better current models")
    .option("-b, --budget <amount>", "Maximum price (in region currency, e.g. 400000)")
    .option("--allow-smaller-screen", "Allow smaller screens in suggestions")
    .option("--limit <n>", "Limit number of results", "10")
    .option("--all", "Show all matches, no limit")
    .action(async (cmdFlags: SuggestFlags) => {
      await suggestCommand(deps, { ...program.opts<CommonFlags>(), ...cmdFlags });
    });

  program
    .command("tradein")
    .description("Estimate trade-in value for current Mac")
    .option("-c, --condition <state>", "Condition: asNew | good | fair", "asNew")
    .action(async (cmdFlags: TradeinFlags) => {
      await tradeinCommand(deps, { ...program.opts<CommonFlags>(), ...cmdFlags });
    });

  program
    .command("plan")
    .description("Combined: suggest + trade-in with net upgrade cost")
    .option("-b, --budget <amount>", "Maximum price (in region currency)")
    .option("-c, --condition <state>", "Condition: asNew | good | fair", "asNew")
    .option("--allow-smaller-screen", "Allow smaller screens in suggestions")
    .option("--limit <n>", "Limit number of results", "10")
    .option("--all", "Show all matches, no limit")
    .action(async (cmdFlags: PlanFlags) => {
      await planCommand(deps, { ...program.opts<CommonFlags>(), ...cmdFlags });
    });

  await program.parseAsync(argv, { from: "user" });
}
