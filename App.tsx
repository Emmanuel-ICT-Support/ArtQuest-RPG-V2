
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import SplashScreen from './components/SplashScreen';
import ReturnToGameScreen from './components/ReturnToGameScreen';
import NewGameSetupScreen from './components/StartScreen'; // Renamed from StartScreen, actual file is StartScreen.tsx
import { MapScreen } from './components/MapScreen';
import MainGame from './MainGame';
import JournalScreen from './components/JournalScreen';
import InventoryScreen from './components/InventoryScreen';
import GameGuideScreen from './components/GameGuideScreen';
import AssessmentScreen from './components/AssessmentScreen';
import GalleryLoadingScreen, { GalleryLoadingTone } from './components/GalleryLoadingScreen';
import Modal from './components/Modal';
import { GameMusicTrack, useGameAudio } from './components/useGameAudio';
import { PlayerAvatar, WingState, AppGameState, NarrativeEntry, GameScreen, GalleryScene, JournalEntry, YearLevel, SeniorCoursePathway, PlayerStats, TraitName, TraitLevel, SaveGameData, CoreSavedGameState, SideQuestReward } from './types';
import { WING_DEFINITIONS, INITIAL_WING_ID, SAVE_FILE_VERSION } from './constants';
import { initializeChat as initializeAiChat } from './services/aiService';
import { getAvatarBuildForAvatar, getAvatarLayerImageUrls, getAvatarSpriteUrl, getNewlyUnlockedRewardMilestones } from './data/AvatarRewards';
import { getArtworkBrief } from './data/ArtworkLibrary';
import { getVisualLanguageGuideForWing } from './data/VisualLanguageGuide';
import { SIDE_QUEST_CASES_BY_ID, createInitialSideQuestState, normalizeSideQuestState } from './data/SideQuests';
import { PreloadAsset, preloadAssets, waitForMinimum, warmAssets } from './utils/assetPreloader';

const TEACHER_UNLOCK_CODE = '0554';
const TEACHER_AVATAR_IMAGE_URL = './public/images/Teacher.png';
type GuideReturnTarget = 'splash' | 'map' | 'returnMenu';
type ReturnMenuTarget = 'map' | 'game';
type PanelScreen = Extract<GameScreen, 'guide' | 'journal' | 'inventory' | 'assessment'>;

interface LoadTransitionState {
  title: string;
  message: string;
  detail?: string;
  tone: GalleryLoadingTone;
  compact?: boolean;
  minimumMs?: number;
}

const MAP_BACKGROUND_IMAGES = {
  foyer: './public/images/backgrounds/foyer.png',
  galleries: [
    './public/images/backgrounds/gallery-1.png',
    './public/images/backgrounds/gallery-2.png',
    './public/images/backgrounds/gallery-3.png',
    './public/images/backgrounds/gallery-4.png',
  ],
};

const MAP_CHARACTER_IMAGE_ASSETS = [
  './public/images/npcs/gallery-guide.png',
  './public/images/npcs/gallery-guard.png',
  './public/images/npcs/pip.png',
];

const CORE_AUDIO_ASSETS = [
  './public/audio/main-game-exploration.mp3',
  './public/audio/door-opening.m4a',
  './public/audio/page-turn.mp3',
];

const PANEL_IMAGE_ASSETS: Record<PanelScreen, string[]> = {
  guide: [
    './public/images/screens/guide/guidebook-preview.png',
    './public/images/screens/guide/quick-start.png',
    './public/images/screens/guide/map-basics.png',
  ],
  journal: [
    './public/images/screens/journal-blank-plate.png',
    './public/images/screens/journal-page-turns/book-rest.png',
    './public/images/screens/journal-page-turns/frame-01.png',
  ],
  inventory: [
    './public/images/screens/build-avatar-screen-v2.png',
  ],
  assessment: [],
};

const imageAsset = (src: string | null | undefined): PreloadAsset => ({ type: 'image', src });
const audioAsset = (src: string | null | undefined): PreloadAsset => ({ type: 'audio', src });

const getGallerySceneName = (scene: GalleryScene): string => {
  if (scene === 'foyer') return 'Foyer';
  return `Gallery ${scene + 1}`;
};

const getWingDisplayName = (wingId: string): string => {
  const wing = WING_DEFINITIONS.find((item) => item.id === wingId);
  return wing?.name.replace(/^[^\p{L}\p{N}]+/u, '').trim() || 'Analysis Room';
};

const getAvatarPreloadAssets = (avatar?: PlayerAvatar | null): PreloadAsset[] => {
  if (!avatar) return [];

  const avatarBuild = avatar.avatarBuild || getAvatarBuildForAvatar(avatar);
  const avatarSprite = getAvatarSpriteUrl({ ...avatar, avatarBuild }) || avatar.imageUrl;
  const layerImages = avatar.id === 'custom' && avatarBuild
    ? getAvatarLayerImageUrls(avatarBuild)
    : [];

  return [
    imageAsset(avatarSprite),
    ...layerImages.map(imageAsset),
  ];
};

const getMapSceneBackground = (scene: GalleryScene): string => (
  scene === 'foyer'
    ? MAP_BACKGROUND_IMAGES.foyer
    : MAP_BACKGROUND_IMAGES.galleries[scene] || MAP_BACKGROUND_IMAGES.galleries[0]
);

const getGalleryWingIds = (scene: GalleryScene): string[] => {
  if (scene === 'foyer') return WING_DEFINITIONS.slice(0, 3).map((wing) => wing.id);
  const startIndex = scene * 3;
  return WING_DEFINITIONS.slice(startIndex, startIndex + 3).map((wing) => wing.id);
};

const getMapScenePreloadAssets = (scene: GalleryScene, avatar?: PlayerAvatar | null): PreloadAsset[] => [
  imageAsset(getMapSceneBackground(scene)),
  ...MAP_CHARACTER_IMAGE_ASSETS.map(imageAsset),
  ...getAvatarPreloadAssets(avatar),
];

const getAdjacentMapScenePreloadAssets = (scene: GalleryScene, avatar?: PlayerAvatar | null): PreloadAsset[] => {
  const adjacentScenes: GalleryScene[] = scene === 'foyer'
    ? [0]
    : [
        scene > 0 ? scene - 1 : 'foyer',
        ...(scene < MAP_BACKGROUND_IMAGES.galleries.length - 1 ? [(scene + 1) as GalleryScene] : []),
      ];

  return adjacentScenes.flatMap((adjacentScene) => getMapScenePreloadAssets(adjacentScene, avatar));
};

const getAnalysisRoomPreloadAssets = (wingId: string, avatar?: PlayerAvatar | null): PreloadAsset[] => {
  const yearLevel = avatar?.selectedYearLevel || 9;
  const artworkBrief = getArtworkBrief(wingId, yearLevel);
  const visualGuide = getVisualLanguageGuideForWing(
    wingId,
    yearLevel,
    avatar?.selectedCoursePathway,
  );

  return [
    imageAsset(artworkBrief.assetPath),
    imageAsset(visualGuide.help.practiceImageSrc),
    imageAsset('./public/images/npcs/gallery-guide.png'),
    ...getAvatarPreloadAssets(avatar),
  ];
};

const getCurrentGalleryAnalysisPreloadAssets = (
  scene: GalleryScene,
  avatar?: PlayerAvatar | null,
): PreloadAsset[] => (
  getGalleryWingIds(scene).flatMap((wingId) => getAnalysisRoomPreloadAssets(wingId, avatar))
);

const getPanelPreloadAssets = (screen: PanelScreen, avatar?: PlayerAvatar | null): PreloadAsset[] => [
  ...PANEL_IMAGE_ASSETS[screen].map(imageAsset),
  ...getAvatarPreloadAssets(avatar),
];

const getPanelTransition = (screen: PanelScreen): LoadTransitionState => {
  const labels: Record<PanelScreen, string> = {
    guide: 'Opening the Guide',
    journal: 'Opening the Journal',
    inventory: 'Opening the Inventory',
    assessment: 'Opening Assessment',
  };

  const messages: Record<PanelScreen, string> = {
    guide: 'Dusting off the guidebook pages.',
    journal: 'Finding your latest gallery notes.',
    inventory: 'Arranging your earned artist gear.',
    assessment: 'Lining up your evidence and reflections.',
  };

  return {
    title: labels[screen],
    message: messages[screen],
    detail: 'This is a quick panel load, not a full room change.',
    tone: 'panel',
    compact: true,
    minimumMs: 280,
  };
};

const getSceneTransition = (nextScene: GalleryScene, fromScene: GalleryScene): LoadTransitionState => ({
  title: `Entering ${getGallerySceneName(nextScene)}`,
  message: nextScene === 'foyer'
    ? 'Rolling the gallery map back to the foyer.'
    : 'Lighting the next hall and checking the door glyphs.',
  detail: `${getGallerySceneName(fromScene)} -> ${getGallerySceneName(nextScene)}`,
  tone: nextScene === 'foyer' ? 'foyer' : 'gallery',
  minimumMs: 520,
});

const getAnalysisTransition = (wingId: string): LoadTransitionState => ({
  title: `Entering ${getWingDisplayName(wingId)}`,
  message: 'Framing the artwork and waking the Curator.',
  detail: 'Artwork, guide terms, and avatar assets are being prepared.',
  tone: 'analysis',
  minimumMs: 650,
});

const getReturnTransition = (scene: GalleryScene): LoadTransitionState => ({
  title: `Returning to ${getGallerySceneName(scene)}`,
  message: 'Packing the analysis notes and reopening the gallery floor.',
  detail: 'Your progress stays cached for the next room.',
  tone: 'return',
  minimumMs: 480,
});

const initialWingsState = (): Record<string, WingState> => {
  const wings: Record<string, WingState> = {};
  WING_DEFINITIONS.forEach(wing => {
    wings[wing.id] = {
      isSolved: false,
      isUnlocked: wing.id === INITIAL_WING_ID,
      currentQuestionLevel: 1,
      phaseResponses: {},
      entryChallengeCompleted: false,
    };
  });
  return wings;
};

const teacherUnlockedWingsState = (): Record<string, WingState> => {
  const wings: Record<string, WingState> = {};
  WING_DEFINITIONS.forEach(wing => {
    wings[wing.id] = {
      isSolved: false,
      isUnlocked: true,
      currentQuestionLevel: 1,
      phaseResponses: {},
      entryChallengeCompleted: true,
    };
  });
  return wings;
};

const isWingEffectivelyUnlocked = (wings: Record<string, WingState>, wingId: string): boolean => {
  const wingState = wings[wingId];
  if (!wingState) return false;
  if (wingState.isUnlocked || wingState.isSolved || wingId === INITIAL_WING_ID) return true;
  return WING_DEFINITIONS.some((wing) => wing.unlocks === wingId && !!wings[wing.id]?.isSolved);
};

const normalizeUnlockedWings = (wings: Record<string, WingState>): Record<string, WingState> => {
  const normalized: Record<string, WingState> = {};

  WING_DEFINITIONS.forEach((wing) => {
    const savedWing = wings[wing.id];

    normalized[wing.id] = {
      ...savedWing,
      isSolved: savedWing?.isSolved ?? false,
      isUnlocked: savedWing?.isUnlocked ?? wing.id === INITIAL_WING_ID,
      currentQuestionLevel: savedWing?.currentQuestionLevel ?? 1,
      phaseResponses: savedWing?.phaseResponses ?? {},
      entryChallengeCompleted: savedWing?.entryChallengeCompleted ?? false,
    };

    if (normalized[wing.id].isSolved) {
      normalized[wing.id].entryChallengeCompleted = true;
    }
  });

  WING_DEFINITIONS.forEach((wing) => {
    if (isWingEffectivelyUnlocked(normalized, wing.id)) {
      normalized[wing.id] = {
        ...normalized[wing.id],
        isUnlocked: true,
      };
    }
  });

  return normalized;
};

const teacherAvatar: PlayerAvatar = {
  id: 'teacher-preview',
  name: 'Teacher',
  title: 'Gallery Preview Mode',
  description: 'All levels and rooms are unlocked for teacher review.',
  iconInitial: 'T',
  imageUrl: TEACHER_AVATAR_IMAGE_URL,
  colorClass: 'bg-indigo-600',
  selectedYearLevel: 9 as YearLevel,
};

const ART_ENERGY_MAX_XP = WING_DEFINITIONS.length * 50;
const TRAIT_LEVEL_ORDER: TraitLevel[] = ['Locked', 'Bronze', 'Silver', 'Gold'];

const initialPlayerStats: PlayerStats = {
  artEnergy: { currentXP: 0, maxXp: ART_ENERGY_MAX_XP },
  traits: {
    Focus: { name: 'Focus', icon: '🎯', description: 'Precision in responses, addressing prompts directly.', level: 'Locked', currentXP: 0, xpToNextLevel: 12 },
    Expression: { name: 'Expression', icon: '✍️', description: 'Use of creative or emotive language.', level: 'Locked', currentXP: 0, xpToNextLevel: 12 },
    Insight: { name: 'Insight', icon: '🧠', description: 'Depth of understanding of art concepts.', level: 'Locked', currentXP: 0, xpToNextLevel: 12 },
    Imagination: { name: 'Imagination', icon: '🎨', description: 'Originality and personal interpretation.', level: 'Locked', currentXP: 0, xpToNextLevel: 12 },
  }
};

const createInitialPlayerStats = (): PlayerStats => JSON.parse(JSON.stringify(initialPlayerStats));

const normalizeSelectedAvatar = (avatar: PlayerAvatar): PlayerAvatar => {
  if (avatar.id === teacherAvatar.id) {
    return {
      ...avatar,
      name: teacherAvatar.name,
      title: teacherAvatar.title,
      description: teacherAvatar.description,
      iconInitial: teacherAvatar.iconInitial,
      imageUrl: TEACHER_AVATAR_IMAGE_URL,
      colorClass: teacherAvatar.colorClass,
    };
  }

  const avatarBuild = avatar.avatarBuild || getAvatarBuildForAvatar(avatar);
  const imageUrl = getAvatarSpriteUrl({ ...avatar, avatarBuild }) || avatar.imageUrl;

  return {
    ...avatar,
    imageUrl,
    avatarArchetypeId: avatar.avatarArchetypeId || avatarBuild.archetypeId,
    avatarBuild,
  };
};

const normalizePlayerStats = (stats?: PlayerStats | null): PlayerStats => {
  const normalized = createInitialPlayerStats();
  if (!stats) return normalized;

  normalized.artEnergy.currentXP = Math.max(0, Math.min(stats.artEnergy?.currentXP ?? 0, ART_ENERGY_MAX_XP));
  normalized.artEnergy.maxXp = ART_ENERGY_MAX_XP;

  (Object.keys(normalized.traits) as TraitName[]).forEach(traitName => {
    const savedTrait = stats.traits?.[traitName];
    if (!savedTrait) return;

    normalized.traits[traitName] = {
      ...normalized.traits[traitName],
      ...savedTrait,
      name: traitName,
      xpToNextLevel: normalized.traits[traitName].xpToNextLevel,
      currentXP: Math.max(0, savedTrait.currentXP || 0),
    };
  });

  if (normalized.artEnergy.currentXP === 0) {
    (Object.keys(normalized.traits) as TraitName[]).forEach(traitName => {
      const trait = normalized.traits[traitName];
      if (trait.level === 'Bronze' && trait.currentXP === 0) {
        trait.level = 'Locked';
      }
    });
  }

  return normalized;
};

const buildRewardEntriesForStatsChange = (
  previousStats: PlayerStats,
  nextStats: PlayerStats,
): NarrativeEntry[] => {
  const unlockedRewards = getNewlyUnlockedRewardMilestones(previousStats, nextStats);

  return unlockedRewards.map((reward, index) => ({
    speaker: 'system',
    text: `Badge unlocked: ${reward.badgeName}. New avatar ${reward.assetCategoryLabel.toLowerCase()}: ${reward.assetName}.`,
    id: `${Date.now()}-reward-${index}`,
    timestamp: Date.now(),
  }));
};

const applyTraitLevelUps = (stats: PlayerStats): PlayerStats => {
  const normalizedStats = normalizePlayerStats(stats);
  const updatedTraits = { ...normalizedStats.traits };

  (Object.keys(updatedTraits) as TraitName[]).forEach(traitName => {
    const trait = updatedTraits[traitName];
    while (trait.level !== 'Gold' && trait.currentXP >= trait.xpToNextLevel) {
      trait.currentXP -= trait.xpToNextLevel;
      const currentLevelIndex = TRAIT_LEVEL_ORDER.indexOf(trait.level);
      trait.level = TRAIT_LEVEL_ORDER[Math.min(currentLevelIndex + 1, TRAIT_LEVEL_ORDER.length - 1)];
    }
    if (trait.level === 'Gold') {
      trait.currentXP = trait.xpToNextLevel;
    }
  });

  return { ...normalizedStats, traits: updatedTraits };
};

const addSideQuestRewardToStats = (stats: PlayerStats, reward: SideQuestReward): PlayerStats => {
  const nextStats = normalizePlayerStats(JSON.parse(JSON.stringify(stats)));
  const availableEnergy = Math.max(0, nextStats.artEnergy.maxXp - nextStats.artEnergy.currentXP);
  nextStats.artEnergy.currentXP += Math.min(reward.artEnergy, availableEnergy);

  (Object.entries(reward.traits) as [TraitName, number][])
    .filter(([, amount]) => amount > 0)
    .forEach(([traitName, amount]) => {
      const trait = nextStats.traits[traitName];
      if (!trait || trait.level === 'Gold') return;
      trait.currentXP += amount;
    });

  return nextStats;
};

const formatSideQuestRewardSummary = (reward: SideQuestReward): string => {
  const traitParts = (Object.entries(reward.traits) as [TraitName, number][])
    .filter(([, amount]) => amount > 0)
    .map(([traitName, amount]) => `${traitName} +${amount}`);

  return [`Art Energy +${reward.artEnergy}`, ...traitParts, `Badge: ${reward.badge}`].join(', ');
};

const initialAppGameState: AppGameState = {
    wings: initialWingsState(),
    narrativeLog: [],
    geminiChat: null,
    isLoading: false,
    isGeneratingWingArt: false,
    error: null,
    gameOver: false,
    gameWon: false,
    teacherMode: false,
    selectedAvatar: undefined,
    currentWingIdForGame: null,
    learningJournal: [],
    playerStats: null,
    avatarImageUrl: null,
    isGeneratingAvatarPortrait: false,
    avatarImageError: null,
    focusedWingIdForJournal: null,
    sideQuestState: createInitialSideQuestState(),
};


export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<GameScreen>('splash');
  const [currentGalleryScene, setCurrentGalleryScene] = useState<GalleryScene>('foyer');
  const [appGameState, setAppGameState] = useState<AppGameState>({...initialAppGameState});
  const [guideReturnTarget, setGuideReturnTarget] = useState<GuideReturnTarget>('map');
  const [returnMenuTarget, setReturnMenuTarget] = useState<ReturnMenuTarget>('map');
  const [pendingReturnMenuTarget, setPendingReturnMenuTarget] = useState<ReturnMenuTarget | null>(null);
  const [loadTransition, setLoadTransition] = useState<LoadTransitionState | null>(null);
  const loadTransitionIdRef = useRef<number>(0);
  const hasSaveableGame = !!appGameState.selectedAvatar && !!appGameState.playerStats;

  const runLoadTransition = useCallback(async (
    transition: LoadTransitionState,
    work: () => Promise<void> | void,
  ) => {
    const transitionId = loadTransitionIdRef.current + 1;
    loadTransitionIdRef.current = transitionId;
    setLoadTransition(transition);
    const startedAt = Date.now();

    try {
      await waitForMinimum(50);
      await work();
      const remainingMinimumMs = (transition.minimumMs ?? 420) - (Date.now() - startedAt);
      if (remainingMinimumMs > 0) {
        await waitForMinimum(remainingMinimumMs);
      }
    } finally {
      if (loadTransitionIdRef.current === transitionId) {
        setLoadTransition(null);
      }
    }
  }, []);

  const runPanelTransition = useCallback(async (screen: PanelScreen, commit: () => void) => {
    await runLoadTransition(getPanelTransition(screen), async () => {
      await preloadAssets(getPanelPreloadAssets(screen, appGameState.selectedAvatar), {
        timeoutMs: 1800,
      });
      commit();
    });
  }, [appGameState.selectedAvatar, runLoadTransition]);

  const runSceneTransition = useCallback(async (
    nextScene: GalleryScene,
    fromScene: GalleryScene,
    commitSceneChange: () => void,
  ) => {
    await runLoadTransition(getSceneTransition(nextScene, fromScene), async () => {
      await preloadAssets(
        [
          ...getMapScenePreloadAssets(nextScene, appGameState.selectedAvatar),
          ...getAdjacentMapScenePreloadAssets(nextScene, appGameState.selectedAvatar),
        ],
        { timeoutMs: 2400 },
      );
      commitSceneChange();
    });
  }, [appGameState.selectedAvatar, runLoadTransition]);

  useEffect(() => {
    if (currentScreen !== 'map') return;

    warmAssets([
      ...getMapScenePreloadAssets(currentGalleryScene, appGameState.selectedAvatar),
      ...getAdjacentMapScenePreloadAssets(currentGalleryScene, appGameState.selectedAvatar),
      ...getCurrentGalleryAnalysisPreloadAssets(currentGalleryScene, appGameState.selectedAvatar),
      ...CORE_AUDIO_ASSETS.map(audioAsset),
    ]);
  }, [appGameState.selectedAvatar, currentGalleryScene, currentScreen]);

  const handleNewGameSetupComplete = useCallback(async (avatar: PlayerAvatar) => {
    setCurrentGalleryScene('foyer');
    setAppGameState(() => ({
        ...initialAppGameState, // Reset to initial state for a new game
        selectedAvatar: avatar,
        avatarImageUrl: avatar.imageUrl || null,
        avatarImageError: null,
        isGeneratingAvatarPortrait: false,
        isLoading: true,
        teacherMode: false,
        playerStats: createInitialPlayerStats(),
        sideQuestState: createInitialSideQuestState(),
    }));

    try {
      await runLoadTransition({
        title: 'Opening the Foyer',
        message: `${avatar.name || 'Your artist'} is collecting a sketchbook and gallery key.`,
        detail: 'Foyer, first gallery, avatar, and exploration audio are being prepared.',
        tone: 'foyer',
        minimumMs: 720,
      }, async () => {
        const chat = initializeAiChat();
        await preloadAssets([
          ...getMapScenePreloadAssets('foyer', avatar),
          ...getAdjacentMapScenePreloadAssets('foyer', avatar),
          ...CORE_AUDIO_ASSETS.map(audioAsset),
        ], { timeoutMs: 3200 });

        setAppGameState(prev => ({
          ...prev,
          geminiChat: chat,
          isLoading: false,
        }));
        setCurrentScreen('map');
      });
    } catch (err) {
      console.error("Failed to initialize AI Chat for new game:", err);
      const errorMessage = (err instanceof Error) ? err.message : "An unknown error occurred";
      setAppGameState(prev => ({
          ...prev,
          error: `Failed to connect with the Curator. Please check API Key and refresh. Details: ${errorMessage}`,
          isLoading: false
      }));
       // Stay on newGameSetup or splash, but show error. User might need to refresh.
    }
  }, [runLoadTransition]);

  const handleNavigateToNewGameSetup = useCallback(() => {
    // Optionally confirm if a game is in progress and will be lost
    // For now, directly navigate, assuming StartScreen will handle confirmation or App will reset.
    setAppGameState(() => ({
      ...initialAppGameState,
      isLoading: false,
      error: null,
      sideQuestState: createInitialSideQuestState(),
    })); // Reset game state for a new game
    setCurrentGalleryScene('foyer');
    setCurrentScreen('newGameSetup');
  }, []);

  const handleTeacherUnlock = useCallback(async (code: string): Promise<boolean> => {
    if (code.trim() !== TEACHER_UNLOCK_CODE) {
      return false;
    }

    setCurrentGalleryScene('foyer');
    await runLoadTransition({
      title: 'Opening Teacher Preview',
      message: 'Unlocking every gallery room for a quick walkthrough.',
      detail: 'Foyer, gallery backgrounds, and preview avatar are being prepared.',
      tone: 'foyer',
      minimumMs: 620,
    }, async () => {
      const chat = initializeAiChat();
      await preloadAssets([
        ...getMapScenePreloadAssets('foyer', teacherAvatar),
        ...getAdjacentMapScenePreloadAssets('foyer', teacherAvatar),
        ...CORE_AUDIO_ASSETS.map(audioAsset),
      ], { timeoutMs: 2800 });

      setAppGameState(() => ({
        ...initialAppGameState,
        selectedAvatar: teacherAvatar,
        wings: teacherUnlockedWingsState(),
        geminiChat: chat,
        playerStats: createInitialPlayerStats(),
        sideQuestState: createInitialSideQuestState(),
        teacherMode: true,
        avatarImageUrl: teacherAvatar.imageUrl || null,
        isLoading: false,
        error: null,
      }));
      setCurrentScreen('map');
    });
    return true;
  }, [runLoadTransition]);

  const handleSaveGame = useCallback(() => {
    if (!appGameState.selectedAvatar || !appGameState.playerStats) {
      setAppGameState(prev => ({ ...prev, error: "Cannot save game: Essential player data is missing." }));
      return;
    }

    const coreGameState: CoreSavedGameState = {
      selectedAvatar: appGameState.selectedAvatar,
      wings: appGameState.wings,
      learningJournal: appGameState.learningJournal,
      playerStats: appGameState.playerStats,
      sideQuestState: normalizeSideQuestState(appGameState.sideQuestState),
      avatarImageUrl: appGameState.avatarImageUrl,
      gameWon: appGameState.gameWon,
      gameOver: appGameState.gameOver,
      teacherMode: appGameState.teacherMode,
    };

    const saveData: SaveGameData = {
      version: SAVE_FILE_VERSION,
      savedAt: new Date().toISOString(),
      gameState: coreGameState,
    };

    try {
      const jsonString = JSON.stringify(saveData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      const safeAvatarName = appGameState.selectedAvatar.name.replace(/[^a-zA-Z0-9_]/g, '_') || 'player';
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
      link.download = `ArtQuest_Save_${safeAvatarName}_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
      // Optionally, add a narrative entry or UI feedback for successful save
      appendNarrativeEntry({ speaker: 'system', text: 'Game progress saved successfully!' });

    } catch (err) {
      console.error("Failed to save game:", err);
      const errorMessage = (err instanceof Error) ? err.message : "An unknown error occurred during save.";
      setAppGameState(prev => ({ ...prev, error: `Save failed: ${errorMessage}` }));
    }
  }, [appGameState]);


  const handleLoadGame = useCallback(async (fileContent: string) => {
    setAppGameState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const parsedData = JSON.parse(fileContent) as SaveGameData;

      if (parsedData.version !== SAVE_FILE_VERSION) {
        throw new Error(`Save file version mismatch. Expected ${SAVE_FILE_VERSION}, got ${parsedData.version}. Load aborted.`);
      }
      if (!parsedData.gameState || !parsedData.gameState.selectedAvatar || !parsedData.gameState.playerStats) {
        throw new Error("Invalid save file structure: Essential game data missing.");
      }

      // Re-initialize AI chat
      const selectedAvatar = normalizeSelectedAvatar(parsedData.gameState.selectedAvatar);

      await runLoadTransition({
        title: 'Restoring the Foyer',
        message: `${selectedAvatar.name || 'Your artist'} is reopening the saved sketchbook.`,
        detail: 'Save data, foyer assets, and avatar layers are being prepared.',
        tone: 'foyer',
        minimumMs: 620,
      }, async () => {
        const chat = initializeAiChat();
        await preloadAssets([
          ...getMapScenePreloadAssets('foyer', selectedAvatar),
          ...getAdjacentMapScenePreloadAssets('foyer', selectedAvatar),
          ...CORE_AUDIO_ASSETS.map(audioAsset),
        ], { timeoutMs: 3000 });

        setAppGameState(prev => ({
          ...prev, // Keep some transient states like error handling
          ...parsedData.gameState, // Load core game state
          selectedAvatar,
          wings: normalizeUnlockedWings(parsedData.gameState.wings || {}),
          playerStats: normalizePlayerStats(parsedData.gameState.playerStats),
          sideQuestState: normalizeSideQuestState(parsedData.gameState.sideQuestState),
          teacherMode: !!parsedData.gameState.teacherMode,
          geminiChat: chat, // Set the new chat instance
          isLoading: false,
          currentWingIdForGame: null, // Always start on map after load
          narrativeLog: [], // Clear previous narrative log
          avatarImageError: null, // Clear any previous avatar image errors
          isGeneratingAvatarPortrait: false,
        }));
        setCurrentGalleryScene('foyer');
        setCurrentScreen('map');
      });
    } catch (err) {
      console.error("Failed to load game:", err);
      const errorMessage = (err instanceof Error) ? err.message : "An unknown error occurred during load.";
      setAppGameState(() => ({
        ...initialAppGameState, // Reset to a clean state on load failure
        isLoading: false,
        error: `Load failed: ${errorMessage}. Please try a valid save file or start a new game.`
      }));
      setCurrentGalleryScene('foyer');
      setCurrentScreen('splash'); // Return to splash on error
    }
  }, [runLoadTransition]);


  const handleSelectWing = useCallback(async (wingId: string) => {
    const currentWings = normalizeUnlockedWings(appGameState.wings);
    if (!isWingEffectivelyUnlocked(currentWings, wingId)) return;

    await runLoadTransition(getAnalysisTransition(wingId), async () => {
      await preloadAssets([
        ...getAnalysisRoomPreloadAssets(wingId, appGameState.selectedAvatar),
        ...CORE_AUDIO_ASSETS.map(audioAsset),
      ], { timeoutMs: 3200 });

      setAppGameState(prev => {
        const newWingsState = normalizeUnlockedWings(prev.wings);
        newWingsState[wingId] = {
          ...newWingsState[wingId],
          currentQuestionLevel: newWingsState[wingId]?.isSolved ? 4 : (newWingsState[wingId]?.currentQuestionLevel || 1),
          phaseResponses: newWingsState[wingId]?.phaseResponses || {},
          isSolved: newWingsState[wingId]?.isSolved || false, // Preserve solved state
        };
        return {
          ...prev,
          currentWingIdForGame: wingId,
          wings: newWingsState,
          narrativeLog: [],
        };
      });
      setCurrentScreen('game');
    });
  }, [appGameState.selectedAvatar, appGameState.wings, runLoadTransition]);

  const handleReturnToMap = useCallback(() => {
    setAppGameState(prev => ({ ...prev, currentWingIdForGame: null, focusedWingIdForJournal: null }));
    setCurrentScreen('map');
  }, []);

  const handleReturnFromGameToMap = useCallback(async () => {
    await runLoadTransition(getReturnTransition(currentGalleryScene), async () => {
      await preloadAssets([
        ...getMapScenePreloadAssets(currentGalleryScene, appGameState.selectedAvatar),
        ...getAdjacentMapScenePreloadAssets(currentGalleryScene, appGameState.selectedAvatar),
      ], { timeoutMs: 2400 });

      setAppGameState(prev => ({ ...prev, currentWingIdForGame: null, focusedWingIdForJournal: null }));
      setCurrentScreen('map');
    });
  }, [appGameState.selectedAvatar, currentGalleryScene, runLoadTransition]);

  const openReturnMenu = useCallback((target: ReturnMenuTarget) => {
    setReturnMenuTarget(target);
    setPendingReturnMenuTarget(null);
    setCurrentScreen('returnMenu');
  }, []);

  const handleRequestReturnMenu = useCallback((target: ReturnMenuTarget) => {
    if (!hasSaveableGame) {
      openReturnMenu(target);
      return;
    }

    setPendingReturnMenuTarget(target);
  }, [hasSaveableGame, openReturnMenu]);

  const handleRequestReturnMenuFromMap = useCallback(() => {
    handleRequestReturnMenu('map');
  }, [handleRequestReturnMenu]);

  const handleRequestReturnMenuFromGame = useCallback(() => {
    handleRequestReturnMenu('game');
  }, [handleRequestReturnMenu]);

  const handleCancelReturnMenuPrompt = useCallback(() => {
    setPendingReturnMenuTarget(null);
  }, []);

  const handleContinueToReturnMenuWithoutSaving = useCallback(() => {
    if (!pendingReturnMenuTarget) return;
    openReturnMenu(pendingReturnMenuTarget);
  }, [openReturnMenu, pendingReturnMenuTarget]);

  const handleSaveAndContinueToReturnMenu = useCallback(() => {
    if (!pendingReturnMenuTarget) return;
    handleSaveGame();
    openReturnMenu(pendingReturnMenuTarget);
  }, [handleSaveGame, openReturnMenu, pendingReturnMenuTarget]);

  const handleReturnToGameFromMenu = useCallback(() => {
    if (!appGameState.selectedAvatar) {
      setCurrentScreen('splash');
      return;
    }

    if (
      returnMenuTarget === 'game' &&
      appGameState.geminiChat &&
      appGameState.currentWingIdForGame &&
      appGameState.wings[appGameState.currentWingIdForGame]
    ) {
      setCurrentScreen('game');
      return;
    }

    handleReturnToMap();
  }, [
    appGameState.currentWingIdForGame,
    appGameState.geminiChat,
    appGameState.selectedAvatar,
    appGameState.wings,
    handleReturnToMap,
    returnMenuTarget,
  ]);

  const appendNarrativeEntry = useCallback((entry: Omit<NarrativeEntry, 'id' | 'timestamp'>) => {
    setAppGameState(prev => ({
      ...prev,
      narrativeLog: [...prev.narrativeLog, { ...entry, id: Date.now().toString() + Math.random(), timestamp: Date.now() }],
    }));
  }, []);

  const updateWingState = useCallback((wingId: string, updates: Partial<WingState>) => {
    setAppGameState(prev => {
      const updatedWings = {
        ...prev.wings,
        [wingId]: {
          ...prev.wings[wingId],
          ...updates,
        },
      };

      return {
        ...prev,
        wings: normalizeUnlockedWings(updatedWings),
      };
    });
  }, []);

  const handleCompleteEntryChallenge = useCallback((wingId: string) => {
    updateWingState(wingId, { entryChallengeCompleted: true });
  }, [updateWingState]);

  const unlockNextWing = useCallback((solvedWingId: string): string | null => {
    const solvedWingDef = WING_DEFINITIONS.find(w => w.id === solvedWingId);
    let unlockedWingId: string | null = null;
    if (solvedWingDef?.unlocks) {
      const nextWingId = solvedWingDef.unlocks;
      updateWingState(nextWingId, { isUnlocked: true });
      unlockedWingId = nextWingId;
    }
    return unlockedWingId;
  }, [updateWingState]);


  const handleGameWon = useCallback(() => {
    setAppGameState(prev => ({ ...prev, gameWon: true, gameOver: true }));
  }, []);

  const handleError = useCallback((message: string, error?: unknown) => {
    console.error(message, error);
    const narrativeError = `System Alert: ${message}`;
    setAppGameState(prev => {
      if (!prev.narrativeLog.some(entry => entry.text === narrativeError)) {
        return {
          ...prev,
          error: message, // Set app-level error for broader display
          narrativeLog: [...prev.narrativeLog, { text: narrativeError, speaker: 'system', id: Date.now().toString(), timestamp: Date.now() }]
        };
      }
      return { ...prev, error: message };
    });
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    setAppGameState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setIsGeneratingWingArt = useCallback((generating: boolean) => {
    setAppGameState(prev => ({ ...prev, isGeneratingWingArt: generating }));
  }, []);

  const setAvatarImageUrl = useCallback((url: string | null) => {
    setAppGameState(prev => ({ ...prev, avatarImageUrl: url }));
  }, []);
  const setIsGeneratingAvatarPortrait = useCallback((generating: boolean) => {
    setAppGameState(prev => ({ ...prev, isGeneratingAvatarPortrait: generating }));
  }, []);
  const setAvatarImageError = useCallback((error: string | null) => {
    setAppGameState(prev => ({ ...prev, avatarImageError: error }));
  }, []);

  const handleUpdatePlayerStats = useCallback((newStats: PlayerStats) => {
    setAppGameState(prev => {
      const previousStats = prev.playerStats ? normalizePlayerStats(prev.playerStats) : createInitialPlayerStats();
      const nextStats = applyTraitLevelUps(newStats);
      const rewardEntries = buildRewardEntriesForStatsChange(previousStats, nextStats);

      return {
        ...prev,
        playerStats: nextStats,
        narrativeLog: rewardEntries.length > 0
          ? [...prev.narrativeLog, ...rewardEntries]
          : prev.narrativeLog,
      };
    });
  }, []);

  const handleStartSideQuestCase = useCallback((caseId: string) => {
    if (!SIDE_QUEST_CASES_BY_ID[caseId]) return;

    setAppGameState(prev => {
      const normalizedSideQuestState = normalizeSideQuestState(prev.sideQuestState);
      const caseProgress = normalizedSideQuestState.cases[caseId];

      if (!caseProgress || caseProgress.status !== 'notStarted') {
        return { ...prev, sideQuestState: normalizedSideQuestState };
      }

      return {
        ...prev,
        sideQuestState: {
          ...normalizedSideQuestState,
          cases: {
            ...normalizedSideQuestState.cases,
            [caseId]: {
              ...caseProgress,
              status: 'active',
            },
          },
        },
      };
    });
  }, []);

  const handleCollectSideQuestClue = useCallback((caseId: string, clueId: string) => {
    const sideQuestCase = SIDE_QUEST_CASES_BY_ID[caseId];
    if (!sideQuestCase || !sideQuestCase.clues.some(clue => clue.id === clueId)) return;

    setAppGameState(prev => {
      const normalizedSideQuestState = normalizeSideQuestState(prev.sideQuestState);
      const caseProgress = normalizedSideQuestState.cases[caseId];

      if (!caseProgress || caseProgress.status === 'completed' || caseProgress.foundClueIds.includes(clueId)) {
        return { ...prev, sideQuestState: normalizedSideQuestState };
      }

      const foundClueIds = [...caseProgress.foundClueIds, clueId];
      const status = foundClueIds.length === sideQuestCase.clues.length
        ? 'readyToSolve'
        : caseProgress.status === 'notStarted'
          ? 'active'
          : caseProgress.status;

      return {
        ...prev,
        sideQuestState: {
          ...normalizedSideQuestState,
          cases: {
            ...normalizedSideQuestState.cases,
            [caseId]: {
              ...caseProgress,
              status,
              foundClueIds,
            },
          },
        },
      };
    });
  }, []);

  const handleCompleteSideQuestCase = useCallback((caseId: string) => {
    const sideQuestCase = SIDE_QUEST_CASES_BY_ID[caseId];
    if (!sideQuestCase) return;

    setAppGameState(prev => {
      const normalizedSideQuestState = normalizeSideQuestState(prev.sideQuestState);
      const caseProgress = normalizedSideQuestState.cases[caseId];
      const hasAllClues = sideQuestCase.clues.every(clue => caseProgress?.foundClueIds.includes(clue.id));

      if (!caseProgress || caseProgress.status === 'completed' || !hasAllClues) {
        return { ...prev, sideQuestState: normalizedSideQuestState };
      }

      const previousStats = prev.playerStats ? normalizePlayerStats(prev.playerStats) : createInitialPlayerStats();
      const rewardedStats = caseProgress.rewardAwarded
        ? previousStats
        : addSideQuestRewardToStats(previousStats, sideQuestCase.reward);
      const nextStats = applyTraitLevelUps(rewardedStats);
      const rewardEntries = caseProgress.rewardAwarded
        ? []
        : buildRewardEntriesForStatsChange(previousStats, nextStats);
      const completionEntry: NarrativeEntry = {
        speaker: 'system',
        text: `Case closed: ${sideQuestCase.title}. ${formatSideQuestRewardSummary(sideQuestCase.reward)}.`,
        id: `${Date.now()}-side-quest-${caseId}`,
        timestamp: Date.now(),
      };

      return {
        ...prev,
        playerStats: nextStats,
        sideQuestState: {
          ...normalizedSideQuestState,
          cases: {
            ...normalizedSideQuestState.cases,
            [caseId]: {
              ...caseProgress,
              status: 'completed',
              rewardAwarded: true,
              completedAt: new Date().toISOString(),
            },
          },
        },
        narrativeLog: [...prev.narrativeLog, completionEntry, ...rewardEntries],
      };
    });
  }, []);

  const handleFullResetAndGoToSplash = useCallback(() => {
    setAppGameState({
      ...initialAppGameState,
      sideQuestState: createInitialSideQuestState(),
    });
    setCurrentGalleryScene('foyer');
    setCurrentScreen('splash');
  }, []);


  const handleSaveJournalEntry = useCallback((entry: JournalEntry) => {
    setAppGameState(prev => ({
      ...prev,
      learningJournal: [...prev.learningJournal.filter(e => e.id !== entry.id), entry],
    }));
  }, []);

  const handleUpdateJournalEntry = useCallback((updatedEntry: JournalEntry) => {
    setAppGameState(prev => ({
      ...prev,
      learningJournal: prev.learningJournal.map(entry =>
        entry.id === updatedEntry.id ? updatedEntry : entry
      ),
    }));
  }, []);

  const handleNavigateToJournal = useCallback(async () => {
    await runPanelTransition('journal', () => {
      setAppGameState(prev => ({ ...prev, focusedWingIdForJournal: null }));
      setCurrentScreen('journal');
    });
  }, [runPanelTransition]);

  const handleNavigateToInventory = useCallback(async () => {
    await runPanelTransition('inventory', () => {
      setAppGameState(prev => ({ ...prev, focusedWingIdForJournal: null }));
      setCurrentScreen('inventory');
    });
  }, [runPanelTransition]);

  const handleNavigateToJournalEntry = useCallback(async (wingId: string) => {
    await runPanelTransition('journal', () => {
      setAppGameState(prev => ({ ...prev, focusedWingIdForJournal: wingId }));
      setCurrentScreen('journal');
    });
  }, [runPanelTransition]);

  const handleClearFocusedWingId = useCallback(() => {
    setAppGameState(prev => ({ ...prev, focusedWingIdForJournal: null }));
  }, []);

  const handleNavigateToGuide = useCallback(async () => {
    await runPanelTransition('guide', () => {
      setGuideReturnTarget('map');
      setCurrentScreen('guide');
    });
  }, [runPanelTransition]);

  const handleNavigateToGuideFromStart = useCallback(async () => {
    await runPanelTransition('guide', () => {
      setGuideReturnTarget('splash');
      setCurrentScreen('guide');
    });
  }, [runPanelTransition]);

  const handleNavigateToGuideFromReturnMenu = useCallback(async () => {
    await runPanelTransition('guide', () => {
      setGuideReturnTarget('returnMenu');
      setCurrentScreen('guide');
    });
  }, [runPanelTransition]);

  const handleReturnFromGuide = useCallback(() => {
    if (guideReturnTarget === 'splash') {
      setCurrentScreen('splash');
      return;
    }

    if (guideReturnTarget === 'returnMenu') {
      setCurrentScreen('returnMenu');
      return;
    }

    handleReturnToMap();
  }, [guideReturnTarget, handleReturnToMap]);

  const handleNavigateToAssessment = useCallback(async () => {
    await runPanelTransition('assessment', () => {
      setCurrentScreen('assessment');
    });
  }, [runPanelTransition]);

  const handleUpdateAvatar = useCallback((avatar: PlayerAvatar) => {
    setAppGameState(prev => ({
      ...prev,
      selectedAvatar: avatar,
      avatarImageUrl: avatar.imageUrl || null,
    }));
  }, []);

  const handleUpdateTeacherYearSelection = useCallback((yearLevel: YearLevel, coursePathway?: SeniorCoursePathway) => {
    setAppGameState(prev => {
      if (!prev.teacherMode || !prev.selectedAvatar) return prev;

      return {
        ...prev,
        selectedAvatar: {
          ...prev.selectedAvatar,
          selectedYearLevel: yearLevel,
          selectedCoursePathway: coursePathway,
        },
      };
    });
  }, []);

  const activeMusicTrack = useMemo<GameMusicTrack>(() => {
    if (currentScreen === 'splash' || currentScreen === 'newGameSetup' || currentScreen === 'returnMenu') {
      return 'start';
    }

    if (currentScreen === 'guide') {
      return guideReturnTarget === 'splash' || guideReturnTarget === 'returnMenu' ? 'start' : 'exploration';
    }

    if (currentScreen === 'map' || currentScreen === 'journal' || currentScreen === 'inventory' || currentScreen === 'assessment') {
      return 'exploration';
    }

    return null;
  }, [currentScreen, guideReturnTarget]);

  const {
    playWalkingTap,
    playPageTurn,
    playFastPageTurn,
    playPhaseCompletion,
    playRoomCompletion,
    playUnlockDoor,
    playDoorOpening,
    pauseActiveTrack,
    resumeActiveTrack,
  } = useGameAudio(activeMusicTrack);

  // Global loading for initial AI setup or critical errors
  if (appGameState.isLoading && !appGameState.geminiChat && currentScreen !== 'splash' && currentScreen !== 'newGameSetup') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-100 p-6" role="alert" aria-live="assertive">
        <h1 className="text-3xl font-bold text-pink-400 mb-4">ArtQuest</h1>
        <p className="text-xl text-purple-300 mb-6">
          {appGameState.error ? "Error Occurred" : "Connecting to the Curator..."}
        </p>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-400" aria-label="Loading"></div>
        {appGameState.error && <p className="text-red-400 mt-4">{appGameState.error}</p>}
         <button
          onClick={handleFullResetAndGoToSplash}
          className="mt-4 px-6 py-3 bg-purple-500 text-white font-semibold rounded-lg shadow-md hover:bg-purple-600 transition-colors"
        >
          Return to Main Menu
        </button>
      </div>
    );
  }

  // More robust error screen, especially if AI chat fails to initialize
  if (appGameState.error && (!appGameState.geminiChat || currentScreen === 'splash' || currentScreen === 'newGameSetup')) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-100 p-6" role="alert" aria-live="assertive">
        <h1 className="text-3xl font-bold text-pink-400 mb-4">ArtQuest Error</h1>
        <p className="text-xl text-red-300 mb-6">{appGameState.error}</p>
        <p className="text-sm text-yellow-300 mb-4">This might be due to API key issues or network problems. If this is a quota issue, please check your API plan and billing.</p>
        <button
          onClick={handleFullResetAndGoToSplash}
          className="mt-4 px-6 py-3 bg-purple-500 text-white font-semibold rounded-lg shadow-md hover:bg-purple-600 transition-colors"
        >
          Return to Main Menu & Reset
        </button>
      </div>
    );
  }

  let screenComponent;
  switch (currentScreen) {
    case 'splash':
      screenComponent = (
        <SplashScreen
          onNewGame={handleNavigateToNewGameSetup}
          onLoadGame={handleLoadGame}
          onTeacherUnlock={handleTeacherUnlock}
          onNavigateToGuide={handleNavigateToGuideFromStart}
        />
      );
      break;
    case 'returnMenu':
      screenComponent = (
        <ReturnToGameScreen
          onNewGame={handleNavigateToNewGameSetup}
          onLoadGame={handleLoadGame}
          onReturnToGame={handleReturnToGameFromMenu}
          onTeacherUnlock={handleTeacherUnlock}
          onNavigateToGuide={handleNavigateToGuideFromReturnMenu}
        />
      );
      break;
    case 'newGameSetup':
      screenComponent = (
        <NewGameSetupScreen
            onStartNewGameSetupComplete={handleNewGameSetupComplete}
        />
      );
      break;
    case 'map':
      screenComponent = (
        <MapScreen
          selectedAvatar={appGameState.selectedAvatar || null}
          playerStats={appGameState.playerStats}
          wingsState={appGameState.wings}
          currentGalleryScene={currentGalleryScene}
          onGallerySceneChange={setCurrentGalleryScene}
          onSceneTransition={runSceneTransition}
          onSelectWing={handleSelectWing}
          wingDefinitions={WING_DEFINITIONS}
          learningJournal={appGameState.learningJournal}
          sideQuestState={appGameState.sideQuestState}
          teacherMode={appGameState.teacherMode}
          onNavigateToJournal={handleNavigateToJournal}
          onNavigateToInventory={handleNavigateToInventory}
          onNavigateToGuide={handleNavigateToGuide}
          onNavigateToAssessment={handleNavigateToAssessment}
          onReturnToStartScreen={handleRequestReturnMenuFromMap}
          onSaveGame={handleSaveGame}
          onUpdateTeacherYearSelection={handleUpdateTeacherYearSelection}
          onCompleteEntryChallenge={handleCompleteEntryChallenge}
          onStartSideQuestCase={handleStartSideQuestCase}
          onCollectSideQuestClue={handleCollectSideQuestClue}
          onCompleteSideQuestCase={handleCompleteSideQuestCase}
          onMovementStep={playWalkingTap}
          onDoorUnlockStart={pauseActiveTrack}
          onDoorUnlockEnd={resumeActiveTrack}
          onUnlockDoor={playUnlockDoor}
          onDoorOpening={playDoorOpening}
        />
      );
      break;
    case 'game':
      if (appGameState.geminiChat && appGameState.currentWingIdForGame && appGameState.selectedAvatar && appGameState.wings[appGameState.currentWingIdForGame]) {
        screenComponent = (
          <MainGame
            selectedAvatar={appGameState.selectedAvatar}
            initialWingToLoad={appGameState.currentWingIdForGame}
            currentWingsState={appGameState.wings}
            chat={appGameState.geminiChat}
            narrativeLog={appGameState.narrativeLog}
            onAppendNarrative={appendNarrativeEntry}
            onUpdateWingState={updateWingState}
            onUnlockNextWing={unlockNextWing}
            onReturnToMap={handleReturnFromGameToMap}
            onOpenGameMenu={handleRequestReturnMenuFromGame}
            onGameWon={handleGameWon}
            onError={handleError}
            isLoading={appGameState.isLoading}
            setIsLoading={setIsLoading}
            isGeneratingWingArt={appGameState.isGeneratingWingArt}
            setIsGeneratingWingArt={setIsGeneratingWingArt}
            onSaveJournalEntry={handleSaveJournalEntry}
            onNavigateToJournalEntry={handleNavigateToJournalEntry}
            onNavigateToGuide={handleNavigateToGuide}
            playerStats={appGameState.playerStats}
            onUpdatePlayerStats={handleUpdatePlayerStats}
            avatarImageUrl={appGameState.avatarImageUrl}
            setAvatarImageUrl={setAvatarImageUrl}
            isGeneratingAvatarPortrait={appGameState.isGeneratingAvatarPortrait}
            setIsGeneratingAvatarPortrait={setIsGeneratingAvatarPortrait}
            avatarImageError={appGameState.avatarImageError}
            setAvatarImageError={setAvatarImageError}
            teacherMode={appGameState.teacherMode}
            onUpdateTeacherYearSelection={handleUpdateTeacherYearSelection}
            onPhaseComplete={playPhaseCompletion}
            onRoomComplete={playRoomCompletion}
          />
        );
      } else {
        // Fallback if game screen is attempted with invalid state
        console.warn("Attempted to navigate to game screen with invalid state. Returning to map.", appGameState);
        if (appGameState.selectedAvatar) { // Only go to map if an avatar exists (game started/loaded)
            setCurrentScreen('map');
            screenComponent = (
                <MapScreen
                selectedAvatar={appGameState.selectedAvatar || null}
                playerStats={appGameState.playerStats}
                wingsState={appGameState.wings}
                currentGalleryScene={currentGalleryScene}
                onGallerySceneChange={setCurrentGalleryScene}
                onSceneTransition={runSceneTransition}
                onSelectWing={handleSelectWing}
                wingDefinitions={WING_DEFINITIONS}
                learningJournal={appGameState.learningJournal}
                sideQuestState={appGameState.sideQuestState}
                teacherMode={appGameState.teacherMode}
                onNavigateToJournal={handleNavigateToJournal}
                onNavigateToInventory={handleNavigateToInventory}
                onNavigateToGuide={handleNavigateToGuide}
                onNavigateToAssessment={handleNavigateToAssessment}
                onReturnToStartScreen={handleRequestReturnMenuFromMap}
                onSaveGame={handleSaveGame}
                onUpdateTeacherYearSelection={handleUpdateTeacherYearSelection}
                onCompleteEntryChallenge={handleCompleteEntryChallenge}
                onStartSideQuestCase={handleStartSideQuestCase}
                onCollectSideQuestClue={handleCollectSideQuestClue}
                onCompleteSideQuestCase={handleCompleteSideQuestCase}
                onMovementStep={playWalkingTap}
                onDoorUnlockStart={pauseActiveTrack}
                onDoorUnlockEnd={resumeActiveTrack}
                onUnlockDoor={playUnlockDoor}
                onDoorOpening={playDoorOpening}
              />
            );
        } else { // Otherwise, back to splash
            setCurrentScreen('splash');
            screenComponent = (
                 <SplashScreen
                    onNewGame={handleNavigateToNewGameSetup}
                    onLoadGame={handleLoadGame}
                    onTeacherUnlock={handleTeacherUnlock}
                    onNavigateToGuide={handleNavigateToGuideFromStart}
                />
            );
        }
      }
      break;
    case 'journal':
      screenComponent = (
        <JournalScreen
          learningJournal={appGameState.learningJournal}
          selectedAvatar={appGameState.selectedAvatar || null}
          playerStats={appGameState.playerStats}
          onReturnToMap={handleReturnToMap}
          focusedWingId={appGameState.focusedWingIdForJournal}
          onClearFocusedWingId={handleClearFocusedWingId}
          onUpdateJournalEntry={handleUpdateJournalEntry}
          onPageTurn={playPageTurn}
          onFastPageTurn={playFastPageTurn}
        />
      );
      break;
    case 'inventory':
      screenComponent = (
        <InventoryScreen
          playerStats={appGameState.playerStats}
          selectedAvatar={appGameState.selectedAvatar || null}
          onReturnToMap={handleReturnToMap}
          onUpdateAvatar={handleUpdateAvatar}
        />
      );
      break;
    case 'guide':
      screenComponent = (
        <GameGuideScreen
          selectedAvatar={appGameState.selectedAvatar || null}
          playerStats={appGameState.playerStats}
          onReturnToMap={handleReturnFromGuide}
          returnLabel={guideReturnTarget === 'splash' ? 'Back to Start' : 'Return to Map'}
        />
      );
      break;
    case 'assessment':
      screenComponent = (
        <AssessmentScreen
          learningJournal={appGameState.learningJournal}
          selectedAvatar={appGameState.selectedAvatar || null}
          playerStats={appGameState.playerStats}
          wingDefinitions={WING_DEFINITIONS}
          onReturnToMap={handleReturnToMap}
        />
      );
      break;
    default:
      screenComponent = (
        <SplashScreen
            onNewGame={handleNavigateToNewGameSetup}
            onLoadGame={handleLoadGame}
            onTeacherUnlock={handleTeacherUnlock}
            onNavigateToGuide={handleNavigateToGuideFromStart}
        />
      );
  }

  return (
    <>
      {screenComponent}
      {loadTransition && (
        <GalleryLoadingScreen
          title={loadTransition.title}
          message={loadTransition.message}
          detail={loadTransition.detail}
          tone={loadTransition.tone}
          compact={loadTransition.compact}
        />
      )}
      <Modal
        isOpen={pendingReturnMenuTarget !== null}
        title="Save Progress?"
        onClose={handleCancelReturnMenuPrompt}
      >
        <div className="space-y-5">
          <p className="text-base leading-relaxed text-purple-100">
            Would you like to save your game progress before opening the menu?
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={handleSaveAndContinueToReturnMenu}
              disabled={!hasSaveableGame}
              className="artquest-button min-h-12 px-4 py-3 text-sm font-black focus:outline-none focus:ring-4 focus:ring-emerald-300 disabled:cursor-not-allowed"
            >
              Save Progress
            </button>
            <button
              type="button"
              onClick={handleContinueToReturnMenuWithoutSaving}
              className="artquest-button min-h-12 px-4 py-3 text-sm font-black focus:outline-none focus:ring-4 focus:ring-amber-200"
            >
              Skip Save
            </button>
            <button
              type="button"
              onClick={handleCancelReturnMenuPrompt}
              className="artquest-button min-h-12 px-4 py-3 text-sm font-black focus:outline-none focus:ring-4 focus:ring-slate-300"
            >
              Stay Here
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
