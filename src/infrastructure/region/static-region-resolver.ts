import type { RegionResolver } from "../../application/ports.js";
import { findRegion, SUPPORTED_REGIONS, type MarketRegion } from "../../domain/market/region.js";

export class StaticRegionResolver implements RegionResolver {
  resolve(code: string): MarketRegion {
    const region = findRegion(code.toLowerCase());
    if (!region) {
      const supported = SUPPORTED_REGIONS.map((r) => r.code).join(", ");
      throw new Error(`Unknown region: ${code}. Supported: ${supported}`);
    }
    return region;
  }
}
