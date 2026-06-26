import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(projectRoot, 'public/images/avatar-layers/source');
const normalizedRoot = path.join(projectRoot, 'public/images/avatar-layers/generated/normalized');
const outputPath = path.join(projectRoot, 'data/AvatarLayerManifest.generated.ts');

const COLOR_SWATCHES = {
  amber: '#d97706',
  auburn: '#9a3412',
  black: '#111827',
  blonde: '#facc15',
  brown: '#7c2d12',
  deep_brown: '#5f3324',
  fair: '#f6c99d',
  golden: '#f2ad63',
  medium_brown: '#9a5a36',
  pink: '#ec4899',
  porcelain: '#f7d7c4',
  red: '#dc2626',
  tan: '#c98752',
  teal: '#0f766e',
  warm_beige: '#d9a06f',
};

const OUTFIT_CLASSES = [
  'bg-violet-600',
  'bg-teal-700',
  'bg-amber-700',
  'bg-blue-600',
  'bg-pink-600',
  'bg-slate-600',
  'bg-emerald-700',
  'bg-cyan-700',
  'bg-rose-700',
  'bg-indigo-700',
  'bg-lime-700',
  'bg-fuchsia-700',
  'bg-orange-700',
];

const OUTFIT_PALETTES = [
  ['#7c3aed', '#3b0764', '#fbbf24', '#111827'],
  ['#0f766e', '#134e4a', '#ccfbf1', '#111827'],
  ['#b45309', '#78350f', '#fde68a', '#111827'],
  ['#2563eb', '#1e3a8a', '#bfdbfe', '#111827'],
  ['#db2777', '#831843', '#fef3c7', '#111827'],
  ['#475569', '#0f172a', '#86efac', '#111827'],
];

const OBJECT_PALETTES = [
  ['#7c2d12', '#facc15'],
  ['#f8fafc', '#38bdf8'],
  ['#334155', '#fbbf24'],
  ['#7dd3fc', '#f0abfc'],
  ['#f5d0a9', '#ef4444'],
  ['#64748b', '#bae6fd'],
];

const WORD_SPLITS = new Map([
  ['coinpouch', 'coin pouch'],
  ['crystalstaff', 'crystal staff'],
  ['starstaff', 'star staff'],
  ['spikeslong', 'long spikes'],
  ['spikesshort', 'short spikes'],
]);

const LEGACY_IDS = new Map([
  ['starstaff', 'star_staff'],
  ['crystalstaff', 'crystal_staff'],
  ['coinpouch', 'coin_pouch'],
]);

const readDirSafe = async (dir) => {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
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

const titleCase = (value) => (
  (WORD_SPLITS.get(value.toLowerCase()) || value)
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
);

const stripExtension = (filename) => filename.replace(/\.[^.]+$/, '');

const stripKnownPrefix = (value, prefix) => (
  value.replace(new RegExp(`^${prefix}\\.?\\s*`, 'i'), '').trim()
);

const toPublicPath = (absolutePath) => (
  `./${path.relative(projectRoot, absolutePath).split(path.sep).join('/')}`
);

const getAssetPublicPath = (sourcePath) => {
  const normalizedPath = path.join(normalizedRoot, path.relative(sourceRoot, sourcePath));
  return toPublicPath(existsSync(normalizedPath) ? normalizedPath : sourcePath);
};

const readPngDimensions = async (absolutePath) => {
  const buffer = await readFile(absolutePath);
  if (buffer.toString('ascii', 1, 4) !== 'PNG') {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
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

const optionBase = async (absolutePath) => {
  const dimensions = await readPngDimensions(absolutePath);
  return {
    imageUrl: getAssetPublicPath(absolutePath),
    sourceSize: dimensions ? `${dimensions.width}x${dimensions.height}` : 'unknown',
  };
};

const buildHairOptions = async () => {
  const hairRoot = path.join(sourceRoot, 'Asset.Hair');
  const colorDirs = (await readDirSafe(hairRoot)).filter(entry => entry.isDirectory());
  const options = [];
  const layers = {};

  for (const colorDir of colorDirs.sort((a, b) => a.name.localeCompare(b.name))) {
    const colorSlug = slugify(colorDir.name);
    const colorName = titleCase(colorDir.name);
    const files = await collectPngs(path.join(hairRoot, colorDir.name));

    for (const absolutePath of files) {
      const fileBase = stripExtension(path.basename(absolutePath));
      const [stylePart = fileBase] = fileBase.split('.');
      const styleSlug = slugify(stylePart);
      const id = `${colorSlug}_${styleSlug}`;
      const swatch = COLOR_SWATCHES[colorSlug] || '#4b5563';
      const metadata = await optionBase(absolutePath);

      options.push({
        id,
        name: `${colorName} ${titleCase(stylePart)}`,
        color: swatch,
        shadow: '#111827',
        highlight: swatch,
      });
      layers[id] = metadata.imageUrl;
    }
  }

  return { options, layers };
};

const buildFaceAndSkinOptions = async () => {
  const faceRoot = path.join(sourceRoot, 'Asset.Faces');
  const expressionDirs = (await readDirSafe(faceRoot)).filter(entry => entry.isDirectory());
  const faceOptions = [];
  const skinById = new Map();
  const layers = {};

  for (const expressionDir of expressionDirs.sort((a, b) => a.name.localeCompare(b.name))) {
    const expressionId = slugify(expressionDir.name);
    faceOptions.push({ id: expressionId, name: titleCase(expressionDir.name) });

    const files = await collectPngs(path.join(faceRoot, expressionDir.name));
    for (const absolutePath of files) {
      const fileBase = stripKnownPrefix(stripExtension(path.basename(absolutePath)), expressionDir.name);
      const skinId = slugify(fileBase);
      const swatch = COLOR_SWATCHES[skinId] || '#d6a06f';
      const metadata = await optionBase(absolutePath);

      skinById.set(skinId, {
        id: skinId,
        name: titleCase(fileBase),
        color: swatch,
        shadow: '#855136',
        highlight: '#ffd0ac',
      });
      layers[`${expressionId}_${skinId}`] = metadata.imageUrl;
    }
  }

  const skinOptions = [...skinById.values()].sort((first, second) => first.name.localeCompare(second.name));
  return { faceOptions, skinOptions, layers };
};

const buildOutfitOptions = async () => {
  const outfitRoot = path.join(sourceRoot, 'Asset.outfit');
  const files = await collectPngs(outfitRoot);
  const options = [];
  const layers = {};

  for (const [index, absolutePath] of files.entries()) {
    const rawName = stripKnownPrefix(stripExtension(path.basename(absolutePath)), 'Outfit');
    const id = slugify(rawName);
    const [color, shadow, accent, trim] = OUTFIT_PALETTES[index % OUTFIT_PALETTES.length];
    const metadata = await optionBase(absolutePath);

    options.push({
      id,
      name: titleCase(rawName),
      color,
      shadow,
      accent,
      trim,
      colorClass: OUTFIT_CLASSES[index % OUTFIT_CLASSES.length],
    });
    layers[id] = metadata.imageUrl;
  }

  return { options, layers };
};

const buildHeldObjectOptions = async () => {
  const objectRoot = path.join(sourceRoot, 'asset.object');
  const files = await collectPngs(objectRoot);
  const options = [];
  const layers = {};

  for (const [index, absolutePath] of files.entries()) {
    const rawName = stripKnownPrefix(stripExtension(path.basename(absolutePath)), 'object');
    const compactSlug = slugify(rawName);
    const id = LEGACY_IDS.get(compactSlug) || compactSlug;
    const [color, accent] = OBJECT_PALETTES[index % OBJECT_PALETTES.length];
    const metadata = await optionBase(absolutePath);

    options.push({
      id,
      name: titleCase(rawName),
      color,
      accent,
    });
    layers[id] = metadata.imageUrl;
  }

  return { options, layers };
};

const buildSkinLayers = (skinOptions) => (
  Object.fromEntries(
    skinOptions.map(option => [
      option.id,
      `./public/images/avatar-layers/generated/normalized/Asset.skin/${option.id}.png`,
    ]),
  )
);

const buildReport = async () => {
  const files = await collectPngs(sourceRoot);
  const dimensions = {};

  for (const absolutePath of files) {
    const size = await readPngDimensions(absolutePath);
    const key = size ? `${size.width}x${size.height}` : 'unknown';
    dimensions[key] = (dimensions[key] || 0) + 1;
  }

  return {
    totalPngs: files.length,
    dimensionCounts: Object.fromEntries(Object.entries(dimensions).sort(([first], [second]) => first.localeCompare(second))),
  };
};

const generatedBanner = `// This file is generated by scripts/generate-avatar-layer-manifest.mjs.
// Edit files in public/images/avatar-layers/source, then rerun npm run avatar:manifest.
`;

const serialize = (value) => JSON.stringify(value, null, 2);

const main = async () => {
  const [{ options: hairOptions, layers: hairLayers }, faceData, { options: outfitOptions, layers: outfitLayers }, { options: heldObjectOptions, layers: heldObjectLayers }, report] = await Promise.all([
    buildHairOptions(),
    buildFaceAndSkinOptions(),
    buildOutfitOptions(),
    buildHeldObjectOptions(),
    buildReport(),
  ]);

  const layerMap = {
    skinToneId: buildSkinLayers(faceData.skinOptions),
    hairStyleId: hairLayers,
    faceId: faceData.layers,
    outfitId: outfitLayers,
    heldObjectId: heldObjectLayers,
    accessoryId: {},
  };

  const fileContents = `${generatedBanner}
export const GENERATED_AVATAR_SKIN_TONES = ${serialize(faceData.skinOptions)};

export const GENERATED_AVATAR_HAIR_STYLES = ${serialize(hairOptions)};

export const GENERATED_AVATAR_FACE_STYLES = ${serialize(faceData.faceOptions)};

export const GENERATED_AVATAR_OUTFITS = ${serialize(outfitOptions)};

export const GENERATED_AVATAR_HELD_OBJECTS = ${serialize(heldObjectOptions)};

export const GENERATED_AVATAR_LAYER_MAP = ${serialize(layerMap)};

export const GENERATED_AVATAR_ASSET_REPORT = ${serialize(report)};
`;

  await writeFile(outputPath, fileContents);
  console.log(`Generated ${path.relative(projectRoot, outputPath)} from ${report.totalPngs} PNG assets.`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
