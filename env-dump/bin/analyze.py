#!/usr/bin/env python3
"""analyze.py — metrics.jsonl の時系列から傾向を出す。
メモリの逼迫・スワップ・スロットリングの「実際の頻度」が見え、64 vs 128GB の判断材料になる。"""
import sys, json
from collections import Counter

path = sys.argv[1] if len(sys.argv) > 1 else "metrics.jsonl"
try:
    rows = [json.loads(l) for l in open(path) if l.strip()]
except FileNotFoundError:
    print(f"no metrics yet: {path}  (sample.sh をまず回す)"); sys.exit(0)
if not rows:
    print("no samples"); sys.exit(0)

def col(k): return [r[k] for r in rows if r.get(k) is not None]
fm, sw, ld, sp = col("freeMemGB"), col("swapUsedMB"), col("load1"), col("cpuSpeedLimit")

print(f"samples : {len(rows)}   ({rows[0]['ts']} → {rows[-1]['ts']})")
if fm: print(f"free mem GB : min {min(fm):.1f} / avg {sum(fm)/len(fm):.1f} / max {max(fm):.1f}   ← min が小さいほどメモリ逼迫")
if sw: print(f"swap used MB: max {max(sw):.0f}   swap>0 は {sum(1 for x in sw if x>0)}/{len(sw)} サンプル")
if ld: print(f"load1       : avg {sum(ld)/len(ld):.2f} / max {max(ld):.2f}")
if sp:
    thr = sum(1 for x in sp if x < 100)
    print(f"thermal     : スロットリング(<100) {thr}/{len(sp)} サンプル")
c = Counter(r.get("topProc", "?") for r in rows)
print("top mem-hog : " + ", ".join(f"{k}×{v}" for k, v in c.most_common(5)))
dd = col("dataDiskPct")
if dd: print(f"data disk % : 最新 {dd[-1]}")

# メモリ判断のヒント
if fm:
    worst = min(fm)
    hint = ("128GB推奨(空きが恒常的に逼迫)" if worst < 4 or (sw and max(sw) > 1000)
            else "64GBで十分(空きに余裕)" if worst > 12
            else "64GB基準・LLM併用なら128GB")
    print(f"\nMEM HINT    : {hint}  ※ピーク作業中のサンプルが多いほど精度↑")
