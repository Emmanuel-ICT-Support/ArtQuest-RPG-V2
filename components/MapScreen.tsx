import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DoorChallengeDefinition,
  DoorChallengeSortItem,
  GalleryScene,
  MapScreenProps,
  PlayerAvatar,
  SeniorCoursePathway,
  SideQuestCaseDefinition,
  SideQuestCaseStatus,
  SideQuestClueDefinition,
  SideQuestPuzzleOption,
  SideQuestSortItem,
  TraitName,
  WingDefinition,
  YearLevel,
} from '../types';
import { getDoorChallengeForWing } from '../data/DoorChallenges';
import { getDoorUnlockAssets } from '../data/DoorUnlockAssets';
import { WING_VISUAL_THEMES, buildGalleryGroups, getWingShortName } from '../data/GalleryLayout';
import { getAvatarBuildForAvatar, getAvatarLayerImageUrls, getAvatarSpriteUrl } from '../data/AvatarRewards';
import { SCSA_ASSESSMENT_YEAR_OPTIONS, getAssessmentYearOptionId } from '../data/SCSACurriculum';
import { SIDE_QUEST_CASES, normalizeSideQuestState } from '../data/SideQuests';
import AvatarLayeredPreview from './AvatarLayeredPreview';
import DoorUnlockAnimation from './DoorUnlockAnimation';
import {
  ArtQuestIconTile,
  ArtQuestPage,
  ArtQuestPanel,
  ArtQuestSectionTitle,
  artQuestCx,
} from './ArtQuestUI';

interface DoorPosition {
  left: string;
  top: string;
  width: string;
  height: string;
}

interface Point {
  x: number;
  y: number;
}

type PlayerDirection = 'up' | 'down' | 'left' | 'right';
type WallArtVariant = 'landscape' | 'portrait' | 'abstract' | 'linework' | 'stillLife';
type NPCScene = 'foyer' | `gallery-${number}`;

interface MovementInput {
  key: string;
  delta: Point;
  facing: PlayerDirection;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface NPCDefinition {
  id: string;
  name: string;
  title: string;
  scene: NPCScene;
  initials: string;
  route: [Point, Point, ...Point[]];
  waitMs: number;
  color: string;
  accent: string;
}

interface NPCRuntimeState {
  position: Point;
  routeIndex: number;
  waitUntil: number;
  direction: PlayerDirection;
  isWalking: boolean;
}

interface WingNpcGuidance {
  approach: string;
  definition: string;
  tip: string;
  compliment: string;
  lockedTease: string;
  completedBridge: string;
}

type SceneAction =
  | { type: 'gallery'; galleryIndex: number }
  | { type: 'wing'; wingId: string }
  | { type: 'foyer' };

type NavigationPromptPlacement = 'left' | 'right' | 'above';

interface NavigationPromptTarget {
  id: string;
  prompt: string;
  point: Point;
  promptPosition: Point;
  placement: NavigationPromptPlacement;
  action: SceneAction | null;
  distance: number;
}

const LEVEL_DOOR_POSITIONS: DoorPosition[] = [
  { left: '12%', top: '14%', width: '18%', height: '22%' },
  { left: '41%', top: '12%', width: '18%', height: '25%' },
  { left: '72%', top: '14%', width: '18%', height: '22%' },
];

const STAGE_IMAGE_WIDTH = 1672;
const STAGE_IMAGE_HEIGHT = 941;
const STAGE_ASPECT_RATIO = STAGE_IMAGE_WIDTH / STAGE_IMAGE_HEIGHT;
const USE_GENERATED_SCENE_ART = false;

const SCENE_BACKGROUND_IMAGES = {
  foyer: './public/images/backgrounds/foyer.png',
  galleries: [
    './public/images/backgrounds/gallery-1.png',
    './public/images/backgrounds/gallery-2.png',
    './public/images/backgrounds/gallery-3.png',
    './public/images/backgrounds/gallery-4.png',
  ],
};

const fallbackTheme = WING_VISUAL_THEMES.hall_of_line;
const MOVE_STEP = 2.4;
const PLAYER_HALF_WIDTH = 2.2;
const PLAYER_HALF_DEPTH = 2.2;
const PLAYER_FEET_OFFSET = 10;
const NPC_MOVE_STEP = 0.58;
const NPC_TICK_MS = 80;
const NPC_TALK_DISTANCE = 10.5;
const NPC_DOOR_FOCUS_DISTANCE = 12;
const DOOR_GUARD_TALK_DISTANCE = 11;
const NAVIGATION_PROMPT_DISTANCE = 13;
const PIP_TALK_DISTANCE = 11;
const CLUE_INTERACTION_DISTANCE = 8.5;
const NPC_SPRITE_SRC = './public/images/npcs/gallery-guide.png';
const DOOR_GUARD_SPRITE_SRC = './public/images/npcs/gallery-guard.png';
const PIP_SPRITE_SRC = './public/images/npcs/pip.png';
const FOYER_SPAWN: Point = { x: 50, y: 68 };
const GALLERY_SPAWN: Point = { x: 50, y: 62 };

const PIP_POSITIONS: Record<NPCScene, Point> = {
  foyer: { x: 54, y: 59 },
  'gallery-0': { x: 73, y: 62 },
  'gallery-1': { x: 74, y: 63 },
  'gallery-2': { x: 74, y: 63 },
  'gallery-3': { x: 74, y: 63 },
};

const FOYER_FIXED_BLOCKING_RECTS: Rect[] = [
  { x: 0, y: 0, width: 100, height: 31 },
  { x: 0, y: 0, width: 10, height: 100 },
  { x: 90, y: 0, width: 10, height: 100 },
  { x: 30.6, y: 31.6, width: 5.8, height: 10.5 },
  { x: 68.1, y: 31.6, width: 5.8, height: 10.5 },
  { x: 30.2, y: 49.5, width: 1.8, height: 5.6 },
  { x: 70.3, y: 49.5, width: 1.8, height: 5.6 },
  { x: 17, y: 83, width: 25, height: 14 },
  { x: 61, y: 83, width: 25, height: 14 },
];

const GALLERY_BOUNDARY_BLOCKING_RECTS: Rect[] = [
  { x: 0, y: 0, width: 100, height: 32 },
  { x: 0, y: 0, width: 6, height: 100 },
  { x: 94, y: 0, width: 6, height: 100 },
];

// Collision uses the avatar's feet, so these boxes track floor footprints rather than full prop artwork.
const GALLERY_FIXED_BLOCKING_RECTS_BY_INDEX: Rect[][] = [
  [
    { x: 34.2, y: 34.8, width: 3.8, height: 10.2 },
    { x: 61.7, y: 34.8, width: 3.8, height: 10.2 },
    { x: 32.3, y: 48, width: 1.7, height: 4.8 },
    { x: 66.2, y: 48, width: 1.7, height: 4.8 },
    { x: 44.3, y: 81, width: 11.5, height: 7.5 },
  ],
  [
    { x: 34.5, y: 32.4, width: 4, height: 12.6 },
    { x: 63.7, y: 32.4, width: 4, height: 12.6 },
    { x: 31.1, y: 41.1, width: 2.1, height: 4.5 },
    { x: 67.7, y: 41.1, width: 2.1, height: 4.5 },
    { x: 43.7, y: 78.8, width: 12.6, height: 9.2 },
  ],
  [
    { x: 34, y: 34.5, width: 3.5, height: 8.5 },
    { x: 62.4, y: 34.5, width: 3.5, height: 8.5 },
    { x: 31.2, y: 38.6, width: 2.1, height: 4.4 },
    { x: 41.2, y: 38.3, width: 1.8, height: 4.3 },
    { x: 57.8, y: 38.3, width: 1.8, height: 4.3 },
    { x: 67.1, y: 38.6, width: 2.1, height: 4.4 },
    { x: 43.4, y: 79.6, width: 13.2, height: 8.8 },
  ],
  [
    { x: 35.7, y: 35.3, width: 3.6, height: 7.8 },
    { x: 61.6, y: 35.3, width: 3.6, height: 7.8 },
    { x: 34.3, y: 38.7, width: 2.2, height: 4.6 },
    { x: 64.8, y: 38.7, width: 2.2, height: 4.6 },
    { x: 42.6, y: 77.2, width: 14.8, height: 10.8 },
  ],
];

// The right-side gallery doorway is an interaction target, but its wall/frame should stay solid.
// These blockers start to the right of the nearby torches so the main walking lane remains open.
const GALLERY_SIDE_DOOR_BLOCKING_RECTS_BY_INDEX: Rect[][] = [
  [
    { x: 76.8, y: 40.5, width: 17.2, height: 7 },
    { x: 78.8, y: 47, width: 15.2, height: 30.5 },
  ],
  [
    { x: 78, y: 39.2, width: 16, height: 7.5 },
    { x: 78.8, y: 46.7, width: 15.2, height: 31.5 },
  ],
  [
    { x: 76.5, y: 40.8, width: 17.5, height: 7.2 },
    { x: 78.8, y: 48, width: 15.2, height: 30 },
  ],
  [
    { x: 77.4, y: 40.8, width: 16.6, height: 7.2 },
    { x: 78.8, y: 48, width: 15.2, height: 30 },
  ],
];

const getGalleryFixedBlockingRects = (galleryIndex: number): Rect[] => [
  ...GALLERY_BOUNDARY_BLOCKING_RECTS,
  ...(GALLERY_FIXED_BLOCKING_RECTS_BY_INDEX[galleryIndex] || GALLERY_FIXED_BLOCKING_RECTS_BY_INDEX[0]),
  ...(GALLERY_SIDE_DOOR_BLOCKING_RECTS_BY_INDEX[galleryIndex] || GALLERY_SIDE_DOOR_BLOCKING_RECTS_BY_INDEX[0]),
];

const NPC_DEFINITIONS: NPCDefinition[] = [
  {
    id: 'foyer-keeper',
    name: 'Mira',
    title: 'Foyer Guide',
    scene: 'foyer',
    initials: 'M',
    route: [{ x: 62, y: 56 }, { x: 72, y: 56 }, { x: 72, y: 66 }, { x: 62, y: 66 }],
    waitMs: 900,
    color: '#7c2d12',
    accent: '#fbbf24',
  },
  {
    id: 'gallery-one-guide',
    name: 'Ivo',
    title: 'Element Guide',
    scene: 'gallery-0',
    initials: 'I',
    route: [{ x: 24, y: 60 }, { x: 34, y: 60 }, { x: 34, y: 72 }, { x: 24, y: 72 }],
    waitMs: 850,
    color: '#1d4ed8',
    accent: '#facc15',
  },
  {
    id: 'gallery-two-guide',
    name: 'Sera',
    title: 'Surface Guide',
    scene: 'gallery-1',
    initials: 'S',
    route: [{ x: 25, y: 60 }, { x: 37, y: 64 }, { x: 37, y: 74 }, { x: 25, y: 74 }],
    waitMs: 1000,
    color: '#047857',
    accent: '#a7f3d0',
  },
  {
    id: 'gallery-three-guide',
    name: 'Toma',
    title: 'Principle Guide',
    scene: 'gallery-2',
    initials: 'T',
    route: [{ x: 24, y: 60 }, { x: 36, y: 60 }, { x: 36, y: 74 }, { x: 24, y: 74 }],
    waitMs: 900,
    color: '#be123c',
    accent: '#fde68a',
  },
  {
    id: 'gallery-four-guide',
    name: 'Nell',
    title: 'Mastery Guide',
    scene: 'gallery-3',
    initials: 'N',
    route: [{ x: 24, y: 60 }, { x: 38, y: 64 }, { x: 38, y: 74 }, { x: 24, y: 74 }],
    waitMs: 950,
    color: '#6d28d9',
    accent: '#f0abfc',
  },
];

const FALLBACK_NPC_GUIDANCE: WingNpcGuidance = {
  approach: 'Welcome, Art Adventurer. The gallery is listening closely.',
  definition: 'Look closely first, then connect what you see to an art idea.',
  tip: 'Use visual evidence: name the detail, describe where it is, and explain its effect.',
  compliment: 'Strong gallery thinking.',
  lockedTease: 'keep your eyes sharp for the next clue.',
  completedBridge: 'Another secret wakes in the walls.',
};

const WING_NPC_GUIDANCE: Record<string, WingNpcGuidance> = {
  hall_of_line: {
    approach: 'Welcome, Art Adventurer. The Hall of Line is sketching a path for you.',
    definition: 'Line is a mark or pathway that can be straight, curved, jagged, flowing, or implied.',
    tip: 'Describe where the lines lead your eye and what kind of energy they create.',
    compliment: 'Sharp seeing in the Hall of Line.',
    lockedTease: 'watch for lines that behave like secret paths.',
    completedBridge: 'The ink paths have answered you.',
  },
  realm_of_colour: {
    approach: 'Step boldly, Art Adventurer. The Realm of Colour is warming and cooling at once.',
    definition: 'Colour uses hue, warmth, coolness, intensity, and contrast to shape mood.',
    tip: 'Look for warm, cool, complementary, symbolic, vibrant, or muted colour choices.',
    compliment: 'Your colour reading is glowing.',
    lockedTease: 'prepare to read colour like fire, water, memory, and mood.',
    completedBridge: 'The colour gates shimmer behind you.',
  },
  shape_form_forge: {
    approach: 'Forge ahead, Art Adventurer. Shape and form are waiting at the anvil.',
    definition: 'Shape is flat and two-dimensional; form feels three-dimensional, with volume or depth.',
    tip: 'Name geometric, organic, angular, curved, flat, or solid-looking forms.',
    compliment: 'You forged clear shape and form evidence.',
    lockedTease: 'look for flat shapes that become solid-looking forms.',
    completedBridge: 'The forge sparks with your discoveries.',
  },
  texture_tower: {
    approach: 'Climb carefully, Art Adventurer. Texture Tower is full of surfaces with stories.',
    definition: 'Texture describes how a surface looks or might feel.',
    tip: 'Use sensory words like rough, smooth, layered, polished, grainy, or tactile.',
    compliment: 'Excellent texture noticing.',
    lockedTease: 'ready your sensory words before touching the tower with your eyes.',
    completedBridge: 'The tower walls remember your careful descriptions.',
  },
  space_chamber: {
    approach: 'Mind the doorway, Art Adventurer. Space Chamber bends near and far.',
    definition: 'Space is the area in and around objects, including positive, negative, shallow, or deep space.',
    tip: 'Describe foreground, background, overlap, perspective, and positive or negative space.',
    compliment: 'You handled space with real depth.',
    lockedTease: 'notice what is filled, what is empty, and what seems far away.',
    completedBridge: 'The chamber opens wider because of your insight.',
  },
  value_vault: {
    approach: 'Lanterns low, Art Adventurer. The Value Vault hides clues in light and shadow.',
    definition: 'Value means how light or dark a colour or tone appears.',
    tip: 'Look for highlights, shadows, gradients, tonal contrast, and luminous areas.',
    compliment: 'Your value analysis brought the shadows into focus.',
    lockedTease: 'track the brightest highlights and deepest shadows.',
    completedBridge: 'The vault brightens where your evidence landed.',
  },
  balance_bridge: {
    approach: 'Steady steps, Art Adventurer. Balance Bridge tests visual weight.',
    definition: 'Balance is how visual weight is arranged across a composition.',
    tip: 'Decide whether the image feels symmetrical, asymmetrical, stable, or deliberately uneven.',
    compliment: 'You crossed Balance Bridge with steady evidence.',
    lockedTease: 'ask whether both sides feel equal, tense, or deliberately uneven.',
    completedBridge: 'The bridge holds firm after your judgement.',
  },
  emphasis_arena: {
    approach: 'Eyes up, Art Adventurer. Emphasis Arena throws a spotlight on the boldest clue.',
    definition: 'Emphasis makes one area stand out as a focal point.',
    tip: 'Look for contrast, scale, colour, placement, spotlighting, or directional lines.',
    compliment: 'You found the focal point with confidence.',
    lockedTease: 'hunt for the place your eye lands first.',
    completedBridge: 'The arena cheers for your focal-point instincts.',
  },
  unity_garden: {
    approach: 'Welcome to the living path, Art Adventurer. Unity Garden ties difference into harmony.',
    definition: 'Unity is visual harmony; variety adds difference so the image stays interesting.',
    tip: 'Describe repeated motifs, connections, harmony, contrast, and cohesive choices.',
    compliment: 'Your Unity Garden response tied the parts together.',
    lockedTease: 'watch how repeated parts connect the whole design.',
    completedBridge: 'The garden has woven your ideas into bloom.',
  },
  rhythm_pattern_pavilion: {
    approach: 'Listen with your eyes, Art Adventurer. Rhythm and Pattern Pavilion beats in repeats.',
    definition: 'Rhythm and pattern use repetition to create visual beats or movement.',
    tip: 'Look for regular, alternating, flowing, repeated, or interrupted patterns.',
    compliment: 'You caught the visual rhythm beautifully.',
    lockedTease: 'count the repeats and notice how they move your eye.',
    completedBridge: 'The pavilion keeps time with your discoveries.',
  },
  hall_of_movement: {
    approach: 'The floor stirs, Art Adventurer. The Hall of Movement wants your eye to travel.',
    definition: 'Movement guides the viewer through the artwork or suggests action and direction.',
    tip: 'Trace pathways, diagonals, gestures, flow, and dynamic directional cues.',
    compliment: 'You followed the movement with strong visual evidence.',
    lockedTease: 'follow diagonals, gestures, and flowing paths like a map.',
    completedBridge: 'The hall races forward with your analysis.',
  },
  final_room: {
    approach: 'Welcome to the last threshold, Art Adventurer. The Final Room gathers every secret you earned.',
    definition: 'The Final Room asks you to combine elements and principles into one reasoned reflection.',
    tip: 'Use evidence from line, colour, value, balance, emphasis, rhythm, and movement.',
    compliment: 'Your final reflection shows real artistic insight.',
    lockedTease: 'gather every gem of evidence before the final door.',
    completedBridge: 'The Gallery of Secrets glows with your completed journey.',
  },
};

const AVATAR_MOTION_STYLES = `
  .artquest-avatar-shell {
    --avatar-face-x: 1;
    --avatar-face-y: 1;
    --avatar-face-tilt: 0deg;
    --avatar-face-offset-y: 0px;
    --avatar-face-filter: none;
    transform-origin: 50% 100%;
  }

  .artquest-avatar-facing-left {
    --avatar-face-x: 1;
    --avatar-face-tilt: -4deg;
  }

  .artquest-avatar-facing-right {
    --avatar-face-x: -1;
    --avatar-face-tilt: 4deg;
  }

  .artquest-avatar-facing-up {
    --avatar-face-y: 0.93;
    --avatar-face-offset-y: -3px;
    --avatar-face-filter: brightness(0.82) saturate(0.9);
  }

  .artquest-avatar-facing-down {
    --avatar-face-y: 1.03;
    --avatar-face-filter: brightness(1.06) saturate(1.05);
  }

  .artquest-avatar-body {
    transform-origin: 50% 100%;
    will-change: transform;
  }

  .artquest-avatar-visual {
    transform: translateY(var(--avatar-face-offset-y)) scaleX(var(--avatar-face-x)) scaleY(var(--avatar-face-y)) rotate(var(--avatar-face-tilt));
    transform-origin: 50% 100%;
    filter: var(--avatar-face-filter);
    transition: filter 120ms ease, transform 120ms ease;
    will-change: transform, filter;
  }

  .artquest-avatar-placeholder {
    position: relative;
    overflow: hidden;
  }

  .artquest-avatar-placeholder > span {
    display: inline-block;
    transform: scaleX(var(--avatar-face-x));
  }

  .artquest-avatar-placeholder::after {
    content: "";
    position: absolute;
    height: 0.5rem;
    width: 0.5rem;
    border: 2px solid rgba(15, 23, 42, 0.9);
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.86);
    transition: inset 120ms ease, transform 120ms ease;
  }

  .artquest-avatar-facing-left .artquest-avatar-placeholder::after {
    right: 0.25rem;
    top: 42%;
  }

  .artquest-avatar-facing-right .artquest-avatar-placeholder::after {
    left: 0.25rem;
    top: 42%;
  }

  .artquest-avatar-facing-up .artquest-avatar-placeholder::after {
    left: 50%;
    top: 0.35rem;
    transform: translateX(-50%) scale(0.78);
  }

  .artquest-avatar-facing-down .artquest-avatar-placeholder::after {
    bottom: 0.35rem;
    left: 50%;
    transform: translateX(-50%);
  }

  .artquest-avatar-shadow {
    position: absolute;
    bottom: -0.12rem;
    left: 50%;
    height: 0.55rem;
    width: 2.7rem;
    transform: translateX(-50%);
    border-radius: 9999px;
    background: rgba(15, 23, 42, 0.36);
    filter: blur(1px);
    transition: opacity 120ms ease, transform 120ms ease, width 120ms ease;
  }

  .artquest-avatar-facing-up .artquest-avatar-shadow {
    width: 2.35rem;
    opacity: 0.26;
  }

  .artquest-avatar-facing-down .artquest-avatar-shadow {
    width: 2.95rem;
    opacity: 0.42;
  }

  .artquest-avatar-step {
    position: absolute;
    bottom: -0.18rem;
    height: 0.38rem;
    width: 0.82rem;
    border: 2px solid rgba(15, 23, 42, 0.78);
    background: rgba(251, 191, 36, 0.82);
    opacity: 0;
    transition: opacity 100ms ease;
  }

  .artquest-avatar-step-left {
    left: 0.42rem;
  }

  .artquest-avatar-step-right {
    right: 0.42rem;
  }

  .artquest-avatar-walking .artquest-avatar-body {
    animation: artquest-avatar-walk 340ms steps(2, end) infinite;
  }

  .artquest-avatar-walking .artquest-avatar-shadow {
    animation: artquest-avatar-shadow-step 340ms steps(2, end) infinite;
  }

  .artquest-avatar-walking .artquest-avatar-step-left {
    animation: artquest-avatar-left-step 340ms steps(2, end) infinite;
  }

  .artquest-avatar-walking .artquest-avatar-step-right {
    animation: artquest-avatar-right-step 340ms steps(2, end) infinite;
  }

  @keyframes artquest-avatar-walk {
    0%, 100% {
      transform: translate(0, 0) rotate(-1.5deg);
    }
    25% {
      transform: translate(1px, -4px) rotate(3deg);
    }
    50% {
      transform: translate(0, 0) rotate(1.5deg);
    }
    75% {
      transform: translate(-1px, -3px) rotate(-3deg);
    }
  }

  @keyframes artquest-avatar-shadow-step {
    0%, 100% {
      transform: translateX(-50%) scaleX(1);
      opacity: 0.34;
    }
    50% {
      transform: translateX(-50%) scaleX(0.78);
      opacity: 0.24;
    }
  }

  @keyframes artquest-avatar-left-step {
    0%, 49% {
      opacity: 0.86;
      transform: translateY(0);
    }
    50%, 100% {
      opacity: 0.08;
      transform: translateY(-1px);
    }
  }

  @keyframes artquest-avatar-right-step {
    0%, 49% {
      opacity: 0.08;
      transform: translateY(-1px);
    }
    50%, 100% {
      opacity: 0.86;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .artquest-avatar-walking .artquest-avatar-body,
    .artquest-avatar-walking .artquest-avatar-shadow,
    .artquest-avatar-walking .artquest-avatar-step-left,
    .artquest-avatar-walking .artquest-avatar-step-right {
      animation: none;
    }
  }
`;

const percentToNumber = (value: string): number => Number(value.replace('%', ''));

const doorRectFromPosition = (position: DoorPosition): Rect => ({
  x: percentToNumber(position.left),
  y: percentToNumber(position.top),
  width: percentToNumber(position.width),
  height: percentToNumber(position.height) + 5,
});

const doorEntryRectFromPosition = (position: DoorPosition): Rect => {
  const doorRect = doorRectFromPosition(position);
  const width = Math.min(8, doorRect.width * 0.45);

  return {
    x: doorRect.x + (doorRect.width - width) / 2,
    y: 36,
    width,
    height: 8,
  };
};

const expandedRect = (rect: Rect, amount: number): Rect => ({
  x: rect.x - amount,
  y: rect.y - amount,
  width: rect.width + amount * 2,
  height: rect.height + amount * 2,
});

const rectsOverlap = (first: Rect, second: Rect): boolean => (
  first.x < second.x + second.width
  && first.x + first.width > second.x
  && first.y < second.y + second.height
  && first.y + first.height > second.y
);

const distanceBetween = (first: Point, second: Point): number => (
  Math.hypot(first.x - second.x, first.y - second.y)
);

const directionForDelta = (delta: Point, fallback: PlayerDirection): PlayerDirection => {
  if (Math.abs(delta.x) > Math.abs(delta.y)) {
    return delta.x >= 0 ? 'right' : 'left';
  }

  if (Math.abs(delta.y) > 0) {
    return delta.y >= 0 ? 'down' : 'up';
  }

  return fallback;
};

const sceneKeyForScene = (scene: GalleryScene): NPCScene => (
  scene === 'foyer' ? 'foyer' : (`gallery-${scene}` as NPCScene)
);

const createInitialNpcStates = (): Record<string, NPCRuntimeState> => {
  const now = Date.now();

  return NPC_DEFINITIONS.reduce<Record<string, NPCRuntimeState>>((states, npc) => {
    states[npc.id] = {
      position: npc.route[0],
      routeIndex: 0,
      waitUntil: now + npc.waitMs,
      direction: 'down',
      isWalking: false,
    };
    return states;
  }, {});
};

const getNpcGuidance = (wingId: string): WingNpcGuidance => (
  WING_NPC_GUIDANCE[wingId] || FALLBACK_NPC_GUIDANCE
);

const getPlayerFeet = (position: Point): Point => ({
  x: position.x,
  y: position.y + PLAYER_FEET_OFFSET,
});

const getPlayerHitbox = (position: Point): Rect => {
  const feet = getPlayerFeet(position);
  return {
    x: feet.x - PLAYER_HALF_WIDTH,
    y: feet.y - PLAYER_HALF_DEPTH,
    width: PLAYER_HALF_WIDTH * 2,
    height: PLAYER_HALF_DEPTH * 2,
  };
};

const movementInputForKey = (rawKey: string): MovementInput | null => {
  const key = rawKey.toLowerCase();

  if (key === 'arrowup' || key === 'w') {
    return { key, delta: { x: 0, y: -MOVE_STEP }, facing: 'up' };
  }

  if (key === 'arrowdown' || key === 's') {
    return { key, delta: { x: 0, y: MOVE_STEP }, facing: 'down' };
  }

  if (key === 'arrowleft' || key === 'a') {
    return { key, delta: { x: -MOVE_STEP, y: 0 }, facing: 'left' };
  }

  if (key === 'arrowright' || key === 'd') {
    return { key, delta: { x: MOVE_STEP, y: 0 }, facing: 'right' };
  }

  return null;
};

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
};

const avatarImageSrc = (avatar: PlayerAvatar | null): string | null => {
  if (!avatar) return null;
  return getAvatarSpriteUrl(avatar);
};

const isMapPixelAvatarSpriteSrc = (src: string | null): boolean => (
  !!src && src.startsWith('./public/images/')
);

const getWingArtPrincipleSummary = (wingDef: WingDefinition): string => {
  const coreConcept = wingDef.artPrinciple.split(' - ')[0].trim();

  if (wingDef.id === 'final_room') {
    return coreConcept;
  }

  const typeMatch = coreConcept.match(/\((Element|Elements|Principle|Principles)\)$/);
  if (!typeMatch?.[1]) return coreConcept;

  const namePart = coreConcept.replace(/\s*\((Element|Elements|Principle|Principles)\)$/, '').trim();
  return typeMatch[1].includes('Element')
    ? `Art Element: ${namePart}`
    : `Art Principle: ${namePart}`;
};

const moveItemInOrder = (order: string[], itemId: string, targetIndex: number): string[] => {
  const currentIndex = order.indexOf(itemId);
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= order.length || currentIndex === targetIndex) {
    return order;
  }

  const nextOrder = [...order];
  nextOrder.splice(currentIndex, 1);
  nextOrder.splice(targetIndex, 0, itemId);
  return nextOrder;
};

const isSortOrderCorrect = (order: string[], correctOrder: string[]): boolean => (
  order.length === correctOrder.length
  && correctOrder.every((itemId, index) => order[index] === itemId)
);

const shuffleValues = <T,>(values: T[]): T[] => {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
};

const createShuffledOptionOrder = (
  options: SideQuestPuzzleOption[],
  correctOptionId: string,
): string[] => {
  const shuffledIds = shuffleValues(options.map((option) => option.id));

  if (shuffledIds.length > 1 && shuffledIds[0] === correctOptionId) {
    const swapIndex = 1 + Math.floor(Math.random() * (shuffledIds.length - 1));
    [shuffledIds[0], shuffledIds[swapIndex]] = [shuffledIds[swapIndex], shuffledIds[0]];
  }

  return shuffledIds;
};

const createShuffledSortOrder = (
  items: SideQuestSortItem[],
  correctOrder: string[],
): string[] => {
  const shuffledIds = shuffleValues(items.map((item) => item.id));

  if (shuffledIds.length > 1 && isSortOrderCorrect(shuffledIds, correctOrder)) {
    [shuffledIds[0], shuffledIds[1]] = [shuffledIds[1], shuffledIds[0]];
  }

  return shuffledIds;
};

const getOptionsInOrder = (
  options: SideQuestPuzzleOption[],
  optionOrder: string[],
): SideQuestPuzzleOption[] => {
  const optionsById = new Map(options.map((option) => [option.id, option]));
  const orderedOptions = optionOrder
    .map((optionId) => optionsById.get(optionId))
    .filter((option): option is SideQuestPuzzleOption => Boolean(option));

  return orderedOptions.length === options.length ? orderedOptions : options;
};

const getDoorGuardPoint = (doorIndex: number): Point => {
  const doorRect = doorRectFromPosition(LEVEL_DOOR_POSITIONS[doorIndex]);
  const isRightmostDoor = doorIndex === LEVEL_DOOR_POSITIONS.length - 1;

  return {
    x: isRightmostDoor ? doorRect.x - 2.5 : doorRect.x + doorRect.width + 2.5,
    y: doorRect.y + doorRect.height - 10,
  };
};

const getDoorInteractionPoint = (doorIndex: number): Point => {
  const doorEntryRect = doorEntryRectFromPosition(LEVEL_DOOR_POSITIONS[doorIndex]);

  return {
    x: doorEntryRect.x + doorEntryRect.width / 2,
    y: doorEntryRect.y + doorEntryRect.height / 2,
  };
};

export const MapScreen: React.FC<MapScreenProps> = ({
  selectedAvatar,
  playerStats,
  wingsState,
  currentGalleryScene,
  onGallerySceneChange,
  onSelectWing,
  wingDefinitions,
  learningJournal,
  sideQuestState,
  onNavigateToJournal,
  onNavigateToInventory,
  onNavigateToGuide,
  onNavigateToAssessment,
  onReturnToStartScreen,
  onSaveGame,
  onUpdateTeacherYearSelection,
  teacherMode = false,
  onCompleteEntryChallenge,
  onStartSideQuestCase,
  onCollectSideQuestClue,
  onCompleteSideQuestCase,
  onMovementStep,
  onDoorUnlockStart,
  onDoorUnlockEnd,
  onUnlockDoor,
  onDoorOpening,
}) => {
  const [scene, setLocalScene] = useState<GalleryScene>(currentGalleryScene);
  const [playerPosition, setPlayerPosition] = useState<Point>(FOYER_SPAWN);
  const [playerDirection, setPlayerDirection] = useState<PlayerDirection>('down');
  const [isPlayerWalking, setIsPlayerWalking] = useState<boolean>(false);
  const [npcStates, setNpcStates] = useState<Record<string, NPCRuntimeState>>(() => createInitialNpcStates());
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);
  const [activeDoorGuardWingId, setActiveDoorGuardWingId] = useState<string | null>(null);
  const [activeChallengeWingId, setActiveChallengeWingId] = useState<string | null>(null);
  const [activeDoorUnlockWingId, setActiveDoorUnlockWingId] = useState<string | null>(null);
  const [selectedChallengeOptionId, setSelectedChallengeOptionId] = useState<string | null>(null);
  const [sortChallengeOrder, setSortChallengeOrder] = useState<string[]>([]);
  const [draggedSortItemId, setDraggedSortItemId] = useState<string | null>(null);
  const [challengeFeedback, setChallengeFeedback] = useState<string | null>(null);
  const [isChallengeHintVisible, setIsChallengeHintVisible] = useState<boolean>(false);
  const [isChallengeSolved, setIsChallengeSolved] = useState<boolean>(false);
  const [activePipCaseId, setActivePipCaseId] = useState<string | null>(null);
  const [activeSideQuestClue, setActiveSideQuestClue] = useState<{ caseId: string; clueId: string } | null>(null);
  const [clueOptionOrder, setClueOptionOrder] = useState<string[]>([]);
  const [selectedClueOptionId, setSelectedClueOptionId] = useState<string | null>(null);
  const [clueFeedback, setClueFeedback] = useState<string | null>(null);
  const [isClueHintVisible, setIsClueHintVisible] = useState<boolean>(false);
  const [isClueSolved, setIsClueSolved] = useState<boolean>(false);
  const [activeFinalCaseId, setActiveFinalCaseId] = useState<string | null>(null);
  const [finalOptionOrder, setFinalOptionOrder] = useState<string[]>([]);
  const [selectedFinalOptionId, setSelectedFinalOptionId] = useState<string | null>(null);
  const [finalSortOrder, setFinalSortOrder] = useState<string[]>([]);
  const [draggedFinalItemId, setDraggedFinalItemId] = useState<string | null>(null);
  const [finalFeedback, setFinalFeedback] = useState<string | null>(null);
  const [isFinalHintVisible, setIsFinalHintVisible] = useState<boolean>(false);
  const [isFinalSolved, setIsFinalSolved] = useState<boolean>(false);
  const [isCaseFilesOpen, setIsCaseFilesOpen] = useState<boolean>(false);
  const [selectedCaseFileCaseId, setSelectedCaseFileCaseId] = useState<string>(SIDE_QUEST_CASES[0]?.id || '');
  const [stageSize, setStageSize] = useState<{ width: number; height: number }>({ width: 1280, height: 720 });
  const mainRef = useRef<HTMLDivElement | null>(null);
  const playerPositionRef = useRef<Point>(FOYER_SPAWN);
  const activeNpcIdRef = useRef<string | null>(null);
  const pressedMovementKeysRef = useRef<Set<string>>(new Set());
  const walkingStopTimerRef = useRef<number | null>(null);

  const galleryGroups = useMemo(() => buildGalleryGroups(wingDefinitions), [wingDefinitions]);
  const activeGallery = typeof scene === 'number' ? galleryGroups[scene] : null;
  const currentSceneKey = sceneKeyForScene(scene);
  const sceneNpcs = useMemo(
    () => NPC_DEFINITIONS.filter((npc) => npc.scene === currentSceneKey),
    [currentSceneKey],
  );
  const avatarSrc = avatarImageSrc(selectedAvatar);
  const isPixelAvatarSprite = isMapPixelAvatarSpriteSrc(avatarSrc);
  const avatarLayerImageUrls = selectedAvatar?.id === 'custom' && selectedAvatar.avatarBuild
    ? getAvatarLayerImageUrls(getAvatarBuildForAvatar(selectedAvatar))
    : [];
  const shouldUseLayeredAvatar = avatarLayerImageUrls.length > 1;
  const solvedWingsCount = wingDefinitions.filter((wing) => wingsState[wing.id]?.isSolved).length;
  const allWingsComplete = wingDefinitions.every((wing) => wingsState[wing.id]?.isSolved);
  const selectedYearLevel = selectedAvatar?.selectedYearLevel || 9;
  const selectedCoursePathway = selectedAvatar?.selectedCoursePathway;
  const selectedTeacherYearOptionId = getAssessmentYearOptionId(
    selectedYearLevel as YearLevel,
    selectedCoursePathway,
  );
  const activeDoorChallenge = useMemo(
    () => activeChallengeWingId
      ? getDoorChallengeForWing(activeChallengeWingId, selectedYearLevel, selectedCoursePathway)
      : null,
    [activeChallengeWingId, selectedCoursePathway, selectedYearLevel],
  );
  const normalizedSideQuestState = useMemo(
    () => normalizeSideQuestState(sideQuestState),
    [sideQuestState],
  );
  const currentSceneCase = useMemo(
    () => SIDE_QUEST_CASES.find((sideQuestCase) => sideQuestCase.scene === scene) || null,
    [scene],
  );
  const pipPosition = PIP_POSITIONS[currentSceneKey] || PIP_POSITIONS.foyer;
  const activeSideQuestClueDefinition = activeSideQuestClue
    ? SIDE_QUEST_CASES
        .find((sideQuestCase) => sideQuestCase.id === activeSideQuestClue.caseId)
        ?.clues.find((clue) => clue.id === activeSideQuestClue.clueId) || null
    : null;
  const activeSideQuestCase = activeSideQuestClue
    ? SIDE_QUEST_CASES.find((sideQuestCase) => sideQuestCase.id === activeSideQuestClue.caseId) || null
    : null;
  const activeFinalCase = activeFinalCaseId
    ? SIDE_QUEST_CASES.find((sideQuestCase) => sideQuestCase.id === activeFinalCaseId) || null
    : null;
  const selectedCaseFileCase = SIDE_QUEST_CASES.find((sideQuestCase) => sideQuestCase.id === selectedCaseFileCaseId)
    || currentSceneCase
    || SIDE_QUEST_CASES[0];
  const currentDoorGuardTarget = useMemo(() => {
    if (!activeGallery) return null;

    const wingId = activeGallery.wingIds.find((candidateWingId) => !wingsState[candidateWingId]?.isSolved);
    if (!wingId) return null;

    return {
      wingId,
      doorIndex: activeGallery.wingIds.indexOf(wingId),
    };
  }, [activeGallery, wingsState]);
  const nearbyNpc = useMemo(() => {
    const nearestNpc = sceneNpcs
      .map((npc) => ({
        npc,
        distance: distanceBetween(playerPosition, npcStates[npc.id]?.position || npc.route[0]),
      }))
      .filter(({ distance }) => distance <= NPC_TALK_DISTANCE)
      .sort((first, second) => first.distance - second.distance)[0];

    return nearestNpc?.npc || null;
  }, [npcStates, playerPosition, sceneNpcs]);

  useEffect(() => {
    const updateStageSize = () => {
      const mainElement = mainRef.current;
      if (!mainElement) return;

      const bounds = mainElement.getBoundingClientRect();
      if (bounds.width < 1 || bounds.height < 1) return;

      const nextWidth = Math.min(bounds.width, bounds.height * STAGE_ASPECT_RATIO);
      const nextHeight = nextWidth / STAGE_ASPECT_RATIO;

      setStageSize((previousSize) => {
        if (
          Math.abs(previousSize.width - nextWidth) < 1
          && Math.abs(previousSize.height - nextHeight) < 1
        ) {
          return previousSize;
        }

        return { width: nextWidth, height: nextHeight };
      });
    };

    updateStageSize();

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(updateStageSize)
      : null;

    if (resizeObserver && mainRef.current) {
      resizeObserver.observe(mainRef.current);
    }

    window.addEventListener('resize', updateStageSize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateStageSize);
    };
  }, []);

  const setScene = (nextScene: GalleryScene) => {
    setLocalScene(nextScene);
    onGallerySceneChange(nextScene);
  };

  const getWingById = (wingId: string): WingDefinition | undefined => {
    return wingDefinitions.find((wing) => wing.id === wingId);
  };

  const isWingAccessible = (wingId: string): boolean => {
    const wingState = wingsState[wingId];
    if (!wingState) return false;
    if (wingState.isUnlocked || wingState.isSolved || wingId === wingDefinitions[0]?.id) return true;
    return wingDefinitions.some((wing) => wing.unlocks === wingId && !!wingsState[wing.id]?.isSolved);
  };

  const getSideQuestProgress = (caseId: string) => normalizedSideQuestState.cases[caseId];

  const getSideQuestFoundClues = (sideQuestCase: SideQuestCaseDefinition): string[] => (
    getSideQuestProgress(sideQuestCase.id)?.foundClueIds || []
  );

  const isSideQuestCaseAvailable = (sideQuestCase: SideQuestCaseDefinition): boolean => {
    if (!selectedAvatar && !teacherMode) return false;
    if (sideQuestCase.scene === 'foyer') return true;
    const gallery = galleryGroups[sideQuestCase.scene];
    const firstWingId = gallery?.wingIds[0];
    return teacherMode || (!!firstWingId && isWingAccessible(firstWingId));
  };

  const getSideQuestDisplayStatus = (sideQuestCase: SideQuestCaseDefinition): SideQuestCaseStatus | 'locked' => {
    if (!isSideQuestCaseAvailable(sideQuestCase)) return 'locked';

    const progress = getSideQuestProgress(sideQuestCase.id);
    if (!progress) return 'notStarted';

    if (progress.status === 'active' && getSideQuestFoundClues(sideQuestCase).length === sideQuestCase.clues.length) {
      return 'readyToSolve';
    }

    return progress.status;
  };

  const isSideQuestClueVisible = (sideQuestCase: SideQuestCaseDefinition, clue: SideQuestClueDefinition): boolean => {
    const status = getSideQuestDisplayStatus(sideQuestCase);
    if (status !== 'active') return false;
    if (getSideQuestFoundClues(sideQuestCase).includes(clue.id)) return false;
    return !clue.linkedWingId || teacherMode || isWingAccessible(clue.linkedWingId);
  };

  const getVisibleSideQuestClues = (): Array<{ sideQuestCase: SideQuestCaseDefinition; clue: SideQuestClueDefinition }> => {
    if (!currentSceneCase) return [];

    return currentSceneCase.clues
      .filter((clue) => isSideQuestClueVisible(currentSceneCase, clue))
      .map((clue) => ({ sideQuestCase: currentSceneCase, clue }));
  };

  const getRewardSummaryParts = (reward: SideQuestCaseDefinition['reward']): string[] => {
    const traitParts = (Object.entries(reward.traits) as [TraitName, number][])
      .filter(([, amount]) => amount > 0)
      .map(([traitName, amount]) => `${traitName} +${amount}`);

    return [`Art Energy +${reward.artEnergy}`, ...traitParts, reward.badge];
  };

  const visibleSideQuestClues = getVisibleSideQuestClues();
  const nearbySideQuestClue = visibleSideQuestClues
    .map(({ sideQuestCase, clue }) => ({
      sideQuestCase,
      clue,
      distance: distanceBetween(getPlayerFeet(playerPosition), clue.position),
    }))
    .filter(({ distance }) => distance <= CLUE_INTERACTION_DISTANCE)
    .sort((first, second) => first.distance - second.distance)[0] || null;
  const isPipAvailableInScene = !!currentSceneCase && isSideQuestCaseAvailable(currentSceneCase);
  const isPipNearby = isPipAvailableInScene && distanceBetween(playerPosition, pipPosition) <= PIP_TALK_DISTANCE;
  const isMapModalOpen = !!activeChallengeWingId || !!activeDoorUnlockWingId || !!activeSideQuestClue || !!activeFinalCaseId || isCaseFilesOpen;

  const getWingIndexById = (wingId: string): number => (
    wingDefinitions.findIndex((wing) => wing.id === wingId)
  );

  const getNextWingAfter = (wingId: string): WingDefinition | undefined => {
    const wingIndex = getWingIndexById(wingId);
    return wingIndex >= 0 ? wingDefinitions[wingIndex + 1] : undefined;
  };

  const getPreviousWingBefore = (wingId: string): WingDefinition | undefined => {
    const wingIndex = getWingIndexById(wingId);
    return wingIndex > 0 ? wingDefinitions[wingIndex - 1] : undefined;
  };

  const clearWalkingStopTimer = () => {
    if (walkingStopTimerRef.current === null) return;
    window.clearTimeout(walkingStopTimerRef.current);
    walkingStopTimerRef.current = null;
  };

  const scheduleWalkingStop = (delay = 120) => {
    clearWalkingStopTimer();
    walkingStopTimerRef.current = window.setTimeout(() => {
      if (pressedMovementKeysRef.current.size === 0) {
        setIsPlayerWalking(false);
      }
      walkingStopTimerRef.current = null;
    }, delay);
  };

  const stopWalking = () => {
    pressedMovementKeysRef.current.clear();
    clearWalkingStopTimer();
    setIsPlayerWalking(false);
  };

  const isGalleryComplete = (galleryIndex: number): boolean => {
    if (teacherMode) return true;
    const group = galleryGroups[galleryIndex];
    return !!group && group.wingIds.every((wingId) => wingsState[wingId]?.isSolved);
  };

  const getReturnSceneForGallery = (galleryIndex: number): GalleryScene => (
    galleryIndex > 0 ? galleryIndex - 1 : 'foyer'
  );

  const getSceneDisplayName = (targetScene: GalleryScene): string => {
    if (targetScene === 'foyer') return 'Foyer';
    return galleryGroups[targetScene]?.name || `Gallery ${targetScene + 1}`;
  };

  const getReturnActionForGallery = (galleryIndex: number): SceneAction => {
    const returnScene = getReturnSceneForGallery(galleryIndex);
    return returnScene === 'foyer'
      ? { type: 'foyer' }
      : { type: 'gallery', galleryIndex: returnScene };
  };

  const getLevelRoomLabel = (wing: WingDefinition): string => {
    const levelNumber = wingDefinitions.findIndex((item) => item.id === wing.id) + 1;
    return `Level ${levelNumber}: The ${getWingShortName(wing)}`;
  };

  const getNavigationPromptTargets = (): NavigationPromptTarget[] => {
    const playerFeet = getPlayerFeet(playerPosition);
    const targets: Array<Omit<NavigationPromptTarget, 'distance'>> = [];

    const addTarget = (target: Omit<NavigationPromptTarget, 'distance'>) => {
      targets.push(target);
    };

    if (scene === 'foyer') {
      const firstGallery = galleryGroups[0];

      if (firstGallery) {
        const point = { x: 22.5, y: 36 };
        addTarget({
          id: 'gallery-0-entry',
          prompt: `Press Return to enter ${firstGallery.name}`,
          point,
          promptPosition: point,
          placement: 'right',
          action: { type: 'gallery', galleryIndex: 0 },
        });
      }
    } else if (activeGallery) {
      activeGallery.wingIds.forEach((wingId, doorIndex) => {
        const wing = getWingById(wingId);
        if (!wing) return;

        const isGuardedDoor = currentDoorGuardTarget?.wingId === wingId;
        const promptPoint = isGuardedDoor ? getDoorGuardPoint(doorIndex) : getDoorInteractionPoint(doorIndex);
        const point = isGuardedDoor
          ? { x: promptPoint.x, y: promptPoint.y + 10 }
          : promptPoint;
        const canEnter = isWingAccessible(wingId);
        const isSolved = !!wingsState[wingId]?.isSolved;
        const roomLabel = getLevelRoomLabel(wing);
        const prompt = !canEnter
          ? `${roomLabel} is locked`
          : isSolved
            ? `Press Return to revisit ${roomLabel}`
            : `Press Return to enter ${roomLabel}`;

        addTarget({
          id: `${wingId}-room-entry`,
          prompt,
          point,
          promptPosition: promptPoint,
          placement: doorIndex === LEVEL_DOOR_POSITIONS.length - 1 ? 'left' : 'right',
          action: canEnter ? { type: 'wing', wingId } : null,
        });
      });

      const nextGallery = galleryGroups[activeGallery.index + 1];
      if (nextGallery) {
        const point = { x: 87, y: 62 };
        const canEnterNextGallery = isGalleryComplete(activeGallery.index);

        addTarget({
          id: `${nextGallery.name}-entry`,
          prompt: canEnterNextGallery
            ? `Press Return to enter ${nextGallery.name}`
            : `${nextGallery.name} is locked`,
          point,
          promptPosition: point,
          placement: 'left',
          action: canEnterNextGallery ? { type: 'gallery', galleryIndex: activeGallery.index + 1 } : null,
        });
      }

      const returnScene = getReturnSceneForGallery(activeGallery.index);
      const returnPoint = { x: 51, y: 84 };
      const returnLabel = getSceneDisplayName(returnScene);
      addTarget({
        id: 'gallery-return',
        prompt: returnScene === 'foyer'
          ? 'Press Return to return to the Foyer'
          : `Press Return to enter ${returnLabel}`,
        point: returnPoint,
        promptPosition: { x: returnPoint.x, y: returnPoint.y - 1.5 },
        placement: 'above',
        action: getReturnActionForGallery(activeGallery.index),
      });
    }

    return targets
      .map((target) => ({
        ...target,
        distance: distanceBetween(playerFeet, target.point),
      }))
      .sort((first, second) => first.distance - second.distance);
  };

  const focusedNavigationTarget = getNavigationPromptTargets()
    .filter((target) => target.distance <= NAVIGATION_PROMPT_DISTANCE)[0] || null;

  const shouldShowNavigationPrompt = !!focusedNavigationTarget && !activeNpcId && !activePipCaseId;

  const getFirstAvailableWingId = (): string | null => {
    const availableUnsolvedWing = wingDefinitions.find((wing) => {
      const wingState = wingsState[wing.id];
      return !wingState?.isSolved && isWingAccessible(wing.id);
    });

    return availableUnsolvedWing?.id
      || wingDefinitions.find((wing) => !wingsState[wing.id]?.isSolved)?.id
      || wingDefinitions[wingDefinitions.length - 1]?.id
      || null;
  };

  const getFirstAvailableWingIdInActiveGallery = (): string | null => {
    if (!activeGallery) return null;

    return activeGallery.wingIds.find((wingId) => {
      const wingState = wingsState[wingId];
      return !wingState?.isSolved && isWingAccessible(wingId);
    })
      || activeGallery.wingIds.find((wingId) => !wingsState[wingId]?.isSolved)
      || activeGallery.wingIds[0]
      || null;
  };

  const getClosestActiveGalleryWing = (): { wingId: string; distance: number } | null => {
    if (!activeGallery) return null;

    const playerFeet = getPlayerFeet(playerPosition);
    const closestDoor = activeGallery.wingIds
      .map((wingId, doorIndex) => {
        const doorRect = doorRectFromPosition(LEVEL_DOOR_POSITIONS[doorIndex]);
        const talkPoint = {
          x: doorRect.x + doorRect.width / 2,
          y: doorRect.y + doorRect.height + 13,
        };

        return {
          wingId,
          distance: distanceBetween(playerFeet, talkPoint),
        };
      })
      .sort((first, second) => first.distance - second.distance)[0];

    return closestDoor || null;
  };

  const getSuggestedWingIdForNpc = (): string | null => {
    if (!activeGallery) return getFirstAvailableWingId();

    const closestWing = getClosestActiveGalleryWing();
    if (closestWing && closestWing.distance <= NPC_DOOR_FOCUS_DISTANCE) {
      return closestWing.wingId;
    }

    return getFirstAvailableWingIdInActiveGallery() || getFirstAvailableWingId();
  };

  const buildFoyerNpcDialogue = (): string => {
    if (allWingsComplete) {
      return 'Welcome back, Art Adventurer. Every gallery gem is awake, and the Gallery of Secrets glows with your discoveries. Carry your strongest evidence into the final reflection.';
    }

    const nextWingId = getFirstAvailableWingId();
    const nextWing = nextWingId ? getWingById(nextWingId) : undefined;

    if (solvedWingsCount === 0) {
      const firstRoomText = nextWing ? ` Step through Gallery One and seek the first gem in ${getWingShortName(nextWing)}.` : '';
      return `Welcome, Art Adventurer. The Gallery of Secrets has opened its doors. Twelve hidden gems sleep beyond these halls, each guarded by an art secret.${firstRoomText} Use your artist's eye, gather evidence, and wake the gems one by one.`;
    }

    if (nextWing) {
      return `Welcome back, Art Adventurer. ${solvedWingsCount} of ${wingDefinitions.length} gems now glow in your quest. The next gem waits in ${getWingShortName(nextWing)}. Follow the clues, speak with the guides, and let your visual evidence light the way.`;
    }

    return `Welcome back, Art Adventurer. ${solvedWingsCount} gems are glowing. The gallery has more secrets for any artist brave enough to look closely.`;
  };

  const buildNpcDialogue = (npc: NPCDefinition): string => {
    if (npc.scene === 'foyer') {
      return buildFoyerNpcDialogue();
    }

    const targetWingId = getSuggestedWingIdForNpc();
    const targetWing = targetWingId ? getWingById(targetWingId) : undefined;

    if (!targetWing) {
      return `${npc.name} raises a glowing brush. Welcome, Art Adventurer. Every room is listening for your next discovery.`;
    }

    const targetState = wingsState[targetWing.id];
    const guidance = getNpcGuidance(targetWing.id);
    const canEnter = isWingAccessible(targetWing.id);

    if (!canEnter) {
      const previousWing = getPreviousWingBefore(targetWing.id);
      const previousText = previousWing ? ` Claim the secret of ${getWingShortName(previousWing)} first.` : '';
      return `Hold your lantern, Art Adventurer. ${getWingShortName(targetWing)} is still sealed.${previousText} When it opens, ${guidance.lockedTease}`;
    }

    if (targetState?.isSolved) {
      const nextWing = getNextWingAfter(targetWing.id);

      if (nextWing) {
        const nextGuidance = getNpcGuidance(nextWing.id);
        return `${guidance.completedBridge} ${guidance.compliment} Onward to ${getWingShortName(nextWing)}, Art Adventurer: ${nextGuidance.tip}`;
      }

      return `${guidance.completedBridge} ${guidance.compliment} Every gem is awake. Carry evidence from across your journey into the final reflection.`;
    }

    return `${guidance.approach} ${getWingShortName(targetWing)} awaits: ${guidance.definition} Adventurer's clue: ${guidance.tip}`;
  };

  useEffect(() => {
    setLocalScene(currentGalleryScene);
  }, [currentGalleryScene]);

  useEffect(() => {
    const spawn = scene === 'foyer' ? FOYER_SPAWN : GALLERY_SPAWN;
    setPlayerPosition(spawn);
    playerPositionRef.current = spawn;
    setActiveNpcId(null);
    setActiveDoorGuardWingId(null);
    setActiveChallengeWingId(null);
    setActivePipCaseId(null);
    setActiveSideQuestClue(null);
    setActiveFinalCaseId(null);
    stopWalking();
  }, [scene]);

  useEffect(() => {
    playerPositionRef.current = playerPosition;
  }, [playerPosition]);

  useEffect(() => {
    activeNpcIdRef.current = activeNpcId;
  }, [activeNpcId]);

  useEffect(() => {
    setSelectedChallengeOptionId(null);
    setChallengeFeedback(null);
    setIsChallengeHintVisible(false);
    setIsChallengeSolved(false);
    setDraggedSortItemId(null);

    if (teacherMode && activeDoorChallenge) {
      setSelectedChallengeOptionId(
        activeDoorChallenge.type === 'multipleChoice'
          ? activeDoorChallenge.correctOptionId
          : null,
      );
      setSortChallengeOrder(
        activeDoorChallenge.type === 'sortOrder'
          ? [...activeDoorChallenge.correctOrder]
          : [],
      );
      setChallengeFeedback(activeDoorChallenge.success);
      setIsChallengeSolved(true);
      return;
    }

    if (activeDoorChallenge?.type === 'sortOrder') {
      setSortChallengeOrder(activeDoorChallenge.items.map((item) => item.id));
    } else {
      setSortChallengeOrder([]);
    }
  }, [activeDoorChallenge, teacherMode]);

  useEffect(() => {
    setSelectedClueOptionId(null);
    setClueFeedback(null);
    setIsClueHintVisible(false);
    setIsClueSolved(false);
    setClueOptionOrder(
      activeSideQuestClueDefinition
        ? createShuffledOptionOrder(
            activeSideQuestClueDefinition.options,
            activeSideQuestClueDefinition.correctOptionId,
          )
        : [],
    );
  }, [activeSideQuestClueDefinition]);

  useEffect(() => {
    setSelectedFinalOptionId(null);
    setFinalFeedback(null);
    setIsFinalHintVisible(false);
    setIsFinalSolved(false);
    setDraggedFinalItemId(null);

    if (activeFinalCase?.finalPuzzle.type === 'sortOrder') {
      setFinalOptionOrder([]);
      setFinalSortOrder(createShuffledSortOrder(
        activeFinalCase.finalPuzzle.items,
        activeFinalCase.finalPuzzle.correctOrder,
      ));
    } else if (activeFinalCase?.finalPuzzle.type === 'multipleChoice') {
      setFinalOptionOrder(createShuffledOptionOrder(
        activeFinalCase.finalPuzzle.options,
        activeFinalCase.finalPuzzle.correctOptionId,
      ));
      setFinalSortOrder([]);
    } else {
      setFinalOptionOrder([]);
      setFinalSortOrder([]);
    }
  }, [activeFinalCase]);

  useEffect(() => {
    const npcMovementTimer = window.setInterval(() => {
      const now = Date.now();

      setNpcStates((previousStates) => {
        let didChange = false;
        const nextStates = { ...previousStates };

        NPC_DEFINITIONS.forEach((npc) => {
          const currentState = previousStates[npc.id] || {
            position: npc.route[0],
            routeIndex: 0,
            waitUntil: now + npc.waitMs,
            direction: 'down' as PlayerDirection,
            isWalking: false,
          };

          if (activeNpcIdRef.current === npc.id) {
            if (currentState.isWalking) {
              nextStates[npc.id] = { ...currentState, isWalking: false };
              didChange = true;
            }
            return;
          }

          if (now < currentState.waitUntil) {
            if (currentState.isWalking) {
              nextStates[npc.id] = { ...currentState, isWalking: false };
              didChange = true;
            }
            return;
          }

          const targetRouteIndex = (currentState.routeIndex + 1) % npc.route.length;
          const targetPosition = npc.route[targetRouteIndex];
          const delta = {
            x: targetPosition.x - currentState.position.x,
            y: targetPosition.y - currentState.position.y,
          };
          const distanceToTarget = distanceBetween(currentState.position, targetPosition);
          const nextDirection = directionForDelta(delta, currentState.direction);

          if (distanceToTarget <= NPC_MOVE_STEP) {
            nextStates[npc.id] = {
              position: targetPosition,
              routeIndex: targetRouteIndex,
              waitUntil: now + npc.waitMs,
              direction: nextDirection,
              isWalking: false,
            };
            didChange = true;
            return;
          }

          nextStates[npc.id] = {
            ...currentState,
            position: {
              x: currentState.position.x + (delta.x / distanceToTarget) * NPC_MOVE_STEP,
              y: currentState.position.y + (delta.y / distanceToTarget) * NPC_MOVE_STEP,
            },
            direction: nextDirection,
            isWalking: true,
          };
          didChange = true;
        });

        return didChange ? nextStates : previousStates;
      });
    }, NPC_TICK_MS);

    return () => window.clearInterval(npcMovementTimer);
  }, []);

  useEffect(() => {
    if (!activeNpcId) return;

    const activeNpc = NPC_DEFINITIONS.find((npc) => npc.id === activeNpcId);
    const activeNpcState = npcStates[activeNpcId];

    if (!activeNpc || activeNpc.scene !== currentSceneKey || !activeNpcState) {
      setActiveNpcId(null);
      return;
    }

    if (distanceBetween(playerPosition, activeNpcState.position) > NPC_TALK_DISTANCE + 8) {
      setActiveNpcId(null);
    }
  }, [activeNpcId, currentSceneKey, npcStates, playerPosition]);

  useEffect(() => {
    if (!activePipCaseId || !currentSceneCase || activePipCaseId !== currentSceneCase.id) {
      if (activePipCaseId) setActivePipCaseId(null);
      return;
    }

    if (distanceBetween(playerPosition, pipPosition) > PIP_TALK_DISTANCE + 8) {
      setActivePipCaseId(null);
    }
  }, [activePipCaseId, currentSceneCase, pipPosition, playerPosition]);

  useEffect(() => {
    if (!activeDoorGuardWingId) return;

    if (!currentDoorGuardTarget || currentDoorGuardTarget.wingId !== activeDoorGuardWingId) {
      setActiveDoorGuardWingId(null);
      return;
    }

    if (distanceBetween(getPlayerFeet(playerPosition), getDoorGuardPoint(currentDoorGuardTarget.doorIndex)) > DOOR_GUARD_TALK_DISTANCE + 8) {
      setActiveDoorGuardWingId(null);
    }
  }, [activeDoorGuardWingId, currentDoorGuardTarget, playerPosition]);

  const getDoorChallenge = (wingId: string): DoorChallengeDefinition | null => (
    getDoorChallengeForWing(wingId, selectedYearLevel, selectedCoursePathway)
  );

  const shouldRequireEntryChallenge = (wingId: string): boolean => {
    const wingState = wingsState[wingId];
    const challenge = getDoorChallenge(wingId);

    return isWingAccessible(wingId)
      && !wingState?.isSolved
      && !!challenge
      && (teacherMode || !wingState?.entryChallengeCompleted);
  };

  const enterWing = (wingId: string) => {
    if (wingsState[wingId]?.isSolved) {
      onSelectWing(wingId);
      return;
    }

    stopWalking();
    setActiveNpcId(null);
    setActiveDoorGuardWingId(null);
    setActivePipCaseId(null);
    onDoorUnlockStart?.();
    setActiveDoorUnlockWingId(wingId);
  };

  const finishDoorUnlockTransition = (wingId: string) => {
    setActiveDoorUnlockWingId(null);
    onSelectWing(wingId);
  };

  const cancelDoorUnlockTransition = () => {
    setActiveDoorUnlockWingId(null);
    onDoorUnlockEnd?.();
  };

  const requestWingEntry = (wingId: string) => {
    if (activeDoorUnlockWingId) return;

    if (!isWingAccessible(wingId)) {
      setActiveDoorGuardWingId(wingId);
      return;
    }

    if (shouldRequireEntryChallenge(wingId)) {
      stopWalking();
      setActiveNpcId(null);
      setActiveDoorGuardWingId(null);
      setActiveChallengeWingId(wingId);
      return;
    }

    enterWing(wingId);
  };

  const handleDoorGuardInteraction = (wingId: string) => {
    stopWalking();
    requestWingEntry(wingId);
  };

  const closeDoorChallenge = () => {
    setActiveChallengeWingId(null);
    setChallengeFeedback(null);
    setIsChallengeHintVisible(false);
    setIsChallengeSolved(false);
  };

  const submitDoorChallenge = () => {
    if (!activeDoorChallenge || !activeChallengeWingId) return;

    const isCorrect = activeDoorChallenge.type === 'multipleChoice'
      ? selectedChallengeOptionId === activeDoorChallenge.correctOptionId
      : isSortOrderCorrect(sortChallengeOrder, activeDoorChallenge.correctOrder);

    if (!isCorrect) {
      setChallengeFeedback('Not quite yet. Use the hint, adjust your answer, and try the threshold again.');
      setIsChallengeSolved(false);
      return;
    }

    onCompleteEntryChallenge(activeChallengeWingId);
    setChallengeFeedback(activeDoorChallenge.success);
    setIsChallengeSolved(true);
  };

  const enterSolvedChallengeRoom = () => {
    if (!activeChallengeWingId) return;
    const wingId = activeChallengeWingId;
    onUnlockDoor?.();
    closeDoorChallenge();
    enterWing(wingId);
  };

  const openSideQuestClue = (sideQuestCase: SideQuestCaseDefinition, clue: SideQuestClueDefinition) => {
    stopWalking();
    setActiveNpcId(null);
    setActiveDoorGuardWingId(null);
    setActivePipCaseId(null);
    setActiveSideQuestClue({ caseId: sideQuestCase.id, clueId: clue.id });
  };

  const closeSideQuestClue = () => {
    setActiveSideQuestClue(null);
    setClueOptionOrder([]);
    setSelectedClueOptionId(null);
    setClueFeedback(null);
    setIsClueHintVisible(false);
    setIsClueSolved(false);
  };

  const submitSideQuestClue = () => {
    if (!activeSideQuestCase || !activeSideQuestClueDefinition || isClueSolved) return;

    if (selectedClueOptionId !== activeSideQuestClueDefinition.correctOptionId) {
      setClueFeedback('Not quite. Inspect the clue again and use the hint.');
      setIsClueSolved(false);
      return;
    }

    onCollectSideQuestClue(activeSideQuestCase.id, activeSideQuestClueDefinition.id);
    setClueFeedback(activeSideQuestClueDefinition.success);
    setIsClueSolved(true);
  };

  const openFinalSolve = (caseId: string) => {
    stopWalking();
    setActivePipCaseId(null);
    setIsCaseFilesOpen(false);
    setActiveFinalCaseId(caseId);
  };

  const closeFinalSolve = () => {
    setActiveFinalCaseId(null);
    setFinalOptionOrder([]);
    setSelectedFinalOptionId(null);
    setFinalSortOrder([]);
    setFinalFeedback(null);
    setIsFinalHintVisible(false);
    setIsFinalSolved(false);
  };

  const moveFinalSortItem = (itemId: string, targetIndex: number) => {
    setFinalSortOrder((currentOrder) => moveItemInOrder(currentOrder, itemId, targetIndex));
  };

  const submitFinalSolve = () => {
    if (!activeFinalCase || isFinalSolved) return;

    const puzzle = activeFinalCase.finalPuzzle;
    const isCorrect = puzzle.type === 'multipleChoice'
      ? selectedFinalOptionId === puzzle.correctOptionId
      : isSortOrderCorrect(finalSortOrder, puzzle.correctOrder);

    if (!isCorrect) {
      setFinalFeedback('Not quite. The case needs evidence from every clue. Try the hint and adjust your answer.');
      setIsFinalSolved(false);
      return;
    }

    onCompleteSideQuestCase(activeFinalCase.id);
    setFinalFeedback(puzzle.success);
    setIsFinalSolved(true);
  };

  const openCaseFiles = (caseId?: string) => {
    setSelectedCaseFileCaseId(caseId || currentSceneCase?.id || selectedCaseFileCaseId || SIDE_QUEST_CASES[0]?.id || '');
    setActivePipCaseId(null);
    setIsCaseFilesOpen(true);
  };

  const moveSortChallengeItem = (itemId: string, targetIndex: number) => {
    setSortChallengeOrder((currentOrder) => moveItemInOrder(currentOrder, itemId, targetIndex));
  };

  const applySceneAction = (action: SceneAction) => {
    if (action.type === 'gallery') {
      setScene(action.galleryIndex);
      return;
    }

    if (action.type === 'foyer') {
      setScene('foyer');
      return;
    }

    requestWingEntry(action.wingId);
  };

  const getSceneBounds = (): Rect => (
    scene === 'foyer'
      ? { x: 10, y: 32, width: 80, height: 55 }
      : { x: 6, y: 34, width: 88, height: 55 }
  );

  const getBlockingRects = (): Rect[] => {
    if (scene === 'foyer') {
      return FOYER_FIXED_BLOCKING_RECTS;
    }

    const blockedDoors = activeGallery
      ? activeGallery.wingIds
          .flatMap((wingId, doorIndex) => {
            const isEnterable = isWingAccessible(wingId);
            if (isEnterable) return [];
            const doorPosition = LEVEL_DOOR_POSITIONS[doorIndex];
            return [
              expandedRect(doorRectFromPosition(doorPosition), 1.5),
              expandedRect(doorEntryRectFromPosition(doorPosition), 1.5),
            ];
          })
      : [];

    return [
      ...getGalleryFixedBlockingRects(activeGallery?.index || 0),
      ...blockedDoors,
    ];
  };

  const isPositionBlocked = (position: Point): boolean => {
    const hitbox = getPlayerHitbox(position);
    const bounds = getSceneBounds();

    if (
      hitbox.x < bounds.x
      || hitbox.x + hitbox.width > bounds.x + bounds.width
      || hitbox.y < bounds.y
      || hitbox.y + hitbox.height > bounds.y + bounds.height
    ) {
      return true;
    }

    return getBlockingRects().some((rect) => rectsOverlap(hitbox, rect));
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      if (activeDoorUnlockWingId) {
        event.preventDefault();
        return;
      }

      if (isCaseFilesOpen) {
        if (event.key === 'Escape') {
          event.preventDefault();
          setIsCaseFilesOpen(false);
        }
        return;
      }

      if (activeSideQuestClue) {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeSideQuestClue();
        }
        return;
      }

      if (activeFinalCaseId) {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeFinalSolve();
        }
        return;
      }

      if (activeChallengeWingId) {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeDoorChallenge();
        }
        return;
      }

      const interactionKey = event.key.toLowerCase();

      if (event.key === 'Enter' && shouldShowNavigationPrompt && focusedNavigationTarget) {
        event.preventDefault();
        stopWalking();
        setActiveNpcId(null);
        setActiveDoorGuardWingId(null);
        setActivePipCaseId(null);

        if (focusedNavigationTarget.action) {
          applySceneAction(focusedNavigationTarget.action);
        }

        return;
      }

      if (interactionKey === 'e' || event.key === 'Enter') {
        if (nearbySideQuestClue) {
          event.preventDefault();
          openSideQuestClue(nearbySideQuestClue.sideQuestCase, nearbySideQuestClue.clue);
          return;
        }

        if (isPipNearby && currentSceneCase) {
          event.preventDefault();
          stopWalking();
          setActiveNpcId(null);
          setActiveDoorGuardWingId(null);
          setActivePipCaseId(currentSceneCase.id);
          return;
        }

        if (nearbyNpc) {
          event.preventDefault();
          stopWalking();
          setActiveNpcId(nearbyNpc.id);
          return;
        }

        if (activeNpcId || activeDoorGuardWingId) {
          event.preventDefault();
          setActiveNpcId(null);
          setActiveDoorGuardWingId(null);
          setActivePipCaseId(null);
          return;
        }
      }

      if (event.key === 'Escape' && (activeNpcId || activeDoorGuardWingId || activePipCaseId)) {
        event.preventDefault();
        setActiveNpcId(null);
        setActiveDoorGuardWingId(null);
        setActivePipCaseId(null);
        return;
      }

      const movement = movementInputForKey(event.key);

      if (!movement) return;
      event.preventDefault();
      setActiveNpcId(null);
      setActiveDoorGuardWingId(null);
      setActivePipCaseId(null);
      clearWalkingStopTimer();
      pressedMovementKeysRef.current.add(movement.key);
      setPlayerDirection(movement.facing);
      setIsPlayerWalking(true);

      const current = playerPositionRef.current;
      const next = {
        x: current.x + movement.delta.x,
        y: current.y + movement.delta.y,
      };

      if (!isPositionBlocked(next)) {
        onMovementStep?.();
        playerPositionRef.current = next;
        setPlayerPosition(next);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const movement = movementInputForKey(event.key);

      if (!movement) return;
      pressedMovementKeysRef.current.delete(movement.key);

      if (pressedMovementKeysRef.current.size === 0) {
        scheduleWalkingStop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', stopWalking);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', stopWalking);
    };
  });

  useEffect(() => {
    return () => clearWalkingStopTimer();
  }, []);

  const renderDoorGuard = (wingId: string, doorIndex: number) => {
    const wing = getWingById(wingId);
    if (!wing) return null;

    const challenge = getDoorChallenge(wingId);
    const position = getDoorGuardPoint(doorIndex);
    const wingState = wingsState[wingId];
    const canEnter = isWingAccessible(wingId);
    const isPrepared = !!wingState?.entryChallengeCompleted || !!wingState?.isSolved;
    const guardName = challenge?.guardName || 'Guard';
    const guardTitle = challenge?.guardTitle || `${getWingShortName(wing)} Door Guard`;

    return (
      <button
        key={`${wingId}-door-guard`}
        type="button"
        onClick={() => handleDoorGuardInteraction(wingId)}
        className="absolute z-30 flex -translate-x-1/2 flex-col items-center border-0 bg-transparent p-0 text-left outline-none transition hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-amber-300"
        style={{ left: `${position.x}%`, top: `${position.y}%` }}
        aria-label={`Talk to ${guardName}, ${guardTitle}`}
      >
        <div className="relative flex h-20 w-14 items-end justify-center sm:h-24 sm:w-16">
          <div className="absolute bottom-0 left-1/2 h-7 w-12 -translate-x-1/2 rounded-full bg-slate-950/30 blur-sm" aria-hidden="true" />
          <div className="relative z-10 flex h-full w-full items-end justify-center">
            <img
              src={DOOR_GUARD_SPRITE_SRC}
              alt={`${guardName}, ${guardTitle}`}
              className="max-h-full max-w-full object-contain drop-shadow-[0_8px_0_rgba(0,0,0,0.2)]"
              style={{
                filter: canEnter ? 'saturate(0.98) brightness(0.98)' : 'grayscale(0.8) brightness(0.72)',
                imageRendering: 'pixelated',
              }}
            />
          </div>
          {!isPrepared && canEnter && (
            <div className="absolute -right-1 top-1 flex h-4 w-4 rotate-45 items-center justify-center border border-amber-100 bg-[#d89443] text-[9px] font-black text-slate-950 shadow-[0_2px_0_rgba(0,0,0,0.5)]" aria-hidden="true">
              <span className="-rotate-45">!</span>
            </div>
          )}
        </div>
        <div className="mt-1 max-w-24 truncate border-2 border-amber-300 bg-[#111126] px-2 py-0.5 text-[9px] font-black uppercase tracking-normal text-amber-100 shadow">
          {guardName}
        </div>
      </button>
    );
  };

  const getNavigationPromptPlacementClasses = (placement: NavigationPromptPlacement) => {
    if (placement === 'left') {
      return {
        bubble: 'right-[calc(100%+0.55rem)] top-1/2 -translate-y-1/2 text-right',
        arrow: '-right-1.5 top-1/2 -translate-y-1/2 border-r border-t',
      };
    }

    if (placement === 'above') {
      return {
        bubble: 'bottom-[calc(100%+0.55rem)] left-1/2 -translate-x-1/2 text-center',
        arrow: '-bottom-1.5 left-1/2 -translate-x-1/2 border-b border-r',
      };
    }

    return {
      bubble: 'left-[calc(100%+0.55rem)] top-1/2 -translate-y-1/2 text-left',
      arrow: '-left-1.5 top-1/2 -translate-y-1/2 border-b border-l',
    };
  };

  const renderNavigationPrompt = () => {
    if (!shouldShowNavigationPrompt || !focusedNavigationTarget) return null;

    const placementClasses = getNavigationPromptPlacementClasses(focusedNavigationTarget.placement);
    const promptTone = focusedNavigationTarget.action ? 'text-cyan-100' : 'text-amber-100';

    return (
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${focusedNavigationTarget.promptPosition.x}%`,
          top: `${focusedNavigationTarget.promptPosition.y}%`,
          zIndex: 4,
        }}
        role="status"
      >
        <div
          className={artQuestCx(
            'absolute w-max max-w-56 rounded-md border border-amber-300/80 bg-[#10162b]/95 px-2.5 py-1.5 text-[9px] font-black uppercase leading-snug tracking-normal shadow-[0_4px_0_rgba(0,0,0,0.38)] sm:max-w-64 sm:text-[10px]',
            promptTone,
            placementClasses.bubble,
          )}
        >
          {focusedNavigationTarget.prompt}
          <div
            className={artQuestCx(
              'absolute h-2.5 w-2.5 rotate-45 border-amber-300/80 bg-[#10162b]',
              placementClasses.arrow,
            )}
            aria-hidden="true"
          />
        </div>
      </div>
    );
  };

  const renderDoorGuards = () => {
    if (!currentDoorGuardTarget) return null;
    return renderDoorGuard(currentDoorGuardTarget.wingId, currentDoorGuardTarget.doorIndex);
  };

  const renderSortChallengeItem = (
    challenge: Extract<DoorChallengeDefinition, { type: 'sortOrder' }>,
    item: DoorChallengeSortItem,
    index: number,
  ) => (
    <li
      key={item.id}
      draggable={!isChallengeSolved}
      onDragStart={() => setDraggedSortItemId(item.id)}
      onDragEnd={() => setDraggedSortItemId(null)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (draggedSortItemId) {
          moveSortChallengeItem(draggedSortItemId, index);
        }
        setDraggedSortItemId(null);
      }}
      className={`flex items-center gap-3 border-2 p-3 text-slate-100 shadow-[0_4px_0_rgba(0,0,0,0.35)] ${isChallengeSolved ? 'border-emerald-200 bg-emerald-950/85' : 'border-cyan-200/40 bg-slate-950/80 cursor-grab active:cursor-grabbing'} ${draggedSortItemId === item.id ? 'opacity-60' : ''}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-amber-300 bg-[#211235] text-sm font-black text-amber-100">
        {index + 1}
      </div>
      {item.swatch && (
        <div
          className="h-10 w-10 shrink-0 border-2 border-amber-200"
          style={{ backgroundColor: item.swatch }}
          aria-label={`${item.label} swatch`}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black uppercase tracking-normal">{item.label}</p>
        {item.detail && <p className="text-xs font-semibold text-slate-300">{item.detail}</p>}
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => moveSortChallengeItem(item.id, index - 1)}
          disabled={index === 0 || isChallengeSolved}
          className="artquest-button px-2 py-1 text-[10px] font-black disabled:cursor-not-allowed"
          aria-label={`Move ${item.label} up`}
        >
          Up
        </button>
        <button
          type="button"
          onClick={() => moveSortChallengeItem(item.id, index + 1)}
          disabled={index === challenge.items.length - 1 || isChallengeSolved}
          className="artquest-button px-2 py-1 text-[10px] font-black disabled:cursor-not-allowed"
          aria-label={`Move ${item.label} down`}
        >
          Down
        </button>
      </div>
    </li>
  );

  const renderDoorUnlockOverlay = () => {
    if (!activeDoorUnlockWingId) return null;

    const wingId = activeDoorUnlockWingId;
    const wing = getWingById(wingId);
    if (!wing) return null;

    return (
      <DoorUnlockAnimation
        key={wingId}
        assets={getDoorUnlockAssets(wingId)}
        roomName={getWingShortName(wing)}
        onCancel={cancelDoorUnlockTransition}
        onComplete={() => finishDoorUnlockTransition(wingId)}
        onOpenStart={onDoorOpening}
      />
    );
  };

  const renderDoorChallengeOverlay = () => {
    if (!activeDoorChallenge || !activeChallengeWingId) return null;

    const wing = getWingById(activeChallengeWingId);
    const canCheckAnswer = activeDoorChallenge.type === 'multipleChoice'
      ? !!selectedChallengeOptionId
      : sortChallengeOrder.length === activeDoorChallenge.correctOrder.length;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 text-slate-100 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="door-challenge-title">
        <div className="artquest-panel max-h-[94vh] w-full max-w-3xl overflow-y-auto p-1 shadow-2xl">
          <div className="relative z-10 border-b-2 border-pink-400/55 bg-[#17142e] p-4 text-slate-100 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex shrink-0 items-center gap-3">
                <div className="flex h-20 w-16 items-end justify-center border-2 border-amber-300 bg-slate-950">
                  <img
                    src={DOOR_GUARD_SPRITE_SRC}
                    alt={`${activeDoorChallenge.guardName}, ${activeDoorChallenge.guardTitle}`}
                    className="max-h-full max-w-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-normal text-pink-300">{activeDoorChallenge.guardName}</p>
                  <p className="text-[11px] font-bold uppercase tracking-normal text-cyan-100">{activeDoorChallenge.guardTitle}</p>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-normal text-amber-200">{wing ? getWingShortName(wing) : 'Room'} Door Challenge - {activeDoorChallenge.yearBandLabel}</p>
                <h2 id="door-challenge-title" className="artquest-panel-title text-2xl font-black uppercase tracking-normal sm:text-3xl">
                  {activeDoorChallenge.title}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-300">{activeDoorChallenge.intro}</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-4 p-4 sm:p-5">
            <div className="artquest-inner-panel p-4 shadow-[0_5px_0_rgba(0,0,0,0.25)]">
              <p className="text-xs font-black uppercase tracking-normal text-cyan-200">Prepare before entering</p>
              <p className="mt-2 text-base font-bold leading-relaxed text-white">{activeDoorChallenge.prompt}</p>
              {activeDoorChallenge.type === 'sortOrder' && (
                <p className="mt-2 text-xs font-black uppercase tracking-normal text-cyan-200">
                  Order: {activeDoorChallenge.orderDirectionLabel}
                </p>
              )}
            </div>

            {activeDoorChallenge.type === 'multipleChoice' ? (
              <div className="grid gap-3">
                {activeDoorChallenge.options.map((option) => {
                  const isSelected = selectedChallengeOptionId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setSelectedChallengeOptionId(option.id);
                        setChallengeFeedback(null);
                      }}
                      disabled={isChallengeSolved}
                      className={`border-2 p-3 text-left shadow-[0_4px_0_rgba(0,0,0,0.25)] transition focus:outline-none focus:ring-4 focus:ring-pink-300 disabled:cursor-not-allowed ${isSelected ? 'border-amber-200 bg-pink-500 text-white' : 'border-cyan-200/40 bg-slate-950/80 text-slate-100 hover:-translate-y-0.5 hover:border-amber-200'}`}
                    >
                      <p className="text-sm font-black uppercase tracking-normal">{option.label}</p>
                      {option.detail && <p className={`mt-1 text-xs font-semibold ${isSelected ? 'text-pink-50' : 'text-slate-300'}`}>{option.detail}</p>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <ol className="grid gap-3">
                {sortChallengeOrder.map((itemId, index) => {
                  const item = activeDoorChallenge.items.find((candidate) => candidate.id === itemId);
                  return item ? renderSortChallengeItem(activeDoorChallenge, item, index) : null;
                })}
              </ol>
            )}

            {isChallengeHintVisible && (
              <div className="border-2 border-cyan-200 bg-cyan-950 p-3 text-sm font-bold text-cyan-50">
                Hint: {activeDoorChallenge.hint}
              </div>
            )}

            {challengeFeedback && (
              <div className={`border-2 p-3 text-sm font-black ${isChallengeSolved ? 'border-emerald-200 bg-emerald-950 text-emerald-50' : 'border-rose-200 bg-rose-950 text-rose-50'}`}>
                {challengeFeedback}
                {isChallengeSolved && (
                  <p className="mt-2 text-xs uppercase tracking-normal text-emerald-200">{activeDoorChallenge.preparedBadge}</p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 border-t-2 border-pink-400/45 pt-4 sm:flex-row sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsChallengeHintVisible((isVisible) => !isVisible)}
                  className="artquest-button px-4 py-2 text-xs font-black tracking-normal focus:outline-none focus:ring-4 focus:ring-cyan-300"
                >
                  Hint
                </button>
                <button
                  type="button"
                  onClick={closeDoorChallenge}
                  className="artquest-button px-4 py-2 text-xs font-black tracking-normal focus:outline-none focus:ring-4 focus:ring-slate-300"
                >
                  Back to Gallery
                </button>
              </div>
              {isChallengeSolved ? (
                <button
                  type="button"
                  onClick={enterSolvedChallengeRoom}
                  className="artquest-button px-5 py-2 text-xs font-black tracking-normal focus:outline-none focus:ring-4 focus:ring-emerald-300"
                >
                  Unlock Room
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submitDoorChallenge}
                  disabled={!canCheckAnswer}
                  className="artquest-button px-5 py-2 text-xs font-black tracking-normal focus:outline-none focus:ring-4 focus:ring-amber-200 disabled:cursor-not-allowed"
                >
                  Check Answer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPipSprite = () => (
    <div className="relative h-16 w-12 sm:h-20 sm:w-14" aria-hidden="true">
      <div className="absolute bottom-0 left-1/2 h-4 w-10 -translate-x-1/2 rounded-full bg-slate-950/35 blur-sm sm:w-12" />
      <img
        src={PIP_SPRITE_SRC}
        alt=""
        className="relative z-10 h-full w-full object-contain drop-shadow-[0_8px_0_rgba(0,0,0,0.18)]"
        draggable={false}
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );

  const buildPipDialogue = (sideQuestCase: SideQuestCaseDefinition): string => {
    const status = getSideQuestDisplayStatus(sideQuestCase);

    if (status === 'locked') {
      return sideQuestCase.lockedDialogue || 'This case is locked for now. Even mysteries need the right doorway.';
    }

    if (status === 'notStarted') return sideQuestCase.introDialogue;
    if (status === 'active') return sideQuestCase.activeDialogue;
    if (status === 'readyToSolve') return sideQuestCase.readyDialogue;
    return sideQuestCase.completedDialogue;
  };

  const renderPipSpeechBubble = () => {
    if (!currentSceneCase || !isPipAvailableInScene) return null;

    const status = getSideQuestDisplayStatus(currentSceneCase);
    const isTalking = activePipCaseId === currentSceneCase.id;
    if (!isPipNearby && !isTalking) return null;

    return (
      <div
        className="absolute -translate-x-1/2"
        style={{ left: `${pipPosition.x}%`, top: `${pipPosition.y}%`, zIndex: isTalking ? 5 : 3 }}
      >
        <div className="pointer-events-auto absolute bottom-[calc(100%+0.72rem)] left-1/2 w-72 -translate-x-1/2 border-2 border-amber-300 bg-[#111126] p-3 text-center text-[11px] font-black leading-snug text-slate-100 shadow-[0_6px_0_rgba(0,0,0,0.45)] sm:w-80 sm:text-xs">
          {isTalking ? (
            <div className="relative z-10">
              <p className="mb-1 uppercase tracking-normal text-pink-300">Pip the Case Keeper</p>
              <p className="font-bold normal-case text-slate-100">{buildPipDialogue(currentSceneCase)}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {status === 'notStarted' && (
                  <button
                    type="button"
                    onClick={() => onStartSideQuestCase(currentSceneCase.id)}
                    className="artquest-button px-3 py-1.5 text-[10px] font-black focus:outline-none focus:ring-4 focus:ring-amber-200"
                  >
                    Start Case
                  </button>
                )}
                {status === 'readyToSolve' && (
                  <button
                    type="button"
                    onClick={() => openFinalSolve(currentSceneCase.id)}
                    className="artquest-button px-3 py-1.5 text-[10px] font-black focus:outline-none focus:ring-4 focus:ring-emerald-200"
                  >
                    Solve Case
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openCaseFiles(currentSceneCase.id)}
                  className="artquest-button px-3 py-1.5 text-[10px] font-black focus:outline-none focus:ring-4 focus:ring-cyan-200"
                >
                  Case File
                </button>
              </div>
            </div>
          ) : (
            <p className="uppercase tracking-normal text-cyan-100">Press E or Return: Talk to Pip</p>
          )}
          <div className="absolute -bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-amber-300 bg-[#111126]" aria-hidden="true" />
        </div>
      </div>
    );
  };

  const renderPip = () => {
    if (!currentSceneCase || !isPipAvailableInScene) return null;

    const status = getSideQuestDisplayStatus(currentSceneCase);
    const markerText = status === 'notStarted'
      ? '!'
      : status === 'active'
        ? '•'
        : '✓';
    const markerClass = status === 'notStarted'
      ? 'border-amber-200 bg-[#d89443] text-slate-950'
      : status === 'active'
        ? 'border-cyan-100 bg-[#123457] text-cyan-100'
        : status === 'readyToSolve'
          ? 'border-emerald-200 bg-[#14532d] text-emerald-100'
          : 'border-slate-400 bg-slate-700 text-slate-200';
    const showMarker = status !== 'completed';

    return (
      <div
        className="absolute z-[36] flex -translate-x-1/2 flex-col items-center"
        style={{ left: `${pipPosition.x}%`, top: `${pipPosition.y}%` }}
      >
        {showMarker && (
          <div className={`absolute -right-1 top-1 z-20 flex h-5 w-5 rotate-45 items-center justify-center border-2 text-[10px] font-black shadow-[0_3px_0_rgba(0,0,0,0.45)] ${markerClass}`}>
            <span className="-rotate-45">{markerText}</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            stopWalking();
            setActiveNpcId(null);
            setActiveDoorGuardWingId(null);
            setActivePipCaseId(currentSceneCase.id);
          }}
          className="relative border-0 bg-transparent p-0 outline-none transition hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-amber-300"
          aria-label={`Talk to Pip the Case Keeper about ${currentSceneCase.title}`}
        >
          {renderPipSprite()}
        </button>
        <div className="mt-1 max-w-24 truncate border-2 border-amber-300 bg-[#111126] px-2 py-0.5 text-[9px] font-black uppercase tracking-normal text-amber-100 shadow">
          Pip
        </div>
      </div>
    );
  };

  const renderSideQuestClues = () => (
    <>
      {visibleSideQuestClues.map(({ sideQuestCase, clue }) => {
        return (
          <button
            key={`${sideQuestCase.id}-${clue.id}`}
            type="button"
            onClick={() => openSideQuestClue(sideQuestCase, clue)}
            className="group absolute z-[33] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 outline-none focus-visible:ring-4 focus-visible:ring-amber-200"
            style={{ left: `${clue.position.x}%`, top: `${clue.position.y}%` }}
            aria-label={`Inspect side quest clue: ${clue.title}`}
          >
            <span className="absolute h-8 w-8 rounded-full border border-amber-200/40 bg-amber-300/10 opacity-70 transition group-hover:scale-110 group-hover:opacity-100" aria-hidden="true" />
            <span className="absolute h-5 w-5 rotate-45 rounded-sm border border-amber-200/80 bg-[#0e1830] shadow-[0_0_12px_rgba(251,191,36,0.55),0_3px_0_rgba(0,0,0,0.45)]" aria-hidden="true" />
            <span className="relative flex h-7 w-7 items-center justify-center text-sm text-amber-100">
              <span className="absolute h-2.5 w-2.5 rounded-full bg-amber-200/70 blur-[1px]" aria-hidden="true" />
              <span className="relative text-[13px] drop-shadow-[0_2px_0_rgba(0,0,0,0.75)]" aria-hidden="true">
                {clue.assetUrl ? '✦' : clue.icon}
              </span>
            </span>
          </button>
        );
      })}
    </>
  );

  const renderSideQuestCluePrompts = () => (
    <>
      {visibleSideQuestClues.map(({ sideQuestCase, clue }) => {
        const isNearby = nearbySideQuestClue?.clue.id === clue.id && nearbySideQuestClue.sideQuestCase.id === sideQuestCase.id;
        if (!isNearby) return null;

        return (
          <div
            key={`${sideQuestCase.id}-${clue.id}-prompt`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${clue.position.x}%`, top: `${clue.position.y}%`, zIndex: 1 }}
          >
            <div className="absolute left-[calc(100%+0.55rem)] top-1/2 w-36 -translate-y-1/2 rounded-md border border-amber-300/80 bg-[#10162b]/95 px-2.5 py-1.5 text-left text-[9px] font-black uppercase tracking-normal text-amber-100 shadow-[0_4px_0_rgba(0,0,0,0.38)]">
              E / Return: Inspect
              <div className="absolute -left-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-b border-l border-amber-300/80 bg-[#10162b]" aria-hidden="true" />
            </div>
          </div>
        );
      })}
    </>
  );

  const renderSideQuestClueOverlay = () => {
    if (!activeSideQuestCase || !activeSideQuestClueDefinition) return null;

    const canCheckAnswer = !!selectedClueOptionId;
    const orderedClueOptions = getOptionsInOrder(activeSideQuestClueDefinition.options, clueOptionOrder);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 text-slate-100 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="side-quest-clue-title">
        <div className="artquest-panel max-h-[94vh] w-full max-w-2xl overflow-y-auto p-1 shadow-2xl">
          <div className="relative z-10 border-b-2 border-pink-400/55 bg-[#17142e] p-4 sm:p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center border-2 border-amber-300 bg-slate-950 text-3xl">
                {activeSideQuestClueDefinition.assetUrl ? (
                  <img
                    src={activeSideQuestClueDefinition.assetUrl}
                    alt=""
                    className="h-12 w-12 object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <span aria-hidden="true">{activeSideQuestClueDefinition.icon}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-normal text-cyan-200">Side Quest Clue</p>
                <h2 id="side-quest-clue-title" className="artquest-panel-title text-2xl font-black uppercase tracking-normal sm:text-3xl">
                  {activeSideQuestClueDefinition.title}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-300">{activeSideQuestCase.title}</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-4 p-4 sm:p-5">
            <div className="artquest-inner-panel p-4">
              <p className="text-sm font-semibold leading-relaxed text-amber-50">{activeSideQuestClueDefinition.flavour}</p>
              <p className="mt-3 text-base font-black leading-relaxed text-white">{activeSideQuestClueDefinition.prompt}</p>
            </div>

            <div className="grid gap-3">
              {orderedClueOptions.map((option) => {
                const isSelected = selectedClueOptionId === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setSelectedClueOptionId(option.id);
                      setClueFeedback(null);
                    }}
                    disabled={isClueSolved}
                    className={`border-2 p-3 text-left shadow-[0_4px_0_rgba(0,0,0,0.25)] transition focus:outline-none focus:ring-4 focus:ring-pink-300 disabled:cursor-not-allowed ${isSelected ? 'border-amber-200 bg-pink-500 text-white' : 'border-cyan-200/40 bg-slate-950/80 text-slate-100 hover:-translate-y-0.5 hover:border-amber-200'}`}
                  >
                    <p className="text-sm font-black uppercase tracking-normal">{option.label}</p>
                    {option.detail && <p className={`mt-1 text-xs font-semibold ${isSelected ? 'text-pink-50' : 'text-slate-300'}`}>{option.detail}</p>}
                  </button>
                );
              })}
            </div>

            {isClueHintVisible && (
              <div className="border-2 border-cyan-200 bg-cyan-950 p-3 text-sm font-bold text-cyan-50">
                Hint: {activeSideQuestClueDefinition.hint}
              </div>
            )}

            {clueFeedback && (
              <div className={`border-2 p-3 text-sm font-black ${isClueSolved ? 'border-emerald-200 bg-emerald-950 text-emerald-50' : 'border-rose-200 bg-rose-950 text-rose-50'}`}>
                {clueFeedback}
                {isClueSolved && (
                  <p className="mt-2 text-xs uppercase tracking-normal text-emerald-200">Evidence added to your Case File.</p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 border-t-2 border-pink-400/45 pt-4 sm:flex-row sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsClueHintVisible((isVisible) => !isVisible)}
                  className="artquest-button px-4 py-2 text-xs font-black focus:outline-none focus:ring-4 focus:ring-cyan-300"
                >
                  Hint
                </button>
                <button
                  type="button"
                  onClick={closeSideQuestClue}
                  className="artquest-button px-4 py-2 text-xs font-black focus:outline-none focus:ring-4 focus:ring-slate-300"
                >
                  Back to Gallery
                </button>
              </div>
              {isClueSolved ? (
                <button
                  type="button"
                  onClick={() => {
                    closeSideQuestClue();
                    openCaseFiles(activeSideQuestCase.id);
                  }}
                  className="artquest-button px-5 py-2 text-xs font-black focus:outline-none focus:ring-4 focus:ring-emerald-300"
                >
                  View Case File
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submitSideQuestClue}
                  disabled={!canCheckAnswer}
                  className="artquest-button px-5 py-2 text-xs font-black focus:outline-none focus:ring-4 focus:ring-amber-200 disabled:cursor-not-allowed"
                >
                  Check Answer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFinalSortItem = (
    item: SideQuestSortItem,
    index: number,
    itemCount: number,
  ) => (
    <li
      key={item.id}
      draggable={!isFinalSolved}
      onDragStart={() => setDraggedFinalItemId(item.id)}
      onDragEnd={() => setDraggedFinalItemId(null)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (draggedFinalItemId) {
          moveFinalSortItem(draggedFinalItemId, index);
        }
        setDraggedFinalItemId(null);
      }}
      className={`flex items-center gap-3 border-2 border-cyan-200/40 bg-slate-950/80 p-3 text-slate-100 shadow-[0_4px_0_rgba(0,0,0,0.35)] ${draggedFinalItemId === item.id ? 'opacity-60' : ''} ${isFinalSolved ? '' : 'cursor-grab active:cursor-grabbing'}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-amber-300 bg-[#211235] text-sm font-black text-amber-100">
        {index + 1}
      </div>
      {item.icon && <div className="text-xl" aria-hidden="true">{item.icon}</div>}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black uppercase tracking-normal">{item.label}</p>
        {item.detail && <p className="text-xs font-semibold text-slate-300">{item.detail}</p>}
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => moveFinalSortItem(item.id, index - 1)}
          disabled={index === 0 || isFinalSolved}
          className="artquest-button px-2 py-1 text-[10px] font-black disabled:cursor-not-allowed"
          aria-label={`Move ${item.label} up`}
        >
          Up
        </button>
        <button
          type="button"
          onClick={() => moveFinalSortItem(item.id, index + 1)}
          disabled={index === itemCount - 1 || isFinalSolved}
          className="artquest-button px-2 py-1 text-[10px] font-black disabled:cursor-not-allowed"
          aria-label={`Move ${item.label} down`}
        >
          Down
        </button>
      </div>
    </li>
  );

  const renderFinalSolveOverlay = () => {
    if (!activeFinalCase) return null;

    const puzzle = activeFinalCase.finalPuzzle;
    const orderedFinalOptions = puzzle.type === 'multipleChoice'
      ? getOptionsInOrder(puzzle.options, finalOptionOrder)
      : [];
    const canCheckAnswer = puzzle.type === 'multipleChoice'
      ? !!selectedFinalOptionId
      : finalSortOrder.length === puzzle.correctOrder.length;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 text-slate-100 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="side-quest-final-title">
        <div className="artquest-panel max-h-[94vh] w-full max-w-3xl overflow-y-auto p-1 shadow-2xl">
          <div className="relative z-10 border-b-2 border-pink-400/55 bg-[#17142e] p-4 sm:p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center border-2 border-amber-300 bg-slate-950 text-3xl">
                {activeFinalCase.caseIconAssetUrl ? (
                  <img src={activeFinalCase.caseIconAssetUrl} alt="" className="h-12 w-12 object-contain" style={{ imageRendering: 'pixelated' }} />
                ) : (
                  <span aria-hidden="true">{activeFinalCase.caseIcon}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-normal text-cyan-200">Final Puzzle</p>
                <h2 id="side-quest-final-title" className="artquest-panel-title text-2xl font-black uppercase tracking-normal sm:text-3xl">
                  Solve Case
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-300">{activeFinalCase.title}</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-4 p-4 sm:p-5">
            <div className="artquest-inner-panel p-4">
              <p className="text-base font-black leading-relaxed text-white">{puzzle.prompt}</p>
            </div>

            {puzzle.type === 'multipleChoice' ? (
              <div className="grid gap-3">
                {orderedFinalOptions.map((option) => {
                  const isSelected = selectedFinalOptionId === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setSelectedFinalOptionId(option.id);
                        setFinalFeedback(null);
                      }}
                      disabled={isFinalSolved}
                      className={`border-2 p-3 text-left shadow-[0_4px_0_rgba(0,0,0,0.25)] transition focus:outline-none focus:ring-4 focus:ring-pink-300 disabled:cursor-not-allowed ${isSelected ? 'border-amber-200 bg-pink-500 text-white' : 'border-cyan-200/40 bg-slate-950/80 text-slate-100 hover:-translate-y-0.5 hover:border-amber-200'}`}
                    >
                      <p className="text-sm font-black uppercase tracking-normal">{option.label}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <ol className="grid gap-3">
                {finalSortOrder.map((itemId, index) => {
                  const item = puzzle.items.find((candidate) => candidate.id === itemId);
                  return item ? renderFinalSortItem(item, index, puzzle.items.length) : null;
                })}
              </ol>
            )}

            {isFinalHintVisible && (
              <div className="border-2 border-cyan-200 bg-cyan-950 p-3 text-sm font-bold text-cyan-50">
                Hint: {puzzle.hint}
              </div>
            )}

            {finalFeedback && (
              <div className={`border-2 p-3 text-sm font-black ${isFinalSolved ? 'border-emerald-200 bg-emerald-950 text-emerald-50' : 'border-rose-200 bg-rose-950 text-rose-50'}`}>
                {finalFeedback}
                {isFinalSolved && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-normal text-emerald-100">
                    {getRewardSummaryParts(activeFinalCase.reward).map((part) => (
                      <span key={part} className="border border-emerald-300/50 bg-emerald-900 px-2 py-1">{part}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 border-t-2 border-pink-400/45 pt-4 sm:flex-row sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsFinalHintVisible((isVisible) => !isVisible)}
                  className="artquest-button px-4 py-2 text-xs font-black focus:outline-none focus:ring-4 focus:ring-cyan-300"
                >
                  Hint
                </button>
                <button
                  type="button"
                  onClick={closeFinalSolve}
                  className="artquest-button px-4 py-2 text-xs font-black focus:outline-none focus:ring-4 focus:ring-slate-300"
                >
                  Back to Gallery
                </button>
              </div>
              {isFinalSolved ? (
                <button
                  type="button"
                  onClick={() => {
                    closeFinalSolve();
                    openCaseFiles(activeFinalCase.id);
                  }}
                  className="artquest-button px-5 py-2 text-xs font-black focus:outline-none focus:ring-4 focus:ring-emerald-300"
                >
                  Case Closed
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submitFinalSolve}
                  disabled={!canCheckAnswer}
                  className="artquest-button px-5 py-2 text-xs font-black focus:outline-none focus:ring-4 focus:ring-amber-200 disabled:cursor-not-allowed"
                >
                  Solve Case
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCaseFilesOverlay = () => {
    if (!isCaseFilesOpen || !selectedCaseFileCase) return null;

    const status = getSideQuestDisplayStatus(selectedCaseFileCase);
    const foundClueIds = getSideQuestFoundClues(selectedCaseFileCase);
    const selectedIsAvailable = status !== 'locked';
    const rewardTraitEntries = Object.entries(selectedCaseFileCase.reward.traits) as [TraitName, number][];
    const caseFileStatusLabel = status === 'locked'
      ? 'Locked'
      : status === 'notStarted'
        ? 'New Case'
        : status === 'completed'
          ? 'Case Closed'
          : 'In Progress';
    const caseFileStatusColor = status === 'locked'
      ? 'text-[#f4c84f]'
      : status === 'completed'
        ? 'text-[#86efac]'
        : status === 'active' || status === 'readyToSolve'
          ? 'text-[#8cff55]'
          : 'text-[#7dd3fc]';
    const statusActionLabel = status === 'notStarted'
      ? 'Start Case'
      : status === 'active'
        ? 'Return to Gallery'
        : status === 'readyToSolve'
          ? 'Return to Pip'
          : status === 'completed'
            ? 'Case Closed'
            : 'Locked';
    const finalActionLabel = status === 'readyToSolve'
      ? 'Solve Case'
      : status === 'notStarted'
        ? 'Start Case'
        : status === 'active'
          ? 'Keep Searching'
          : status === 'completed'
            ? 'Case Closed'
            : 'Locked';

    const handleStatusAction = () => {
      if (status === 'notStarted') {
        onStartSideQuestCase(selectedCaseFileCase.id);
        return;
      }

      if (status === 'active' || status === 'readyToSolve') {
        setIsCaseFilesOpen(false);
      }
    };

    const handleFinalAction = () => {
      if (status === 'readyToSolve') {
        openFinalSolve(selectedCaseFileCase.id);
        return;
      }

      if (status === 'notStarted') {
        onStartSideQuestCase(selectedCaseFileCase.id);
        return;
      }

      if (status === 'active') {
        setIsCaseFilesOpen(false);
      }
    };
    const compactActionButtonClass = 'inline-flex h-6 min-w-28 items-center justify-center rounded-md border border-[#d79634]/80 px-2 text-[10px] font-black uppercase text-[#fff4c4] shadow-[0_2px_0_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,210,112,0.12)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:cursor-not-allowed disabled:grayscale disabled:opacity-70';
    const renderRewardChip = (label: string, value: string, icon: React.ReactNode) => (
      <div key={`${label}-${value}`} className="flex h-9 min-w-0 items-center justify-center gap-2 rounded-md border border-[#7f5524]/80 bg-[#071226]/88 px-2 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
        <span className="shrink-0 text-sm font-black text-[#ffe08a]" aria-hidden="true">{icon}</span>
        <span className="min-w-0">
          <span className="block text-base font-black leading-none text-[#eaffff]">{value}</span>
          <span className="block truncate text-[8px] font-black uppercase leading-tight text-[#d8c29a]">{label}</span>
        </span>
      </div>
    );

    return (
      <div
        className="fixed inset-0 z-50"
        role="dialog"
        aria-modal="true"
        aria-label="Gallery Mystery Case Files"
      >
        <ArtQuestPage
          title="Gallery Mystery Case Files"
          subtitle="Solve mysteries, uncover clues, and grow your legend."
          selectedAvatar={selectedAvatar}
          playerStats={playerStats}
          onReturnToMap={() => setIsCaseFilesOpen(false)}
          returnLabel="Close Case Files"
          showPlayerPanel={false}
          className="h-screen min-h-0 overflow-hidden p-2 sm:p-2 lg:p-3 [&>div.relative]:h-full [&>div.relative]:min-h-0 [&_header]:mb-2 [&_header]:gap-2 [&_header]:lg:grid-cols-[220px_minmax(0,1fr)_220px] [&_header>div:first-child]:pl-7 [&_header>div]:min-h-10 [&_header_button]:min-h-9 [&_header_button]:px-4 [&_header_button]:text-xs [&_header_p]:text-sm [&_h1]:!text-3xl [&_h1]:!sm:text-4xl [&_h1]:!xl:text-4xl"
          contentClassName="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[minmax(280px,0.46fr)_minmax(0,1fr)]"
          footerText=""
        >
          <ArtQuestPanel className="flex min-h-0 flex-col overflow-hidden p-3">
            <ArtQuestSectionTitle className="mb-2 [&_h2]:text-base">Case Files</ArtQuestSectionTitle>
            <div className="min-h-0 flex-1 overflow-hidden pr-0">
              <div className="grid gap-2">
                {SIDE_QUEST_CASES.map((sideQuestCase) => {
                  const caseStatus = getSideQuestDisplayStatus(sideQuestCase);
                  const caseFoundCount = getSideQuestFoundClues(sideQuestCase).length;
                  const isSelected = selectedCaseFileCase.id === sideQuestCase.id;
                  const listStatusLabel = caseStatus === 'locked'
                    ? 'Locked'
                    : caseStatus === 'notStarted'
                      ? 'New Case'
                      : caseStatus === 'completed'
                        ? 'Case Closed'
                        : 'In Progress';
                  const listStatusColor = caseStatus === 'locked'
                    ? 'text-[#f4c84f]'
                    : caseStatus === 'completed'
                      ? 'text-[#86efac]'
                      : caseStatus === 'active' || caseStatus === 'readyToSolve'
                        ? 'text-[#8cff55]'
                        : 'text-[#7dd3fc]';

                  return (
                    <button
                      key={sideQuestCase.id}
                      type="button"
                      onClick={() => setSelectedCaseFileCaseId(sideQuestCase.id)}
                      className={artQuestCx(
                        'grid grid-cols-[58px_minmax(0,1fr)] items-center gap-3 rounded-md border p-2 text-left shadow-[0_3px_0_rgba(0,0,0,0.32)] transition focus:outline-none focus:ring-2 focus:ring-fuchsia-300',
                        isSelected
                          ? 'border-[#8cff55] bg-[#103114]/88 shadow-[0_0_18px_rgba(132,255,80,0.28),0_4px_0_rgba(0,0,0,0.42)]'
                          : 'border-[#7f5524]/70 bg-[#071226]/86 hover:border-[#d79634]',
                      )}
                    >
                      <ArtQuestIconTile
                        imageSrc={sideQuestCase.caseIconAssetUrl}
                        icon={sideQuestCase.caseIcon}
                        selected={isSelected}
                        locked={caseStatus === 'locked'}
                        className="min-h-[52px] w-[52px] shrink-0 gap-1 p-1 [&>span:first-child]:h-9 [&>span:first-child]:w-9 [&>span:first-child_img]:h-8 [&>span:first-child_img]:w-8"
                      />
                      <div className="min-w-0">
                        <p className="font-serif text-base font-black leading-tight text-[#fff7db]">
                          Case File: {sideQuestCase.title} ({sideQuestCase.locationName})
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className={`text-xs font-black uppercase ${listStatusColor}`}>
                            <span aria-hidden="true">{caseStatus === 'locked' ? '▣' : '●'}</span> {listStatusLabel}
                          </span>
                          <span className="shrink-0 text-xs font-black uppercase text-[#dbe8ff]">
                            {caseFoundCount} / {sideQuestCase.clues.length} clues
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </ArtQuestPanel>

          <ArtQuestPanel className="flex min-h-0 flex-col overflow-hidden p-2">
            <ArtQuestSectionTitle align="center" className="mb-2 [&_h2]:text-base">Case Details</ArtQuestSectionTitle>
            <div className="min-h-0 flex-1 overflow-hidden pr-0">
              <div className="grid h-full grid-rows-[116px_104px_158px_96px] gap-2 xl:grid-rows-[128px_108px_164px_98px]">
                <ArtQuestPanel as="div" variant="inner" className="grid min-h-0 gap-2 overflow-hidden p-2 sm:grid-cols-[92px_minmax(0,1fr)] xl:grid-cols-[112px_minmax(0,1fr)]">
                  <ArtQuestIconTile
                    imageSrc={selectedCaseFileCase.caseIconAssetUrl}
                    icon={selectedCaseFileCase.caseIcon}
                    selected
                    className="aspect-square min-h-20 w-full text-3xl xl:min-h-24 [&>span:first-child]:h-12 [&>span:first-child]:w-12 [&>span:first-child_img]:h-10 [&>span:first-child_img]:w-10 xl:[&>span:first-child]:h-16 xl:[&>span:first-child]:w-16 xl:[&>span:first-child_img]:h-14 xl:[&>span:first-child_img]:w-14"
                  />
                  <div className="min-w-0 py-1">
                    <h3 className="font-serif text-xl font-black leading-tight text-[#ffe9a6] xl:text-2xl">
                      Case File: {selectedCaseFileCase.title} ({selectedCaseFileCase.locationName})
                    </h3>
                    <p className="mt-1 max-w-3xl text-sm leading-snug text-[#ffe2a6] xl:text-base">{selectedCaseFileCase.summary}</p>
                  </div>
                </ArtQuestPanel>

                <div className="grid min-h-0 gap-2 lg:grid-cols-[minmax(0,1fr)_230px] xl:grid-cols-[minmax(0,1fr)_260px]">
                  <ArtQuestPanel as="div" variant="inner" className="min-h-0 overflow-hidden p-2">
                    <ArtQuestSectionTitle className="mb-1 [&_h2]:text-sm">Objective</ArtQuestSectionTitle>
                    <p className="text-sm leading-snug text-[#fff1c8]">{selectedCaseFileCase.objective}</p>
                  </ArtQuestPanel>
                  <ArtQuestPanel as="div" variant="inner" className="min-h-0 overflow-hidden p-2 text-center">
                    <ArtQuestSectionTitle align="center" className="mb-1 [&_h2]:text-sm">Status</ArtQuestSectionTitle>
                    <div className="flex items-center justify-center gap-2">
                      <span className={`text-xs font-black uppercase xl:text-sm ${caseFileStatusColor}`}>
                        <span aria-hidden="true">{status === 'locked' ? '▣' : '●'}</span> {caseFileStatusLabel}
                      </span>
                      <span className="text-xs font-bold text-[#8cff55]">{foundClueIds.length} / {selectedCaseFileCase.clues.length}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleStatusAction}
                      disabled={!selectedIsAvailable || status === 'completed'}
                      className={`${compactActionButtonClass} mt-1 bg-gradient-to-b from-[#179a5a] via-[#0b7541] to-[#064e2b]`}
                    >
                      {statusActionLabel}
                    </button>
                  </ArtQuestPanel>
                </div>

                <div className="grid min-h-0 gap-2 lg:grid-cols-[minmax(0,1fr)_230px] xl:grid-cols-[minmax(0,1fr)_260px]">
                  <ArtQuestPanel as="div" variant="inner" className="min-h-0 overflow-hidden p-2">
                    <ArtQuestSectionTitle align="center" className="mb-2 [&_h2]:text-sm">Clues Found ({foundClueIds.length} / {selectedCaseFileCase.clues.length})</ArtQuestSectionTitle>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {selectedCaseFileCase.clues.map((clue) => {
                        const isFound = foundClueIds.includes(clue.id);

                        return (
                          <div key={clue.id} className={`relative text-center ${isFound ? '' : 'opacity-60'}`}>
                            <ArtQuestIconTile
                              imageSrc={clue.assetUrl}
                              icon={clue.icon}
                              label={isFound ? clue.title : '???'}
                              selected={isFound}
                              locked={!isFound}
                              className="mx-auto min-h-[60px] gap-1 p-1 xl:min-h-[72px] [&>span:first-child]:h-8 [&>span:first-child]:w-8 [&>span:first-child_img]:h-7 [&>span:first-child_img]:w-7 xl:[&>span:first-child]:h-10 xl:[&>span:first-child]:w-10 xl:[&>span:first-child_img]:h-9 xl:[&>span:first-child_img]:w-9 [&>span:last-child]:text-[10px] xl:[&>span:last-child]:text-xs"
                            />
                            {isFound && (
                              <div className="absolute right-1 top-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#0c1608] bg-[#67b832] text-sm font-black text-[#112008]">
                                ✓
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ArtQuestPanel>

                  <ArtQuestPanel as="div" variant="inner" className="min-h-0 overflow-hidden p-2 text-center">
                    <ArtQuestSectionTitle align="center" className="mb-1 [&_h2]:text-sm">Final Puzzle</ArtQuestSectionTitle>
                    <p className="mx-auto mt-2 max-w-56 text-xs leading-snug text-[#fff1c8] xl:text-sm">{selectedCaseFileCase.finalPuzzle.prompt}</p>
                    <button
                      type="button"
                      onClick={handleFinalAction}
                      disabled={!selectedIsAvailable || status === 'completed'}
                      className={`${compactActionButtonClass} mt-2 ${status === 'readyToSolve' ? 'bg-gradient-to-b from-[#179a5a] via-[#0b7541] to-[#064e2b]' : 'bg-gradient-to-b from-[#8a2fc7] via-[#5a1b87] to-[#260d45]'}`}
                    >
                      {finalActionLabel}
                    </button>
                  </ArtQuestPanel>
                </div>

                <ArtQuestPanel as="div" variant="inner" className="min-h-0 overflow-hidden p-2">
                  <ArtQuestSectionTitle align="center" className="mb-1 [&_h2]:text-sm">Case Rewards</ArtQuestSectionTitle>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
                    {renderRewardChip('Art Energy', `+${selectedCaseFileCase.reward.artEnergy}`, '§')}
                    {rewardTraitEntries.map(([traitName, amount]) => (
                      renderRewardChip(traitName, `+${amount}`, traitName.charAt(0))
                    ))}
                    {renderRewardChip(selectedCaseFileCase.reward.badge, 'Badge', '🏅')}
                  </div>
                </ArtQuestPanel>
              </div>
            </div>
          </ArtQuestPanel>
        </ArtQuestPage>
      </div>
    );
  };

  const renderNpcSpeechBubbles = () => (
    <>
      {sceneNpcs.map((npc) => {
        const npcState = npcStates[npc.id] || {
          position: npc.route[0],
          routeIndex: 0,
          waitUntil: 0,
          direction: 'down' as PlayerDirection,
          isWalking: false,
        };
        const isNearby = nearbyNpc?.id === npc.id;
        const isTalking = activeNpcId === npc.id;
        if (!isNearby && !isTalking) return null;

        const dialogue = buildNpcDialogue(npc);

        return (
          <div
            key={`${npc.id}-speech`}
            className="absolute -translate-x-1/2"
            style={{ left: `${npcState.position.x}%`, top: `${npcState.position.y}%`, zIndex: isTalking ? 6 : 3 }}
          >
            <div className="absolute bottom-[calc(100%+0.65rem)] left-1/2 w-64 -translate-x-1/2 border-2 border-amber-300 bg-[#111126] px-3 py-2 text-center text-[11px] font-black leading-snug text-slate-100 shadow-[0_6px_0_rgba(0,0,0,0.45)] sm:w-72 sm:text-xs">
              {isTalking ? (
                <>
                  <p className="mb-1 uppercase tracking-normal text-pink-300">{npc.name}</p>
                  <p className="font-bold normal-case text-slate-100">{dialogue}</p>
                </>
              ) : (
                <p className="uppercase tracking-normal text-cyan-100">Press E or Return</p>
              )}
              <div className="absolute -bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-amber-300 bg-[#111126]" aria-hidden="true" />
            </div>
          </div>
        );
      })}
    </>
  );

  const renderNpc = (npc: NPCDefinition) => {
    const npcState = npcStates[npc.id] || {
      position: npc.route[0],
      routeIndex: 0,
      waitUntil: 0,
      direction: 'down' as PlayerDirection,
      isWalking: false,
    };
    const isNearby = nearbyNpc?.id === npc.id;
    const isTalking = activeNpcId === npc.id;
    const zIndex = isNearby || isTalking
      ? 35
      : npcState.position.y > playerPosition.y
        ? 21
        : 19;

    return (
      <button
        key={npc.id}
        type="button"
        onClick={() => {
          stopWalking();
          setActiveDoorGuardWingId(null);
          setActivePipCaseId(null);
          setActiveNpcId(npc.id);
        }}
        className="absolute flex -translate-x-1/2 flex-col items-center border-0 bg-transparent p-0 text-left outline-none transition-[left,top] duration-75 ease-linear focus-visible:ring-4 focus-visible:ring-amber-300"
        style={{ left: `${npcState.position.x}%`, top: `${npcState.position.y}%`, zIndex }}
        aria-label={`Talk to ${npc.name}, ${npc.title}`}
      >
        <div className={`artquest-avatar-shell artquest-avatar-facing-${npcState.direction} ${npcState.isWalking ? 'artquest-avatar-walking' : ''} relative flex h-16 w-12 items-end justify-center sm:h-20 sm:w-14`}>
          <div className="artquest-avatar-shadow" aria-hidden="true" />
          <div className="artquest-avatar-step artquest-avatar-step-left" aria-hidden="true" />
          <div className="artquest-avatar-step artquest-avatar-step-right" aria-hidden="true" />
          <div className="artquest-avatar-body relative z-10 flex h-full w-full items-end justify-center">
            <img
              src={NPC_SPRITE_SRC}
              alt={`${npc.name}, ${npc.title}`}
              className="artquest-avatar-visual max-h-full max-w-full object-contain drop-shadow-[0_10px_0_rgba(0,0,0,0.18)]"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>
        <div className="mt-1 max-w-24 truncate border-2 border-amber-300 bg-[#111126] px-2 py-0.5 text-[9px] font-black uppercase tracking-normal text-amber-100 shadow">
          {npc.name}
        </div>
      </button>
    );
  };

  const renderSceneNpcs = () => sceneNpcs.map((npc) => renderNpc(npc));

  const renderSpeechBubbleLayer = () => {
    if (isMapModalOpen) return null;

    return (
      <div className="pointer-events-none absolute inset-0 z-[60]">
        {shouldShowNavigationPrompt ? (
          renderNavigationPrompt()
        ) : (
          <>
            {renderSideQuestCluePrompts()}
            {renderPipSpeechBubble()}
            {renderNpcSpeechBubbles()}
          </>
        )}
      </div>
    );
  };

  const renderAvatar = (position: Point) => (
    <div
      className="absolute z-20 flex -translate-x-1/2 flex-col items-center transition-[left,top] duration-75 ease-linear"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      aria-label={selectedAvatar ? `${selectedAvatar.name}'s avatar` : 'Artist avatar'}
    >
      <div className={`artquest-avatar-shell artquest-avatar-facing-${playerDirection} ${isPlayerWalking ? 'artquest-avatar-walking' : ''} relative flex h-16 w-12 items-end justify-center sm:h-20 sm:w-14`}>
        <div className="artquest-avatar-shadow" aria-hidden="true" />
        <div className="artquest-avatar-step artquest-avatar-step-left" aria-hidden="true" />
        <div className="artquest-avatar-step artquest-avatar-step-right" aria-hidden="true" />
        <div className="artquest-avatar-body relative z-10 flex h-full w-full items-end justify-center">
          {shouldUseLayeredAvatar ? (
            <AvatarLayeredPreview
              imageUrls={avatarLayerImageUrls}
              alt={selectedAvatar ? selectedAvatar.name : 'Artist avatar'}
              className="artquest-avatar-visual h-full w-full max-h-full max-w-full drop-shadow-[0_10px_0_rgba(0,0,0,0.18)]"
            />
          ) : avatarSrc ? (
            <img
              src={avatarSrc}
              alt={selectedAvatar ? selectedAvatar.name : 'Artist avatar'}
              className={`artquest-avatar-visual ${isPixelAvatarSprite ? 'max-h-full max-w-full object-contain' : 'h-12 w-12 rounded-full border-4 border-slate-950 bg-slate-800 object-cover sm:h-14 sm:w-14'} drop-shadow-[0_10px_0_rgba(0,0,0,0.18)]`}
              style={{ imageRendering: isPixelAvatarSprite ? 'pixelated' : 'auto' }}
            />
          ) : (
            <div className={`artquest-avatar-visual artquest-avatar-placeholder flex h-12 w-12 items-center justify-center border-4 border-slate-950 shadow-lg sm:h-14 sm:w-14 ${selectedAvatar?.colorClass || 'bg-slate-500'}`}>
              <span className="text-sm font-black text-white sm:text-base">{selectedAvatar?.iconInitial || 'A'}</span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-1 max-w-28 truncate border-2 border-amber-300 bg-[#111126] px-2 py-0.5 text-[10px] font-black uppercase tracking-normal text-amber-100 shadow">
        {selectedAvatar?.name || 'Artist'}
      </div>
    </div>
  );

  const renderArtworkMotif = (variant: WallArtVariant, colorA: string, colorB: string) => {
    if (variant === 'landscape') {
      return (
        <>
          <div className="absolute inset-0 bg-sky-200" />
          <div className="absolute left-0 top-[42%] h-[18%] w-full" style={{ backgroundColor: colorA }} />
          <div className="absolute bottom-0 left-0 h-[42%] w-full" style={{ backgroundColor: colorB }} />
          <div className="absolute left-[12%] top-[28%] h-[28%] w-[26%] bg-emerald-800" />
          <div className="absolute right-[8%] top-[22%] h-[36%] w-[31%] bg-emerald-700" />
          <div className="absolute left-[38%] top-[54%] h-[10%] w-[30%] bg-cyan-300" />
        </>
      );
    }

    if (variant === 'portrait') {
      return (
        <>
          <div className="absolute inset-0" style={{ backgroundColor: colorA }} />
          <div className="absolute bottom-[18%] left-[33%] h-[46%] w-[34%] bg-[#23140f]" />
          <div className="absolute left-[38%] top-[18%] h-[24%] w-[24%] bg-[#23140f]" />
          <div className="absolute bottom-[12%] left-[24%] h-[10%] w-[52%]" style={{ backgroundColor: colorB }} />
        </>
      );
    }

    if (variant === 'linework') {
      return (
        <>
          <div className="absolute inset-0 bg-slate-100" />
          <div className="absolute left-[14%] top-[12%] h-[70%] w-[8%] rotate-12" style={{ backgroundColor: colorA }} />
          <div className="absolute left-[38%] top-[18%] h-[62%] w-[7%] -rotate-12" style={{ backgroundColor: colorB }} />
          <div className="absolute left-[58%] top-[12%] h-[72%] w-[8%] rotate-6 bg-slate-950" />
          <div className="absolute bottom-[20%] left-[20%] h-[7%] w-[58%] bg-slate-950" />
        </>
      );
    }

    if (variant === 'stillLife') {
      return (
        <>
          <div className="absolute inset-0" style={{ backgroundColor: colorA }} />
          <div className="absolute bottom-[18%] left-0 h-[18%] w-full bg-[#4a2d1c]" />
          <div className="absolute bottom-[35%] left-[36%] h-[30%] w-[28%]" style={{ backgroundColor: colorB }} />
          <div className="absolute bottom-[61%] left-[42%] h-[10%] w-[16%] bg-amber-100" />
          <div className="absolute bottom-[38%] left-[18%] h-[13%] w-[13%] bg-rose-300" />
          <div className="absolute bottom-[38%] right-[17%] h-[13%] w-[13%] bg-emerald-300" />
        </>
      );
    }

    return (
      <>
        <div className="absolute inset-0" style={{ backgroundColor: colorA }} />
        <div className="absolute left-[12%] top-[15%] h-[28%] w-[32%]" style={{ backgroundColor: colorB }} />
        <div className="absolute right-[14%] top-[12%] h-[42%] w-[22%] bg-amber-200" />
        <div className="absolute bottom-[16%] left-[22%] h-[18%] w-[54%] bg-slate-950" />
        <div className="absolute bottom-[38%] left-[46%] h-[38%] w-[10%] bg-white/70" />
      </>
    );
  };

  const renderWallArt = (
    left: string,
    top: string,
    colorA: string,
    colorB: string,
    variant: WallArtVariant = 'abstract',
  ) => (
    <div
      className="absolute h-[42%] w-[10%] border-4 border-[#2c1b13] bg-[#1f130e] shadow-[0_5px_0_rgba(0,0,0,0.35)]"
      style={{ left, top }}
      aria-hidden="true"
    >
      <div className="absolute inset-1 border-2 border-[#c4842d] bg-[#f5d997]">
        <div className="absolute inset-1 overflow-hidden border-2 border-[#2c1b13]" style={{ imageRendering: 'pixelated' }}>
          {renderArtworkMotif(variant, colorA, colorB)}
        </div>
      </div>
      <div className="absolute -bottom-3 left-1/2 h-2 w-8 -translate-x-1/2 border-2 border-[#2c1b13] bg-[#c4842d]" />
    </div>
  );

  const renderTorch = (left: string, top: string) => (
    <div className="absolute h-16 w-10" style={{ left, top }} aria-hidden="true">
      <div className="absolute left-1/2 top-0 h-11 w-11 -translate-x-1/2 bg-[radial-gradient(circle,rgba(251,191,36,0.5),rgba(251,191,36,0.18)_45%,transparent_70%)]" />
      <div className="relative mx-auto mt-2 h-9 w-5">
        <div className="absolute bottom-1 left-1/2 h-8 w-5 -translate-x-1/2 bg-amber-300 shadow-[0_0_18px_6px_rgba(251,191,36,0.38)]" style={{ clipPath: 'polygon(48% 0, 82% 32%, 70% 100%, 26% 100%, 14% 34%)' }} />
        <div className="absolute bottom-2 left-1/2 h-5 w-3 -translate-x-1/2 bg-orange-500" style={{ clipPath: 'polygon(52% 0, 84% 48%, 62% 100%, 26% 100%, 18% 42%)' }} />
      </div>
      <div className="mx-auto h-4 w-2 bg-[#1f1510]" />
      <div className="mx-auto h-2 w-6 border-2 border-[#1f1510] bg-[#6b3f1f]" />
    </div>
  );

  const renderColumn = (left: string, top: string) => (
    <div className="absolute h-[20%] w-[6%]" style={{ left, top }} aria-hidden="true">
      <div className="absolute left-0 top-0 h-[14%] w-full border-4 border-[#4a3322] bg-[#b89a70]" />
      <div className="absolute left-[18%] top-[12%] h-[72%] w-[64%] border-x-4 border-[#6f5236] bg-[#a9855a]">
        <div className="absolute left-[24%] top-0 h-full w-[12%] bg-[#d2b587]/55" />
        <div className="absolute right-[20%] top-0 h-full w-[10%] bg-[#70533a]/45" />
      </div>
      <div className="absolute bottom-0 left-[-8%] h-[18%] w-[116%] border-4 border-[#4a3322] bg-[#92704a]" />
    </div>
  );

  const renderFloorDetails = () => {
    const scuffs: Array<[string, string, string, string, string]> = [
      ['13%', '44%', '7%', '1.2%', 'rgba(82, 54, 34, 0.2)'],
      ['30%', '68%', '9%', '1.2%', 'rgba(255, 255, 255, 0.12)'],
      ['57%', '48%', '6%', '1.2%', 'rgba(82, 54, 34, 0.18)'],
      ['75%', '72%', '8%', '1.2%', 'rgba(255, 255, 255, 0.1)'],
      ['43%', '83%', '11%', '1.2%', 'rgba(82, 54, 34, 0.22)'],
    ];

    return (
      <>
        {scuffs.map(([left, top, width, height, backgroundColor], index) => (
          <div
            key={`${left}-${top}-${index}`}
            className="absolute"
            style={{ left, top, width, height, backgroundColor }}
            aria-hidden="true"
          />
        ))}
      </>
    );
  };

  const renderWallTexture = (trimColor: string) => (
    <>
      <div
        className="absolute inset-0 opacity-45"
        style={{
          backgroundImage: 'linear-gradient(rgba(31,21,16,0.34) 2px, transparent 2px), linear-gradient(90deg, rgba(31,21,16,0.25) 2px, transparent 2px)',
          backgroundSize: '72px 28px, 36px 28px',
        }}
        aria-hidden="true"
      />
      <div className="absolute left-0 top-[14%] h-2 w-full bg-[#1f1510]" aria-hidden="true" />
      <div className="absolute left-0 top-[21%] h-3 w-full" style={{ backgroundColor: trimColor }} aria-hidden="true" />
      <div className="absolute bottom-0 left-0 h-5 w-full border-y-4 border-[#2c1b13]" style={{ backgroundColor: trimColor }} aria-hidden="true" />
    </>
  );

  const renderGalleryFloorInlays = (galleryIndex: number, roomTheme: typeof fallbackTheme) => {
    if (galleryIndex === 1) {
      const slabs: Array<[string, string, string, string, string]> = [
        ['12%', '48%', '16%', '6%', 'rgba(231,229,228,0.16)'],
        ['18%', '61%', '12%', '5%', 'rgba(120,113,108,0.24)'],
        ['55%', '51%', '15%', '6%', 'rgba(231,229,228,0.14)'],
        ['67%', '67%', '11%', '5%', 'rgba(120,113,108,0.28)'],
        ['39%', '76%', '21%', '4%', 'rgba(245,245,244,0.12)'],
      ];

      return (
        <>
          <div className="absolute left-[12%] top-[47%] h-[42%] w-[76%] border-4 border-stone-950/45 bg-black/10" aria-hidden="true" />
          <div
            className="absolute left-[17%] top-[53%] h-[30%] w-[66%] border-4 border-stone-300/35"
            style={{
              backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.12) 0 2px, transparent 2px 28px), linear-gradient(rgba(255,255,255,0.08) 0 2px, transparent 2px 24px)',
              backgroundSize: '56px 48px',
            }}
            aria-hidden="true"
          />
          {slabs.map(([left, top, width, height, backgroundColor], index) => (
            <div key={`stone-slab-${index}`} className="absolute border-2 border-stone-950/35" style={{ left, top, width, height, backgroundColor }} aria-hidden="true" />
          ))}
          <div className="absolute left-[44%] top-[49%] h-[33%] w-[12%] border-x-4 border-cyan-200/35 bg-cyan-950/20" aria-hidden="true" />
        </>
      );
    }

    if (galleryIndex === 2) {
      const petals: Array<[string, string, string]> = [
        ['38%', '58%', '#bbf7d0'],
        ['56%', '58%', '#f9a8d4'],
        ['38%', '72%', '#f9a8d4'],
        ['56%', '72%', '#bbf7d0'],
      ];

      return (
        <>
          <div className="absolute left-[18%] top-[47%] h-[39%] w-[64%] border-4 border-emerald-950/55 bg-emerald-900/20" aria-hidden="true" />
          <div className="absolute left-[27%] top-[55%] h-[27%] w-[46%] border-4 border-pink-200/55 bg-emerald-950/18" aria-hidden="true" />
          <div className="absolute left-[48%] top-[49%] h-[38%] w-[4%] bg-emerald-100/35" aria-hidden="true" />
          <div className="absolute left-[28%] top-[66%] h-[4%] w-[44%] bg-emerald-100/35" aria-hidden="true" />
          {petals.map(([left, top, color], index) => (
            <div key={`garden-petal-${index}`} className="absolute h-[7%] w-[7%] border-4 border-emerald-950/45" style={{ left, top, backgroundColor: color }} aria-hidden="true" />
          ))}
          <div className="absolute left-[45%] top-[62%] h-[10%] w-[10%] border-4 border-amber-100 bg-rose-500/65 shadow-[0_0_24px_rgba(251,191,36,0.28)]" aria-hidden="true" />
        </>
      );
    }

    if (galleryIndex === 3) {
      const beats: Array<[string, string, string]> = [
        ['18%', '49%', roomTheme.glow],
        ['26%', '56%', roomTheme.accent],
        ['34%', '63%', roomTheme.glow],
        ['58%', '51%', roomTheme.accent],
        ['66%', '58%', roomTheme.glow],
        ['74%', '65%', roomTheme.accent],
      ];

      return (
        <>
          <div
            className="absolute left-[9%] top-[47%] h-[39%] w-[82%] opacity-80"
            style={{
              backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.18) 0 8px, transparent 8px 24px), repeating-linear-gradient(45deg, rgba(251,146,60,0.18) 0 6px, transparent 6px 22px)',
            }}
            aria-hidden="true"
          />
          <div className="absolute left-[41%] top-[51%] h-[33%] w-[18%] border-4 border-cyan-100/50 bg-slate-950/25" aria-hidden="true" />
          {beats.map(([left, top, backgroundColor], index) => (
            <div key={`rhythm-beat-${index}`} className="absolute h-[5%] w-[8%] border-2 border-slate-950/45" style={{ left, top, backgroundColor }} aria-hidden="true" />
          ))}
          <div className="absolute left-[43%] top-[77%] h-[7%] w-[14%] border-4 border-fuchsia-100/45 bg-fuchsia-500/25" aria-hidden="true" />
        </>
      );
    }

    return (
      <>
        <div className="absolute left-[17%] top-[48%] h-[34%] w-[66%] border-4 border-slate-950/25 bg-white/10" aria-hidden="true" />
        <div className="absolute left-[23%] top-[54%] h-[22%] w-[54%] border-4 border-slate-950/20" aria-hidden="true" />
        <div className="absolute left-[47%] top-[49%] h-[34%] w-[6%] bg-slate-950/18" aria-hidden="true" />
        <div className="absolute left-[30%] top-[64%] h-[4%] w-[40%] bg-slate-950/18" aria-hidden="true" />
        <div className="absolute left-[43%] top-[59%] h-[12%] w-[14%] border-4 border-amber-100 bg-sky-300/45" aria-hidden="true" />
      </>
    );
  };

  const renderGalleryWallDecor = (galleryIndex: number, roomTheme: typeof fallbackTheme) => {
    if (galleryIndex === 1) {
      return (
        <>
          <div className="absolute left-[4%] top-[26%] h-[46%] w-[12%] border-4 border-stone-950 bg-stone-700 shadow-[0_5px_0_rgba(0,0,0,0.35)]" aria-hidden="true">
            <div className="absolute left-[13%] top-[12%] h-[18%] w-[70%] bg-stone-300/45" />
            <div className="absolute left-[13%] top-[42%] h-[18%] w-[52%] bg-stone-400/45" />
            <div className="absolute left-[13%] top-[70%] h-[12%] w-[76%] bg-stone-500/55" />
          </div>
          {renderWallArt('27%', '24%', '#78716c', '#e7e5e4', 'abstract')}
          {renderWallArt('60%', '24%', '#0f172a', '#67e8f9', 'linework')}
          <div className="absolute right-[4%] top-[24%] h-[48%] w-[12%] border-4 border-cyan-100/60 bg-slate-950 shadow-[0_5px_0_rgba(0,0,0,0.35)]" aria-hidden="true">
            <div className="absolute inset-[12%] border-2 border-cyan-200/60 bg-[radial-gradient(circle_at_50%_42%,rgba(103,232,249,0.35),transparent_44%)]" />
            <div className="absolute left-[20%] top-[18%] h-[12%] w-[58%] bg-cyan-100/40" />
            <div className="absolute left-[34%] top-[38%] h-[33%] w-[10%] bg-cyan-100/50" />
            <div className="absolute right-[27%] top-[35%] h-[44%] w-[10%] bg-cyan-300/45" />
          </div>
        </>
      );
    }

    if (galleryIndex === 2) {
      return (
        <>
          {renderWallArt('24%', '24%', '#064e3b', '#f9a8d4', 'landscape')}
          <div className="absolute left-[44%] top-[22%] h-[52%] w-[12%] border-4 border-emerald-950 bg-emerald-700 shadow-[0_5px_0_rgba(0,0,0,0.35)]" aria-hidden="true">
            <div className="absolute left-[14%] top-[12%] h-[16%] w-[20%] bg-pink-200" />
            <div className="absolute right-[14%] top-[12%] h-[16%] w-[20%] bg-pink-200" />
            <div className="absolute left-[18%] top-[42%] h-[12%] w-[64%] bg-emerald-100" />
            <div className="absolute left-[34%] top-[30%] h-[40%] w-[12%] bg-emerald-100" />
            <div className="absolute left-[54%] top-[30%] h-[40%] w-[12%] bg-emerald-100" />
          </div>
          {renderWallArt('64%', '24%', '#bbf7d0', '#166534', 'stillLife')}
          <div className="absolute left-[7%] top-[67%] h-3 w-[86%] bg-emerald-100/50" aria-hidden="true" />
        </>
      );
    }

    if (galleryIndex === 3) {
      const banners: Array<[string, string, string]> = [
        ['20%', roomTheme.glow, '#111827'],
        ['31%', roomTheme.accent, '#fb923c'],
        ['61%', '#f0abfc', '#22d3ee'],
        ['72%', roomTheme.trim, roomTheme.glow],
      ];

      return (
        <>
          {banners.map(([left, colorA, colorB], index) => (
            <div key={`rhythm-banner-${index}`} className="absolute top-[24%] h-[52%] w-[7%] border-4 border-slate-950 bg-slate-900 shadow-[0_5px_0_rgba(0,0,0,0.35)]" style={{ left }} aria-hidden="true">
              <div className="absolute inset-[12%]" style={{ background: `repeating-linear-gradient(0deg, ${colorA} 0 12px, ${colorB} 12px 24px)` }} />
            </div>
          ))}
          <div className="absolute left-[42%] top-[20%] h-[58%] w-[16%] border-4 border-fuchsia-100 bg-slate-950 shadow-[0_5px_0_rgba(0,0,0,0.35)]" aria-hidden="true">
            <div className="absolute left-[12%] top-[14%] h-[16%] w-[76%] bg-fuchsia-300" />
            <div className="absolute left-[12%] top-[42%] h-[16%] w-[76%] bg-cyan-300" />
            <div className="absolute left-[12%] top-[70%] h-[16%] w-[76%] bg-amber-300" />
          </div>
        </>
      );
    }

    return (
      <>
        {renderWallArt('25%', '26%', roomTheme.accent, roomTheme.glow, 'linework')}
        {renderWallArt('58%', '24%', roomTheme.glow, roomTheme.door, 'stillLife')}
        <div className="absolute left-[4%] top-[64%] h-3 w-[88%] bg-slate-100/45" aria-hidden="true" />
        <div className="absolute left-[9%] top-[72%] h-2 w-[15%] bg-slate-950/55" aria-hidden="true" />
        <div className="absolute right-[9%] top-[72%] h-2 w-[15%] bg-slate-950/55" aria-hidden="true" />
      </>
    );
  };

  const renderGallerySupport = (galleryIndex: number, left: string, top: string) => {
    if (galleryIndex === 1) {
      return (
        <div className="absolute h-[20%] w-[6%]" style={{ left, top }} aria-hidden="true">
          <div className="absolute left-[-6%] top-0 h-[18%] w-[112%] border-4 border-stone-950 bg-stone-400" />
          <div className="absolute left-[10%] top-[15%] h-[68%] w-[80%] border-x-4 border-stone-950 bg-stone-600">
            <div className="absolute left-[16%] top-[8%] h-[18%] w-[52%] bg-stone-300/45" />
            <div className="absolute right-[10%] top-[36%] h-[18%] w-[58%] bg-stone-500/55" />
            <div className="absolute left-[14%] bottom-[8%] h-[16%] w-[44%] bg-stone-300/35" />
          </div>
          <div className="absolute bottom-0 left-[-12%] h-[18%] w-[124%] border-4 border-stone-950 bg-stone-700" />
        </div>
      );
    }

    if (galleryIndex === 2) {
      return (
        <div className="absolute h-[20%] w-[6%]" style={{ left, top }} aria-hidden="true">
          <div className="absolute left-[-12%] top-0 h-[15%] w-[124%] border-4 border-emerald-950 bg-pink-200" />
          <div className="absolute left-[14%] top-[12%] h-[68%] w-[72%] border-x-4 border-emerald-950 bg-emerald-700">
            <div className="absolute left-[22%] top-[10%] h-[18%] w-[24%] bg-emerald-200" />
            <div className="absolute right-[20%] top-[28%] h-[20%] w-[26%] bg-pink-300" />
            <div className="absolute left-[18%] bottom-[16%] h-[18%] w-[48%] bg-emerald-200" />
          </div>
          <div className="absolute bottom-0 left-[-16%] h-[20%] w-[132%] border-4 border-emerald-950 bg-emerald-900" />
        </div>
      );
    }

    if (galleryIndex === 3) {
      return (
        <div className="absolute h-[20%] w-[6%]" style={{ left, top }} aria-hidden="true">
          <div className="absolute left-[-8%] top-0 h-[16%] w-[116%] border-4 border-slate-950 bg-cyan-200" />
          <div className="absolute left-[16%] top-[12%] h-[70%] w-[68%] border-x-4 border-slate-950 bg-indigo-700">
            <div className="absolute left-[18%] top-[8%] h-[12%] w-[64%] bg-fuchsia-300" />
            <div className="absolute left-[18%] top-[33%] h-[12%] w-[64%] bg-amber-300" />
            <div className="absolute left-[18%] top-[58%] h-[12%] w-[64%] bg-cyan-300" />
          </div>
          <div className="absolute bottom-0 left-[-16%] h-[20%] w-[132%] border-4 border-slate-950 bg-[#111827]" />
        </div>
      );
    }

    return renderColumn(left, top);
  };

  const renderGalleryArchitecture = (galleryIndex: number, roomTheme: typeof fallbackTheme) => {
    const railBackground = galleryIndex === 1
      ? '#3f3f46'
      : galleryIndex === 2
        ? '#14532d'
        : galleryIndex === 3
          ? '#1e1b4b'
          : '#7f1d1d';

    return (
      <>
        <div
          className="absolute left-[5%] top-[34%] h-[8%] w-[90%] border-y-4 shadow-inner"
          style={{ backgroundColor: railBackground, borderColor: '#0f172a80' }}
          aria-hidden="true"
        >
          {galleryIndex === 3 && (
            <div className="absolute inset-0 opacity-80" style={{ backgroundImage: `repeating-linear-gradient(90deg, ${roomTheme.glow} 0 10px, transparent 10px 22px)` }} />
          )}
          {galleryIndex === 2 && (
            <div className="absolute left-[7%] top-[24%] h-[45%] w-[86%] bg-[repeating-linear-gradient(90deg,rgba(187,247,208,0.45)_0_12px,transparent_12px_26px)]" />
          )}
          {galleryIndex === 1 && (
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.12)_0_18px,transparent_18px_40px)]" />
          )}
        </div>
        {renderGallerySupport(galleryIndex, '31%', '29%')}
        {renderGallerySupport(galleryIndex, '63.5%', '29%')}
        <div
          className="absolute right-0 top-[32%] h-[46%] w-[12%] border-l-8 border-y-8 shadow-inner"
          style={{ backgroundColor: roomTheme.wall, borderColor: roomTheme.trim }}
          aria-hidden="true"
        >
          {renderWallTexture(roomTheme.trim)}
          {galleryIndex === 1 && <div className="absolute inset-[18%] border-4 border-cyan-100/45 bg-slate-950/50" />}
          {galleryIndex === 2 && <div className="absolute inset-x-[26%] top-[18%] h-[62%] bg-emerald-200/35" />}
          {galleryIndex === 3 && <div className="absolute inset-y-[16%] left-[34%] w-[32%] bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.35)_0_10px,transparent_10px_20px)]" />}
        </div>
      </>
    );
  };

  const renderGalleryLighting = (galleryIndex: number, roomTheme: typeof fallbackTheme) => (
    <>
      {galleryIndex === 2 && (
        <>
          <div className="absolute left-[20%] top-[39%] h-[32%] w-[18%] bg-[radial-gradient(circle,rgba(187,247,208,0.24),transparent_66%)]" aria-hidden="true" />
          <div className="absolute right-[20%] top-[39%] h-[32%] w-[18%] bg-[radial-gradient(circle,rgba(249,168,212,0.22),transparent_66%)]" aria-hidden="true" />
        </>
      )}
      {galleryIndex === 3 && (
        <div
          className="absolute left-[10%] top-[37%] h-[48%] w-[78%] opacity-50"
          style={{ background: `linear-gradient(120deg, transparent 0 28%, ${roomTheme.glow}44 28% 32%, transparent 32% 60%, ${roomTheme.accent}44 60% 64%, transparent 64%)` }}
          aria-hidden="true"
        />
      )}
      {renderTorch('27%', '39%')}
      {renderTorch('70%', '39%')}
    </>
  );

  const renderLegacyGeneratedSceneArt = () => {
    if (!USE_GENERATED_SCENE_ART) return null;

    const legacyTheme = fallbackTheme;
    return (
      <div className="hidden" aria-hidden="true">
        {renderFloorDetails()}
        {renderWallTexture(legacyTheme.trim)}
        {renderGalleryFloorInlays(0, legacyTheme)}
        {renderGalleryWallDecor(0, legacyTheme)}
        {renderGalleryArchitecture(0, legacyTheme)}
        {renderGalleryLighting(0, legacyTheme)}
        {renderDoorFace('Legacy', 'Hidden', legacyTheme.door, legacyTheme.trim, legacyTheme.glow)}
      </div>
    );
  };

  const interactionHotspotClass = 'absolute z-40 border-0 bg-transparent p-0 text-transparent transition hover:bg-cyan-200/10 focus:bg-transparent focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:hover:bg-transparent';

  const renderStageBackground = (src: string, alt: string) => (
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 h-full w-full object-cover"
      draggable={false}
      style={{ imageRendering: 'auto' }}
    />
  );

  const renderCommandBar = () => {
    const actions = [
      { label: 'Guide', icon: '📖', action: onNavigateToGuide, disabled: false },
      { label: 'Journal', icon: '📔', action: onNavigateToJournal, disabled: !selectedAvatar },
      { label: 'Inventory', icon: '🎒', action: onNavigateToInventory, disabled: !selectedAvatar },
      { label: 'Side Quests', icon: '🔎', action: () => openCaseFiles(currentSceneCase?.id || selectedCaseFileCase?.id), disabled: false },
      { label: 'Assessment', icon: '★', action: onNavigateToAssessment, disabled: !selectedAvatar },
      { label: 'Save', icon: '▣', action: onSaveGame, disabled: !selectedAvatar },
      { label: 'Menu', icon: '☰', action: onReturnToStartScreen, disabled: false },
    ];

    return (
      <nav className="flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 overflow-x-auto rounded-md border border-[#263b64]/90 bg-[#0b1429]/92 px-2 py-1.5 shadow-[0_4px_0_rgba(0,0,0,0.32)]">
        {teacherMode && (
          <label className="flex min-h-8 shrink-0 items-center gap-1.5 rounded-md border border-amber-300/70 bg-[#2a1c35]/95 px-2.5 py-1 text-[10px] font-black uppercase text-amber-100 shadow-[0_2px_0_rgba(0,0,0,0.45)]">
            <span>Teacher Year</span>
            <select
              value={selectedTeacherYearOptionId}
              onChange={(event) => {
                const selectedOption = SCSA_ASSESSMENT_YEAR_OPTIONS.find((option) => option.id === event.target.value);
                if (!selectedOption) return;
                onUpdateTeacherYearSelection?.(
                  selectedOption.yearLevel as YearLevel,
                  selectedOption.coursePathway as SeniorCoursePathway | undefined,
                );
              }}
              className="rounded-sm border border-amber-200/70 bg-[#10182d] px-2 py-0.5 text-[10px] font-black uppercase text-white outline-none focus:ring-4 focus:ring-amber-200"
              aria-label="Teacher Mode year level"
            >
              {SCSA_ASSESSMENT_YEAR_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.shortLabel}
                </option>
              ))}
            </select>
          </label>
        )}
        {actions.map((item) => (
          <button
            key={`map-command-${item.label}`}
            type="button"
            onClick={item.action}
            disabled={item.disabled}
            className="flex min-h-8 shrink-0 items-center gap-1.5 rounded-md border border-[#2c426e]/80 bg-[#111a2e]/95 px-2.5 py-1 text-[10px] font-black uppercase text-amber-100 shadow-[0_2px_0_rgba(0,0,0,0.45)] transition hover:bg-[#182642] focus:outline-none focus:ring-4 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="text-sm leading-none" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    );
  };

  const getCurrentLocationLabel = (): string => {
    if (scene === 'foyer') return 'ArtQuest Guild Museum Hall';
    return activeGallery?.name || 'ArtQuest Gallery';
  };

  const renderBottomStatusBar = () => {
    const completedCases = SIDE_QUEST_CASES.filter((sideQuestCase) => getSideQuestDisplayStatus(sideQuestCase) === 'completed').length;

    return (
      <div className="hidden min-h-[42px] shrink-0 items-center justify-between gap-3 border-2 border-[#3b2a45] bg-[#171323]/95 px-4 py-2 text-xs font-black text-amber-100 shadow-[0_-4px_0_rgba(0,0,0,0.35)] sm:flex">
        <div className="flex items-center gap-5">
          <span>◎ Gems {solvedWingsCount}/{wingDefinitions.length}</span>
          <span>★ Cases {completedCases}/{SIDE_QUEST_CASES.length}</span>
          <span>▤ Journal {learningJournal.length}</span>
        </div>
        <div className="truncate text-right text-slate-200">⌖ {getCurrentLocationLabel()}</div>
      </div>
    );
  };

  const renderDoorFace = (
    label: string,
    caption: string,
    doorColor: string,
    trimColor: string,
    glowColor: string,
    isLocked = false,
  ) => (
    <>
      <div
        className="absolute inset-x-[4%] top-0 h-[76%] border-4 border-[#080814] bg-[#8f7554] shadow-[0_5px_0_rgba(0,0,0,0.34)]"
        style={{
          clipPath: 'polygon(18% 0, 82% 0, 100% 22%, 100% 100%, 0 100%, 0 22%)',
          background: `linear-gradient(90deg, rgba(255,255,255,0.18), transparent 22%, rgba(0,0,0,0.28)), ${trimColor}`,
        }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-x-[13%] bottom-0 h-[86%] border-4 border-[#080814]"
          style={{
            clipPath: 'polygon(16% 0, 84% 0, 100% 20%, 100% 100%, 0 100%, 0 20%)',
            background: `linear-gradient(90deg, rgba(0,0,0,0.32), transparent 48%, rgba(255,255,255,0.16)), ${doorColor}`,
          }}
        >
          <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-[#080814]/75" />
          <div className="absolute left-[18%] top-[20%] h-[24%] w-[24%] border-2 border-[#080814]/75 bg-black/10" />
          <div className="absolute right-[18%] top-[20%] h-[24%] w-[24%] border-2 border-[#080814]/75 bg-black/10" />
          <div className="absolute left-[18%] bottom-[14%] h-[28%] w-[24%] border-2 border-[#080814]/75 bg-black/10" />
          <div className="absolute right-[18%] bottom-[14%] h-[28%] w-[24%] border-2 border-[#080814]/75 bg-black/10" />
          <div className="absolute left-[42%] top-[52%] h-2 w-2 bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.65)]" />
          <div className="absolute right-[42%] top-[52%] h-2 w-2 bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.65)]" />
        </div>
        {isLocked && (
          <div className="absolute inset-x-[13%] bottom-0 h-[86%] bg-slate-950/58">
            <div className="absolute left-1/2 top-[36%] h-7 w-8 -translate-x-1/2 border-4 border-slate-200 bg-slate-700">
              <div className="absolute -top-6 left-1/2 h-7 w-7 -translate-x-1/2 border-4 border-b-0 border-slate-200" />
            </div>
          </div>
        )}
      </div>
      <div
        className="absolute bottom-0 left-1/2 w-[78%] -translate-x-1/2 border-[3px] border-[#080814] bg-[#111126] px-1 py-0.5 text-center text-amber-100 shadow-[0_3px_0_rgba(0,0,0,0.34)]"
        style={{ boxShadow: `0 0 18px ${isLocked ? 'rgba(0,0,0,0.18)' : `${glowColor}66`}` }}
      >
        <p className="truncate text-[8px] font-black uppercase tracking-normal sm:text-[9px]">{label}</p>
        <p className="truncate text-[7px] font-black uppercase tracking-normal text-cyan-100 sm:text-[8px]">{caption}</p>
      </div>
    </>
  );

  const renderFoyer = () => {
    const firstGalleryUnlocked = galleryGroups.length > 0;

    return (
      <section className="flex h-full w-full items-center justify-center">
        <div
          className="artquest-scene-stage relative overflow-hidden shadow-2xl"
          style={{
            boxSizing: 'border-box',
            height: `${stageSize.height}px`,
            width: `${stageSize.width}px`,
          }}
        >
          {renderStageBackground(SCENE_BACKGROUND_IMAGES.foyer, 'ArtQuest museum foyer')}
          {renderLegacyGeneratedSceneArt()}
          <button
            type="button"
            onClick={() => firstGalleryUnlocked && setScene(0)}
            disabled={!firstGalleryUnlocked}
            className={interactionHotspotClass}
            style={{ left: '12%', top: '9%', width: '21%', height: '26%' }}
            aria-label="Enter Gallery One"
          />
          {renderSideQuestClues()}
          {renderSceneNpcs()}
          {renderPip()}
          {renderAvatar(playerPosition)}
          {renderSpeechBubbleLayer()}
        </div>
      </section>
    );
  };

  const renderLevelDoor = (wingId: string, doorIndex: number) => {
    const wing = getWingById(wingId);
    if (!wing) return null;

    const state = wingsState[wing.id];
    const isUnlocked = isWingAccessible(wing.id);
    const isSolved = !!state?.isSolved;
    const canEnter = isUnlocked;
    const position = LEVEL_DOOR_POSITIONS[doorIndex];
    const statusText = isSolved ? 'Complete' : canEnter ? 'Open' : 'Locked';
    const levelNumber = wingDefinitions.findIndex((item) => item.id === wing.id) + 1;

    return (
      <button
        key={wing.id}
        type="button"
        onClick={() => canEnter && requestWingEntry(wing.id)}
        disabled={!canEnter}
        className={interactionHotspotClass}
        style={{
          left: position.left,
          top: position.top,
          width: position.width,
          height: position.height,
        }}
        aria-label={`Level ${levelNumber}: ${getWingShortName(wing)}. ${statusText}. ${getWingArtPrincipleSummary(wing)}.`}
        title={getWingShortName(wing)}
      />
    );
  };

  const renderGallery = () => {
    if (!activeGallery) return null;

    const galleryIndex = activeGallery.index;
    const nextGallery = galleryGroups[activeGallery.index + 1];
    const canEnterNextGallery = isGalleryComplete(activeGallery.index);
    const backgroundImage = SCENE_BACKGROUND_IMAGES.galleries[galleryIndex] || SCENE_BACKGROUND_IMAGES.galleries[0];
    const returnScene = getReturnSceneForGallery(activeGallery.index);
    const returnDoorLabel = getSceneDisplayName(returnScene);

    return (
      <section className="flex h-full w-full items-center justify-center">
        <div
          className="artquest-scene-stage relative overflow-hidden shadow-2xl"
          style={{
            boxSizing: 'border-box',
            height: `${stageSize.height}px`,
            width: `${stageSize.width}px`,
          }}
        >
          {renderStageBackground(backgroundImage, `${activeGallery.name} background`)}
          {nextGallery ? (
            <button
              type="button"
              onClick={() => canEnterNextGallery && setScene(activeGallery.index + 1)}
              disabled={!canEnterNextGallery}
              className={interactionHotspotClass}
              style={{ left: '80%', top: '46%', width: '14%', height: '31%' }}
              aria-label={`${nextGallery.name}. ${canEnterNextGallery ? 'Open' : 'Locked'}.`}
            />
          ) : (
            <div className="absolute left-[80%] top-[46%] z-30 h-[31%] w-[14%]" aria-hidden="true" />
          )}
          {activeGallery.wingIds.map((wingId, doorIndex) => renderLevelDoor(wingId, doorIndex))}
          {renderSideQuestClues()}
          {renderDoorGuards()}
          {renderSceneNpcs()}
          {renderPip()}
          {renderAvatar(playerPosition)}
          {renderSpeechBubbleLayer()}
          <button
            type="button"
            onClick={() => setScene(returnScene)}
            className={interactionHotspotClass}
            style={{ left: '41.5%', top: '78%', width: '19%', height: '14%' }}
            aria-label={`Return to ${returnDoorLabel}`}
          />
        </div>
      </section>
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-[#07111d] text-slate-100">
      <style>{AVATAR_MOTION_STYLES}</style>
      {renderDoorChallengeOverlay()}
      {renderDoorUnlockOverlay()}
      {renderSideQuestClueOverlay()}
      {renderFinalSolveOverlay()}
      {renderCaseFilesOverlay()}
      <main className="grid h-full min-h-0 w-full grid-cols-1 gap-2 overflow-hidden p-2">
        <section className="flex min-h-0 min-w-0 flex-col gap-2">
          {renderCommandBar()}
          <div ref={mainRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
            {scene === 'foyer' ? renderFoyer() : renderGallery()}
          </div>
          {renderBottomStatusBar()}
        </section>
      </main>
    </div>
  );
};
