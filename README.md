# Molecule Viewer

Interactive 3D molecule viewer for study, loaded from PDB files.

## Highlights

- Show molecular structures in the browser from PDB files
- Rotate, zoom, and switch molecules with the keyboard or the on-screen controls
- Read the formula, molecular weight, a short description, and a fact for each compound
- Draw single, double, triple, and aromatic bonds from the geometry
- Color atoms with CPK colors and name the element under the cursor
- Group compounds as pharmaceutical, drug, biological, crystal, or carbon
- Open a molecule directly with `?mol=caffeine`
- Publish the static site from `docs/` for GitHub Pages

## Overview

The viewer is an educational adaptation of the Three.js [css3d_molecules](https://threejs.org/examples/#css3d_molecules) example. The interface is in Portuguese. Each compound carries a formula, a molecular weight, a description, and a fact. Bond order is inferred from interatomic distance and from whether the bond sits in a conjugated ring.

## Prerequisites

- **A current browser** — the page loads Three.js and lil-gui as ES modules
- **Python 3** — `make run` serves the site locally. ES modules do not open from `file://`

## Installation

```bash
git clone https://github.com/carlosrabelo/molecules.git
cd molecules
make run
```

Open http://localhost:8000.

## Usage

Open a molecule by name. The value is the PDB file name without `.pdb`:

```bash
# http://localhost:8000/?mol=caffeine
# http://localhost:8000/?mol=aspirin
```

### Keyboard

- `← →` — rotate around Y
- `↑ ↓` — rotate around X
- `Q E` — rotate around Z
- `+ -` — zoom in and out
- `[ ]` — previous and next molecule
- `Space` — toggle auto-rotation
- `R` — reset the view
- `F` — toggle fullscreen

### On-screen panels

The control panel chooses atoms, bonds, or both, picks a molecule, shows element symbols on the atoms, and sets auto-rotation speed. The lower-left card shows the name, category, formula, weight, description, fact, and bond counts. The lower-right legend lists the elements in the current molecule. A dashed stroke is an aromatic bond. Point at an atom to read its name.

### Included molecules

- Pharmaceutical: aspirin
- Drug: caffeine, nicotine, LSD, cocaine
- Biological: ethanol, cholesterol, lycopene, glucose
- Crystal: aluminum oxide, copper, fluorite, salt, YBCO
- Carbon: cubane, fullerene C60, graphite

### Add a molecule

Put the PDB file in `src/models/pdb/` and add an entry under `moleculas` in `src/molecules.json`:

```json
{
    "arquivo": "molecula.pdb",
    "nome": "Nome da Molécula",
    "formula": "C₆H₁₂O₆",
    "peso": "180,16 g/mol",
    "categoria": "Biológico",
    "descricao": "Descrição da molécula",
    "curiosidade": "Fato interessante sobre a molécula"
}
```

A new category also needs a color under `categorias` in the same file:

```json
"Nova Categoria": "#RRGGBB"
```

Field values are shown in the Portuguese interface.

## Project Layout

```
src/           # Site source
  index.html
  app.js
  app.css
  main.css
  molecules.json
  jsm/         # Three.js addons (controls, loader, renderer)
  models/pdb/  # Molecular structure files
.make/         # Scripts behind the Makefile
docs/          # Published site (generated; .gitkeep stays after make clean)
Makefile
```

## Development

Edit the files in `src/` and refresh the browser. Run `make build` before you push, then commit both `src/` and `docs/`.

```bash
make run                              # Serve src/ at http://localhost:8000
make build                            # Copy src/ into docs/ for GitHub Pages
make test                             # Check the catalog and required site files
make quality                          # Run all quality checks
make clean                            # Remove generated files in docs/, keeping .gitkeep
```

On GitHub: **Settings → Pages → Deploy from a branch**, branch `main`, folder `/docs`. The site is https://carlosrabelo.github.io/molecules/. A class link is the same address plus the molecule, for example https://carlosrabelo.github.io/molecules/?mol=aspirin.

Three.js 0.180.0 and lil-gui 0.20.0 load from jsDelivr.

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details. It is derived from the Three.js [css3d_molecules](https://threejs.org/examples/#css3d_molecules) example.
