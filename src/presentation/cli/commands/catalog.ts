import type { Deps } from "../deps.js";
import type { CatalogFlags } from "../parse.js";
import { viewCatalog } from "../../../application/use-cases/view-catalog.js";
import { renderCatalog } from "../format/catalog-table.js";
import type { PartKind } from "../../../domain/catalog/parts-catalog.js";

export async function catalogCommand(
  deps: Deps,
  flags: CatalogFlags,
): Promise<void> {
  const rows = await viewCatalog(deps.partsCatalogs, {
    kind: flags.kind as PartKind | undefined,
  });
  if (flags.json) {
    deps.io.out(JSON.stringify(rows, null, 2));
    return;
  }
  deps.io.out(renderCatalog(rows));
}
