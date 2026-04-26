import type {
  CatalogRepository,
  DepreciationModelRepository,
  MacDetector,
  RegionResolver,
} from "../../application/ports.js";

export interface IO {
  out: (text: string) => void;
  err: (text: string) => void;
}

export interface Deps {
  detector: MacDetector;
  catalogs: CatalogRepository;
  depreciation: DepreciationModelRepository;
  regions: RegionResolver;
  io: IO;
}
