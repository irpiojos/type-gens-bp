const CANVAS_ROOT_ID = "sketch-root";

const settings = {
  text: "hey, banco",
  fontFamily: "Helvetica",
  fontSize: 158,
  fontWeight: 400,
  letterSpacing: -4,
  textX: 0,
  textY: 0,
  backgroundColor: "#ffffff",
  textColor: "#000000",
  durationSeconds: 4.8,
  playing: true,
  loop: true,
  progress: 0,
  easing: "easeInOutCubic",
  revealMode: "word stagger",
  wordDelay: 0.22,
  revealSoftness: 0.08,
  sampleGrid: 3,
  seed: 137,
  crispProgress: 0.92,
  showStageLabel: true
};

const stages = [
  {
    name: "mass",
    start: 0,
    end: 0.12,
    cellFrom: 98,
    cellTo: 78,
    threshold: 0.02,
    jitter: 18,
    stretchX: 1.38,
    stretchY: 1.02,
    revealFrom: 0.06,
    revealTo: 0.2,
    dropout: 0.08
  },
  {
    name: "compact blocks",
    start: 0.12,
    end: 0.28,
    cellFrom: 76,
    cellTo: 52,
    threshold: 0.04,
    jitter: 12,
    stretchX: 1.28,
    stretchY: 0.96,
    revealFrom: 0.18,
    revealTo: 0.42,
    dropout: 0.14
  },
  {
    name: "wide fragments",
    start: 0.28,
    end: 0.46,
    cellFrom: 46,
    cellTo: 28,
    threshold: 0.08,
    jitter: 8,
    stretchX: 1.14,
    stretchY: 0.98,
    revealFrom: 0.32,
    revealTo: 0.62,
    dropout: 0.18
  },
  {
    name: "first word",
    start: 0.46,
    end: 0.64,
    cellFrom: 26,
    cellTo: 15,
    threshold: 0.12,
    jitter: 4,
    stretchX: 1.04,
    stretchY: 1,
    revealFrom: 0.56,
    revealTo: 0.78,
    dropout: 0.12
  },
  {
    name: "phrase",
    start: 0.64,
    end: 0.82,
    cellFrom: 14,
    cellTo: 7,
    threshold: 0.16,
    jitter: 2,
    stretchX: 1,
    stretchY: 1,
    revealFrom: 0.76,
    revealTo: 0.94,
    dropout: 0.06
  },
  {
    name: "resolve",
    start: 0.82,
    end: 1,
    cellFrom: 7,
    cellTo: 2,
    threshold: 0.2,
    jitter: 0,
    stretchX: 1,
    stretchY: 1,
    revealFrom: 0.94,
    revealTo: 1,
    dropout: 0
  }
];

const easeOptions = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
};

let root;
let textBuffer;
let gui;
let animationStartMs = 0;
let pausedProgress = 0;
let textDirty = true;
let layout = {
  chars: [],
  words: [],
  textLeft: 0,
  textRight: 0,
  textTop: 0,
  textBottom: 0
};

function setup() {
  pixelDensity(1);
  root = document.getElementById(CANVAS_ROOT_ID);

  const { width, height } = getCanvasSize();
  const canvas = createCanvas(width, height);
  canvas.parent(CANVAS_ROOT_ID);

  textBuffer = createGraphics(width, height);
  textBuffer.pixelDensity(1);

  animationStartMs = millis();
  createControls();
}

function draw() {
  const progress = updateProgress();
  const stageState = getStageState(progress);

  if (textDirty) {
    renderTextBuffer();
  }

  background(settings.backgroundColor);

  if (settings.crispProgress < 1 && progress >= settings.crispProgress) {
    drawCrispText(progress);
  } else {
    drawPixelText(stageState, progress);
  }

  if (settings.showStageLabel) {
    drawStageLabel(stageState, progress);
  }
}

function windowResized() {
  const { width, height } = getCanvasSize();
  resizeCanvas(width, height);
  textBuffer.resizeCanvas(width, height);
  markTextDirty();
}

function getCanvasSize() {
  const bounds = root?.getBoundingClientRect();
  return {
    width: Math.max(320, Math.floor(bounds?.width || windowWidth)),
    height: Math.max(320, Math.floor(bounds?.height || windowHeight))
  };
}

function updateProgress() {
  if (settings.playing) {
    const durationMs = Math.max(0.1, settings.durationSeconds) * 1000;
    const elapsed = millis() - animationStartMs;
    let nextProgress = elapsed / durationMs;

    if (settings.loop) {
      nextProgress %= 1;
    } else {
      nextProgress = Math.min(1, nextProgress);
      if (nextProgress >= 1) {
        settings.playing = false;
      }
    }

    settings.progress = nextProgress;
  } else {
    settings.progress = constrain(settings.progress, 0, 1);
    pausedProgress = settings.progress;
  }

  return settings.progress;
}

function restartAnimation() {
  animationStartMs = millis();
  pausedProgress = 0;
  settings.progress = 0;
  settings.playing = true;
}

function syncPlayState(isPlaying) {
  if (isPlaying) {
    const durationMs = Math.max(0.1, settings.durationSeconds) * 1000;
    animationStartMs = millis() - pausedProgress * durationMs;
  } else {
    pausedProgress = settings.progress;
  }
}

function markTextDirty() {
  textDirty = true;
}

function renderTextBuffer() {
  textBuffer.clear();
  applyBufferTextStyle(textBuffer);
  textBuffer.textAlign(LEFT, CENTER);
  textBuffer.noStroke();
  textBuffer.fill(settings.textColor);

  layout = buildTextLayout(textBuffer);

  for (const charInfo of layout.chars) {
    textBuffer.text(charInfo.char, charInfo.x, charInfo.y);
  }

  textBuffer.loadPixels();
  textDirty = false;
}

function applyBufferTextStyle(buffer) {
  buffer.textFont(`${settings.fontFamily}, Arial, sans-serif`);
  buffer.textSize(settings.fontSize);
  buffer.textStyle(NORMAL);
  buffer.drawingContext.font = `${settings.fontWeight} ${settings.fontSize}px ${settings.fontFamily}, Arial, sans-serif`;
}

function buildTextLayout(buffer) {
  const chars = Array.from(settings.text);
  const widths = chars.map((char) => buffer.textWidth(char));
  const trackingTotal = Math.max(0, chars.length - 1) * settings.letterSpacing;
  const textWidthValue = widths.reduce((sum, widthValue) => sum + widthValue, 0) + trackingTotal;
  const startX = width / 2 - textWidthValue / 2 + settings.textX;
  const centerY = height / 2 + settings.textY;
  const charEntries = [];
  const wordEntries = [];
  let currentX = startX;
  let currentWord = null;

  chars.forEach((char, index) => {
    const charWidth = widths[index];
    const entry = {
      char,
      x: currentX,
      y: centerY,
      width: charWidth,
      left: currentX,
      right: currentX + charWidth
    };

    charEntries.push(entry);

    if (char.trim()) {
      if (!currentWord) {
        currentWord = {
          index: wordEntries.length,
          startChar: index,
          endChar: index,
          left: entry.left,
          right: entry.right
        };
      } else {
        currentWord.endChar = index;
        currentWord.right = entry.right;
      }
    } else if (currentWord) {
      wordEntries.push(currentWord);
      currentWord = null;
    }

    currentX += charWidth + settings.letterSpacing;
  });

  if (currentWord) {
    wordEntries.push(currentWord);
  }

  return {
    chars: charEntries,
    words: wordEntries,
    textLeft: startX,
    textRight: startX + textWidthValue,
    textTop: centerY - settings.fontSize * 0.62,
    textBottom: centerY + settings.fontSize * 0.36
  };
}

function getStageState(progress) {
  const stage =
    stages.find((candidate) => progress >= candidate.start && progress < candidate.end) ||
    stages[stages.length - 1];
  const localProgress = normalize(progress, stage.start, stage.end);
  const eased = ease(localProgress);

  return {
    stage,
    localProgress,
    eased,
    cellSize: lerp(stage.cellFrom, stage.cellTo, eased),
    revealAmount: lerp(stage.revealFrom, stage.revealTo, eased)
  };
}

function drawPixelText(stageState, progress) {
  const { stage, cellSize, revealAmount, localProgress } = stageState;
  const cell = Math.max(2, Math.round(cellSize));
  const alpha = 255;

  noStroke();
  fillWithAlpha(settings.textColor, alpha);

  const left = Math.max(0, Math.floor(layout.textLeft - cell * 2));
  const right = Math.min(width, Math.ceil(layout.textRight + cell * 2));
  const top = Math.max(0, Math.floor(layout.textTop - cell * 2));
  const bottom = Math.min(height, Math.ceil(layout.textBottom + cell * 2));
  const startX = Math.floor(left / cell) * cell;
  const startY = Math.floor(top / cell) * cell;
  const dropoutAmount = stage.dropout * (1 - localProgress * 0.55);

  for (let y = startY; y <= bottom; y += cell) {
    for (let x = startX; x <= right; x += cell) {
      const darkness = sampleDarkness(x, y, cell);

      if (darkness < stage.threshold) {
        continue;
      }

      const centerX = x + cell / 2;
      const centerY = y + cell / 2;

      if (!passesReveal(centerX, centerY, revealAmount, progress)) {
        continue;
      }

      if (seededNoise(x, y, settings.seed + 19) < dropoutAmount) {
        continue;
      }

      const jitterX = mapSeededNoise(x, y, settings.seed + 31, -stage.jitter, stage.jitter);
      const jitterY = mapSeededNoise(x, y, settings.seed + 47, -stage.jitter, stage.jitter);
      const blockW = Math.max(1, cell * stage.stretchX);
      const blockH = Math.max(1, cell * stage.stretchY);

      rect(Math.round(x + jitterX), Math.round(y + jitterY), blockW, blockH);
    }
  }
}

function drawCrispText(progress) {
  const fadeProgress = normalize(progress, settings.crispProgress, 1);
  const alpha = settings.loop && progress < 0.05 ? 0 : 255 * easeOptions.easeOutQuad(fadeProgress);

  tint(255, alpha);
  image(textBuffer, 0, 0);
  noTint();
}

function sampleDarkness(x, y, size) {
  const grid = Math.max(1, Math.round(settings.sampleGrid));
  let total = 0;
  let count = 0;

  for (let gy = 0; gy < grid; gy += 1) {
    for (let gx = 0; gx < grid; gx += 1) {
      const sampleX = Math.floor(x + ((gx + 0.5) / grid) * size);
      const sampleY = Math.floor(y + ((gy + 0.5) / grid) * size);

      if (sampleX < 0 || sampleX >= width || sampleY < 0 || sampleY >= height) {
        continue;
      }

      const pixelIndex = 4 * (sampleY * width + sampleX);
      const alpha = textBuffer.pixels[pixelIndex + 3] || 0;
      total += alpha / 255;
      count += 1;
    }
  }

  return count ? total / count : 0;
}

function passesReveal(x, y, revealAmount, progress) {
  const mode = settings.revealMode;
  const softenedReveal =
    revealAmount + mapSeededNoise(x, y, settings.seed + 71, -settings.revealSoftness, settings.revealSoftness);

  if (mode === "random") {
    return seededNoise(x, y, settings.seed + 83) <= softenedReveal;
  }

  if (mode === "center out") {
    const centerDistance = Math.abs(x - width / 2) / Math.max(width / 2, 1);
    return centerDistance <= softenedReveal;
  }

  if (mode === "word stagger") {
    return passesWordReveal(x, softenedReveal);
  }

  const globalX = normalize(x, layout.textLeft, layout.textRight);
  return globalX <= softenedReveal;
}

function passesWordReveal(x, revealAmount) {
  if (!layout.words.length) {
    return true;
  }

  const word =
    layout.words.find((candidate) => x >= candidate.left && x <= candidate.right) ||
    nearestWord(x);
  const maxDelay = settings.wordDelay * Math.max(0, layout.words.length - 1);
  const availableRange = Math.max(0.001, 1 - maxDelay);
  const wordStart = word.index * settings.wordDelay;
  const wordProgress = constrain((revealAmount - wordStart) / availableRange, 0, 1);
  const xInWord = normalize(x, word.left, word.right);

  return xInWord <= wordProgress;
}

function nearestWord(x) {
  return layout.words.reduce((nearest, candidate) => {
    const nearestDistance = Math.min(Math.abs(x - nearest.left), Math.abs(x - nearest.right));
    const candidateDistance = Math.min(Math.abs(x - candidate.left), Math.abs(x - candidate.right));
    return candidateDistance < nearestDistance ? candidate : nearest;
  }, layout.words[0]);
}

function drawStageLabel(stageState, progress) {
  push();
  noStroke();
  fill(20, 160);
  textFont("ui-monospace, SFMono-Regular, Menlo, Consolas, monospace");
  textSize(12);
  textAlign(LEFT, BOTTOM);
  text(
    `${stageState.stage.name} | ${nf(progress, 1, 2)} | cell ${Math.round(stageState.cellSize)}px`,
    18,
    height - 18
  );
  pop();
}

function createControls() {
  if (!window.lil?.GUI) {
    return;
  }

  gui = new window.lil.GUI({ title: "Pixel type controls" });

  const textFolder = gui.addFolder("Text");
  textFolder.add(settings, "text").name("text").onChange(markTextDirty);
  textFolder.add(settings, "fontFamily").name("font").onChange(markTextDirty);
  textFolder.add(settings, "fontWeight", 100, 900, 100).name("weight").onChange(markTextDirty);
  textFolder.add(settings, "fontSize", 24, 260, 1).name("size").onChange(markTextDirty);
  textFolder.add(settings, "letterSpacing", -24, 32, 1).name("tracking").onChange(markTextDirty);
  textFolder.add(settings, "textX", -360, 360, 1).name("x").onChange(markTextDirty);
  textFolder.add(settings, "textY", -240, 240, 1).name("y").onChange(markTextDirty);
  textFolder.addColor(settings, "textColor").name("color").onChange(markTextDirty);
  textFolder.addColor(settings, "backgroundColor").name("background");

  const timelineFolder = gui.addFolder("Timeline");
  timelineFolder
    .add(settings, "playing")
    .name("play")
    .onChange((value) => syncPlayState(value));
  timelineFolder.add(settings, "loop").name("loop");
  timelineFolder.add(settings, "durationSeconds", 0.8, 12, 0.1).name("duration");
  timelineFolder
    .add(settings, "progress", 0, 1, 0.001)
    .name("scrub")
    .listen()
    .onChange((value) => {
      settings.playing = false;
      settings.progress = value;
      pausedProgress = value;
    });
  timelineFolder.add({ restart: restartAnimation }, "restart").name("restart");
  timelineFolder.add(settings, "easing", Object.keys(easeOptions)).name("easing");
  timelineFolder.add(settings, "crispProgress", 0.7, 1, 0.01).name("crisp at");
  timelineFolder.add(settings, "showStageLabel").name("stage label");

  const revealFolder = gui.addFolder("Reveal");
  revealFolder.add(settings, "revealMode", ["word stagger", "left to right", "center out", "random"]);
  revealFolder.add(settings, "wordDelay", 0, 0.45, 0.01).name("word delay");
  revealFolder.add(settings, "revealSoftness", 0, 0.4, 0.01).name("softness");
  revealFolder.add(settings, "sampleGrid", 1, 5, 1).name("samples");
  revealFolder.add(settings, "seed", 1, 999, 1).name("seed");
  revealFolder.add({ randomizeSeed: () => (settings.seed = Math.floor(random(1, 999))) }, "randomizeSeed").name("random seed");

  const stagesFolder = gui.addFolder("Stages");
  stages.forEach((stage, index) => {
    const folder = stagesFolder.addFolder(`${index + 1}. ${stage.name}`);
    folder.add(stage, "start", 0, 1, 0.01).name("start");
    folder.add(stage, "end", 0, 1, 0.01).name("end");
    folder.add(stage, "cellFrom", 2, 140, 1).name("cell from");
    folder.add(stage, "cellTo", 2, 140, 1).name("cell to");
    folder.add(stage, "threshold", 0, 1, 0.01).name("threshold");
    folder.add(stage, "jitter", 0, 36, 1).name("jitter");
    folder.add(stage, "stretchX", 0.5, 2.4, 0.01).name("stretch x");
    folder.add(stage, "stretchY", 0.5, 2.4, 0.01).name("stretch y");
    folder.add(stage, "revealFrom", 0, 1, 0.01).name("reveal from");
    folder.add(stage, "revealTo", 0, 1, 0.01).name("reveal to");
    folder.add(stage, "dropout", 0, 0.6, 0.01).name("dropout");
    folder.close();
  });
  stagesFolder.close();
}

function ease(value) {
  const easing = easeOptions[settings.easing] || easeOptions.linear;
  return easing(constrain(value, 0, 1));
}

function normalize(value, minValue, maxValue) {
  if (Math.abs(maxValue - minValue) < 0.00001) {
    return 0;
  }

  return constrain((value - minValue) / (maxValue - minValue), 0, 1);
}

function seededNoise(x, y, seed) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453123;
  return value - Math.floor(value);
}

function mapSeededNoise(x, y, seed, minValue, maxValue) {
  return lerp(minValue, maxValue, seededNoise(x, y, seed));
}

function fillWithAlpha(hexColor, alpha) {
  const parsed = color(hexColor);
  parsed.setAlpha(alpha);
  fill(parsed);
}
