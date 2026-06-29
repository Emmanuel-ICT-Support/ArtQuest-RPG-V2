import { QuestionPhase, SeniorCoursePathway, YearLevel } from '../types';

export type VisualLanguageSectionId =
  | 'wordsForWhatYouSee'
  | 'wordsForHowItWorks'
  | 'wordsForMeaningMood'
  | 'wordsForJudgingSuccess'
  | 'sentenceStarters'
  | 'strongExampleResponses';

export interface VisualLanguageGuideSections {
  wordsForWhatYouSee: string[];
  wordsForHowItWorks: string[];
  wordsForMeaningMood: string[];
  wordsForJudgingSuccess: string[];
  sentenceStarters: string[];
  strongExampleResponses: string[];
}

export interface VisualLanguagePracticeLabel {
  x: number;
  y: number;
  text: string;
  anchorX?: 'left' | 'center' | 'right';
  anchorY?: 'top' | 'center' | 'bottom';
}

export interface VisualLanguageHelpContent {
  title: string;
  definition: string;
  descriptiveWords: string[];
  practiceImageSrc?: string;
  practiceImageAlt?: string;
  practiceLabels: VisualLanguagePracticeLabel[];
  tryItYourselfPrompts: string[];
}

export interface VisualLanguageWingGuide {
  wingId: string;
  focus: string;
  vocabulary: string[];
  phaseMarkers: Record<QuestionPhase, string[]>;
  sections: VisualLanguageGuideSections;
}

export interface VisualLanguageGuideContent extends VisualLanguageWingGuide {
  assessmentVocabulary: string[];
  help: VisualLanguageHelpContent;
}

type VisualLanguageYearBand = 'junior' | 'middle' | 'senior';

const uniqVisualTerms = (items: string[]): string[] => Array.from(new Set(items.filter(Boolean)));

export const getVisualLanguageYearBand = (yearLevel: YearLevel): VisualLanguageYearBand => {
  if (yearLevel >= 11) return 'senior';
  if (yearLevel >= 9) return 'middle';
  return 'junior';
};

export const VISUAL_LANGUAGE_SYNONYMS = {
  guide: ['guide', 'guides', 'guided', 'guiding'],
  lead: ['lead', 'leads', 'led', 'leading'],
  direct: ['direct', 'directs', 'directed', 'directing'],
  draw: ['draw', 'draws', 'drawn', 'drawing'],
  create: ['create', 'creates', 'created', 'creating'],
  affect: ['affect', 'affects', 'affected', 'affecting'],
  emphasise: ['emphasise', 'emphasises', 'emphasised', 'emphasising', 'emphasize', 'emphasizes', 'emphasized', 'emphasizing'],
};

export const VIEWER_PATHWAY_MARKERS = uniqVisualTerms([
  ...VISUAL_LANGUAGE_SYNONYMS.guide,
  ...VISUAL_LANGUAGE_SYNONYMS.lead,
  ...VISUAL_LANGUAGE_SYNONYMS.direct,
  ...VISUAL_LANGUAGE_SYNONYMS.draw,
  'path', 'paths', 'pathway', 'pathways', 'eye', 'eyes', 'viewer', 'viewer s eye',
  'attention', 'focus', 'focal point', 'look', 'looks', 'looking', 'notice', 'notices',
  'travel', 'travels', 'move', 'moves', 'movement', 'flow', 'flows', 'follow', 'follows',
]);

export const VISUAL_EFFECT_MARKERS = uniqVisualTerms([
  ...VISUAL_LANGUAGE_SYNONYMS.create,
  ...VISUAL_LANGUAGE_SYNONYMS.affect,
  ...VISUAL_LANGUAGE_SYNONYMS.emphasise,
  'effect', 'impact', 'influence', 'influences', 'changes', 'makes', 'shows',
  'contrast', 'contrasts', 'balance', 'balances', 'connect', 'connects', 'repetition',
  'rhythm', 'movement', 'depth', 'mood', 'atmosphere', 'energy', 'tension', 'calm',
  'stand out', 'stands out', 'stronger', 'weaker', 'dramatic', 'dynamic',
]);

export const CAUSE_EFFECT_MARKERS = uniqVisualTerms([
  'because', 'so', 'so that', 'therefore', 'which makes', 'this makes', 'that makes',
  'this creates', 'that creates', 'this helps', 'that helps', 'as a result',
  'by using', 'through', 'due to', 'causes', 'caused by', 'means that', 'leads to',
]);

export const LOCATION_MARKERS = [
  'left', 'right', 'centre', 'center', 'middle', 'top', 'bottom', 'foreground',
  'middle ground', 'background', 'front', 'back', 'edge', 'corner', 'around',
  'behind', 'beside', 'inside', 'outside', 'near', 'next to', 'across', 'through',
  'above', 'below', 'under', 'over', 'between', 'where',
];

export const VISIBLE_DETAIL_MARKERS = [
  'see', 'seen', 'notice', 'noticed', 'look', 'looks', 'visible', 'appears',
  'shape', 'form', 'colour', 'color', 'line', 'lines', 'mark', 'marks', 'edge',
  'edges', 'area', 'part', 'detail', 'object', 'figure', 'surface', 'texture',
  'light', 'dark', 'shadow', 'highlight', 'bright', 'curved', 'straight', 'sharp',
  'soft', 'large', 'small', 'repeated', 'pattern',
];

export const INTERPRETIVE_MARKERS = [
  'suggests', 'suggest', 'could mean', 'might mean', 'may mean', 'symbolises',
  'symbolizes', 'represents', 'communicates', 'shows', 'expresses', 'implies',
  'reminds', 'feels like', 'makes me think', 'meaning', 'message', 'idea',
  'story', 'mood', 'symbolism', 'emotion', 'feeling', 'intent', 'purpose',
];

export const JUDGEMENT_MARKERS = [
  'successful', 'successfully', 'effective', 'effectively', 'works', 'worked',
  'powerful', 'strong', 'convincing', 'clear', 'unclear', 'weak', 'less successful',
  'partly successful', 'not successful', 'overall', 'judgement', 'judge',
  'evaluate', 'evaluation', 'well', 'best', 'improve', 'improved',
];

export const REFLECTION_MARKERS = [
  'i think', 'i believe', 'i feel', 'i learned', 'i noticed', 'now i understand',
  'my view', 'my opinion', 'my judgement', 'overall', 'this helped me',
  'next time', 'reflection', 'reflect',
];

export const EVIDENCE_MARKERS = uniqVisualTerms([
  'evidence', 'visual evidence', 'from the artwork', 'in the artwork', 'in the image',
  'I can see', 'I notice', 'the artist uses', 'the work shows', 'shown by',
  'shown through', ...LOCATION_MARKERS, ...VISIBLE_DETAIL_MARKERS,
]);

const COMMON_ANALYSIS_VOCABULARY = [
  'foreground', 'middle ground', 'background', 'composition', 'focal point',
  'viewer', 'attention', 'pathway', 'movement', 'mood', 'atmosphere', 'depth',
  'contrast', 'emphasis', 'balance', 'rhythm', 'pattern', 'unity', 'variety',
  'symbolism', 'meaning', 'judgement', 'evidence', 'successful', 'effective',
];

const COMMON_STARTERS: Record<VisualLanguageYearBand, string[]> = {
  junior: [
    'I can see...',
    'This makes my eye...',
    'The artwork feels...',
    'I think it is successful because...',
  ],
  middle: [
    'The artist uses... to...',
    'This directs the viewer toward...',
    'This suggests a mood of...',
    'Overall, this is effective because...',
  ],
  senior: [
    'The artist manipulates... to position the viewer...',
    'This visual relationship creates...',
    'A possible reading is...',
    'My judgement is that the work succeeds because...',
  ],
};

const ATAR_STARTERS = [
  'The artist positions the viewer by...',
  'This convention strengthens the reading that...',
  'An alternative interpretation could be...',
  'The work is critically effective because...',
];

const lineVocabulary = [
  'line', 'lines', 'curved', 'curve', 'angular', 'sharp', 'straight', 'diagonal',
  'vertical', 'horizontal', 'contour', 'outline', 'implied', 'jagged', 'flowing',
  'hatched', 'hatching', 'cross-hatched', 'repeated', 'directional', 'expressive',
  'gestural', 'thin', 'thick', 'bold', 'delicate', 'edge', 'pathway', 'perspective',
  'foreground', 'middle ground', 'background',
];

const VISUAL_LANGUAGE_HELP_IMAGE_BASE = './public/images/visual-language-guide';

const VISUAL_LANGUAGE_HELP: Record<string, VisualLanguageHelpContent> = {
  hall_of_line: {
    title: 'line',
    definition: 'Line is a mark, edge, path, or direction that leads your eye and helps describe shape, mood, movement, and detail.',
    descriptiveWords: [
      'straight', 'curved', 'wavy', 'zigzag', 'jagged', 'diagonal', 'vertical', 'horizontal',
      'parallel', 'intersecting', 'contour', 'outline', 'implied', 'directional', 'flowing',
      'broken', 'continuous', 'thin', 'thick', 'delicate', 'bold', 'hatched', 'cross-hatched',
      'expressive', 'gestural', 'sharp', 'soft', 'restless', 'calm', 'rhythmic',
    ],
    practiceImageSrc: `${VISUAL_LANGUAGE_HELP_IMAGE_BASE}/hall-of-line-example.png`,
    practiceImageAlt: 'Ink-style city canal scene showing different uses of line.',
    practiceLabels: [
      { x: 25, y: 86, text: 'Curving street lines guide the eye inward', anchorX: 'left', anchorY: 'bottom' },
      { x: 55, y: 31, text: 'Vertical lamp lines feel tall and steady', anchorX: 'left', anchorY: 'top' },
      { x: 69, y: 62, text: 'Bridge and rail lines create a pathway', anchorX: 'right', anchorY: 'top' },
      { x: 46, y: 17, text: 'Swirling cloud lines suggest mood', anchorX: 'center', anchorY: 'top' },
      { x: 14, y: 38, text: 'Repeated building lines add detail', anchorX: 'left', anchorY: 'center' },
    ],
    tryItYourselfPrompts: [
      'Now return to your artwork. Can you find one line that guides your eye?',
      'Can you find one line that creates mood or movement?',
      'Can you describe where it appears without copying the example?',
    ],
  },
  realm_of_colour: {
    title: 'colour',
    definition: 'Colour is the hue, temperature, brightness, and intensity artists use to create mood, contrast, harmony, and meaning.',
    descriptiveWords: [
      'warm', 'cool', 'bright', 'dull', 'vibrant', 'muted', 'saturated', 'desaturated',
      'bold', 'soft', 'pale', 'deep', 'rich', 'earthy', 'neon', 'pastel', 'complementary',
      'analogous', 'contrasting', 'harmonious', 'clashing', 'monochromatic', 'symbolic',
      'luminous', 'glowing', 'shadowed', 'temperature', 'tint', 'shade', 'tone',
    ],
    practiceImageSrc: `${VISUAL_LANGUAGE_HELP_IMAGE_BASE}/realm-of-colour-example.png`,
    practiceImageAlt: 'Fantasy landscape split between warm sunset colours and cool moonlit colours.',
    practiceLabels: [
      { x: 20, y: 55, text: 'Warm reds and oranges feel energetic', anchorX: 'left', anchorY: 'center' },
      { x: 79, y: 49, text: 'Cool blues create a calmer mood', anchorX: 'right', anchorY: 'center' },
      { x: 51, y: 70, text: 'Warm and cool colours meet in contrast', anchorX: 'center', anchorY: 'bottom' },
      { x: 43, y: 42, text: 'Glowing yellow draws attention', anchorX: 'right', anchorY: 'top' },
      { x: 84, y: 15, text: 'Blue moonlight changes the atmosphere', anchorX: 'right', anchorY: 'top' },
    ],
    tryItYourselfPrompts: [
      'Now return to your artwork. Can you find a colour area that changes the mood?',
      'Can you describe whether the colours feel warm, cool, bright, muted, or contrasting?',
      'Can you explain how one colour choice affects where the viewer looks?',
    ],
  },
  shape_form_forge: {
    title: 'shape and form',
    definition: 'Shape is a flat enclosed area, while form looks three-dimensional because it has volume, light, shadow, and structure.',
    descriptiveWords: [
      'geometric', 'organic', 'angular', 'curved', 'round', 'square', 'triangular', 'circular',
      'rectangular', 'solid', 'flat', 'three-dimensional', 'two-dimensional', 'volumetric',
      'sculptural', 'blocky', 'smooth', 'faceted', 'irregular', 'symmetrical', 'asymmetrical',
      'positive', 'negative', 'silhouette', 'edge', 'mass', 'volume', 'stable', 'fragile',
    ],
    practiceImageSrc: `${VISUAL_LANGUAGE_HELP_IMAGE_BASE}/shape-form-forge-example.png`,
    practiceImageAlt: 'Still life of geometric solids and organic objects showing shape and form.',
    practiceLabels: [
      { x: 24, y: 50, text: 'Sphere: round form with highlight and shadow', anchorX: 'left', anchorY: 'center' },
      { x: 36, y: 34, text: 'Cube: geometric form with flat planes', anchorX: 'right', anchorY: 'bottom' },
      { x: 50, y: 58, text: 'Cone: pointed form with volume', anchorX: 'center', anchorY: 'top' },
      { x: 62, y: 30, text: 'Cylinder: curved form with an ellipse top', anchorX: 'left', anchorY: 'bottom' },
      { x: 66, y: 70, text: 'Leaf: organic shape with irregular edges', anchorX: 'right', anchorY: 'top' },
    ],
    tryItYourselfPrompts: [
      'Now return to your artwork. Can you find a flat shape or a solid-looking form?',
      'Can you describe whether it feels geometric, organic, angular, curved, heavy, or light?',
      'Can you explain how its shape or form changes the composition?',
    ],
  },
  texture_tower: {
    title: 'texture',
    definition: 'Texture is how a surface looks or might feel, such as rough, smooth, soft, hard, woven, shiny, or worn.',
    descriptiveWords: [
      'rough', 'smooth', 'soft', 'hard', 'bumpy', 'grainy', 'woven', 'fibrous', 'furry',
      'glossy', 'matte', 'polished', 'scratched', 'cracked', 'layered', 'ridged', 'wrinkled',
      'splintered', 'fluffy', 'coarse', 'delicate', 'tactile', 'visual', 'implied', 'real',
      'weathered', 'worn', 'sensory', 'heavy', 'fragile',
    ],
    practiceImageSrc: `${VISUAL_LANGUAGE_HELP_IMAGE_BASE}/texture-tower-example.png`,
    practiceImageAlt: 'Close still life of bark, fabric, metal, fur, stone, and flowers showing texture.',
    practiceLabels: [
      { x: 28, y: 59, text: 'Rough bark looks hard and uneven', anchorX: 'right', anchorY: 'top' },
      { x: 49, y: 61, text: 'Woven fabric suggests softness', anchorX: 'left', anchorY: 'bottom' },
      { x: 70, y: 28, text: 'Glossy metal reflects light', anchorX: 'left', anchorY: 'bottom' },
      { x: 82, y: 68, text: 'Fur looks soft and fine', anchorX: 'right', anchorY: 'center' },
      { x: 34, y: 27, text: 'Stone appears bumpy and layered', anchorX: 'right', anchorY: 'top' },
    ],
    tryItYourselfPrompts: [
      'Now return to your artwork. Can you find one surface that looks touchable?',
      'Can you describe the surface using two or three texture words?',
      'Can you explain how that texture affects the mood or realism?',
    ],
  },
  space_chamber: {
    title: 'space',
    definition: 'Space is the area in, around, between, and behind things. Artists use it to create depth, distance, focus, and breathing room.',
    descriptiveWords: [
      'foreground', 'middle ground', 'background', 'positive space', 'negative space', 'open',
      'crowded', 'deep', 'shallow', 'wide', 'narrow', 'near', 'far', 'overlapping',
      'layered', 'framed', 'empty', 'full', 'compressed', 'expansive', 'perspective',
      'viewpoint', 'scale', 'distance', 'depth', 'receding', 'enclosed', 'immersive',
    ],
    practiceImageSrc: `${VISUAL_LANGUAGE_HELP_IMAGE_BASE}/space-chamber-example.png`,
    practiceImageAlt: 'Architectural chamber with arches, foreground objects, and deep background space.',
    practiceLabels: [
      { x: 17, y: 66, text: 'Foreground object feels closest', anchorX: 'left', anchorY: 'center' },
      { x: 50, y: 56, text: 'Arches create depth into the distance', anchorX: 'left', anchorY: 'top' },
      { x: 55, y: 31, text: 'Open sky shape acts like negative space', anchorX: 'center', anchorY: 'top' },
      { x: 74, y: 50, text: 'Overlapping columns separate layers', anchorX: 'right', anchorY: 'center' },
      { x: 48, y: 79, text: 'Floor lines pull the eye back', anchorX: 'center', anchorY: 'bottom' },
    ],
    tryItYourselfPrompts: [
      'Now return to your artwork. Can you find what feels closest and what feels farthest away?',
      'Can you describe an open, crowded, deep, or shallow area?',
      'Can you explain how the artist uses space to guide attention?',
    ],
  },
  value_vault: {
    title: 'value',
    definition: 'Value means how light or dark something is. Artists use value to show form, depth, contrast, drama, and focus.',
    descriptiveWords: [
      'light', 'dark', 'highlight', 'shadow', 'mid-tone', 'tone', 'tonal', 'contrast',
      'gradient', 'shading', 'bright', 'dim', 'luminous', 'glowing', 'low-key', 'high-key',
      'soft', 'harsh', 'dramatic', 'subtle', 'deep', 'pale', 'silvery', 'black', 'white',
      'grey', 'reflected light', 'chiaroscuro', 'modelled', 'atmospheric',
    ],
    practiceImageSrc: `${VISUAL_LANGUAGE_HELP_IMAGE_BASE}/value-vault-example.png`,
    practiceImageAlt: 'Monochrome treasure vault scene showing light, dark, highlights, and shadows.',
    practiceLabels: [
      { x: 20, y: 52, text: 'Bright lantern creates the lightest value', anchorX: 'left', anchorY: 'center' },
      { x: 84, y: 29, text: 'Deep shadows hide parts of the chest', anchorX: 'right', anchorY: 'top' },
      { x: 43, y: 45, text: 'Highlights make the crown sparkle', anchorX: 'right', anchorY: 'bottom' },
      { x: 55, y: 72, text: 'Mid-tones sit between light and dark', anchorX: 'right', anchorY: 'top' },
      { x: 72, y: 61, text: 'Strong contrast adds drama', anchorX: 'left', anchorY: 'bottom' },
    ],
    tryItYourselfPrompts: [
      'Now return to your artwork. Can you find the lightest and darkest areas?',
      'Can you describe a highlight, shadow, mid-tone, or contrast?',
      'Can you explain how value creates depth, mood, or focus?',
    ],
  },
  balance_bridge: {
    title: 'balance',
    definition: 'Balance is how visual weight is arranged so an artwork feels stable, tense, even, uneven, symmetrical, or asymmetrical.',
    descriptiveWords: [
      'balanced', 'unbalanced', 'symmetrical', 'asymmetrical', 'radial', 'even', 'uneven',
      'stable', 'unstable', 'weighted', 'heavy', 'light', 'centred', 'offset', 'anchored',
      'mirrored', 'equal', 'unequal', 'tension', 'harmony', 'composition', 'placement',
      'scale', 'distribution', 'counterweight', 'dominant', 'subtle', 'visual weight',
    ],
    practiceImageSrc: `${VISUAL_LANGUAGE_HELP_IMAGE_BASE}/balance-bridge-example.png`,
    practiceImageAlt: 'Still life with large vase on one side and grouped objects on the other showing balance.',
    practiceLabels: [
      { x: 28, y: 46, text: 'Large vase carries strong visual weight', anchorX: 'left', anchorY: 'bottom' },
      { x: 76, y: 62, text: 'Grouped objects counterbalance the vase', anchorX: 'right', anchorY: 'top' },
      { x: 50, y: 36, text: 'Open space helps the sides breathe', anchorX: 'center', anchorY: 'bottom' },
      { x: 18, y: 75, text: 'Small fruit and cloth anchor the left side', anchorX: 'left', anchorY: 'bottom' },
      { x: 88, y: 48, text: 'Tall candle adds vertical weight', anchorX: 'right', anchorY: 'bottom' },
    ],
    tryItYourselfPrompts: [
      'Now return to your artwork. Can you find where the visual weight feels strongest?',
      'Can you describe whether the composition feels symmetrical, asymmetrical, stable, or tense?',
      'Can you explain what balances or unbalances the main areas?',
    ],
  },
  emphasis_arena: {
    title: 'emphasis and contrast',
    definition: 'Emphasis makes one part stand out, often through contrast in colour, value, size, placement, isolation, or detail.',
    descriptiveWords: [
      'emphasis', 'contrast', 'focal point', 'dominant', 'subtle', 'spotlit', 'isolated',
      'centred', 'bright', 'dark', 'large', 'small', 'sharp', 'soft', 'bold', 'muted',
      'intense', 'quiet', 'dramatic', 'attention', 'hierarchy', 'priority', 'standout',
      'directional', 'surrounded', 'highlighted', 'important', 'clear', 'powerful',
    ],
    practiceImageSrc: `${VISUAL_LANGUAGE_HELP_IMAGE_BASE}/emphasis-hall-example.png`,
    practiceImageAlt: 'Dim interior with bright red flowers acting as a focal point.',
    practiceLabels: [
      { x: 52, y: 40, text: 'Bright red flowers become the focal point', anchorX: 'center', anchorY: 'bottom' },
      { x: 44, y: 57, text: 'Light circle spotlights the table', anchorX: 'right', anchorY: 'bottom' },
      { x: 90, y: 23, text: 'Darker background increases contrast', anchorX: 'right', anchorY: 'top' },
      { x: 21, y: 60, text: 'Muted furniture stays secondary', anchorX: 'left', anchorY: 'top' },
      { x: 58, y: 70, text: 'Central placement strengthens emphasis', anchorX: 'left', anchorY: 'top' },
    ],
    tryItYourselfPrompts: [
      'Now return to your artwork. Can you find where your eye goes first?',
      'Can you describe what makes that area stand out from nearby areas?',
      'Can you explain how contrast, placement, size, or detail creates emphasis?',
    ],
  },
  unity_garden: {
    title: 'unity and variety',
    definition: 'Unity makes an artwork feel connected, while variety adds differences that keep the viewer interested.',
    descriptiveWords: [
      'unified', 'varied', 'harmonious', 'cohesive', 'connected', 'repeated', 'similar',
      'different', 'consistent', 'contrasting', 'motif', 'theme', 'pattern', 'linked',
      'balanced', 'rhythmic', 'diverse', 'echoing', 'matching', 'coordinated', 'gentle',
      'lively', 'whole', 'relationship', 'family', 'variation', 'continuity', 'contrast',
    ],
    practiceImageSrc: `${VISUAL_LANGUAGE_HELP_IMAGE_BASE}/unity-gallery-example.png`,
    practiceImageAlt: 'Garden scene with repeated leaves, flowers, birds, bridge, and path creating unity and variety.',
    practiceLabels: [
      { x: 16, y: 21, text: 'Repeated hanging flowers create unity', anchorX: 'left', anchorY: 'top' },
      { x: 71, y: 23, text: 'Similar leaves connect different areas', anchorX: 'right', anchorY: 'top' },
      { x: 50, y: 67, text: 'Path links the whole composition', anchorX: 'center', anchorY: 'bottom' },
      { x: 89, y: 58, text: 'Stone lantern adds variety', anchorX: 'right', anchorY: 'top' },
      { x: 15, y: 82, text: 'Birds repeat but appear in different places', anchorX: 'left', anchorY: 'bottom' },
    ],
    tryItYourselfPrompts: [
      'Now return to your artwork. Can you find something repeated or connected across the image?',
      'Can you find one difference that adds variety without breaking the whole design?',
      'Can you explain how the artwork feels unified, varied, or both?',
    ],
  },
  rhythm_pattern_pavilion: {
    title: 'rhythm and pattern',
    definition: 'Pattern is repeated visual information, and rhythm is the beat or flow created when repetition moves the eye.',
    descriptiveWords: [
      'pattern', 'rhythm', 'repetition', 'repeated', 'alternating', 'regular', 'irregular',
      'flowing', 'progressive', 'echoing', 'motif', 'sequence', 'beat', 'visual beat',
      'decorative', 'ordered', 'predictable', 'surprising', 'striped', 'tiled', 'looping',
      'paced', 'lively', 'calm', 'syncopated', 'geometric', 'organic', 'continuous',
    ],
    practiceImageSrc: `${VISUAL_LANGUAGE_HELP_IMAGE_BASE}/pattern-pavilion-example.png`,
    practiceImageAlt: 'Decorative pavilion with repeated arches, stripes, flowers, columns, and tiled floor.',
    practiceLabels: [
      { x: 42, y: 32, text: 'Repeated arches create a steady rhythm', anchorX: 'left', anchorY: 'top' },
      { x: 26, y: 30, text: 'Alternating stripes form a clear pattern', anchorX: 'right', anchorY: 'bottom' },
      { x: 56, y: 75, text: 'Floor tiles make a visual beat', anchorX: 'center', anchorY: 'bottom' },
      { x: 72, y: 15, text: 'Floral border repeats across the top', anchorX: 'right', anchorY: 'top' },
      { x: 19, y: 57, text: 'Column motifs echo from front to back', anchorX: 'left', anchorY: 'center' },
    ],
    tryItYourselfPrompts: [
      'Now return to your artwork. Can you find a repeated shape, mark, colour, or motif?',
      'Can you describe whether the repetition feels regular, alternating, flowing, or irregular?',
      'Can you explain how the pattern or rhythm moves your eye?',
    ],
  },
  hall_of_movement: {
    title: 'movement',
    definition: 'Movement is how an artwork suggests action or leads the viewer through the composition using lines, shapes, repetition, direction, and gesture.',
    descriptiveWords: [
      'movement', 'motion', 'dynamic', 'active', 'flowing', 'sweeping', 'diagonal',
      'curving', 'directional', 'gestural', 'repeated', 'rhythmic', 'spiralling',
      'rushing', 'floating', 'twisting', 'turning', 'leaping', 'blurred', 'energetic',
      'restless', 'swift', 'slow', 'pathway', 'trajectory', 'momentum', 'forceful',
      'graceful', 'urgent',
    ],
    practiceImageSrc: `${VISUAL_LANGUAGE_HELP_IMAGE_BASE}/hall-of-movement-example.png`,
    practiceImageAlt: 'Painted dancers, birds, and sweeping marks showing visual movement.',
    practiceLabels: [
      { x: 22, y: 42, text: 'Sweeping marks pull the eye around', anchorX: 'left', anchorY: 'center' },
      { x: 76, y: 45, text: 'Extended arms create direction', anchorX: 'right', anchorY: 'center' },
      { x: 43, y: 52, text: 'Repeated poses suggest action', anchorX: 'center', anchorY: 'top' },
      { x: 35, y: 17, text: 'Birds add upward movement', anchorX: 'right', anchorY: 'top' },
      { x: 66, y: 22, text: 'Curving strokes create flow', anchorX: 'left', anchorY: 'bottom' },
    ],
    tryItYourselfPrompts: [
      'Now return to your artwork. Can you find a path your eye follows?',
      'Can you describe whether the movement feels slow, fast, flowing, diagonal, or energetic?',
      'Can you explain what visual choices create that sense of movement?',
    ],
  },
  final_room: {
    title: 'combined visual analysis',
    definition: 'Combined visual analysis explains how several elements and principles work together to create meaning, mood, structure, and impact.',
    descriptiveWords: [
      'composition', 'interaction', 'relationship', 'combined', 'layered', 'connected',
      'contrast', 'harmony', 'structure', 'movement', 'balance', 'emphasis', 'unity',
      'rhythm', 'space', 'value', 'texture', 'line', 'colour', 'shape', 'form', 'symbolic',
      'interpretive', 'meaningful', 'effective', 'cohesive', 'complex', 'evidence',
      'judgement', 'reflection',
    ],
    practiceImageSrc: `${VISUAL_LANGUAGE_HELP_IMAGE_BASE}/final-room-example.png`,
    practiceImageAlt: 'Layered abstract composition combining colour, line, shape, form, texture, space, value, balance, and movement.',
    practiceLabels: [
      { x: 47, y: 34, text: 'Layered shapes and forms build structure', anchorX: 'right', anchorY: 'bottom' },
      { x: 69, y: 18, text: 'Curving lines create movement', anchorX: 'left', anchorY: 'top' },
      { x: 58, y: 45, text: 'Colour contrast creates emphasis', anchorX: 'left', anchorY: 'top' },
      { x: 75, y: 82, text: 'Textured surfaces add visual evidence', anchorX: 'right', anchorY: 'bottom' },
      { x: 33, y: 59, text: 'Overlapping space links many ideas', anchorX: 'left', anchorY: 'top' },
    ],
    tryItYourselfPrompts: [
      'Now return to your artwork. Can you choose two visual ideas that work together?',
      'Can you explain how they create mood, meaning, structure, movement, balance, or emphasis?',
      'Can you make a final judgement using visual evidence from the artwork?',
    ],
  },
};

export const VISUAL_LANGUAGE_GUIDES: Record<string, VisualLanguageWingGuide> = {
  hall_of_line: {
    wingId: 'hall_of_line',
    focus: 'line',
    vocabulary: lineVocabulary,
    phaseMarkers: {
      1: ['line', 'curved', 'straight', 'jagged', 'flowing', 'hatched', 'foreground', 'background'],
      2: ['guide', 'lead', 'direct', 'draw', 'pathway', 'movement', 'emphasis', 'creates'],
      3: ['mood', 'energy', 'tension', 'story', 'symbolism', 'expressive'],
      4: ['successful', 'effective', 'evidence', 'because', 'overall'],
    },
    sections: {
      wordsForWhatYouSee: ['curved', 'straight', 'jagged', 'flowing', 'hatched', 'implied'],
      wordsForHowItWorks: ['directs', 'guides', 'draws the eye', 'pathway', 'movement', 'emphasis'],
      wordsForMeaningMood: ['tense', 'energetic', 'calm', 'chaotic', 'dramatic', 'expressive'],
      wordsForJudgingSuccess: ['effective', 'clear', 'powerful', 'convincing', 'because', 'evidence'],
      sentenceStarters: ['The lines direct my eye...', 'The jagged lines create...', 'This suggests a mood of...'],
      strongExampleResponses: [
        'The diagonal lines direct my eye across the foreground and create movement.',
        'The jagged repeated lines feel tense because they make the scene look restless.',
        'The line work is effective because it guides attention and supports the mood.',
      ],
    },
  },
  realm_of_colour: {
    wingId: 'realm_of_colour',
    focus: 'colour',
    vocabulary: ['colour', 'color', 'warm', 'cool', 'red', 'orange', 'yellow', 'blue', 'green', 'purple', 'hue', 'tone', 'tint', 'shade', 'vibrant', 'muted', 'saturated', 'desaturated', 'complementary', 'analogous', 'harmonious', 'symbolic', 'contrast', 'temperature'],
    phaseMarkers: {
      1: ['warm', 'cool', 'vibrant', 'muted', 'red', 'blue', 'foreground'],
      2: ['contrast', 'harmony', 'focus', 'atmosphere', 'creates', 'affects'],
      3: ['mood', 'symbolic', 'emotion', 'meaning', 'message'],
      4: ['successful', 'effective', 'judgement', 'evidence', 'overall'],
    },
    sections: {
      wordsForWhatYouSee: ['warm', 'cool', 'vibrant', 'muted', 'complementary', 'saturated'],
      wordsForHowItWorks: ['contrasts', 'balances', 'unifies', 'emphasises', 'affects mood', 'creates focus'],
      wordsForMeaningMood: ['joyful', 'calm', 'intense', 'symbolic', 'peaceful', 'dramatic'],
      wordsForJudgingSuccess: ['harmonious', 'clear', 'effective', 'balanced', 'convincing', 'evidence'],
      sentenceStarters: ['The warm colours create...', 'The colour contrast draws attention to...', 'The mood feels...'],
      strongExampleResponses: [
        'The warm reds and oranges create energy, while the cool blues make the background calmer.',
        'The colour contrast is effective because it makes the focal point stand out.',
      ],
    },
  },
  shape_form_forge: {
    wingId: 'shape_form_forge',
    focus: 'shape and form',
    vocabulary: ['shape', 'form', 'geometric', 'organic', 'angular', 'curved', 'round', 'square', 'triangle', 'circle', 'solid', 'flat', 'three-dimensional', 'two-dimensional', 'volume', 'mass', 'edge', 'silhouette', 'structure', 'positive space', 'negative space'],
    phaseMarkers: {
      1: ['geometric', 'organic', 'angular', 'curved', 'flat', 'solid'],
      2: ['structure', 'contrast', 'balance', 'creates', 'emphasises'],
      3: ['meaning', 'mood', 'symbolic', 'story', 'idea'],
      4: ['successful', 'effective', 'evidence', 'because', 'overall'],
    },
    sections: {
      wordsForWhatYouSee: ['geometric', 'organic', 'angular', 'curved', 'solid', 'flat'],
      wordsForHowItWorks: ['structures', 'balances', 'contrasts', 'frames', 'builds depth', 'creates focus'],
      wordsForMeaningMood: ['stable', 'playful', 'strong', 'fragile', 'ordered', 'natural'],
      wordsForJudgingSuccess: ['clear', 'balanced', 'effective', 'strong', 'convincing', 'supported'],
      sentenceStarters: ['The geometric shapes...', 'The organic forms make...', 'This structure suggests...'],
      strongExampleResponses: [
        'The angular geometric shapes create a strong structure and contrast with the curved forms.',
        'The forms are effective because they make the artwork feel solid and balanced.',
      ],
    },
  },
  texture_tower: {
    wingId: 'texture_tower',
    focus: 'texture',
    vocabulary: ['texture', 'rough', 'smooth', 'soft', 'hard', 'grainy', 'polished', 'bumpy', 'tactile', 'surface', 'layered', 'scratched', 'woven', 'glossy', 'matte', 'implied texture', 'visual texture', 'sensory', 'touch'],
    phaseMarkers: {
      1: ['rough', 'smooth', 'grainy', 'layered', 'surface', 'texture'],
      2: ['contrast', 'sensory', 'creates', 'affects', 'emphasises'],
      3: ['mood', 'feeling', 'worn', 'comfort', 'harsh', 'story'],
      4: ['successful', 'effective', 'evidence', 'because', 'overall'],
    },
    sections: {
      wordsForWhatYouSee: ['rough', 'smooth', 'grainy', 'layered', 'glossy', 'matte'],
      wordsForHowItWorks: ['contrasts', 'adds detail', 'creates touch', 'emphasises surface', 'builds atmosphere'],
      wordsForMeaningMood: ['worn', 'comforting', 'harsh', 'delicate', 'old', 'mysterious'],
      wordsForJudgingSuccess: ['believable', 'effective', 'detailed', 'convincing', 'sensory', 'supported'],
      sentenceStarters: ['The rough texture...', 'This surface makes...', 'The texture suggests...'],
      strongExampleResponses: [
        'The rough texture in the foreground makes the surface feel old and worn.',
        'The contrast between smooth and grainy areas is effective because it adds sensory detail.',
      ],
    },
  },
  space_chamber: {
    wingId: 'space_chamber',
    focus: 'space',
    vocabulary: ['space', 'positive space', 'negative space', 'depth', 'foreground', 'middle ground', 'background', 'overlap', 'overlapping', 'perspective', 'scale', 'distance', 'near', 'far', 'shallow', 'deep', 'composition', 'viewpoint', 'empty space'],
    phaseMarkers: {
      1: ['foreground', 'middle ground', 'background', 'depth', 'overlap'],
      2: ['perspective', 'scale', 'distance', 'directs', 'creates depth'],
      3: ['mood', 'isolation', 'openness', 'story', 'meaning'],
      4: ['successful', 'effective', 'evidence', 'because', 'overall'],
    },
    sections: {
      wordsForWhatYouSee: ['foreground', 'middle ground', 'background', 'overlap', 'near', 'far'],
      wordsForHowItWorks: ['creates depth', 'directs attention', 'opens space', 'frames', 'separates', 'layers'],
      wordsForMeaningMood: ['lonely', 'open', 'crowded', 'mysterious', 'peaceful', 'dramatic'],
      wordsForJudgingSuccess: ['deep', 'clear', 'effective', 'convincing', 'immersive', 'supported'],
      sentenceStarters: ['The foreground...', 'Overlapping shapes create...', 'The space feels...'],
      strongExampleResponses: [
        'The overlapping forms create depth by separating the foreground from the background.',
        'The use of space is effective because it directs attention through the scene.',
      ],
    },
  },
  value_vault: {
    wingId: 'value_vault',
    focus: 'value',
    vocabulary: ['value', 'tone', 'light', 'dark', 'highlight', 'shadow', 'mid-tone', 'contrast', 'gradient', 'shade', 'shading', 'tonal range', 'low-key', 'high-key', 'chiaroscuro', 'luminous', 'dim', 'dramatic'],
    phaseMarkers: {
      1: ['light', 'dark', 'highlight', 'shadow', 'contrast', 'tone'],
      2: ['emphasis', 'depth', 'drama', 'creates', 'directs attention'],
      3: ['mood', 'mystery', 'tension', 'hope', 'meaning'],
      4: ['successful', 'effective', 'evidence', 'because', 'overall'],
    },
    sections: {
      wordsForWhatYouSee: ['highlight', 'shadow', 'mid-tone', 'contrast', 'gradient', 'dark'],
      wordsForHowItWorks: ['creates depth', 'emphasises', 'dramatises', 'directs attention', 'models form'],
      wordsForMeaningMood: ['mysterious', 'serious', 'hopeful', 'dramatic', 'quiet', 'tense'],
      wordsForJudgingSuccess: ['clear', 'dramatic', 'effective', 'powerful', 'balanced', 'supported'],
      sentenceStarters: ['The shadows...', 'The strong contrast creates...', 'This value choice suggests...'],
      strongExampleResponses: [
        'The dark shadows create mystery and make the bright highlights stand out.',
        'The value is effective because it builds depth and focuses the viewer on the light areas.',
      ],
    },
  },
  balance_bridge: {
    wingId: 'balance_bridge',
    focus: 'balance',
    vocabulary: ['balance', 'balanced', 'symmetrical', 'asymmetrical', 'radial', 'visual weight', 'even', 'uneven', 'stable', 'unstable', 'placement', 'composition', 'mirror', 'offset', 'heavy', 'light', 'tension'],
    phaseMarkers: {
      1: ['symmetrical', 'asymmetrical', 'visual weight', 'left', 'right'],
      2: ['stable', 'tension', 'balances', 'creates', 'composition'],
      3: ['mood', 'harmony', 'uneasy', 'order', 'meaning'],
      4: ['successful', 'effective', 'judgement', 'evidence', 'overall'],
    },
    sections: {
      wordsForWhatYouSee: ['symmetrical', 'asymmetrical', 'visual weight', 'left side', 'right side', 'stable'],
      wordsForHowItWorks: ['balances', 'offsets', 'stabilises', 'creates tension', 'organises', 'anchors'],
      wordsForMeaningMood: ['calm', 'controlled', 'uneasy', 'harmonious', 'tense', 'ordered'],
      wordsForJudgingSuccess: ['stable', 'effective', 'clear', 'intentional', 'convincing', 'supported'],
      sentenceStarters: ['The visual weight...', 'The asymmetrical balance creates...', 'Overall, the balance...'],
      strongExampleResponses: [
        'The heavy shape on the left is balanced by smaller details on the right.',
        'The asymmetrical balance is effective because it creates tension without feeling random.',
      ],
    },
  },
  emphasis_arena: {
    wingId: 'emphasis_arena',
    focus: 'emphasis and contrast',
    vocabulary: ['emphasis', 'contrast', 'focal point', 'focus', 'dominant', 'subtle', 'scale', 'size', 'isolation', 'placement', 'spotlight', 'bright', 'dark', 'directional', 'attention', 'stand out', 'hierarchy'],
    phaseMarkers: {
      1: ['focal point', 'contrast', 'bright', 'dark', 'large', 'small'],
      2: ['emphasises', 'directs', 'draws', 'attention', 'stand out'],
      3: ['importance', 'message', 'meaning', 'mood', 'symbolism'],
      4: ['successful', 'effective', 'judgement', 'evidence', 'overall'],
    },
    sections: {
      wordsForWhatYouSee: ['focal point', 'contrast', 'dominant', 'subtle', 'large', 'isolated'],
      wordsForHowItWorks: ['emphasises', 'draws attention', 'directs the eye', 'spotlights', 'prioritises'],
      wordsForMeaningMood: ['important', 'dramatic', 'urgent', 'powerful', 'symbolic', 'focused'],
      wordsForJudgingSuccess: ['clear', 'effective', 'powerful', 'intentional', 'convincing', 'supported'],
      sentenceStarters: ['The focal point is...', 'The contrast draws attention to...', 'This emphasis suggests...'],
      strongExampleResponses: [
        'The bright focal point draws attention because it contrasts with the darker background.',
        'The emphasis is effective because the viewer knows where to look first.',
      ],
    },
  },
  unity_garden: {
    wingId: 'unity_garden',
    focus: 'unity and variety',
    vocabulary: ['unity', 'variety', 'harmony', 'harmonious', 'cohesive', 'repetition', 'repeated', 'motif', 'pattern', 'similar', 'different', 'contrast', 'connection', 'linked', 'consistent', 'variation'],
    phaseMarkers: {
      1: ['repeated', 'motif', 'similar', 'different', 'pattern'],
      2: ['unifies', 'connects', 'variety', 'harmony', 'creates'],
      3: ['mood', 'meaning', 'growth', 'community', 'story'],
      4: ['successful', 'effective', 'cohesive', 'evidence', 'overall'],
    },
    sections: {
      wordsForWhatYouSee: ['repeated', 'motif', 'pattern', 'similar', 'different', 'varied'],
      wordsForHowItWorks: ['unifies', 'connects', 'creates harmony', 'adds variety', 'links', 'balances'],
      wordsForMeaningMood: ['peaceful', 'connected', 'lively', 'natural', 'balanced', 'joyful'],
      wordsForJudgingSuccess: ['cohesive', 'interesting', 'effective', 'harmonious', 'clear', 'supported'],
      sentenceStarters: ['The repeated motif...', 'Variety keeps the artwork...', 'The unity is successful because...'],
      strongExampleResponses: [
        'The repeated shapes create unity, while the different colours add variety.',
        'The garden feels harmonious because similar motifs connect the whole composition.',
      ],
    },
  },
  rhythm_pattern_pavilion: {
    wingId: 'rhythm_pattern_pavilion',
    focus: 'rhythm and pattern',
    vocabulary: ['rhythm', 'pattern', 'repetition', 'repeated', 'alternating', 'regular', 'irregular', 'flowing', 'beat', 'motif', 'sequence', 'echo', 'movement', 'visual beat', 'decorative', 'direction'],
    phaseMarkers: {
      1: ['pattern', 'repetition', 'alternating', 'regular', 'motif'],
      2: ['rhythm', 'movement', 'flow', 'directs', 'creates'],
      3: ['mood', 'energy', 'order', 'celebration', 'meaning'],
      4: ['successful', 'effective', 'evidence', 'because', 'overall'],
    },
    sections: {
      wordsForWhatYouSee: ['pattern', 'repetition', 'alternating', 'regular', 'flowing', 'motif'],
      wordsForHowItWorks: ['creates rhythm', 'directs movement', 'echoes', 'repeats', 'paces', 'organises'],
      wordsForMeaningMood: ['energetic', 'ordered', 'playful', 'decorative', 'lively', 'calm'],
      wordsForJudgingSuccess: ['consistent', 'effective', 'clear', 'lively', 'cohesive', 'supported'],
      sentenceStarters: ['The repeated motif...', 'The pattern creates...', 'This rhythm makes the mood...'],
      strongExampleResponses: [
        'The alternating pattern creates rhythm and makes my eye move across the artwork.',
        'The rhythm is effective because the repeated shapes feel lively and organised.',
      ],
    },
  },
  hall_of_movement: {
    wingId: 'hall_of_movement',
    focus: 'movement',
    vocabulary: ['movement', 'motion', 'direction', 'diagonal', 'curve', 'curving', 'flow', 'dynamic', 'gesture', 'pathway', 'blur', 'repetition', 'sequence', 'directional', 'speed', 'energy', 'travel', 'viewer pathway'],
    phaseMarkers: {
      1: ['diagonal', 'curving', 'gesture', 'blur', 'directional'],
      2: ['movement', 'directs', 'guides', 'flow', 'dynamic', 'creates'],
      3: ['energy', 'story', 'mood', 'action', 'meaning'],
      4: ['successful', 'effective', 'evidence', 'because', 'overall'],
    },
    sections: {
      wordsForWhatYouSee: ['diagonal', 'curving', 'gesture', 'blur', 'repeated', 'directional'],
      wordsForHowItWorks: ['guides', 'directs', 'flows', 'suggests motion', 'creates speed', 'moves the eye'],
      wordsForMeaningMood: ['energetic', 'restless', 'exciting', 'active', 'dramatic', 'urgent'],
      wordsForJudgingSuccess: ['dynamic', 'effective', 'clear', 'powerful', 'convincing', 'supported'],
      sentenceStarters: ['The diagonal movement...', 'The repeated directions guide...', 'This motion suggests...'],
      strongExampleResponses: [
        'The curving directional lines guide my eye and create a strong sense of movement.',
        'The movement is effective because the repeated gestures make the scene feel active.',
      ],
    },
  },
  final_room: {
    wingId: 'final_room',
    focus: 'combined analysis',
    vocabulary: ['element', 'principle', 'composition', 'line', 'colour', 'color', 'shape', 'form', 'space', 'texture', 'value', 'balance', 'emphasis', 'contrast', 'unity', 'variety', 'rhythm', 'pattern', 'movement', 'meaning', 'judgement', 'reflection', 'evidence'],
    phaseMarkers: {
      1: ['element', 'principle', 'line', 'colour', 'shape', 'space', 'value'],
      2: ['interact', 'combine', 'structure', 'movement', 'balance', 'contrast'],
      3: ['meaning', 'mood', 'message', 'symbolism', 'interpretation'],
      4: ['successful', 'effective', 'journey', 'learned', 'reflection'],
    },
    sections: {
      wordsForWhatYouSee: ['line', 'colour', 'shape', 'space', 'value', 'texture'],
      wordsForHowItWorks: ['interacts', 'combines', 'balances', 'contrasts', 'emphasises', 'unifies'],
      wordsForMeaningMood: ['symbolic', 'reflective', 'mysterious', 'hopeful', 'connected', 'transformative'],
      wordsForJudgingSuccess: ['synthesised', 'effective', 'convincing', 'complex', 'insightful', 'supported'],
      sentenceStarters: ['The strongest element is...', 'These choices work together by...', 'My final judgement is...'],
      strongExampleResponses: [
        'The Prism combines colour, line, and space to create movement and a reflective mood.',
        'Overall, it is successful because the visual evidence connects to a clear final meaning.',
      ],
    },
  },
};

const fallbackGuide: VisualLanguageWingGuide = {
  wingId: 'fallback',
  focus: 'visual analysis',
  vocabulary: ['artwork', 'composition', 'detail', 'evidence', 'effect', 'meaning', 'judgement'],
  phaseMarkers: {
    1: ['detail', 'where', 'see', 'describe'],
    2: ['effect', 'viewer', 'creates', 'guides'],
    3: ['meaning', 'mood', 'story', 'suggests'],
    4: ['judgement', 'successful', 'because', 'reflection'],
  },
  sections: {
    wordsForWhatYouSee: ['detail', 'composition', 'foreground', 'background', 'contrast'],
    wordsForHowItWorks: ['creates', 'guides', 'emphasises', 'connects', 'affects'],
    wordsForMeaningMood: ['mood', 'meaning', 'message', 'symbolism', 'story'],
    wordsForJudgingSuccess: ['successful', 'effective', 'clear', 'convincing', 'evidence'],
    sentenceStarters: ['I can see...', 'The artist uses...', 'This suggests...', 'Overall...'],
    strongExampleResponses: [
      'The visual details create an effect because they guide the viewer through the artwork.',
      'The artwork is effective because the evidence supports the mood and meaning.',
    ],
  },
};

const fallbackHelp: VisualLanguageHelpContent = {
  title: 'visual analysis',
  definition: 'Visual analysis means looking closely at an artwork and explaining how what you see creates an effect, mood, meaning, or judgement.',
  descriptiveWords: [
    'detail', 'composition', 'foreground', 'background', 'contrast', 'mood', 'meaning',
    'effect', 'viewer', 'attention', 'evidence', 'successful', 'clear', 'balanced',
    'dramatic', 'subtle', 'connected', 'powerful',
  ],
  practiceLabels: [],
  tryItYourselfPrompts: [
    'Now return to your artwork. Can you find one detail that seems important?',
    'Can you describe where it appears and what effect it creates?',
    'Can you explain your idea using visual evidence?',
  ],
};

const buildAdaptiveSections = (
  guide: VisualLanguageWingGuide,
  yearLevel: YearLevel,
  coursePathway?: SeniorCoursePathway
): VisualLanguageGuideSections => {
  const band = getVisualLanguageYearBand(yearLevel);
  const starterBank = yearLevel >= 11 && coursePathway === 'atar'
    ? ATAR_STARTERS
    : COMMON_STARTERS[band];

  return {
    ...guide.sections,
    sentenceStarters: uniqVisualTerms([...guide.sections.sentenceStarters, ...starterBank]),
    strongExampleResponses: band === 'junior'
      ? guide.sections.strongExampleResponses.slice(0, 2)
      : guide.sections.strongExampleResponses,
  };
};

export const flattenVisualLanguageGuide = (guide: VisualLanguageGuideContent | VisualLanguageWingGuide): string[] =>
  uniqVisualTerms([
    guide.focus,
    ...guide.vocabulary,
    ...Object.values(guide.phaseMarkers).flat(),
    ...Object.values(guide.sections).flat(),
    ...COMMON_ANALYSIS_VOCABULARY,
    ...VIEWER_PATHWAY_MARKERS,
    ...VISUAL_EFFECT_MARKERS,
  ]);

export const getVisualLanguageGuideForWing = (
  wingId: string,
  yearLevel: YearLevel = 9,
  coursePathway?: SeniorCoursePathway
): VisualLanguageGuideContent => {
  const guide = VISUAL_LANGUAGE_GUIDES[wingId] || fallbackGuide;
  const help = VISUAL_LANGUAGE_HELP[guide.wingId] || fallbackHelp;
  const adaptiveGuide: VisualLanguageWingGuide = {
    ...guide,
    sections: buildAdaptiveSections(guide, yearLevel, coursePathway),
  };

  return {
    ...adaptiveGuide,
    help,
    assessmentVocabulary: uniqVisualTerms([...flattenVisualLanguageGuide(adaptiveGuide), ...help.descriptiveWords]),
  };
};

export const getVisualLanguageVocabularyForWing = (wingId: string): string[] =>
  getVisualLanguageGuideForWing(wingId).assessmentVocabulary;
