#!/usr/bin/env node
import { run } from "./presentation/cli/router.js";
import { SystemProfilerDetector } from "./infrastructure/detection/system-profiler.js";
import { JsonCatalogRepository } from "./infrastructure/catalog/json-catalog-repository.js";
import { JsonPartsCatalogRepository } from "./infrastructure/catalog/json-parts-catalog-repository.js";
import { JsonDepreciationRepository } from "./infrastructure/pricing/json-depreciation-repository.js";
import { StaticRegionResolver } from "./infrastructure/region/static-region-resolver.js";

async function main(): Promise<void> {
  const deps = {
    detector: new SystemProfilerDetector(),
    catalogs: new JsonCatalogRepository(),
    partsCatalogs: new JsonPartsCatalogRepository(),
    depreciation: new JsonDepreciationRepository(),
    regions: new StaticRegionResolver(),
    io: {
      out: (text: string) => process.stdout.write(text + "\n"),
      err: (text: string) => process.stderr.write(text + "\n"),
    },
  };
  await run(deps, process.argv.slice(2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
