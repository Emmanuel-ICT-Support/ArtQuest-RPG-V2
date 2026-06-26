import {
  DoorChallengeDefinition,
  DoorChallengeOption,
  DoorChallengeSortItem,
  MultipleChoiceDoorChallenge,
  SeniorCoursePathway,
  SortOrderDoorChallenge,
  YearLevel,
} from '../types';

type DoorChallengeYearBand = 'junior' | 'middle' | 'senior';

const getDoorChallengeYearBand = (yearLevel: YearLevel): DoorChallengeYearBand => {
  if (yearLevel >= 11) return 'senior';
  if (yearLevel >= 9) return 'middle';
  return 'junior';
};

const getYearBandLabel = (yearLevel: YearLevel, coursePathway?: SeniorCoursePathway): string => {
  if (yearLevel >= 11) {
    return coursePathway === 'atar' ? `Year ${yearLevel} ATAR` : `Year ${yearLevel} General`;
  }

  return `Year ${yearLevel}`;
};

const choiceChallenge = (
  challenge: Omit<MultipleChoiceDoorChallenge, 'type'> & {
    options: DoorChallengeOption[];
    correctOptionId: string;
  },
): DoorChallengeDefinition => ({
  ...challenge,
  type: 'multipleChoice',
});

const sortChallenge = (
  challenge: Omit<SortOrderDoorChallenge, 'type'> & {
    items: DoorChallengeSortItem[];
    correctOrder: string[];
    orderDirectionLabel: string;
  },
): DoorChallengeDefinition => ({
  ...challenge,
  type: 'sortOrder',
});

const promptsByBand = (
  band: DoorChallengeYearBand,
  junior: string,
  middle: string,
  senior: string,
  atar?: string,
  isAtar = false,
): string => {
  if (band === 'junior') return junior;
  if (band === 'middle') return middle;
  return isAtar && atar ? atar : senior;
};

export const getDoorChallengeForWing = (
  wingId: string,
  yearLevel: YearLevel,
  coursePathway?: SeniorCoursePathway,
): DoorChallengeDefinition | null => {
  const band = getDoorChallengeYearBand(yearLevel);
  const isAtar = yearLevel >= 11 && coursePathway === 'atar';
  const yearBandLabel = getYearBandLabel(yearLevel, coursePathway);

  switch (wingId) {
    case 'hall_of_line':
      return choiceChallenge({
        id: 'hall_of_line-threshold',
        wingId,
        guardName: 'Quill',
        guardTitle: 'Line Gate Guard',
        title: 'Line Lens Check',
        intro: 'The first door listens for a path made by marks.',
        prompt: promptsByBand(
          band,
          'Which line is created when your eye follows a path, even if no full line is drawn?',
          'A row of edges, gazes, or marks leads your eye across an artwork. Which kind of line is working?',
          'Which term best describes a compositional pathway created by aligned edges, gazes, or repeated marks rather than one continuous drawn stroke?',
          undefined,
          isAtar,
        ),
        hint: 'Look for the answer that describes a line your eye completes.',
        success: 'The ink seal wakes. You are ready to look for real, implied, and expressive lines.',
        preparedBadge: 'Line Lens Ready',
        yearBandLabel,
        options: [
          { id: 'contour', label: 'Contour line', detail: 'An outline around the edge of a form.' },
          { id: 'implied', label: 'Implied line', detail: 'A path suggested by separate marks or directions.' },
          { id: 'hatching', label: 'Hatching', detail: 'Repeated strokes often used to build tone.' },
        ],
        correctOptionId: 'implied',
      });

    case 'realm_of_colour':
      return choiceChallenge({
        id: 'realm_of_colour-threshold',
        wingId,
        guardName: 'Quill',
        guardTitle: 'Colour Gate Guard',
        title: 'Temperature Tuning',
        intro: 'This doorway changes temperature as colour shifts.',
        prompt: promptsByBand(
          band,
          'Which group is mostly warm colours?',
          'Which answer best links colour temperature to mood?',
          'Which response uses colour temperature as visual evidence rather than just naming colours?',
          'Which response most precisely connects colour temperature, saturation, and viewer response?',
          isAtar,
        ),
        hint: 'Warm colours often include reds, oranges, and yellows. Strong answers connect colour to effect.',
        success: 'The colour gate glows evenly. You are ready to read hue, warmth, coolness, and mood.',
        preparedBadge: 'Colour Reader Ready',
        yearBandLabel,
        options: band === 'junior'
          ? [
              { id: 'warm', label: 'Red, orange, yellow', detail: 'These colours often feel warm or energetic.' },
              { id: 'cool', label: 'Blue, green, violet', detail: 'These colours often feel cool or calm.' },
              { id: 'neutral', label: 'Black, white, grey', detail: 'These are neutral tones.' },
            ]
          : [
              { id: 'name-only', label: 'The artwork has lots of colours.', detail: 'This names colour but does not explain effect.' },
              { id: 'temperature-effect', label: 'Warm oranges feel energetic while cool blues calm the space.', detail: 'This links colour temperature to mood.' },
              { id: 'unrelated', label: 'The lines are thin and sharp.', detail: 'This may be true, but it is not colour evidence.' },
            ],
        correctOptionId: band === 'junior' ? 'warm' : 'temperature-effect',
      });

    case 'shape_form_forge':
      return choiceChallenge({
        id: 'shape_form_forge-threshold',
        wingId,
        guardName: 'Quill',
        guardTitle: 'Forge Door Guard',
        title: 'Flat Or Solid',
        intro: 'The forge door weighs flat shapes against solid-looking forms.',
        prompt: promptsByBand(
          band,
          'Which answer correctly explains shape and form?',
          'Which statement best separates shape from form for an artwork analysis?',
          'Which explanation would be strongest when distinguishing two-dimensional shape from three-dimensional form?',
          undefined,
          isAtar,
        ),
        hint: 'Shape is flat. Form suggests volume, mass, or three-dimensional space.',
        success: 'The forge sparks open. You are ready to spot flat shapes and solid forms.',
        preparedBadge: 'Shape/Form Ready',
        yearBandLabel,
        options: [
          { id: 'colour', label: 'Shape is bright; form is dark.', detail: 'Brightness belongs more to colour or value.' },
          { id: 'flat-solid', label: 'Shape is flat; form looks three-dimensional.', detail: 'This compares two-dimensional and three-dimensional qualities.' },
          { id: 'texture', label: 'Shape is rough; form is smooth.', detail: 'Rough and smooth describe texture.' },
        ],
        correctOptionId: 'flat-solid',
      });

    case 'texture_tower':
      return choiceChallenge({
        id: 'texture_tower-threshold',
        wingId,
        guardName: 'Sera',
        guardTitle: 'Texture Door Guard',
        title: 'Surface Evidence',
        intro: 'The tower door opens for careful surface words.',
        prompt: promptsByBand(
          band,
          'Which phrase gives the clearest texture evidence?',
          'Which observation best describes how a surface might look or feel?',
          'Which response uses tactile visual language that could support a deeper analysis of texture?',
          undefined,
          isAtar,
        ),
        hint: 'Texture words often describe how something might feel if touched.',
        success: 'The tower stones shift. You are ready to describe surfaces with precise sensory language.',
        preparedBadge: 'Texture Words Ready',
        yearBandLabel,
        options: [
          { id: 'rough', label: 'Rough cracked stone with raised edges', detail: 'This gives a clear surface description.' },
          { id: 'big', label: 'A very large shape', detail: 'This describes size more than texture.' },
          { id: 'left', label: 'Something on the left side', detail: 'This describes location more than surface.' },
        ],
        correctOptionId: 'rough',
      });

    case 'space_chamber':
      return sortChallenge({
        id: 'space_chamber-threshold',
        wingId,
        guardName: 'Sera',
        guardTitle: 'Space Door Guard',
        title: 'Depth Layer Sort',
        intro: 'The chamber door asks you to arrange depth before stepping through.',
        prompt: promptsByBand(
          band,
          'Drag the layers from closest to farthest away.',
          'Order these spatial layers from nearest to farthest in a composition.',
          'Arrange these depth zones in viewing order, then carry that spatial thinking into your analysis.',
          undefined,
          isAtar,
        ),
        hint: 'Foreground is closest, background is farthest, and middle ground sits between them.',
        success: 'The chamber gains depth. You are ready to notice foreground, middle ground, background, and negative space.',
        preparedBadge: 'Depth Reader Ready',
        yearBandLabel,
        orderDirectionLabel: 'Closest to farthest',
        items: [
          { id: 'background', label: 'Background', detail: 'The farthest area.' },
          { id: 'foreground', label: 'Foreground', detail: 'The area closest to the viewer.' },
          { id: 'middle-ground', label: 'Middle ground', detail: 'The space between near and far.' },
        ],
        correctOrder: ['foreground', 'middle-ground', 'background'],
      });

    case 'value_vault':
      return sortChallenge({
        id: 'value_vault-threshold',
        wingId,
        guardName: 'Sera',
        guardTitle: 'Value Vault Guard',
        title: 'Tonal Lock',
        intro: 'The vault will not open until its tones move from light to dark.',
        prompt: promptsByBand(
          band,
          'Drag the value tiles from lightest to darkest.',
          'Order the tones from lightest highlight to deepest shadow.',
          'Arrange the tonal range from high-key highlight to low-key shadow before analysing contrast and mood.',
          'Arrange the tonal range from high-key highlight to low-key shadow, then consider how value can direct emphasis and mood.',
          isAtar,
        ),
        hint: 'Value means how light or dark a colour or tone appears.',
        success: 'The tonal lock clicks. You are ready to look for highlights, shadows, and contrast.',
        preparedBadge: 'Value Scale Ready',
        yearBandLabel,
        orderDirectionLabel: 'Lightest to darkest',
        items: [
          { id: 'deep-shadow', label: 'Deep shadow', detail: 'Almost black.', swatch: '#111827' },
          { id: 'middle-tone', label: 'Middle tone', detail: 'Halfway between light and dark.', swatch: '#9ca3af' },
          { id: 'highlight', label: 'Highlight', detail: 'The brightest value.', swatch: '#f8fafc' },
          { id: 'dark-tone', label: 'Dark tone', detail: 'Close to shadow.', swatch: '#4b5563' },
          { id: 'light-tone', label: 'Light tone', detail: 'Pale but not pure white.', swatch: '#d1d5db' },
        ],
        correctOrder: ['highlight', 'light-tone', 'middle-tone', 'dark-tone', 'deep-shadow'],
      });

    case 'balance_bridge':
      return choiceChallenge({
        id: 'balance_bridge-threshold',
        wingId,
        guardName: 'Keel',
        guardTitle: 'Balance Bridge Guard',
        title: 'Visual Weight Test',
        intro: 'The bridge tests whether both sides can hold visual weight.',
        prompt: promptsByBand(
          band,
          'Two sides feel equally heavy, but the objects do not match. What kind of balance is this?',
          'A composition feels stable even though each side uses different objects. Which balance term fits best?',
          'Which term describes equal visual weight created through different forms, colours, or placements rather than mirrored halves?',
          undefined,
          isAtar,
        ),
        hint: 'Symmetry mirrors. Asymmetry can still feel balanced without matching exactly.',
        success: 'The bridge steadies. You are ready to judge visual weight and stability.',
        preparedBadge: 'Balance Ready',
        yearBandLabel,
        options: [
          { id: 'symmetrical', label: 'Symmetrical balance', detail: 'Both sides mirror or closely match.' },
          { id: 'asymmetrical', label: 'Asymmetrical balance', detail: 'Different sides still feel visually balanced.' },
          { id: 'pattern', label: 'Pattern', detail: 'Repeated motifs or designs.' },
        ],
        correctOptionId: 'asymmetrical',
      });

    case 'emphasis_arena':
      return choiceChallenge({
        id: 'emphasis_arena-threshold',
        wingId,
        guardName: 'Keel',
        guardTitle: 'Emphasis Arena Guard',
        title: 'Focal Point Signal',
        intro: 'The arena door follows the place your eye lands first.',
        prompt: promptsByBand(
          band,
          'A bright red circle sits among small grey squares. What makes it stand out?',
          'Which visual strategy most clearly creates a focal point in this example?',
          'Which answer best explains emphasis as a relationship between contrast, scale, and placement?',
          undefined,
          isAtar,
        ),
        hint: 'The focal point often stands out through contrast, size, colour, placement, or direction.',
        success: 'The spotlight finds its mark. You are ready to identify emphasis and focal points.',
        preparedBadge: 'Focal Point Ready',
        yearBandLabel,
        options: [
          { id: 'contrast', label: 'Contrast in colour and scale', detail: 'The red circle differs strongly from the grey squares.' },
          { id: 'texture', label: 'Rough texture', detail: 'Texture is not the main clue in this example.' },
          { id: 'background', label: 'The background is empty', detail: 'Empty space can help, but this example focuses on contrast.' },
        ],
        correctOptionId: 'contrast',
      });

    case 'unity_garden':
      return choiceChallenge({
        id: 'unity_garden-threshold',
        wingId,
        guardName: 'Keel',
        guardTitle: 'Unity Garden Guard',
        title: 'Harmony Thread',
        intro: 'The garden gate opens when variety is tied together.',
        prompt: promptsByBand(
          band,
          'Different flowers repeat the same leaf shape. What does the repeated shape help create?',
          'Which answer best explains how repetition can create unity while variety keeps a design interesting?',
          'Which analysis best connects repeated motifs to unity and controlled variation to visual interest?',
          undefined,
          isAtar,
        ),
        hint: 'Unity comes from connections that make different parts feel like they belong together.',
        success: 'The garden paths connect. You are ready to notice harmony, repetition, and variety.',
        preparedBadge: 'Unity Ready',
        yearBandLabel,
        options: [
          { id: 'unity-variety', label: 'Unity through repetition, with variety for interest', detail: 'Repeated parts can connect a whole design.' },
          { id: 'value', label: 'A full range from light to dark', detail: 'That describes value.' },
          { id: 'movement-only', label: 'Fast movement only', detail: 'Movement is a different principle.' },
        ],
        correctOptionId: 'unity-variety',
      });

    case 'rhythm_pattern_pavilion':
      return sortChallenge({
        id: 'rhythm_pattern_pavilion-threshold',
        wingId,
        guardName: 'Cadence',
        guardTitle: 'Pattern Pavilion Guard',
        title: 'Visual Beat Builder',
        intro: 'The pavilion waits for a steady visual beat.',
        prompt: promptsByBand(
          band,
          'Drag the motifs into an alternating pattern: leaf, spiral, leaf, spiral.',
          'Arrange the motifs to create a regular alternating rhythm.',
          'Arrange these motifs into a clear alternating rhythm before analysing repetition and visual pace.',
          undefined,
          isAtar,
        ),
        hint: 'Alternating rhythm repeats two motifs in a predictable back-and-forth sequence.',
        success: 'The pavilion finds the beat. You are ready to read repetition, rhythm, and pattern.',
        preparedBadge: 'Rhythm Ready',
        yearBandLabel,
        orderDirectionLabel: 'Alternating rhythm',
        items: [
          { id: 'spiral-1', label: 'Spiral motif', detail: 'A curved visual beat.' },
          { id: 'leaf-2', label: 'Leaf motif', detail: 'The repeated leaf returns.' },
          { id: 'leaf-1', label: 'Leaf motif', detail: 'The first visual beat.' },
          { id: 'spiral-2', label: 'Spiral motif', detail: 'The repeated spiral returns.' },
        ],
        correctOrder: ['leaf-1', 'spiral-1', 'leaf-2', 'spiral-2'],
      });

    case 'hall_of_movement':
      return sortChallenge({
        id: 'hall_of_movement-threshold',
        wingId,
        guardName: 'Cadence',
        guardTitle: 'Movement Hall Guard',
        title: 'Eye Path Trace',
        intro: 'The hall door opens when your eye can travel through a composition.',
        prompt: promptsByBand(
          band,
          'Order the clues to show how your eye might move through an artwork.',
          'Arrange the movement cues from the first point of attention to the final exit point.',
          'Sequence these directional cues as a visual pathway, from initial emphasis through transition to exit.',
          undefined,
          isAtar,
        ),
        hint: 'Start with the strongest attention point, then follow the direction lines toward the exit.',
        success: 'The hallway stirs forward. You are ready to trace visual movement and flow.',
        preparedBadge: 'Movement Path Ready',
        yearBandLabel,
        orderDirectionLabel: 'First look to final exit',
        items: [
          { id: 'curve', label: 'Curving path', detail: 'A transition that carries the eye onward.' },
          { id: 'doorway', label: 'Bright exit point', detail: 'The final destination for the eye.' },
          { id: 'spotlight', label: 'Strong focal mark', detail: 'The first point that catches attention.' },
        ],
        correctOrder: ['spotlight', 'curve', 'doorway'],
      });

    case 'final_room':
      return choiceChallenge({
        id: 'final_room-threshold',
        wingId,
        guardName: 'Cadence',
        guardTitle: 'Final Door Guard',
        title: 'Capstone Key',
        intro: 'The final door asks for the shape of a complete art judgement.',
        prompt: promptsByBand(
          band,
          'Which answer gives the strongest final-room response?',
          'Which response best combines observation, analysis, meaning, and judgement?',
          'Which capstone response best combines description, analysis, interpretation, evaluation, and reflection?',
          'Which capstone response most effectively synthesizes visual evidence, interpretation, judgement, and reflective awareness?',
          isAtar,
        ),
        hint: 'The final room needs more than a feeling. It needs evidence, meaning, and a supported judgement.',
        success: 'The keystone recognises your preparation. You are ready to bring evidence from the whole journey.',
        preparedBadge: 'Final Reflection Ready',
        yearBandLabel,
        options: [
          { id: 'feeling-only', label: 'I like it because it looks cool.', detail: 'This gives a feeling but little evidence.' },
          { id: 'list-only', label: 'It has colours, shapes, and lines.', detail: 'This observes features but does not explain meaning or judgement.' },
          { id: 'synthesis', label: 'The artist uses visual evidence to create meaning, and I can judge how successfully it works.', detail: 'This combines evidence, interpretation, and judgement.' },
        ],
        correctOptionId: 'synthesis',
      });

    default:
      return null;
  }
};
