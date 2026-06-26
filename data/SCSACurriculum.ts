import { PlayerAvatar, RubricCriterion, RubricLevelDescriptor, SeniorCoursePathway, YearLevel } from '../types';

export type AssessmentYearOptionId =
  | '7'
  | '8'
  | '9'
  | '10'
  | '11-general'
  | '11-atar'
  | '12-general'
  | '12-atar';

export interface AssessmentYearOption {
  id: AssessmentYearOptionId;
  label: string;
  shortLabel: string;
  yearLevel: YearLevel;
  coursePathway?: SeniorCoursePathway;
}

export interface AssessmentContext {
  yearLevel: YearLevel;
  coursePathway?: SeniorCoursePathway;
  label: string;
  shortLabel: string;
  assessmentStage: 'lowerSecondary' | 'middleSecondary' | 'seniorGeneral' | 'seniorAtar';
  descriptorProfile: DescriptorProfile;
  thresholdAdjustment: number;
  formativeNote: string;
}

export interface DescriptorProfile {
  visualLanguage: string;
  observation: string;
  analysis: string;
  interpretation: string;
  judgement: string;
  engagement: string;
  context: string;
  independence: string;
  courseLens: string;
}

const ASSESSMENT_YEAR_OPTIONS: AssessmentYearOption[] = [
  { id: '7', label: 'Year 7', shortLabel: 'Y7', yearLevel: 7 },
  { id: '8', label: 'Year 8', shortLabel: 'Y8', yearLevel: 8 },
  { id: '9', label: 'Year 9', shortLabel: 'Y9', yearLevel: 9 },
  { id: '10', label: 'Year 10', shortLabel: 'Y10', yearLevel: 10 },
  { id: '11-general', label: 'Year 11 General', shortLabel: 'Y11 Gen', yearLevel: 11, coursePathway: 'general' },
  { id: '11-atar', label: 'Year 11 ATAR', shortLabel: 'Y11 ATAR', yearLevel: 11, coursePathway: 'atar' },
  { id: '12-general', label: 'Year 12 General', shortLabel: 'Y12 Gen', yearLevel: 12, coursePathway: 'general' },
  { id: '12-atar', label: 'Year 12 ATAR', shortLabel: 'Y12 ATAR', yearLevel: 12, coursePathway: 'atar' },
];

export const SCSA_ASSESSMENT_YEAR_OPTIONS = ASSESSMENT_YEAR_OPTIONS;

export const SCSA_CURRICULUM_SOURCE_LINKS = [
  {
    label: 'SCSA K-10 Visual Arts curriculum',
    url: 'https://k10outline.scsa.wa.edu.au/home/teaching/curriculum-browser/the-arts/visual-arts2',
  },
  {
    label: 'SCSA Years 11 and 12 Visual Arts syllabuses and support materials',
    url: 'https://senior-secondary.scsa.wa.edu.au/syllabus-and-support-materials/arts/visual-arts',
  },
];

const DESCRIPTOR_PROFILES: Record<AssessmentYearOptionId, DescriptorProfile> = {
  '7': {
    visualLanguage: 'basic visual art terms with clear everyday description',
    observation: 'visible details, locations, and simple element/principle examples',
    analysis: 'simple explanations of how one visual choice affects attention, mood, or meaning',
    interpretation: 'personal ideas or meanings supported by at least one visual clue',
    judgement: 'a clear opinion about success with one specific reason',
    engagement: 'complete sentences that answer each phase directly',
    context: 'artist choices and audience response introduced in simple language',
    independence: 'guided response using sentence starters and visible evidence',
    courseLens: 'K-10 Visual Arts Responding: describe, use visual language, and give simple supported reasons',
  },
  '8': {
    visualLanguage: 'developing visual art terminology with more precise descriptive words',
    observation: 'specific visible details, materials, techniques, and compositional locations',
    analysis: 'linked explanations of how visual choices create effect, focus, or atmosphere',
    interpretation: 'personal or thematic meaning supported by several visual clues',
    judgement: 'a supported opinion that connects effect and evidence',
    engagement: 'connected sentences across See, Think, Interpret, and Reflect',
    context: 'simple awareness of artist intention, audience, genre, or purpose',
    independence: 'guided but increasingly independent response using relevant terms',
    courseLens: 'K-10 Visual Arts Responding: extend description into analysis and supported interpretation',
  },
  '9': {
    visualLanguage: 'relevant visual art terminology used consistently',
    observation: 'selected details that show awareness of elements, principles, and composition',
    analysis: 'clear explanation of relationships between visual choices and viewer response',
    interpretation: 'meaning, mood, symbol, or idea justified with visual evidence',
    judgement: 'developing evaluative judgement with linked reasons',
    engagement: 'well-developed responses that address all parts of the prompt',
    context: 'some consideration of intention, cultural frame, style, or audience',
    independence: 'mostly independent response with linked evidence and explanation',
    courseLens: 'K-10 Visual Arts Responding: analyse relationships, meanings, and viewpoints with evidence',
  },
  '10': {
    visualLanguage: 'accurate terminology for elements, principles, style, media, and composition',
    observation: 'purposeful selection of evidence from form, technique, and structure',
    analysis: 'explained relationships between visual conventions, composition, intent, and effect',
    interpretation: 'reasoned interpretation considering meaning, mood, symbolism, or viewpoint',
    judgement: 'clear evaluative judgement that weighs effectiveness and evidence',
    engagement: 'sustained response with coherent links between phases',
    context: 'relevant awareness of artist, audience, conventions, culture, or purpose',
    independence: 'independent response that prepares for senior Visual Arts expectations',
    courseLens: 'K-10 Visual Arts Responding: evaluate visual choices, meaning, and effectiveness with justified evidence',
  },
  '11-general': {
    visualLanguage: 'senior visual art language used clearly and practically',
    observation: 'relevant evidence from materials, subject, technique, and composition',
    analysis: 'clear analysis of how visual choices communicate ideas and engage viewers',
    interpretation: 'supported interpretation of meaning, purpose, and audience response',
    judgement: 'practical evaluative judgement linked to evidence and possible intention',
    engagement: 'sustained senior response that remains accessible and task-focused',
    context: 'awareness of art practice, audience, purpose, and selected contextual factors',
    independence: 'guided senior reasoning with increasing confidence and specificity',
    courseLens: 'Senior Visual Arts General: practical, reflective, audience-aware interpretation and evaluation',
  },
  '11-atar': {
    visualLanguage: 'precise senior terminology for form, practice, conventions, and visual relationships',
    observation: 'selected visual evidence from form, media, technique, structure, and context',
    analysis: 'analytical explanation of how visual systems, conventions, and relationships communicate meaning',
    interpretation: 'justified interpretation that considers intent, context, audience, and alternative readings',
    judgement: 'reasoned evaluation weighing evidence, conceptual strength, impact, and significance',
    engagement: 'sustained analytical response with clear argument and evidence control',
    context: 'consideration of artist practice, conventions, cultural frames, audience, and critical viewpoints',
    independence: 'independent senior analysis approaching ATAR written-response expectations',
    courseLens: 'Senior Visual Arts ATAR: analytical, contextual, evidence-based interpretation and evaluation',
  },
  '12-general': {
    visualLanguage: 'confident senior visual art language for practice, materials, style, and effect',
    observation: 'purposeful evidence from materials, composition, technique, and presentation',
    analysis: 'confident analysis of how visual choices shape meaning, audience response, and impact',
    interpretation: 'developed interpretation of purpose, meaning, and response with relevant evidence',
    judgement: 'considered evaluative judgement connected to intent, effectiveness, and evidence',
    engagement: 'sustained and reflective senior response across the whole task',
    context: 'relevant discussion of art practice, audience, purpose, and selected context',
    independence: 'mostly independent senior reasoning with practical clarity',
    courseLens: 'Senior Visual Arts General: consolidated practical and reflective evaluation of artworks',
  },
  '12-atar': {
    visualLanguage: 'sophisticated terminology for form, visual conventions, practice, theory, and context',
    observation: 'discriminating visual evidence selected for analytical relevance',
    analysis: 'sustained analysis of complex visual relationships, conventions, intent, context, and audience response',
    interpretation: 'sophisticated interpretation with justified claims, alternative readings, and contextual awareness',
    judgement: 'evaluative argument weighing visual evidence, conceptual resolution, significance, and audience impact',
    engagement: 'cohesive senior response with depth, precision, and critical independence',
    context: 'integrated discussion of practice, conventions, culture, audience, and critical frameworks',
    independence: 'independent critical reasoning aligned to capstone ATAR expectations',
    courseLens: 'Senior Visual Arts ATAR: sophisticated critical analysis, interpretation, and evaluative judgement',
  },
};

const THRESHOLD_ADJUSTMENTS: Record<AssessmentYearOptionId, number> = {
  '7': 0,
  '8': 2,
  '9': 5,
  '10': 8,
  '11-general': 9,
  '11-atar': 12,
  '12-general': 11,
  '12-atar': 15,
};

export const isSeniorYearLevel = (yearLevel: YearLevel): boolean => yearLevel >= 11;

export const getAssessmentYearOptionId = (
  yearLevel: YearLevel,
  coursePathway?: SeniorCoursePathway
): AssessmentYearOptionId => {
  if (yearLevel <= 10) return String(yearLevel) as AssessmentYearOptionId;
  const pathway = coursePathway || 'general';
  return `${yearLevel}-${pathway}` as AssessmentYearOptionId;
};

export const getAssessmentYearOption = (id: string): AssessmentYearOption =>
  ASSESSMENT_YEAR_OPTIONS.find(option => option.id === id) || ASSESSMENT_YEAR_OPTIONS[0];

export const getAssessmentContext = (
  avatarOrYearLevel: Pick<PlayerAvatar, 'selectedYearLevel' | 'selectedCoursePathway'> | YearLevel
): AssessmentContext => {
  const yearLevel = typeof avatarOrYearLevel === 'number'
    ? avatarOrYearLevel
    : avatarOrYearLevel.selectedYearLevel;
  const coursePathway = typeof avatarOrYearLevel === 'number'
    ? undefined
    : avatarOrYearLevel.selectedCoursePathway;
  const optionId = getAssessmentYearOptionId(yearLevel, coursePathway);
  const option = getAssessmentYearOption(optionId);

  return {
    yearLevel: option.yearLevel,
    coursePathway: option.coursePathway,
    label: option.label,
    shortLabel: option.shortLabel,
    assessmentStage: option.yearLevel <= 8
      ? 'lowerSecondary'
      : option.yearLevel <= 10
        ? 'middleSecondary'
        : option.coursePathway === 'atar'
          ? 'seniorAtar'
          : 'seniorGeneral',
    descriptorProfile: DESCRIPTOR_PROFILES[option.id],
    thresholdAdjustment: THRESHOLD_ADJUSTMENTS[option.id],
    formativeNote: 'ArtQuest provides formative assessment evidence. Final grades should be teacher-moderated against SCSA standards, school task requirements, and the student body of work.',
  };
};

export const getAssessmentDisplayLabel = (
  yearLevel: YearLevel,
  coursePathway?: SeniorCoursePathway
): string => getAssessmentContext({ selectedYearLevel: yearLevel, selectedCoursePathway: coursePathway }).label;

const descriptor = (level: number, title: string, description: string): RubricLevelDescriptor => ({
  level,
  title,
  description,
});

const rubricDescriptions = (
  criterionId: RubricCriterion['id'],
  profile: DescriptorProfile
): RubricLevelDescriptor[] => {
  switch (criterionId) {
    case 'artUnderstanding':
      return [
        descriptor(4, 'Excellent', `Demonstrates ${profile.independence}; explains ${profile.analysis} using specific evidence.`),
        descriptor(3, 'Competent', `Explains key elements, principles, or compositional choices with relevant evidence and mostly clear links to effect.`),
        descriptor(2, 'Developing', `Identifies relevant elements or principles and begins to explain their use, but links are general or uneven.`),
        descriptor(1, 'Beginning', `Mentions some visual features, but explanation of art concepts or effects is minimal.`),
        descriptor(0, 'Not Demonstrated', 'Does not yet refer to relevant Visual Arts concepts or evidence from the artwork.'),
      ];
    case 'visualLanguage':
      return [
        descriptor(4, 'Excellent', `Uses ${profile.visualLanguage} with accuracy, control, and expressive detail.`),
        descriptor(3, 'Competent', 'Uses relevant Visual Arts terms correctly and includes clear descriptive language.'),
        descriptor(2, 'Developing', 'Uses some Visual Arts terms, though wording may be basic, inconsistent, or only partly accurate.'),
        descriptor(1, 'Beginning', 'Uses few Visual Arts terms and relies mostly on broad everyday description.'),
        descriptor(0, 'Not Demonstrated', 'Does not yet use relevant Visual Arts language.'),
      ];
    case 'personalInsight':
      return [
        descriptor(4, 'Excellent', `Develops ${profile.interpretation}, showing personal insight and awareness of ${profile.context}.`),
        descriptor(3, 'Competent', 'Offers a relevant interpretation or personal response with some supporting visual evidence.'),
        descriptor(2, 'Developing', 'Shows a basic personal response or interpretation, but needs clearer links to visual evidence.'),
        descriptor(1, 'Beginning', 'Makes a general personal statement with limited connection to the artwork.'),
        descriptor(0, 'Not Demonstrated', 'No clear personal interpretation or insight is evident yet.'),
      ];
    case 'judgementReflection':
      return [
        descriptor(4, 'Excellent', `Makes ${profile.judgement}; connects judgement to evidence, interpretation, and reflection.`),
        descriptor(3, 'Competent', 'Makes a clear judgement and supports it with relevant evidence from the artwork.'),
        descriptor(2, 'Developing', 'Offers a basic judgement, but the reason or evidence needs more detail.'),
        descriptor(1, 'Beginning', 'Begins to give an opinion, but the judgement is minimal or unclear.'),
        descriptor(0, 'Not Demonstrated', 'No clear evaluative judgement or reflection is evident yet.'),
      ];
    case 'engagementEffort':
      return [
        descriptor(4, 'Excellent', `Provides ${profile.engagement}; responses are focused, complete, and evidence-rich.`),
        descriptor(3, 'Competent', 'Responds with consistent effort and answers most parts of each phase clearly.'),
        descriptor(2, 'Developing', 'Completes part of the task, but responses are brief, uneven, or underdeveloped.'),
        descriptor(1, 'Beginning', 'Makes a minimal attempt with limited detail or incomplete phase responses.'),
        descriptor(0, 'Not Demonstrated', 'No meaningful attempt is evident for this criterion yet.'),
      ];
    default:
      return [];
  }
};

const RUBRIC_CRITERIA: Omit<RubricCriterion, 'descriptors'>[] = [
  { id: 'artUnderstanding', name: 'Art Understanding' },
  { id: 'visualLanguage', name: 'Visual Language' },
  { id: 'personalInsight', name: 'Personal Insight' },
  { id: 'judgementReflection', name: 'Judgement & Reflection' },
  { id: 'engagementEffort', name: 'Engagement & Effort' },
];

export const getAssessmentRubricForContext = (context: AssessmentContext): RubricCriterion[] =>
  RUBRIC_CRITERIA.map(criterion => ({
    ...criterion,
    descriptors: rubricDescriptions(criterion.id, context.descriptorProfile).sort((a, b) => b.level - a.level),
  }));

export const getAssessmentFeedbackNudge = (
  criterionId: RubricCriterion['id'],
  achievedLevel: number,
  context: AssessmentContext
): string => {
  if (achievedLevel >= 4) {
    return `Curriculum alignment: ${context.descriptorProfile.courseLens}.`;
  }

  const focusByCriterion: Record<RubricCriterion['id'], string> = {
    artUnderstanding: context.descriptorProfile.analysis,
    visualLanguage: context.descriptorProfile.visualLanguage,
    personalInsight: context.descriptorProfile.interpretation,
    judgementReflection: context.descriptorProfile.judgement,
    engagementEffort: context.descriptorProfile.engagement,
  };

  return `For ${context.label}, strengthen this by aiming for ${focusByCriterion[criterionId]}.`;
};

export const DEFAULT_ASSESSMENT_CONTEXT = getAssessmentContext(9);
