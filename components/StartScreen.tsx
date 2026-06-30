import React, { useMemo, useState } from 'react';
import { AvatarArchetypeId, AvatarAssetTabId, AvatarBuilderConfig, PlayerAvatar, SeniorCoursePathway, YearLevel, NewGameSetupScreenProps } from '../types';
import {
  SCSA_ASSESSMENT_YEAR_OPTIONS,
  getAssessmentYearOption,
  getAssessmentYearOptionId,
} from '../data/SCSACurriculum';
import {
  AVATAR_REWARD_DEFAULT_BUILD,
  AVATAR_REWARD_FACE_STYLES,
  AVATAR_REWARD_HAIR_STYLES,
  AVATAR_REWARD_HELD_OBJECTS,
  AVATAR_REWARD_OUTFITS,
  AVATAR_REWARD_SKIN_TONES,
  getAvatarArchetypeSpriteUrl,
  getAvatarAssetPreviewImageUrls,
  getAvatarLayerImageUrls,
} from '../data/AvatarRewards';
import AvatarAssetPreview from './AvatarAssetPreview';
import AvatarLayeredPreview from './AvatarLayeredPreview';

const AVATARS: Omit<PlayerAvatar, 'selectedYearLevel' | 'selectedCoursePathway'>[] = [
  {
    id: 'nova',
    name: 'Nova',
    title: 'The Curious Visionary',
    description: "Sees beyond the canvas, drawn to the untold stories within art.",
    iconInitial: 'NV',
    imageUrl: getAvatarArchetypeSpriteUrl('nova'),
    colorClass: 'bg-violet-600',
    avatarArchetypeId: 'nova',
    avatarBuild: {
      archetypeId: 'nova',
      skinToneId: 'golden',
      hairStyleId: 'brown_curls',
      faceId: 'focused',
      outfitId: 'mystic_robe',
      heldObjectId: 'star_staff',
      accessoryId: 'none',
    },
  },
  {
    id: 'leo',
    name: 'Leo',
    title: 'The Analytical Sketchmaster',
    description: "Deciphers art with logic and precision, master of line and form.",
    iconInitial: 'LO',
    imageUrl: getAvatarArchetypeSpriteUrl('leo'),
    colorClass: 'bg-teal-700',
    avatarArchetypeId: 'leo',
    avatarBuild: {
      archetypeId: 'leo',
      skinToneId: 'golden',
      hairStyleId: 'teal_long_spikes',
      faceId: 'focused',
      outfitId: 'painted_hoodie',
      heldObjectId: 'star_staff',
      accessoryId: 'none',
    },
  },
  {
    id: 'zia',
    name: 'Zia',
    title: 'The Symbol Seeker',
    description: "Unravels hidden meanings, fluent in the language of symbols.",
    iconInitial: 'ZA',
    imageUrl: getAvatarArchetypeSpriteUrl('zia'),
    colorClass: 'bg-slate-600',
    avatarArchetypeId: 'zia',
    avatarBuild: {
      archetypeId: 'zia',
      skinToneId: 'golden',
      hairStyleId: 'brown_ponytail',
      faceId: 'focused',
      outfitId: 'artist_apron',
      heldObjectId: 'star_staff',
      accessoryId: 'none',
    },
  },
];

const PROFILE_SCREEN_BACKGROUND = './public/images/screens/character-selection-screen.png';
const AVATAR_BUILDER_BACKGROUND = './public/images/screens/build-avatar-screen-v2.png';
const DEFAULT_CUSTOM_AVATAR_NAME = 'Pixel Creator';
const ARTIST_SETUP_SCREEN_FRAME_STYLE: React.CSSProperties = {
  width: 'min(100vw, calc(100vh * 1672 / 941))',
  height: 'min(100vh, calc(100vw * 941 / 1672))',
};
const SCREEN_HOTSPOT_CLASS = 'absolute z-20 rounded-sm bg-transparent text-transparent transition hover:bg-white/5 focus:outline-none focus:ring-4 focus:ring-pink-200/80 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:focus:ring-0';
const PROFILE_SELECT_CLASS = 'absolute z-30 border-2 border-[#080814] bg-[#2b1743] px-4 py-2 text-center text-base font-bold text-amber-100 shadow-[0_4px_0_rgba(0,0,0,0.55)] outline-none focus:ring-4 focus:ring-pink-200/80';
const PROFILE_TEXT_INPUT_CLASS = 'absolute z-30 border-2 border-[#080814] bg-[#21132e] px-4 py-2 text-center text-xl font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.55)] outline-none placeholder:text-slate-200 focus:ring-4 focus:ring-pink-200/80';
const BUILDER_OVERLAY_SELECT_CLASS = 'absolute z-30 appearance-none rounded-sm bg-[#21132e]/95 px-4 py-0 text-left text-base font-bold leading-none text-white outline-none focus:ring-4 focus:ring-pink-200/80 sm:text-xl';
const BUILDER_OVERLAY_NAME_INPUT_CLASS = 'absolute z-30 rounded-sm border-0 bg-[#140c1c] px-2 py-0 text-left text-base font-black leading-none text-white outline-none placeholder:text-purple-200 focus:ring-4 focus:ring-pink-200/80 sm:text-xl';

const ARTIST_TYPES = ['Storyteller', 'Observer', 'Sketcher', 'Analyzer', 'Dreamer'] as const;
const CREATIVITY_FUELS = ['Music', 'Nature', 'Emotions', 'Technology', 'People'] as const;

type ArtistType = typeof ARTIST_TYPES[number];
type CreativityFuel = typeof CREATIVITY_FUELS[number];

interface ArtistIdentity {
  title: string;
  description: string;
}

const ARTIST_IDENTITIES: Record<ArtistType, Record<CreativityFuel, ArtistIdentity>> = {
  Storyteller: {
    Music: {
      title: 'The Harmonic Narrator',
      description: 'Shapes artworks into rhythmic stories, hearing mood and movement in every visual detail.',
    },
    Nature: {
      title: 'The Wild Loreweaver',
      description: 'Finds living stories in natural forms, textures, seasons, and hidden gallery symbols.',
    },
    Emotions: {
      title: 'The Heartfelt Mythmaker',
      description: 'Turns feeling into meaning, reading each artwork as a story of mood and memory.',
    },
    Technology: {
      title: 'The Digital Bard',
      description: 'Connects old visual secrets with new ideas, translating art through inventive modern lenses.',
    },
    People: {
      title: 'The Community Chronicler',
      description: 'Looks for human stories, shared experiences, and the voices behind every artwork.',
    },
  },
  Observer: {
    Music: {
      title: 'The Rhythm Watcher',
      description: 'Notices visual beats, repeated motifs, and quiet patterns that guide the viewer through art.',
    },
    Nature: {
      title: 'The Patient Naturalist',
      description: 'Studies organic detail closely, spotting subtle changes in colour, texture, light, and form.',
    },
    Emotions: {
      title: 'The Empathic Noticer',
      description: 'Reads small visual clues carefully, sensing how line, colour, and expression create feeling.',
    },
    Technology: {
      title: 'The Signal Seeker',
      description: 'Scans artworks for systems, codes, visual signals, and clever structural clues.',
    },
    People: {
      title: 'The Social Witness',
      description: 'Watches how people, gestures, spaces, and relationships shape the meaning of an image.',
    },
  },
  Sketcher: {
    Music: {
      title: 'The Line Composer',
      description: 'Builds expressive marks like melodies, turning rhythm and movement into visual pathways.',
    },
    Nature: {
      title: 'The Botanical Draftsperson',
      description: 'Draws inspiration from leaves, landforms, growth, and the textures of the natural world.',
    },
    Emotions: {
      title: 'The Expressive Mark Maker',
      description: 'Uses gesture, pressure, and energetic lines to capture feeling and personal response.',
    },
    Technology: {
      title: 'The Circuit Illustrator',
      description: 'Combines precise drawing with inventive design, seeing structure as a creative tool.',
    },
    People: {
      title: 'The Portrait Pathfinder',
      description: 'Sketches character, gesture, identity, and expression to understand people through art.',
    },
  },
  Analyzer: {
    Music: {
      title: 'The Pattern Listener',
      description: 'Breaks down rhythm, repetition, contrast, and movement to explain how artworks work.',
    },
    Nature: {
      title: 'The Structure Seeker',
      description: 'Finds order in organic forms, studying balance, proportion, growth, and visual systems.',
    },
    Emotions: {
      title: 'The Mood Decoder',
      description: 'Investigates how visual choices create atmosphere, tension, symbolism, and emotional impact.',
    },
    Technology: {
      title: 'The Systems Critic',
      description: 'Examines artworks with sharp logic, tracing composition, process, structure, and intention.',
    },
    People: {
      title: 'The Perspective Reader',
      description: 'Analyzes viewpoints, audience, identity, and context to understand meaning from many angles.',
    },
  },
  Dreamer: {
    Music: {
      title: 'The Lyrical Visionary',
      description: 'Imagines artworks as songs of colour, rhythm, mood, and impossible visual journeys.',
    },
    Nature: {
      title: 'The Garden Dreamsmith',
      description: 'Blends natural wonder with imagination, finding mystery in growth, light, and organic forms.',
    },
    Emotions: {
      title: 'The Wonder Weaver',
      description: 'Follows feeling into interpretation, creating imaginative meanings from atmosphere and symbol.',
    },
    Technology: {
      title: 'The Future Imaginer',
      description: 'Dreams beyond the frame, using invention and possibility to rethink what art can become.',
    },
    People: {
      title: 'The Shared Visionary',
      description: 'Imagines art as connection, bringing different experiences together through creative insight.',
    },
  },
};

interface BuilderOption {
  id: string;
  name: string;
  unlock?: {
    traitName: string;
    level: string;
  };
}

interface SkinToneOption extends BuilderOption {
  color: string;
  shadow: string;
  highlight: string;
}

interface HairStyleOption extends BuilderOption {
  color: string;
  shadow: string;
  highlight: string;
}

interface HairColorGroup {
  id: string;
  name: string;
  color: string;
  options: HairStyleOption[];
}

interface OutfitOption extends BuilderOption {
  color: string;
  shadow: string;
  accent: string;
  trim: string;
  colorClass: string;
}

interface HeldObjectOption extends BuilderOption {
  color: string;
  accent: string;
}

type AvatarBuilderTabId = Exclude<AvatarAssetTabId, 'accessoryId'>;

interface AvatarBuilderTab {
  id: AvatarBuilderTabId;
  label: string;
  shortLabel: string;
  options: BuilderOption[];
}

const isStarterOption = <T extends BuilderOption>(option: T): boolean => !option.unlock;
const NO_HAIR_STYLE_ID = 'none';
const NO_HELD_OBJECT_ID = 'none';

const SKIN_TONES: SkinToneOption[] = AVATAR_REWARD_SKIN_TONES.filter(isStarterOption);

const HAIR_STYLES: HairStyleOption[] = AVATAR_REWARD_HAIR_STYLES.filter(isStarterOption);

const FACE_STYLES: BuilderOption[] = AVATAR_REWARD_FACE_STYLES.filter(isStarterOption);

const OUTFITS: OutfitOption[] = AVATAR_REWARD_OUTFITS.filter(isStarterOption);

const HELD_OBJECTS: HeldObjectOption[] = AVATAR_REWARD_HELD_OBJECTS.filter(isStarterOption);

const STARTER_NO_HAIR_OPTION = HAIR_STYLES.find(option => option.id === NO_HAIR_STYLE_ID) || HAIR_STYLES[0];
const HAIR_STYLE_OPTIONS = HAIR_STYLES.filter(option => option.id !== NO_HAIR_STYLE_ID);

const DEFAULT_AVATAR_BUILD: AvatarBuilderConfig = AVATAR_REWARD_DEFAULT_BUILD;

const AVATAR_BUILDER_TABS: AvatarBuilderTab[] = [
  { id: 'skinToneId', label: 'Skin Tone', shortLabel: 'Skin', options: SKIN_TONES },
  { id: 'hairStyleId', label: 'Hair Style', shortLabel: 'Hair', options: HAIR_STYLES },
  { id: 'faceId', label: 'Face', shortLabel: 'Face', options: FACE_STYLES },
  { id: 'outfitId', label: 'Outfit', shortLabel: 'Outfit', options: OUTFITS },
  { id: 'heldObjectId', label: 'Object To Hold', shortLabel: 'Object', options: HELD_OBJECTS },
];

const OUTLINE = '#111827';

const getOptionById = <T extends BuilderOption>(options: T[], id: string): T => (
  options.find(option => option.id === id) || options[0]
);

const getHairColorId = (hairStyleId: string): string => hairStyleId.split('_')[0] || hairStyleId;

const getHairStyleKey = (hairStyleId: string): string => {
  const [, ...styleParts] = hairStyleId.split('_');
  return styleParts.join('_') || hairStyleId;
};

const getHairStyleLabel = (hairStyle: HairStyleOption): string => {
  const words = hairStyle.name.split(/\s+/).filter(Boolean);
  return words.length > 1 ? words.slice(1).join(' ') : hairStyle.name;
};

const getHairColorName = (hairStyle: HairStyleOption): string => {
  const words = hairStyle.name.split(/\s+/).filter(Boolean);
  return words[0] || hairStyle.name;
};

const buildHairColorGroups = (hairStyles: HairStyleOption[]): HairColorGroup[] => {
  const groups = new Map<string, HairColorGroup>();

  hairStyles.forEach((hairStyle) => {
    const colorId = getHairColorId(hairStyle.id);
    if (!groups.has(colorId)) {
      groups.set(colorId, {
        id: colorId,
        name: getHairColorName(hairStyle),
        color: hairStyle.color,
        options: [],
      });
    }
    groups.get(colorId)?.options.push(hairStyle);
  });

  return [...groups.values()];
};

const getHairDescription = (hairStyle: HairStyleOption): string => (
  hairStyle.id === NO_HAIR_STYLE_ID ? 'no hair' : `${hairStyle.name.toLowerCase()} hair`
);

const getHeldObjectDescription = (heldObject: HeldObjectOption): string => (
  heldObject.id === NO_HELD_OBJECT_ID ? 'no object' : heldObject.name.toLowerCase()
);

const getArtistIdentity = (artistType: ArtistType, creativityFuel: CreativityFuel): ArtistIdentity => (
  ARTIST_IDENTITIES[artistType][creativityFuel]
);

const rect = (x: number, y: number, width: number, height: number, fill: string): string => (
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" />`
);

const renderBackHairPixels = (hair: HairStyleOption): string => {
  switch (hair.id) {
    case 'bob':
      return [
        rect(13, 20, 8, 33, hair.shadow),
        rect(43, 20, 8, 33, hair.shadow),
        rect(15, 17, 34, 11, hair.color),
        rect(12, 28, 8, 24, hair.color),
        rect(44, 28, 8, 24, hair.color),
        rect(14, 49, 10, 8, hair.shadow),
        rect(40, 49, 10, 8, hair.shadow),
      ].join('');
    case 'waves':
      return [
        rect(13, 18, 12, 45, hair.shadow),
        rect(41, 18, 12, 45, hair.shadow),
        rect(16, 15, 33, 14, hair.color),
        rect(12, 27, 11, 15, hair.color),
        rect(46, 28, 9, 18, hair.color),
        rect(15, 46, 9, 15, hair.highlight),
        rect(41, 46, 9, 18, hair.color),
        rect(11, 61, 9, 8, hair.shadow),
        rect(43, 61, 9, 8, hair.shadow),
      ].join('');
    case 'curls':
      return [
        rect(14, 18, 8, 8, hair.shadow),
        rect(22, 13, 10, 10, hair.color),
        rect(32, 13, 10, 10, hair.color),
        rect(42, 18, 8, 8, hair.shadow),
        rect(11, 27, 10, 10, hair.color),
        rect(44, 27, 10, 10, hair.color),
        rect(12, 38, 9, 9, hair.shadow),
        rect(43, 38, 9, 9, hair.shadow),
        rect(18, 49, 8, 8, hair.color),
        rect(39, 49, 8, 8, hair.color),
      ].join('');
    case 'ponytail':
      return [
        rect(14, 18, 35, 12, hair.color),
        rect(13, 27, 10, 29, hair.shadow),
        rect(44, 26, 9, 18, hair.shadow),
        rect(48, 34, 10, 22, hair.color),
        rect(52, 51, 8, 15, hair.shadow),
        rect(50, 36, 6, 12, hair.highlight),
      ].join('');
    default:
      return '';
  }
};

const renderFrontHairPixels = (hair: HairStyleOption): string => {
  const cap = [
    rect(18, 14, 28, 6, hair.shadow),
    rect(16, 18, 32, 8, hair.color),
    rect(19, 17, 24, 4, hair.highlight),
  ];

  switch (hair.id) {
    case 'crop':
      return [
        ...cap,
        rect(14, 23, 10, 8, hair.shadow),
        rect(40, 23, 10, 8, hair.shadow),
        rect(21, 24, 7, 5, hair.color),
        rect(30, 22, 8, 6, hair.color),
        rect(38, 25, 5, 5, hair.color),
      ].join('');
    case 'bob':
      return [
        ...cap,
        rect(17, 24, 9, 9, hair.shadow),
        rect(38, 24, 10, 9, hair.shadow),
        rect(24, 24, 8, 5, hair.color),
        rect(32, 22, 7, 6, hair.color),
      ].join('');
    case 'waves':
      return [
        ...cap,
        rect(14, 24, 13, 10, hair.shadow),
        rect(38, 24, 12, 10, hair.shadow),
        rect(22, 25, 8, 5, hair.highlight),
        rect(31, 22, 8, 7, hair.color),
        rect(40, 29, 6, 8, hair.highlight),
      ].join('');
    case 'curls':
      return [
        rect(17, 16, 9, 9, hair.color),
        rect(26, 12, 10, 10, hair.shadow),
        rect(35, 15, 10, 10, hair.color),
        rect(13, 25, 8, 8, hair.shadow),
        rect(44, 25, 8, 8, hair.shadow),
        rect(22, 23, 8, 8, hair.highlight),
        rect(34, 23, 8, 8, hair.color),
      ].join('');
    case 'spikes':
      return [
        rect(18, 19, 28, 7, hair.shadow),
        rect(19, 14, 6, 9, hair.color),
        rect(25, 9, 6, 14, hair.highlight),
        rect(31, 12, 7, 11, hair.color),
        rect(38, 8, 6, 15, hair.highlight),
        rect(44, 17, 5, 9, hair.color),
        rect(15, 23, 8, 8, hair.shadow),
        rect(41, 23, 8, 8, hair.shadow),
      ].join('');
    case 'ponytail':
      return [
        ...cap,
        rect(15, 23, 10, 9, hair.shadow),
        rect(37, 23, 11, 9, hair.shadow),
        rect(24, 22, 9, 7, hair.color),
        rect(33, 23, 8, 6, hair.highlight),
      ].join('');
    default:
      return cap.join('');
  }
};

const renderHeadPixels = (skin: SkinToneOption): string => [
  rect(19, 20, 26, 29, OUTLINE),
  rect(17, 25, 5, 17, OUTLINE),
  rect(43, 25, 5, 17, OUTLINE),
  rect(21, 19, 22, 4, OUTLINE),
  rect(21, 23, 22, 25, skin.color),
  rect(18, 27, 4, 12, skin.color),
  rect(43, 27, 4, 12, skin.color),
  rect(23, 22, 11, 4, skin.highlight),
  rect(39, 31, 4, 10, skin.shadow),
  rect(25, 48, 14, 7, OUTLINE),
  rect(27, 48, 10, 8, skin.shadow),
].join('');

const renderFacePixels = (faceId: string): string => {
  switch (faceId) {
    case 'bright':
      return [
        rect(24, 31, 5, 4, OUTLINE),
        rect(36, 31, 5, 4, OUTLINE),
        rect(27, 40, 11, 3, OUTLINE),
        rect(29, 43, 7, 2, OUTLINE),
        rect(31, 36, 4, 2, '#9f555d'),
      ].join('');
    case 'calm':
      return [
        rect(23, 32, 8, 2, OUTLINE),
        rect(36, 32, 8, 2, OUTLINE),
        rect(28, 42, 9, 2, OUTLINE),
        rect(31, 36, 4, 2, '#9f555d'),
      ].join('');
    case 'bold':
      return [
        rect(23, 29, 9, 3, OUTLINE),
        rect(36, 29, 9, 3, OUTLINE),
        rect(25, 33, 5, 6, OUTLINE),
        rect(38, 33, 5, 6, OUTLINE),
        rect(27, 43, 12, 3, OUTLINE),
        rect(31, 37, 4, 2, '#9f555d'),
      ].join('');
    case 'curious':
      return [
        rect(23, 29, 9, 2, OUTLINE),
        rect(37, 31, 8, 2, OUTLINE),
        rect(25, 33, 5, 5, OUTLINE),
        rect(38, 34, 5, 5, OUTLINE),
        rect(29, 42, 8, 2, OUTLINE),
        rect(32, 37, 4, 2, '#9f555d'),
      ].join('');
    default:
      return [
        rect(23, 29, 10, 3, OUTLINE),
        rect(36, 29, 10, 3, OUTLINE),
        rect(25, 33, 5, 6, OUTLINE),
        rect(39, 33, 5, 6, OUTLINE),
        rect(28, 43, 12, 3, OUTLINE),
        rect(31, 37, 4, 2, '#9f555d'),
      ].join('');
  }
};

const renderOutfitPatternPixels = (outfit: OutfitOption): string => {
  switch (outfit.id) {
    case 'robe':
      return [
        rect(25, 56, 4, 4, outfit.accent),
        rect(36, 61, 4, 4, outfit.accent),
        rect(27, 70, 3, 3, outfit.accent),
        rect(39, 73, 5, 5, outfit.accent),
      ].join('');
    case 'apron':
      return [
        rect(25, 52, 16, 5, outfit.shadow),
        rect(28, 59, 10, 19, '#0f172a'),
        rect(30, 61, 6, 3, outfit.accent),
      ].join('');
    case 'coat':
      return [
        rect(21, 52, 5, 30, outfit.shadow),
        rect(39, 52, 5, 30, outfit.shadow),
        rect(28, 58, 8, 4, outfit.accent),
        rect(30, 67, 5, 5, outfit.accent),
      ].join('');
    case 'jacket':
      return [
        rect(20, 50, 11, 13, outfit.shadow),
        rect(35, 50, 11, 13, outfit.shadow),
        rect(29, 51, 7, 32, '#e2e8f0'),
        rect(31, 57, 3, 4, outfit.accent),
      ].join('');
    case 'tunic':
      return [
        rect(24, 54, 4, 4, outfit.accent),
        rect(34, 55, 4, 4, outfit.accent),
        rect(29, 65, 4, 4, outfit.accent),
        rect(39, 69, 4, 4, outfit.accent),
        rect(22, 75, 4, 4, outfit.accent),
      ].join('');
    case 'cape':
      return [
        rect(16, 51, 9, 33, outfit.shadow),
        rect(41, 51, 9, 33, outfit.shadow),
        rect(27, 54, 10, 6, outfit.accent),
        rect(30, 64, 5, 17, '#0f172a'),
      ].join('');
    default:
      return '';
  }
};

const renderBodyPixels = (skin: SkinToneOption, outfit: OutfitOption): string => [
  rect(20, 84, 11, 5, OUTLINE),
  rect(35, 84, 11, 5, OUTLINE),
  rect(21, 76, 8, 9, outfit.shadow),
  rect(37, 76, 8, 9, outfit.shadow),
  rect(17, 49, 32, 36, OUTLINE),
  rect(20, 50, 26, 34, outfit.color),
  rect(13, 53, 12, 25, OUTLINE),
  rect(15, 54, 9, 22, outfit.color),
  rect(41, 53, 12, 25, OUTLINE),
  rect(42, 54, 9, 22, outfit.color),
  rect(21, 50, 10, 9, outfit.shadow),
  rect(34, 50, 12, 9, outfit.shadow),
  rect(21, 63, 25, 4, outfit.trim),
  rect(23, 62, 21, 3, outfit.accent),
  renderOutfitPatternPixels(outfit),
  rect(8, 72, 10, 11, OUTLINE),
  rect(9, 72, 8, 9, skin.color),
  rect(47, 70, 10, 11, OUTLINE),
  rect(48, 70, 8, 9, skin.color),
].join('');

const renderHeldObjectPixels = (heldObject: HeldObjectOption): string => {
  switch (heldObject.id) {
    case 'sketchbook':
      return [
        rect(44, 56, 15, 20, OUTLINE),
        rect(46, 58, 12, 16, heldObject.color),
        rect(48, 61, 8, 2, heldObject.accent),
        rect(48, 66, 7, 2, '#94a3b8'),
      ].join('');
    case 'lantern':
      return [
        rect(48, 50, 9, 5, OUTLINE),
        rect(50, 47, 5, 5, OUTLINE),
        rect(46, 55, 14, 19, OUTLINE),
        rect(48, 57, 10, 14, heldObject.color),
        rect(50, 59, 6, 9, heldObject.accent),
        rect(52, 61, 3, 5, '#fff7ad'),
      ].join('');
    case 'prism':
      return [
        rect(50, 54, 6, 4, OUTLINE),
        rect(48, 58, 10, 4, OUTLINE),
        rect(46, 62, 14, 5, OUTLINE),
        rect(48, 58, 8, 4, heldObject.color),
        rect(49, 62, 7, 5, heldObject.accent),
        rect(51, 67, 4, 3, '#fef3c7'),
      ].join('');
    case 'palette':
      return [
        rect(45, 56, 15, 16, OUTLINE),
        rect(47, 58, 11, 12, heldObject.color),
        rect(50, 61, 3, 3, '#ef4444'),
        rect(54, 62, 3, 3, '#2563eb'),
        rect(49, 66, 3, 3, '#facc15'),
        rect(55, 67, 2, 2, OUTLINE),
      ].join('');
    case 'magnifier':
      return [
        rect(47, 55, 13, 13, OUTLINE),
        rect(49, 57, 9, 9, heldObject.accent),
        rect(57, 67, 4, 4, OUTLINE),
        rect(59, 70, 4, 8, heldObject.color),
      ].join('');
    case 'brush':
    default:
      return [
        rect(52, 45, 4, 29, OUTLINE),
        rect(53, 46, 2, 26, heldObject.color),
        rect(49, 40, 10, 8, OUTLINE),
        rect(50, 41, 8, 5, heldObject.accent),
        rect(51, 46, 6, 4, '#f8fafc'),
      ].join('');
  }
};

export const buildAvatarSvg = (config: AvatarBuilderConfig): string => {
  const skin = getOptionById(SKIN_TONES, config.skinToneId);
  const hair = getOptionById(HAIR_STYLES, config.hairStyleId);
  const outfit = getOptionById(OUTFITS, config.outfitId);
  const heldObject = getOptionById(HELD_OBJECTS, config.heldObjectId);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 96" width="64" height="96" shape-rendering="crispEdges">
    ${renderBackHairPixels(hair)}
    ${renderBodyPixels(skin, outfit)}
    ${renderHeldObjectPixels(heldObject)}
    ${renderHeadPixels(skin)}
    ${renderFrontHairPixels(hair)}
    ${renderFacePixels(config.faceId)}
    ${rect(10, 73, 5, 3, skin.highlight)}
    ${rect(49, 71, 5, 3, skin.highlight)}
    ${rect(20, 88, 12, 4, OUTLINE)}
    ${rect(34, 88, 12, 4, OUTLINE)}
  </svg>`;
};

const getBuildArchetypeId = (config: AvatarBuilderConfig): AvatarArchetypeId => (
  config.archetypeId || 'nova'
);

const AvatarOutlinePlaceholder: React.FC<{ className?: string; title?: string }> = ({
  className = '',
  title = 'Blank avatar outline',
}) => (
  <svg
    viewBox="0 0 96 128"
    className={className}
    role="img"
    aria-label={title}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    shapeRendering="crispEdges"
  >
    <path
      d="M36 16H60V24H68V44H64V56H74V98H60V112H36V98H22V56H32V44H28V24H36V16Z"
      stroke="#f9a8d4"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="5 5"
    />
    <path
      d="M40 66H56"
      stroke="#99f6e4"
      strokeWidth="3"
      strokeLinecap="round"
      strokeDasharray="4 5"
    />
    <path
      d="M38 80H58"
      stroke="#99f6e4"
      strokeWidth="3"
      strokeLinecap="round"
      strokeDasharray="4 5"
    />
  </svg>
);

const NewGameSetupScreen: React.FC<NewGameSetupScreenProps> = ({ onStartNewGameSetupComplete }) => {
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(AVATARS[0].id);
  const [creationModeActive, setCreationModeActive] = useState<boolean>(false);
  const [builderScreenActive, setBuilderScreenActive] = useState<boolean>(false);
  const [customAvatarName, setCustomAvatarName] = useState<string>(AVATARS[0].name);
  const [customArtistType, setCustomArtistType] = useState<ArtistType>(ARTIST_TYPES[0]);
  const [customCreativityFuel, setCustomCreativityFuel] = useState<CreativityFuel>(CREATIVITY_FUELS[0]);
  const [avatarBuild, setAvatarBuild] = useState<AvatarBuilderConfig>(DEFAULT_AVATAR_BUILD);
  const [activeBuilderTabId, setActiveBuilderTabId] = useState<AvatarBuilderTabId>(AVATAR_BUILDER_TABS[0].id);
  const [selectedYearLevel, setSelectedYearLevel] = useState<YearLevel>(SCSA_ASSESSMENT_YEAR_OPTIONS[0].yearLevel);
  const [selectedCoursePathway, setSelectedCoursePathway] = useState<SeniorCoursePathway | undefined>(SCSA_ASSESSMENT_YEAR_OPTIONS[0].coursePathway);

  const selectedAssessmentOptionId = getAssessmentYearOptionId(selectedYearLevel, selectedCoursePathway);
  const customAvatarImageUrls = useMemo(() => getAvatarLayerImageUrls(avatarBuild), [avatarBuild]);
  const hairColorGroups = useMemo(() => buildHairColorGroups(HAIR_STYLE_OPTIONS), []);
  const activeBuilderTabIndex = Math.max(0, AVATAR_BUILDER_TABS.findIndex(tab => tab.id === activeBuilderTabId));
  const activeBuilderTab = AVATAR_BUILDER_TABS[activeBuilderTabIndex] || AVATAR_BUILDER_TABS[0];
  const selectedSkinTone = getOptionById(SKIN_TONES, avatarBuild.skinToneId);
  const selectedHairStyle = getOptionById(HAIR_STYLES, avatarBuild.hairStyleId);
  const selectedFaceStyle = getOptionById(FACE_STYLES, avatarBuild.faceId);
  const selectedOutfit = getOptionById(OUTFITS, avatarBuild.outfitId);
  const selectedHeldObject = getOptionById(HELD_OBJECTS, avatarBuild.heldObjectId);
  const selectedHairColorId = getHairColorId(avatarBuild.hairStyleId);
  const selectedHairStyleKey = getHairStyleKey(avatarBuild.hairStyleId);
  const selectedHairColorGroup = hairColorGroups.find(group => group.id === selectedHairColorId) || hairColorGroups[0];
  const selectedHairColorOptions = selectedHairColorGroup?.options || HAIR_STYLE_OPTIONS;
  const selectedArtistIdentity = getArtistIdentity(customArtistType, customCreativityFuel);

  const handleAssessmentOptionChange = (value: string) => {
    const option = getAssessmentYearOption(value);
    setSelectedYearLevel(option.yearLevel);
    setSelectedCoursePathway(option.coursePathway);
  };

  const handleSelectAvatar = (avatarId: string) => {
    const selectedAvatar = AVATARS.find(avatar => avatar.id === avatarId);
    setSelectedAvatarId(avatarId);
    setCustomAvatarName(selectedAvatar?.name || '');
    setCreationModeActive(false);
    setBuilderScreenActive(false);
  };

  const handleSelectCreateOwn = () => {
    setCreationModeActive(true);
    setSelectedAvatarId(null);
    setCustomAvatarName(DEFAULT_CUSTOM_AVATAR_NAME);
    setBuilderScreenActive(true);
  };

  const getIconInitials = (name: string): string => {
    if (!name.trim()) return '??';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
  };

  const updateAvatarBuild = (key: AvatarBuilderTabId, value: string) => {
    setAvatarBuild(currentBuild => ({ ...currentBuild, [key]: value }));
  };

  const updateHairColor = (colorGroup: HairColorGroup) => {
    const matchingStyle = colorGroup.options.find(option => getHairStyleKey(option.id) === selectedHairStyleKey)
      || colorGroup.options[0];
    updateAvatarBuild('hairStyleId', matchingStyle.id);
  };

  const handleStartClick = () => {
    let finalAvatarBase: Omit<PlayerAvatar, 'selectedYearLevel' | 'selectedCoursePathway'>;

    if (creationModeActive) {
      const name = customAvatarName.trim() || DEFAULT_CUSTOM_AVATAR_NAME;
      const savedAvatarBuild = { ...avatarBuild, accessoryId: 'none' };
      const customArchetypeId = getBuildArchetypeId(savedAvatarBuild);
      finalAvatarBase = {
        id: 'custom',
        name,
        title: selectedArtistIdentity.title,
        description: `${selectedArtistIdentity.description} Appearance: ${selectedSkinTone.name} skin, ${getHairDescription(selectedHairStyle)}, ${selectedFaceStyle.name.toLowerCase()} face, ${selectedOutfit.name.toLowerCase()}, and ${getHeldObjectDescription(selectedHeldObject)}.`,
        iconInitial: getIconInitials(name),
        imageUrl: getAvatarArchetypeSpriteUrl(customArchetypeId),
        colorClass: selectedOutfit.colorClass,
        avatarArchetypeId: customArchetypeId,
        avatarBuild: savedAvatarBuild,
      };
    } else if (selectedAvatarId) {
      const selectedArchetype = AVATARS.find(a => a.id === selectedAvatarId);
      if (!selectedArchetype) return;
      const { avatarBuild: _presetAvatarBuild, ...presetAvatarBase } = selectedArchetype;
      finalAvatarBase = {
        ...presetAvatarBase,
        name: customAvatarName.trim() || selectedArchetype.name,
        avatarArchetypeId: selectedArchetype.id as AvatarArchetypeId,
        imageUrl: selectedArchetype.imageUrl,
      };
    } else {
      return;
    }

    const finalAvatar: PlayerAvatar = {
      ...finalAvatarBase,
      selectedYearLevel,
      selectedCoursePathway,
    };
    onStartNewGameSetupComplete(finalAvatar);
  };

  const renderHairOptionGrid = () => (
    <div className="space-y-4">
      <div className="mb-4">
        <p className="mb-2 text-xs font-black uppercase tracking-normal text-teal-200">No Hair</p>
        <button
          type="button"
          onClick={() => updateAvatarBuild('hairStyleId', STARTER_NO_HAIR_OPTION.id)}
          className={`flex min-h-[8.5rem] w-full flex-col items-center justify-between rounded-md border-2 p-2 text-center transition focus:outline-none focus:ring-2 focus:ring-pink-300 sm:w-44 ${
            avatarBuild.hairStyleId === STARTER_NO_HAIR_OPTION.id
              ? 'border-pink-400 bg-[#5a1b49] text-white'
              : 'border-gray-600 bg-[#283140] text-gray-200 hover:border-pink-300 hover:bg-[#333d4f]'
          }`}
          aria-pressed={avatarBuild.hairStyleId === STARTER_NO_HAIR_OPTION.id}
          aria-label="Choose no hair"
        >
          <AvatarAssetPreview
            imageUrls={getAvatarAssetPreviewImageUrls(avatarBuild, 'hairStyleId', STARTER_NO_HAIR_OPTION.id)}
            tabId="hairStyleId"
            label={STARTER_NO_HAIR_OPTION.name}
            className="h-28 w-28"
          />
          <span className="mt-1 text-xs font-bold leading-tight">{STARTER_NO_HAIR_OPTION.name}</span>
        </button>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-xs font-black uppercase tracking-normal text-teal-200">Hair Colour</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {hairColorGroups.map(colorGroup => {
            const isSelected = colorGroup.id === selectedHairColorId;
            return (
              <button
                key={colorGroup.id}
                type="button"
                onClick={() => updateHairColor(colorGroup)}
                className={`flex min-h-11 min-w-0 items-center gap-2 rounded-md border-2 px-3 py-2 text-left text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-pink-300 ${
                  isSelected
                    ? 'border-pink-400 bg-[#5a1b49] text-white'
                    : 'border-gray-600 bg-[#283140] text-gray-200 hover:border-pink-300 hover:bg-[#333d4f]'
                }`}
                aria-pressed={isSelected}
                aria-label={`Choose ${colorGroup.name} hair colour`}
              >
                <span
                  className="h-5 w-5 rounded-full border-2 border-gray-900 shadow-inner"
                  style={{ backgroundColor: colorGroup.color }}
                  aria-hidden="true"
                />
                <span className="min-w-0 break-words leading-tight">{colorGroup.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-black uppercase tracking-normal text-teal-200">Style</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {selectedHairColorOptions.map(option => {
            const isSelected = avatarBuild.hairStyleId === option.id;
            const previewImageUrls = getAvatarAssetPreviewImageUrls(avatarBuild, 'hairStyleId', option.id);

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => updateAvatarBuild('hairStyleId', option.id)}
                className={`flex min-h-[8.5rem] flex-col items-center justify-between rounded-md border-2 p-2 text-center transition focus:outline-none focus:ring-2 focus:ring-pink-300 ${
                  isSelected
                    ? 'border-pink-400 bg-[#5a1b49] text-white'
                    : 'border-gray-600 bg-[#283140] text-gray-200 hover:border-pink-300 hover:bg-[#333d4f]'
                }`}
                aria-pressed={isSelected}
                aria-label={`Choose ${option.name} hair style`}
              >
                <AvatarAssetPreview
                  imageUrls={previewImageUrls}
                  tabId="hairStyleId"
                  label={option.name}
                  className="h-28 w-28"
                />
                <span className="mt-1 text-xs font-bold leading-tight">{getHairStyleLabel(option)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderSkinToneOptionGrid = () => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {SKIN_TONES.map(option => {
        const isSelected = avatarBuild.skinToneId === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => updateAvatarBuild('skinToneId', option.id)}
            className={`relative flex min-h-[7.5rem] flex-col items-center justify-center rounded-md border-2 p-3 text-center transition focus:outline-none focus:ring-2 focus:ring-pink-300 ${
              isSelected
                ? 'border-pink-400 bg-[#5a1b49] text-white shadow-[0_0_22px_rgba(244,114,182,0.28)]'
              : 'border-gray-600 bg-[#283140] text-gray-200 hover:border-pink-300 hover:bg-[#333d4f]'
            }`}
            aria-pressed={isSelected}
            aria-label={`Choose ${option.name} skin tone`}
          >
            <span
              className="mb-2 h-12 w-12 rounded-md border-2 border-[#080814] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.12),0_5px_0_rgba(0,0,0,0.35)]"
              style={{ backgroundColor: option.color }}
              aria-hidden="true"
            />
            <span className="text-sm font-black leading-tight">{option.name}</span>
          </button>
        );
      })}
    </div>
  );

  const renderActiveOptionGrid = () => (
    <div
      id={`avatar-builder-panel-${activeBuilderTab.id}`}
      role="tabpanel"
      aria-labelledby={`avatar-builder-tab-${activeBuilderTab.id}`}
    >
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-normal text-teal-200">
            Step {activeBuilderTabIndex + 1} of {AVATAR_BUILDER_TABS.length}
          </p>
          <h4 className="text-xl font-black text-pink-300 sm:text-2xl">{activeBuilderTab.label}</h4>
        </div>
        <p className="max-w-full text-sm text-gray-400 sm:text-right">
          Selected: <span className="font-bold text-gray-100">{getOptionById(activeBuilderTab.options, avatarBuild[activeBuilderTab.id]).name}</span>
        </p>
      </div>
      {activeBuilderTab.id === 'skinToneId' ? renderSkinToneOptionGrid() : activeBuilderTab.id === 'hairStyleId' ? renderHairOptionGrid() : (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {activeBuilderTab.options.map(option => {
          const isSelected = avatarBuild[activeBuilderTab.id] === option.id;
          const previewImageUrls = getAvatarAssetPreviewImageUrls(avatarBuild, activeBuilderTab.id, option.id);

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => updateAvatarBuild(activeBuilderTab.id, option.id)}
              className={`flex min-h-[8.5rem] flex-col items-center justify-between rounded-md border-2 p-2 text-center transition focus:outline-none focus:ring-2 focus:ring-pink-300 ${
                isSelected
                  ? 'border-pink-400 bg-[#5a1b49] text-white'
                  : 'border-gray-600 bg-[#283140] text-gray-200 hover:border-pink-300 hover:bg-[#333d4f]'
              }`}
              aria-pressed={isSelected}
              aria-label={`Choose ${option.name} ${activeBuilderTab.label.toLowerCase()}`}
            >
              <AvatarAssetPreview
                imageUrls={previewImageUrls}
                tabId={activeBuilderTab.id}
                label={option.name}
                className="h-28 w-28"
              />
              <span className="mt-1 text-xs font-bold leading-tight">{option.name}</span>
            </button>
          );
        })}
      </div>
      )}
    </div>
  );

  if (builderScreenActive) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#100b18] text-gray-100 selection:bg-pink-500 selection:text-white">
        <div className="relative overflow-hidden" style={ARTIST_SETUP_SCREEN_FRAME_STYLE}>
          <img
            src={AVATAR_BUILDER_BACKGROUND}
            alt="Build your pixel avatar screen"
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />

          <div className="absolute left-[9.8%] top-[8.8%] z-40 grid h-[11.4%] w-[80.8%] grid-cols-5 gap-[1.1%]" role="tablist" aria-label="Avatar builder parts">
            {AVATAR_BUILDER_TABS.map((tab) => {
              const isActiveTab = tab.id === activeBuilderTab.id;

              return (
              <button
                key={tab.id}
                id={`avatar-builder-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isActiveTab}
                aria-controls={`avatar-builder-panel-${tab.id}`}
                onClick={() => setActiveBuilderTabId(tab.id)}
                className={`rounded-sm text-transparent transition hover:bg-white/5 focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-200/80 ${
                  isActiveTab
                    ? 'bg-pink-300/10 ring-2 ring-pink-200/70'
                    : 'bg-transparent'
                }`}
                aria-label={`Show ${tab.label} options`}
              >
                {tab.shortLabel}
              </button>
            );
            })}
          </div>

          <div className="absolute left-[11.6%] top-[28.8%] z-30 flex h-[29.8%] w-[18.6%] items-end justify-center pointer-events-none">
            <AvatarLayeredPreview
              imageUrls={customAvatarImageUrls}
              alt="Custom pixel avatar preview"
              className="h-full w-full drop-shadow-[0_10px_0_rgba(0,0,0,0.28)]"
            />
          </div>

          <input
            type="text"
            id="builderAvatarName"
            value={customAvatarName}
            onChange={(e) => setCustomAvatarName(e.target.value)}
            placeholder="Enter Name"
            className={BUILDER_OVERLAY_NAME_INPUT_CLASS}
            style={{ left: '19.4%', top: '64.2%', width: '9.8%', height: '4.5%' }}
            aria-label="Enter your artist name"
          />

          <div className="absolute left-[12.1%] top-[69.2%] z-30 h-[12.5%] w-[16.7%] overflow-hidden bg-[#111126] px-2 py-1 text-center">
            <p className="text-sm font-bold italic leading-tight text-purple-100 sm:text-base">{selectedArtistIdentity.title}</p>
            <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-200 sm:text-sm">
              {getHairDescription(selectedHairStyle)}, {selectedFaceStyle.name.toLowerCase()} face,<br />
              {selectedOutfit.name.toLowerCase()}, {getHeldObjectDescription(selectedHeldObject)}
            </p>
          </div>

          <select
            id="builderArtistType"
            value={customArtistType}
            onChange={(e) => setCustomArtistType(e.target.value as ArtistType)}
            className={BUILDER_OVERLAY_SELECT_CLASS}
            style={{ left: '33.4%', top: '24.6%', width: '24.9%', height: '4.8%' }}
            aria-label="Artist Type"
          >
            {ARTIST_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>

          <select
            id="builderCreativityFuel"
            value={customCreativityFuel}
            onChange={(e) => setCustomCreativityFuel(e.target.value as CreativityFuel)}
            className={BUILDER_OVERLAY_SELECT_CLASS}
            style={{ left: '60.2%', top: '24.6%', width: '28.5%', height: '4.8%' }}
            aria-label="Creativity Fuel"
          >
            {CREATIVITY_FUELS.map(fuel => <option key={fuel} value={fuel}>{fuel}</option>)}
          </select>

          <div className="absolute left-[40.5%] top-[33.7%] z-30 h-[6.6%] w-[46.6%] overflow-hidden px-2">
            <p className="truncate text-sm font-black leading-tight text-pink-200 sm:text-base">{selectedArtistIdentity.title}</p>
            <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-tight text-white sm:text-xs">{selectedArtistIdentity.description}</p>
          </div>

          <div className="absolute left-[32.3%] top-[43.4%] z-30 h-[40.4%] w-[57.2%] overflow-y-auto rounded-sm bg-[#171121] p-3 shadow-inner narrative-scrollbar sm:p-4">
            {renderActiveOptionGrid()}
          </div>

          <button
            type="button"
            onClick={() => setBuilderScreenActive(false)}
            className="absolute left-[32.1%] top-[86.1%] z-40 h-[6.6%] w-[11.6%] border-2 border-[#080814] bg-[#343142]/90 px-3 text-sm font-black uppercase text-amber-100 shadow-[0_4px_0_rgba(0,0,0,0.55)] transition hover:bg-[#454056] focus:outline-none focus:ring-4 focus:ring-pink-200 sm:text-base"
            aria-label="Back to artist profile"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleStartClick}
            disabled={!selectedYearLevel}
            className="absolute left-[73.4%] top-[86.1%] z-40 h-[6.6%] w-[16.1%] border-2 border-[#080814] bg-[#b93473] px-3 text-sm font-black uppercase text-white shadow-[0_4px_0_rgba(0,0,0,0.55)] transition hover:bg-[#cf4a8a] focus:outline-none focus:ring-4 focus:ring-pink-200 disabled:cursor-not-allowed disabled:grayscale disabled:opacity-60 sm:text-base"
            aria-label="Begin ArtQuest with this custom avatar"
          >
            Begin ArtQuest
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#100b18] text-gray-100 selection:bg-pink-500 selection:text-white">
      <div className="relative overflow-hidden" style={ARTIST_SETUP_SCREEN_FRAME_STYLE}>
        <img
            src={PROFILE_SCREEN_BACKGROUND}
            alt="Create your artist profile screen"
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />

        <select
          id="yearLevel"
          value={selectedAssessmentOptionId}
          onChange={(e) => handleAssessmentOptionChange(e.target.value)}
          className={PROFILE_SELECT_CLASS}
          style={{ left: '39.8%', top: '24.8%', width: '20.7%', height: '6%' }}
          aria-label="Select your current school year level or senior course"
        >
          {SCSA_ASSESSMENT_YEAR_OPTIONS.map(option => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>

        {AVATARS.map((avatar, index) => {
          const leftPositions = ['17.8%', '34.4%', '50.6%'];
          const isSelected = selectedAvatarId === avatar.id && !creationModeActive;

          return (
            <button
              key={avatar.id}
              type="button"
              onClick={() => handleSelectAvatar(avatar.id)}
              className={`${SCREEN_HOTSPOT_CLASS} ${isSelected ? 'bg-pink-300/10 ring-4 ring-pink-300/80' : ''}`}
              style={{ left: leftPositions[index], top: '42.3%', width: '15.7%', height: '37.1%' }}
              aria-pressed={isSelected}
              aria-label={`Select ${avatar.name}, ${avatar.title}`}
            >
              {avatar.name}
            </button>
          );
        })}

        <button
          type="button"
          onClick={handleSelectCreateOwn}
          className={`${SCREEN_HOTSPOT_CLASS} ${creationModeActive ? 'bg-pink-300/10 ring-4 ring-pink-300/80' : ''}`}
          style={{ left: '67%', top: '42.3%', width: '15.2%', height: '37.1%' }}
          aria-pressed={creationModeActive}
          aria-label="Build your own avatar"
        >
          <span className="sr-only" aria-hidden="true">
            <AvatarOutlinePlaceholder className="h-1 w-1" />
          </span>
          Build Your Own
        </button>

        <input
          type="text"
          id="avatarName"
          value={customAvatarName}
          onChange={(e) => setCustomAvatarName(e.target.value)}
          placeholder="Enter your artist name"
          className={PROFILE_TEXT_INPUT_CLASS}
          style={{ left: '26.6%', top: '85.8%', width: '45.8%', height: '6.2%' }}
          aria-label="Enter your artist name"
        />

        <button
          type="button"
          onClick={handleStartClick}
          disabled={(!selectedAvatarId && !creationModeActive) || !selectedYearLevel}
          className={SCREEN_HOTSPOT_CLASS}
          style={{ left: '39.3%', top: '91.4%', width: '22.5%', height: '6.7%' }}
          aria-label="Start new adventure with selected character, year level, and custom name if provided"
        >
          Begin ArtQuest!
        </button>
      </div>
    </div>
  );
};

export default NewGameSetupScreen;
