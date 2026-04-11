#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

python3 - "$ROOT_DIR/src" << 'PY'
import json
import sys
from pathlib import Path

src = Path(sys.argv[1])
required = [
    "index.html",
    "app.js",
    "app.css",
    "main.css",
    "molecules.json",
    "jsm/controls/TrackballControls.js",
    "jsm/renderers/CSS3DRenderer.js",
    "jsm/loaders/PDBLoader.js",
]
missing = [name for name in required if not (src / name).is_file()]
if missing:
    sys.exit("missing source files: " + ", ".join(missing))

catalog = json.loads((src / "molecules.json").read_text(encoding="utf-8"))
categories = catalog["categorias"]
molecules = catalog["moleculas"]
errors = []
seen = set()
for mol in molecules:
    name = mol["arquivo"]
    if name in seen:
        errors.append(f"duplicate arquivo: {name}")
    seen.add(name)
    if mol["categoria"] not in categories:
        errors.append(f"{name}: unknown categoria {mol['categoria']}")
    pdb = src / "models" / "pdb" / name
    if not pdb.is_file():
        errors.append(f"missing {pdb.relative_to(src)}")
if errors:
    sys.exit("\n".join(errors))
print(f"{len(molecules)} molecules, {len(categories)} categories")
PY
