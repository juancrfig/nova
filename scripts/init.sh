#!/usr/bin/env bash
#
# Nova init — bootstrap Nova on a machine without losing what you already have.
#
#   • symlinks every extension in <repo>/extensions into the Pi user-extensions dir
#   • merges Nova default settings into the Pi global settings, only ADDING keys
#     that are not already present (your existing values always win)
#
# Idempotent & non-destructive: safe to re-run on every machine. Nothing is ever
# removed or overwritten. Override the target dirs for testing with:
#   PI_EXT_DIR=... PI_SETTINGS=... ./scripts/init.sh
#
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT_SRC="$REPO_DIR/extensions"
SETTINGS_DEFAULTS="$REPO_DIR/config/settings.defaults.json"
MERGE_SCRIPT="$REPO_DIR/scripts/merge-settings.mjs"

PI_EXT_DIR="${PI_EXT_DIR:-$HOME/.pi/agent/extensions}"
PI_SETTINGS="${PI_SETTINGS:-$HOME/.pi/agent/settings.json}"

echo "Nova init — repo: $REPO_DIR"

# ---------------------------------------------------------------- extensions
echo
echo "Extensions:"
if [ -d "$EXT_SRC" ]; then
  mkdir -p "$PI_EXT_DIR"
  linked=0
  for ext in "$EXT_SRC"/*/; do
    [ -e "$ext" ] || continue
    name="$(basename "$ext")"
    link="$PI_EXT_DIR/$name"
    if [ -L "$link" ] && [ "$(readlink "$link")" = "$ext" ]; then
      printf '  ✓ %-28s already linked\n' "$name"
    elif [ -e "$link" ] || [ -L "$link" ]; then
      printf '  ✗ %-28s exists and is not this repo  (skipped — not clobbering)\n' "$name"
    else
      ln -s "$ext" "$link"
      printf '  ✓ %-28s linked\n' "$name"
      linked=$((linked + 1))
    fi
  done
  echo "  ($linked new)"
else
  echo "  (no extensions/ directory found)"
fi

# ------------------------------------------------------------------- settings
echo
echo "Settings (merging defaults, keeping your values):"
if [ -f "$SETTINGS_DEFAULTS" ]; then
  node "$MERGE_SCRIPT" "$PI_SETTINGS" "$SETTINGS_DEFAULTS"
else
  echo "  (no $SETTINGS_DEFAULTS — nothing to merge)"
fi

echo
echo "Done. Start a fresh Pi (or run /reload) to load the extensions."
