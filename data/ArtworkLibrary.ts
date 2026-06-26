import { WING_DEFINITIONS } from '../constants';
import { ARTWORK_SELECTIONS } from './ArtworkSelections';
import type { ArtworkSelection } from './ArtworkSelections';
import { YearLevel } from '../types';

export const ARTQUEST_ARTWORK_MARKER = 'ARTQUEST_ARTWORK';

export interface ArtworkYearProfile {
  yearLevel: YearLevel;
  medium: string;
  style: string;
  complexity: string;
  continuityCue: string;
}

export interface ArtworkConcept {
  focus: string;
  title: string;
  subject: string;
  visualFocus: string;
  supportingElements: string;
}

export interface ArtworkBrief {
  wingId: string;
  wingName: string;
  yearLevel: YearLevel;
  focus: string;
  title: string;
  medium: string;
  style: string;
  subject: string;
  visualFocus: string;
  complexity: string;
  assetPath: string;
  prompt: string;
  sourceArtwork?: ArtworkSelection;
}

export interface ParsedArtworkPrompt {
  wingId: string;
  yearLevel: YearLevel;
  focus: string;
  medium: string;
  style: string;
}

export const YEAR_ARTWORK_PROFILES: Record<YearLevel, ArtworkYearProfile> = {
  7: {
    yearLevel: 7,
    medium: 'bold gouache and cut-paper collage',
    style: 'clear, playful, high-readability classroom illustration',
    complexity: 'simple composition with obvious visual cues and generous spacing',
    continuityCue: 'first encounter, designed for confident identification',
  },
  8: {
    yearLevel: 8,
    medium: 'watercolour, ink, and layered paper',
    style: 'story-rich illustrative mixed media',
    complexity: 'moderate detail with visible technique and a stronger sense of mood',
    continuityCue: 'same idea revisited with more narrative and atmosphere',
  },
  9: {
    yearLevel: 9,
    medium: 'linocut and screenprint-inspired printmaking',
    style: 'graphic, textured, and historically aware',
    complexity: 'layered motifs with more abstraction and symbolic choices',
    continuityCue: 'the concept becomes more stylised and interpretive',
  },
  10: {
    yearLevel: 10,
    medium: 'digital painting with acrylic and photographic collage textures',
    style: 'contemporary hybrid media',
    complexity: 'dense but organised composition with stronger visual relationships',
    continuityCue: 'the artwork asks for explanation of artist choices and effects',
  },
  11: {
    yearLevel: 11,
    medium: 'sculptural installation and projected light',
    style: 'conceptual contemporary gallery work',
    complexity: 'ambiguous spatial arrangement with material, context, and intent to unpack',
    continuityCue: 'the concept becomes material, conceptual, and audience-aware',
  },
  12: {
    yearLevel: 12,
    medium: 'experimental multimedia assemblage',
    style: 'sophisticated contemporary fine-art composition',
    complexity: 'nuanced, layered, and open to multiple justified readings',
    continuityCue: 'capstone version for critical analysis and judgement',
  },
};

export const WING_ARTWORK_CONCEPTS: Record<string, ArtworkConcept> = {
  hall_of_line: {
    focus: 'line',
    title: 'Pathways of the Mark',
    subject: 'a mysterious gallery path built from visible marks, edges, trails, and contours',
    visualFocus: 'jagged, flowing, implied, contour, and hatched lines directing the eye',
    supportingElements: 'limited colour, directional movement, contrast, and rhythm',
  },
  realm_of_colour: {
    focus: 'colour',
    title: 'Temperature of a Dream',
    subject: 'one dream world split between heat, calm, conflict, and harmony',
    visualFocus: 'warm and cool colour families, saturation shifts, and symbolic colour contrast',
    supportingElements: 'shape, space, balance, and emotional atmosphere',
  },
  shape_form_forge: {
    focus: 'shape and form',
    title: 'Forge of Things Becoming',
    subject: 'flat shapes transforming into solid forms in an imagined studio forge',
    visualFocus: 'geometric, organic, flat, volumetric, angular, and curved forms',
    supportingElements: 'value, shadow, scale, and overlapping space',
  },
  texture_tower: {
    focus: 'texture',
    title: 'Tower of Touch',
    subject: 'a vertical structure assembled from surfaces that look touchable',
    visualFocus: 'rough, smooth, woven, polished, grainy, soft, and layered textures',
    supportingElements: 'value, pattern, contrast, and material variety',
  },
  space_chamber: {
    focus: 'space',
    title: 'Room Between Things',
    subject: 'a chamber where silhouettes, voids, depth, and overlapping planes shift places',
    visualFocus: 'positive space, negative space, foreground, background, overlap, and perspective',
    supportingElements: 'shape, value, scale, and balance',
  },
  value_vault: {
    focus: 'value',
    title: 'Vault of Light and Dark',
    subject: 'a quiet vault revealed through light, shadow, half-tones, and reflected glow',
    visualFocus: 'highlights, shadows, gradients, tonal range, and dramatic contrast',
    supportingElements: 'space, shape, emphasis, and mood',
  },
  balance_bridge: {
    focus: 'balance',
    title: 'Bridge of Visual Weight',
    subject: 'objects arranged around a bridge, platform, or axis of visual weight',
    visualFocus: 'symmetrical, asymmetrical, radial, and weighted balance relationships',
    supportingElements: 'scale, colour, value, and composition',
  },
  emphasis_arena: {
    focus: 'emphasis and contrast',
    title: 'The Unavoidable Point',
    subject: 'an arena-like composition where one area commands attention',
    visualFocus: 'focal point, contrast, scale difference, isolation, and directional cues',
    supportingElements: 'colour, value, line, and balance',
  },
  unity_garden: {
    focus: 'unity and variety',
    title: 'Garden of One and Many',
    subject: 'a connected garden of repeated motifs, varied details, and shared visual language',
    visualFocus: 'harmony, repetition, motif, variation, and cohesive relationships',
    supportingElements: 'colour, shape, rhythm, and pattern',
  },
  rhythm_pattern_pavilion: {
    focus: 'rhythm and pattern',
    title: 'Pavilion of Visual Beats',
    subject: 'an architectural pavilion built from repeated marks, tiles, arches, and motifs',
    visualFocus: 'regular, alternating, flowing, and progressive rhythm with clear pattern',
    supportingElements: 'colour, line, shape, and movement',
  },
  hall_of_movement: {
    focus: 'movement',
    title: 'Hall of the Moving Eye',
    subject: 'a scene designed to pull the viewer through sweeping paths and repeated signals',
    visualFocus: 'diagonals, curves, gestures, blur, repetition, and visual pathways',
    supportingElements: 'line, rhythm, emphasis, and space',
  },
  final_room: {
    focus: 'combined elements and principles',
    title: 'Keystone Prism',
    subject: 'a luminous prism installation that combines the full ArtQuest journey',
    visualFocus: 'interacting line, colour, form, texture, space, value, balance, emphasis, unity, rhythm, and movement',
    supportingElements: 'reflection, judgement, materiality, and overall impact',
  },
};

export const ARTWORK_YEAR_LEVELS: YearLevel[] = [7, 8, 9, 10, 11, 12];

export const getArtworkAssetFilename = (wingId: string, yearLevel: YearLevel): string =>
  `${wingId}-year-${yearLevel}.jpg`;

export const getArtworkAssetPath = (wingId: string, yearLevel: YearLevel): string => {
  const relativePath = ARTWORK_SELECTIONS[wingId]?.[yearLevel]?.assetPath
    || `images/artworks/${getArtworkAssetFilename(wingId, yearLevel)}`;
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  return `./public/${relativePath.replace(/^\/+/, '')}`;
};

const escapeAttribute = (value: string): string => value.replace(/"/g, "'");

const buildMarker = (brief: Omit<ArtworkBrief, 'prompt'>): string =>
  `[${ARTQUEST_ARTWORK_MARKER} wing="${brief.wingId}" year="${brief.yearLevel}" focus="${escapeAttribute(brief.focus)}" medium="${escapeAttribute(brief.medium)}" style="${escapeAttribute(brief.style)}"]`;

export const getArtworkBrief = (wingId: string, yearLevel: YearLevel): ArtworkBrief => {
  const wing = WING_DEFINITIONS.find((item) => item.id === wingId) || WING_DEFINITIONS[0];
  const concept = WING_ARTWORK_CONCEPTS[wing.id] || WING_ARTWORK_CONCEPTS.hall_of_line;
  const profile = YEAR_ARTWORK_PROFILES[yearLevel] || YEAR_ARTWORK_PROFILES[7];
  const selection = ARTWORK_SELECTIONS[wing.id]?.[yearLevel];
  const title = selection ? `${selection.title} - ${selection.artistDisplay || 'Unknown artist'}` : `${concept.title} - Year ${yearLevel}`;
  const medium = selection?.mediumDisplay || profile.medium;
  const subject = selection
    ? `public-domain artwork from the Art Institute of Chicago: ${selection.title}, ${selection.dateDisplay}, ${selection.mediumDisplay}`
    : concept.subject;

  const briefWithoutPrompt = {
    wingId: wing.id,
    wingName: wing.name,
    yearLevel,
    focus: concept.focus,
    title,
    medium,
    style: profile.style,
    subject,
    visualFocus: concept.visualFocus,
    complexity: profile.complexity,
    assetPath: getArtworkAssetPath(wing.id, yearLevel),
    sourceArtwork: selection,
  };

  const prompt = `${buildMarker(briefWithoutPrompt)}
Use this selected public-domain artwork for ArtQuest analysis.
Title: ${briefWithoutPrompt.title}.
Wing: ${wing.name}.
Primary focus: ${concept.focus}.
Medium/style: ${briefWithoutPrompt.medium}; ${profile.style}.
Subject: ${briefWithoutPrompt.subject}.
Visual focus: ${concept.visualFocus}.
Supporting art ideas: ${concept.supportingElements}.
Year-level progression: ${profile.continuityCue}; ${profile.complexity}.
The primary focus should guide analysis, while other elements and principles remain available for richer discussion.
${selection ? `Source: ${selection.sourceUrl}. Credit: ${selection.creditLine}.` : 'No text, labels, logos, signatures, watermarks, gore, mature content, or copyrighted characters.'}`;

  return {
    ...briefWithoutPrompt,
    prompt,
  };
};

export const getArtworkPrompt = (wingId: string, yearLevel: YearLevel): string =>
  getArtworkBrief(wingId, yearLevel).prompt;

export const getArtworkBatch = (): ArtworkBrief[] =>
  WING_DEFINITIONS.flatMap((wing) => ARTWORK_YEAR_LEVELS.map((yearLevel) => getArtworkBrief(wing.id, yearLevel)));

export const parseArtworkPrompt = (prompt: string): ParsedArtworkPrompt | null => {
  const markerMatch = prompt.match(/\[ARTQUEST_ARTWORK\s+([^\]]+)\]/);
  if (!markerMatch) return null;

  const attributes: Record<string, string> = {};
  const attributeRegex = /(\w+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = attributeRegex.exec(markerMatch[1])) !== null) {
    attributes[match[1]] = match[2];
  }

  const parsedYear = Number(attributes.year);
  if (!attributes.wing || !ARTWORK_YEAR_LEVELS.includes(parsedYear as YearLevel)) return null;

  return {
    wingId: attributes.wing,
    yearLevel: parsedYear as YearLevel,
    focus: attributes.focus || 'art analysis',
    medium: attributes.medium || YEAR_ARTWORK_PROFILES[parsedYear as YearLevel].medium,
    style: attributes.style || YEAR_ARTWORK_PROFILES[parsedYear as YearLevel].style,
  };
};
