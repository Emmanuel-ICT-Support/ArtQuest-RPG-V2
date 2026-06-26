import type { AvatarArchetypeId, AvatarAssetTabId, AvatarBuilderConfig, PlayerAvatar, PlayerStats, TraitLevel, TraitName } from '../types';
import {
  GENERATED_AVATAR_FACE_STYLES,
  GENERATED_AVATAR_HAIR_STYLES,
  GENERATED_AVATAR_HELD_OBJECTS,
  GENERATED_AVATAR_LAYER_MAP,
  GENERATED_AVATAR_OUTFITS,
  GENERATED_AVATAR_SKIN_TONES,
} from './AvatarLayerManifest.generated';

export type RewardTraitLevel = Exclude<TraitLevel, 'Locked'>;

export interface BuilderOption {
  id: string;
  name: string;
  unlock?: {
    traitName: TraitName;
    level: RewardTraitLevel;
  };
  rewardDescription?: string;
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

export interface OutfitOption extends BuilderOption {
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

interface AccessoryOption extends BuilderOption {
  color: string;
  accent: string;
}

export interface AvatarBuilderTab {
  id: AvatarAssetTabId;
  label: string;
  shortLabel: string;
  options: BuilderOption[];
}

export interface AvatarRewardMilestone {
  traitName: TraitName;
  level: RewardTraitLevel;
  badgeName: string;
  assetName: string;
  assetId: string;
  assetCategory: AvatarAssetTabId;
  assetCategoryLabel: string;
  description: string;
}

export const AVATAR_ARCHETYPE_SPRITES: Record<AvatarArchetypeId, string> = {
  nova: './public/images/Nova.png',
  leo: './public/images/Leo.png',
  zia: './public/images/Zia.png',
};

export const AVATAR_LAYER_BLANK_BASE_IMAGE_URL = './public/images/avatar-layers/generated/normalized/base/blank.png';

export interface AvatarPngLayerSlot {
  id: AvatarAssetTabId;
  label: string;
  order: number;
}

export const AVATAR_PNG_LAYER_SLOTS: AvatarPngLayerSlot[] = [
  { id: 'outfitId', label: 'Outfit', order: 1 },
  { id: 'faceId', label: 'Face', order: 2 },
  { id: 'hairStyleId', label: 'Hair', order: 3 },
  { id: 'heldObjectId', label: 'Held Item', order: 4 },
  { id: 'accessoryId', label: 'Accessory', order: 5 },
];

export const isAvatarArchetypeId = (id: string | undefined | null): id is AvatarArchetypeId => (
  id === 'nova' || id === 'leo' || id === 'zia'
);

export const getAvatarArchetypeSpriteUrl = (archetypeId: AvatarArchetypeId): string => (
  AVATAR_ARCHETYPE_SPRITES[archetypeId]
);

export const getAvatarArchetypeIdForAvatar = (avatar: PlayerAvatar | null): AvatarArchetypeId | null => {
  if (!avatar) return null;
  if (isAvatarArchetypeId(avatar.id)) return avatar.id;
  if (isAvatarArchetypeId(avatar.avatarArchetypeId)) return avatar.avatarArchetypeId;
  if (isAvatarArchetypeId(avatar.avatarBuild?.archetypeId)) return avatar.avatarBuild.archetypeId;
  return null;
};

export const getAvatarSpriteUrl = (avatar: PlayerAvatar | null): string | null => {
  if (
    avatar?.imageUrl
    && !avatar.imageUrl.startsWith('data:image/svg+xml')
    && !avatar.imageUrl.startsWith('data:image/png')
  ) {
    return avatar.imageUrl;
  }
  const archetypeId = getAvatarArchetypeIdForAvatar(avatar);
  if (archetypeId) return getAvatarArchetypeSpriteUrl(archetypeId);
  return null;
};

export type AvatarLayerAssetMap = Partial<Record<AvatarAssetTabId, Record<string, string>>>;

export interface AvatarLayerAssetSet {
  baseImageUrl: string;
  layers: AvatarLayerAssetMap;
}

export const AVATAR_LAYER_ASSETS: Record<AvatarArchetypeId, AvatarLayerAssetSet> = {
  nova: {
    baseImageUrl: AVATAR_LAYER_BLANK_BASE_IMAGE_URL,
    layers: GENERATED_AVATAR_LAYER_MAP as AvatarLayerAssetMap,
  },
  leo: {
    baseImageUrl: AVATAR_LAYER_BLANK_BASE_IMAGE_URL,
    layers: GENERATED_AVATAR_LAYER_MAP as AvatarLayerAssetMap,
  },
  zia: {
    baseImageUrl: AVATAR_LAYER_BLANK_BASE_IMAGE_URL,
    layers: GENERATED_AVATAR_LAYER_MAP as AvatarLayerAssetMap,
  },
};

const getLayerUrlForSlot = (
  assetSet: AvatarLayerAssetSet,
  slotId: AvatarAssetTabId,
  config: AvatarBuilderConfig,
): string | undefined => {
  if (slotId === 'faceId') {
    const faceSkinKey = `${config.faceId}_${config.skinToneId}`;
    return assetSet.layers.faceId?.[faceSkinKey]
      || assetSet.layers.faceId?.[config.faceId];
  }

  return assetSet.layers[slotId]?.[config[slotId]];
};

const getGeneratedSkinDetailLayerUrl = (
  skinToneId: string,
  detailLayer: 'neck' | 'hands' | 'lower_hand' | 'raised_hand',
): string => (
  `./public/images/avatar-layers/generated/normalized/Asset.skin/${detailLayer}/${skinToneId}.png`
);

const getFrontHairLayerUrl = (hairUrl: string | undefined): string | undefined => (
  hairUrl?.replace('/Asset.Hair/', '/Asset.Hair.front/')
);

const OBJECTS_WITH_RAISED_HAND_OVERLAY = new Set([
  'brush',
  'crystal_staff',
  'flower',
  'herb',
  'key',
  'magnifying_glass',
  'mallet',
  'pencil',
  'quill',
  'star_staff',
  'telescope',
  'torch',
  'wand',
  'wrench',
]);

export const getAvatarLayerImageUrls = (config: AvatarBuilderConfig): string[] => {
  const normalizedConfig = normalizeAvatarBuild(config);
  const archetypeId = normalizedConfig.archetypeId || 'nova';
  const assetSet = AVATAR_LAYER_ASSETS[archetypeId];
  const skinNeckUrl = getGeneratedSkinDetailLayerUrl(normalizedConfig.skinToneId, 'neck');
  const lowerHandUrl = getGeneratedSkinDetailLayerUrl(normalizedConfig.skinToneId, 'lower_hand');
  const raisedHandUrl = getGeneratedSkinDetailLayerUrl(normalizedConfig.skinToneId, 'raised_hand');
  const faceUrl = getLayerUrlForSlot(assetSet, 'faceId', normalizedConfig);
  const hairUrl = getLayerUrlForSlot(assetSet, 'hairStyleId', normalizedConfig);
  const frontHairUrl = getFrontHairLayerUrl(hairUrl);
  const outfitUrl = getLayerUrlForSlot(assetSet, 'outfitId', normalizedConfig);
  const heldObjectUrl = getLayerUrlForSlot(assetSet, 'heldObjectId', normalizedConfig);
  const accessoryUrl = getLayerUrlForSlot(assetSet, 'accessoryId', normalizedConfig);
  const shouldRaiseHandOverlayObject = OBJECTS_WITH_RAISED_HAND_OVERLAY.has(normalizedConfig.heldObjectId);
  const layerUrls = [
    skinNeckUrl,
    outfitUrl,
    hairUrl,
    faceUrl,
    frontHairUrl,
    lowerHandUrl,
    shouldRaiseHandOverlayObject ? undefined : raisedHandUrl,
    heldObjectUrl,
    shouldRaiseHandOverlayObject ? raisedHandUrl : undefined,
    accessoryUrl,
  ].filter((url): url is string => !!url);

  return [assetSet.baseImageUrl, ...layerUrls];
};

export const getAvatarAssetPreviewImageUrls = (
  config: AvatarBuilderConfig,
  tabId: AvatarAssetTabId,
  optionId: string,
): string[] => {
  const normalizedConfig = normalizeAvatarBuild({ ...config, [tabId]: optionId });
  const archetypeId = normalizedConfig.archetypeId || 'nova';
  const assetSet = AVATAR_LAYER_ASSETS[archetypeId];

  if (tabId === 'skinToneId') {
    return [
      getLayerUrlForSlot(assetSet, 'skinToneId', normalizedConfig),
      getGeneratedSkinDetailLayerUrl(normalizedConfig.skinToneId, 'neck'),
      getGeneratedSkinDetailLayerUrl(normalizedConfig.skinToneId, 'lower_hand'),
      getGeneratedSkinDetailLayerUrl(normalizedConfig.skinToneId, 'raised_hand'),
    ].filter((url): url is string => !!url);
  }

  if (tabId === 'hairStyleId') {
    const hairUrl = getLayerUrlForSlot(assetSet, 'hairStyleId', normalizedConfig);
    return [
      hairUrl,
      getFrontHairLayerUrl(hairUrl),
    ].filter((url): url is string => !!url);
  }

  const layerUrl = getLayerUrlForSlot(assetSet, tabId, normalizedConfig);
  return layerUrl ? [layerUrl] : [];
};

export const AVATAR_REWARD_TRAIT_LEVEL_ORDER: TraitLevel[] = ['Locked', 'Bronze', 'Silver', 'Gold'];

const TRAIT_BADGE_NAMES: Record<TraitName, Record<RewardTraitLevel, string>> = {
  Focus: {
    Bronze: 'Careful Observer',
    Silver: 'Evidence Hunter',
    Gold: 'Gallery Investigator',
  },
  Expression: {
    Bronze: 'Word Collector',
    Silver: 'Vocabulary Keeper',
    Gold: 'Expressive Curator',
  },
  Insight: {
    Bronze: 'Meaning Finder',
    Silver: 'Deep Interpreter',
    Gold: 'Concept Scholar',
  },
  Imagination: {
    Bronze: 'Idea Spark',
    Silver: 'Connection Maker',
    Gold: 'Storyteller Curator',
  },
};

const AVATAR_TAB_LABELS: Record<AvatarAssetTabId, string> = {
  skinToneId: 'Skin Tone',
  hairStyleId: 'Hair Style',
  faceId: 'Face',
  outfitId: 'Outfit',
  heldObjectId: 'Held Item',
  accessoryId: 'Accessory',
};

export const AVATAR_REWARD_SKIN_TONES: SkinToneOption[] = GENERATED_AVATAR_SKIN_TONES;

const NO_HAIR_OPTION: HairStyleOption = {
  id: 'none',
  name: 'No Hair',
  color: '#94a3b8',
  shadow: '#475569',
  highlight: '#cbd5e1',
};

const NO_HELD_OBJECT_OPTION: HeldObjectOption = {
  id: 'none',
  name: 'No Object',
  color: '#94a3b8',
  accent: '#cbd5e1',
};

type RewardConfigEntry = {
  traitName: TraitName;
  level: RewardTraitLevel;
  rewardDescription: string;
};

const withRewardUnlocks = <T extends BuilderOption>(
  options: T[],
  unlocks: Partial<Record<string, RewardConfigEntry>>,
): T[] => (
  options.map((option) => {
    const unlockConfig = unlocks[option.id];
    if (!unlockConfig) return option;

    return {
      ...option,
      unlock: {
        traitName: unlockConfig.traitName,
        level: unlockConfig.level,
      },
      rewardDescription: unlockConfig.rewardDescription,
    };
  })
);

const FACE_REWARD_UNLOCKS: Partial<Record<string, RewardConfigEntry>> = {
  surprise: {
    traitName: 'Imagination',
    level: 'Bronze',
    rewardDescription: 'For unexpected ideas and imaginative leaps.',
  },
};

const OUTFIT_REWARD_UNLOCKS: Partial<Record<string, RewardConfigEntry>> = {
  gallery_guard: {
    traitName: 'Focus',
    level: 'Gold',
    rewardDescription: 'For precise, evidence-led responses across the gallery.',
  },
  dream_painter: {
    traitName: 'Expression',
    level: 'Gold',
    rewardDescription: 'For confident, expressive interpretation and vivid visual language.',
  },
  archivist_vest: {
    traitName: 'Insight',
    level: 'Gold',
    rewardDescription: 'For scholarly, layered understanding of artworks and ideas.',
  },
  magic_explorer: {
    traitName: 'Imagination',
    level: 'Gold',
    rewardDescription: 'For original interpretation that transforms symbols into stories.',
  },
};

const HELD_OBJECT_REWARD_UNLOCKS: Partial<Record<string, RewardConfigEntry>> = {
  magnifying_glass: {
    traitName: 'Focus',
    level: 'Bronze',
    rewardDescription: 'For careful observation and close visual evidence.',
  },
  compass: {
    traitName: 'Focus',
    level: 'Silver',
    rewardDescription: 'For tracing clues with confidence and staying oriented in the artwork.',
  },
  palette: {
    traitName: 'Expression',
    level: 'Bronze',
    rewardDescription: 'For building a bold visual vocabulary.',
  },
  quill: {
    traitName: 'Expression',
    level: 'Silver',
    rewardDescription: 'For precise art words and vivid description.',
  },
  key: {
    traitName: 'Insight',
    level: 'Bronze',
    rewardDescription: 'For finding meaning beneath the surface.',
  },
  spellbook: {
    traitName: 'Insight',
    level: 'Silver',
    rewardDescription: 'For deep interpretation and concept-building.',
  },
  crystal: {
    traitName: 'Imagination',
    level: 'Silver',
    rewardDescription: 'For making original connections between symbols and stories.',
  },
};

export const AVATAR_REWARD_HAIR_STYLES: HairStyleOption[] = [
  NO_HAIR_OPTION,
  ...GENERATED_AVATAR_HAIR_STYLES,
];

export const AVATAR_REWARD_FACE_STYLES: BuilderOption[] = withRewardUnlocks(
  GENERATED_AVATAR_FACE_STYLES,
  FACE_REWARD_UNLOCKS,
);

export const AVATAR_REWARD_OUTFITS: OutfitOption[] = withRewardUnlocks(
  GENERATED_AVATAR_OUTFITS,
  OUTFIT_REWARD_UNLOCKS,
);

export const AVATAR_REWARD_HELD_OBJECTS: HeldObjectOption[] = [
  NO_HELD_OBJECT_OPTION,
  ...withRewardUnlocks(
    GENERATED_AVATAR_HELD_OBJECTS,
    HELD_OBJECT_REWARD_UNLOCKS,
  ),
];

export const ACCESSORIES: AccessoryOption[] = [
  { id: 'none', name: 'No Accessory', color: '#ffffff', accent: '#ffffff' },
  { id: 'round_glasses', name: 'Round Glasses', color: '#0f172a', accent: '#bae6fd' },
  { id: 'focus_pin', name: 'Focus Pin', color: '#38bdf8', accent: '#facc15' },
  { id: 'paint_scarf', name: 'Paint Scarf', color: '#ec4899', accent: '#fef08a' },
  { id: 'insight_brooch', name: 'Insight Brooch', color: '#67e8f9', accent: '#f0abfc' },
  { id: 'sketch_aura', name: 'Sketch Aura', color: '#f97316', accent: '#fef3c7' },
];

export const AVATAR_REWARD_DEFAULT_BUILD: AvatarBuilderConfig = {
  archetypeId: 'nova',
  skinToneId: 'golden',
  hairStyleId: 'brown_bob',
  faceId: AVATAR_REWARD_FACE_STYLES[0].id,
  outfitId: 'mystic_robe',
  heldObjectId: 'brush',
  accessoryId: ACCESSORIES[0].id,
};

export const AVATAR_REWARD_BUILDER_TABS: AvatarBuilderTab[] = [
  { id: 'skinToneId', label: AVATAR_TAB_LABELS.skinToneId, shortLabel: 'Skin', options: AVATAR_REWARD_SKIN_TONES },
  { id: 'hairStyleId', label: AVATAR_TAB_LABELS.hairStyleId, shortLabel: 'Hair', options: AVATAR_REWARD_HAIR_STYLES },
  { id: 'faceId', label: AVATAR_TAB_LABELS.faceId, shortLabel: 'Face', options: AVATAR_REWARD_FACE_STYLES },
  { id: 'outfitId', label: AVATAR_TAB_LABELS.outfitId, shortLabel: 'Outfit', options: AVATAR_REWARD_OUTFITS },
  { id: 'heldObjectId', label: AVATAR_TAB_LABELS.heldObjectId, shortLabel: 'Item', options: AVATAR_REWARD_HELD_OBJECTS },
];

export const getTraitLevelRank = (level: TraitLevel): number => AVATAR_REWARD_TRAIT_LEVEL_ORDER.indexOf(level);

export const isTraitLevelAtLeast = (currentLevel: TraitLevel | undefined, requiredLevel: RewardTraitLevel): boolean => (
  getTraitLevelRank(currentLevel || 'Locked') >= getTraitLevelRank(requiredLevel)
);

export const getAvatarRewardOptionById = <T extends BuilderOption>(options: T[], id: string | undefined): T => (
  options.find(option => option.id === id) || options[0]
);

const AVATAR_OPTIONS_BY_TAB: Record<AvatarAssetTabId, BuilderOption[]> = {
  skinToneId: AVATAR_REWARD_SKIN_TONES,
  hairStyleId: AVATAR_REWARD_HAIR_STYLES,
  faceId: AVATAR_REWARD_FACE_STYLES,
  outfitId: AVATAR_REWARD_OUTFITS,
  heldObjectId: AVATAR_REWARD_HELD_OBJECTS,
  accessoryId: ACCESSORIES,
};

const LEGACY_AVATAR_OPTION_IDS: Partial<Record<AvatarAssetTabId, Record<string, string>>> = {
  skinToneId: {
    peach: 'fair',
    deep: 'deep_brown',
    rose: 'fair',
    olive: 'warm_beige',
  },
  hairStyleId: {
    crop: 'brown_crop',
    bob: 'brown_bob',
    waves: 'brown_swept',
    curls: 'brown_curls',
    spikes: 'brown_short_spikes',
    ponytail: 'brown_ponytail',
  },
  faceId: {
    bright: 'happy',
    calm: 'focused',
    bold: 'focused',
    curious: 'surprise',
  },
  outfitId: {
    robe: 'mystic_robe',
    apron: 'artist_apron',
    coat: 'explorer',
    jacket: 'explorers_jacket',
    tunic: 'painted_hoodie',
    cape: 'magic_explorer',
    investigator_coat: 'archivist_vest',
    patterned_robe: 'mystic_robe',
    scholar_cape: 'magic_explorer',
    storyteller_cloak: 'dream_painter',
  },
  heldObjectId: {
    sketchbook: 'spellbook',
    lantern: 'torch',
    prism: 'crystal',
    magnifier: 'magnifying_glass',
    evidence_compass: 'compass',
    word_quill: 'quill',
    meaning_key: 'key',
    idea_wand: 'wand',
  },
};

const resolveAvatarOptionId = (tabId: AvatarAssetTabId, id: string): string => {
  const options = AVATAR_OPTIONS_BY_TAB[tabId];
  if (options.some(option => option.id === id)) return id;

  const legacyId = LEGACY_AVATAR_OPTION_IDS[tabId]?.[id];
  if (legacyId && options.some(option => option.id === legacyId)) return legacyId;

  return options[0]?.id || id;
};

export const normalizeAvatarBuild = (build?: Partial<AvatarBuilderConfig> | null): AvatarBuilderConfig => {
  const mergedBuild = {
    ...AVATAR_REWARD_DEFAULT_BUILD,
    ...(build || {}),
  };

  return {
    ...mergedBuild,
    skinToneId: resolveAvatarOptionId('skinToneId', mergedBuild.skinToneId),
    hairStyleId: resolveAvatarOptionId('hairStyleId', mergedBuild.hairStyleId),
    faceId: resolveAvatarOptionId('faceId', mergedBuild.faceId),
    outfitId: resolveAvatarOptionId('outfitId', mergedBuild.outfitId),
    heldObjectId: resolveAvatarOptionId('heldObjectId', mergedBuild.heldObjectId),
    accessoryId: resolveAvatarOptionId('accessoryId', mergedBuild.accessoryId),
  };
};

export const getAvatarBuildForAvatar = (avatar: PlayerAvatar | null): AvatarBuilderConfig => {
  if (avatar?.avatarBuild) {
    return normalizeAvatarBuild({
      ...avatar.avatarBuild,
      archetypeId: avatar.avatarBuild.archetypeId
        || avatar.avatarArchetypeId
        || (isAvatarArchetypeId(avatar.id) ? avatar.id : undefined),
    });
  }

  switch (avatar?.id) {
    case 'nova':
      return normalizeAvatarBuild({
        archetypeId: 'nova',
        skinToneId: 'golden',
        hairStyleId: 'brown_curls',
        faceId: 'focused',
        outfitId: 'mystic_robe',
        heldObjectId: 'star_staff',
        accessoryId: 'none',
      });
    case 'leo':
      return normalizeAvatarBuild({
        archetypeId: 'leo',
        skinToneId: 'golden',
        hairStyleId: 'teal_long_spikes',
        faceId: 'focused',
        outfitId: 'painted_hoodie',
        heldObjectId: 'star_staff',
        accessoryId: 'none',
      });
    case 'zia':
      return normalizeAvatarBuild({
        archetypeId: 'zia',
        skinToneId: 'golden',
        hairStyleId: 'brown_ponytail',
        faceId: 'focused',
        outfitId: 'artist_apron',
        heldObjectId: 'star_staff',
        accessoryId: 'none',
      });
    default:
      return normalizeAvatarBuild(avatar?.avatarBuild);
  }
};

export const isAvatarOptionUnlocked = (option: BuilderOption, playerStats: PlayerStats | null): boolean => {
  if (!option.unlock) return true;
  if (!playerStats) return false;

  const traitLevel = playerStats.traits[option.unlock.traitName]?.level;
  return isTraitLevelAtLeast(traitLevel, option.unlock.level);
};

export const getUnlockedOptionsForTab = (tab: AvatarBuilderTab, playerStats: PlayerStats | null): BuilderOption[] => (
  tab.options.filter(option => isAvatarOptionUnlocked(option, playerStats))
);

const collectRewardMilestones = (): AvatarRewardMilestone[] => (
  AVATAR_REWARD_BUILDER_TABS.flatMap(tab => (
    tab.options.flatMap(option => {
      if (!option.unlock) return [];

      return {
        traitName: option.unlock.traitName,
        level: option.unlock.level,
        badgeName: TRAIT_BADGE_NAMES[option.unlock.traitName][option.unlock.level],
        assetName: option.name,
        assetId: option.id,
        assetCategory: tab.id,
        assetCategoryLabel: tab.label,
        description: option.rewardDescription || `${option.name} is unlocked through ${option.unlock.traitName}.`,
      };
    })
  ))
);

export const AVATAR_REWARD_MILESTONES: AvatarRewardMilestone[] = collectRewardMilestones();

export const getRewardMilestonesForTrait = (traitName: TraitName): AvatarRewardMilestone[] => (
  AVATAR_REWARD_MILESTONES
    .filter(milestone => milestone.traitName === traitName)
    .sort((first, second) => getTraitLevelRank(first.level) - getTraitLevelRank(second.level))
);

export const getUnlockedRewardMilestones = (playerStats: PlayerStats | null): AvatarRewardMilestone[] => (
  playerStats
    ? AVATAR_REWARD_MILESTONES.filter(milestone => (
      isAvatarOptionUnlocked(
        { id: milestone.assetId, name: milestone.assetName, unlock: { traitName: milestone.traitName, level: milestone.level } },
        playerStats,
      )
    ))
    : []
);

export const getNewlyUnlockedRewardMilestones = (
  previousStats: PlayerStats,
  nextStats: PlayerStats,
): AvatarRewardMilestone[] => (
  AVATAR_REWARD_MILESTONES.filter(milestone => {
    const previousLevel = previousStats.traits[milestone.traitName]?.level;
    const nextLevel = nextStats.traits[milestone.traitName]?.level;
    return !isTraitLevelAtLeast(previousLevel, milestone.level)
      && isTraitLevelAtLeast(nextLevel, milestone.level);
  })
);

export const getRewardAvatarImageSrc = (avatar: PlayerAvatar | null): string | null => {
  if (!avatar) return null;
  return getAvatarSpriteUrl(avatar);
};

export const isPixelAvatarSpriteSrc = (src: string | null): boolean => (
  !!src && src.startsWith('./public/images/')
);

export const getAvatarBuildSummary = (config: AvatarBuilderConfig): string => {
  const normalizedConfig = normalizeAvatarBuild(config);
  const hair = getAvatarRewardOptionById(AVATAR_REWARD_HAIR_STYLES, normalizedConfig.hairStyleId);
  const face = getAvatarRewardOptionById(AVATAR_REWARD_FACE_STYLES, normalizedConfig.faceId);
  const outfit = getAvatarRewardOptionById(AVATAR_REWARD_OUTFITS, normalizedConfig.outfitId);
  const heldObject = getAvatarRewardOptionById(AVATAR_REWARD_HELD_OBJECTS, normalizedConfig.heldObjectId);
  const accessory = getAvatarRewardOptionById(ACCESSORIES, normalizedConfig.accessoryId);

  const hairText = hair.id === 'none' ? 'no hair' : `${hair.name.toLowerCase()} hair`;
  const heldObjectText = heldObject.id === 'none' ? 'no object' : heldObject.name.toLowerCase();
  const accessoryText = accessory.id === 'none' ? 'no accessory' : accessory.name.toLowerCase();
  return `${hairText}, ${face.name.toLowerCase()} face, ${outfit.name.toLowerCase()}, ${heldObjectText}, ${accessoryText}`;
};

export const getAvatarBuildTitle = (config: AvatarBuilderConfig): string => {
  const normalizedConfig = normalizeAvatarBuild(config);
  const heldObject = getAvatarRewardOptionById(AVATAR_REWARD_HELD_OBJECTS, normalizedConfig.heldObjectId);
  const accessory = getAvatarRewardOptionById(ACCESSORIES, normalizedConfig.accessoryId);
  if (accessory.id !== 'none') {
    return `${accessory.name} Artist`;
  }

  if (heldObject.id === 'none') {
    return 'Artist';
  }

  return `Artist holding ${heldObject.name}`;
};

export const getAvatarBuildColorClass = (config: AvatarBuilderConfig): string => (
  getAvatarRewardOptionById(AVATAR_REWARD_OUTFITS, normalizeAvatarBuild(config).outfitId).colorClass
);
