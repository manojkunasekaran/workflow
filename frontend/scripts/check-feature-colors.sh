#!/bin/sh
# Fail if src/features uses raw Tailwind palette utilities (Phase 2 guard).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PATTERN='(bg|text|border)-(emerald|amber|rose|sky|green|red|blue|yellow|orange|lime|teal|cyan|violet|purple|pink|indigo)-[0-9]'
GLOB='*.tsx'
if rg -q "$PATTERN" "$ROOT/src/features" --glob "$GLOB" 2>/dev/null; then
  echo "Raw palette classes found in src/features (use semantic tokens: success, warning, info, danger):"
  rg "$PATTERN" "$ROOT/src/features" --glob "$GLOB" || true
  exit 1
fi
echo "OK: no blocked raw palette patterns in src/features"
