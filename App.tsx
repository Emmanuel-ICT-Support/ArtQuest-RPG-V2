
import React, { useState, useCallback, useMemo } from 'react';
import SplashScreen from './components/SplashScreen';
import ReturnToGameScreen from './components/ReturnToGameScreen';
import NewGameSetupScreen from './components/StartScreen'; // Renamed from StartScreen, actual file is StartScreen.tsx
import { MapScreen } from './components/MapScreen';
import MainGame from './MainGame';
import JournalScreen from './components/JournalScreen';
import InventoryScreen from './components/InventoryScreen';
import GameGuideScreen from './components/GameGuideScreen';
import AssessmentScreen from './components/AssessmentScreen';
import Modal from './components/Modal';
import { GameMusicTrack, useGameAudio } from './components/useGameAudio';
import { PlayerAvatar, WingState, AppGameState, NarrativeEntry, GameScreen, GalleryScene, JournalEntry, YearLevel, SeniorCoursePathway, PlayerStats, TraitName, TraitLevel, SaveGameData, CoreSavedGameState, SideQuestReward } from './types';
import { WING_DEFINITIONS, INITIAL_WING_ID, SAVE_FILE_VERSION } from './constants';
import { initializeChat as initializeAiChat } from './services/aiService';
import { getAvatarBuildForAvatar, getAvatarSpriteUrl, getNewlyUnlockedRewardMilestones } from './data/AvatarRewards';
import { SIDE_QUEST_CASES_BY_ID, createInitialSideQuestState, normalizeSideQuestState } from './data/SideQuests';

const TEACHER_UNLOCK_CODE = '0554';
const TEACHER_AVATAR_IMAGE_URL = './public/images/Teacher.png';
type GuideReturnTarget = 'splash' | 'map' | 'returnMenu';
type ReturnMenuTarget = 'map' | 'game';

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
    normalized[wing.id] = {
      isSolved: false,
      isUnlocked: wing.id === INITIAL_WING_ID,
      currentQuestionLevel: 1,
      phaseResponses: {},
      entryChallengeCompleted: false,
      ...wings[wing.id],
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

const defaultAvatarForRetry: PlayerAvatar = {
  id:'default',
  name:'Artist',
  title:'The Curious',
  description:'',
  iconInitial:'A',
  colorClass:'bg-gray-500',
  selectedYearLevel: 9 as YearLevel
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
  const hasSaveableGame = !!appGameState.selectedAvatar && !!appGameState.playerStats;


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
      const chat = initializeAiChat();
      setAppGameState(prev => ({
        ...prev,
        geminiChat: chat,
        isLoading: false,
      }));
      setCurrentScreen('map');
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
  }, []);

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
    const chat = initializeAiChat();
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
    return true;
  }, []);

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
      const chat = initializeAiChat();

      setAppGameState(prev => ({
        ...prev, // Keep some transient states like error handling
        ...parsedData.gameState, // Load core game state
        selectedAvatar: normalizeSelectedAvatar(parsedData.gameState.selectedAvatar),
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
    } catch (err) {
      console.error("Failed to load game:", err);
      const errorMessage = (err instanceof Error) ? err.message : "An unknown error occurred during load.";
      setAppGameState(prev => ({
        ...initialAppGameState, // Reset to a clean state on load failure
        isLoading: false,
        error: `Load failed: ${errorMessage}. Please try a valid save file or start a new game.`
      }));
      setCurrentGalleryScene('foyer');
      setCurrentScreen('splash'); // Return to splash on error
    }
  }, []);


  const handleSelectWing = useCallback((wingId: string) => {
    const currentWings = normalizeUnlockedWings(appGameState.wings);
    if (!isWingEffectivelyUnlocked(currentWings, wingId)) return;

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
  }, [appGameState.wings]);

  const handleReturnToMap = useCallback(() => {
    setAppGameState(prev => ({ ...prev, currentWingIdForGame: null, focusedWingIdForJournal: null }));
    setCurrentScreen('map');
  }, []);

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

  const handleNavigateToJournal = useCallback(() => {
    setAppGameState(prev => ({ ...prev, focusedWingIdForJournal: null }));
    setCurrentScreen('journal');
  }, []);

  const handleNavigateToInventory = useCallback(() => {
    setAppGameState(prev => ({ ...prev, focusedWingIdForJournal: null }));
    setCurrentScreen('inventory');
  }, []);

  const handleNavigateToJournalEntry = useCallback((wingId: string) => {
    setAppGameState(prev => ({ ...prev, focusedWingIdForJournal: wingId }));
    setCurrentScreen('journal');
  }, []);

  const handleClearFocusedWingId = useCallback(() => {
    setAppGameState(prev => ({ ...prev, focusedWingIdForJournal: null }));
  }, []);

  const handleNavigateToGuide = useCallback(() => {
    setGuideReturnTarget('map');
    setCurrentScreen('guide');
  }, []);

  const handleNavigateToGuideFromStart = useCallback(() => {
    setGuideReturnTarget('splash');
    setCurrentScreen('guide');
  }, []);

  const handleNavigateToGuideFromReturnMenu = useCallback(() => {
    setGuideReturnTarget('returnMenu');
    setCurrentScreen('guide');
  }, []);

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

  const handleNavigateToAssessment = useCallback(() => {
    setCurrentScreen('assessment');
  }, []);

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
            onReturnToMap={handleReturnToMap}
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
          returnLabel={guideReturnTarget === 'splash' ? 'Back to Start' : 'Back to Map'}
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
