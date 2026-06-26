import { WING_DEFINITIONS } from '../constants';
import { getArtworkPrompt } from './ArtworkLibrary';
import { QuestionPhase, SeniorCoursePathway, YearLevel } from '../types';

export interface OfflineWingContent {
  intro: string;
  imagePrompt: string;
  vocabulary: string[];
  focus: string;
  phaseTasks: Record<number, string>;
  recapFocus: string;
}

type YearBand = 'junior' | 'middle' | 'senior';

const getYearBand = (yearLevel: YearLevel): YearBand => {
  if (yearLevel >= 11) return 'senior';
  if (yearLevel >= 9) return 'middle';
  return 'junior';
};

export const getAgeAppropriatePhaseTask = (
  focus: string,
  phase: QuestionPhase,
  yearLevel: YearLevel,
  coursePathway?: SeniorCoursePathway
): string => {
  const band = getYearBand(yearLevel);
  const seniorCoursePrompt = coursePathway === 'atar'
    ? ' Include precise evidence, possible intent, context, and a justified critical position.'
    : coursePathway === 'general'
      ? ' Keep the response practical, reflective, audience-aware, and clearly supported by evidence.'
      : '';

  const tasks: Record<QuestionPhase, Record<YearBand, string>> = {
    1: {
      junior: `Look closely. Name at least two examples of ${focus}. Describe where you see them and what they look like.`,
      middle: `Describe at least two examples of ${focus} in the artwork. Explain where they appear and use relevant art terms where you can.`,
      senior: `Identify and describe significant uses of ${focus} in the artwork, using precise terminology and clear evidence from the composition.${seniorCoursePrompt}`,
    },
    2: {
      junior: `Explain how the artist uses ${focus}. How does it guide your eye, make something stand out, or change the way the artwork feels?`,
      middle: `Analyze how ${focus} is arranged or combined in the artwork. What visual effect does it create, and how does it influence the viewer?`,
      senior: `Analyze how ${focus} operates within the composition. Consider relationships, emphasis, movement, contrast, structure, and viewer response.${seniorCoursePrompt}`,
    },
    3: {
      junior: `What feeling, story, or idea do you think ${focus} helps show? Give one clue from the artwork that supports your interpretation.`,
      middle: `Interpret the mood, message, or symbolism created through ${focus}. Support your idea with specific visual evidence from the artwork.`,
      senior: `Interpret possible meanings or conceptual ideas communicated through ${focus}. Justify your reading with specific visual evidence and considered reasoning.${seniorCoursePrompt}`,
    },
    4: {
      junior: `Do you think the artist used ${focus} successfully? Give a clear reason from the artwork and explain one thing you learned.`,
      middle: `Evaluate how successfully the artist used ${focus}. Make a clear judgement and support it with evidence from your description, analysis, and interpretation.`,
      senior: `Develop a reasoned judgement about the effectiveness and significance of ${focus}. Weigh visual impact, possible intent, evidence, and your own informed response.${seniorCoursePrompt}`,
    },
  };

  return tasks[phase][band];
};

const genericPhaseTasks = (focus: string): Record<number, string> => ({
  1: `Describe at least two examples of ${focus} in the artwork. Explain where they appear and use relevant art terms where you can.`,
  2: `Analyze how ${focus} is arranged or combined in the artwork. What visual effect does it create, and how does it influence the viewer?`,
  3: `Interpret the mood, message, or symbolism created through ${focus}. Support your idea with specific visual evidence from the artwork.`,
  4: `Evaluate how successfully the artist used ${focus}. Make a clear judgement and support it with evidence from your description, analysis, and interpretation.`,
});

export const OFFLINE_WING_CONTENT: Record<string, OfflineWingContent> = {
  hall_of_line: {
    intro: "Welcome to the Hall of Line. Follow the marks carefully; every stroke is trying to lead your eye somewhere.",
    imagePrompt: "An intricate monochrome etching filled with jagged, flowing, implied, contour, and hatched lines forming energetic pathways through a mysterious gallery.",
    vocabulary: ['contour', 'jagged', 'flowing', 'hatched', 'implied', 'directional', 'expressive'],
    focus: 'line',
    phaseTasks: {
      1: "Describe at least two types of line. Explain where they appear and how they look.",
      2: "Analyze how the lines guide your eye or create a visual effect.",
      3: "Interpret the mood, story, or symbolism created by the line choices. Support your idea with visual evidence.",
      4: "Evaluate how successfully the artist used line. Make a clear judgement and support it with evidence.",
    },
    recapFocus: 'line, direction, and expressive mark-making',
  },
  realm_of_colour: {
    intro: "Step into the Realm of Colour. The room changes temperature as warm and cool hues push against each other.",
    imagePrompt: "A surreal split dreamscape with fiery warm reds, oranges, and yellows on one side and calm cool blues, greens, and purples on the other.",
    vocabulary: ['warm', 'cool', 'vibrant', 'muted', 'complementary', 'symbolic', 'harmonious'],
    focus: 'colour',
    phaseTasks: {
      1: "Describe the main colours or colour groups. Explain where warm and cool colours appear.",
      2: "Analyze how the colour choices create contrast, harmony, focus, or atmosphere.",
      3: "Interpret the moods, ideas, or symbolism created by the colour choices. Support your idea with visual evidence.",
      4: "Evaluate how successfully the artist used colour. Make a clear judgement and support it with evidence.",
    },
    recapFocus: 'colour temperature, symbolism, and mood',
  },
  shape_form_forge: {
    intro: "The Shape and Form Forge hums with hard edges, soft curves, and objects that seem ready to become real.",
    imagePrompt: "A dramatic forge-like studio where geometric shapes and organic forms float as glowing sculptural fragments.",
    vocabulary: ['geometric', 'organic', 'angular', 'curved', 'solid', 'flat', 'three-dimensional'],
    focus: 'shape and form',
    phaseTasks: genericPhaseTasks('shape and form'),
    recapFocus: 'shape, form, and visual construction',
  },
  texture_tower: {
    intro: "The Texture Tower invites your eyes to imagine touch: rough stone, soft fabric, polished metal, and layered marks.",
    imagePrompt: "A tall fantasy tower made from contrasting textures: rough stone, woven cloth, glossy tiles, bark, metal, and soft paper.",
    vocabulary: ['rough', 'smooth', 'layered', 'grainy', 'polished', 'tactile', 'sensory'],
    focus: 'texture',
    phaseTasks: genericPhaseTasks('texture'),
    recapFocus: 'visual and implied texture',
  },
  space_chamber: {
    intro: "The Space Chamber bends around you. Positive and negative spaces trade places when you look twice.",
    imagePrompt: "An optical illusion gallery chamber using positive and negative space, silhouettes, depth, overlapping planes, and impossible perspective.",
    vocabulary: ['positive', 'negative', 'depth', 'overlap', 'foreground', 'background', 'perspective'],
    focus: 'space',
    phaseTasks: genericPhaseTasks('space'),
    recapFocus: 'positive space, negative space, and depth',
  },
  value_vault: {
    intro: "The Value Vault opens in shades of light and dark. Every highlight and shadow guards a clue.",
    imagePrompt: "A mysterious vault rendered in dramatic tonal values, with bright highlights, deep shadows, gradients, and strong contrast.",
    vocabulary: ['highlight', 'shadow', 'contrast', 'gradient', 'tone', 'dark', 'luminous'],
    focus: 'value',
    phaseTasks: genericPhaseTasks('value'),
    recapFocus: 'value, contrast, light, and shadow',
  },
  balance_bridge: {
    intro: "The Balance Bridge steadies itself as you notice how visual weight is shared, mirrored, or deliberately unsettled.",
    imagePrompt: "A suspended bridge built from symmetrical and asymmetrical art objects, balanced across a glowing gallery chasm.",
    vocabulary: ['symmetrical', 'asymmetrical', 'visual weight', 'stable', 'balanced', 'uneven', 'composition'],
    focus: 'balance',
    phaseTasks: genericPhaseTasks('balance'),
    recapFocus: 'balance and visual weight',
  },
  emphasis_arena: {
    intro: "The Emphasis Arena spotlights the part of the artwork that refuses to be ignored.",
    imagePrompt: "A bold arena-like composition with one glowing focal point created through contrast, scale, colour, and directional lines.",
    vocabulary: ['focal point', 'contrast', 'dominant', 'subtle', 'scale', 'spotlight', 'attention'],
    focus: 'emphasis and contrast',
    phaseTasks: genericPhaseTasks('emphasis and contrast'),
    recapFocus: 'emphasis, contrast, and focal points',
  },
  unity_garden: {
    intro: "In the Unity Garden, repeated colours and forms hold many different details together.",
    imagePrompt: "A lush surreal garden combining repeated motifs, varied flowers, connected pathways, and harmonious colours.",
    vocabulary: ['unity', 'variety', 'repetition', 'harmony', 'motif', 'connection', 'cohesive'],
    focus: 'unity and variety',
    phaseTasks: genericPhaseTasks('unity and variety'),
    recapFocus: 'unity, variety, and harmony',
  },
  rhythm_pattern_pavilion: {
    intro: "The Rhythm and Pattern Pavilion moves without moving, built from repetition, beats, and visual echoes.",
    imagePrompt: "A pavilion of repeating arches, alternating colours, flowing patterns, and rhythmic decorative details.",
    vocabulary: ['pattern', 'rhythm', 'repetition', 'alternating', 'flowing', 'regular', 'motif'],
    focus: 'rhythm and pattern',
    phaseTasks: genericPhaseTasks('rhythm and pattern'),
    recapFocus: 'rhythm, pattern, and repetition',
  },
  hall_of_movement: {
    intro: "The Hall of Movement sends your eye travelling through curves, diagonals, and repeated visual signals.",
    imagePrompt: "A dynamic gallery hallway where diagonal paths, sweeping curves, repeated shapes, and blurred forms suggest motion.",
    vocabulary: ['movement', 'direction', 'diagonal', 'flow', 'dynamic', 'pathway', 'gesture'],
    focus: 'movement',
    phaseTasks: genericPhaseTasks('movement'),
    recapFocus: 'movement and visual pathways',
  },
  final_room: {
    intro: "The Final Room glows around the Keystone Prism. This is where all your discoveries meet.",
    imagePrompt: "A luminous blown-glass prism installation with interlocking forms, coloured light, reflections, asymmetrical balance, and shifting shadows.",
    vocabulary: ['element', 'principle', 'interaction', 'reflection', 'composition', 'meaning', 'analysis'],
    focus: 'the Keystone Prism',
    phaseTasks: {
      1: "Observe the Keystone Prism. Identify two prominent art elements and describe where and how you see them.",
      2: "Analyze how the elements and principles interact to create structure, movement, balance, emphasis, or contrast.",
      3: "Interpret the Prism's possible meaning, mood, or message. Support your reading with specific visual evidence.",
      4: "Judge the Prism's overall success and reflect on your ArtQuest journey. Explain how your understanding of art analysis has changed.",
    },
    recapFocus: 'the full ArtQuest process and combined art analysis',
  },
};

export const getOfflineWingImagePrompt = (wingId: string, yearLevel: YearLevel): string =>
  getArtworkPrompt(wingId, yearLevel) || OFFLINE_WING_CONTENT[wingId]?.imagePrompt || 'An ArtQuest artwork for visual analysis.';

WING_DEFINITIONS.forEach((wing) => {
  if (!OFFLINE_WING_CONTENT[wing.id]) {
    const focus = wing.artPrinciple.split(' - ')[0].toLowerCase();
    OFFLINE_WING_CONTENT[wing.id] = {
      intro: `The Curator welcomes you into ${wing.name}. Look closely; this room is built around ${focus}.`,
      imagePrompt: `A gallery artwork focused on ${focus}, designed for art analysis in ArtQuest.`,
      vocabulary: ['observe', 'describe', 'interpret', 'contrast', 'composition', 'detail', 'meaning'],
      focus,
      phaseTasks: genericPhaseTasks(focus),
      recapFocus: focus,
    };
  }
});

export const getOfflinePhaseTask = (wingId: string, phase: number, yearLevel: YearLevel, coursePathway?: SeniorCoursePathway): string => {
  const content = OFFLINE_WING_CONTENT[wingId];
  const safePhase = Math.max(1, Math.min(4, phase)) as QuestionPhase;
  if (!content) return getAgeAppropriatePhaseTask('this artwork', safePhase, yearLevel, coursePathway);

  if (wingId === 'final_room') {
    const seniorCoursePrompt = coursePathway === 'atar'
      ? ' Include precise evidence, possible intent, context, and a justified critical position.'
      : coursePathway === 'general'
        ? ' Keep the response practical, reflective, audience-aware, and clearly supported by evidence.'
        : '';
    const finalRoomTasks: Record<QuestionPhase, Record<YearBand, string>> = {
      1: {
        junior: "Look closely at the Keystone Prism. Name two art elements you can see and describe where they appear.",
        middle: "Describe two prominent art elements in the Keystone Prism. Explain where they appear and use relevant art terms.",
        senior: `Identify and precisely describe two significant art elements in the Keystone Prism, using specific evidence from the composition.${seniorCoursePrompt}`,
      },
      2: {
        junior: "Explain how those elements work together. Do they create movement, balance, contrast, or a focal point?",
        middle: "Analyze how the elements and principles interact to create structure, movement, balance, emphasis, or contrast.",
        senior: `Analyze how elements and principles interact structurally in the Keystone Prism, considering composition, visual hierarchy, tension, and viewer response.${seniorCoursePrompt}`,
      },
      3: {
        junior: "What feeling, story, or idea do you think the Prism shows? Give one visual clue that supports your idea.",
        middle: "Interpret the Prism's possible meaning, mood, or message. Support your reading with specific visual evidence.",
        senior: `Interpret the Prism's possible conceptual meaning, mood, or message, justifying your reading with precise visual evidence and considered reasoning.${seniorCoursePrompt}`,
      },
      4: {
        junior: "Do you think the Prism is successful? Explain your judgement and one thing ArtQuest has helped you understand about art.",
        middle: "Judge the Prism's overall success and reflect on your ArtQuest journey. Explain how your understanding of art analysis has changed.",
        senior: `Develop a reasoned judgement of the Prism's overall success, then reflect on how the ArtQuest process has shaped your analytical confidence and understanding.${seniorCoursePrompt}`,
      },
    };
    return finalRoomTasks[safePhase][getYearBand(yearLevel)];
  }

  return getAgeAppropriatePhaseTask(content.focus, safePhase, yearLevel, coursePathway);
};
