/**
 * Chip type + color map for the Type Chips Figma plugin.
 *
 * DECODE LOGIC
 * ============
 *
 * 1. CHIP GEOMETRY
 *    - 100px = 1 unit. Chips stack left-to-right with configurable gutter (default 0).
 *    - Each row is 100px tall. Half chips (↑/↓) draw in only 50px; the other 50px is
 *      negative space so the row height stays aligned (see reference layout).
 *
 * 2. CHIP TYPE — QWERTY POSITION GRID
 *    Letters map to (row, col) on a US QWERTY layout:
 *      row 0 → Q W E R T Y U I O P
 *      row 1 → A S D F G H J K L
 *      row 2 → Z X C V B N M
 *    Numbers 1–9,0 share columns 0–9 with the top letter row.
 *    Symbols !@$%& map to shift+1,2,4,5,7 columns (cols 0,1,3,4,6).
 *
 *    Type at each (row, col) is fixed by this grid (verified against all anchor letters):
 *
 *      col:    0        1           2               3              4      5       6           7           8              9
 *      r0:   square   lrg-h-top   square          lrg-h-top      large  sq-h-top sq-h-btm   sq-h-btm    sq-h-top       large
 *      r1:   square   large       lrg-h-btm       square         square large    square     square      large          sq-h-btm
 *      r2:   sq-h-btm square      square          square         large  large    sq-h-top   lrg-h-top   sq-h-btm       large
 *
 *    Anchor verification:
 *      E(r0c2)=square, R(r0c3)=lrg-h-top, O(r0c8)=sq-h-top, P(r0c9)=large
 *      A(r1c0)=square, S(r1c1)=large, D(r1c2)=lrg-h-btm, L(r1c8)=large
 *      B(r2c4)=large, N(r2c5)=large
 *
 *    Special override: '&' is always circle-chip (shift+7).
 *    Lowercase letters reuse the same type as their uppercase key position.
 *    Numbers reuse row-0 types at the matching column.
 *
 * 3. COLOR — INDEPENDENT PASSES
 *    13 colors cycle in separate permutations per character class so the full map
 *    feels varied. Anchor colors from the spec are pinned; remaining slots are filled
 *    to use all 13 hues across each pass.
 *
 *      Pass A — uppercase A–Z (QWERTY order)
 *      Pass B — lowercase a–z (independent permutation; anchors: e, p)
 *      Pass C — digits 1–9,0 (keyboard order)
 *      Pass D — symbols !@$%& (anchor: & → #DAC2DC)
 */

export const COLORS = [
  '#03BA61',
  '#AEEE27',
  '#FFC933',
  '#FF4F95',
  '#815FBA',
  '#B7A0B5',
  '#DAC2DC',
  '#DAB894',
  '#B1F8F2',
  '#00B1D8',
  '#80CFC4',
  '#FCFF35',
  '#FD7746',
];

export const CHIP_TYPES = {
  LARGE: 'large-chip',
  LARGE_HALF_TOP: 'large-half-top-chip',
  LARGE_HALF_BOTTOM: 'large-half-bottom-chip',
  SQUARE: 'square-chip',
  SQUARE_HALF_TOP: 'square-half-top-chip',
  SQUARE_HALF_BOTTOM: 'square-half-bottom-chip',
  CIRCLE: 'circle-chip',
};

const TYPE_GRID = [
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
    CHIP_TYPES.LARGE,
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
    CHIP_TYPES.SQUARE_HALF_BOTTOM,
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
    CHIP_TYPES.LARGE,
  ],
];

const QWERTY_UPPER = 'QWERTYUIOPASDFGHJKLZXCVBNM';
const QWERTY_LOWER = 'qwertyuiopasdfghjklzxcvbnm';
const DIGITS = '1234567890';
const SYMBOLS = '!@$%&';

// Pass A — uppercase (anchors pinned)
const UPPER_COLOR_PERM = [
  6, 10, 8, 1, 12, 4, 9, 7, 9, 7, 2, 5, 4, 3, 10, 6, 12, 0, 11, 1, 5, 8, 2, 0, 3, 10,
];

// Pass B — lowercase (anchors: e→12, p→10)
const LOWER_COLOR_PERM = [
  9, 3, 12, 8, 1, 11, 4, 0, 5, 10, 7, 2, 6, 9, 12, 3, 11, 5, 8, 4, 0, 10, 7, 1, 5, 2,
];

// Pass C — digits 1–9,0
const DIGIT_COLOR_PERM = [11, 6, 0, 8, 2, 5, 3, 10, 1, 12];

// Pass D — ! @ $ % &
const SYMBOL_COLOR_PERM = [2, 9, 11, 0, 6];

const LETTER_POS = {};
for (let i = 0; i < QWERTY_UPPER.length; i++) {
  const row = i < 10 ? 0 : i < 19 ? 1 : 2;
  const col = i < 10 ? i : i < 19 ? i - 10 : i - 19;
  LETTER_POS[QWERTY_UPPER[i]] = { row, col };
  LETTER_POS[QWERTY_LOWER[i]] = { row, col };
}

const DIGIT_COL = {};
for (let i = 0; i < DIGITS.length; i++) {
  DIGIT_COL[DIGITS[i]] = i;
}

const SYMBOL_COL = { '!': 0, '@': 1, '$': 3, '%': 4, '&': 6 };

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

/** @returns {{ type: string, color: string } | null} */
export function lookupChip(char) {
  if (char === '\n') return { type: 'newline', color: '' };

  const upperIndex = QWERTY_UPPER.indexOf(char);
  if (upperIndex !== -1) {
    const { row, col } = LETTER_POS[char];
    return {
      type: typeForLetter(row, col),
      color: colorForUpper(upperIndex),
    };
  }

  const lowerIndex = QWERTY_LOWER.indexOf(char);
  if (lowerIndex !== -1) {
    const { row, col } = LETTER_POS[char];
    return {
      type: typeForLetter(row, col),
      color: colorForLower(lowerIndex),
    };
  }

  const digitIndex = DIGITS.indexOf(char);
  if (digitIndex !== -1) {
    const col = DIGIT_COL[char];
    return {
      type: TYPE_GRID[0][col],
      color: colorForDigit(digitIndex),
    };
  }

  const symbolIndex = SYMBOLS.indexOf(char);
  if (symbolIndex !== -1) {
    if (char === '&') {
      return { type: CHIP_TYPES.CIRCLE, color: COLORS[6] };
    }
    const col = SYMBOL_COL[char];
    return {
      type: TYPE_GRID[0][col],
      color: colorForSymbol(symbolIndex),
    };
  }

  return null;
}

export const CHIP_WIDTH = {
  [CHIP_TYPES.LARGE]: 200,
  [CHIP_TYPES.LARGE_HALF_TOP]: 200,
  [CHIP_TYPES.LARGE_HALF_BOTTOM]: 200,
  [CHIP_TYPES.SQUARE]: 100,
  [CHIP_TYPES.SQUARE_HALF_TOP]: 100,
  [CHIP_TYPES.SQUARE_HALF_BOTTOM]: 100,
  [CHIP_TYPES.CIRCLE]: 100,
};

export const ROW_HEIGHT = 100;
