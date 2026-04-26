import pc from "picocolors";
import { suggestUpgradesUseCase } from "../../../application/use-cases/suggest-upgrades.js";
import type { Deps } from "../deps.js";
import { renderMacBlock } from "../format/mac-block.js";
import { formatMoney } from "../format/money.js";
import { renderSuggestTable } from "../format/tables.js";
import { header } from "../format/text.js";
import { toSuggestOptions, type SuggestFlags } from "../parse.js";
import { withSpinner } from "../spinner.js";

export async function suggestCommand(deps: Deps, flags: SuggestFlags): Promise<void> {
  const region = deps.regions.resolve(flags.region ?? "jp");
  const options = toSuggestOptions(flags, region);

  const result = await withSpinner(
    { text: `Loading ${region.label} catalog…`, silent: flags.json },
    () => suggestUpgradesUseCase(deps, { region, options }),
  );

  if (flags.json) {
    deps.io.out(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  deps.io.out("\n");
  deps.io.out(`${renderMacBlock(result.detected)}\n`);
  deps.io.out("\n");
  const budgetLabel = options.budget
    ? ` ${pc.dim(`(within ${formatMoney(options.budget)})`)}`
    : "";
  deps.io.out(`${header("Equal-or-better current models")}${budgetLabel}\n`);
  deps.io.out(`${pc.dim(`(${region.label} catalog updated ${result.catalog.updatedAt})`)}\n\n`);

  if (result.suggestions.length === 0) {
    deps.io.out(
      `${pc.yellow("No matching current models found. Try --allow-smaller-screen or relax --budget.")}\n`,
    );
    return;
  }

  deps.io.out(`${renderSuggestTable(result.suggestions, null)}\n`);
}
