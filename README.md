# type-gens-bp

First-draft wiki for building a browser-based kinetic type animation inspired by
the attached sequence and the interaction model of
[Space Type Generator](https://spacetypegenerator.com/).

The target effect:

1. A text phrase starts as a highly pixelated, abstract block shape.
2. The pixels progressively subdivide into smaller cells.
3. Intermediate stages reveal partial letter structure with glitch-like gaps.
4. The animation resolves into crisp, full-resolution text.
5. Designers can tune text, timing, easing, and pixelation per stage.

This document is intentionally a planning reference before implementation. It
should guide the first p5.js/WebGL prototype and become the project wiki as the
system evolves.

---

## Current prototype

The repository now includes a first runnable p5.js draft:

```text
index.html
src/
  sketch.js
  styles.css
```

The sketch uses:

- p5.js from a CDN,
- lil-gui from a CDN,
- an offscreen `p5.Graphics` text buffer,
- staged pixel sampling,
- seeded jitter and dropout,
- word-stagger reveal,
- live controls for text, timeline, reveal behavior, and per-stage pixelation.

### Run locally

Because browser security rules can restrict local file loading, serve the folder
through a local HTTP server:

```sh
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

No build step is required for the current prototype.

---

## 1. Reference behavior

The provided frame sequence shows a typographic "focus pull":

- **Frame 1:** clean final wordmark style: `hey` with a pixelated `y`.
- **Frames 2-4:** the phrase is mostly unreadable; large black rectangular
  blocks imply letter mass before the actual glyphs appear.
- **Frames 5-6:** the first word is readable while the second word is still
  fragmented.
- **Frames 7-8:** both words resolve, with only small pixel artifacts remaining
  before full clarity.

The important quality is not just "low-res to high-res." It is a staged reveal:
large blocks, partial glyph fragments, readable first word, readable full phrase,
then full-resolution typography.

Space Type Generator is a useful reference because it treats type as a live
visual instrument: text, layout, rendering mode, and animation parameters are
edited through controls. For this project, the same spirit is recommended:
build the effect as a tunable sketch rather than a fixed one-off animation.

---

## 2. Recommended technology

### Recommended first prototype: p5.js in the browser

p5.js is the best starting point for this project because:

- It is fast to iterate on kinetic typography.
- It has built-in text rendering, offscreen buffers, image sampling, and frame
  loops.
- It can run as a simple static web page.
- Designer-facing controls are easy to add with `dat.gui`, `lil-gui`, Tweakpane,
  or custom HTML controls.
- It supports both 2D canvas and WebGL rendering.

For the first draft, use **p5.js with a 2D offscreen text buffer**. Render crisp
text into an offscreen `p5.Graphics`, sample that buffer into square cells, then
draw pixel blocks to the visible canvas.

This gives precise control over:

- pixel size per stage,
- reveal order,
- alpha/threshold behavior,
- block jitter,
- per-word timing,
- final text sharpness.

### When to use p5.js WEBGL

Use `WEBGL` if we want:

- shader-based pixelation,
- 3D camera movement,
- depth, extrusion, or spatial typography,
- GPU post-processing effects,
- many independent text layers at high resolution.

For the attached reference, WebGL is useful but not mandatory. The core effect
can be achieved cleanly in 2D canvas. A strong path is:

1. Build the effect in p5.js 2D.
2. Move pixelation into a fragment shader only if performance or visual style
   demands it.

### Processing

Processing Java mode is good for desktop sketches and gallery workflows, but it
is not the recommended primary target here because the requested output is "for
web." Processing can still be useful for:

- offline experiments,
- exporting reference frames,
- testing typography algorithms.

If the project must live on the web, p5.js is the more direct choice.

### Vanilla Canvas or Three.js alternatives

- **Vanilla Canvas 2D:** more control and less dependency weight, but slower to
  prototype.
- **Three.js:** useful if the type becomes spatial, 3D, or shader-heavy. It is
  likely too much for the first version.
- **PixiJS:** useful for sprite-heavy GPU 2D rendering. Consider it later if the
  animation needs many layers, masks, or post-processing filters.

---

## 3. Core rendering approach

The most reliable method is an offscreen text buffer plus sampled pixel blocks.

### Step A: Render final text offscreen

Create an offscreen graphics buffer:

```js
const textBuffer = createGraphics(width, height);
textBuffer.pixelDensity(1);
textBuffer.background(255);
textBuffer.fill(0);
textBuffer.noStroke();
textBuffer.textFont(font);
textBuffer.textSize(settings.fontSize);
textBuffer.textAlign(CENTER, CENTER);
textBuffer.text(settings.text, width / 2, height / 2);
```

This buffer is the source of truth for the final typography.

### Step B: Sample the buffer into cells

For a given pixelation stage, use a cell size such as `64`, `48`, `32`, `16`,
`8`, `4`, or `1`.

For each grid cell:

1. Sample one or more pixels from the text buffer.
2. Determine whether the cell overlaps black text.
3. Draw a black rectangle if the sampled darkness passes a threshold.

Pseudo-code:

```js
for (let y = 0; y < height; y += cellSize) {
  for (let x = 0; x < width; x += cellSize) {
    const darkness = sampleDarkness(textBuffer, x, y, cellSize);
    if (darkness > threshold) {
      rect(x, y, cellSize, cellSize);
    }
  }
}
```

### Step C: Animate through stages

Define a timeline where each stage has:

- duration,
- cell size,
- threshold,
- opacity,
- jitter,
- reveal mask,
- easing,
- optional word or character delay.

The animation does not need to simply interpolate from one cell size to another.
It can switch stages discretely, which matches the blocky reference frames.

---

## 4. Stage model

Use a staged data structure so the animation is editable without rewriting the
render loop.

```js
const stages = [
  {
    name: "mass",
    start: 0.0,
    end: 0.18,
    cellSize: 72,
    threshold: 0.08,
    jitter: 10,
    reveal: 0.2,
    opacity: 1
  },
  {
    name: "large-blocks",
    start: 0.18,
    end: 0.36,
    cellSize: 48,
    threshold: 0.12,
    jitter: 6,
    reveal: 0.45,
    opacity: 1
  },
  {
    name: "word-one-readable",
    start: 0.36,
    end: 0.58,
    cellSize: 24,
    threshold: 0.18,
    jitter: 3,
    reveal: 0.65,
    opacity: 1
  },
  {
    name: "phrase-readable",
    start: 0.58,
    end: 0.82,
    cellSize: 10,
    threshold: 0.22,
    jitter: 1,
    reveal: 0.9,
    opacity: 1
  },
  {
    name: "full-resolution",
    start: 0.82,
    end: 1.0,
    cellSize: 1,
    threshold: 0.3,
    jitter: 0,
    reveal: 1,
    opacity: 1
  }
];
```

The final stage can draw the original text buffer directly instead of drawing
one-pixel cells. This gives a crisp ending.

---

## 5. Designer knobs

The first interactive version should expose controls for both global behavior
and individual stages.

### Text controls

- `text`: displayed phrase, for example `hey, banco`
- `fontFamily` or uploaded font
- `fontSize`
- `fontWeight`
- `letterSpacing`
- `lineHeight`
- `textAlign`
- `x`
- `y`
- `scale`
- `rotation`

### Timeline controls

- `durationSeconds`
- `play`
- `pause`
- `restart`
- `loop`
- `pingPong`
- `globalProgress`
- `easing`
- `frameRate`

### Pixelation controls

Global:

- `minCellSize`
- `maxCellSize`
- `finalCellSize`
- `pixelShape`: square, rectangle, circle, custom
- `threshold`
- `sampleMode`: center, average, random samples
- `invert`
- `backgroundColor`
- `textColor`

Per stage:

- `enabled`
- `start`
- `end`
- `cellSize`
- `threshold`
- `jitter`
- `opacity`
- `xJitter`
- `yJitter`
- `blockStretchX`
- `blockStretchY`
- `revealAmount`
- `revealDirection`: left-to-right, center-out, random, word-by-word
- `noiseAmount`
- `holdFrames`

### Reveal controls

- `wordDelay`
- `characterDelay`
- `fragmentDropout`
- `fragmentSeed`
- `maskSoftness`
- `firstWordResolveTime`
- `secondWordResolveTime`

These controls are important because the reference sequence resolves the first
word before the full phrase. A good implementation should support staggered
word-level reveal rather than treating the phrase as one uniform texture.

### Export controls

- save PNG frame,
- export frame sequence,
- export animated GIF or WebM if the browser environment supports it,
- copy settings JSON,
- load settings JSON.

---

## 6. Animation timeline proposal

For the attached sequence, start with this timeline:

| Stage | Progress | Visual state | Cell size |
| --- | ---: | --- | ---: |
| 1 | 0.00-0.10 | Large abstract mass, mostly unreadable | 72-96 |
| 2 | 0.10-0.25 | Compact block cluster, tiny hints of stems | 56-72 |
| 3 | 0.25-0.42 | Phrase width expands, still fragmented | 36-48 |
| 4 | 0.42-0.58 | First word begins to read | 20-32 |
| 5 | 0.58-0.74 | `hey,` readable, second word pixelated | 12-20 |
| 6 | 0.74-0.90 | Full phrase readable with artifacts | 6-10 |
| 7 | 0.90-1.00 | Crisp final text | 1 or direct buffer |

This can be driven by normalized progress from `0` to `1`, so the same sequence
works at any duration.

---

## 7. Implementation architecture

Recommended modules for the first app:

```text
src/
  main.js
  sketch.js
  settings.js
  stages.js
  text-buffer.js
  pixel-sampler.js
  timeline.js
  controls.js
  export.js
```

### `settings.js`

Owns global defaults and serializable state.

### `stages.js`

Defines stage presets and utilities for finding the active stage at a given
timeline progress.

### `text-buffer.js`

Handles offscreen rendering of the crisp phrase.

Responsibilities:

- load font,
- apply typography settings,
- measure text,
- draw text to buffer,
- optionally create word-level masks.

### `pixel-sampler.js`

Converts the text buffer into visible pixel blocks.

Responsibilities:

- average darkness in a cell,
- apply threshold,
- apply jitter,
- apply reveal mask,
- draw block shapes.

### `timeline.js`

Maps elapsed time to normalized progress and stage-local progress.

### `controls.js`

Creates GUI controls and exports/imports settings JSON.

### `export.js`

Adds frame capture later. This can wait until the core animation feels right.

---

## 8. Important visual details

### Use seeded randomness

The pixel fragments should feel intentional, not noisy in a distracting way.
Use a seed so the same settings always produce the same animation.

Controls:

- `seed`
- `randomizeSeed`

### Separate "resolution" from "reveal"

Pixel size controls the resolution. Reveal controls which blocks are allowed to
appear. Keeping these separate makes it possible to match the reference:

- large abstract masses,
- missing fragments,
- word-by-word clarity,
- final crisp type.

### Preserve final typography

The final frame should not be a manually approximated pixel grid unless that is
the desired style. Draw the original text buffer directly at the end for the
cleanest full-resolution result.

### Account for pixel density

Call `pixelDensity(1)` for predictable sampling. High-DPI screens can otherwise
make cell sampling inconsistent.

---

## 9. WebGL/shader path

If the 2D prototype is too slow or we want a more advanced look, move the
pixelation into WebGL:

1. Render text to a texture.
2. Pass the texture to a fragment shader.
3. Quantize UV coordinates by cell size.
4. Sample the quantized texture coordinate.
5. Apply threshold and reveal masks in shader.

Shader-style pseudo-code:

```glsl
vec2 pixelUV = floor(vTexCoord / cellSize) * cellSize;
vec4 sampled = texture2D(textTexture, pixelUV);
float darkness = 1.0 - sampled.r;
float visible = step(threshold, darkness);
gl_FragColor = vec4(textColor.rgb, visible);
```

This is more complex to debug, so it should be a second phase unless the first
prototype cannot meet performance or visual requirements.

---

## 10. Suggested first milestone

Build a single-page p5.js sketch that includes:

- text input,
- duration control,
- play/restart,
- 5-7 editable stages,
- per-stage cell size,
- per-stage threshold,
- per-stage jitter,
- word-level reveal timing,
- seeded randomness,
- direct final text render.

This milestone should prove the visual language before adding export tools,
shader versions, or a more elaborate UI.

---

## 11. Open questions

- Should the project prioritize a live editor UI, exportable animation, or both?
- Should the final output be a web embed, GIF/WebM, or image sequence?
- Is the final typography a specific brand font, a system font, or user-uploaded?
- Should stage presets be saved as shareable URLs?
- Should the animation run once and hold, or loop continuously?
- Should the pixel blocks be strictly square, or can they stretch like the
  reference frames?

---

## 12. Current recommendation

Start with **p5.js 2D canvas using an offscreen text buffer**. It is the most
direct way to match the provided reference, expose designer knobs, and keep the
project easy to understand. Use WebGL later if shader-based pixelation, 3D
motion, or high-resolution export becomes necessary.
