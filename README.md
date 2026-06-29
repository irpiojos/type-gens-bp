# Type Chips — Figma Plugin

A local Figma plugin that renders colored shape **chips** from typed text. Each character maps to a chip type and color based on its QWERTY keyboard position.

## Install locally in Figma

1. In Figma: **Plugins → Development → Import plugin from manifest…**
2. Select `manifest.json` from this folder.
3. Run **Plugins → Development → Type Chips**.

## Usage

- Type in the text box (default demo: `BRANDS&PEOP` / `LE`).
- Chips render left-to-right with no padding; half chips leave negative space in the unused 50px band.
- Adjust **Gutter** (px between chips); default is `0`.
- Press **Enter** for a new row.
- Supported characters: `A–Z`, `a–z`, `0–9`, `!@$%&`.

## Chip types

| Type | Size |
|------|------|
| `large-chip` | 200×100 |
| `large-half-top-chip` | 200×50 (↑) |
| `large-half-bottom-chip` | 200×50 (↓) |
| `square-chip` | 100×100 |
| `square-half-top-chip` | 100×50 (↑) |
| `square-half-bottom-chip` | 100×50 (↓) |
| `circle-chip` | 100×100 |

## Decode logic

See the header comment in `chip-map.js` for the full QWERTY type grid and independent color passes.

### Anchor characters (fixed)

| Char | Type | Color |
|------|------|-------|
| B | large-chip | #03BA61 |
| R | large-half-top-chip | #AEEE27 |
| A | square-chip | #FFC933 |
| N | large-chip | #FF4F95 |
| D | large-half-bottom-chip | #815FBA |
| S | large-chip | #B7A0B5 |
| & | circle-chip | #DAC2DC |
| P | large-chip | #DAB894 |
| E | square-chip | #B1F8F2 |
| O | square-half-top-chip | #00B1D8 |
| p | large-chip | #80CFC4 |
| L | large-chip | #FCFF35 |
| e | square-chip | #FD7746 |

## Development

```bash
npm install
npm run build
```

`npm run build` bundles `src/main.js` + `chip-map.js` into `code.js` for the Figma runtime.
