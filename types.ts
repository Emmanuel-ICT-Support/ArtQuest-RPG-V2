

import React from 'react';

export type YearLevel = 7 | 8 | 9 | 10 | 11 | 12;
export type SeniorCoursePathway = 'general' | 'atar';
export type QuestionPhase = 1 | 2 | 3 | 4;
export type PhaseResponses = Partial<Record<QuestionPhase, string>>;
export type GalleryScene = 'foyer' | number;

export interface Chat {
  sendMessage: (input: { message: string } | string) => Promise<{ text: string }>;
}

export interface WingDefinition {
  id: string;
  name: string;
  artPrinciple: string;
  unlocks?: string; // ID of the wing this one unlocks
  icon?: string; // Emoji or SVG path for room icon
}

export type DoorChallengeType = 'multipleChoice' | 'sortOrder';

export interface DoorChallengeOption {
  id: string;
  label: string;
  detail?: string;
}

export interface DoorChallengeSortItem {
  id: string;
  label: string;
  detail?: string;
  swatch?: string;
}

export interface DoorChallengeBase {
  id: string;
  wingId: string;
  type: DoorChallengeType;
  guardName: string;
  guardTitle: string;
  title: string;
  intro: string;
  prompt: string;
  hint: string;
  success: string;
  preparedBadge: string;
  yearBandLabel: string;
}

export interface MultipleChoiceDoorChallenge extends DoorChallengeBase {
  type: 'multipleChoice';
  options: DoorChallengeOption[];
  correctOptionId: string;
}

export interface SortOrderDoorChallenge extends DoorChallengeBase {
  type: 'sortOrder';
  items: DoorChallengeSortItem[];
  correctOrder: string[];
  orderDirectionLabel: string;
}

export type DoorChallengeDefinition = MultipleChoiceDoorChallenge | SortOrderDoorChallenge;

export interface NarrativeEntry {
  id:string;
  speaker: 'curator' | 'player' | 'system';
  text: string;
  timestamp: number;
}

export interface WingState {
  isSolved: boolean;
  isUnlocked: boolean;
  description?: string; // Curator's description of the wing
  image?: string; // Base64 image string for the wing
  imagePrompt?: string; // Prompt used to generate the wing image
  currentQuestionLevel: number; // Tracks the current level (1:See, 2:Think, 3:Interpret, 4:Reflect) of the question structure
  phaseResponses?: PhaseResponses; // Stores the player's latest response for each phase of the wing.
  entryChallengeCompleted?: boolean; // Tracks whether the room guard's threshold puzzle has been cleared.
}

export type AvatarArchetypeId = 'nova' | 'leo' | 'zia';

export type AvatarAssetTabId = 'skinToneId' | 'hairStyleId' | 'faceId' | 'outfitId' | 'heldObjectId' | 'accessoryId';

export interface AvatarBuilderConfig {
  archetypeId?: AvatarArchetypeId;
  skinToneId: string;
  hairStyleId: string;
  faceId: string;
  outfitId: string;
  heldObjectId: string;
  accessoryId: string;
}

export interface PlayerAvatar {
  id: string;
  name: string;
  title: string;
  description: string;
  iconInitial: string; // For placeholder icon
  imageUrl?: string; // URL or generated data URL for the avatar image
  colorClass: string; // TailwindCSS class for placeholder bg
  selectedYearLevel: YearLevel;
  selectedCoursePathway?: SeniorCoursePathway;
  avatarArchetypeId?: AvatarArchetypeId;
  avatarBuild?: AvatarBuilderConfig;
}

export interface ClipboardItem { // This type might become unused or repurposed if Artbook Snippets changes significantly.
  id: string;
  term: string;
  definition: string;
}

export interface JournalEntry {
  id: string; // Unique ID for the journal entry (e.g., wingId + timestamp)
  wingId: string;
  wingName: string;
  artPrinciple: string;
  completedDate: string; // ISO string date
  mainArtworkImage?: string; // Base64 image
  mainArtworkPrompt?: string;
  mainArtworkTitle?: string;
  mainArtworkArtist?: string;
  playerReflection: string; // Player's Phase 4 Reflect answer. Kept for compatibility with older saves.
  phaseResponses?: PhaseResponses; // Player responses for See, Think, Interpret, and Reflect.
  visualLanguageLog: string[];
  gemIcon: string; // Icon for the acquired gem
  roomRecap: string; // AI-generated one-sentence recap
  playerPersonalReflection?: string; // Additional player notes, elaborations, or deeper personal thoughts related to the wing's challenge responses.
}

// Player Stats and Traits
export type TraitName = 'Focus' | 'Expression' | 'Insight' | 'Imagination';
export type TraitLevel = 'Locked' | 'Bronze' | 'Silver' | 'Gold';

export interface PlayerTrait {
  name: TraitName;
  icon: string; // emoji
  description: string;
  level: TraitLevel;
  currentXP: number;
  xpToNextLevel: number;
}

export interface PlayerStats {
  artEnergy: {
    currentXP: number;
    maxXp: number;
  };
  traits: Record<TraitName, PlayerTrait>;
}

export type SideQuestCaseStatus = 'notStarted' | 'active' | 'readyToSolve' | 'completed';

export interface SideQuestCaseProgress {
  status: SideQuestCaseStatus;
  foundClueIds: string[];
  rewardAwarded?: boolean;
  completedAt?: string;
}

export interface SideQuestProgressState {
  cases: Record<string, SideQuestCaseProgress>;
  masterRewardAwarded?: boolean;
}

export interface SideQuestReward {
  artEnergy: number;
  traits: Partial<Record<TraitName, number>>;
  badge: string;
  avatarRewardHint?: string;
}

export interface SideQuestPuzzleOption {
  id: string;
  label: string;
  detail?: string;
}

export interface SideQuestSortItem {
  id: string;
  label: string;
  detail?: string;
  icon?: string;
}

export interface SideQuestMultipleChoicePuzzle {
  type: 'multipleChoice';
  prompt: string;
  options: SideQuestPuzzleOption[];
  correctOptionId: string;
  hint: string;
  success: string;
}

export interface SideQuestSortPuzzle {
  type: 'sortOrder';
  prompt: string;
  items: SideQuestSortItem[];
  correctOrder: string[];
  hint: string;
  success: string;
}

export type SideQuestFinalPuzzle = SideQuestMultipleChoicePuzzle | SideQuestSortPuzzle;

export interface SideQuestClueDefinition {
  id: string;
  title: string;
  objectName: string;
  icon: string;
  assetUrl?: string;
  flavour: string;
  prompt: string;
  options: SideQuestPuzzleOption[];
  correctOptionId: string;
  hint: string;
  success: string;
  traitConnection: TraitName[];
  position: { x: number; y: number };
  linkedWingId?: string;
}

export interface SideQuestCaseDefinition {
  id: string;
  title: string;
  locationName: string;
  scene: GalleryScene;
  referencedGuide: string;
  caseIcon: string;
  caseIconAssetUrl?: string;
  objective: string;
  summary: string;
  introDialogue: string;
  activeDialogue: string;
  readyDialogue: string;
  completedDialogue: string;
  lockedDialogue?: string;
  clues: SideQuestClueDefinition[];
  finalPuzzle: SideQuestFinalPuzzle;
  reward: SideQuestReward;
}

// Core game state that needs to be saved
export interface CoreSavedGameState {
  selectedAvatar: PlayerAvatar;
  wings: Record<string, WingState>;
  learningJournal: JournalEntry[];
  playerStats: PlayerStats;
  sideQuestState?: SideQuestProgressState;
  avatarImageUrl: string | null; // Saved avatar image URL or generated data URL
  gameWon: boolean;
  gameOver: boolean;
  teacherMode?: boolean;
  // currentWingIdForGame is not saved here; player resumes on map.
  // narrativeLog is not saved; it's transient per wing.
  // geminiChat is not saved; it's re-initialized.
}

// Structure for the save game file
export interface SaveGameData {
  version: string;
  savedAt: string; // ISO timestamp
  gameState: CoreSavedGameState;
}


// App-level state, parts of which are passed to components
export interface AppGameState {
  wings: Record<string, WingState>;
  narrativeLog: NarrativeEntry[];
  geminiChat: Chat | null;
  isLoading: boolean; // For global loading states like initial chat setup or loading game
  isGeneratingWingArt: boolean;
  error: string | null;
  gameOver: boolean;
  gameWon: boolean;
  teacherMode: boolean;
  selectedAvatar?: PlayerAvatar;
  currentWingIdForGame: string | null;
  learningJournal: JournalEntry[];
  playerStats: PlayerStats | null;
  avatarImageUrl: string | null;
  isGeneratingAvatarPortrait: boolean;
  avatarImageError: string | null;
  focusedWingIdForJournal?: string | null;
  sideQuestState: SideQuestProgressState;
}

// Props for UI components
export interface ModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  size?: 'md' | 'lg' | 'xl';
}

export interface LoadingSpinnerProps {
  size?: number;
  color?: string;
}

// Props for SplashScreen
export interface SplashScreenProps {
  onNewGame: () => void;
  onLoadGame: (fileContent: string) => Promise<void>; // Make it async to handle file reading
  onTeacherUnlock: (code: string) => Promise<boolean>;
  onNavigateToGuide: () => void;
}

export interface ReturnToGameScreenProps extends SplashScreenProps {
  onReturnToGame: () => void;
}

// Props for NewGameSetupScreen (formerly StartScreen)
export interface NewGameSetupScreenProps {
  onStartNewGameSetupComplete: (avatar: PlayerAvatar) => void;
  // isGameInProgress is no longer needed here as this screen is only for new games.
  // onContinueGame and onResetGame are removed as those functionalities move to SplashScreen or are implicit.
}

// Props for MapScreen
export interface MapScreenProps {
  selectedAvatar: PlayerAvatar | null;
  playerStats: PlayerStats | null;
  wingsState: Record<string, WingState>;
  currentGalleryScene: GalleryScene;
  onGallerySceneChange: (scene: GalleryScene) => void;
  onSceneTransition?: (
    nextScene: GalleryScene,
    fromScene: GalleryScene,
    commitSceneChange: () => void,
  ) => Promise<void>;
  onSelectWing: (wingId: string) => void;
  wingDefinitions: WingDefinition[];
  learningJournal: JournalEntry[]; // Added this line
  sideQuestState: SideQuestProgressState;
  teacherMode?: boolean;
  onNavigateToJournal: () => void;
  onNavigateToInventory: () => void;
  onNavigateToGuide: () => void;
  onNavigateToAssessment: () => void;
  onReturnToStartScreen: () => void; // Opens the in-game return menu.
  onSaveGame: () => void; // Added for save game functionality
  onUpdateTeacherYearSelection?: (yearLevel: YearLevel, coursePathway?: SeniorCoursePathway) => void;
  onCompleteEntryChallenge: (wingId: string) => void;
  onStartSideQuestCase: (caseId: string) => void;
  onCollectSideQuestClue: (caseId: string, clueId: string) => void;
  onCompleteSideQuestCase: (caseId: string) => void;
  onMovementStep?: () => void;
  onDoorUnlockStart?: () => void;
  onDoorUnlockEnd?: () => void;
  onUnlockDoor?: () => void;
  onDoorOpening?: () => void;
}

// Props for MainGame
export interface MainGameProps {
  selectedAvatar: PlayerAvatar | null;
  initialWingToLoad: string;
  currentWingsState: Record<string, WingState>;
  chat: Chat;
  narrativeLog: NarrativeEntry[];
  onAppendNarrative: (entry: Omit<NarrativeEntry, 'id' | 'timestamp'>) => void;
  onUpdateWingState: (wingId: string, updates: Partial<WingState>) => void;
  onUnlockNextWing: (solvedWingId: string) => string | null;
  onReturnToMap: () => void;
  onOpenGameMenu: () => void;
  onGameWon: () => void;
  onError: (message: string, error?: unknown) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isGeneratingWingArt: boolean;
  setIsGeneratingWingArt: (generating: boolean) => void;
  onSaveJournalEntry: (entry: JournalEntry) => void;
  onNavigateToJournalEntry: (wingId: string) => void;
  onNavigateToGuide: () => void;
  playerStats: PlayerStats | null;
  onUpdatePlayerStats: (newStats: PlayerStats) => void;
  avatarImageUrl: string | null;
  setAvatarImageUrl: (url: string | null) => void;
  isGeneratingAvatarPortrait: boolean;
  setIsGeneratingAvatarPortrait: (generating: boolean) => void;
  avatarImageError: string | null;
  setAvatarImageError: (error: string | null) => void;
  teacherMode?: boolean;
  onUpdateTeacherYearSelection?: (yearLevel: YearLevel, coursePathway?: SeniorCoursePathway) => void;
  onPhaseComplete?: () => void;
  onRoomComplete?: () => void;
}

export interface PostLevelSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  stars: number;
  feedback: string;
  vocabulary: string[];
  nextWingName: string | null | undefined;
  currentWingName: string;
}

export interface JournalScreenProps {
    learningJournal: JournalEntry[];
    selectedAvatar?: PlayerAvatar | null;
    playerStats?: PlayerStats | null;
    onReturnToMap: () => void;
    focusedWingId?: string | null;
    onClearFocusedWingId: () => void;
    onUpdateJournalEntry: (updatedEntry: JournalEntry) => void;
    onPageTurn?: () => void;
    onFastPageTurn?: () => void;
}

export interface InventoryScreenProps {
  playerStats: PlayerStats | null;
  selectedAvatar: PlayerAvatar | null;
  onReturnToMap: () => void;
  onUpdateAvatar: (avatar: PlayerAvatar) => void;
}

export interface PlayerStatsDisplayProps {
  playerStats: PlayerStats | null;
}

export interface ProgressBarProps {
  current: number;
  max: number;
  label?: string;
  colorClass?: string;
  heightClass?: string;
}

export interface GameGuideScreenProps {
  selectedAvatar?: PlayerAvatar | null;
  playerStats?: PlayerStats | null;
  onReturnToMap: () => void;
  returnLabel?: string;
}

export interface RubricLevelDescriptor {
  level: number;
  title: string;
  description: string;
}

export interface RubricCriterion {
  id: 'artUnderstanding' | 'visualLanguage' | 'personalInsight' | 'judgementReflection' | 'engagementEffort';
  name: string;
  descriptors: RubricLevelDescriptor[];
}

export interface AssessmentScreenProps {
  learningJournal: JournalEntry[];
  selectedAvatar: PlayerAvatar | null;
  playerStats?: PlayerStats | null;
  wingDefinitions: WingDefinition[];
  onReturnToMap: () => void;
}

// Union type for different game screens
export type GameScreen = 'splash' | 'newGameSetup' | 'returnMenu' | 'teacherMode' | 'classPackBuilder' | 'map' | 'game' | 'journal' | 'inventory' | 'guide' | 'assessment';
