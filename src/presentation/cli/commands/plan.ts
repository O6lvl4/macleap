import pc from "picocolors";
import { planUpgradeUseCase } from "../../../application/use-cases/plan-upgrade.js";
import { chipLabel } from "../../../domain/catalog/chip.js";
import type { Deps } from "../deps.js";
import { renderMacBlock } from "../format/mac-block.js";
import { formatMoney } from "../format/money.js";
import { renderSuggestTable, renderTradeinTable } from "../format/tables.js";
import { header, storageLabel } from "../format/text.js";
import { toSuggestOptions, type PlanFlags } from "../parse.js";
import { withSpinner } from "../spinner.js";

export async function planCommand(deps: Deps, flags: PlanFlags): Promise<void> {
  const region = deps.regions.resolve(flags.region ?? "jp");
  const options = toSuggestOptions(flags, region);

  const result = await withSpinner(
    { text: `Planning upgrade (${region.label})…`, silent: flags.json },
    () => planUpgradeUseCase(deps, { region, options, condition: flags.condition }),
  );

  if (flags.json) {
    deps.io.out(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  deps.io.out("\n");
  deps.io.out(`${renderMacBlock(result.detected)}\n`);

  if (result.original) {
    deps.io.out("\n");
    deps.io.out(`${header("Trade-in estimate")}${pc.dim(` (condition: ${result.condition})`)}\n`);
    deps.io.out(
      `${pc.dim(
        `Matched ${result.original.model.family} ${result.original.model.screenSizeInch}" ${chipLabel(result.original.model.chip)} / ${result.original.config.memoryGB}GB / ${storageLabel(result.original.config.storageGB)} (${result.original.model.releaseYear}/${String(result.original.model.releaseMonth).padStart(2, "0")}, retail ${formatMoney(result.original.config.price)})`,
      )}\n`,
    );
    deps.io.out(`${renderTradeinTable(result.estimates)}\n`);
  } else {
    deps.io.out("\n");
    deps.io.out(`${pc.yellow("No historical data found — net cost will equal sticker price.")}\n`);
  }

  deps.io.out("\n");
  const budgetLabel = options.budget
    ? ` ${pc.dim(`(within ${formatMoney(options.budget)})`)}`
    : "";
  deps.io.out(
    `${header("Equal-or-better current models — net upgrade cost")}${budgetLabel}\n\n`,
  );

  if (result.suggestions.length === 0) {
    deps.io.out(
      `${pc.yellow("No matching current models found. Try --allow-smaller-screen or relax --budget.")}\n`,
    );
    return;
  }

  deps.io.out(`${renderSuggestTable(result.suggestions, result.best)}\n`);

  if (result.best) {
    deps.io.out("\n");
    deps.io.out(
      `${pc.dim(`Net cost assumes best trade-in: ${result.best.channelLabel} (${formatMoney(result.best.amount)}).`)}\n`,
    );
  }
}
