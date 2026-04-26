import pc from "picocolors";
import { estimateTradeinUseCase } from "../../../application/use-cases/estimate-tradein.js";
import { chipLabel } from "../../../domain/catalog/chip.js";
import type { Deps } from "../deps.js";
import { renderMacBlock } from "../format/mac-block.js";
import { formatMoney } from "../format/money.js";
import { renderTradeinTable } from "../format/tables.js";
import { header, renderKeyValue, storageLabel } from "../format/text.js";
import type { TradeinFlags } from "../parse.js";
import { withSpinner } from "../spinner.js";

export async function tradeinCommand(deps: Deps, flags: TradeinFlags): Promise<void> {
  const region = deps.regions.resolve(flags.region ?? "jp");

  const result = await withSpinner(
    { text: `Estimating trade-in (${region.label})…`, silent: flags.json },
    () => estimateTradeinUseCase(deps, { region, condition: flags.condition }),
  );

  if (flags.json) {
    deps.io.out(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  deps.io.out("\n");
  deps.io.out(`${renderMacBlock(result.detected)}\n`);
  deps.io.out("\n");

  if (!result.original) {
    deps.io.out(
      `${pc.yellow(`No historical data for ${result.baseline.family} ${result.baseline.screenSizeInch}" ${chipLabel(result.baseline.chip)} in ${region.label}.`)}\n`,
    );
    deps.io.out(
      `${pc.dim(`Add it to data/regions/${region.code}/historical.json to enable trade-in estimation.`)}\n`,
    );
    return;
  }

  deps.io.out(`${header("Matched historical model")}\n`);
  deps.io.out(
    `${renderKeyValue([
      {
        key: "Model",
        value: `${result.original.model.family} ${result.original.model.screenSizeInch}" ${chipLabel(result.original.model.chip)} / ${result.original.config.memoryGB}GB / ${storageLabel(result.original.config.storageGB)}${result.original.exact ? "" : pc.dim(" (closest config)")}`,
      },
      {
        key: "Released",
        value: `${result.original.model.releaseYear}/${String(result.original.model.releaseMonth).padStart(2, "0")}`,
      },
      { key: "Original retail", value: formatMoney(result.original.config.price) },
    ])}\n\n`,
  );
  deps.io.out(
    `${header("Estimated trade-in value")}${pc.dim(` (condition: ${result.condition})`)}\n`,
  );
  deps.io.out(`${renderTradeinTable(result.estimates)}\n`);
  deps.io.out(
    `${pc.dim("Estimates are approximate. Confirm with Apple Trade In or buyback sites.")}\n`,
  );
}
