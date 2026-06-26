import { WING_DEFINITIONS, MSG_TAG_GENERATE_PLAYER_IMAGE, MSG_TAG_GENERATE_PREDEFINED_IMAGE, MSG_TAG_GAME_WON, MSG_TAG_PUZZLE_SOLVED } from '../constants';
import { OFFLINE_WING_CONTENT, getOfflinePhaseTask, getOfflineWingImagePrompt } from '../data/OfflineCurator';
import { getArtworkAssetPath, parseArtworkPrompt, YEAR_ARTWORK_PROFILES } from '../data/ArtworkLibrary';
import {
  CAUSE_EFFECT_MARKERS,
  EVIDENCE_MARKERS,
  INTERPRETIVE_MARKERS,
  JUDGEMENT_MARKERS,
  LOCATION_MARKERS,
  REFLECTION_MARKERS,
  VIEWER_PATHWAY_MARKERS,
  VISIBLE_DETAIL_MARKERS,
  VISUAL_EFFECT_MARKERS,
  getVisualLanguageGuideForWing,
} from '../data/VisualLanguageGuide';
import { Chat, SeniorCoursePathway, YearLevel } from "../types";

type GenerateContentResponse = { text: string };

interface OfflineChat extends Chat {
  currentWingId: string | null;
  currentPhase: number;
  selectedYearLevel: YearLevel;
  selectedCoursePathway?: SeniorCoursePathway;
}

const PHASE_NAMES: Record<number, string> = {
  1: 'See',
  2: 'Think',
  3: 'Interpret',
  4: 'Reflect',
};

const normalizeText = (value: string): string => value
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const wordCount = (value: string): number => value.trim().split(/\s+/).filter(Boolean).length;

type OfflineResponseYearBand = 'junior' | 'middle' | 'senior';

type PhaseExpectation = {
  minWords: number;
  minSentences: number;
};

type AnswerQuality = PhaseExpectation & {
  wordCount: number;
  sentenceCount: number;
  missing: string[];
  score: number;
  maxScore: number;
  passed: boolean;
};

const RESPONSE_EXPECTATIONS: Record<OfflineResponseYearBand, Record<number, PhaseExpectation>> = {
  junior: {
    1: { minWords: 12, minSentences: 1 },
    2: { minWords: 16, minSentences: 1 },
    3: { minWords: 18, minSentences: 2 },
    4: { minWords: 24, minSentences: 2 },
  },
  middle: {
    1: { minWords: 20, minSentences: 2 },
    2: { minWords: 28, minSentences: 2 },
    3: { minWords: 34, minSentences: 2 },
    4: { minWords: 45, minSentences: 3 },
  },
  senior: {
    1: { minWords: 30, minSentences: 2 },
    2: { minWords: 42, minSentences: 3 },
    3: { minWords: 52, minSentences: 3 },
    4: { minWords: 70, minSentences: 4 },
  },
};

const getOfflineResponseYearBand = (yearLevel: YearLevel): OfflineResponseYearBand => {
  if (yearLevel >= 11) return 'senior';
  if (yearLevel >= 9) return 'middle';
  return 'junior';
};

const escapeOfflineRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const containsTerm = (normalized: string, term: string): boolean => {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return false;
  const termPattern = escapeOfflineRegExp(normalizedTerm).replace(/\s+/g, '\\s+');
  return new RegExp(`(^|\\s)${termPattern}(\\s|$)`, 'u').test(normalized);
};

const containsAnyTerm = (normalized: string, terms: string[]): boolean =>
  terms.some((term) => containsTerm(normalized, term));

const countSentenceLikeUnits = (value: string): number => {
  const punctuatedSentences = value
    .split(/[.!?]+|\n+/)
    .map((part) => part.trim())
    .filter((part) => wordCount(part) >= 4).length;

  if (punctuatedSentences > 0) return punctuatedSentences;
  return wordCount(value) >= 4 ? 1 : 0;
};

const findWingIdInMessage = (message: string): string => {
  const normalizedMessage = normalizeText(message);
  const found = WING_DEFINITIONS.find((wing) => normalizedMessage.includes(normalizeText(wing.name)));
  return found?.id || WING_DEFINITIONS[0].id;
};

const getYearLevelFromMessage = (message: string, fallback: YearLevel): YearLevel => {
  const match = message.match(/Year\s*(7|8|9|10|11|12)/i);
  if (!match) return fallback;
  const year = Number(match[1]);
  return ([7, 8, 9, 10, 11, 12].includes(year) ? year : fallback) as YearLevel;
};

const getCoursePathwayFromMessage = (
  message: string,
  fallback?: SeniorCoursePathway
): SeniorCoursePathway | undefined => {
  if (/\bATAR\b/i.test(message)) return 'atar';
  if (/\bGeneral\b/i.test(message)) return 'general';
  return fallback;
};

const getPhaseFromMessage = (message: string, fallback = 1): number => {
  const phase = Number(message.match(/Phase\s*(\d+)/i)?.[1] || fallback);
  return Math.max(1, Math.min(4, phase));
};

const objectiveTag = (phase: number, task: string): string =>
  `[OBJECTIVE]Phase ${phase} (${PHASE_NAMES[phase]}): ${task}[/OBJECTIVE]`;

const getWingFocus = (wingId: string): string => {
  const wing = WING_DEFINITIONS.find((item) => item.id === wingId);
  return wing?.artPrinciple.split(' - ')[0].trim() || 'this art concept';
};

const buildIntroResponse = (
  wingId: string,
  phase: number,
  includeImageRequest: boolean,
  yearLevel: YearLevel,
  coursePathway?: SeniorCoursePathway
): string => {
  const wing = WING_DEFINITIONS.find((item) => item.id === wingId) || WING_DEFINITIONS[0];
  const content = OFFLINE_WING_CONTENT[wingId];
  const task = getOfflinePhaseTask(wingId, phase, yearLevel, coursePathway);

  if (includeImageRequest) {
    return `${content.intro} ${MSG_TAG_GENERATE_PREDEFINED_IMAGE} Prompt: ${getOfflineWingImagePrompt(wingId, yearLevel)} ${objectiveTag(1, getOfflinePhaseTask(wingId, 1, yearLevel, coursePathway))} Your current task is in the Your Challenge section.`;
  }

  return `Welcome back to ${wing.name}. ${objectiveTag(phase, task)} Check the Your Challenge section, then continue when ready.`;
};

const extractPlayerInput = (message: string): string => {
  const match = message.match(/Player input for .*?\(Phase\s*\d+\):\s*"([\s\S]*)"/i);
  return match?.[1]?.trim() || message.trim();
};

const isImageRequest = (input: string): boolean => {
  const lower = input.toLowerCase();
  return lower.startsWith('show me') || lower.startsWith('generate an image of') || lower.startsWith('create an image of');
};

const cleanImagePrompt = (input: string, wingId: string): string => {
  const cleaned = input
    .replace(/^(show me|generate an image of|create an image of)\s*/i, '')
    .trim();
  return cleaned || `an artwork exploring ${getWingFocus(wingId)}`;
};

type ResponseCategoryCheck = {
  label: string;
  matched: boolean;
  weight: number;
};

const getScoreRatio = (
  yearLevel: YearLevel,
  coursePathway?: SeniorCoursePathway
): number => {
  if (yearLevel >= 11 && coursePathway === 'atar') return 0.86;
  if (yearLevel >= 11) return 0.78;
  if (yearLevel >= 9) return 0.68;
  return 0.58;
};

const hasFirstPersonReflection = (normalized: string): boolean =>
  containsAnyTerm(normalized, ['i', 'my', 'me']) &&
  containsAnyTerm(normalized, ['think', 'feel', 'learned', 'learnt', 'noticed', 'understand', 'opinion', 'judgement']);

const getPhaseCategoryChecks = (
  normalized: string,
  wingId: string,
  phase: number,
  yearLevel: YearLevel,
  coursePathway: SeniorCoursePathway | undefined,
  sentenceCount: number
): ResponseCategoryCheck[] => {
  const guide = getVisualLanguageGuideForWing(wingId, yearLevel, coursePathway);
  const content = OFFLINE_WING_CONTENT[wingId];
  const artTerms = uniqTerms([
    guide.focus,
    content?.focus || '',
    ...guide.vocabulary,
    ...guide.phaseMarkers[Math.max(1, Math.min(4, phase)) as 1 | 2 | 3 | 4],
  ]);
  const seeTerms = uniqTerms([
    ...VISIBLE_DETAIL_MARKERS,
    ...guide.sections.wordsForWhatYouSee,
  ]);
  const howItWorksTerms = uniqTerms([
    ...VISUAL_EFFECT_MARKERS,
    ...guide.sections.wordsForHowItWorks,
  ]);
  const viewerTerms = uniqTerms([
    ...VIEWER_PATHWAY_MARKERS,
    'attention', 'mood', 'depth', 'movement', 'focus', 'focal point',
  ]);
  const meaningTerms = uniqTerms([
    ...INTERPRETIVE_MARKERS,
    ...guide.sections.wordsForMeaningMood,
  ]);
  const judgementTerms = uniqTerms([
    ...JUDGEMENT_MARKERS,
    ...guide.sections.wordsForJudgingSuccess,
  ]);
  const evidenceTerms = uniqTerms([
    ...EVIDENCE_MARKERS,
    ...LOCATION_MARKERS,
    ...seeTerms,
  ]);

  const hasArtTerm = containsAnyTerm(normalized, artTerms);
  const hasVisibleDetail = containsAnyTerm(normalized, seeTerms);
  const hasLocationEvidence = containsAnyTerm(normalized, LOCATION_MARKERS);
  const hasViewerPathwayOrResponse = containsAnyTerm(normalized, viewerTerms);
  const hasVisualEffect = containsAnyTerm(normalized, howItWorksTerms) || (hasViewerPathwayOrResponse && hasArtTerm);
  const hasCauseEffect = containsAnyTerm(normalized, CAUSE_EFFECT_MARKERS);
  const hasMeaningMoodStory = containsAnyTerm(normalized, meaningTerms);
  const hasInterpretiveLanguage = containsAnyTerm(normalized, INTERPRETIVE_MARKERS);
  const hasVisualEvidence = containsAnyTerm(normalized, evidenceTerms) || (hasArtTerm && hasVisibleDetail);
  const hasJudgement = containsAnyTerm(normalized, judgementTerms);
  const hasReason = hasCauseEffect || containsAnyTerm(normalized, ['reason', 'reasons', 'why', 'as', 'since']);
  const hasReflection = containsAnyTerm(normalized, REFLECTION_MARKERS) || hasFirstPersonReflection(normalized);

  switch (phase) {
    case 1:
      return [
        { label: 'visible visual detail', matched: hasVisibleDetail, weight: 1 },
        { label: 'where the detail appears in the artwork', matched: hasLocationEvidence, weight: 0.9 },
        { label: `a relevant ${guide.focus} art term`, matched: hasArtTerm, weight: 1 },
        { label: 'a complete sentence', matched: sentenceCount >= 1, weight: 0.8 },
      ];
    case 2:
      return [
        { label: `a relevant ${guide.focus} art term`, matched: hasArtTerm, weight: 1 },
        { label: 'the visual effect created by the artist', matched: hasVisualEffect, weight: 1 },
        { label: 'how it guides attention, mood, depth, movement, or the viewer pathway', matched: hasViewerPathwayOrResponse, weight: 1 },
        { label: 'a cause-and-effect explanation', matched: hasCauseEffect, weight: 0.9 },
      ];
    case 3:
      return [
        { label: 'a meaning, mood, story, or symbolic idea', matched: hasMeaningMoodStory, weight: 1 },
        { label: 'visual evidence from the artwork', matched: hasVisualEvidence, weight: 1 },
        { label: 'interpretive language such as suggests, might mean, represents, or symbolises', matched: hasInterpretiveLanguage, weight: 0.9 },
      ];
    case 4:
    default:
      return [
        { label: 'a clear judgement about success or effectiveness', matched: hasJudgement, weight: 1 },
        { label: 'visual evidence from the artwork', matched: hasVisualEvidence, weight: 1 },
        { label: 'a reason that explains why', matched: hasReason, weight: 0.9 },
        { label: 'your own reflection or informed response', matched: hasReflection, weight: 0.8 },
      ];
  }
};

const uniqTerms = (items: string[]): string[] =>
  Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const analyzeAnswerQuality = (
  input: string,
  wingId: string,
  phase: number,
  yearLevel: YearLevel,
  coursePathway?: SeniorCoursePathway
): AnswerQuality => {
  const normalized = normalizeText(input);
  const baseExpectation = RESPONSE_EXPECTATIONS[getOfflineResponseYearBand(yearLevel)][phase] || RESPONSE_EXPECTATIONS.middle[1];
  const expectation = yearLevel >= 11 && coursePathway === 'atar'
    ? { minWords: baseExpectation.minWords + 8, minSentences: baseExpectation.minSentences + (phase >= 2 ? 1 : 0) }
    : baseExpectation;
  const count = wordCount(input);
  const sentenceCount = countSentenceLikeUnits(input);
  const missing: string[] = [];

  if (!normalized || ['idk', 'i don t know', 'dunno', 'no idea'].includes(normalized)) {
    return {
      ...expectation,
      wordCount: count,
      sentenceCount,
      missing: ['a complete answer in your own words'],
      score: 0,
      maxScore: 1,
      passed: false,
    };
  }

  const checks = getPhaseCategoryChecks(normalized, wingId, phase, yearLevel, coursePathway, sentenceCount);
  const score = checks.reduce((total, check) => total + (check.matched ? check.weight : 0), 0);
  const maxScore = checks.reduce((total, check) => total + check.weight, 0);
  const requiredScore = maxScore * getScoreRatio(yearLevel, coursePathway);
  const hasCategoryDepth = score >= requiredScore;
  const compactAnswerFloor = phase <= 2 ? 5 : Math.ceil(expectation.minWords * 0.45);
  const hasEnoughLength = count >= expectation.minWords || (hasCategoryDepth && count >= compactAnswerFloor);
  const hasEnoughSentenceShape = sentenceCount >= expectation.minSentences || (hasCategoryDepth && sentenceCount >= 1);
  const passed = hasCategoryDepth && hasEnoughLength && hasEnoughSentenceShape;

  if (!passed) {
    checks
      .filter((check) => !check.matched)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .forEach((check) => missing.push(check.label));

    if (!hasEnoughLength && count < expectation.minWords) {
      missing.push(`a fuller explanation with about ${expectation.minWords}+ words`);
    }
    if (!hasEnoughSentenceShape && sentenceCount < expectation.minSentences) {
      missing.push(`${expectation.minSentences} full sentence${expectation.minSentences === 1 ? '' : 's'}`);
    }
  }

  return {
    ...expectation,
    wordCount: count,
    sentenceCount,
    missing,
    score,
    maxScore,
    passed,
  };
};

const isAnswerSatisfactory = (quality: AnswerQuality): boolean => quality.passed;

const encouragementForPhase = (phase: number): string => {
  switch (phase) {
    case 1:
      return "Good description. Now look at how those choices work together.";
    case 2:
      return "Strong analysis. Now move from visual effects into possible meaning.";
    case 3:
      return "Thoughtful interpretation. One reasoned judgement will claim this gem.";
    default:
      return "Your judgement shows the gem's idea has settled into your thinking.";
  }
};

const needsMoreResponse = (
  wingId: string,
  phase: number,
  yearLevel: YearLevel,
  quality: AnswerQuality,
  coursePathway?: SeniorCoursePathway
): string => {
  const nextSteps = quality.missing.slice(0, 3).join(', ');
  const sentenceTarget = `${quality.minSentences} full sentence${quality.minSentences === 1 ? '' : 's'}`;
  const wordTarget = `around ${quality.minWords}+ words`;
  const target = nextSteps || `${sentenceTarget} and ${wordTarget}`;

  return `Good start. Add ${target} so I can see your thinking clearly. Aim for ${sentenceTarget} and ${wordTarget}. ${objectiveTag(phase, getOfflinePhaseTask(wingId, phase, yearLevel, coursePathway))}`;
};

const buildPlayerResponse = (chat: OfflineChat, message: string): string => {
  const wingId = findWingIdInMessage(message) || chat.currentWingId || WING_DEFINITIONS[0].id;
  const content = OFFLINE_WING_CONTENT[wingId];
  const input = extractPlayerInput(message);
  const phase = getPhaseFromMessage(message, chat.currentPhase || 1);
  chat.currentWingId = wingId;
  chat.currentPhase = phase;

  if (isImageRequest(input)) {
    const prompt = cleanImagePrompt(input, wingId);
    return `I can sketch that as a side exhibit. ${MSG_TAG_GENERATE_PLAYER_IMAGE} Description: ${prompt} ${objectiveTag(phase, getOfflinePhaseTask(wingId, phase, chat.selectedYearLevel, chat.selectedCoursePathway))} Feel free to discuss it, or continue with your current challenge.`;
  }

  const quality = analyzeAnswerQuality(input, wingId, phase, chat.selectedYearLevel, chat.selectedCoursePathway);
  if (!isAnswerSatisfactory(quality)) {
    return needsMoreResponse(wingId, phase, chat.selectedYearLevel, quality, chat.selectedCoursePathway);
  }

  if (phase < 4) {
    const nextPhase = phase + 1;
    chat.currentPhase = nextPhase;
    return `${encouragementForPhase(phase)} ${objectiveTag(nextPhase, getOfflinePhaseTask(wingId, nextPhase, chat.selectedYearLevel, chat.selectedCoursePathway))} Check Your Challenge for the next step.`;
  }

  const finalRoomId = WING_DEFINITIONS[WING_DEFINITIONS.length - 1].id;
  const solvedText = `The Curator smiles. "You've shown insight worthy of this gem." ${MSG_TAG_PUZZLE_SOLVED} [ROOM_RECAP]Player explored ${content.recapFocus} through See, Think, Interpret, and Reflect, completing the wing with description, analysis, interpretation, and a reasoned judgement.[/ROOM_RECAP]`;
  return wingId === finalRoomId
    ? `${solvedText} ${MSG_TAG_GAME_WON}`
    : solvedText;
};

export const initializeChat = (): Chat => {
  const chat: OfflineChat = {
    currentWingId: null,
    currentPhase: 1,
    selectedYearLevel: 9,
    async sendMessage(input: { message: string } | string): Promise<GenerateContentResponse> {
      const message = typeof input === 'string' ? input : input.message;
      const isPlayerTurn = /^Player input for/i.test(message);

      this.currentWingId = findWingIdInMessage(message);
      this.currentPhase = getPhaseFromMessage(message, this.currentPhase);
      this.selectedYearLevel = getYearLevelFromMessage(message, this.selectedYearLevel);
      this.selectedCoursePathway = getCoursePathwayFromMessage(message, this.selectedCoursePathway);

      const text = isPlayerTurn
        ? buildPlayerResponse(this, message)
        : buildIntroResponse(this.currentWingId, this.currentPhase, !message.includes('main artwork is already displayed'), this.selectedYearLevel, this.selectedCoursePathway);

      return { text };
    },
  };

  return chat;
};

export const sendMessageToChat = async (chat: Chat, message: string): Promise<GenerateContentResponse> => {
  return chat.sendMessage({ message });
};

export const generateImagePromptFromDescription = async (description: string): Promise<string> => {
  return description.trim().slice(0, 180) || 'an imaginative ArtQuest gallery scene';
};

const hashString = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
};

const drawWrappedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) => {
  const words = text.split(/\s+/);
  let line = '';
  let linesDrawn = 0;

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      if (linesDrawn < maxLines) ctx.fillText(line, x, y + linesDrawn * lineHeight);
      linesDrawn += 1;
      line = word;
    } else {
      line = testLine;
    }
  });

  if (line && linesDrawn < maxLines) {
    ctx.fillText(line, x, y + linesDrawn * lineHeight);
  }
};

type SeededRandom = () => number;

const createSeededRandom = (seed: number): SeededRandom => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const withAlpha = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const ARTWORK_PALETTES: Record<string, string[]> = {
  hall_of_line: ['#f8f4e8', '#111827', '#6b7280', '#b45309', '#d97706'],
  realm_of_colour: ['#fff7ed', '#dc2626', '#f59e0b', '#2563eb', '#14b8a6', '#7c3aed'],
  shape_form_forge: ['#1f1b16', '#f97316', '#facc15', '#94a3b8', '#f5f5f4', '#7c2d12'],
  texture_tower: ['#2f261f', '#a16207', '#e7e5e4', '#78716c', '#d6d3d1', '#854d0e'],
  space_chamber: ['#020617', '#f8fafc', '#22d3ee', '#64748b', '#0f172a', '#a5f3fc'],
  value_vault: ['#030712', '#f9fafb', '#9ca3af', '#374151', '#111827', '#d1d5db'],
  balance_bridge: ['#052e2b', '#d1fae5', '#10b981', '#f59e0b', '#065f46', '#fef3c7'],
  emphasis_arena: ['#2e1020', '#f43f5e', '#fbbf24', '#f8fafc', '#831843', '#fb7185'],
  unity_garden: ['#052e16', '#86efac', '#f9a8d4', '#fef3c7', '#16a34a', '#be185d'],
  rhythm_pattern_pavilion: ['#0f172a', '#60a5fa', '#fb923c', '#f8fafc', '#1d4ed8', '#fed7aa'],
  hall_of_movement: ['#111827', '#2dd4bf', '#fb7185', '#a78bfa', '#f8fafc', '#4338ca'],
  final_room: ['#111827', '#f0abfc', '#67e8f9', '#fde68a', '#f8fafc', '#a78bfa'],
};

const getPalette = (wingId: string, seed: number): string[] => {
  const fallbackHue = seed % 360;
  return ARTWORK_PALETTES[wingId] || [
    `hsl(${fallbackHue}, 65%, 15%)`,
    `hsl(${(fallbackHue + 75) % 360}, 80%, 62%)`,
    `hsl(${(fallbackHue + 160) % 360}, 80%, 70%)`,
    '#f8fafc',
    '#111827',
  ];
};

const fillArtworkGround = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: string[],
  yearLevel: YearLevel
) => {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, palette[0]);
  gradient.addColorStop(0.58, withAlpha(palette[1], yearLevel >= 10 ? 0.55 : 0.38));
  gradient.addColorStop(1, palette[4] || palette[0]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = yearLevel >= 11 ? 0.22 : 0.14;
  ctx.fillStyle = palette[3] || '#f8fafc';
  for (let i = 0; i < 8 + yearLevel; i += 1) {
    const offset = (i + 1) / (9 + yearLevel);
    ctx.fillRect(width * offset - 1, 0, 2, height);
  }
  ctx.globalAlpha = 1;
};

const applyMediumTexture = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: string[],
  yearLevel: YearLevel,
  rng: SeededRandom
) => {
  const grainCount = 650 + yearLevel * 120;
  for (let i = 0; i < grainCount; i += 1) {
    const alpha = yearLevel >= 9 ? 0.08 : 0.045;
    ctx.fillStyle = rng() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.fillRect(rng() * width, rng() * height, 1 + rng() * 1.8, 1 + rng() * 1.8);
  }

  if (yearLevel === 9) {
    ctx.strokeStyle = withAlpha(palette[3] || '#f8fafc', 0.18);
    ctx.lineWidth = 1;
    for (let x = -height; x < width; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x + height, 0);
      ctx.stroke();
    }
  }

  if (yearLevel >= 10) {
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 7; i += 1) {
      ctx.fillStyle = palette[(i % (palette.length - 1)) + 1];
      ctx.fillRect(rng() * width, rng() * height, 120 + rng() * 220, 55 + rng() * 145);
    }
    ctx.globalAlpha = 1;
  }

  if (yearLevel >= 11) {
    ctx.strokeStyle = withAlpha(palette[2] || '#67e8f9', 0.32);
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i += 1) {
      ctx.beginPath();
      ctx.moveTo(rng() * width, 0);
      ctx.lineTo(rng() * width, height);
      ctx.stroke();
    }
  }
};

const drawFrame = (ctx: CanvasRenderingContext2D, width: number, height: number, palette: string[]) => {
  ctx.globalAlpha = 1;
  ctx.lineWidth = 14;
  ctx.strokeStyle = withAlpha(palette[3] || '#f8fafc', 0.22);
  ctx.strokeRect(28, 28, width - 56, height - 56);
  ctx.lineWidth = 3;
  ctx.strokeStyle = withAlpha(palette[1], 0.72);
  ctx.strokeRect(45, 45, width - 90, height - 90);
};

const drawPolygon = (
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  fill: string,
  stroke = 'rgba(255,255,255,0.2)',
  lineWidth = 2
) => {
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = stroke;
  ctx.stroke();
};

const drawOrganicBlob = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  fill: string,
  rng: SeededRandom
) => {
  ctx.beginPath();
  for (let i = 0; i <= 10; i += 1) {
    const angle = (Math.PI * 2 * i) / 10;
    const wobble = radius * (0.72 + rng() * 0.48);
    const x = centerX + Math.cos(angle) * wobble;
    const y = centerY + Math.sin(angle) * wobble;
    if (i === 0) ctx.moveTo(x, y);
    else {
      const controlX = centerX + Math.cos(angle - 0.22) * wobble * 1.12;
      const controlY = centerY + Math.sin(angle - 0.22) * wobble * 1.12;
      ctx.quadraticCurveTo(controlX, controlY, x, y);
    }
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.32)';
  ctx.lineWidth = 2;
  ctx.stroke();
};

const drawCurve = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  bend: number,
  stroke: string,
  lineWidth: number
) => {
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(startX + bend, startY - bend, endX - bend, endY + bend, endX, endY);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
};

const drawLineArtwork = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: string[],
  yearLevel: YearLevel,
  rng: SeededRandom
) => {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 5 + yearLevel; i += 1) {
    ctx.setLineDash(i % 4 === 0 ? [10, 18] : []);
    drawCurve(
      ctx,
      80 + rng() * 120,
      90 + rng() * (height - 180),
      width - 80 - rng() * 120,
      80 + rng() * (height - 160),
      (rng() - 0.5) * 520,
      i % 2 === 0 ? palette[1] : withAlpha(palette[3], 0.86),
      3 + rng() * (yearLevel + 2)
    );
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = withAlpha(palette[1], 0.82);
  for (let i = 0; i < 42 + yearLevel * 7; i += 1) {
    const x = 70 + rng() * (width - 140);
    const y = 70 + rng() * (height - 140);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 25 + rng() * 65, y + (rng() - 0.5) * 75);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.42;
  for (let i = 0; i < 8; i += 1) {
    const x = 120 + i * 85;
    ctx.beginPath();
    ctx.ellipse(x, height * 0.52 + Math.sin(i) * 60, 45, 80, rng() * Math.PI, 0, Math.PI * 2);
    ctx.strokeStyle = palette[2];
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

const drawColourArtwork = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: string[],
  yearLevel: YearLevel,
  rng: SeededRandom
) => {
  const warm = ctx.createLinearGradient(0, 0, width * 0.55, height);
  warm.addColorStop(0, '#ef4444');
  warm.addColorStop(0.5, '#f97316');
  warm.addColorStop(1, '#facc15');
  ctx.fillStyle = warm;
  ctx.fillRect(48, 48, width * 0.48, height - 96);

  const cool = ctx.createLinearGradient(width * 0.42, 0, width, height);
  cool.addColorStop(0, '#2563eb');
  cool.addColorStop(0.58, '#14b8a6');
  cool.addColorStop(1, '#7c3aed');
  ctx.fillStyle = cool;
  ctx.fillRect(width * 0.48, 48, width * 0.47, height - 96);

  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 12 + yearLevel * 2; i += 1) {
    ctx.globalAlpha = 0.26 + rng() * 0.34;
    ctx.fillStyle = palette[1 + (i % (palette.length - 1))];
    ctx.beginPath();
    ctx.arc(120 + rng() * (width - 240), 90 + rng() * (height - 180), 45 + rng() * 115, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  ctx.strokeStyle = 'rgba(255,255,255,0.72)';
  ctx.lineWidth = 5 + yearLevel;
  drawCurve(ctx, width * 0.5, 70, width * 0.5, height - 70, 120, 'rgba(255,255,255,0.74)', 5 + yearLevel);
};

const drawShapeFormArtwork = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: string[],
  yearLevel: YearLevel,
  rng: SeededRandom
) => {
  for (let i = 0; i < 7 + yearLevel; i += 1) {
    const x = 90 + rng() * (width - 220);
    const y = 95 + rng() * (height - 230);
    const size = 48 + rng() * 95;
    const color = palette[1 + (i % (palette.length - 1))];
    ctx.shadowColor = 'rgba(0,0,0,0.38)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 14;
    ctx.shadowOffsetY = 14;
    if (i % 3 === 0) {
      drawPolygon(ctx, [[x, y], [x + size, y - 22], [x + size * 1.24, y + size * 0.8], [x + 15, y + size]], color);
      drawPolygon(ctx, [[x + size, y - 22], [x + size * 1.55, y + 18], [x + size * 1.24, y + size * 0.8]], withAlpha('#ffffff', 0.24), withAlpha('#ffffff', 0.28), 1);
    } else if (i % 3 === 1) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.72, size * 0.42, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = withAlpha('#ffffff', 0.35);
      ctx.stroke();
    } else {
      drawOrganicBlob(ctx, x, y, size * 0.6, color, rng);
    }
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
};

const drawTexturePanel = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  palette: string[],
  index: number
) => {
  ctx.fillStyle = palette[1 + (index % (palette.length - 1))];
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = 'rgba(255,255,255,0.38)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  ctx.strokeStyle = index % 2 === 0 ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.26)';
  for (let i = 0; i < 11; i += 1) {
    const t = i / 10;
    ctx.beginPath();
    if (index % 4 === 0) {
      ctx.moveTo(x, y + t * height);
      ctx.lineTo(x + width, y + t * height + Math.sin(i) * 12);
    } else if (index % 4 === 1) {
      ctx.moveTo(x + t * width, y);
      ctx.lineTo(x + width - t * width, y + height);
    } else if (index % 4 === 2) {
      ctx.arc(x + width / 2, y + height / 2, t * Math.min(width, height) * 0.52, 0, Math.PI * 2);
    } else {
      ctx.moveTo(x + t * width, y);
      ctx.lineTo(x + t * width, y + height);
      ctx.moveTo(x, y + t * height);
      ctx.lineTo(x + width, y + t * height);
    }
    ctx.stroke();
  }
};

const drawTextureArtwork = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: string[],
  yearLevel: YearLevel,
  rng: SeededRandom
) => {
  const columns = yearLevel >= 10 ? 4 : 3;
  const rows = yearLevel >= 9 ? 3 : 2;
  const panelWidth = (width - 150) / columns;
  const panelHeight = (height - 150) / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const jitter = rng() * 12;
      drawTexturePanel(
        ctx,
        72 + column * panelWidth + jitter,
        72 + row * panelHeight + jitter,
        panelWidth - 10,
        panelHeight - 10,
        palette,
        row * columns + column
      );
    }
  }
};

const drawSpaceArtwork = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: string[],
  yearLevel: YearLevel,
  rng: SeededRandom
) => {
  const horizonY = height * 0.42;
  const vanishingX = width * (0.42 + rng() * 0.16);
  ctx.strokeStyle = withAlpha(palette[2], 0.42);
  ctx.lineWidth = 2;
  for (let i = 0; i < 18; i += 1) {
    const x = (i / 17) * width;
    ctx.beginPath();
    ctx.moveTo(x, height - 45);
    ctx.lineTo(vanishingX, horizonY);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i += 1) {
    const y = horizonY + i * 42;
    ctx.beginPath();
    ctx.moveTo(45, y);
    ctx.lineTo(width - 45, y + i * 14);
    ctx.stroke();
  }

  ctx.fillStyle = palette[1];
  ctx.beginPath();
  ctx.arc(width * 0.32, height * 0.44, 105, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette[0];
  ctx.beginPath();
  ctx.arc(width * 0.32, height * 0.44, 52, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 5 + yearLevel; i += 1) {
    ctx.globalAlpha = 0.22 + rng() * 0.28;
    drawPolygon(
      ctx,
      [
        [140 + rng() * 560, 80 + rng() * 120],
        [220 + rng() * 560, 110 + rng() * 180],
        [180 + rng() * 560, 420 + rng() * 180],
        [90 + rng() * 560, 360 + rng() * 180],
      ],
      palette[2 + (i % 3)],
      'rgba(255,255,255,0.38)',
      2
    );
  }
  ctx.globalAlpha = 1;
};

const drawValueArtwork = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: string[],
  yearLevel: YearLevel,
  rng: SeededRandom
) => {
  const spotlight = ctx.createRadialGradient(width * 0.56, height * 0.36, 30, width * 0.52, height * 0.42, width * 0.72);
  spotlight.addColorStop(0, '#ffffff');
  spotlight.addColorStop(0.3, '#d1d5db');
  spotlight.addColorStop(0.62, '#4b5563');
  spotlight.addColorStop(1, '#030712');
  ctx.fillStyle = spotlight;
  ctx.fillRect(50, 50, width - 100, height - 100);

  for (let i = 0; i < 8 + yearLevel; i += 1) {
    const tone = clamp(22 + i * 18, 0, 245);
    ctx.fillStyle = `rgb(${tone}, ${tone}, ${tone})`;
    ctx.beginPath();
    ctx.ellipse(130 + i * 78, height * 0.65 - Math.sin(i) * 95, 44 + rng() * 42, 80 + rng() * 90, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = withAlpha(palette[1], 0.28);
  ctx.lineWidth = 3 + yearLevel;
  drawCurve(ctx, 80, height - 100, width - 90, 90, 260, withAlpha(palette[1], 0.44), 4 + yearLevel);
};

const drawBalanceArtwork = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: string[],
  yearLevel: YearLevel,
  rng: SeededRandom
) => {
  const axisX = width / 2;
  ctx.strokeStyle = withAlpha(palette[1], 0.5);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(axisX, 70);
  ctx.lineTo(axisX, height - 70);
  ctx.stroke();

  ctx.strokeStyle = withAlpha(palette[3], 0.75);
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(120, height * 0.62);
  ctx.lineTo(width - 120, height * 0.58);
  ctx.stroke();

  const leftCount = yearLevel >= 10 ? 4 : 3;
  const rightCount = yearLevel >= 10 ? 6 : 3;
  for (let i = 0; i < leftCount; i += 1) {
    const size = 52 + rng() * 72;
    drawOrganicBlob(ctx, 150 + rng() * 220, 150 + rng() * 300, size, palette[2], rng);
  }
  for (let i = 0; i < rightCount; i += 1) {
    const size = yearLevel >= 10 ? 24 + rng() * 50 : 52 + rng() * 72;
    drawPolygon(
      ctx,
      [[width - 330 + rng() * 210, 130 + rng() * 310], [width - 230 + rng() * 190, 170 + rng() * 290], [width - 290 + rng() * 230, 240 + rng() * 300]],
      i % 2 === 0 ? palette[3] : palette[1],
      'rgba(255,255,255,0.35)',
      Math.max(2, size / 24)
    );
  }
};

const drawEmphasisArtwork = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: string[],
  yearLevel: YearLevel,
  rng: SeededRandom
) => {
  for (let i = 0; i < 22; i += 1) {
    ctx.globalAlpha = 0.12 + rng() * 0.2;
    ctx.fillStyle = i % 2 === 0 ? palette[4] : palette[0];
    ctx.beginPath();
    ctx.arc(80 + rng() * (width - 160), 70 + rng() * (height - 140), 25 + rng() * 70, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const focalX = width * 0.58;
  const focalY = height * 0.42;
  const glow = ctx.createRadialGradient(focalX, focalY, 12, focalX, focalY, 245);
  glow.addColorStop(0, palette[2]);
  glow.addColorStop(0.32, withAlpha(palette[1], 0.85));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  drawOrganicBlob(ctx, focalX, focalY, 92 + yearLevel * 4, palette[2], rng);
  for (let i = 0; i < 14; i += 1) {
    drawCurve(ctx, 60 + rng() * 160, 80 + rng() * 520, focalX, focalY, rng() * 260, withAlpha(palette[3], 0.46), 2 + rng() * 3);
  }
};

const drawUnityArtwork = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: string[],
  yearLevel: YearLevel,
  rng: SeededRandom
) => {
  ctx.strokeStyle = withAlpha(palette[1], 0.58);
  ctx.lineWidth = 5;
  drawCurve(ctx, 70, height * 0.72, width - 80, height * 0.28, 260, withAlpha(palette[1], 0.62), 5);
  for (let i = 0; i < 22 + yearLevel * 4; i += 1) {
    const x = 80 + rng() * (width - 160);
    const y = 90 + rng() * (height - 180);
    const size = 18 + rng() * (yearLevel * 9);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rng() * Math.PI);
    ctx.fillStyle = palette[1 + (i % (palette.length - 1))];
    for (let petal = 0; petal < 5; petal += 1) {
      ctx.rotate((Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.ellipse(size * 0.55, 0, size * 0.5, size * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = withAlpha(palette[3], 0.88);
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

const drawRhythmPatternArtwork = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: string[],
  yearLevel: YearLevel,
  rng: SeededRandom
) => {
  const rows = 4 + Math.floor(yearLevel / 2);
  for (let row = 0; row < rows; row += 1) {
    const y = 70 + row * ((height - 140) / rows);
    const count = 7 + row + (yearLevel >= 10 ? 2 : 0);
    for (let i = 0; i < count; i += 1) {
      const x = 65 + i * ((width - 130) / count);
      const size = 34 + row * 4 + (yearLevel >= 11 ? i * 1.2 : 0);
      ctx.fillStyle = palette[1 + ((i + row) % (palette.length - 1))];
      ctx.beginPath();
      if ((i + row) % 2 === 0) {
        ctx.arc(x, y, size, Math.PI, 0);
        ctx.lineTo(x + size, y + size * 0.82);
        ctx.lineTo(x - size, y + size * 0.82);
      } else {
        ctx.rect(x - size * 0.65, y - size * 0.45, size * 1.3, size * 0.9);
      }
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.stroke();
    }
  }
  for (let i = 0; i < 9 + yearLevel; i += 1) {
    ctx.setLineDash([12, 14]);
    drawCurve(ctx, 70, 80 + rng() * 520, width - 70, 80 + rng() * 520, rng() * 360 - 180, withAlpha(palette[3], 0.34), 2);
  }
  ctx.setLineDash([]);
};

const drawMovementArtwork = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: string[],
  yearLevel: YearLevel,
  rng: SeededRandom
) => {
  for (let i = 0; i < 12 + yearLevel * 2; i += 1) {
    const startY = 90 + rng() * (height - 180);
    drawCurve(ctx, 65, startY, width - 70, startY + (rng() - 0.5) * 280, 320 + rng() * 260, withAlpha(palette[1 + (i % 4)], 0.42), 3 + rng() * 9);
  }
  for (let i = 0; i < 7 + yearLevel; i += 1) {
    const x = 120 + i * (width - 240) / (6 + yearLevel);
    const y = height * 0.55 + Math.sin(i) * 105;
    ctx.globalAlpha = 0.18 + i / (16 + yearLevel);
    drawPolygon(ctx, [[x, y - 38], [x + 76, y], [x, y + 38], [x + 22, y]], palette[2], withAlpha(palette[4], 0.3), 2);
  }
  ctx.globalAlpha = 1;
};

const drawFinalArtwork = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: string[],
  yearLevel: YearLevel,
  rng: SeededRandom
) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const prism = [
    [centerX, 105],
    [centerX + 150, centerY - 25],
    [centerX + 70, height - 115],
    [centerX - 115, height - 130],
    [centerX - 165, centerY - 25],
  ] as Array<[number, number]>;
  drawPolygon(ctx, prism, withAlpha(palette[4], 0.36), withAlpha(palette[1], 0.68), 4);
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 16 + yearLevel; i += 1) {
    const angle = (Math.PI * 2 * i) / (16 + yearLevel);
    const color = palette[1 + (i % (palette.length - 1))];
    drawPolygon(
      ctx,
      [
        [centerX, centerY],
        [centerX + Math.cos(angle) * 340, centerY + Math.sin(angle) * 220],
        [centerX + Math.cos(angle + 0.12) * 240, centerY + Math.sin(angle + 0.12) * 300],
      ],
      withAlpha(color, 0.24),
      withAlpha(color, 0.5),
      1
    );
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = withAlpha(palette[3], 0.65);
  ctx.lineWidth = 2 + yearLevel / 2;
  for (let i = 0; i < 8; i += 1) {
    drawCurve(ctx, 80 + rng() * 80, 90 + rng() * 520, width - 110, 90 + rng() * 520, rng() * 500 - 250, withAlpha(palette[3], 0.45), 2 + rng() * 4);
  }
};

const renderArtQuestArtwork = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  prompt: string
): boolean => {
  const meta = parseArtworkPrompt(prompt);
  if (!meta) return false;

  const width = canvas.width;
  const height = canvas.height;
  const styleSeed = hashString(`${prompt}-${YEAR_ARTWORK_PROFILES[meta.yearLevel].medium}`);
  const rng = createSeededRandom(styleSeed);
  const palette = getPalette(meta.wingId, styleSeed);

  fillArtworkGround(ctx, width, height, palette, meta.yearLevel);

  switch (meta.wingId) {
    case 'hall_of_line':
      drawLineArtwork(ctx, width, height, palette, meta.yearLevel, rng);
      break;
    case 'realm_of_colour':
      drawColourArtwork(ctx, width, height, palette, meta.yearLevel, rng);
      break;
    case 'shape_form_forge':
      drawShapeFormArtwork(ctx, width, height, palette, meta.yearLevel, rng);
      break;
    case 'texture_tower':
      drawTextureArtwork(ctx, width, height, palette, meta.yearLevel, rng);
      break;
    case 'space_chamber':
      drawSpaceArtwork(ctx, width, height, palette, meta.yearLevel, rng);
      break;
    case 'value_vault':
      drawValueArtwork(ctx, width, height, palette, meta.yearLevel, rng);
      break;
    case 'balance_bridge':
      drawBalanceArtwork(ctx, width, height, palette, meta.yearLevel, rng);
      break;
    case 'emphasis_arena':
      drawEmphasisArtwork(ctx, width, height, palette, meta.yearLevel, rng);
      break;
    case 'unity_garden':
      drawUnityArtwork(ctx, width, height, palette, meta.yearLevel, rng);
      break;
    case 'rhythm_pattern_pavilion':
      drawRhythmPatternArtwork(ctx, width, height, palette, meta.yearLevel, rng);
      break;
    case 'hall_of_movement':
      drawMovementArtwork(ctx, width, height, palette, meta.yearLevel, rng);
      break;
    case 'final_room':
      drawFinalArtwork(ctx, width, height, palette, meta.yearLevel, rng);
      break;
    default:
      drawFinalArtwork(ctx, width, height, palette, meta.yearLevel, rng);
  }

  applyMediumTexture(ctx, width, height, palette, meta.yearLevel, rng);
  drawFrame(ctx, width, height, palette);
  return true;
};

const renderGenericImage = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, prompt: string, isPortrait: boolean) => {
  const hash = hashString(prompt);
  const hueA = hash % 360;
  const hueB = (hueA + 70 + (hash % 80)) % 360;
  const hueC = (hueA + 180) % 360;

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, `hsl(${hueA}, 75%, 24%)`);
  gradient.addColorStop(0.55, `hsl(${hueB}, 70%, 34%)`);
  gradient.addColorStop(1, `hsl(${hueC}, 75%, 18%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = 0.22;
  for (let i = 0; i < 26; i += 1) {
    const x = ((hash * (i + 3)) % canvas.width);
    const y = ((hash * (i + 11)) % canvas.height);
    const size = 30 + ((hash >> (i % 8)) % 130);
    ctx.fillStyle = `hsl(${(hueA + i * 23) % 360}, 90%, ${55 + (i % 20)}%)`;
    if (i % 3 === 0) {
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = isPortrait ? 10 : 6;
  for (let i = 0; i < 9; i += 1) {
    ctx.beginPath();
    const offset = (i + 1) / 10;
    ctx.moveTo(canvas.width * offset, 0);
    ctx.bezierCurveTo(
      canvas.width * (1 - offset),
      canvas.height * 0.25,
      canvas.width * offset,
      canvas.height * 0.75,
      canvas.width * (1 - offset),
      canvas.height
    );
    ctx.stroke();
  }

  if (isPortrait) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(12, 18, 36, 0.72)';
    ctx.fillRect(96, 96, 320, 320);
    ctx.fillStyle = `hsl(${hueB}, 80%, 62%)`;
    ctx.fillRect(176, 116, 160, 70);
    ctx.fillStyle = `hsl(${hueA}, 65%, 72%)`;
    ctx.fillRect(156, 176, 200, 170);
    ctx.fillStyle = '#111827';
    ctx.fillRect(196, 230, 40, 34);
    ctx.fillRect(276, 230, 40, 34);
    ctx.fillStyle = `hsl(${hueC}, 85%, 62%)`;
    ctx.fillRect(146, 352, 220, 70);
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.fillRect(32, canvas.height - 132, canvas.width - 64, 100);
  ctx.fillStyle = '#f8fafc';
  ctx.font = isPortrait ? 'bold 28px system-ui, sans-serif' : 'bold 30px system-ui, sans-serif';
  drawWrappedText(ctx, prompt.replace(/\s+/g, ' '), 56, canvas.height - 92, canvas.width - 112, 34, 2);
};

export const generateImage = async (prompt: string): Promise<string> => {
  const artworkMeta = parseArtworkPrompt(prompt);
  if (artworkMeta) {
    return getArtworkAssetPath(artworkMeta.wingId, artworkMeta.yearLevel);
  }

  const isPortrait = /portrait|sprite|character|avatar|8-bit/i.test(prompt);
  const canvas = document.createElement('canvas');
  canvas.width = isPortrait ? 512 : 900;
  canvas.height = isPortrait ? 512 : 700;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas rendering is unavailable in this browser.');

  const renderedArtwork = renderArtQuestArtwork(ctx, canvas, prompt);
  if (!renderedArtwork) {
    renderGenericImage(ctx, canvas, prompt, isPortrait);
  }

  return canvas.toDataURL('image/jpeg', 0.9);
};

export const getVisualLanguageTerms = async (artPrinciple: string, yearLevel: YearLevel, wingName: string): Promise<string[]> => {
  const wingId = WING_DEFINITIONS.find((wing) => wing.name === wingName || wing.artPrinciple === artPrinciple)?.id;
  return wingId
    ? getVisualLanguageGuideForWing(wingId, yearLevel).assessmentVocabulary
    : getVisualLanguageGuideForWing('fallback', yearLevel).assessmentVocabulary;
};
