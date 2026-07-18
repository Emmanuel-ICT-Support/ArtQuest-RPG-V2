
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MainGameProps, WingState, PlayerAvatar, JournalEntry, PhaseResponses, QuestionPhase, PlayerStats, TraitName, YearLevel, SeniorCoursePathway } from './types';
import { WING_DEFINITIONS, MSG_TAG_PUZZLE_SOLVED, MSG_TAG_GAME_WON, MSG_TAG_GENERATE_PLAYER_IMAGE, MSG_TAG_GENERATE_PREDEFINED_IMAGE, MSG_TAG_OBJECTIVE, MSG_TAG_ROOM_RECAP, SUPPLEMENTAL_DESCRIPTIVE_TERMS } from './constants';
import { sendMessageToChat, generateImagePromptFromDescription, generateImage } from './services/aiService';
import { getArtworkBrief } from './data/ArtworkLibrary';
import { SCSA_ASSESSMENT_YEAR_OPTIONS, getAssessmentDisplayLabel, getAssessmentYearOptionId } from './data/SCSACurriculum';
import { getResponseExpectation } from './data/ResponseExpectations';
import { getAvatarBuildForAvatar, getAvatarLayerImageUrls, getAvatarSpriteUrl } from './data/AvatarRewards';
import { VisualLanguageGuideContent, flattenVisualLanguageGuide, getVisualLanguageGuideForWing } from './data/VisualLanguageGuide';
import LoadingSpinner from './components/LoadingSpinner';
import Modal from './components/Modal';
import PostLevelSummaryModal from './components/PostLevelSummaryModal'; 
import PlayerStatsDisplay from './components/PlayerStatsDisplay'; 
import AvatarLayeredPreview from './components/AvatarLayeredPreview';

interface StatsRewardResult {
  updatedStats: PlayerStats;
  artEnergyAwarded: number;
  traitAwards: Partial<Record<TraitName, number>>;
  qualityTags: string[];
}

const toQuestionPhase = (phase: number): QuestionPhase =>
  Math.max(1, Math.min(4, phase)) as QuestionPhase;

const getResponseDepthTarget = (
  phase: QuestionPhase,
  yearLevel: YearLevel,
  coursePathway?: SeniorCoursePathway
): number => getResponseExpectation(yearLevel, phase, coursePathway).minWords;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const includesVocabularyTerm = (input: string, term: string): boolean => {
  const normalizedTerm = term.trim().toLowerCase();
  if (!normalizedTerm) return false;
  const termPattern = escapeRegExp(normalizedTerm).replace(/\s+/g, '\\s+');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${termPattern}([^\\p{L}\\p{N}]|$)`, 'iu').test(input);
};

const VISUAL_GUIDE_SECTION_META = [
  { id: 'wordsForWhatYouSee', label: 'Words for what you see', limit: 5, style: 'chips' },
  { id: 'wordsForHowItWorks', label: 'Words for how it works', limit: 4, style: 'chips' },
  { id: 'wordsForMeaningMood', label: 'Words for meaning and mood', limit: 4, style: 'chips' },
  { id: 'wordsForJudgingSuccess', label: 'Words for judging success', limit: 4, style: 'chips' },
  { id: 'sentenceStarters', label: 'Sentence starters', limit: 2, style: 'lines' },
  { id: 'strongExampleResponses', label: 'Strong example responses', limit: 2, style: 'lines' },
] as const;

const addTraitAward = (
  stats: PlayerStats,
  traitAwards: Partial<Record<TraitName, number>>,
  traitName: TraitName,
  amount: number
) => {
  const trait = stats.traits[traitName];
  if (!trait || trait.level === 'Gold' || amount <= 0) return;
  trait.currentXP += amount;
  traitAwards[traitName] = (traitAwards[traitName] || 0) + amount;
};

const calculateProgressReward = (
  playerStats: PlayerStats,
  inputText: string,
  phase: QuestionPhase,
  yearLevel: YearLevel,
  coursePathway: SeniorCoursePathway | undefined,
  newlyUsedVocab: string[],
  completedWing: boolean
): StatsRewardResult => {
  const updatedStats: PlayerStats = JSON.parse(JSON.stringify(playerStats));
  const traitAwards: Partial<Record<TraitName, number>> = {};
  const qualityTags: string[] = [completedWing ? 'wing complete' : 'phase cleared'];
  const inputWordCount = inputText.split(/\s+/).filter(Boolean).length;
  const depthTarget = getResponseDepthTarget(phase, yearLevel, coursePathway);
  const meetsDepthTarget = inputWordCount >= depthTarget;
  const exceedsDepthTarget = inputWordCount >= Math.ceil(depthTarget * 1.25);

  let artEnergyToAward = completedWing ? 12 : 8;

  addTraitAward(updatedStats, traitAwards, 'Focus', 1);

  if (meetsDepthTarget) {
    artEnergyToAward += 3;
    addTraitAward(updatedStats, traitAwards, 'Focus', 1);
    qualityTags.push('clear depth');
  }

  if (exceedsDepthTarget) {
    artEnergyToAward += 2;
    addTraitAward(updatedStats, traitAwards, 'Insight', 1);
    qualityTags.push('extended evidence');
  }

  if (phase >= 2) {
    addTraitAward(updatedStats, traitAwards, 'Insight', 1);
  }

  if (phase >= 3) {
    addTraitAward(updatedStats, traitAwards, 'Imagination', 1);
  }

  const vocabularyBonus = Math.min(newlyUsedVocab.length, 2);
  if (vocabularyBonus > 0) {
    artEnergyToAward += vocabularyBonus;
    addTraitAward(updatedStats, traitAwards, 'Expression', vocabularyBonus);
    qualityTags.push('visual language');
  }

  if (completedWing) {
    artEnergyToAward += 5;
    addTraitAward(updatedStats, traitAwards, 'Insight', 1);
    addTraitAward(updatedStats, traitAwards, 'Imagination', 1);
  }

  const availableEnergy = Math.max(0, updatedStats.artEnergy.maxXp - updatedStats.artEnergy.currentXP);
  const artEnergyAwarded = Math.min(artEnergyToAward, availableEnergy);
  updatedStats.artEnergy.currentXP += artEnergyAwarded;

  return { updatedStats, artEnergyAwarded, traitAwards, qualityTags };
};

const formatRewardSummary = (reward: StatsRewardResult): string | null => {
  const parts: string[] = [];
  if (reward.artEnergyAwarded > 0) parts.push(`Art Energy +${reward.artEnergyAwarded}`);

  (Object.entries(reward.traitAwards) as [TraitName, number][])
    .filter(([, amount]) => amount > 0)
    .forEach(([traitName, amount]) => parts.push(`${traitName} +${amount}`));

  if (parts.length === 0) return null;
  return `Reward earned: ${parts.join(', ')}. ${reward.qualityTags.join(' · ')}`;
};

const getAvatarImageSrc = (avatar: PlayerAvatar | null): string | null => {
  if (!avatar) return null;
  return getAvatarSpriteUrl(avatar);
};

const isMainGamePixelAvatarSpriteSrc = (src: string | null): boolean => (
  !!src && src.startsWith('./public/images/')
);

const CURATOR_PORTRAIT_SRC = './public/images/npcs/gallery-guide.png';
const ANALYSIS_PANEL_CLASS = 'analysis-panel';
const ANALYSIS_INNER_PANEL_CLASS = 'analysis-inner-panel';
const ANALYSIS_TITLE_CLASS = 'analysis-section-title';
const ANALYSIS_BUTTON_CLASS = 'analysis-button analysis-button-blue';
const ANALYSIS_PURPLE_BUTTON_CLASS = 'analysis-button analysis-button-purple';
const CURATOR_GUIDANCE_QUESTION_PROMPT = "The Curator can only check your challenge response in this room. If you are unsure, ask your teacher for guidance, then return to the prompt and write your own response.";

const getPracticeLabelTransform = (anchorX?: string, anchorY?: string): string => {
  const x = anchorX === 'left' ? '0' : anchorX === 'right' ? '-100%' : '-50%';
  const y = anchorY === 'top' ? '0' : anchorY === 'bottom' ? '-100%' : '-50%';
  return `translate(${x}, ${y})`;
};

const normalizeCuratorQuestionText = (value: string): string => value
  .toLowerCase()
  .replace(/[’']/g, '')
  .replace(/[^\p{L}\p{N}\s?]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const isCuratorGuidanceQuestion = (input: string): boolean => {
  const normalized = normalizeCuratorQuestionText(input);
  if (!normalized) return false;

  const questionStarters = [
    'what', 'why', 'how', 'where', 'when', 'who', 'which',
    'can', 'could', 'would', 'should', 'is', 'are', 'do', 'does', 'did', 'will',
  ];
  const guidancePhrases = [
    'can you help', 'could you help', 'help me', 'i need help', 'i dont understand',
    'im confused', 'i am confused', 'not sure', 'unsure', 'what do i write',
    'what should i write', 'what does this mean', 'can you explain', 'could you explain',
    'give me a hint', 'hint please',
  ];
  const firstWord = normalized.split(' ')[0];
  const startsLikeQuestion = questionStarters.includes(firstWord);
  const asksForGuidance = guidancePhrases.some((phrase) => normalized.includes(phrase));
  const wordTotal = normalized.split(/\s+/).filter(Boolean).length;
  const hasQuestionMark = normalized.includes('?');

  return asksForGuidance || startsLikeQuestion || (hasQuestionMark && wordTotal <= 18);
};

interface ProcessedTextResult {
    processedText: string;
    imageRequest?: { type: 'player' | 'predefined', prompt: string };
    textAfterImageRequest?: string;
    roomRecap?: string;
    highestPhaseInResponse?: number; 
}

const MainGameComponent: React.FC<MainGameProps> = ({
  selectedAvatar,
  initialWingToLoad,
  currentWingsState,
  chat,
  narrativeLog,
  onAppendNarrative,
  onUpdateWingState,
  onUnlockNextWing,
  onReturnToMap,
  onOpenGameMenu,
  onGameWon,
  onError,
  setIsLoading, 
  isGeneratingWingArt, 
  setIsGeneratingWingArt, 
  onSaveJournalEntry,
  onNavigateToJournalEntry,
  onNavigateToGuide, // Added prop
  playerStats, 
  onUpdatePlayerStats, 
  avatarImageUrl,
  setAvatarImageUrl,
  isGeneratingAvatarPortrait,
  setIsGeneratingAvatarPortrait,
  avatarImageError,
  setAvatarImageError,
  teacherMode = false,
  onUpdateTeacherYearSelection,
  onPhaseComplete,
  onRoomComplete,
}) => {
  const [playerInput, setPlayerInput] = useState<string>('');
  const narrativeLogRef = useRef<HTMLDivElement>(null);
  const playerInputRef = useRef<HTMLTextAreaElement>(null);
  const clipboardNoticeTimeoutRef = useRef<number | null>(null);
  const [currentWingId, setCurrentWingId] = useState<string>(initialWingToLoad);

  const [isCuratorThinking, setIsCuratorThinking] = useState<boolean>(false); 
  const [isGeneratingPlayerRequestedImage, setIsGeneratingPlayerRequestedImage] = useState<boolean>(false); 
  
  const [playerImageModalOpen, setPlayerImageModalOpen] = useState<boolean>(false);
  const [playerImageModalContent, setPlayerImageModalContent] = useState<{ src: string; prompt: string } | null>(null);
  
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSessionInitialized, setIsSessionInitialized] = useState<boolean>(false);
  const isInitializingRef = useRef<boolean>(false); 

  const [visualLanguageGuide, setVisualLanguageGuide] = useState<VisualLanguageGuideContent | null>(null);
  const [isFetchingGuideTerms, setIsFetchingGuideTerms] = useState<boolean>(false);
  const [currentObjectives, setCurrentObjectives] = useState<string[]>([]);

  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);
  const [summaryModalData, setSummaryModalData] = useState<{
    stars: number;
    feedback: string;
    vocabulary: string[]; 
    nextWingName?: string | null;
    currentWingName: string;
  } | null>(null);
  const [playerImageGeneratedInThisWingSession, setPlayerImageGeneratedInThisWingSession] = useState<boolean>(false);
  const [playerUsedVocabulary, setPlayerUsedVocabulary] = useState<string[]>([]);
  const [wingImageLoadFailed, setWingImageLoadFailed] = useState<boolean>(false);
  const [artworkModalOpen, setArtworkModalOpen] = useState<boolean>(false);
  const [visualGuideModalOpen, setVisualGuideModalOpen] = useState<boolean>(false);


  const currentWingDef = WING_DEFINITIONS.find(w => w.id === currentWingId);
  const currentWingLocalState = currentWingsState[currentWingId];
  const currentArtworkBrief = selectedAvatar ? getArtworkBrief(currentWingId, selectedAvatar.selectedYearLevel) : null;
  const currentArtwork = currentArtworkBrief?.sourceArtwork;
  const selectedAssessmentLabel = selectedAvatar
    ? getAssessmentDisplayLabel(selectedAvatar.selectedYearLevel, selectedAvatar.selectedCoursePathway)
    : '';
  const selectedTeacherYearOptionId = selectedAvatar
    ? getAssessmentYearOptionId(selectedAvatar.selectedYearLevel, selectedAvatar.selectedCoursePathway)
    : '9';
  const visualLanguageTerms = visualLanguageGuide ? flattenVisualLanguageGuide(visualLanguageGuide) : [];
  const currentWingDisplayName =
    currentWingDef?.icon && currentWingDef.name.startsWith(`${currentWingDef.icon} `)
      ? currentWingDef.name.replace(`${currentWingDef.icon} `, '')
      : currentWingDef?.name || '';
  const selectedAvatarImageUrl = getAvatarImageSrc(selectedAvatar);
  const avatarDisplayImageUrl = selectedAvatarImageUrl || avatarImageUrl;
  const shouldPixelateAvatarImage = isMainGamePixelAvatarSpriteSrc(avatarDisplayImageUrl);
  const avatarLayerImageUrls = selectedAvatar?.id === 'custom' && selectedAvatar.avatarBuild
    ? getAvatarLayerImageUrls(getAvatarBuildForAvatar(selectedAvatar))
    : [];
  const shouldUseLayeredAvatar = avatarLayerImageUrls.length > 1;

  const parseErrorMessageForQuota = useCallback((err: any, baseMessage: string): string => {
    let specificMessage = baseMessage;
    const errString = err?.message?.toString() || err?.toString() || "";

    if (errString.includes("429") || errString.toUpperCase().includes("RESOURCE_EXHAUSTED") || errString.toUpperCase().includes("QUOTA")) {
        specificMessage = `The gallery's magic seems to be recharging... (API Quota Likely Reached: ${errString.substring(0,100)}). Some features may be temporarily unavailable. Please check your API plan/billing, or try again later.`;
    }
    return specificMessage;
  },[]);


  const handleLocalError = useCallback((message: string, error?: unknown) => {
    const parsedMsg = parseErrorMessageForQuota(error, message);
    onError(parsedMsg, error); 
    setLocalError(parsedMsg); 
    setIsCuratorThinking(false);
    setIsGeneratingWingArt(false);
    setIsGeneratingPlayerRequestedImage(false);
    setIsFetchingGuideTerms(false);
  }, [onError, setIsGeneratingWingArt, parseErrorMessageForQuota]);

  const showClipboardNotice = useCallback(() => {
    setClipboardNotice('Please type your response in your own words.');

    if (clipboardNoticeTimeoutRef.current) {
      window.clearTimeout(clipboardNoticeTimeoutRef.current);
    }

    clipboardNoticeTimeoutRef.current = window.setTimeout(() => {
      setClipboardNotice(null);
      clipboardNoticeTimeoutRef.current = null;
    }, 2400);
  }, []);

  const blockClipboardAction = useCallback((
    event: React.ClipboardEvent<HTMLTextAreaElement> | React.DragEvent<HTMLTextAreaElement> | React.MouseEvent<HTMLTextAreaElement>
  ) => {
    event.preventDefault();
    showClipboardNotice();
  }, [showClipboardNotice]);

  const handlePlayerInputBeforeInput = useCallback((event: React.FormEvent<HTMLTextAreaElement>) => {
    const inputType = (event.nativeEvent as InputEvent).inputType;

    if (inputType === 'insertFromPaste' || inputType === 'insertFromDrop') {
      event.preventDefault();
      showClipboardNotice();
    }
  }, [showClipboardNotice]);

  const handlePlayerInputKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return;

    const blockedShortcut = ['c', 'v', 'x'].includes(event.key.toLowerCase());
    if (!blockedShortcut) return;

    event.preventDefault();
    showClipboardNotice();
  }, [showClipboardNotice]);

  useEffect(() => () => {
    if (clipboardNoticeTimeoutRef.current) {
      window.clearTimeout(clipboardNoticeTimeoutRef.current);
    }
  }, []);

  const processCuratorText = useCallback((text: string, isInitialSetup: boolean = false): ProcessedTextResult => {
    let processedTextForDisplay = text;
    let imageRequest;
    let textAfterImageRequest;
    let roomRecap;
    let localHighestPhaseThisResponse = 0;
  
    const extractAndProcessTags = (inputText: string): { text: string } => {
      let tempText = inputText;
      
      const objectiveRegexExtract = /\[OBJECTIVE\](.*?)\[\/OBJECTIVE\]/gi;
      const objectiveRegexRemove = /\[OBJECTIVE\].*?\[\/OBJECTIVE\]/gi;
      
      const newObjectivesFoundThisPass: string[] = [];
      let match;
  
      const phase1ObjectivePattern = /\[OBJECTIVE\]\s*(Phase 1|Level 1).*?\[\/OBJECTIVE\]/i;
      if (phase1ObjectivePattern.test(tempText) && (isInitialSetup || !currentWingLocalState?.description)) { 
          setCurrentObjectives([]); 
      }
  
      while((match = objectiveRegexExtract.exec(tempText)) !== null) {
          const fullObjectiveContent = match[1].trim();
          if (fullObjectiveContent) {
              newObjectivesFoundThisPass.push(fullObjectiveContent);
              const phaseMatch = fullObjectiveContent.match(/^(?:Phase|Level)\s*(\d+)/i);
              if (phaseMatch && phaseMatch[1]) {
                  const phaseNum = parseInt(phaseMatch[1], 10);
                  if (phaseNum > localHighestPhaseThisResponse) {
                      localHighestPhaseThisResponse = phaseNum;
                  }
              }
          }
      }
      objectiveRegexExtract.lastIndex = 0; 
  
      if(newObjectivesFoundThisPass.length > 0) {
          setCurrentObjectives(prev => {
              let updatedObjectives = [...prev];
              newObjectivesFoundThisPass.forEach(newObjContent => {
                  const phaseMatch = newObjContent.match(/^(?:Phase|Level)\s*(\d+)/i);
                  if (phaseMatch) { 
                      const phasePrefix = `Phase ${phaseMatch[1]}:`;
                      const levelPrefix = `Level ${phaseMatch[1]}:`;
                      
                      const existingIndexPhase = updatedObjectives.findIndex(obj => obj.startsWith(phasePrefix));
                      const existingIndexLevel = updatedObjectives.findIndex(obj => obj.startsWith(levelPrefix));

                      if (existingIndexPhase !== -1) {
                          updatedObjectives[existingIndexPhase] = newObjContent; 
                      } else if (existingIndexLevel !== -1) {
                          updatedObjectives[existingIndexLevel] = newObjContent;
                      }
                      else {
                          updatedObjectives.push(newObjContent); 
                      }
                  } else { 
                      if (!updatedObjectives.includes(newObjContent)) {
                           updatedObjectives.push(newObjContent);
                      }
                  }
              });
              return updatedObjectives.sort((a, b) => {
                  const phaseAMatch = a.match(/^(?:Phase|Level)\s*(\d+)/i);
                  const phaseBMatch = b.match(/^(?:Phase|Level)\s*(\d+)/i);
                  const phaseA = phaseAMatch ? parseInt(phaseAMatch[1]) : Infinity;
                  const phaseB = phaseBMatch ? parseInt(phaseBMatch[1]) : Infinity;
                  if (phaseA !== phaseB) return phaseA - phaseB;
                  return a.localeCompare(b);
              });
          });
      }
      tempText = tempText.replace(objectiveRegexRemove, "").trim();

      const roomRecapRegex = /\[ROOM_RECAP\]([\s\S]*?)\[\/ROOM_RECAP\]/i;
      const recapMatch = tempText.match(roomRecapRegex);
      if (recapMatch && recapMatch[1]) {
          roomRecap = recapMatch[1].trim(); 
          tempText = tempText.replace(roomRecapRegex, "").trim();
      }
      tempText = tempText
        .replace(new RegExp(MSG_TAG_PUZZLE_SOLVED, "gi"), "")
        .replace(new RegExp(MSG_TAG_GAME_WON, "gi"), "")
        .trim();
      return { text: tempText };
    };
    
    const predefinedImageTagPattern = MSG_TAG_GENERATE_PREDEFINED_IMAGE + " Prompt:";
    const playerImageTagPattern = MSG_TAG_GENERATE_PLAYER_IMAGE + " Description:";
    
    let imageTagToSearch: string | null = null;
    let imageType : 'predefined' | 'player' | null = null;

    if (processedTextForDisplay.includes(predefinedImageTagPattern)) {
        imageTagToSearch = predefinedImageTagPattern;
        imageType = 'predefined';
    } else if (processedTextForDisplay.includes(playerImageTagPattern)) {
        imageTagToSearch = playerImageTagPattern;
        imageType = 'player';
    }
    
    if (imageTagToSearch && imageType) {
        const parts = processedTextForDisplay.split(new RegExp(`(${imageTagToSearch.replace(/\[/g, '\\[').replace(/\]/g, '\\]')})`));
        
        const beforeTagResult = extractAndProcessTags(parts[0] || "");
        processedTextForDisplay = beforeTagResult.text;

        const promptAndFollowingText = parts[2] || ""; 
        
        let actualImagePrompt;
        const nextRelevantTagRegex = new RegExp(`(\\${MSG_TAG_OBJECTIVE}|\\${MSG_TAG_ROOM_RECAP})`, "i");
        const nextTagMatch = promptAndFollowingText.match(nextRelevantTagRegex);

        if (nextTagMatch && typeof nextTagMatch.index === 'number') {
            actualImagePrompt = promptAndFollowingText.substring(0, nextTagMatch.index).trim();
            const afterTagResult = extractAndProcessTags(promptAndFollowingText.substring(nextTagMatch.index).trim());
            textAfterImageRequest = afterTagResult.text;
        } else {
            actualImagePrompt = promptAndFollowingText.trim();
            textAfterImageRequest = ""; 
        }
        
        imageRequest = { type: imageType, prompt: actualImagePrompt };
    } else {
        const fullTextResult = extractAndProcessTags(processedTextForDisplay);
        processedTextForDisplay = fullTextResult.text;
    }
    
    return { 
        processedText: processedTextForDisplay, 
        imageRequest, 
        textAfterImageRequest, 
        roomRecap,
        highestPhaseInResponse: localHighestPhaseThisResponse > 0 ? localHighestPhaseThisResponse : undefined
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ setCurrentObjectives, currentWingLocalState?.description ]); 


  useEffect(() => {
    setCurrentWingId(initialWingToLoad);
    setIsSessionInitialized(false);
    isInitializingRef.current = false; 
    setLocalError(null);
    setCurrentObjectives([]); 
    setVisualLanguageGuide(null);
    setPlayerUsedVocabulary([]); // Reset used vocabulary for new wing
    setIsFetchingGuideTerms(false);
    setPlayerImageGeneratedInThisWingSession(false);
  }, [initialWingToLoad]);

  useEffect(() => {
    if (!selectedAvatar) return;
    setIsGeneratingAvatarPortrait(false);
    setAvatarImageError(null);
    if (selectedAvatarImageUrl && avatarImageUrl !== selectedAvatarImageUrl) {
      setAvatarImageUrl(selectedAvatarImageUrl);
    }
  }, [selectedAvatar, selectedAvatarImageUrl, avatarImageUrl, setAvatarImageUrl, setIsGeneratingAvatarPortrait, setAvatarImageError]);

  useEffect(() => {
    if (chat && currentWingDef && selectedAvatar && !isSessionInitialized && !currentWingsState[currentWingId]?.isSolved && !isInitializingRef.current) {
      const initializeWingSession = async () => {
        isInitializingRef.current = true;
        setIsLoading(true); 
        setIsCuratorThinking(true);
        setVisualLanguageGuide(null);
        setPlayerUsedVocabulary([]); 
        onAppendNarrative({ speaker: 'system', text: `Entering ${currentWingDef.name}...` });
        
        setIsFetchingGuideTerms(false);
        setVisualLanguageGuide(getVisualLanguageGuideForWing(
          currentWingId,
          selectedAvatar.selectedYearLevel,
          selectedAvatar.selectedCoursePathway
        ));

        let wingInitialQuestionLevel = currentWingsState[currentWingId]?.currentQuestionLevel || 1;
        let introMessageToAI = `The player, ${selectedAvatar.name || 'the artist'} (${selectedAssessmentLabel}), is interacting with ${currentWingDef.name} (${currentWingDef.artPrinciple}). They are currently at Phase ${wingInitialQuestionLevel}. Remember to adapt your questions and feedback to their selected year level or senior course pathway as per system instructions.`;

        if (currentWingsState[currentWingId]?.image && currentWingsState[currentWingId]?.description) {
             introMessageToAI += ` The main artwork is already displayed. State the objective for Phase ${wingInitialQuestionLevel} for '${currentWingDef.name}', adapting it for a ${selectedAssessmentLabel} student. Then, guide the player to check 'Your Challenge' section in the UI.`;
        } else {
            setCurrentObjectives([]); 
            introMessageToAI += ` This is their first interaction with this wing in this session OR the artwork needs to be displayed. Follow the WING-SPECIFIC INSTRUCTIONS for '${currentWingDef.name}' precisely: provide the atmospheric welcome (adapted for ${selectedAssessmentLabel}), then immediately the [GENERATE_PREDEFINED_IMAGE_REQUEST] tag with its detailed prompt for the central artwork, and then, after the tag, state the player's [OBJECTIVE] for Phase 1 (adapted for ${selectedAssessmentLabel}). Conclude by guiding the player to check 'Your Challenge' section in the UI.`;
        }
        
        try {
          const response = await sendMessageToChat(chat, introMessageToAI);
          const { 
            processedText: initialCuratorTextToDisplay, 
            imageRequest, 
            textAfterImageRequest,
            highestPhaseInResponse,
          } = processCuratorText(response.text, true);


          if (initialCuratorTextToDisplay) {
            onAppendNarrative({ speaker: 'curator', text: initialCuratorTextToDisplay });
             if (!currentWingsState[currentWingId]?.description) { 
                onUpdateWingState(currentWingId, { description: initialCuratorTextToDisplay });
             }
          }
          
          if (highestPhaseInResponse && highestPhaseInResponse > (currentWingsState[currentWingId]?.currentQuestionLevel || 0)) {
            if (!response.text.includes(MSG_TAG_PUZZLE_SOLVED) && !response.text.includes(MSG_TAG_GAME_WON)) {
                 onUpdateWingState(currentWingId, { currentQuestionLevel: highestPhaseInResponse });
            }
          }

          if (imageRequest && imageRequest.type === 'predefined' && imageRequest.prompt && !currentWingsState[currentWingId]?.image) {
            setIsGeneratingWingArt(true);
            onAppendNarrative({ speaker: 'system', text: `The Curator is conjuring the wing's central artwork for ${currentWingDef.name}...` });
            setLocalError(null);
            try {
              const imageUrl = await generateImage(imageRequest.prompt);
              onUpdateWingState(currentWingId, { image: imageUrl, imagePrompt: imageRequest.prompt });
              onAppendNarrative({ speaker: 'system', text: `The artwork for ${currentWingDef.name} is revealed.` });
            } catch (imgErr: any) {
              const specificMessage = parseErrorMessageForQuota(imgErr, `Failed to generate central artwork for ${currentWingDef.name}.`);
              handleLocalError(specificMessage, imgErr);
              onUpdateWingState(currentWingId, { image: undefined, imagePrompt: imageRequest.prompt }); 
            } finally {
              setIsGeneratingWingArt(false);
            }
          } else if (!currentWingsState[currentWingId]?.image && !imageRequest) {
             handleLocalError(`The Curator seems to have forgotten to prepare an artwork for ${currentWingDef.name}. The experience may be incomplete.`, "AI did not request main image");
          }

          if (textAfterImageRequest) { 
            onAppendNarrative({ speaker: 'curator', text: textAfterImageRequest });
            const existingDesc = currentWingsState[currentWingId]?.description || "";
            if (!existingDesc.includes(textAfterImageRequest.substring(0,30))) { 
                 onUpdateWingState(currentWingId, { description: (existingDesc ? existingDesc + "\n" : "") + textAfterImageRequest }); 
            }
          }
          
          setIsSessionInitialized(true);

        } catch (err) {
          handleLocalError(`The Curator is having trouble opening ${currentWingDef.name}.`, err);
          setIsSessionInitialized(true); 
        } finally {
          setIsCuratorThinking(false);
          setIsLoading(false); 
          isInitializingRef.current = false;
        }
      };
      initializeWingSession();
    } else if (currentWingsState[currentWingId]?.isSolved) {
        if (!isSessionInitialized){ 
             onAppendNarrative({ speaker: 'system', text: `You are in the ${currentWingDef?.name}. This area's challenge is complete.` });
             if (currentWingDef) setCurrentObjectives([`This wing's challenge is complete. Explore other wings or view your journal.`]);
             setIsSessionInitialized(true); 
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWingId, chat, currentWingDef, selectedAvatar, isSessionInitialized, setIsLoading, processCuratorText, parseErrorMessageForQuota, setIsGeneratingWingArt, onAppendNarrative, onUpdateWingState, currentWingsState]);

  useEffect(() => {
    if (!teacherMode || !selectedAvatar || !currentWingDef) return;

    setVisualLanguageGuide(getVisualLanguageGuideForWing(
      currentWingId,
      selectedAvatar.selectedYearLevel,
      selectedAvatar.selectedCoursePathway,
    ));

    if (isSessionInitialized && !currentWingsState[currentWingId]?.isSolved) {
      isInitializingRef.current = false;
      setIsSessionInitialized(false);
      setCurrentObjectives([]);
      setWingImageLoadFailed(false);
      setArtworkModalOpen(false);
      onUpdateWingState(currentWingId, {
        image: undefined,
        imagePrompt: undefined,
        description: undefined,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherMode, selectedAvatar?.selectedYearLevel, selectedAvatar?.selectedCoursePathway, currentWingId]);

  const handlePlayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerInput.trim() || isCuratorThinking || isGeneratingWingArt || isGeneratingPlayerRequestedImage || currentWingsState[currentWingId]?.isSolved) return;

    const currentInputText = playerInput.trim(); 
    if (isCuratorGuidanceQuestion(currentInputText)) {
      onAppendNarrative({ speaker: 'player', text: currentInputText });
      setPlayerInput('');
      setLocalError(null);
      onAppendNarrative({ speaker: 'curator', text: CURATOR_GUIDANCE_QUESTION_PROMPT });
      return;
    }

    onAppendNarrative({ speaker: 'player', text: currentInputText });
    setPlayerInput(''); 
    setIsCuratorThinking(true);
    setLocalError(null);

    const lowercasedInput = currentInputText.toLowerCase();
    const newlyUsedVocab: string[] = [];

    visualLanguageTerms.forEach(term => {
        if (includesVocabularyTerm(lowercasedInput, term)) {
            if (!playerUsedVocabulary.includes(term) && !newlyUsedVocab.includes(term)) {
                newlyUsedVocab.push(term);
            }
        }
    });

    SUPPLEMENTAL_DESCRIPTIVE_TERMS.forEach(term => {
      if (includesVocabularyTerm(lowercasedInput, term)) {
          if (!playerUsedVocabulary.includes(term) && !newlyUsedVocab.includes(term)) {
              newlyUsedVocab.push(term);
          }
      }
    });

    const nextUsedVocabulary = [...new Set([...playerUsedVocabulary, ...newlyUsedVocab])];

    try {
      const currentLevelBeingPlayed = currentWingsState[currentWingId]?.currentQuestionLevel || 1;
      const currentPhase = toQuestionPhase(currentLevelBeingPlayed);
      const lowerInput = currentInputText.toLowerCase();
      const isPlayerImageRequest = lowerInput.startsWith("show me") || lowerInput.startsWith("generate an image of") || lowerInput.startsWith("create an image of");
      const existingPhaseResponses = currentWingLocalState?.phaseResponses || {};
      const updatedPhaseResponses: PhaseResponses = isPlayerImageRequest
        ? existingPhaseResponses
        : { ...existingPhaseResponses, [currentPhase]: currentInputText };
      let messageToAI = `Player input for ${currentWingDef?.name} (Phase ${currentLevelBeingPlayed}): "${currentInputText}"`;
      if (isPlayerImageRequest) {
        messageToAI += ` The player is requesting an image. Remember to guide them to 'Your Challenge' section if relevant after image generation.`;
      }

      const response = await sendMessageToChat(chat, messageToAI);
      const { 
        processedText: curatorResponseTextToDisplay, 
        imageRequest: playerImageGenDetails, 
        textAfterImageRequest: textAfterPlayerImgIfAny, 
        roomRecap: extractedRoomRecap,
        highestPhaseInResponse,
      } = processCuratorText(response.text, false);
      
      let mainCuratorTextToDisplay = curatorResponseTextToDisplay;
      const isPuzzleSolvedResponse = response.text.includes(MSG_TAG_PUZZLE_SOLVED);
      const isGameWonResponse = response.text.includes(MSG_TAG_GAME_WON);
      const advancedToNextPhase = !!highestPhaseInResponse && highestPhaseInResponse > currentLevelBeingPlayed;
      const shouldAwardProgressReward = !isPlayerImageRequest && (advancedToNextPhase || isPuzzleSolvedResponse || isGameWonResponse);
      const committedVocabulary = shouldAwardProgressReward ? nextUsedVocabulary : playerUsedVocabulary;
      const progressReward = shouldAwardProgressReward && playerStats
        ? calculateProgressReward(
            playerStats,
            currentInputText,
            currentPhase,
            selectedAvatar?.selectedYearLevel || 9,
            selectedAvatar?.selectedCoursePathway,
            newlyUsedVocab,
            isPuzzleSolvedResponse || isGameWonResponse
          )
        : null;

      if (playerImageGenDetails && playerImageGenDetails.prompt) {
        if (mainCuratorTextToDisplay) { 
             onAppendNarrative({ speaker: 'curator', text: mainCuratorTextToDisplay });
        }
        setIsGeneratingPlayerRequestedImage(true);
        setLocalError(null);
        const systemMessage = playerImageGenDetails.type === 'predefined' ? "The Curator is preparing a special exhibit..." : "The Curator is channeling your vision...";
        onAppendNarrative({ speaker: 'system', text: systemMessage });
        try {
            const finalImagePrompt = playerImageGenDetails.type === 'predefined' ? playerImageGenDetails.prompt : await generateImagePromptFromDescription(playerImageGenDetails.prompt); 
            const imageUrl = await generateImage(finalImagePrompt);
            setPlayerImageModalContent({ src: imageUrl, prompt: finalImagePrompt });
            setPlayerImageModalOpen(true);
            setPlayerImageGeneratedInThisWingSession(true);
            const successMessage = playerImageGenDetails.type === 'predefined' ? "The requested artwork is now on display!" : "Your artistic vision materializes!";
            onAppendNarrative({ speaker: 'system', text: successMessage });
        } catch (imgErr: any) {
            const baseMsg = playerImageGenDetails.type === 'predefined' ? "The gallery couldn't generate the requested artwork." : "The gallery couldn't quite capture your vision in an image.";
            const specificMessage = parseErrorMessageForQuota(imgErr, baseMsg);
            handleLocalError(specificMessage, imgErr); 
        } finally {
            setIsGeneratingPlayerRequestedImage(false);
        }
        mainCuratorTextToDisplay = textAfterPlayerImgIfAny || "";  
      }
      
      if (mainCuratorTextToDisplay) { 
          onAppendNarrative({ speaker: 'curator', text: mainCuratorTextToDisplay });
      }

      if (shouldAwardProgressReward && newlyUsedVocab.length > 0) {
        setPlayerUsedVocabulary(committedVocabulary);
      }

      if (progressReward) {
        onUpdatePlayerStats(progressReward.updatedStats);
        const rewardSummary = formatRewardSummary(progressReward);
        if (rewardSummary) {
          onAppendNarrative({ speaker: 'system', text: rewardSummary });
        }
      }
      
      const progressUpdates: Partial<WingState> = {};
      if (!isPlayerImageRequest) {
        progressUpdates.phaseResponses = updatedPhaseResponses;
      }
      if (highestPhaseInResponse && highestPhaseInResponse > (currentWingsState[currentWingId]?.currentQuestionLevel || 0)) {
        if (!response.text.includes(MSG_TAG_PUZZLE_SOLVED) && !response.text.includes(MSG_TAG_GAME_WON)) {
          progressUpdates.currentQuestionLevel = highestPhaseInResponse;
        }
      }
      if (Object.keys(progressUpdates).length > 0) {
        onUpdateWingState(currentWingId, progressUpdates);
      }

      if (!isPlayerImageRequest && advancedToNextPhase && !isPuzzleSolvedResponse && !isGameWonResponse) {
        onPhaseComplete?.();
      }

      const finalRoomId = WING_DEFINITIONS[WING_DEFINITIONS.length - 1].id;

      if ((isGameWonResponse || (isPuzzleSolvedResponse && currentWingId === finalRoomId))) {
        // For the final room, mark as solved at Phase 4.
        onRoomComplete?.();
        onUpdateWingState(currentWingId, { isSolved: true, currentQuestionLevel: 4, phaseResponses: updatedPhaseResponses}); 
         if (currentWingDef) {
              const gemIcon = currentWingDef.icon || '💎';
              const journalEntry: JournalEntry = {
                id: `${currentWingDef.id}-${Date.now()}`,
                wingId: currentWingDef.id,
                wingName: currentWingDef.name,
                artPrinciple: currentWingDef.artPrinciple,
                completedDate: new Date().toISOString(),
                mainArtworkImage: currentWingLocalState?.image,
                mainArtworkPrompt: currentWingLocalState?.imagePrompt,
                mainArtworkTitle: currentArtwork?.title,
                mainArtworkArtist: currentArtwork?.artistDisplay,
                playerReflection: updatedPhaseResponses[4] || currentInputText,
                phaseResponses: updatedPhaseResponses,
                visualLanguageLog: committedVocabulary, 
                gemIcon: gemIcon,
                roomRecap: extractedRoomRecap || "Player demonstrated great insight in this wing.",
                playerPersonalReflection: "",
              };
              onSaveJournalEntry(journalEntry);
            }
        onGameWon();
        setIsCuratorThinking(false);
        return; 
      }

      if (isPuzzleSolvedResponse) {
        // For regular wings, puzzle solved after Phase 4.
        onRoomComplete?.();
        onUpdateWingState(currentWingId, { isSolved: true, currentQuestionLevel: 4, phaseResponses: updatedPhaseResponses }); 
        
        if (currentWingDef) {
          const gemIcon = currentWingDef.icon || '💎';
          const journalEntry: JournalEntry = {
            id: `${currentWingDef.id}-${Date.now()}`,
            wingId: currentWingDef.id,
            wingName: currentWingDef.name,
            artPrinciple: currentWingDef.artPrinciple,
            completedDate: new Date().toISOString(),
            mainArtworkImage: currentWingLocalState?.image,
            mainArtworkPrompt: currentWingLocalState?.imagePrompt,
            mainArtworkTitle: currentArtwork?.title,
            mainArtworkArtist: currentArtwork?.artistDisplay,
            playerReflection: updatedPhaseResponses[4] || currentInputText,
            phaseResponses: updatedPhaseResponses,
            visualLanguageLog: committedVocabulary, 
            gemIcon: gemIcon,
            roomRecap: extractedRoomRecap || "Player explored the concepts of this wing thoroughly.",
            playerPersonalReflection: "",
          };
          onSaveJournalEntry(journalEntry);
        }

        const unlockedWingId = onUnlockNextWing(currentWingId);
        const nextWingDef = WING_DEFINITIONS.find(w => w.id === unlockedWingId);
        
        let stars = 2; 
        if (playerImageGeneratedInThisWingSession || currentWingLocalState?.image) { 
            stars = 3;
        }

        const feedbackTextForModal = mainCuratorTextToDisplay.replace(MSG_TAG_PUZZLE_SOLVED, "").trim() || "Excellent work!";
        
        setSummaryModalData({
            stars,
            feedback: feedbackTextForModal,
            vocabulary: committedVocabulary, 
            nextWingName: nextWingDef?.name,
            currentWingName: currentWingDef?.name || "Current Wing"
        });
        setShowSummaryModal(true);
      }

    } catch (err) {
      handleLocalError('The Curator seems momentarily lost in thought. Try again.', err);
    } finally {
      setIsCuratorThinking(false);
    }
  };
  
  useEffect(() => {
    if (narrativeLogRef.current) {
      narrativeLogRef.current.scrollTop = narrativeLogRef.current.scrollHeight;
    }
  }, [narrativeLog]);

  const wingImage = currentWingLocalState?.image;
  const isLoadingAnyNonAvatarImage = isGeneratingWingArt || isGeneratingPlayerRequestedImage;

  useEffect(() => {
    setWingImageLoadFailed(false);
    setArtworkModalOpen(false);
    setVisualGuideModalOpen(false);
  }, [currentWingId, wingImage]);
  
  const totalWings = WING_DEFINITIONS.length;
  const solvedWingsCount = WING_DEFINITIONS.filter(w => currentWingsState[w.id]?.isSolved).length;
  const isGameWonFromState = currentWingsState[WING_DEFINITIONS[WING_DEFINITIONS.length -1].id]?.isSolved;
  
  const isInputDisabled = isCuratorThinking || isLoadingAnyNonAvatarImage || isGeneratingAvatarPortrait || currentWingLocalState?.isSolved || isGameWonFromState || showSummaryModal || isFetchingGuideTerms;
  const activeObjectiveText = (() => {
    if (currentWingLocalState?.isSolved) return null;

    const activePhase = currentWingLocalState?.currentQuestionLevel;
    return currentObjectives.find(obj => {
      const phaseMatch = obj.match(/^(?:Phase|Level)\s*(\d+)/i);
      const objectivePhase = phaseMatch ? parseInt(phaseMatch[1], 10) : -1;
      return objectivePhase === activePhase;
    }) || null;
  })();
  const challengeCompleteText = "This wing's challenge is complete. Explore other wings or view your journal.";
  const dialogueChallengeText = currentWingLocalState?.isSolved ? challengeCompleteText : activeObjectiveText;

  useEffect(() => {
    const input = playerInputRef.current;
    if (!input) return;

    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 176)}px`;
  }, [playerInput]);


  const handleCloseSummaryModal = () => {
    setShowSummaryModal(false);
    onReturnToMap(); 
  };

  return (
    <div className="analysis-screen-shell flex h-screen max-w-full flex-col overflow-hidden p-[14px] text-gray-100">
      <header className="analysis-header relative z-10 grid h-[76px] shrink-0 px-2 pt-4">
        <div className="analysis-header-left relative z-20 flex min-w-0 items-center gap-3">
          <button
            onClick={onReturnToMap}
            className={`${ANALYSIS_PURPLE_BUTTON_CLASS} analysis-nav-button`}
            aria-label="Back to Gallery Map"
            disabled={showSummaryModal || isGameWonFromState}
          >
            <span aria-hidden="true">&larr;</span>
            <span>Return to Map</span>
          </button>
          <button
            onClick={onNavigateToGuide}
            className={`${ANALYSIS_BUTTON_CLASS} analysis-nav-button`}
            aria-label="Open Game Guide"
            disabled={showSummaryModal || isGameWonFromState}
          >
            Guide
          </button>
          <button
            onClick={onOpenGameMenu}
            className={`${ANALYSIS_BUTTON_CLASS} analysis-nav-button !min-w-[100px] px-3`}
            aria-label="Open game menu"
            disabled={showSummaryModal || isGameWonFromState}
          >
            <span aria-hidden="true">☰</span>
            <span>Menu</span>
          </button>
        </div>

        <div className="analysis-header-center pointer-events-none relative z-10 min-w-0 text-center">
          <h1 className="analysis-logo mx-auto">
            <span aria-hidden="true">✦</span> {currentWingDisplayName} <span aria-hidden="true">✦</span>
          </h1>

          {currentWingDef && (
            <div className="analysis-wing-pill mx-auto mt-2">
              <span aria-hidden="true">{currentWingDef.icon || '🎨'}</span>
              <span>{currentWingDef.artPrinciple.split(' - ')[0].trim()}</span>
            </div>
          )}
        </div>

        <div className="analysis-player-badge relative z-20 flex min-w-0 items-center justify-end gap-2" title={selectedAvatar ? `${selectedAvatar.name} - ${selectedAssessmentLabel}` : undefined}>
          {teacherMode && (
            <label className="flex min-h-8 shrink-0 items-center gap-1 rounded-md border border-amber-300/70 bg-[#2a1c35]/95 px-2 py-1 text-[9px] font-black uppercase text-amber-100 shadow-[0_2px_0_rgba(0,0,0,0.45)]">
              <span>Year</span>
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
                className="rounded-sm border border-amber-200/70 bg-[#10182d] px-1.5 py-0.5 text-[9px] font-black uppercase text-white outline-none focus:ring-4 focus:ring-amber-200"
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
          <span className="analysis-player-shield" aria-hidden="true">♦</span>
          {selectedAvatar && <span className="truncate">{selectedAvatar.name} ({selectedAssessmentLabel})</span>}
        </div>
      </header>

      <main className="analysis-main-grid relative z-10 grid min-h-0 flex-1 gap-[14px] overflow-hidden">
        <aside className={`${ANALYSIS_PANEL_CLASS} analysis-sidebar relative z-10 flex min-h-0 flex-col overflow-hidden p-3`}>
          <section className="analysis-sidebar-section">
            <h3 className={ANALYSIS_TITLE_CLASS}>Current Wing</h3>
            <div className="mt-3 flex items-center gap-2 text-lg text-gray-100">
              <span className="text-2xl" aria-hidden="true">{currentWingDef?.icon || '🎨'}</span>
              <span className="truncate" title={currentWingDisplayName}>{currentWingDisplayName}</span>
            </div>
            {currentWingLocalState?.isSolved && <p className="mt-2 text-xs italic text-green-300">Challenge Complete!</p>}
          </section>

          <section className="analysis-sidebar-section">
            <h3 className={ANALYSIS_TITLE_CLASS}>Progress</h3>
            <p className="mt-2 text-sm text-gray-300">{solvedWingsCount} / {totalWings} Wings Completed</p>
            <div className="analysis-progress-grid mt-2">
              {WING_DEFINITIONS.map(wing => {
                let progressStateClass = 'analysis-progress-locked';
                if (currentWingsState[wing.id]?.isSolved) progressStateClass = 'analysis-progress-complete';
                else if (currentWingsState[wing.id]?.isUnlocked) progressStateClass = 'analysis-progress-unlocked';
                if (wing.id === currentWingId && !currentWingsState[wing.id]?.isSolved) progressStateClass = 'analysis-progress-current';

                return <div key={wing.id} title={wing.name} className={`analysis-progress-cell ${progressStateClass}`}></div>;
              })}
            </div>
          </section>

          <section className="analysis-sidebar-section">
            <h3 className={ANALYSIS_TITLE_CLASS}>Your Challenge</h3>
            {(() => {
              if (currentWingLocalState?.isSolved) {
                return <p className="mt-2 text-sm italic text-green-300">{challengeCompleteText}</p>;
              }

              if (activeObjectiveText) {
                return (
                  <div className="analysis-challenge-card mt-3">
                    <p className="text-sm leading-relaxed text-gray-200">{activeObjectiveText}</p>
                  </div>
                );
              }

              return <p className="mt-2 text-sm italic text-gray-400">The Curator will outline your challenge.</p>;
            })()}
          </section>

          <section className="analysis-sidebar-section">
            <div className="analysis-guide-heading-row">
              <h3 className={ANALYSIS_TITLE_CLASS}>Visual Language Guide</h3>
              {visualLanguageGuide && (
                <button
                  type="button"
                  onClick={() => setVisualGuideModalOpen(true)}
                  className="analysis-button analysis-button-blue analysis-guide-enlarge-button"
                  aria-label="Open more help for Visual Language Guide"
                >
                  More Help
                </button>
              )}
            </div>
            {isFetchingGuideTerms && (
              <div className="mt-3 flex items-center text-sm italic text-gray-400">
                <LoadingSpinner size={4} color="text-purple-400" />
                <span className="ml-2">Finding inspiration...</span>
              </div>
            )}
            {!isFetchingGuideTerms && visualLanguageGuide && (
              <div className="analysis-visual-guide mt-2">
                {VISUAL_GUIDE_SECTION_META.map((section) => {
                  const items = visualLanguageGuide.sections[section.id].slice(0, section.limit);
                  if (items.length === 0) return null;

                  return (
                    <div key={section.id} className="analysis-guide-section">
                      <p className="analysis-guide-label">{section.label}</p>
                      {section.style === 'chips' ? (
                        <div className="analysis-guide-chips">
                          {items.map((term, index) => (
                            <span key={`${section.id}-${index}`} className="analysis-term-chip analysis-term-chip-compact" title={term}>
                              {term}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="analysis-guide-lines">
                          {items.map((line, index) => (
                            <p key={`${section.id}-${index}`} className="analysis-guide-line" title={line}>{line}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {!isFetchingGuideTerms && !visualLanguageGuide && <p className="mt-2 text-sm italic text-gray-400">No specific terms suggested at this moment.</p>}
          </section>

        </aside>

        <div className="analysis-content-grid grid min-h-0 gap-[14px] overflow-hidden">
          <section className="analysis-workspace-grid grid min-h-0 gap-[14px] overflow-hidden">
            <div className={`${ANALYSIS_PANEL_CLASS} analysis-dialogue-panel flex min-w-0 flex-col overflow-hidden`}>
              <div className="analysis-dialogue-top relative z-10 grid min-h-[112px] grid-cols-[108px_minmax(0,1fr)] gap-4 px-4 pt-3">
                <div className="analysis-curator-portrait overflow-hidden">
                  <img src={CURATOR_PORTRAIT_SRC} alt="The Curator" className="h-full w-full object-cover object-top" />
                </div>
                <div className="min-w-0">
                  <h2 className={`${ANALYSIS_TITLE_CLASS} mb-2`}>Curator's Dialogue</h2>
                  {dialogueChallengeText && (
                    <div className={`analysis-question-box max-h-[82px] overflow-y-auto narrative-scrollbar ${
                      currentWingLocalState?.isSolved ? 'analysis-question-complete' : ''
                    }`}>
                      <p className="mb-1 text-[10px] font-black uppercase text-[#f8c74c]">Current Question</p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-100">{dialogueChallengeText}</p>
                    </div>
                  )}
                </div>
              </div>

              <div ref={narrativeLogRef} className="analysis-log relative z-10 flex-1 space-y-3 overflow-y-auto px-4 py-3 narrative-scrollbar">
                {narrativeLog.length === 0 && (isCuratorThinking || isGeneratingWingArt) && (
                  <div className="flex h-full items-center justify-center"><LoadingSpinner /></div>
                )}
                {narrativeLog.map((entry) => {
                  const isSystemEntry = entry.speaker === 'system';
                  return (
                    <div
                      key={entry.id}
                      className={isSystemEntry ? 'analysis-system-message' : `analysis-message analysis-message-${entry.speaker}`}
                    >
                      {isSystemEntry && <span className="analysis-system-gem" aria-hidden="true">✦</span>}
                      <div className="min-w-0">
                        <p className="whitespace-pre-wrap">{entry.text}</p>
                        {!isSystemEntry && (
                          <p className="mt-1 text-xs opacity-75">
                            {entry.speaker === 'player' ? (selectedAvatar?.name || 'You') : 'Curator'} • {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(isCuratorThinking || isGeneratingWingArt || isGeneratingAvatarPortrait || isFetchingGuideTerms) && narrativeLog.length > 0 && (
                  <div className="flex justify-center py-1"><LoadingSpinner /></div>
                )}
                {localError && !isGeneratingWingArt && !isGeneratingPlayerRequestedImage && !isGeneratingAvatarPortrait && (
                  <p className="border border-red-700 bg-red-950/70 p-2 text-sm text-red-200">{localError}</p>
                )}
              </div>

              <div className="analysis-response-area relative z-10 px-4 pb-3">
                <form onSubmit={handlePlayerSubmit} className="analysis-response-form flex items-end gap-3">
                  <textarea
                    ref={playerInputRef}
                    value={playerInput}
                    onChange={(e) => setPlayerInput(e.target.value)}
                    onBeforeInput={handlePlayerInputBeforeInput}
                    onCopy={blockClipboardAction}
                    onCut={blockClipboardAction}
                    onDrop={blockClipboardAction}
                    onKeyDown={handlePlayerInputKeyDown}
                    onPaste={blockClipboardAction}
                    onContextMenu={blockClipboardAction}
                    placeholder={currentWingLocalState?.isSolved || isGameWonFromState ? 'Challenge complete. Return to Map.' : 'Your response...'}
                    rows={2}
                    className="analysis-response-input narrative-scrollbar"
                    disabled={isInputDisabled}
                    aria-label="Player input"
                  />
                  <button
                    type="submit"
                    className={`${ANALYSIS_PURPLE_BUTTON_CLASS} analysis-send-button`}
                    disabled={isInputDisabled || !playerInput.trim()}
                    aria-live="polite"
                  >
                    Send
                  </button>
                </form>
                <div className="mt-1 h-4 text-center" aria-live="polite">
                  {clipboardNotice ? (
                    <span className="text-xs font-semibold text-amber-300">{clipboardNotice}</span>
                  ) : (isCuratorThinking || isLoadingAnyNonAvatarImage || isGeneratingAvatarPortrait || isFetchingGuideTerms) && (
                    <span className="text-xs italic text-gray-400">
                      {isCuratorThinking ? 'Curator is thinking...' :
                       isGeneratingWingArt ? 'Conjuring wing artwork...' :
                       isGeneratingAvatarPortrait ? 'Sketching avatar...' :
                       isGeneratingPlayerRequestedImage ? 'Revealing your vision...' :
                       isFetchingGuideTerms ? 'Curator is suggesting some words...' : ''}
                    </span>
                  )}
                </div>
                <div className="text-xs italic text-gray-500">Use the Visual Language Guide for inspiration!</div>
              </div>
            </div>

            <div className={`${ANALYSIS_PANEL_CLASS} analysis-canvas-panel relative flex min-w-0 flex-col overflow-hidden`}>
              <div className="relative z-10 flex items-start justify-between px-5 pt-4">
                <h2 className={ANALYSIS_TITLE_CLASS}>Visual Canvas</h2>
                {wingImage && !wingImageLoadFailed && !(localError && localError.includes('artwork for ' + currentWingDef?.name)) && (
                  <button
                    type="button"
                    onClick={() => setArtworkModalOpen(true)}
                    className={`${ANALYSIS_BUTTON_CLASS} analysis-enlarge-button`}
                    aria-label="Enlarge artwork"
                  >
                    Enlarge
                  </button>
                )}
              </div>

              <div className="analysis-canvas-body relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-hidden px-5 pb-2 pt-2">
                {isGeneratingWingArt && !wingImage && (
                  <div className="text-center">
                    <LoadingSpinner size={10} />
                    <p className="mt-2 text-sm text-gray-400">Conjuring the wing's artwork...</p>
                  </div>
                )}
                {!isGeneratingWingArt && !wingImage && !isGeneratingPlayerRequestedImage && !localError && (
                  <div className="text-md italic text-gray-500">The central artwork is yet to be revealed...</div>
                )}
                {wingImage && !wingImageLoadFailed && !(localError && localError.includes('artwork for ' + currentWingDef?.name)) && (
                  <figure className="analysis-artwork-figure flex h-full w-full min-w-0 flex-col items-center justify-center">
                    <div className="analysis-artwork-mat">
                      <img
                        src={wingImage}
                        alt={`${currentArtwork?.title || currentWingDef?.name || 'ArtQuest'} artwork`}
                        className="analysis-artwork-image"
                        onError={() => setWingImageLoadFailed(true)}
                      />
                    </div>
                    {currentArtwork && (
                      <figcaption className="analysis-artwork-caption">
                        <span className="block font-semibold text-gray-100" title={currentArtwork.title}>'{currentArtwork.title}'</span>
                        <span className="block" title={currentArtwork.artistDisplay}>{currentArtwork.artistDisplay || 'Artist unknown'}</span>
                        <span className="block" title={`${currentArtwork.dateDisplay} · ${currentArtwork.mediumDisplay}`}>
                          {currentArtwork.dateDisplay || 'Date unknown'} • {currentArtwork.mediumDisplay || 'Medium unknown'}
                        </span>
                      </figcaption>
                    )}
                  </figure>
                )}
                {wingImageLoadFailed && !isGeneratingPlayerRequestedImage && (
                  <div className="max-w-sm border border-yellow-700/50 bg-yellow-950/30 p-3 text-center text-sm text-yellow-300">
                    The selected artwork image could not be displayed. Refresh after the artwork files have been rebuilt.
                  </div>
                )}
                {localError && (localError.includes('artwork for ' + currentWingDef?.name) || (localError.includes('quota') && !wingImage)) && (
                  <p className="p-2 text-center text-sm text-yellow-400">{localError.includes('quota') || localError.includes('Quota') ? localError : 'Central artwork could not be loaded.'}</p>
                )}
                {isGeneratingPlayerRequestedImage && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/85">
                    <LoadingSpinner size={10} />
                    <p className="mt-2 text-sm text-gray-400">Revealing player's vision...</p>
                  </div>
                )}
              </div>

              <div className="relative z-10 px-5 pb-3 text-center">
                <p className="text-xs italic text-gray-500">Analyze the main artwork based on the Curator's objective.</p>
              </div>
            </div>
          </section>

          <section className={`${ANALYSIS_PANEL_CLASS} analysis-bottom-panel grid min-h-0 gap-[14px] overflow-hidden p-3`}>
            <div className={`${ANALYSIS_INNER_PANEL_CLASS} analysis-avatar-panel flex min-h-0 flex-col items-center overflow-hidden p-2 text-center`}>
              <h3 className={`${ANALYSIS_TITLE_CLASS} mb-1 text-center text-xs`}>Your Avatar</h3>
              {isGeneratingAvatarPortrait && (
                <div className="flex h-full flex-col items-center justify-center">
                  <LoadingSpinner size={6} />
                  <p className="mt-1 text-xs text-gray-400">Creating portrait...</p>
                </div>
              )}
              {!isGeneratingAvatarPortrait && avatarImageError &&
                <div className="flex h-full flex-col items-center justify-center">
                  <p className="p-1 text-center text-xs text-red-400">{avatarImageError}</p>
                  {selectedAvatar && (
                    <div className={`mt-1 flex h-12 w-12 items-center justify-center border-2 border-pink-400/50 shadow-lg ${selectedAvatar.colorClass}`}>
                      <span className="text-2xl font-bold text-white">{selectedAvatar.iconInitial}</span>
                    </div>
                  )}
                </div>
              }
              {!isGeneratingAvatarPortrait && !avatarImageError && shouldUseLayeredAvatar && (
                <AvatarLayeredPreview
                  imageUrls={avatarLayerImageUrls}
                  alt={`${selectedAvatar?.name || 'Artist'} avatar portrait`}
                  className="mb-1 h-12 w-11 bg-transparent shadow-lg"
                />
              )}
              {!isGeneratingAvatarPortrait && !avatarImageError && !shouldUseLayeredAvatar && avatarDisplayImageUrl && (
                <img
                  src={avatarDisplayImageUrl}
                  alt={`${selectedAvatar?.name || 'Artist'} avatar portrait`}
                  className={`${shouldPixelateAvatarImage ? 'h-12 w-11 bg-transparent object-contain' : 'h-12 w-12 border-2 border-pink-400 bg-gray-900 object-cover object-top'} mb-1 shadow-lg`}
                  style={{
                    imageRendering: shouldPixelateAvatarImage ? 'pixelated' : 'auto',
                    objectPosition: shouldPixelateAvatarImage ? 'center bottom' : 'center 14%',
                  }}
                />
              )}
              {!isGeneratingAvatarPortrait && !avatarImageError && !avatarDisplayImageUrl && selectedAvatar && (
                <div className={`mb-1 flex h-12 w-12 items-center justify-center border-2 border-pink-400 shadow-lg ${selectedAvatar.colorClass}`}>
                  <span className="text-2xl font-bold text-white">{selectedAvatar.iconInitial}</span>
                </div>
              )}
              {selectedAvatar && !isGeneratingAvatarPortrait && (
                <>
                  <p className="analysis-avatar-name mt-0.5 w-full text-[11px] font-semibold leading-tight text-pink-200" title={selectedAvatar.name}>{selectedAvatar.name}</p>
                  <p className="w-full text-[9px] leading-tight text-gray-200" title={selectedAssessmentLabel}>{selectedAssessmentLabel}</p>
                  {teacherMode && (
                    <p className="analysis-avatar-mode mt-0.5 w-full border border-blue-500/60 bg-[#101a46] px-1 py-0 text-[8px] uppercase leading-tight text-blue-100">Gallery Preview Mode</p>
                  )}
                  <p className="analysis-avatar-title mt-0.5 w-full text-[8px] leading-tight text-gray-400" title={selectedAvatar.title}>{selectedAvatar.title}</p>
                </>
              )}
            </div>

            <div className={`${ANALYSIS_INNER_PANEL_CLASS} min-w-0 overflow-hidden`}>
              <PlayerStatsDisplay playerStats={playerStats} />
            </div>
          </section>
        </div>
      </main>
      
      <Modal 
        isOpen={playerImageModalOpen && playerImageModalContent !== null} 
        title="Artistic Vision Materialized"
        onClose={() => setPlayerImageModalOpen(false)}
      >
        {playerImageModalContent && (
          <div>
            <img src={playerImageModalContent.src} alt={playerImageModalContent.prompt} className="max-h-[60vh] max-w-full object-contain rounded mx-auto mb-2"/>
            <p className="text-sm text-gray-400 italic text-center">Prompt: "{playerImageModalContent.prompt}"</p>
          </div>
        )}
      </Modal>
      <Modal
        isOpen={artworkModalOpen && !!wingImage && !wingImageLoadFailed}
        title={currentArtwork?.title || 'Artwork'}
        onClose={() => setArtworkModalOpen(false)}
        size="xl"
      >
        {wingImage && (
          <figure className="analysis-enlarged-artwork">
            <div className="analysis-enlarged-artwork-frame">
              <img
                src={wingImage}
                alt={`${currentArtwork?.title || currentWingDef?.name || 'ArtQuest'} enlarged artwork`}
                className="analysis-enlarged-artwork-image"
              />
            </div>
            {currentArtwork && (
              <figcaption className="analysis-enlarged-artwork-caption">
                <p className="font-semibold text-gray-100">{currentArtwork.title}</p>
                <p>{currentArtwork.artistDisplay || 'Artist unknown'}</p>
                <p>{currentArtwork.dateDisplay || 'Date unknown'} · {currentArtwork.mediumDisplay || 'Medium unknown'}</p>
              </figcaption>
            )}
          </figure>
        )}
      </Modal>
      <Modal
        isOpen={visualGuideModalOpen && !!visualLanguageGuide}
        title={visualLanguageGuide ? `More Help: ${visualLanguageGuide.help.title}` : 'More Help'}
        onClose={() => setVisualGuideModalOpen(false)}
        size="xl"
      >
        {visualLanguageGuide && (
          <div className="analysis-guide-help-modal">
            <section className="analysis-guide-help-section analysis-guide-definition-section">
              <h3 className="analysis-guide-modal-label">What is {visualLanguageGuide.help.title}?</h3>
              <p className="analysis-guide-help-definition">{visualLanguageGuide.help.definition}</p>
            </section>

            <section className="analysis-guide-help-section analysis-guide-words-section">
              <h3 className="analysis-guide-modal-label">Descriptive words</h3>
              <div className="analysis-guide-modal-chips">
                {visualLanguageGuide.help.descriptiveWords.map((term, index) => (
                  <span key={`help-word-${index}`} className="analysis-term-chip" title={term}>
                    {term}
                  </span>
                ))}
              </div>
            </section>

            {visualLanguageGuide.help.practiceImageSrc && (
              <section className="analysis-guide-help-section analysis-guide-practice-section">
                <h3 className="analysis-guide-modal-label">Spot it in a practice image</h3>
                <figure className="analysis-guide-practice-figure">
                  <div className="analysis-guide-practice-image-wrap">
                    <img
                      src={visualLanguageGuide.help.practiceImageSrc}
                      alt={visualLanguageGuide.help.practiceImageAlt || `${visualLanguageGuide.help.title} practice image`}
                      className="analysis-guide-practice-image"
                    />
                    {visualLanguageGuide.help.practiceLabels.map((label, index) => (
                      <span
                        key={`practice-label-${index}`}
                        className="analysis-guide-practice-label"
                        style={{
                          left: `${label.x}%`,
                          top: `${label.y}%`,
                          transform: getPracticeLabelTransform(label.anchorX, label.anchorY),
                        }}
                      >
                        <span className="analysis-guide-practice-label-dot" aria-hidden="true"></span>
                        {label.text}
                      </span>
                    ))}
                  </div>
                </figure>
              </section>
            )}

            <section className="analysis-guide-help-section analysis-guide-prompts-section">
              <h3 className="analysis-guide-modal-label">Try it yourself</h3>
              <div className="analysis-guide-modal-lines">
                {visualLanguageGuide.help.tryItYourselfPrompts.map((prompt, index) => (
                  <p key={`try-prompt-${index}`} className="analysis-guide-modal-line">{prompt}</p>
                ))}
              </div>
            </section>
          </div>
        )}
      </Modal>
      {summaryModalData && (
        <PostLevelSummaryModal
            isOpen={showSummaryModal}
            onClose={handleCloseSummaryModal}
            stars={summaryModalData.stars}
            feedback={summaryModalData.feedback}
            vocabulary={summaryModalData.vocabulary} 
            nextWingName={summaryModalData.nextWingName}
            currentWingName={summaryModalData.currentWingName}
        />
      )}
       <Modal 
        isOpen={isGameWonFromState && !showSummaryModal} 
        title="Congratulations!"
        onClose={() => onNavigateToJournalEntry(WING_DEFINITIONS[WING_DEFINITIONS.length - 1].id)} 
        >
            <p className="mb-4">You've mastered all the Gallery's secrets and proven your artistic insight in the Final Room! Your journey as an artist continues, enriched by this experience.</p>
            <button onClick={() => onNavigateToJournalEntry(WING_DEFINITIONS[WING_DEFINITIONS.length - 1].id)} className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-400">
            View Final Journal Entry &amp; Conclude
            </button>
      </Modal>
    </div>
  );
};

export const MainGame = MainGameComponent;
export default MainGameComponent;
