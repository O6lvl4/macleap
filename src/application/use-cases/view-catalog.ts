import type { PartsCatalogRepository } from "../ports.js";
import type {
  CatalogRow,
  PartKind,
  PriceObservation,
} from "../../domain/catalog/parts-catalog.js";

export interface ViewCatalogOptions {
  /** 指定した kind だけに絞る。 */
  kind?: PartKind;
}

/**
 * 性能カタログ(items)に、各itemの最新価格(prices)を結合して返す。
 * 「最新」は observedAt の文字列比較で決める(ISO日付なので辞書順=時系列順)。
 */
export async function viewCatalog(
  repo: PartsCatalogRepository,
  options: ViewCatalogOptions = {},
): Promise<CatalogRow[]> {
  const [items, prices] = await Promise.all([
    repo.loadItems(),
    repo.loadPrices(),
  ]);

  const latestByItem = new Map<string, PriceObservation>();
  for (const observation of prices) {
    const current = latestByItem.get(observation.itemId);
    if (!current || observation.observedAt > current.observedAt) {
      latestByItem.set(observation.itemId, observation);
    }
  }

  return items
    .filter((item) => !options.kind || item.kind === options.kind)
    .map((item) => ({ item, latestPrice: latestByItem.get(item.id) }));
}
