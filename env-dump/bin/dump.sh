#!/usr/bin/env bash
# dump.sh — あなたのMac環境を ref として吸い上げるスナップショッター。
#
# 買い替え判断に効く軸だけを集める（ネットワーク情報は不要かつ機微なので取らない）。
# raw/      … 生データ。シリアル等を含むため .gitignore（ローカルのみ）
# sanitized/… マスク済み。commit して ref として参照する
#
# 使い方:  bash env-dump/bin/dump.sh
# 再実行すれば日付ごとに snapshots/<date>/ が増え、後で差分を追える。

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # env-dump/
DATE="$(date +%F)"
RAW="$HERE/snapshots/$DATE/raw"
SAN="$HERE/snapshots/$DATE/sanitized"
mkdir -p "$RAW" "$SAN"

echo "Dumping Mac environment -> snapshots/$DATE ..."

# 1) ハードウェア構成（モデル/チップ/コア/メモリ/シリアル）
system_profiler SPHardwareDataType > "$RAW/hardware.txt" 2>/dev/null

# 2) ディスプレイ/GPU（内蔵GPU・外部モニタ構成）
system_profiler SPDisplaysDataType > "$RAW/displays.txt" 2>/dev/null

# 3) メモリ（容量・スワップ・圧迫＝「次は大容量が要る」の根拠）
{
  echo "## hw.memsize";   sysctl hw.memsize
  echo; echo "## vm.swapusage"; sysctl vm.swapusage
  echo; echo "## vm_stat";  vm_stat
  echo; echo "## SPMemoryDataType"; system_profiler SPMemoryDataType
} > "$RAW/memory.txt" 2>/dev/null

# 4) ストレージ（逼迫度＝「容量も上げるべきか」の根拠）
{
  echo "## df -h"; df -h
  echo; echo "## SPStorageDataType"; system_profiler SPStorageDataType
} > "$RAW/storage.txt" 2>/dev/null

# 5) OS / 稼働
{
  echo "## sw_vers"; sw_vers
  echo; echo "## uptime"; uptime
  echo; echo "## boottime"; sysctl kern.boottime
} > "$RAW/os.txt" 2>/dev/null

# 6) CPU（実コア・負荷平均）
{
  echo "## hw.model"; sysctl hw.model
  echo; echo "## cores"; sysctl hw.ncpu hw.physicalcpu hw.logicalcpu
  echo; echo "## machdep.cpu"; sysctl -a 2>/dev/null | grep machdep.cpu
  echo; echo "## load (top)"; top -l 1 -n 0 | head -10
} > "$RAW/cpu.txt" 2>/dev/null

# 7) 熱 / 電源（サーマルスロットリング＝「冷却が効くマシンを」の根拠）
{
  echo "## pmset -g therm"; pmset -g therm
  echo; echo "## pmset -g"; pmset -g
  echo; echo "## battery"; pmset -g batt
} > "$RAW/thermal-power.txt" 2>/dev/null

# 8) 実ワークロード（メモリ/CPUを食っている上位プロセス）
{
  echo "## top processes by MEM"; top -l 1 -o mem -n 15 | tail -n +12
  echo; echo "## top processes by CPU"; top -l 2 -o cpu -n 15 | tail -n 16
} > "$RAW/workload.txt" 2>/dev/null

# 8b) 起動プロセス全リスト（RSS降順・「今まさに動いている全部」をそのまま）
ps -Axo pid,ppid,%cpu,%mem,rss,etime,command 2>/dev/null | sort -k5 -rn > "$RAW/processes.txt"

# 9) 開発環境（重い用途の推定材料）
{
  for t in node npm go rustc cargo python3 docker; do
    printf "%-8s " "$t"
    if command -v "$t" >/dev/null 2>&1; then "$t" --version 2>&1 | head -1; else echo "(not installed)"; fi
  done
  echo; echo "## xcode"; xcode-select -p 2>/dev/null; xcodebuild -version 2>/dev/null | head -2
  echo; echo "## brew formula count"
  if command -v brew >/dev/null 2>&1; then brew list --formula 2>/dev/null | wc -l; else echo "brew not installed"; fi
  echo; echo "## docker running"; docker ps 2>/dev/null | head || echo "(docker not running)"
} > "$RAW/dev-env.txt" 2>/dev/null

# --- sanitize: raw -> sanitized（機微情報をマスク） ---
SERIAL="$(awk -F': ' '/Serial Number/{print $2; exit}' "$RAW/hardware.txt" 2>/dev/null | tr -d ' ')"
UUID="$(awk -F': '  '/Hardware UUID/{print $2; exit}'  "$RAW/hardware.txt" 2>/dev/null | tr -d ' ')"
PUDID="$(awk -F': ' '/Provisioning UDID/{print $2; exit}' "$RAW/hardware.txt" 2>/dev/null | tr -d ' ')"
HOSTC="$(scutil --get ComputerName 2>/dev/null)"
HOSTL="$(hostname 2>/dev/null)"
ME="$(whoami 2>/dev/null)"

redact() {  # $1=src $2=dst
  cp "$1" "$2"
  for pair in "$SERIAL|REDACTED-SERIAL" "$UUID|REDACTED-UUID" "$PUDID|REDACTED-UDID" \
              "$HOSTC|REDACTED-HOST" "$HOSTL|REDACTED-HOST" "$ME|USER"; do
    val="${pair%%|*}"; tag="${pair##*|}"
    [ -n "$val" ] && LC_ALL=C sed -i '' "s|$val|<$tag>|g" "$2" 2>/dev/null
  done
}
for f in "$RAW"/*.txt; do redact "$f" "$SAN/$(basename "$f")"; done

echo "Done."
echo "  raw (gitignored, local only): $RAW"
echo "  sanitized (commit-safe ref):  $SAN"
