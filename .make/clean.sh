#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT_DIR/docs"

mkdir -p "$DEST"
find "$DEST" -mindepth 1 -maxdepth 1 ! -name '.gitkeep' -exec rm -rf {} +
: > "$DEST/.gitkeep"
echo "Removed generated files in $DEST"
