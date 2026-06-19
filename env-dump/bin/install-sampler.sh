#!/usr/bin/env bash
# install-sampler.sh — 30分ごとの定期サンプリングを launchd に登録する。
# 副作用（ユーザーのLaunchAgentに常駐ジョブ追加）があるため、明示的に実行すること。
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # env-dump/
SAMPLE="$HERE/bin/sample.sh"
PLIST_SRC="$HERE/launchd/com.o6lvl4.macleap.envsample.plist.template"
DEST="$HOME/Library/LaunchAgents/com.o6lvl4.macleap.envsample.plist"

mkdir -p "$HOME/Library/LaunchAgents"
sed "s|__SAMPLE_SH__|$SAMPLE|g" "$PLIST_SRC" > "$DEST"
launchctl unload "$DEST" 2>/dev/null || true
launchctl load "$DEST"

echo "✅ 登録完了。30分ごとに sample.sh が走り metrics.jsonl に1行追記されます。"
echo "   傾向を見る: bash $HERE/bin/analyze.sh"
echo "   停止:       launchctl unload $DEST && rm $DEST"
echo "   間隔変更:   plist の StartInterval(秒) を編集して再登録"
