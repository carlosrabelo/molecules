#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT_DIR/src"
DEST="$ROOT_DIR/docs"

mkdir -p "$DEST"
find "$DEST" -mindepth 1 -maxdepth 1 ! -name '.gitkeep' -exec rm -rf {} +
: > "$DEST/.gitkeep"

cp "$SRC/index.html" "$SRC/app.js" "$SRC/app.css" "$SRC/main.css" "$SRC/molecules.json" "$DEST/"
cp -a "$SRC/jsm" "$SRC/models" "$DEST/"
: > "$DEST/.nojekyll"

echo "Site published to $DEST"
