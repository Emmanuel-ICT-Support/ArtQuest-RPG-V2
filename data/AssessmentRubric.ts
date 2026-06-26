
import { RubricCriterion } from '../types';
import { DEFAULT_ASSESSMENT_CONTEXT, getAssessmentRubricForContext } from './SCSACurriculum';

export const ASSESSMENT_RUBRIC_DATA: RubricCriterion[] = getAssessmentRubricForContext(DEFAULT_ASSESSMENT_CONTEXT);
