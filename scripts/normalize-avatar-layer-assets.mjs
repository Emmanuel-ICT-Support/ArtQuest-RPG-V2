import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(projectRoot, 'public/images/avatar-layers/source');
const outputRoot = path.join(projectRoot, 'public/images/avatar-layers/generated/normalized');
const blankBasePath = path.join(outputRoot, 'base/blank.png');

const TARGET_WIDTH = 1024;
const TARGET_HEIGHT = 1536;
const ALPHA_THRESHOLD = 10;

const SKIN_LAYER_COLORS = {
  amber: { fill: '#d97706', shadow: '#9a5a16', highlight: '#f59e0b' },
  deep_brown: { fill: '#5f3324', shadow: '#3f241a', highlight: '#8b4a2f' },
  fair: { fill: '#f6c99d', shadow: '#c98752', highlight: '#ffd8b2' },
  golden: { fill: '#f2ad63', shadow: '#bf6b34', highlight: '#ffd38a' },
  medium_brown: { fill: '#9a5a36', shadow: '#6f3824', highlight: '#c77b4a' },
  porcelain: { fill: '#f7d7c4', shadow: '#d7a88f', highlight: '#ffe6d7' },
  tan: { fill: '#c98752', shadow: '#855136', highlight: '#e9b07a' },
  warm_beige: { fill: '#d9a06f', shadow: '#a8663f', highlight: '#f4c28e' },
};

const HAIR_RECOLOR_PALETTES = {
  auburn: { shadow: '#5f210b', fill: '#9a3412', highlight: '#d97706' },
  black: { shadow: '#030712', fill: '#111827', highlight: '#4b5563' },
  blonde: { shadow: '#a16207', fill: '#facc15', highlight: '#fde68a' },
  brown: { shadow: '#3f1f13', fill: '#7c2d12', highlight: '#a16207' },
  pink: { shadow: '#831843', fill: '#ec4899', highlight: '#f9a8d4' },
  red: { shadow: '#7f1d1d', fill: '#dc2626', highlight: '#f87171' },
  teal: { shadow: '#134e4a', fill: '#0f766e', highlight: '#5eead4' },
};

const WORD_SPLITS = new Map([
  ['coinpouch', 'coin pouch'],
  ['crystalstaff', 'crystal staff'],
  ['starstaff', 'star staff'],
  ['spikeslong', 'long spikes'],
  ['spikesshort', 'short spikes'],
]);

const PONYTAIL_CANONICAL_SOURCE_PATH = path.join(sourceRoot, 'Asset.Hair/brown/ponytail.brown.png');

const HAND_HOLE_REGIONS = {
  lower_hand: { minX: 0, minY: 610, maxX: 390, maxY: 950 },
  raised_hand: { minX: 620, minY: 430, maxX: 1010, maxY: 830 },
};

const MANUAL_OUTFIT_HAND_COMPONENTS = {
  explorer: {
    raised_hand: { x: 805, y: 585, width: 86, height: 118, transparentOnly: true },
  },
  explorers_jacket: {
    lower_hand: { x: 150, y: 810, width: 70, height: 72, avoidDarkPixels: true },
    raised_hand: { x: 806, y: 535, width: 78, height: 88, avoidDarkPixels: true },
  },
};

const DEFAULT_RAISED_HAND_ANCHOR = { x: 862, y: 619 };

const pngModuleCandidates = [
  'pngjs',
  '/Users/andrew.middleton/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs/lib/png.js',
];

const loadPngModule = async () => {
  const errors = [];

  for (const candidate of pngModuleCandidates) {
    try {
      const module = await import(candidate);
      const PNG = module.PNG || module.default?.PNG || module.default || module['module.exports']?.PNG;
      if (PNG) return PNG;
    } catch (error) {
      errors.push(`${candidate}: ${error.message}`);
    }
  }

  throw new Error(`Could not load pngjs. Tried:\n${errors.join('\n')}`);
};

const PNG = await loadPngModule();

const readDirSafe = async (dir) => {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
};

const collectPngs = async (dir) => {
  const entries = await readDirSafe(dir);
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectPngs(absolutePath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      files.push(absolutePath);
    }
  }

  return files.sort((first, second) => first.localeCompare(second));
};

const slugify = (value) => {
  const cleanValue = WORD_SPLITS.get(value.toLowerCase()) || value;
  return cleanValue
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
};

const stripExtension = (filename) => filename.replace(/\.[^.]+$/, '');

const stripKnownPrefix = (value, prefix) => (
  value.replace(new RegExp(`^${prefix}\\.?\\s*`, 'i'), '').trim()
);

const getHairStyleName = (relativePath) => {
  const filename = path.basename(relativePath).toLowerCase();
  const [styleName] = filename.split('.');
  return styleName;
};

const getHairColorSlug = (relativePath) => {
  const normalizedPath = relativePath.split(path.sep).join('/');
  const [, colorName = 'brown'] = normalizedPath.split('/');
  return slugify(colorName);
};

const getOutfitIdFromPath = (absolutePath) => {
  const rawName = stripKnownPrefix(stripExtension(path.basename(absolutePath)), 'Outfit');
  return slugify(rawName);
};

const getAlphaBounds = (png) => {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const alpha = png.data[(png.width * y + x) * 4 + 3];
      if (alpha > ALPHA_THRESHOLD) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    bottom: maxY + 1,
  };
};

const inferCategory = (relativePath) => {
  const normalizedPath = relativePath.split(path.sep).join('/');
  if (normalizedPath.startsWith('Asset.Faces/')) return 'face';
  if (normalizedPath.startsWith('Asset.Hair/')) return 'hair';
  if (normalizedPath.startsWith('Asset.outfit/')) return 'outfit';
  if (normalizedPath.startsWith('asset.object/')) return 'object';
  return 'default';
};

const containTransform = (png) => {
  const scale = Math.min(TARGET_WIDTH / png.width, TARGET_HEIGHT / png.height);
  return {
    scale,
    offsetX: Math.round((TARGET_WIDTH - png.width * scale) / 2),
    offsetY: Math.round((TARGET_HEIGHT - png.height * scale) / 2),
  };
};

const getHairRig = (relativePath) => {
  const styleName = getHairStyleName(relativePath);

  if (styleName === 'ponytail') {
    return { maxWidth: 470, top: 90, centerX: 548 };
  }
  if (styleName === 'spikeslong') {
    return { maxWidth: 350, top: 64, centerX: 548 };
  }
  if (styleName === 'curls') {
    return { maxWidth: 360, top: 82, centerX: 548 };
  }

  return { maxWidth: 380, top: 82, centerX: 548 };
};

const getTransform = (category, png, bounds, relativePath) => {
  if (!bounds) return containTransform(png);

  if (category === 'hair') {
    const contain = containTransform(png);
    const hairRig = getHairRig(relativePath);
    const scale = Math.min(contain.scale, hairRig.maxWidth / bounds.width);
    return {
      scale,
      offsetX: Math.round(hairRig.centerX - bounds.centerX * scale),
      offsetY: Math.round(hairRig.top - bounds.y * scale),
    };
  }

  if (category === 'face') {
    const targetFaceHeight = 330;
    const targetFaceCenterX = 548;
    const targetFaceCenterY = 300;
    const scale = targetFaceHeight / bounds.height;
    return {
      scale,
      offsetX: Math.round(targetFaceCenterX - bounds.centerX * scale),
      offsetY: Math.round(targetFaceCenterY - bounds.centerY * scale),
    };
  }

  if (category === 'outfit') {
    const targetOutfitHeight = 1000;
    const targetOutfitCenterX = 548;
    const targetOutfitBottom = 1320;
    const scale = targetOutfitHeight / bounds.height;
    return {
      scale,
      offsetX: Math.round(targetOutfitCenterX - bounds.centerX * scale),
      offsetY: Math.round(targetOutfitBottom - bounds.bottom * scale),
    };
  }

  if (category === 'object') {
    const aspectRatio = bounds.height / bounds.width;
    const target = (() => {
      if (aspectRatio > 4) {
        return { maxWidth: 170, maxHeight: 700, centerX: 860, centerY: 760 };
      }
      if (aspectRatio > 2.5) {
        return { maxWidth: 210, maxHeight: 560, centerX: 865, centerY: 700 };
      }
      if (aspectRatio < 1.1) {
        return { maxWidth: 280, maxHeight: 250, centerX: 855, centerY: 650 };
      }
      return { maxWidth: 280, maxHeight: 430, centerX: 865, centerY: 665 };
    })();
    const scale = Math.min(target.maxWidth / bounds.width, target.maxHeight / bounds.height);
    return {
      scale,
      offsetX: Math.round(target.centerX - bounds.centerX * scale),
      offsetY: Math.round(target.centerY - bounds.centerY * scale),
    };
  }

  if (png.width === TARGET_WIDTH && png.height === TARGET_HEIGHT) {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }

  return containTransform(png);
};

const hexToRgba = (hex, alpha = 255) => {
  const value = hex.replace('#', '');
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
    a: alpha,
  };
};

const clonePng = (png) => {
  const clone = new PNG({ width: png.width, height: png.height });
  png.data.copy(clone.data);
  return clone;
};

const mixChannel = (first, second, ratio) => (
  Math.round(first + ((second - first) * ratio))
);

const mixColor = (first, second, ratio) => ({
  r: mixChannel(first.r, second.r, ratio),
  g: mixChannel(first.g, second.g, ratio),
  b: mixChannel(first.b, second.b, ratio),
  a: first.a,
});

const getPixelLuma = (r, g, b) => (
  (0.299 * r) + (0.587 * g) + (0.114 * b)
);

const isGoldAccentPixel = (r, g, b) => (
  r > 140 && g > 80 && b < 90 && r > b * 1.8
);

const getRecoloredPonytailSource = (() => {
  let canonicalSourcePromise;

  return async (relativePath, fallbackSource) => {
    if (getHairStyleName(relativePath) !== 'ponytail') return fallbackSource;

    canonicalSourcePromise ||= readFile(PONYTAIL_CANONICAL_SOURCE_PATH)
      .then(buffer => PNG.sync.read(buffer));

    const canonicalSource = await canonicalSourcePromise;
    const colorSlug = getHairColorSlug(relativePath);
    const palette = HAIR_RECOLOR_PALETTES[colorSlug] || HAIR_RECOLOR_PALETTES.brown;
    const shadow = hexToRgba(palette.shadow);
    const fill = hexToRgba(palette.fill);
    const highlight = hexToRgba(palette.highlight);
    const output = clonePng(canonicalSource);

    for (let index = 0; index < output.data.length; index += 4) {
      const alpha = output.data[index + 3];
      if (alpha <= ALPHA_THRESHOLD) continue;

      const r = output.data[index];
      const g = output.data[index + 1];
      const b = output.data[index + 2];
      const luma = getPixelLuma(r, g, b);

      if (luma < 42 || isGoldAccentPixel(r, g, b)) continue;

      const color = luma < 95
        ? mixColor(shadow, fill, Math.max(0, Math.min(1, (luma - 42) / 53)))
        : mixColor(fill, highlight, Math.max(0, Math.min(1, (luma - 95) / 85)));

      output.data[index] = color.r;
      output.data[index + 1] = color.g;
      output.data[index + 2] = color.b;
    }

    return output;
  };
})();

const drawRect = (png, x, y, width, height, color) => {
  const rgba = typeof color === 'string' ? hexToRgba(color) : color;
  const startX = Math.max(0, Math.round(x));
  const startY = Math.max(0, Math.round(y));
  const endX = Math.min(png.width, Math.round(x + width));
  const endY = Math.min(png.height, Math.round(y + height));

  for (let py = startY; py < endY; py += 1) {
    for (let px = startX; px < endX; px += 1) {
      const index = (png.width * py + px) * 4;
      png.data[index] = rgba.r;
      png.data[index + 1] = rgba.g;
      png.data[index + 2] = rgba.b;
      png.data[index + 3] = rgba.a;
    }
  }
};

const drawOutlinedRect = (png, x, y, width, height, color) => {
  drawRect(png, x, y, width, height, '#111827');
  drawRect(png, x + 16, y + 16, width - 32, height - 32, color.fill);
  drawRect(png, x + width - 42, y + 24, 20, height - 48, color.shadow);
  drawRect(png, x + 28, y + 18, Math.max(18, width / 3), 16, color.highlight);
};

const drawNeck = (png, skinColor) => {
  drawRect(png, 512, 430, 42, 70, skinColor.fill);
  drawRect(png, 518, 438, 18, 14, skinColor.highlight);
  drawRect(png, 542, 462, 8, 26, skinColor.shadow);
  drawRect(png, 518, 492, 30, 8, skinColor.shadow);
};

const drawLowerHand = (png, skinColor) => {
  drawRect(png, 164, 800, 76, 70, '#111827');
  drawRect(png, 176, 810, 52, 48, skinColor.fill);
  drawRect(png, 188, 790, 32, 24, '#111827');
  drawRect(png, 196, 798, 18, 14, skinColor.fill);
  drawRect(png, 184, 816, 24, 16, skinColor.highlight);
  drawRect(png, 214, 836, 10, 18, skinColor.shadow);
};

const drawRaisedHand = (png, skinColor) => {
  drawRect(png, 820, 588, 84, 72, '#111827');
  drawRect(png, 832, 598, 58, 50, skinColor.fill);
  drawRect(png, 846, 578, 28, 26, '#111827');
  drawRect(png, 854, 586, 14, 16, skinColor.fill);
  drawRect(png, 844, 604, 26, 16, skinColor.highlight);
  drawRect(png, 876, 626, 10, 18, skinColor.shadow);
};

const createSkinLayer = (skinColor, layerType = 'combined') => {
  const png = new PNG({ width: TARGET_WIDTH, height: TARGET_HEIGHT });

  if (layerType === 'neck' || layerType === 'combined') {
    drawNeck(png, skinColor);
  }
  if (layerType === 'lowerHand' || layerType === 'combined') {
    drawLowerHand(png, skinColor);
  }
  if (layerType === 'raisedHand' || layerType === 'combined') {
    drawRaisedHand(png, skinColor);
  }

  return png;
};

const isTransparentAt = (png, x, y) => (
  png.data[(png.width * y + x) * 4 + 3] <= ALPHA_THRESHOLD
);

const isDarkPixelAt = (png, x, y) => {
  const index = (png.width * y + x) * 4;
  const alpha = png.data[index + 3];
  if (alpha <= ALPHA_THRESHOLD) return false;
  return getPixelLuma(png.data[index], png.data[index + 1], png.data[index + 2]) < 58;
};

const getLocalIndex = (x, y, region, regionWidth) => (
  ((y - region.minY) * regionWidth) + (x - region.minX)
);

const findTransparentComponents = (png, region) => {
  const regionWidth = region.maxX - region.minX;
  const regionHeight = region.maxY - region.minY;
  const seen = new Uint8Array(regionWidth * regionHeight);
  const components = [];

  for (let y = region.minY; y < region.maxY; y += 1) {
    for (let x = region.minX; x < region.maxX; x += 1) {
      const startIndex = getLocalIndex(x, y, region, regionWidth);
      if (seen[startIndex] || !isTransparentAt(png, x, y)) continue;

      const queue = [{ x, y }];
      const points = [];
      let head = 0;
      let componentMinX = x;
      let componentMinY = y;
      let componentMaxX = x;
      let componentMaxY = y;
      let touchesRegionEdge = false;

      seen[startIndex] = 1;

      while (head < queue.length) {
        const current = queue[head];
        head += 1;

        points.push((current.y * TARGET_WIDTH) + current.x);
        componentMinX = Math.min(componentMinX, current.x);
        componentMinY = Math.min(componentMinY, current.y);
        componentMaxX = Math.max(componentMaxX, current.x);
        componentMaxY = Math.max(componentMaxY, current.y);

        if (
          current.x === region.minX
          || current.x === region.maxX - 1
          || current.y === region.minY
          || current.y === region.maxY - 1
        ) {
          touchesRegionEdge = true;
        }

        const neighbors = [
          { x: current.x + 1, y: current.y },
          { x: current.x - 1, y: current.y },
          { x: current.x, y: current.y + 1 },
          { x: current.x, y: current.y - 1 },
        ];

        for (const neighbor of neighbors) {
          if (
            neighbor.x < region.minX
            || neighbor.x >= region.maxX
            || neighbor.y < region.minY
            || neighbor.y >= region.maxY
          ) {
            continue;
          }

          const neighborIndex = getLocalIndex(neighbor.x, neighbor.y, region, regionWidth);
          if (seen[neighborIndex] || !isTransparentAt(png, neighbor.x, neighbor.y)) continue;

          seen[neighborIndex] = 1;
          queue.push(neighbor);
        }
      }

      components.push({
        points,
        minX: componentMinX,
        minY: componentMinY,
        maxX: componentMaxX + 1,
        maxY: componentMaxY + 1,
        area: points.length,
        touchesRegionEdge,
      });
    }
  }

  return components;
};

const isHandHoleComponent = (component) => {
  const width = component.maxX - component.minX;
  const height = component.maxY - component.minY;

  return (
    !component.touchesRegionEdge
    && component.area >= 30
    && width >= 6
    && height >= 6
    && width <= 140
    && height <= 140
  );
};

const chooseHandHoleComponent = (components, detailLayer) => {
  const candidates = components.filter(isHandHoleComponent);
  if (candidates.length === 0) return null;

  if (detailLayer === 'lower_hand') {
    return candidates.reduce((best, candidate) => {
      const bestCenterX = (best.minX + best.maxX) / 2;
      const candidateCenterX = (candidate.minX + candidate.maxX) / 2;
      const bestCenterY = (best.minY + best.maxY) / 2;
      const candidateCenterY = (candidate.minY + candidate.maxY) / 2;
      const bestScore = bestCenterX + (Math.abs(bestCenterY - 800) * 0.1) - (best.area * 0.001);
      const candidateScore = candidateCenterX + (Math.abs(candidateCenterY - 800) * 0.1) - (candidate.area * 0.001);
      return candidateScore < bestScore ? candidate : best;
    });
  }

  return candidates.reduce((best, candidate) => {
    const bestCenterX = (best.minX + best.maxX) / 2;
    const candidateCenterX = (candidate.minX + candidate.maxX) / 2;
    const bestCenterY = (best.minY + best.maxY) / 2;
    const candidateCenterY = (candidate.minY + candidate.maxY) / 2;
    const bestScore = bestCenterX - (Math.abs(bestCenterY - 620) * 0.1) + (best.area * 0.001);
    const candidateScore = candidateCenterX - (Math.abs(candidateCenterY - 620) * 0.1) + (candidate.area * 0.001);
    return candidateScore > bestScore ? candidate : best;
  });
};

const createManualHandComponent = (png, config) => {
  const points = [];
  const minX = Math.max(0, Math.round(config.x));
  const minY = Math.max(0, Math.round(config.y));
  const maxX = Math.min(TARGET_WIDTH, Math.round(config.x + config.width));
  const maxY = Math.min(TARGET_HEIGHT, Math.round(config.y + config.height));
  const radiusX = Math.max(1, (maxX - minX) / 2);
  const radiusY = Math.max(1, (maxY - minY) / 2);
  const centerX = minX + radiusX;
  const centerY = minY + radiusY;

  for (let y = minY; y < maxY; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      const normalizedX = (x - centerX) / radiusX;
      const normalizedY = (y - centerY) / radiusY;
      if ((normalizedX * normalizedX) + (normalizedY * normalizedY) > 1) continue;
      if (config.transparentOnly && !isTransparentAt(png, x, y)) continue;
      if (config.avoidDarkPixels && isDarkPixelAt(png, x, y)) continue;
      points.push((y * TARGET_WIDTH) + x);
    }
  }

  if (points.length === 0) return null;

  return {
    points,
    minX,
    minY,
    maxX,
    maxY,
    area: points.length,
    touchesRegionEdge: false,
  };
};

const getOutfitHandPixelColor = (component, x, y, skinColor) => {
  const fill = hexToRgba(skinColor.fill);
  const highlight = hexToRgba(skinColor.highlight);
  const shadow = hexToRgba(skinColor.shadow);
  const width = Math.max(1, component.maxX - component.minX - 1);
  const height = Math.max(1, component.maxY - component.minY - 1);
  const relativeX = (x - component.minX) / width;
  const relativeY = (y - component.minY) / height;

  if (relativeY < 0.28 && relativeX < 0.72) return highlight;
  if (relativeX > 0.74 || relativeY > 0.76) return shadow;
  return fill;
};

const createOutfitHandLayer = (component, skinColor) => {
  const output = new PNG({ width: TARGET_WIDTH, height: TARGET_HEIGHT });
  if (!component) return output;

  for (const point of component.points) {
    const x = point % TARGET_WIDTH;
    const y = Math.floor(point / TARGET_WIDTH);
    const color = getOutfitHandPixelColor(component, x, y, skinColor);
    const index = (TARGET_WIDTH * y + x) * 4;

    output.data[index] = color.r;
    output.data[index + 1] = color.g;
    output.data[index + 2] = color.b;
    output.data[index + 3] = color.a;
  }

  return output;
};

const drawScaledNearest = (source, transform) => {
  const output = new PNG({ width: TARGET_WIDTH, height: TARGET_HEIGHT });
  const destStartX = Math.max(0, Math.floor(transform.offsetX));
  const destStartY = Math.max(0, Math.floor(transform.offsetY));
  const destEndX = Math.min(TARGET_WIDTH, Math.ceil(transform.offsetX + source.width * transform.scale));
  const destEndY = Math.min(TARGET_HEIGHT, Math.ceil(transform.offsetY + source.height * transform.scale));

  for (let y = destStartY; y < destEndY; y += 1) {
    const sourceY = Math.floor((y - transform.offsetY) / transform.scale);
    if (sourceY < 0 || sourceY >= source.height) continue;

    for (let x = destStartX; x < destEndX; x += 1) {
      const sourceX = Math.floor((x - transform.offsetX) / transform.scale);
      if (sourceX < 0 || sourceX >= source.width) continue;

      const sourceIndex = (source.width * sourceY + sourceX) * 4;
      const destIndex = (TARGET_WIDTH * y + x) * 4;
      output.data[destIndex] = source.data[sourceIndex];
      output.data[destIndex + 1] = source.data[sourceIndex + 1];
      output.data[destIndex + 2] = source.data[sourceIndex + 2];
      output.data[destIndex + 3] = source.data[sourceIndex + 3];
    }
  }

  return output;
};

const translateLayer = (source, deltaX, deltaY) => {
  const output = new PNG({ width: TARGET_WIDTH, height: TARGET_HEIGHT });
  const offsetX = Math.round(deltaX);
  const offsetY = Math.round(deltaY);

  for (let y = 0; y < TARGET_HEIGHT; y += 1) {
    const targetY = y + offsetY;
    if (targetY < 0 || targetY >= TARGET_HEIGHT) continue;

    for (let x = 0; x < TARGET_WIDTH; x += 1) {
      const targetX = x + offsetX;
      if (targetX < 0 || targetX >= TARGET_WIDTH) continue;

      const sourceIndex = (TARGET_WIDTH * y + x) * 4;
      const alpha = source.data[sourceIndex + 3];
      if (alpha <= ALPHA_THRESHOLD) continue;

      const targetIndex = (TARGET_WIDTH * targetY + targetX) * 4;
      output.data[targetIndex] = source.data[sourceIndex];
      output.data[targetIndex + 1] = source.data[sourceIndex + 1];
      output.data[targetIndex + 2] = source.data[sourceIndex + 2];
      output.data[targetIndex + 3] = alpha;
    }
  }

  return output;
};

const getBoundsCenter = (png, fallback = DEFAULT_RAISED_HAND_ANCHOR) => {
  const bounds = getAlphaBounds(png);

  if (!bounds) return fallback;

  return {
    x: bounds.centerX,
    y: bounds.centerY,
  };
};

const createFrontHairLayer = (hairLayer, relativePath) => {
  const frontLayer = new PNG({ width: TARGET_WIDTH, height: TARGET_HEIGHT });
  const faceCenterX = 548;
  const faceCenterY = 306;
  const faceRadiusX = 174;
  const faceRadiusY = 166;
  const fringeBottom = 245;
  const isPonytail = getHairStyleName(relativePath) === 'ponytail';

  for (let y = 0; y < TARGET_HEIGHT; y += 1) {
    for (let x = 0; x < TARGET_WIDTH; x += 1) {
      const sourceIndex = (TARGET_WIDTH * y + x) * 4;
      const alpha = hairLayer.data[sourceIndex + 3];
      if (alpha <= ALPHA_THRESHOLD) continue;

      const normalizedX = (x - faceCenterX) / faceRadiusX;
      const normalizedY = (y - faceCenterY) / faceRadiusY;
      const insideFaceWindow = (normalizedX * normalizedX) + (normalizedY * normalizedY) < 1;
      const protectedEyeBand = (
        isPonytail
        && insideFaceWindow
        && y >= 260
        && y <= 342
        && x >= 430
        && x <= 664
      );
      const ponytailLeftSideLock = (
        isPonytail
        && x <= 514
        && y >= 166
        && y <= 445
        && !protectedEyeBand
      );
      const ponytailRightSideLock = (
        isPonytail
        && (
          (x >= 560 && y >= 166 && y < 260)
          || (x >= 664 && y >= 260 && y <= 480)
        )
        && !protectedEyeBand
      );
      const keepAsFront = !insideFaceWindow
        || y < fringeBottom
        || ponytailLeftSideLock
        || ponytailRightSideLock;

      if (!keepAsFront) continue;

      frontLayer.data[sourceIndex] = hairLayer.data[sourceIndex];
      frontLayer.data[sourceIndex + 1] = hairLayer.data[sourceIndex + 1];
      frontLayer.data[sourceIndex + 2] = hairLayer.data[sourceIndex + 2];
      frontLayer.data[sourceIndex + 3] = alpha;
    }
  }

  return frontLayer;
};

const normalizeAsset = async (sourcePath) => {
  const relativePath = path.relative(sourceRoot, sourcePath);
  const outputPath = path.join(outputRoot, relativePath);
  const category = inferCategory(relativePath);
  const rawSource = PNG.sync.read(await readFile(sourcePath));
  const source = category === 'hair'
    ? await getRecoloredPonytailSource(relativePath, rawSource)
    : rawSource;
  const bounds = getAlphaBounds(source);
  const transform = getTransform(category, source, bounds, relativePath);
  const output = drawScaledNearest(source, transform);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, PNG.sync.write(output));

  if (category === 'hair') {
    const frontOutputPath = path.join(
      outputRoot,
      relativePath.replace(/^Asset\.Hair/, 'Asset.Hair.front'),
    );
    await mkdir(path.dirname(frontOutputPath), { recursive: true });
    await writeFile(frontOutputPath, PNG.sync.write(createFrontHairLayer(output, relativePath)));
  }

  return {
    category,
    source: `${source.width}x${source.height}`,
    output: `${TARGET_WIDTH}x${TARGET_HEIGHT}`,
    relativePath: relativePath.split(path.sep).join('/'),
    scale: Number(transform.scale.toFixed(4)),
    offsetX: transform.offsetX,
    offsetY: transform.offsetY,
  };
};

const writeBlankBase = async () => {
  const blank = new PNG({ width: TARGET_WIDTH, height: TARGET_HEIGHT });
  await mkdir(path.dirname(blankBasePath), { recursive: true });
  await writeFile(blankBasePath, PNG.sync.write(blank));
};

const writeSkinLayers = async () => {
  const outputDir = path.join(outputRoot, 'Asset.skin');
  await mkdir(outputDir, { recursive: true });
  await mkdir(path.join(outputDir, 'neck'), { recursive: true });
  await mkdir(path.join(outputDir, 'lower_hand'), { recursive: true });
  await mkdir(path.join(outputDir, 'raised_hand'), { recursive: true });

  for (const [skinId, colors] of Object.entries(SKIN_LAYER_COLORS)) {
    await writeFile(path.join(outputDir, `${skinId}.png`), PNG.sync.write(createSkinLayer(colors)));
    await writeFile(path.join(outputDir, 'neck', `${skinId}.png`), PNG.sync.write(createSkinLayer(colors, 'neck')));
    await writeFile(path.join(outputDir, 'lower_hand', `${skinId}.png`), PNG.sync.write(createSkinLayer(colors, 'lowerHand')));
    await writeFile(path.join(outputDir, 'raised_hand', `${skinId}.png`), PNG.sync.write(createSkinLayer(colors, 'raisedHand')));
  }
};

const writeOutfitHandLayers = async () => {
  const outfitDir = path.join(outputRoot, 'Asset.outfit');
  const outfitPaths = await collectPngs(outfitDir);
  const handOutputRoot = path.join(outputRoot, 'Asset.skin/by_outfit');

  for (const outfitPath of outfitPaths) {
    const outfitId = getOutfitIdFromPath(outfitPath);
    const outfit = PNG.sync.read(await readFile(outfitPath));
    const handComponents = {
      lower_hand: MANUAL_OUTFIT_HAND_COMPONENTS[outfitId]?.lower_hand
        ? createManualHandComponent(outfit, MANUAL_OUTFIT_HAND_COMPONENTS[outfitId].lower_hand)
        : chooseHandHoleComponent(
          findTransparentComponents(outfit, HAND_HOLE_REGIONS.lower_hand),
          'lower_hand',
        ),
      raised_hand: MANUAL_OUTFIT_HAND_COMPONENTS[outfitId]?.raised_hand
        ? createManualHandComponent(outfit, MANUAL_OUTFIT_HAND_COMPONENTS[outfitId].raised_hand)
        : chooseHandHoleComponent(
          findTransparentComponents(outfit, HAND_HOLE_REGIONS.raised_hand),
          'raised_hand',
        ),
    };

    for (const [detailLayer, component] of Object.entries(handComponents)) {
      const detailOutputDir = path.join(handOutputRoot, outfitId, detailLayer);
      await mkdir(detailOutputDir, { recursive: true });

      for (const [skinId, colors] of Object.entries(SKIN_LAYER_COLORS)) {
        const layer = createOutfitHandLayer(component, colors);
        await writeFile(path.join(detailOutputDir, `${skinId}.png`), PNG.sync.write(layer));
      }
    }
  }
};

const writeOutfitObjectLayers = async () => {
  const objectDir = path.join(outputRoot, 'asset.object');
  const objectPaths = (await collectPngs(objectDir)).filter((objectPath) => {
    const relativeParts = path.relative(objectDir, objectPath).split(path.sep);
    return !relativeParts.includes('by_outfit');
  });
  const handRoot = path.join(outputRoot, 'Asset.skin/by_outfit');
  const handEntries = await readDirSafe(handRoot);
  const baseHandPath = path.join(outputRoot, 'Asset.skin/raised_hand/golden.png');
  const baseAnchor = existsSync(baseHandPath)
    ? getBoundsCenter(PNG.sync.read(await readFile(baseHandPath)))
    : DEFAULT_RAISED_HAND_ANCHOR;

  for (const entry of handEntries) {
    if (!entry.isDirectory()) continue;

    const outfitId = entry.name;
    const outfitRaisedHandPath = path.join(handRoot, outfitId, 'raised_hand/golden.png');
    if (!existsSync(outfitRaisedHandPath)) continue;

    const outfitAnchor = getBoundsCenter(PNG.sync.read(await readFile(outfitRaisedHandPath)), baseAnchor);
    const offsetX = outfitAnchor.x - baseAnchor.x;
    const offsetY = outfitAnchor.y - baseAnchor.y;
    const outfitObjectDir = path.join(objectDir, 'by_outfit', outfitId);
    await mkdir(outfitObjectDir, { recursive: true });

    for (const objectPath of objectPaths) {
      const objectLayer = PNG.sync.read(await readFile(objectPath));
      const translatedObjectLayer = translateLayer(objectLayer, offsetX, offsetY);
      await writeFile(
        path.join(outfitObjectDir, path.basename(objectPath)),
        PNG.sync.write(translatedObjectLayer),
      );
    }
  }
};

const main = async () => {
  if (!existsSync(sourceRoot)) {
    throw new Error(`Avatar layer source folder does not exist: ${sourceRoot}`);
  }

  const sourceFiles = await collectPngs(sourceRoot);
  const results = [];

  for (const sourcePath of sourceFiles) {
    results.push(await normalizeAsset(sourcePath));
  }

  await writeBlankBase();
  await writeSkinLayers();
  await writeOutfitHandLayers();
  await writeOutfitObjectLayers();

  const byCategory = results.reduce((counts, result) => ({
    ...counts,
    [result.category]: (counts[result.category] || 0) + 1,
  }), {});

  console.log(`Normalized ${results.length} avatar PNGs into ${path.relative(projectRoot, outputRoot)}.`);
  console.log(JSON.stringify(byCategory, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
