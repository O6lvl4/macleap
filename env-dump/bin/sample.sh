#!/usr/bin/env bash
# sample.sh — 軽量メトリクス1行を metrics.jsonl に追記する。
# 定期実行(launchd)向け。フル dump.sh と違い数十msで終わる。
# prices.jsonl と同じ「追記型・時系列」哲学。傾向は analyze.sh で見る。

set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # env-dump/
OUT="$HERE/metrics.jsonl"
TS="$(date +%Y-%m-%dT%H:%M:%S)"

PAGESIZE=$(vm_stat | awk '/page size of/{print $8}')
FREE=$(vm_stat  | awk '/Pages free/{gsub(/\./,"",$3); print $3}')
INACT=$(vm_stat | awk '/Pages inactive/{gsub(/\./,"",$3); print $3}')
FREEGB=$(awk -v f="${FREE:-0}" -v i="${INACT:-0}" -v p="${PAGESIZE:-4096}" 'BEGIN{printf "%.1f",(f+i)*p/1073741824}')

# swap used を MB に正規化（G/K 単位も吸収）
SWAP=$(sysctl -n vm.swapusage 2>/dev/null | awk '{
  for(i=1;i<=NF;i++) if($i=="used"){v=$(i+2); break}
  u=v; sub(/[0-9.]+/,"",u); n=v; sub(/[A-Za-z]+$/,"",n);
  mult=(u=="G")?1024:(u=="K")?1/1024:1; printf "%.1f", n*mult
}')

LOAD1=$(sysctl -n vm.loadavg 2>/dev/null | awk '{print $2}')
SPEED=$(pmset -g therm 2>/dev/null | awk -F'= ' '/CPU_Speed_Limit/{print $2}' | tr -dc '0-9')
DISKDATA=$(df -h /System/Volumes/Data 2>/dev/null | awk 'NR==2{gsub(/%/,"",$5); print $5}')
TOPMEM=$(ps -Axo %mem,comm 2>/dev/null | sort -rn | awk 'NR==1{c=$2; n=split(c,a,"/"); print a[n]}')

printf '{"ts":"%s","freeMemGB":%s,"swapUsedMB":%s,"load1":%s,"cpuSpeedLimit":%s,"dataDiskPct":%s,"topProc":"%s"}\n' \
  "$TS" "${FREEGB:-null}" "${SWAP:-0}" "${LOAD1:-null}" "${SPEED:-100}" "${DISKDATA:-null}" "${TOPMEM:-unknown}" >> "$OUT"
