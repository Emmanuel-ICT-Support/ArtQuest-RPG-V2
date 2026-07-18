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

// The prompt itself is part of the learning design. Keep the four See, Think,
// Interpret, Reflect questions distinct, so each room can teach its own visual
// concept rather than presenting a generic template with a substituted label.
export const ROOM_PHASE_TASKS: Record<string, Record<YearBand, Record<QuestionPhase, string>>> = {
  hall_of_line: {
    junior: {
      1: 'Find two different types of line in the artwork. Describe what they look like and where you can see them.',
      2: 'How do the lines lead your eyes around the artwork or make an area stand out?',
      3: 'What feeling, story, or idea do the lines help show? Explain which part of the artwork made you think this.',
      4: 'Do the lines work well in this artwork? Give one reason and explain something you learned about using line.',
    },
    middle: {
      1: 'Identify and describe two significant types of line. Explain where they appear and use relevant visual arts terms.',
      2: 'Analyse how the artist uses line to guide the viewer, create movement, or build emphasis.',
      3: 'What mood, message, or idea is communicated through the line choices? Support your interpretation with specific visual evidence.',
      4: 'How effectively has the artist used line? Make a clear judgement and justify it with evidence from the artwork.',
    },
    senior: {
      1: 'Identify and precisely describe the most significant uses of line in the composition, including their qualities, placement, and relationships.',
      2: "Analyse how line structures the composition and influences movement, emphasis, tension, and the viewer's response.",
      3: "Interpret the meanings or ideas communicated through the artist's use of line. Justify your reading with precise visual evidence and considered reasoning.",
      4: 'Evaluate the effectiveness and significance of line in the artwork. Develop a justified critical judgement based on visual impact, possible intent, and evidence.',
    },
  },
  realm_of_colour: {
    junior: {
      1: 'Which colours stand out first? Describe where you see them and whether they appear warm, cool, bright, or muted.',
      2: 'How do the colour choices change the mood or draw attention to parts of the artwork?',
      3: 'What feeling or idea do the colours help communicate? Explain which colours support your interpretation.',
      4: 'Do the colour choices work well? Give one reason and explain something you learned about using colour.',
    },
    middle: {
      1: 'Describe the main colour relationships in the artwork, such as warm and cool, complementary, harmonious, vibrant, or muted colours.',
      2: 'Analyse how the artist uses colour to create contrast, harmony, atmosphere, or a focal point.',
      3: 'What mood, message, or symbolism is communicated through the colour choices? Support your interpretation with specific visual evidence.',
      4: 'How effectively has the artist used colour? Make a clear judgement and justify it with evidence from the artwork.',
    },
    senior: {
      1: 'Identify and precisely describe the significant colour relationships, including palette, temperature, saturation, contrast, and placement.',
      2: 'Analyse how colour operates across the composition to shape atmosphere, visual hierarchy, spatial effects, and viewer response.',
      3: 'Interpret the conceptual, emotional, or symbolic meanings communicated through colour. Justify your reading with precise visual evidence and considered reasoning.',
      4: "Evaluate the effectiveness and significance of the artist's colour choices. Develop a justified critical judgement based on visual impact, possible intent, and evidence.",
    },
  },
  shape_form_forge: {
    junior: {
      1: 'Find two shapes or forms that stand out. Describe what they look like and whether they seem flat or three-dimensional.',
      2: 'How has the artist arranged the shapes and forms to build the artwork or make an area stand out?',
      3: 'What feeling, object, character, or idea do the shapes and forms suggest? Explain which part gave you this idea.',
      4: 'Do the shapes and forms work well together? Give one reason and explain something you learned about using them.',
    },
    middle: {
      1: 'Identify and describe significant geometric or organic shapes and forms. Explain their placement and visual qualities.',
      2: 'Analyse how shape and form create structure, depth, contrast, or emphasis within the composition.',
      3: 'What mood, meaning, or symbolism is suggested by the shapes and forms? Support your interpretation with specific visual evidence.',
      4: 'How effectively has the artist used shape and form? Make a clear judgement and justify it with evidence from the artwork.',
    },
    senior: {
      1: 'Identify and precisely describe the significant shapes and forms, including their scale, geometry, volume, placement, and relationships.',
      2: 'Analyse how shape and form construct the composition and influence space, structure, visual hierarchy, tension, and viewer response.',
      3: 'Interpret the conceptual or symbolic meanings communicated through shape and form. Justify your reading with precise visual evidence and considered reasoning.',
      4: 'Evaluate the effectiveness and significance of shape and form in the artwork. Develop a justified critical judgement based on visual impact, possible intent, and evidence.',
    },
  },
  texture_tower: {
    junior: {
      1: 'Find two different textures. Describe how each one looks and how you imagine it might feel.',
      2: 'How do the textures add detail, contrast, or interest to the artwork?',
      3: 'What mood, place, object, or idea do the textures help suggest? Explain which texture supports your idea.',
      4: 'Do the textures make the artwork stronger? Give one reason and explain something you learned about using texture.',
    },
    middle: {
      1: 'Identify and describe significant actual or implied textures. Explain where they appear and how they visually differ.',
      2: 'Analyse how texture creates contrast, detail, atmosphere, or a sense of surface within the artwork.',
      3: 'What mood, meaning, or sensory response is communicated through texture? Support your interpretation with specific visual evidence.',
      4: 'How effectively has the artist used texture? Make a clear judgement and justify it with evidence from the artwork.',
    },
    senior: {
      1: 'Identify and precisely describe the significant actual or implied textures, including their visual qualities, placement, and relationships.',
      2: "Analyse how texture contributes to materiality, contrast, atmosphere, visual hierarchy, and the viewer's sensory response.",
      3: 'Interpret the conceptual, emotional, or symbolic meanings communicated through texture. Justify your reading with precise visual evidence and considered reasoning.',
      4: 'Evaluate the effectiveness and significance of texture in the artwork. Develop a justified critical judgement based on visual impact, possible intent, and evidence.',
    },
  },
  space_chamber: {
    junior: {
      1: 'What looks closest, furthest away, or empty in the artwork? Describe two examples.',
      2: 'How does the artist create a sense of depth or use empty space to guide your attention?',
      3: 'How does the use of space make the artwork feel, such as open, crowded, calm, lonely, or mysterious? Explain what made you think this.',
      4: 'Does the use of space work well? Give one reason and explain something you learned about creating depth or empty space.',
    },
    middle: {
      1: 'Describe how foreground, middle ground, background, positive space, or negative space are used in the artwork.',
      2: 'Analyse how the artist creates depth, distance, focus, or tension through the arrangement of space.',
      3: 'What mood, message, or relationship is suggested through the use of space? Support your interpretation with specific visual evidence.',
      4: 'How effectively has the artist used space? Make a clear judgement and justify it with evidence from the artwork.',
    },
    senior: {
      1: 'Identify and precisely describe the significant spatial relationships, including depth, scale, perspective, overlap, positive space, and negative space.',
      2: 'Analyse how space structures the composition and influences visual hierarchy, tension, intimacy, distance, and viewer response.',
      3: 'Interpret the conceptual or symbolic meanings communicated through spatial relationships. Justify your reading with precise visual evidence and considered reasoning.',
      4: 'Evaluate the effectiveness and significance of space in the artwork. Develop a justified critical judgement based on visual impact, possible intent, and evidence.',
    },
  },
  value_vault: {
    junior: {
      1: 'Find the lightest and darkest areas in the artwork. Describe where they appear and what you notice between them.',
      2: 'How do the light and dark areas create focus, depth, or drama?',
      3: 'What mood, time, place, or idea do the light and dark areas help suggest? Explain which part supports your idea.',
      4: 'Does the use of light and dark work well? Give one reason and explain something you learned about value.',
    },
    middle: {
      1: 'Describe the main highlights, shadows, tonal changes, and areas of value contrast in the artwork.',
      2: 'Analyse how value creates form, depth, emphasis, atmosphere, or dramatic contrast.',
      3: 'What mood, meaning, or symbolism is communicated through light and dark? Support your interpretation with specific visual evidence.',
      4: 'How effectively has the artist used value? Make a clear judgement and justify it with evidence from the artwork.',
    },
    senior: {
      1: 'Identify and precisely describe the significant tonal relationships, including highlights, shadows, gradients, contrast, and their placement.',
      2: 'Analyse how value models form and shapes depth, atmosphere, visual hierarchy, drama, and viewer response.',
      3: 'Interpret the conceptual, emotional, or symbolic meanings communicated through value. Justify your reading with precise visual evidence and considered reasoning.',
      4: 'Evaluate the effectiveness and significance of value in the artwork. Develop a justified critical judgement based on visual impact, possible intent, and evidence.',
    },
  },
  balance_bridge: {
    junior: {
      1: 'Does the artwork look evenly balanced or unevenly balanced? Describe where the visual weight appears.',
      2: 'How has the artist arranged the parts to make the artwork feel stable, calm, tense, or uneven?',
      3: 'What feeling or idea does the balance help communicate? Explain which parts of the artwork support your answer.',
      4: 'Does the balance suit the artwork? Give one reason and explain something you learned about arranging visual weight.',
    },
    middle: {
      1: 'Identify whether the composition uses symmetrical, asymmetrical, or radial balance. Describe how visual weight is distributed.',
      2: 'Analyse how balance creates stability, tension, movement, or emphasis within the composition.',
      3: 'What mood, message, or relationship is communicated through the balance? Support your interpretation with specific visual evidence.',
      4: 'How effectively has the artist used balance? Make a clear judgement and justify it with evidence from the artwork.',
    },
    senior: {
      1: 'Identify and precisely describe how visual weight is distributed through symmetrical, asymmetrical, radial, or deliberately unstable balance.',
      2: 'Analyse how balance structures the composition and influences stability, tension, movement, hierarchy, and viewer response.',
      3: 'Interpret the conceptual or symbolic meanings communicated through the distribution of visual weight. Justify your reading with precise visual evidence and considered reasoning.',
      4: 'Evaluate the effectiveness and significance of balance in the artwork. Develop a justified critical judgement based on visual impact, possible intent, and evidence.',
    },
  },
  emphasis_arena: {
    junior: {
      1: 'What part of the artwork grabs your attention first? Describe what makes it different from the areas around it.',
      2: 'How has the artist used contrast, size, colour, detail, or placement to create a focal point?',
      3: 'Why do you think the artist wants you to notice this part first? Explain what idea or feeling it may communicate.',
      4: 'Does the focal point work well? Give one reason and explain something you learned about creating emphasis.',
    },
    middle: {
      1: 'Identify the main focal point and describe the visual contrasts that make it stand out.',
      2: 'Analyse how emphasis and contrast control visual hierarchy and guide the viewer through the composition.',
      3: 'What meaning, mood, or message is strengthened by the focal point? Support your interpretation with specific visual evidence.',
      4: 'How effectively has the artist used emphasis and contrast? Make a clear judgement and justify it with evidence from the artwork.',
    },
    senior: {
      1: 'Identify and precisely describe the dominant focal areas and the contrasts in scale, colour, value, detail, placement, or form that establish them.',
      2: 'Analyse how emphasis and contrast shape visual hierarchy, direct attention, create tension, and influence viewer response.',
      3: 'Interpret the conceptual or symbolic significance of what has been emphasised or reduced. Justify your reading with precise visual evidence and considered reasoning.',
      4: 'Evaluate the effectiveness and significance of emphasis and contrast in the artwork. Develop a justified critical judgement based on visual impact, possible intent, and evidence.',
    },
  },
  unity_garden: {
    junior: {
      1: 'What colours, shapes, lines, or details repeat and help the artwork feel connected? Also find one part that adds variety.',
      2: 'How do the repeated and different parts work together to keep the artwork connected but interesting?',
      3: 'What mood or idea is created by the way the parts belong together? Explain which details support your answer.',
      4: 'Does the artwork have a good mix of unity and variety? Give one reason and explain something you learned.',
    },
    middle: {
      1: 'Identify repeated visual features that create unity and contrasting features that add variety.',
      2: 'Analyse how repetition, consistency, and difference work together to make the composition cohesive and engaging.',
      3: 'What mood, message, or relationship is communicated through unity and variety? Support your interpretation with specific visual evidence.',
      4: 'How effectively has the artist balanced unity and variety? Make a clear judgement and justify it with evidence from the artwork.',
    },
    senior: {
      1: 'Identify and precisely describe the visual relationships, repetitions, motifs, and contrasts that create unity and variety.',
      2: 'Analyse how unity and variety organise the composition, maintain coherence, create complexity, and influence viewer response.',
      3: 'Interpret the conceptual or symbolic meanings communicated through connections and differences within the artwork. Justify your reading with precise visual evidence and considered reasoning.',
      4: 'Evaluate the effectiveness and significance of unity and variety in the artwork. Develop a justified critical judgement based on visual impact, possible intent, and evidence.',
    },
  },
  rhythm_pattern_pavilion: {
    junior: {
      1: 'Find a shape, line, colour, or motif that repeats. Describe the pattern it creates.',
      2: 'How does the repetition create a beat, flow, or pathway for your eyes to follow?',
      3: 'What feeling or idea does the rhythm or pattern help communicate? Explain which repeated part supports your answer.',
      4: 'Does the rhythm or pattern make the artwork stronger? Give one reason and explain something you learned about repetition.',
    },
    middle: {
      1: 'Identify and describe the main repeated motifs, sequences, or patterns in the artwork.',
      2: 'Analyse how repetition, alternation, or variation creates visual rhythm and guides the viewer through the composition.',
      3: 'What mood, meaning, or symbolism is communicated through the rhythm and pattern? Support your interpretation with specific visual evidence.',
      4: 'How effectively has the artist used rhythm and pattern? Make a clear judgement and justify it with evidence from the artwork.',
    },
    senior: {
      1: 'Identify and precisely describe the significant motifs, intervals, sequences, repetitions, and variations that form rhythm and pattern.',
      2: 'Analyse how rhythm and pattern organise time and movement within the composition, create visual unity, and influence viewer response.',
      3: 'Interpret the conceptual, cultural, or symbolic meanings communicated through rhythm and pattern. Justify your reading with precise visual evidence and considered reasoning.',
      4: 'Evaluate the effectiveness and significance of rhythm and pattern in the artwork. Develop a justified critical judgement based on visual impact, possible intent, and evidence.',
    },
  },
  hall_of_movement: {
    junior: {
      1: 'Where does your eye travel first, next, and last? Describe the lines, shapes, or repeated parts that create this pathway.',
      2: 'How does the artist make the artwork feel still, slow, fast, flowing, or energetic?',
      3: 'What action, feeling, or idea does the movement help communicate? Explain which part supports your answer.',
      4: 'Does the movement guide your eyes well? Give one reason and explain something you learned about creating movement.',
    },
    middle: {
      1: 'Identify and describe the directional lines, gestures, repeated forms, or visual pathways that create movement.',
      2: "Analyse how the artist controls the speed, direction, and flow of the viewer's eye through the composition.",
      3: 'What mood, action, message, or energy is communicated through movement? Support your interpretation with specific visual evidence.',
      4: 'How effectively has the artist used movement? Make a clear judgement and justify it with evidence from the artwork.',
    },
    senior: {
      1: 'Identify and precisely describe the directional forces, gestures, repetitions, transitions, and visual pathways that create movement.',
      2: 'Analyse how movement structures the viewing experience and influences pace, energy, tension, narrative, and visual hierarchy.',
      3: 'Interpret the conceptual or symbolic meanings communicated through movement. Justify your reading with precise visual evidence and considered reasoning.',
      4: 'Evaluate the effectiveness and significance of movement in the artwork. Develop a justified critical judgement based on visual impact, possible intent, and evidence.',
    },
  },
  final_room: {
    junior: {
      1: 'Choose two art elements that stand out in the Keystone Prism. Describe what they look like and where you see them.',
      2: 'How do these elements work with an art principle such as balance, contrast, emphasis, movement, or pattern?',
      3: 'What feeling, story, or idea do you think the Prism communicates? Explain which visual clues support your answer.',
      4: 'How well do the elements and principles work together? Give one reason and explain how ArtQuest has changed the way you look at art.',
    },
    middle: {
      1: 'Identify and describe two significant art elements in the Keystone Prism using relevant visual arts terminology.',
      2: 'Analyse how these elements interact with principles such as balance, contrast, emphasis, movement, pattern, or unity.',
      3: "Interpret the Prism's possible mood, message, or meaning. Support your interpretation with specific visual evidence.",
      4: 'Evaluate how effectively the elements and principles work together, then explain how your approach to analysing art has developed during ArtQuest.',
    },
    senior: {
      1: 'Identify and precisely describe the most significant elements within the Keystone Prism, using specific evidence from the composition.',
      2: 'Analyse how elements and principles interact to shape structure, visual hierarchy, tension, movement, and viewer response.',
      3: "Interpret the Prism's possible conceptual meaning, mood, or message. Justify your reading with precise visual evidence and considered reasoning.",
      4: "Develop a reasoned judgement of the Prism's overall effectiveness, then reflect on how ArtQuest has shaped your analytical confidence and understanding.",
    },
  },
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
  const band = getYearBand(yearLevel);
  const roomTask = ROOM_PHASE_TASKS[wingId]?.[band]?.[safePhase];

  if (roomTask) {
    if (band !== 'senior') return roomTask;

    const seniorCourseExtension = coursePathway === 'atar'
      ? ' Include precise evidence, possible artistic intent, relevant context, and a justified critical position.'
      : coursePathway === 'general'
        ? ' Keep your response practical, reflective, audience-aware, and clearly supported by visual evidence.'
        : '';
    return `${roomTask}${seniorCourseExtension}`;
  }

  return getAgeAppropriatePhaseTask(content?.focus || 'this artwork', safePhase, yearLevel, coursePathway);
};
