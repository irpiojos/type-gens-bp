(() => {
  // chip-map.js
  var COLORS = [
    "#03BA61",
    "#AEEE27",
    "#FFC933",
    "#FF4F95",
    "#815FBA",
    "#B7A0B5",
    "#DAC2DC",
    "#DAB894",
    "#B1F8F2",
    "#00B1D8",
    "#80CFC4",
    "#FCFF35",
    "#FD7746"
  ];
  var CHIP_TYPES = {
    LARGE: "large-chip",
    LARGE_HALF_TOP: "large-half-top-chip",
    LARGE_HALF_BOTTOM: "large-half-bottom-chip",
    SQUARE: "square-chip",
    SQUARE_HALF_TOP: "square-half-top-chip",
    SQUARE_HALF_BOTTOM: "square-half-bottom-chip",
    CIRCLE: "circle-chip"
  };
  var TYPE_GRID = [
    [
      CHIP_TYPES.SQUARE,
      CHIP_TYPES.LARGE_HALF_TOP,
      CHIP_TYPES.SQUARE,
      CHIP_TYPES.LARGE_HALF_TOP,
      CHIP_TYPES.LARGE,
      CHIP_TYPES.SQUARE_HALF_TOP,
      CHIP_TYPES.SQUARE_HALF_BOTTOM,
      CHIP_TYPES.SQUARE_HALF_BOTTOM,
      CHIP_TYPES.SQUARE_HALF_TOP,
      CHIP_TYPES.LARGE
    ],
    [
      CHIP_TYPES.SQUARE,
      CHIP_TYPES.LARGE,
      CHIP_TYPES.LARGE_HALF_BOTTOM,
      CHIP_TYPES.SQUARE,
      CHIP_TYPES.SQUARE,
      CHIP_TYPES.LARGE,
      CHIP_TYPES.SQUARE,
      CHIP_TYPES.SQUARE,
      CHIP_TYPES.LARGE,
      CHIP_TYPES.SQUARE_HALF_BOTTOM
    ],
    [
      CHIP_TYPES.SQUARE_HALF_BOTTOM,
      CHIP_TYPES.SQUARE,
      CHIP_TYPES.SQUARE,
      CHIP_TYPES.SQUARE,
      CHIP_TYPES.LARGE,
      CHIP_TYPES.LARGE,
      CHIP_TYPES.SQUARE_HALF_TOP,
      CHIP_TYPES.LARGE_HALF_TOP,
      CHIP_TYPES.SQUARE_HALF_BOTTOM,
      CHIP_TYPES.LARGE
    ]
  ];
  var QWERTY_UPPER = "QWERTYUIOPASDFGHJKLZXCVBNM";
  var QWERTY_LOWER = "qwertyuiopasdfghjklzxcvbnm";
  var DIGITS = "1234567890";
  var SYMBOLS = "!@$%&";
  var UPPER_COLOR_PERM = [
    6,
    10,
    8,
    1,
    12,
    4,
    9,
    7,
    9,
    7,
    2,
    5,
    4,
    3,
    10,
    6,
    12,
    0,
    11,
    1,
    5,
    8,
    2,
    0,
    3,
    10
  ];
  var LOWER_COLOR_PERM = [
    9,
    3,
    12,
    8,
    1,
    11,
    4,
    0,
    5,
    10,
    7,
    2,
    6,
    9,
    12,
    3,
    11,
    5,
    8,
    4,
    0,
    10,
    7,
    1,
    5,
    2
  ];
  var DIGIT_COLOR_PERM = [11, 6, 0, 8, 2, 5, 3, 10, 1, 12];
  var SYMBOL_COLOR_PERM = [2, 9, 11, 0, 6];
  var LETTER_POS = {};
  for (let i = 0; i < QWERTY_UPPER.length; i++) {
    const row = i < 10 ? 0 : i < 19 ? 1 : 2;
    const col = i < 10 ? i : i < 19 ? i - 10 : i - 19;
    LETTER_POS[QWERTY_UPPER[i]] = { row, col };
    LETTER_POS[QWERTY_LOWER[i]] = { row, col };
  }
  var DIGIT_COL = {};
  for (let i = 0; i < DIGITS.length; i++) {
    DIGIT_COL[DIGITS[i]] = i;
  }
  var SYMBOL_COL = { "!": 0, "@": 1, "$": 3, "%": 4, "&": 6 };
  function typeForLetter(row, col) {
    return TYPE_GRID[row][col];
  }
  function colorForUpper(index) {
    return COLORS[UPPER_COLOR_PERM[index]];
  }
  function colorForLower(index) {
    return COLORS[LOWER_COLOR_PERM[index]];
  }
  function colorForDigit(index) {
    return COLORS[DIGIT_COLOR_PERM[index]];
  }
  function colorForSymbol(index) {
    return COLORS[SYMBOL_COLOR_PERM[index]];
  }
  function lookupChip(char) {
    if (char === "\n") return { type: "newline", color: "" };
    const upperIndex = QWERTY_UPPER.indexOf(char);
    if (upperIndex !== -1) {
      const { row, col } = LETTER_POS[char];
      return {
        type: typeForLetter(row, col),
        color: colorForUpper(upperIndex)
      };
    }
    const lowerIndex = QWERTY_LOWER.indexOf(char);
    if (lowerIndex !== -1) {
      const { row, col } = LETTER_POS[char];
      return {
        type: typeForLetter(row, col),
        color: colorForLower(lowerIndex)
      };
    }
    const digitIndex = DIGITS.indexOf(char);
    if (digitIndex !== -1) {
      const col = DIGIT_COL[char];
      return {
        type: TYPE_GRID[0][col],
        color: colorForDigit(digitIndex)
      };
    }
    const symbolIndex = SYMBOLS.indexOf(char);
    if (symbolIndex !== -1) {
      if (char === "&") {
        return { type: CHIP_TYPES.CIRCLE, color: COLORS[6] };
      }
      const col = SYMBOL_COL[char];
      return {
        type: TYPE_GRID[0][col],
        color: colorForSymbol(symbolIndex)
      };
    }
    return null;
  }
  var CHIP_WIDTH = {
    [CHIP_TYPES.LARGE]: 200,
    [CHIP_TYPES.LARGE_HALF_TOP]: 200,
    [CHIP_TYPES.LARGE_HALF_BOTTOM]: 200,
    [CHIP_TYPES.SQUARE]: 100,
    [CHIP_TYPES.SQUARE_HALF_TOP]: 100,
    [CHIP_TYPES.SQUARE_HALF_BOTTOM]: 100,
    [CHIP_TYPES.CIRCLE]: 100
  };
  var ROW_HEIGHT = 100;

  // src/main.js
  var CHIP_GROUP_NAME = "Type Chips Output";
  figma.showUI(__html__, { width: 320, height: 220 });
  figma.ui.onmessage = (msg) => {
    var _a, _b;
    if (msg.type === "render") {
      renderChips((_a = msg.text) != null ? _a : "", (_b = msg.gutter) != null ? _b : 0);
    }
    if (msg.type === "close") {
      figma.closePlugin();
    }
  };
  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    const r = parseInt(value.slice(0, 2), 16) / 255;
    const g = parseInt(value.slice(2, 4), 16) / 255;
    const b = parseInt(value.slice(4, 6), 16) / 255;
    return { r, g, b };
  }
  function createChipNode(type, color) {
    var _a;
    const rgb = hexToRgb(color);
    const fill = [{ type: "SOLID", color: rgb }];
    if (type === "circle-chip") {
      const ellipse = figma.createEllipse();
      ellipse.resize(100, 100);
      ellipse.fills = fill;
      return ellipse;
    }
    const width = (_a = CHIP_WIDTH[type]) != null ? _a : 100;
    const height = type.includes("half") ? 50 : 100;
    const rect = figma.createRectangle();
    rect.resize(width, height);
    rect.fills = fill;
    rect.name = type;
    return rect;
  }
  function slotYOffset(type) {
    if (type.endsWith("half-top-chip")) return 0;
    if (type.endsWith("half-bottom-chip")) return 50;
    return 0;
  }
  function renderChips(text, gutter) {
    var _a;
    const existing = figma.currentPage.findOne(
      (node) => node.type === "FRAME" && node.name === CHIP_GROUP_NAME
    );
    if (existing) existing.remove();
    const frame = figma.createFrame();
    frame.name = CHIP_GROUP_NAME;
    frame.clipsContent = false;
    frame.fills = [];
    frame.layoutMode = "NONE";
    let x = 0;
    let y = 0;
    let rowWidth = 0;
    let maxWidth = 0;
    let rowCount = 1;
    for (const char of text) {
      const chip = lookupChip(char);
      if (!chip) continue;
      if (chip.type === "newline") {
        maxWidth = Math.max(maxWidth, rowWidth);
        x = 0;
        y += ROW_HEIGHT;
        rowWidth = 0;
        rowCount += 1;
        continue;
      }
      const node = createChipNode(chip.type, chip.color);
      const width = (_a = CHIP_WIDTH[chip.type]) != null ? _a : 100;
      const offsetY = slotYOffset(chip.type);
      node.x = x;
      node.y = y + offsetY;
      frame.appendChild(node);
      x += width + gutter;
      rowWidth += width + gutter;
    }
    maxWidth = Math.max(maxWidth, rowWidth > 0 ? rowWidth - gutter : 0);
    frame.resizeWithoutConstraints(Math.max(maxWidth, 1), rowCount * ROW_HEIGHT);
    const center = figma.viewport.center;
    frame.x = center.x - frame.width / 2;
    frame.y = center.y - frame.height / 2;
    figma.currentPage.appendChild(frame);
    figma.currentPage.selection = [frame];
    figma.viewport.scrollAndZoomIntoView([frame]);
  }
})();
