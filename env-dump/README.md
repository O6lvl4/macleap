# env-dump — あなたのMac環境を ref として吸い上げる

買い替え提案を「一般カタログ比較」でなく **「あなたが実際どう使い、どこで詰まっているか」** を根拠に行うための、
個人環境スナップショット置き場。`data/catalog/`（性能・価格DB）と突き合わせて提案する材料になる。

## 取り方

```sh
bash env-dump/bin/dump.sh
```

`snapshots/<日付>/` が作られる。再実行すれば日付ごとに増え、後で **差分（メモリ逼迫の進行・容量の減り）** を追える。

## 何を集めるか（買い替え判断に効く軸だけ）

| ファイル | 中身 | 何の根拠になるか |
|---|---|---|
| `hardware.txt` | モデル/チップ/コア/メモリ/シリアル | 現状の基準 |
| `displays.txt` | GPU・外部モニタ構成 | GPU/出力要件 |
| `memory.txt` | 容量・**スワップ・圧迫** | 「次は大容量メモリが要る」 |
| `storage.txt` | df・ディスク逼迫度 | 「容量も上げるべきか」 |
| `cpu.txt` | コア・負荷平均 | CPU軸の必要度 |
| `thermal-power.txt` | **サーマルスロットリング**・電源 | 「冷却が効くマシンを」 |
| `workload.txt` | メモリ/CPUを食う上位プロセス | 実ワークロードの指紋 |
| `dev-env.txt` | node/go/rust/docker/xcode/brew | 重い用途の推定 |

ネットワーク情報（IP/WiFi/MAC）は買い替え判断に不要かつ機微なので**最初から取らない**。

## プライバシー方針

- `snapshots/*/raw/` … 生データ。シリアル・UUID・ホスト名・ユーザー名を含むため **`.gitignore`（ローカルのみ）**
- `snapshots/*/sanitized/` … 上記をマスクした版。**commit して ref にする**

`dump.sh` が raw を生成 → 機微値を `<REDACTED-*>` / `<USER>` に置換して sanitized を生成する。
`processes.txt` に「今まさに動いている全プロセス」を RSS 降順で記録する（フルコマンドラインは raw のみ、パス内のユーザー名は sanitized でマスク）。

## 定期サンプリングと傾向分析

フル dump は重い。傾向を追うには **軽量サンプル（数十ms）を高頻度で** 取り、`metrics.jsonl` に1行ずつ貯める。

```sh
bash env-dump/bin/sample.sh     # 1回サンプル → metrics.jsonl に追記
bash env-dump/bin/analyze.sh    # 貯まった時系列の傾向を表示
```

`metrics.jsonl` の1行（`prices.jsonl` と同じ追記型・時系列）:

```json
{"ts":"2026-06-19T13:18:00","freeMemGB":8.0,"swapUsedMB":0,"load1":2.34,"cpuSpeedLimit":100,"dataDiskPct":89,"topProc":"Code Helper"}
```

`analyze.sh` は free メモリの最小値・スワップ発生回数・スロットリング回数・メモリを食う常連プロセスを出し、
**64GB で足りるか 128GB が要るか**のヒントまで返す。ピーク作業中のサンプルが多いほど精度が上がる。

### 30分ごとに自動で取る

```sh
bash env-dump/bin/install-sampler.sh    # launchd に登録（30分間隔・副作用あり）
```

`metrics.jsonl` は高頻度で肥大し常時 dirty になるため `.gitignore`（ローカルのみ）。
傾向の結論を残したいときは `analyze.sh` の出力をスナップショットとして保存する。

