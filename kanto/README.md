# KANTO / Champion Loop

This folder contains the standalone GitHub Pages game. Open `/kanto/` from the COSM.OS arcade.

- `index.html`, JavaScript bundles, CSS, and `assets/`: the complete playable release.
- `source/`: editable game source, all 151 competitive sets, tests, and build scripts.
- `licenses/`: included dependency and font notices. Pokémon artwork belongs to its original owners; this is an unaffiliated fan project.

## Rebuild

In `kanto/source`, install Node.js 22 or newer, then run:

```sh
npm ci
python scripts/download-assets.py
python scripts/download-animation-assets.py
npm run build
npm test
node scripts/export-pages.mjs ..
```

The asset download commands require Python 3. The export keeps all URLs relative, so the game runs from the `/kanto/` subfolder without a backend or external battle server. Run `python -m http.server 8000` from the repository root to preview it locally at `http://localhost:8000/kanto/`.

The KANTO workflow repeats these steps and commits the compiled release whenever its source changes on the release branch or main.
