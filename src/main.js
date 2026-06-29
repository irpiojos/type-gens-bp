import { lookupChip, CHIP_WIDTH, ROW_HEIGHT } from '../chip-map.js';

const CHIP_GROUP_NAME = 'Type Chips Output';

figma.showUI(__html__, { width: 320, height: 220 });

figma.ui.onmessage = (msg) => {
  if (msg.type === 'render') {
    renderChips(msg.text ?? '', msg.gutter ?? 0);
  }

  if (msg.type === 'close') {
    figma.closePlugin();
  }
};

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return { r, g, b };
}

function createChipNode(type, color) {
  const rgb = hexToRgb(color);
  const fill = [{ type: 'SOLID', color: rgb }];

  if (type === 'circle-chip') {
    const ellipse = figma.createEllipse();
    ellipse.resize(100, 100);
    ellipse.fills = fill;
    return ellipse;
  }

  const width = CHIP_WIDTH[type] ?? 100;
  const height = type.includes('half') ? 50 : 100;
  const rect = figma.createRectangle();
  rect.resize(width, height);
  rect.fills = fill;
  rect.name = type;
  return rect;
}

function slotYOffset(type) {
  if (type.endsWith('half-top-chip')) return 0;
  if (type.endsWith('half-bottom-chip')) return 50;
  return 0;
}

function renderChips(text, gutter) {
  const existing = figma.currentPage.findOne(
    (node) => node.type === 'FRAME' && node.name === CHIP_GROUP_NAME
  );
  if (existing) existing.remove();

  const frame = figma.createFrame();
  frame.name = CHIP_GROUP_NAME;
  frame.clipsContent = false;
  frame.fills = [];
  frame.layoutMode = 'NONE';

  let x = 0;
  let y = 0;
  let rowWidth = 0;
  let maxWidth = 0;
  let rowCount = 1;

  for (const char of text) {
    const chip = lookupChip(char);
    if (!chip) continue;

    if (chip.type === 'newline') {
      maxWidth = Math.max(maxWidth, rowWidth);
      x = 0;
      y += ROW_HEIGHT;
      rowWidth = 0;
      rowCount += 1;
      continue;
    }

    const node = createChipNode(chip.type, chip.color);
    const width = CHIP_WIDTH[chip.type] ?? 100;
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
