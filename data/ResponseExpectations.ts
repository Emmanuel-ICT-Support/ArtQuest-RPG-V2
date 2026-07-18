import { QuestionPhase, SeniorCoursePathway, YearLevel } from '../types';

export interface PhaseResponseExpectation {
  minWords: number;
  minSentences: number;
}

type PhaseResponseExpectations = Record<QuestionPhase, PhaseResponseExpectation>;

// These are supportive completion targets, not maximum lengths. They give a
// student enough room to answer the question while keeping the game's
// formative feedback proportionate to their year level.
const GENERAL_RESPONSE_EXPECTATIONS: Record<YearLevel, PhaseResponseExpectations> = {
  7: {
    1: { minWords: 8, minSentences: 1 },
    2: { minWords: 10, minSentences: 1 },
    3: { minWords: 14, minSentences: 1 },
    4: { minWords: 16, minSentences: 2 },
  },
  8: {
    1: { minWords: 10, minSentences: 1 },
    2: { minWords: 14, minSentences: 1 },
    3: { minWords: 16, minSentences: 2 },
    4: { minWords: 20, minSentences: 2 },
  },
  9: {
    1: { minWords: 14, minSentences: 1 },
    2: { minWords: 20, minSentences: 2 },
    3: { minWords: 24, minSentences: 2 },
    4: { minWords: 28, minSentences: 2 },
  },
  10: {
    1: { minWords: 16, minSentences: 2 },
    2: { minWords: 24, minSentences: 2 },
    3: { minWords: 28, minSentences: 2 },
    4: { minWords: 32, minSentences: 2 },
  },
  11: {
    1: { minWords: 20, minSentences: 2 },
    2: { minWords: 28, minSentences: 2 },
    3: { minWords: 34, minSentences: 2 },
    4: { minWords: 40, minSentences: 3 },
  },
  12: {
    1: { minWords: 22, minSentences: 2 },
    2: { minWords: 32, minSentences: 2 },
    3: { minWords: 38, minSentences: 3 },
    4: { minWords: 46, minSentences: 3 },
  },
};

const ATAR_RESPONSE_EXPECTATIONS: Partial<Record<YearLevel, PhaseResponseExpectations>> = {
  11: {
    1: { minWords: 24, minSentences: 2 },
    2: { minWords: 34, minSentences: 3 },
    3: { minWords: 42, minSentences: 3 },
    4: { minWords: 50, minSentences: 3 },
  },
  12: {
    1: { minWords: 28, minSentences: 2 },
    2: { minWords: 40, minSentences: 3 },
    3: { minWords: 48, minSentences: 3 },
    4: { minWords: 58, minSentences: 4 },
  },
};

const GENERAL_QUALITY_RATIOS: Record<YearLevel, number> = {
  7: 0.5,
  8: 0.58,
  9: 0.62,
  10: 0.68,
  11: 0.72,
  12: 0.74,
};

const ATAR_QUALITY_RATIOS: Partial<Record<YearLevel, number>> = {
  11: 0.78,
  12: 0.82,
};

export const toSafeQuestionPhase = (phase: number): QuestionPhase =>
  Math.max(1, Math.min(4, phase)) as QuestionPhase;

export const getResponseExpectation = (
  yearLevel: YearLevel,
  phase: number,
  coursePathway?: SeniorCoursePathway,
): PhaseResponseExpectation => {
  const safePhase = toSafeQuestionPhase(phase);
  if (coursePathway === 'atar' && ATAR_RESPONSE_EXPECTATIONS[yearLevel]) {
    return ATAR_RESPONSE_EXPECTATIONS[yearLevel][safePhase];
  }
  return GENERAL_RESPONSE_EXPECTATIONS[yearLevel][safePhase];
};

export const getResponseQualityRatio = (
  yearLevel: YearLevel,
  coursePathway?: SeniorCoursePathway,
): number => {
  if (coursePathway === 'atar' && ATAR_QUALITY_RATIOS[yearLevel]) {
    return ATAR_QUALITY_RATIOS[yearLevel];
  }
  return GENERAL_QUALITY_RATIOS[yearLevel];
};

export const getCombinedResponseWordTarget = (
  yearLevel: YearLevel,
  phases: QuestionPhase[],
  coursePathway?: SeniorCoursePathway,
): number => phases.reduce(
  (total, phase) => total + getResponseExpectation(yearLevel, phase, coursePathway).minWords,
  0,
);
