#!/usr/bin/env bash
# analyze.sh — metrics.jsonl の傾向を表示する薄いラッパー。
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec python3 "$HERE/bin/analyze.py" "$HERE/metrics.jsonl"
