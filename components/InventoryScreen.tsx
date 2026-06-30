import React, { useEffect, useMemo, useState } from 'react';
import type { AvatarAssetTabId, AvatarBuilderConfig, InventoryScreenProps, PlayerTrait, TraitName } from '../types';
import {
  AVATAR_REWARD_BUILDER_TABS,
  AVATAR_REWARD_MILESTONES,
  getAvatarArchetypeSpriteUrl,
  getAvatarAssetPreviewImageUrls,
  getAvatarBuildColorClass,
  getAvatarBuildForAvatar,
  getAvatarBuildSummary,
  getAvatarBuildTitle,
  getAvatarLayerImageUrls,
  getAvatarRewardOptionById,
  getUnlockedOptionsForTab,
  getUnlockedRewardMilestones,
  isAvatarOptionUnlocked,
  isTraitLevelAtLeast,
  normalizeAvatarBuild,
} from '../data/AvatarRewards';
import type { AvatarRewardMilestone, BuilderOption } from '../data/AvatarRewards';
import AvatarAssetPreview from './AvatarAssetPreview';
import AvatarLayeredPreview from './AvatarLayeredPreview';
import {
  ArtQuestButton,
  ArtQuestIconTile,
  ArtQuestPage,
  ArtQuestPanel,
  ArtQuestProgressBar,
  ArtQuestSectionTitle,
  artQuestCx,
} from './ArtQuestUI';

const TRAIT_ORDER: TraitName[] = ['Focus', 'Expression', 'Insight', 'Imagination'];

const TRAIT_ACCENTS: Record<TraitName, { border: string; text: string; glow: string; surface: string }> = {
  Focus: {
    border: 'border-sky-400/45',
    text: 'text-sky-200',
    glow: '#38bdf8',
    surface: 'from-sky-500/20 to-slate-950/40',
  },
  Expression: {
    border: 'border-pink-400/45',
    text: 'text-pink-200',
    glow: '#f472b6',
    surface: 'from-pink-500/20 to-slate-950/40',
  },
  Insight: {
    border: 'border-emerald-400/45',
    text: 'text-emerald-200',
    glow: '#34d399',
    surface: 'from-emerald-500/20 to-slate-950/40',
  },
  Imagination: {
    border: 'border-amber-400/45',
    text: 'text-amber-200',
    glow: '#f59e0b',
    surface: 'from-amber-500/20 to-slate-950/40',
  },
};

const APPEARANCE_DESCRIPTION_MARKER = ' Appearance: ';
const INVENTORY_NO_HAIR_STYLE_ID = 'none';
const REWARD_LEVEL_RANK: Record<AvatarRewardMilestone['level'], number> = {
  Bronze: 1,
  Silver: 2,
  Gold: 3,
};

type InventoryHairStyleOption = BuilderOption & {
  color: string;
  shadow: string;
  highlight: string;
};

type InventorySkinToneOption = BuilderOption & {
  color: string;
  shadow: string;
  highlight: string;
};

interface InventoryHairColorGroup {
  id: string;
  name: string;
  color: string;
  options: InventoryHairStyleOption[];
}

const getAvatarRoleDescription = (description: string): string => (
  description.split(APPEARANCE_DESCRIPTION_MARKER)[0]?.trim() || description
);

const buildAvatarDescriptionWithAppearance = (
  currentDescription: string,
  build: AvatarBuilderConfig,
): string => {
  const roleDescription = getAvatarRoleDescription(currentDescription);
  const appearanceSummary = getAvatarBuildSummary(build);

  return roleDescription
    ? `${roleDescription}${APPEARANCE_DESCRIPTION_MARKER}${appearanceSummary}.`
    : appearanceSummary;
};

const getInventoryHairColorId = (hairStyleId: string): string => hairStyleId.split('_')[0] || hairStyleId;

const getInventoryHairStyleKey = (hairStyleId: string): string => {
  const [, ...styleParts] = hairStyleId.split('_');
  return styleParts.join('_') || hairStyleId;
};

const getInventoryHairStyleLabel = (hairStyle: InventoryHairStyleOption): string => {
  if (hairStyle.id === INVENTORY_NO_HAIR_STYLE_ID) return hairStyle.name;
  const words = hairStyle.name.split(/\s+/).filter(Boolean);
  return words.length > 1 ? words.slice(1).join(' ') : hairStyle.name;
};

const getInventoryHairColorName = (hairStyle: InventoryHairStyleOption): string => {
  const words = hairStyle.name.split(/\s+/).filter(Boolean);
  return words[0] || hairStyle.name;
};

const buildInventoryHairColorGroups = (hairStyles: InventoryHairStyleOption[]): InventoryHairColorGroup[] => {
  const groups = new Map<string, InventoryHairColorGroup>();

  hairStyles.forEach((hairStyle) => {
    const colorId = getInventoryHairColorId(hairStyle.id);
    if (!groups.has(colorId)) {
      groups.set(colorId, {
        id: colorId,
        name: getInventoryHairColorName(hairStyle),
        color: hairStyle.color,
        options: [],
      });
    }
    groups.get(colorId)?.options.push(hairStyle);
  });

  return [...groups.values()];
};

const INVENTORY_HAIR_OPTIONS = (
  AVATAR_REWARD_BUILDER_TABS.find(tab => tab.id === 'hairStyleId')?.options || []
) as InventoryHairStyleOption[];
const INVENTORY_SKIN_TONE_OPTIONS = (
  AVATAR_REWARD_BUILDER_TABS.find(tab => tab.id === 'skinToneId')?.options || []
) as InventorySkinToneOption[];
const INVENTORY_NO_HAIR_OPTION = INVENTORY_HAIR_OPTIONS.find(option => option.id === INVENTORY_NO_HAIR_STYLE_ID);
const INVENTORY_HAIR_STYLE_OPTIONS = INVENTORY_HAIR_OPTIONS.filter(option => option.id !== INVENTORY_NO_HAIR_STYLE_ID);
const INVENTORY_HAIR_COLOR_GROUPS = buildInventoryHairColorGroups(INVENTORY_HAIR_STYLE_OPTIONS);

const getInventoryTraitLevelRank = (level: PlayerTrait['level']): number => {
  switch (level) {
    case 'Gold':
      return 3;
    case 'Silver':
      return 2;
    case 'Bronze':
      return 1;
    default:
      return 0;
  }
};

const getTraitDisplayLevel = (trait: PlayerTrait): string => (
  trait.level === 'Locked' ? 'Lv. 0' : `Lv. ${getInventoryTraitLevelRank(trait.level) + 1}`
);

const getTraitFilledPipCount = (trait: PlayerTrait): number => {
  if (trait.level === 'Gold') return 6;
  const progressPips = trait.xpToNextLevel > 0
    ? Math.floor((trait.currentXP / trait.xpToNextLevel) * 2)
    : 0;
  return Math.max(0, Math.min(6, (getInventoryTraitLevelRank(trait.level) * 2) + progressPips));
};

const getOptionRequirement = (option: BuilderOption): string => (
  option.unlock ? `Reach ${option.unlock.level} ${option.unlock.traitName}` : 'Starter item'
);

const getNextLockedReward = (playerStats: InventoryScreenProps['playerStats']): AvatarRewardMilestone | null => {
  if (!playerStats) return null;

  return [...AVATAR_REWARD_MILESTONES]
    .filter(milestone => !isTraitLevelAtLeast(playerStats.traits[milestone.traitName]?.level, milestone.level))
    .sort((first, second) => {
      const levelDelta = REWARD_LEVEL_RANK[first.level] - REWARD_LEVEL_RANK[second.level];
      if (levelDelta !== 0) return levelDelta;
      return TRAIT_ORDER.indexOf(first.traitName) - TRAIT_ORDER.indexOf(second.traitName);
    })[0] || null;
};

const getEnergyMilestones = (maxXp: number, currentXP: number) => (
  [0.25, 0.5, 0.75, 1].map((ratio) => {
    const xp = Math.round(maxXp * ratio);
    return {
      ratio,
      xp,
      isUnlocked: currentXP >= xp,
    };
  })
);

const getInventoryTabById = (tabId: AvatarAssetTabId) => (
  AVATAR_REWARD_BUILDER_TABS.find(tab => tab.id === tabId) || AVATAR_REWARD_BUILDER_TABS[0]
);

const getInventoryIconInitials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '??';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
};

const InventoryScreen: React.FC<InventoryScreenProps> = ({
  playerStats,
  selectedAvatar,
  onReturnToMap,
  onUpdateAvatar,
}) => {
  const [avatarBuild, setAvatarBuild] = useState<AvatarBuilderConfig>(() => (
    { ...getAvatarBuildForAvatar(selectedAvatar), accessoryId: 'none' }
  ));
  const [activeTabId, setActiveTabId] = useState<AvatarAssetTabId>('hairStyleId');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isEditingAvatarName, setIsEditingAvatarName] = useState<boolean>(false);
  const [avatarNameDraft, setAvatarNameDraft] = useState<string>(selectedAvatar?.name || '');

  useEffect(() => {
    setAvatarBuild({ ...getAvatarBuildForAvatar(selectedAvatar), accessoryId: 'none' });
    setAvatarNameDraft(selectedAvatar?.name || '');
    setIsEditingAvatarName(false);
  }, [selectedAvatar]);

  const activeTab = useMemo(
    () => AVATAR_REWARD_BUILDER_TABS.find(tab => tab.id === activeTabId) || AVATAR_REWARD_BUILDER_TABS[0],
    [activeTabId],
  );

  const unlockedRewards = useMemo(
    () => getUnlockedRewardMilestones(playerStats),
    [playerStats],
  );

  const nextReward = useMemo(
    () => getNextLockedReward(playerStats),
    [playerStats],
  );

  if (!playerStats || !selectedAvatar) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#050914] p-6 text-gray-100">
        <p className="text-xl text-purple-200">Loading inventory...</p>
      </div>
    );
  }

  const selectedActiveOption = getAvatarRewardOptionById(activeTab.options, avatarBuild[activeTab.id]);
  const activeTabIndex = AVATAR_REWARD_BUILDER_TABS.findIndex(tab => tab.id === activeTab.id);
  const avatarPreviewImageUrls = getAvatarLayerImageUrls(avatarBuild);
  const selectedHairColorId = getInventoryHairColorId(avatarBuild.hairStyleId);
  const selectedHairStyleKey = getInventoryHairStyleKey(avatarBuild.hairStyleId);
  const selectedHairColorGroup = INVENTORY_HAIR_COLOR_GROUPS.find(group => group.id === selectedHairColorId)
    || INVENTORY_HAIR_COLOR_GROUPS.find(group => group.options.some(option => isAvatarOptionUnlocked(option, playerStats)))
    || INVENTORY_HAIR_COLOR_GROUPS[0];
  const selectedHairColorOptions = selectedHairColorGroup?.options || INVENTORY_HAIR_STYLE_OPTIONS;
  const energyMilestones = getEnergyMilestones(playerStats.artEnergy.maxXp, playerStats.artEnergy.currentXP);
  const nextEnergyMilestone = energyMilestones.find(milestone => !milestone.isUnlocked);
  const unlockedAssetCount = AVATAR_REWARD_BUILDER_TABS.reduce((count, tab) => (
    count + getUnlockedOptionsForTab(tab, playerStats).length
  ), 0);

  const updateAvatarBuild = (key: AvatarAssetTabId, value: string) => {
    setAvatarBuild(currentBuild => ({ ...currentBuild, [key]: value }));
    setSaveMessage(null);
  };

  const resetAvatarBuild = () => {
    setAvatarBuild({ ...getAvatarBuildForAvatar(selectedAvatar), accessoryId: 'none' });
    setSaveMessage(null);
  };

  const randomizeAvatarBuild = () => {
    const randomizedBuild = { ...avatarBuild };

    AVATAR_REWARD_BUILDER_TABS.forEach((tab) => {
      const unlockedOptions = getUnlockedOptionsForTab(tab, playerStats);
      const randomOption = unlockedOptions[Math.floor(Math.random() * unlockedOptions.length)] || tab.options[0];
      randomizedBuild[tab.id] = randomOption.id;
    });

    setAvatarBuild(normalizeAvatarBuild({ ...randomizedBuild, accessoryId: 'none' }));
    setSaveMessage(null);
  };

  const handleSaveAvatar = () => {
    const normalizedBuild = { ...normalizeAvatarBuild(avatarBuild), accessoryId: 'none' };
    const spriteUrl = getAvatarArchetypeSpriteUrl(normalizedBuild.archetypeId || 'nova');
    const updatedAvatar = {
      ...selectedAvatar,
      id: 'custom',
      title: selectedAvatar.title || getAvatarBuildTitle(normalizedBuild),
      description: buildAvatarDescriptionWithAppearance(selectedAvatar.description, normalizedBuild),
      imageUrl: spriteUrl,
      colorClass: getAvatarBuildColorClass(normalizedBuild),
      avatarArchetypeId: selectedAvatar.avatarArchetypeId || normalizedBuild.archetypeId,
      avatarBuild: normalizedBuild,
    };

    onUpdateAvatar(updatedAvatar);
    setSaveMessage('Avatar saved. Your equipped look is now active.');
  };

  const updateHairColor = (colorGroup: InventoryHairColorGroup) => {
    const matchingStyle = colorGroup.options.find(option => (
      isAvatarOptionUnlocked(option, playerStats) && getInventoryHairStyleKey(option.id) === selectedHairStyleKey
    )) || colorGroup.options.find(option => isAvatarOptionUnlocked(option, playerStats));

    if (matchingStyle) {
      updateAvatarBuild('hairStyleId', matchingStyle.id);
    }
  };

  const handleStartEditingAvatarName = () => {
    setAvatarNameDraft(selectedAvatar.name);
    setIsEditingAvatarName(true);
    setSaveMessage(null);
  };

  const handleCancelEditingAvatarName = () => {
    setAvatarNameDraft(selectedAvatar.name);
    setIsEditingAvatarName(false);
  };

  const handleSaveAvatarName = () => {
    const nextName = avatarNameDraft.trim() || selectedAvatar.name || 'Artist';

    if (nextName === selectedAvatar.name) {
      setIsEditingAvatarName(false);
      setAvatarNameDraft(nextName);
      return;
    }

    onUpdateAvatar({
      ...selectedAvatar,
      name: nextName,
      iconInitial: getInventoryIconInitials(nextName),
    });
    setIsEditingAvatarName(false);
    setAvatarNameDraft(nextName);
    setSaveMessage('Name updated.');
  };

  const renderTraitCard = (trait: PlayerTrait) => {
    const accent = TRAIT_ACCENTS[trait.name];
    const filledPips = getTraitFilledPipCount(trait);

    return (
      <article
        key={trait.name}
        className={`rounded-md border ${accent.border} bg-gradient-to-br ${accent.surface} p-2`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/20 bg-[#102348] text-xl shadow-[inset_0_0_18px_rgba(255,255,255,0.08)]"
            aria-hidden="true"
          >
            {trait.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h3 className={`truncate text-base font-black ${accent.text}`}>{trait.name}</h3>
              <p className="shrink-0 text-sm font-black text-gray-100">{getTraitDisplayLevel(trait)}</p>
            </div>
            <div className="mt-1 flex items-center gap-1" aria-label={`${trait.name} trait progress`}>
              {Array.from({ length: 6 }).map((_, index) => (
                <span
                  key={`${trait.name}-pip-${index}`}
                  className={`h-2.5 w-2.5 rotate-45 border ${
                    index < filledPips ? 'border-white/70' : 'border-white/35 bg-transparent'
                  }`}
                  style={{
                    backgroundColor: index < filledPips ? accent.glow : 'transparent',
                    boxShadow: index < filledPips ? `0 0 8px ${accent.glow}` : 'none',
                  }}
                  aria-hidden="true"
                />
              ))}
            </div>
            <p className="mt-0.5 truncate text-[10px] text-slate-300" title={trait.description}>
              {trait.description}
            </p>
          </div>
        </div>
      </article>
    );
  };

  const renderAssetTabPreview = (tabId: AvatarAssetTabId) => {
    const tab = getInventoryTabById(tabId);
    const selectedOption = getAvatarRewardOptionById(tab.options, avatarBuild[tab.id]);

    if (tabId === 'skinToneId') {
      const selectedSkinTone = INVENTORY_SKIN_TONE_OPTIONS.find(option => option.id === avatarBuild.skinToneId)
        || INVENTORY_SKIN_TONE_OPTIONS[0];

      return (
        <span
          className="block h-7 w-7 rounded-sm border-2 border-[#071126] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16),0_2px_0_rgba(0,0,0,0.35)]"
          style={{ backgroundColor: selectedSkinTone?.color || '#d89b66' }}
          aria-hidden="true"
        />
      );
    }

    return (
      <AvatarAssetPreview
        imageUrls={getAvatarAssetPreviewImageUrls(avatarBuild, tab.id, selectedOption.id)}
        tabId={tab.id}
        label={selectedOption.name}
        className="h-9 w-9"
      />
    );
  };

  const renderHairOptionGrid = () => (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 flex items-end justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-normal text-cyan-200">Hair Colour</p>
          <p className="text-xs text-gray-300">Selected: <span className="font-bold text-white">{selectedHairColorGroup?.name || 'None'}</span></p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {INVENTORY_HAIR_COLOR_GROUPS.map(colorGroup => {
            const isSelected = colorGroup.id === selectedHairColorId;
            const hasUnlockedOptions = colorGroup.options.some(option => isAvatarOptionUnlocked(option, playerStats));

            return (
              <button
                key={colorGroup.id}
                type="button"
                title={colorGroup.name}
                onClick={() => hasUnlockedOptions && updateHairColor(colorGroup)}
                disabled={!hasUnlockedOptions}
                className={`h-8 w-8 rounded-md border-2 p-1 transition focus:outline-none focus:ring-2 focus:ring-fuchsia-300 ${
                  isSelected
                    ? 'border-fuchsia-300 bg-fuchsia-500/20 shadow-[0_0_18px_rgba(217,70,239,0.35)]'
                    : 'border-[#2c426e] bg-[#0c1830] hover:border-fuchsia-300'
                  } ${!hasUnlockedOptions ? 'cursor-not-allowed opacity-50 grayscale' : ''}`}
                aria-pressed={isSelected}
                aria-label={`${hasUnlockedOptions ? 'Choose' : 'Locked'} ${colorGroup.name} hair colour`}
              >
                <span
                  className="block h-full w-full rounded-sm border border-white/25 shadow-inner"
                  style={{ backgroundColor: colorGroup.color }}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-end justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-normal text-cyan-200">Hair Style</p>
          <p className="text-xs text-gray-300">Selected: <span className="font-bold text-white">{selectedActiveOption.name}</span></p>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            ...(INVENTORY_NO_HAIR_OPTION ? [INVENTORY_NO_HAIR_OPTION] : []),
            ...selectedHairColorOptions,
          ].map(option => {
            const isSelected = avatarBuild.hairStyleId === option.id;
            const isUnlocked = isAvatarOptionUnlocked(option, playerStats);
            const previewImageUrls = getAvatarAssetPreviewImageUrls(avatarBuild, 'hairStyleId', option.id);

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => isUnlocked && updateAvatarBuild('hairStyleId', option.id)}
                disabled={!isUnlocked}
                className={`relative flex min-h-28 flex-col items-center justify-between rounded-md border p-2 text-center transition focus:outline-none focus:ring-2 focus:ring-fuchsia-300 ${
                  isSelected
                    ? 'border-fuchsia-300 bg-fuchsia-500/20 text-white shadow-[0_0_22px_rgba(217,70,239,0.22)]'
                    : 'border-[#2c426e] bg-[#0c1830] text-gray-300 hover:border-fuchsia-300'
                } ${!isUnlocked ? 'cursor-not-allowed grayscale' : ''}`}
                aria-pressed={isSelected}
                aria-label={`${isUnlocked ? 'Choose' : 'Locked'} ${option.name}`}
              >
                {isSelected && (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                    Set
                  </span>
                )}
                <AvatarAssetPreview
                  imageUrls={previewImageUrls}
                  tabId="hairStyleId"
                  label={option.name}
                  className="h-20 w-20"
                />
                <span className="mt-1 text-xs font-bold leading-tight">{getInventoryHairStyleLabel(option)}</span>
                <span className={`mt-1 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                    isUnlocked ? 'bg-cyan-400/20 text-cyan-100' : 'bg-gray-700 text-gray-300'
                }`}>
                  {isUnlocked ? 'Available' : getOptionRequirement(option)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderSkinToneOptionGrid = () => (
    <div className="grid grid-cols-4 gap-1.5">
      {INVENTORY_SKIN_TONE_OPTIONS.map(option => {
        const isSelected = avatarBuild.skinToneId === option.id;
        const isUnlocked = isAvatarOptionUnlocked(option, playerStats);

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => isUnlocked && updateAvatarBuild('skinToneId', option.id)}
            disabled={!isUnlocked}
            className={`relative flex min-h-20 flex-col items-center justify-center rounded-md border p-2 text-center transition focus:outline-none focus:ring-2 focus:ring-fuchsia-300 ${
              isSelected
                ? 'border-fuchsia-300 bg-fuchsia-500/20 text-white shadow-[0_0_22px_rgba(217,70,239,0.22)]'
                : 'border-[#2c426e] bg-[#0c1830] text-gray-300 hover:border-fuchsia-300'
            } ${!isUnlocked ? 'cursor-not-allowed grayscale' : ''}`}
            aria-pressed={isSelected}
            aria-label={`${isUnlocked ? 'Choose' : 'Locked'} ${option.name}`}
          >
            {isSelected && (
              <span className="absolute right-1.5 top-1.5 rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                Set
              </span>
            )}
            <span
              className="h-12 w-12 rounded-md border-2 border-[#071126] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.12),0_4px_0_rgba(0,0,0,0.35)]"
              style={{ backgroundColor: option.color }}
              aria-hidden="true"
            />
            <span className="mt-1 text-xs font-bold leading-tight">{option.name}</span>
            <span className={`mt-1 rounded px-1.5 py-0.5 text-[9px] font-bold ${
              isUnlocked ? 'bg-cyan-400/20 text-cyan-100' : 'bg-gray-700 text-gray-300'
            }`}>
              {isUnlocked ? 'Available' : getOptionRequirement(option)}
            </span>
          </button>
        );
      })}
    </div>
  );

  const renderOptionGrid = () => (
    <div className="grid grid-cols-4 gap-1.5">
      {activeTab.options.map(option => {
        const isSelected = avatarBuild[activeTab.id] === option.id;
        const isUnlocked = isAvatarOptionUnlocked(option, playerStats);
        const previewImageUrls = getAvatarAssetPreviewImageUrls(avatarBuild, activeTab.id, option.id);

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => isUnlocked && updateAvatarBuild(activeTab.id, option.id)}
            disabled={!isUnlocked}
            className={`relative flex min-h-28 flex-col items-center justify-between rounded-md border p-2 text-center transition focus:outline-none focus:ring-2 focus:ring-fuchsia-300 ${
              isSelected
                ? 'border-fuchsia-300 bg-fuchsia-500/20 text-white shadow-[0_0_22px_rgba(217,70,239,0.22)]'
                : 'border-[#2c426e] bg-[#0c1830] text-gray-300 hover:border-fuchsia-300'
            } ${!isUnlocked ? 'cursor-not-allowed grayscale' : ''}`}
            aria-pressed={isSelected}
            aria-label={`${isUnlocked ? 'Choose' : 'Locked'} ${option.name}`}
          >
            {isSelected && (
              <span className="absolute right-1.5 top-1.5 rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                Set
              </span>
            )}
            <AvatarAssetPreview
              imageUrls={previewImageUrls}
              tabId={activeTab.id}
              label={option.name}
              className="h-20 w-20"
            />
            <span className="mt-1 text-xs font-bold leading-tight">{option.name}</span>
            <span className={`mt-1 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                  isUnlocked ? 'bg-cyan-400/20 text-cyan-100' : 'bg-gray-700 text-gray-300'
            }`}>
              {isUnlocked ? 'Available' : getOptionRequirement(option)}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <ArtQuestPage
      title="Inventory"
      subtitle="Your items, avatar and Art Energy."
      selectedAvatar={selectedAvatar}
      playerStats={playerStats}
      onReturnToMap={onReturnToMap}
      className="lg:h-screen lg:overflow-hidden"
      contentClassName="grid min-h-0 gap-3 xl:grid-cols-[280px_minmax(0,1fr)_320px] xl:overflow-hidden"
      footerText=""
    >
      <aside className="xl:min-h-0">
        <ArtQuestPanel className="p-3 xl:h-full xl:min-h-0">
          <ArtQuestSectionTitle>Your Traits</ArtQuestSectionTitle>
          <div className="space-y-2">
            {TRAIT_ORDER.map(traitName => renderTraitCard(playerStats.traits[traitName]))}
          </div>
          <ArtQuestPanel as="div" variant="inner" className="mt-3 p-2.5">
            <p className="font-serif text-xs font-black uppercase text-[#ffd45f]">Next Unlock</p>
            <p className="mt-1 text-xs leading-relaxed text-[#f4dfc1]">
              {nextReward
                ? `${nextReward.assetName} unlocks at ${nextReward.level} ${nextReward.traitName}.`
                : 'All avatar rewards are unlocked.'}
            </p>
          </ArtQuestPanel>
        </ArtQuestPanel>
      </aside>

      <ArtQuestPanel className="min-w-0 p-3 xl:min-h-0 xl:overflow-hidden">
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <ArtQuestSectionTitle className="mb-1">Avatar Editor</ArtQuestSectionTitle>
            <p className="text-sm text-[#f4dfc1]">Customise your artist and equip live rewards.</p>
            {saveMessage && (
              <p className="mt-1 text-xs font-bold text-emerald-200">{saveMessage}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <ArtQuestButton type="button" variant="primary" size="sm" onClick={handleSaveAvatar}>
              Save Avatar
            </ArtQuestButton>
            <ArtQuestButton type="button" variant="ghost" size="sm" onClick={randomizeAvatarBuild}>
              Randomize
            </ArtQuestButton>
            <ArtQuestButton type="button" variant="ghost" size="sm" onClick={resetAvatarBuild}>
              Reset
            </ArtQuestButton>
          </div>
        </div>

        <div className="grid min-h-0 gap-3 xl:grid-cols-[220px_minmax(0,1fr)]">
          <div className="min-w-0">
            <div className="relative h-[330px] overflow-hidden rounded-md border border-[#9a6328]/75 bg-[#15203a] shadow-[inset_0_0_45px_rgba(0,0,0,0.55)] xl:h-[350px]">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:42px_42px]" aria-hidden="true" />
              <div className="absolute inset-x-0 top-0 h-[62%] bg-[linear-gradient(180deg,#2b3147_0%,#1a2134_55%,#111827_100%)]" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 h-[46%] bg-[linear-gradient(180deg,rgba(96,54,31,0.9),rgba(44,28,24,0.98))]" aria-hidden="true" />
              <div className="absolute bottom-[22%] left-1/2 h-20 w-40 -translate-x-1/2 rounded-[50%] border border-fuchsia-300/30 bg-[radial-gradient(circle,rgba(217,70,239,0.28),rgba(15,23,42,0.18)_66%,transparent_67%)]" aria-hidden="true" />
              <div className="absolute left-8 top-16 h-28 w-3 rounded-sm bg-[#5a3925] shadow-[0_0_0_2px_rgba(0,0,0,0.35)]" aria-hidden="true">
                <span className="absolute -left-3 -top-6 h-10 w-9 rounded-full bg-amber-300/90 blur-[1px] shadow-[0_0_26px_rgba(251,191,36,0.82)]" />
              </div>
              <div className="absolute right-8 top-16 h-28 w-3 rounded-sm bg-[#5a3925] shadow-[0_0_0_2px_rgba(0,0,0,0.35)]" aria-hidden="true">
                <span className="absolute -left-3 -top-6 h-10 w-9 rounded-full bg-amber-300/90 blur-[1px] shadow-[0_0_26px_rgba(251,191,36,0.82)]" />
              </div>

              <div className="absolute inset-x-0 bottom-6 flex flex-col items-center">
                <AvatarLayeredPreview
                  imageUrls={avatarPreviewImageUrls}
                  alt={`${selectedAvatar.name} inventory avatar preview`}
                  className="h-56 w-40 drop-shadow-[0_18px_0_rgba(0,0,0,0.24)] xl:h-60 xl:w-[10.5rem]"
                />
                <div className="mt-2 max-w-[220px] text-center">
                  <p className="font-serif text-base font-black uppercase text-[#ffd45f]">{selectedAvatar.name}</p>
                  <p className="truncate text-sm font-bold text-[#f7d9ff]" title={selectedAvatar.title}>
                    {selectedAvatar.title}
                  </p>
                  {isEditingAvatarName ? (
                    <div className="mt-2 space-y-1.5">
                      <input
                        type="text"
                        value={avatarNameDraft}
                        onChange={(event) => setAvatarNameDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') handleSaveAvatarName();
                          if (event.key === 'Escape') handleCancelEditingAvatarName();
                        }}
                        maxLength={32}
                        className="h-8 w-full rounded-md border border-[#dba44a]/70 bg-[#071226] px-2 text-center text-sm font-bold text-white outline-none focus:ring-2 focus:ring-fuchsia-300"
                        aria-label="Edit avatar name"
                      />
                      <div className="flex justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleSaveAvatarName}
                          className="min-h-7 rounded-md border border-emerald-300/70 bg-emerald-700/80 px-2 text-[10px] font-black uppercase text-white shadow-[0_2px_0_rgba(0,0,0,0.35)] transition hover:brightness-115 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditingAvatarName}
                          className="min-h-7 rounded-md border border-[#9a6328]/70 bg-[#08162e]/85 px-2 text-[10px] font-black uppercase text-[#ffe8ad] shadow-[0_2px_0_rgba(0,0,0,0.35)] transition hover:border-[#f2c15c] hover:bg-[#102245] focus:outline-none focus:ring-2 focus:ring-[#ffd978]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartEditingAvatarName}
                      className="mt-2 min-h-7 rounded-md border border-[#9a6328]/70 bg-[#08162e]/85 px-3 text-[10px] font-black uppercase text-[#ffe8ad] shadow-[0_2px_0_rgba(0,0,0,0.35)] transition hover:border-[#f2c15c] hover:bg-[#102245] focus:outline-none focus:ring-2 focus:ring-[#ffd978]"
                    >
                      Edit Name
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-2 grid grid-cols-2 gap-1.5 sm:grid-cols-5" role="tablist" aria-label="Inventory avatar editor parts">
              {AVATAR_REWARD_BUILDER_TABS.map((tab, index) => {
                const isActive = tab.id === activeTab.id;
                const selectedOption = getAvatarRewardOptionById(tab.options, avatarBuild[tab.id]);

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`inventory-avatar-tab-${tab.id}`}
                    id={`inventory-avatar-tab-button-${tab.id}`}
                    onClick={() => setActiveTabId(tab.id)}
                    className={artQuestCx(
                      'rounded-md border p-1.5 text-center transition focus:outline-none focus:ring-2 focus:ring-fuchsia-300',
                      isActive
                        ? 'border-fuchsia-300 bg-fuchsia-500/20 text-white shadow-[0_0_22px_rgba(217,70,239,0.22)]'
                        : 'border-[#7f5524]/70 bg-[#0b1830] text-[#e8d7bc] hover:border-fuchsia-300',
                    )}
                  >
                    <span className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-md border border-[#9a6328]/50 bg-[#071126]">
                      {renderAssetTabPreview(tab.id)}
                    </span>
                    <span className="block text-xs font-black leading-tight">Part {index + 1}</span>
                    <span className="block truncate text-[11px] font-semibold text-[#d9c7a8]" title={selectedOption.name}>
                      {tab.shortLabel} - {selectedOption.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <ArtQuestPanel
              as="div"
              variant="inner"
              id={`inventory-avatar-tab-${activeTab.id}`}
              role="tabpanel"
              aria-labelledby={`inventory-avatar-tab-button-${activeTab.id}`}
              className="max-h-[330px] overflow-y-auto p-3 narrative-scrollbar xl:max-h-[360px]"
            >
              <div className="mb-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-cyan-200">
                    Part {activeTabIndex + 1} of {AVATAR_REWARD_BUILDER_TABS.length}
                  </p>
                  <h3 className="font-serif text-xl font-black text-[#f7c2ff]">{activeTab.label}</h3>
                </div>
                <p className="text-right text-sm text-[#f4dfc1]">
                  Selected: <span className="font-bold text-white">{selectedActiveOption.name}</span>
                </p>
              </div>

              {activeTab.id === 'skinToneId' ? renderSkinToneOptionGrid() : activeTab.id === 'hairStyleId' ? renderHairOptionGrid() : renderOptionGrid()}
            </ArtQuestPanel>
          </div>
        </div>
      </ArtQuestPanel>

      <aside className="xl:min-h-0">
        <ArtQuestPanel className="p-3 xl:h-full xl:min-h-0">
          <ArtQuestSectionTitle>Art Energy & Rewards</ArtQuestSectionTitle>
          <div className="flex items-center gap-3">
            <ArtQuestIconTile icon="XP" selected className="min-h-14 w-14 shrink-0 font-serif font-black" />
            <div className="min-w-0 flex-1">
              <p className="font-serif text-base font-black text-white">
                {playerStats.artEnergy.currentXP} / {playerStats.artEnergy.maxXp} XP
              </p>
              <ArtQuestProgressBar
                current={playerStats.artEnergy.currentXP}
                max={playerStats.artEnergy.maxXp}
                variant="purple"
                ariaLabel="Reward progress"
              />
            </div>
          </div>

          <div className="mt-3">
            <div className="relative h-16">
              <div className="absolute left-3 right-3 top-7 h-1 rounded-full bg-orange-500/70" aria-hidden="true" />
              <div className="grid grid-cols-4 gap-2">
                {energyMilestones.map((milestone, index) => (
                  <div key={milestone.xp} className="relative text-center">
                    <div
                      className={artQuestCx(
                        'mx-auto flex h-9 w-11 items-center justify-center rounded-md border font-serif text-xs font-black shadow-[0_6px_0_rgba(0,0,0,0.28)]',
                        milestone.isUnlocked
                          ? 'border-fuchsia-300/70 bg-gradient-to-b from-purple-500 to-purple-950 text-white shadow-[0_0_18px_rgba(217,70,239,0.32),0_6px_0_rgba(0,0,0,0.28)]'
                          : 'border-slate-400/50 bg-gradient-to-b from-slate-300 to-slate-700 text-slate-950',
                      )}
                      aria-label={`${milestone.xp} XP reward ${milestone.isUnlocked ? 'unlocked' : 'locked'}`}
                    >
                      {index + 1}
                    </div>
                    <span className="mx-auto mt-1 block h-2 w-2 rotate-45 bg-orange-400" aria-hidden="true" />
                    <p className="mt-0.5 text-[10px] font-bold leading-tight text-white">{milestone.xp}<br />XP</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <ArtQuestPanel as="div" variant="inner" className="mt-3 overflow-hidden p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-serif text-base font-black text-[#ffd45f]">Next Reward</p>
                {nextReward ? (
                  <>
                    <p className="mt-1 text-sm leading-relaxed text-[#f4dfc1]">
                      {nextReward.assetCategoryLabel}: <span className="font-bold text-white">{nextReward.assetName}</span>
                    </p>
                    <p className="mt-1 text-xs text-[#cbb89b]">
                      Unlock at {nextReward.level} {nextReward.traitName}.
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-[#f4dfc1]">
                    All avatar rewards are unlocked.
                  </p>
                )}
                {nextEnergyMilestone && (
                  <p className="mt-2 text-xs text-amber-200">
                    Next energy chest: {nextEnergyMilestone.xp} XP.
                  </p>
                )}
              </div>
              <span className="hidden h-12 w-12 shrink-0 rotate-45 border border-fuchsia-200/50 bg-gradient-to-br from-fuchsia-300 via-purple-500 to-purple-950 shadow-[0_0_28px_rgba(217,70,239,0.42)] sm:block" aria-hidden="true" />
            </div>
          </ArtQuestPanel>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <ArtQuestPanel as="div" variant="inner" className="p-2 text-center">
              <p className="font-serif text-2xl font-black text-[#eaffff]">{unlockedRewards.length}</p>
              <p className="mt-0.5 text-[10px] font-black uppercase leading-tight text-[#d8c29a]">Rewards Unlocked</p>
            </ArtQuestPanel>
            <ArtQuestPanel as="div" variant="inner" className="p-2 text-center">
              <p className="font-serif text-2xl font-black text-[#f7c2ff]">{unlockedAssetCount}</p>
              <p className="mt-0.5 text-[10px] font-black uppercase leading-tight text-[#d8c29a]">Avatar Options</p>
            </ArtQuestPanel>
          </div>
        </ArtQuestPanel>
      </aside>
    </ArtQuestPage>
  );
};

export default InventoryScreen;
