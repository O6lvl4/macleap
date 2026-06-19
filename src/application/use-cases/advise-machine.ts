import type {
  DetectedMac,
  MacDetector,
  PartsCatalogRepository,
} from "../ports.js";
import { viewCatalog } from "./view-catalog.js";
import type {
  CatalogRow,
  PriceObservation,
} from "../../domain/catalog/parts-catalog.js";

export interface AdviseOptions {
  /** 予算上限(円)。USD価格は usdToJpy で概算換算してから比較する。 */
  budgetJPY?: number;
  /** USD→JPY の概算レート。 */
  usdToJpy?: number;
}

export interface ScoredCandidate {
  row: CatalogRow;
  priceJPY: number | null;
  leadDays: number;
  score: number;
  reasons: string[];
}

export interface Advice {
  current: DetectedMac;
  budgetJPY: number;
  usdToJpy: number;
  ranked: ScoredCandidate[];
}

/** 購入候補とみなす kind（完成機 / Apple完成品）。CPU/GPU/APU 単体は対象外。 */
const PURCHASABLE_KINDS = new Set(["machine", "apple-machine"]);

/**
 * 現在の Mac を検出し、catalog の購入候補を
 * 「予算内・メモリ容量(LLM大容量重視)・即納性」で採点して並べる。
 * 自分用途（両方バランス / LLM大容量死守 / 〜45万 / 即納）の重みで評価する。
 */
export async function adviseMachine(
  detector: MacDetector,
  partsCatalog: PartsCatalogRepository,
  options: AdviseOptions = {},
): Promise<Advice> {
  const budgetJPY = options.budgetJPY ?? 450_000;
  const usdToJpy = options.usdToJpy ?? 150;
  const current = await detector.detect();
  const rows = await viewCatalog(partsCatalog);

  const ranked = rows
    .filter((r) => PURCHASABLE_KINDS.has(r.item.kind) && r.latestPrice)
    .map((r) => scoreCandidate(r, current, budgetJPY, usdToJpy))
    .sort((a, b) => b.score - a.score);

  return { current, budgetJPY, usdToJpy, ranked };
}

function toJPY(price: number, currency: string, usdToJpy: number): number {
  return currency === "JPY" ? price : Math.round(price * usdToJpy);
}

/**
 * 納期を日数に正規化する。即納=0、leadTimeDays はそのまま、
 * leadTimeWeeks "9-10" は平均×7、leadTimeNote("Q4"等の遠い予約)=120、不明な予約=60。
 * これで「35日(Beelink)」と「Q4(Framework)」を連続値で区別できる。
 */
function estimateLeadDays(price: PriceObservation): number {
  const avail = price.availability ?? "";
  if (avail.includes("in-stock")) return 0;
  if (price.leadTimeDays != null) return price.leadTimeDays;
  if (price.leadTimeWeeks) {
    const nums = price.leadTimeWeeks.match(/\d+/g);
    if (nums && nums.length > 0) {
      const avg = nums.reduce((a, b) => a + Number(b), 0) / nums.length;
      return Math.round(avg * 7);
    }
  }
  if (price.leadTimeNote) return 120;
  return 60;
}

function scoreCandidate(
  row: CatalogRow,
  current: DetectedMac,
  budgetJPY: number,
  usdToJpy: number,
): ScoredCandidate {
  const price = row.latestPrice!;
  const priceJPY = toJPY(price.price, price.currency, usdToJpy);
  const leadDays = estimateLeadDays(price);
  const reasons: string[] = [];
  let total = 0;

  // 予算（〜45万に収まるか）
  if (priceJPY <= budgetJPY) {
    total += 30;
    reasons.push(`予算内 (≈¥${priceJPY.toLocaleString("ja-JP")})`);
  } else {
    total -= 50;
    reasons.push(`予算超過 (≈¥${priceJPY.toLocaleString("ja-JP")})`);
  }

  // メモリ容量（LLM大容量重視。現状以上を強く優遇）
  const mem = row.item.specs?.memoryMaxGB ?? row.item.specs?.memoryGB ?? 0;
  if (mem > 0) {
    if (mem >= current.memoryGB) {
      total += Math.min(mem / 4, 40);
      reasons.push(`メモリ ${mem}GB (現状 ${current.memoryGB}GB 以上)`);
    } else {
      total -= 10;
      reasons.push(`メモリ ${mem}GB (現状 ${current.memoryGB}GB 未満)`);
    }
  }

  // 即納性（納期日数で連続評価。即納ほど高得点、遠い予約ほど減る）
  const availScore = Math.max(0, 25 - leadDays / 5);
  total += availScore;
  reasons.push(leadDays === 0 ? "即納" : `納期≈${leadDays}日`);

  return { row, priceJPY, leadDays, score: Math.round(total), reasons };
}
