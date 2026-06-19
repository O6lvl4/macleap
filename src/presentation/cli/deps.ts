import type {
  CatalogRepository,
  DepreciationModelRepository,
  MacDetector,
  PartsCatalogRepository,
  RegionResolver,
} from "../../application/ports.js";

export interface IO {
  out: (text: string) => void;
  err: (text: string) => void;
}

export interface Deps {
  detector: MacDetector;
  catalogs: CatalogRepository;
  partsCatalogs: PartsCatalogRepository;
  depreciation: DepreciationModelRepository;
  regions: RegionResolver;
  io: IO;
}
