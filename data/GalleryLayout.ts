import { WingDefinition } from '../types';

export interface WingVisualTheme {
  title: string;
  floor: string;
  floorPattern: string;
  wall: string;
  trim: string;
  door: string;
  glow: string;
  accent: string;
  artworkHint: string;
}

export interface GalleryGroup {
  index: number;
  name: string;
  subtitle: string;
  wingIds: string[];
}

const GALLERY_NAMES = ['Gallery One', 'Gallery Two', 'Gallery Three', 'Gallery Four'];

const GALLERY_SUBTITLES = [
  'Mark, colour, shape',
  'Surface, space, value',
  'Balance, emphasis, unity',
  'Pattern, movement, mastery',
];

export const WING_VISUAL_THEMES: Record<string, WingVisualTheme> = {
  hall_of_line: {
    title: 'Hall of Line',
    floor: '#d6d0c4',
    floorPattern: 'repeating-linear-gradient(35deg, rgba(31, 41, 55, 0.22) 0 2px, transparent 2px 18px)',
    wall: '#4b5563',
    trim: '#111827',
    door: '#e5e7eb',
    glow: '#f8fafc',
    accent: '#111827',
    artworkHint: 'Etched walls, ink paths, and bright contour markings.',
  },
  realm_of_colour: {
    title: 'Realm of Colour',
    floor: '#2b214d',
    floorPattern: 'linear-gradient(90deg, rgba(248, 113, 113, 0.36), rgba(250, 204, 21, 0.26), rgba(45, 212, 191, 0.32), rgba(96, 165, 250, 0.34))',
    wall: '#581c87',
    trim: '#f59e0b',
    door: '#7c3aed',
    glow: '#facc15',
    accent: '#38bdf8',
    artworkHint: 'Stained glass, hot and cool pools of light, chromatic tiles.',
  },
  shape_form_forge: {
    title: 'Shape & Form Forge',
    floor: '#3a2a22',
    floorPattern: 'linear-gradient(45deg, rgba(251, 146, 60, 0.34) 25%, transparent 25% 50%, rgba(120, 113, 108, 0.36) 50% 75%, transparent 75%)',
    wall: '#451a03',
    trim: '#fb923c',
    door: '#92400e',
    glow: '#fdba74',
    accent: '#d6d3d1',
    artworkHint: 'Forge heat, geometric plates, and sculptural silhouettes.',
  },
  texture_tower: {
    title: 'Texture Tower',
    floor: '#544536',
    floorPattern: 'radial-gradient(circle at 20% 25%, rgba(245, 158, 11, 0.2) 0 8px, transparent 9px), radial-gradient(circle at 80% 65%, rgba(120, 113, 108, 0.34) 0 7px, transparent 8px)',
    wall: '#292524',
    trim: '#a8a29e',
    door: '#713f12',
    glow: '#fbbf24',
    accent: '#e7e5e4',
    artworkHint: 'Rough stone, woven banners, polished metal and bark-like panels.',
  },
  space_chamber: {
    title: 'Space Chamber',
    floor: '#101827',
    floorPattern: 'radial-gradient(circle at 50% 35%, rgba(14, 165, 233, 0.22), transparent 38%), linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0 1px, transparent 1px 18px)',
    wall: '#0f172a',
    trim: '#22d3ee',
    door: '#155e75',
    glow: '#67e8f9',
    accent: '#e0f2fe',
    artworkHint: 'Void windows, impossible depth, and positive-negative silhouettes.',
  },
  value_vault: {
    title: 'Value Vault',
    floor: '#1f2937',
    floorPattern: 'linear-gradient(90deg, rgba(255,255,255,0.36), rgba(107,114,128,0.28), rgba(0,0,0,0.34))',
    wall: '#030712',
    trim: '#f9fafb',
    door: '#374151',
    glow: '#f3f4f6',
    accent: '#9ca3af',
    artworkHint: 'Bright highlights, deep shadows, and tonal vault panels.',
  },
  balance_bridge: {
    title: 'Balance Bridge',
    floor: '#20352d',
    floorPattern: 'linear-gradient(90deg, transparent 45%, rgba(236, 253, 245, 0.28) 45% 55%, transparent 55%), radial-gradient(circle at 30% 50%, rgba(16, 185, 129, 0.22), transparent 24%), radial-gradient(circle at 70% 50%, rgba(16, 185, 129, 0.22), transparent 24%)',
    wall: '#064e3b',
    trim: '#d1fae5',
    door: '#047857',
    glow: '#a7f3d0',
    accent: '#fef3c7',
    artworkHint: 'Mirrored columns, counterweights, and a steady central bridge.',
  },
  emphasis_arena: {
    title: 'Emphasis Arena',
    floor: '#3b1626',
    floorPattern: 'radial-gradient(circle at 50% 50%, rgba(244, 63, 94, 0.5), transparent 28%), linear-gradient(45deg, rgba(251, 191, 36, 0.18), transparent)',
    wall: '#881337',
    trim: '#fbbf24',
    door: '#be123c',
    glow: '#fb7185',
    accent: '#fde68a',
    artworkHint: 'Spotlights, focal-point stages, and contrast-heavy banners.',
  },
  unity_garden: {
    title: 'Unity Garden',
    floor: '#1f3f2f',
    floorPattern: 'radial-gradient(circle at 22% 30%, rgba(244, 114, 182, 0.26) 0 9px, transparent 10px), radial-gradient(circle at 70% 60%, rgba(134, 239, 172, 0.24) 0 10px, transparent 11px), linear-gradient(90deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 24px)',
    wall: '#14532d',
    trim: '#f9a8d4',
    door: '#166534',
    glow: '#bbf7d0',
    accent: '#fce7f3',
    artworkHint: 'Linked pathways, repeated motifs, and varied garden forms.',
  },
  rhythm_pattern_pavilion: {
    title: 'Rhythm & Pattern Pavilion',
    floor: '#18233f',
    floorPattern: 'repeating-linear-gradient(90deg, rgba(96, 165, 250, 0.26) 0 16px, rgba(249, 115, 22, 0.24) 16px 32px), repeating-linear-gradient(0deg, transparent 0 20px, rgba(255,255,255,0.12) 20px 22px)',
    wall: '#1e3a8a',
    trim: '#fb923c',
    door: '#1d4ed8',
    glow: '#93c5fd',
    accent: '#fed7aa',
    artworkHint: 'Alternating arches, repeated tiles, and visual beats.',
  },
  hall_of_movement: {
    title: 'Hall of Movement',
    floor: '#273244',
    floorPattern: 'linear-gradient(120deg, transparent 0 34%, rgba(45, 212, 191, 0.36) 34% 40%, transparent 40% 64%, rgba(251, 113, 133, 0.32) 64% 70%, transparent 70%)',
    wall: '#312e81',
    trim: '#2dd4bf',
    door: '#4338ca',
    glow: '#5eead4',
    accent: '#fecdd3',
    artworkHint: 'Diagonal paths, sweeping curves, and directional light trails.',
  },
  final_room: {
    title: 'Final Room',
    floor: '#221d33',
    floorPattern: 'conic-gradient(from 30deg at 50% 50%, rgba(236, 72, 153, 0.28), rgba(59, 130, 246, 0.28), rgba(250, 204, 21, 0.22), rgba(236, 72, 153, 0.28))',
    wall: '#111827',
    trim: '#f8fafc',
    door: '#4c1d95',
    glow: '#f0abfc',
    accent: '#fef9c3',
    artworkHint: 'Prismatic glass, final reflections, and a keystone glow.',
  },
};

export const buildGalleryGroups = (wingDefinitions: WingDefinition[]): GalleryGroup[] => {
  const groups: GalleryGroup[] = [];
  for (let index = 0; index < wingDefinitions.length; index += 3) {
    const groupIndex = Math.floor(index / 3);
    groups.push({
      index: groupIndex,
      name: GALLERY_NAMES[groupIndex] || `Gallery ${groupIndex + 1}`,
      subtitle: GALLERY_SUBTITLES[groupIndex] || 'ArtQuest levels',
      wingIds: wingDefinitions.slice(index, index + 3).map((wing) => wing.id),
    });
  }
  return groups;
};

export const getWingShortName = (wing: WingDefinition): string => {
  return wing.name.replace(/^[^\p{L}\p{N}]+/u, '').trim();
};
