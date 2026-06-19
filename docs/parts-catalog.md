# Parts Catalog — 性能と価格を分離して貯めるデータベース

「Mac Studio M4 Max 相当の Linux マシン」のような調査を**次回から一瞬で再現する**ための素材置き場。
用途・予算が変わってもベンチや価格は使い回せるので、パーツ単位で構造化して残す。

## 設計の核：2テーブル分離

| ファイル | 中身 | 変化速度 | 形式 |
|---|---|---|---|
| `data/catalog/items.json` | 性能（specs / GB6 / LLM tok/s / 帯域 …） | ほぼ不変 | JSON |
| `data/catalog/prices.jsonl` | 価格の観測ログ（その日いくらだったか） | 日次〜週次で変動 | JSON Lines（追記型） |

両者は `itemId` で結合する。

**なぜ分けるか**：性能は一度測れば不変、価格は GPU 高騰の例（RTX 5090 が MSRP $1,999 → 2026-06 に $4,329）のように激しく動く。
同一レコードに同居させると、価格更新のたびにスペック定義を触ることになり汚染する。
（既存の `data/regions/jp/lineup.json` は `priceJPY` を config に内包しており、これがその弱点。将来この catalog 側へ価格を寄せられる。）

## Apple完成品も x86 パーツも同じ抽象

`items[].kind` で区別する：

- `apple-machine` — Apple完成品（部品選択不可の単一ユニット）
- `apu` — x86 統合APU（Ryzen AI Max+ 395 等）
- `cpu` / `gpu` — x86 単体パーツ
- `machine` — Linux完成機。`components[]` で内蔵パーツ id を参照

これで「Apple完成品枠」と「自作パーツ枠」を1つのカタログで横断比較できる。

## 運用ルール

1. **新しく価格を調べたら `prices.jsonl` に1行追記するだけ**。過去の行は消さない（時系列が資産）。
   ```json
   {"itemId":"rtx-5090","observedAt":"2026-09-01","region":"jp","currency":"JPY","price":700000,"availability":"in-stock","sourceUrl":"...","note":"..."}
   ```
2. **性能を追加・更新したら `items.json` の `sources[].measuredAt` に取得月を必ず添える**。ベンチは版で変わるため。
3. `observedAt`・`measuredAt` 無しのデータは信用しない。**日付こそが鮮度の判定基準**。
4. 値が概算・未実測なら `note` に明記（例: 9950X3D の GB6 は `"概算。実測で要更新"`）。

## 将来の発展

- `suggest --target linux` サブコマンドからこの catalog を読み、予算・用途を入力に Linux 構成を再生成
- region 別価格（JPY/USD）を `prices.jsonl` の `region` で束ね、為替・実勢を反映
- `lineup.json` の Apple 価格を `prices.jsonl` へ統合し、データモデルを一本化
