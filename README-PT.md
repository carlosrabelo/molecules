# Visualizador de Moléculas

Visualizador 3D de moléculas para estudo, carregado a partir de arquivos PDB.

## Destaques

- Mostra estruturas moleculares no navegador a partir de arquivos PDB
- Gira, aproxima e troca de molécula pelo teclado ou pelos controles na tela
- Lê fórmula, peso molecular, uma descrição curta e uma curiosidade de cada composto
- Desenha ligações simples, duplas, triplas e aromáticas a partir da geometria
- Colore os átomos com as cores CPK e nomeia o elemento sob o cursor
- Agrupa os compostos em fármaco, droga, biológico, cristal ou carbono
- Abre uma molécula direto com `?mol=caffeine`
- Publica o site estático a partir de `docs/` no GitHub Pages

## Visão Geral

O visualizador é uma adaptação educacional do exemplo [css3d_molecules](https://threejs.org/examples/#css3d_molecules) do Three.js. A interface está em português. Cada composto traz fórmula, peso molecular, descrição e uma curiosidade. A ordem da ligação é inferida da distância entre os átomos e de a ligação estar num anel conjugado.

## Pré-requisitos

- **Um navegador atual** — a página carrega Three.js e lil-gui como módulos ES
- **Python 3** — `make run` serve o site localmente. Módulos ES não abrem em `file://`

## Instalação

```bash
git clone https://github.com/carlosrabelo/molecules.git
cd molecules
make run
```

Abra http://localhost:8000.

## Uso

Abra uma molécula pelo nome. O valor é o nome do arquivo PDB sem `.pdb`:

```bash
# http://localhost:8000/?mol=caffeine
# http://localhost:8000/?mol=aspirin
```

### Teclado

- `← →` — girar em torno de Y
- `↑ ↓` — girar em torno de X
- `Q E` — girar em torno de Z
- `+ -` — aproximar e afastar
- `[ ]` — molécula anterior e seguinte
- `Espaço` — alternar a rotação automática
- `R` — repor a vista
- `F` — alternar tela cheia

### Painéis

O painel de controles escolhe átomos, ligações ou ambos, seleciona a molécula, mostra os símbolos nos átomos e ajusta a velocidade da rotação automática. O cartão inferior esquerdo mostra nome, categoria, fórmula, peso, descrição, curiosidade e a contagem de ligações. A legenda inferior direita lista os elementos da molécula atual. O traço tracejado é uma ligação aromática. Aponte para um átomo para ler o nome.

### Moléculas incluídas

- Fármaco: aspirina
- Droga: cafeína, nicotina, LSD, cocaína
- Biológico: etanol, colesterol, licopeno, glicose
- Cristal: óxido de alumínio, cobre, fluorita, sal, YBCO
- Carbono: cubano, fulereno C60, grafite

### Acrescentar uma molécula

Coloque o arquivo PDB em `src/models/pdb/` e acrescente uma entrada em `moleculas` dentro de `src/molecules.json`:

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

Uma categoria nova também precisa de uma cor em `categorias`, no mesmo arquivo:

```json
"Nova Categoria": "#RRGGBB"
```

Os valores dos campos aparecem na interface em português.

## Estrutura do Projeto

```
src/           # Fonte do site
  index.html
  app.js
  app.css
  main.css
  molecules.json
  jsm/         # Addons do Three.js (controles, loader, renderer)
  models/pdb/  # Arquivos de estrutura molecular
.make/         # Scripts por trás do Makefile
docs/          # Site publicado (gerado; .gitkeep fica depois do make clean)
Makefile
```

## Desenvolvimento

Edite os arquivos em `src/` e atualize o navegador. Rode `make build` antes do push e faça commit de `src/` e de `docs/`.

```bash
make run                              # Serve src/ at http://localhost:8000
make build                            # Copy src/ into docs/ for GitHub Pages
make test                             # Check the catalog and required site files
make quality                          # Run all quality checks
make clean                            # Remove generated files in docs/, keeping .gitkeep
```

No GitHub: **Settings → Pages → Deploy from a branch**, branch `main`, pasta `/docs`. O site fica em https://carlosrabelo.github.io/molecules/. Um link de aula é o mesmo endereço mais a molécula, por exemplo https://carlosrabelo.github.io/molecules/?mol=aspirin.

Three.js 0.180.0 e lil-gui 0.20.0 vêm do jsDelivr.

## Licença

Este projeto está sob a licença MIT — veja [LICENSE](LICENSE) para os detalhes. Ele deriva do exemplo [css3d_molecules](https://threejs.org/examples/#css3d_molecules) do Three.js.
