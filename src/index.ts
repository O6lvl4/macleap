#!/usr/bin/env node
import { JsonCatalogRepository } from "./infrastructure/catalog/json-catalog-repository.js";
import { SystemProfilerDetector } from "./infrastructure/detection/system-profiler.js";
import { JsonDepreciationRepository } from "./infrastructure/pricing/json-depreciation-repository.js";
import { StaticRegionResolver } from "./infrastructure/region/static-region-resolver.js";
import type { Deps } from "./presentation/cli/deps.js";
import { run } from "./presentation/cli/router.js";

const deps: Deps = {
  detector: new SystemProfilerDetector(),
  catalogs: new JsonCatalogRepository(),
  depreciation: new JsonDepreciationRepository(),
  regions: new StaticRegionResolver(),
  io: {
    out: (text) => process.stdout.write(text),
    err: (text) => process.stderr.write(text),
  },
};

run(deps, process.argv.slice(2)).catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
