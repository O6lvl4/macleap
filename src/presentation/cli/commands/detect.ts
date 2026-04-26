import { detectMacUseCase } from "../../../application/use-cases/detect-mac.js";
import type { Deps } from "../deps.js";
import { renderMacBlock } from "../format/mac-block.js";
import type { CommonFlags } from "../parse.js";
import { withSpinner } from "../spinner.js";

export async function detectCommand(deps: Deps, flags: CommonFlags): Promise<void> {
  const result = await withSpinner(
    { text: "Detecting current Mac…", successText: "Detected current Mac", silent: flags.json },
    () => detectMacUseCase({ detector: deps.detector }),
  );
  if (flags.json) {
    deps.io.out(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  deps.io.out("\n");
  deps.io.out(`${renderMacBlock(result.detected)}\n`);
}
