# AGENTS.md

## Cursor Cloud specific instructions

### Repository layout

- **`main`** currently contains only a project title in `README.md` (no runnable app).
- The **runnable p5.js prototype** lives on branch `cursor/pixelated-text-animation-readme-f374` (`index.html`, `src/sketch.js`, `src/styles.css`).
- Check out that branch (or merge it) before serving or testing the animation.

### Services

| Service | Required | Command | Port |
|---------|----------|---------|------|
| Static HTTP server | Yes | `python3 -m http.server 8000` (from repo root) | 8000 |

There is no backend, database, Docker, build step, or package manager. Runtime libraries (p5.js, lil-gui) load from jsDelivr CDN — **network access is required** when opening the page.

### Run the app

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000` in a browser.

### Lint / test / build

None configured. No `package.json`, test runner, or linter in this repo. Verification is manual: confirm the canvas animates and lil-gui controls respond.

### Gotchas

- Do not open `index.html` via `file://`; use an HTTP server so scripts and assets load reliably.
- A missing favicon 404 and Canvas2D `willReadFrequently` warnings in the console are expected and non-blocking.
