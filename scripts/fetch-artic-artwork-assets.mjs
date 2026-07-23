import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const outputDir = resolve('public/images/artworks');
const selectionsFile = resolve('data/ArtworkSelections.ts');
const manifestFile = resolve(outputDir, 'manifest.json');
const searchUrl = 'https://api.artic.edu/api/v1/artworks/search';
const hotlinkOnly = process.argv.includes('--hotlink-only') || process.argv.includes('--remote-only');
const dryRun = process.argv.includes('--dry-run');
const verifyImages = process.argv.includes('--verify-images');
const fields = [
  'id',
  'title',
  'artist_display',
  'date_display',
  'date_start',
  'date_end',
  'image_id',
  'is_public_domain',
  'medium_display',
  'classification_title',
  'artwork_type_title',
  'place_of_origin',
  'credit_line',
  'department_title',
  'artist_title',
  'style_title',
  'subject_titles',
  'term_titles',
  'copyright_notice',
  'thumbnail',
  'api_link',
].join(',');

const years = [7, 8, 9, 10, 11, 12];

const slot = (query, focusReason, options = {}) => ({
  query,
  focusReason,
  minYear: 1850,
  minPreferredYear: 1900,
  allowNonPublicDomain: false,
  allowSculpture: false,
  ...options,
});

const searchPlan = {
  hall_of_line: [
    slot('Paris Street Rainy Day line perspective', 'Street edges, umbrella curves, lamp posts, and perspective lines give Year 7 students both line evidence and a story to interpret.', { minPreferredYear: 1850 }),
    slot('modern ink drawing landscape line', 'Drawing media make contour, edge, direction, and line quality visible without mature subject matter.'),
    slot('lithograph line figure movement 20th century', 'Graphic line work supports discussion of hatching, contour, repeated marks, and expressive gesture.'),
    slot('Cypresses Vincent van Gogh', 'Towering cypresses, rolling hills, and animated brushstrokes create expressive vertical, diagonal, and swirling lines for sophisticated analysis.'),
    slot('urban photograph lines perspective contemporary', 'A contemporary urban image gives senior students layered linear evidence in a familiar environment.', { minPreferredYear: 1980, allowNonPublicDomain: true }),
    slot('contemporary city photograph line 2000', 'A 21st-century city image supports complex line analysis through grids, edges, scale, and movement.', { minPreferredYear: 2000, allowNonPublicDomain: true }),
  ],
  realm_of_colour: [
    slot('colorful landscape painting modern', 'Accessible colour groups and mood contrast give junior students clear evidence.'),
    slot('watercolor color landscape modern', 'Watercolour and landscape colour create visible temperature, atmosphere, and harmony.'),
    slot('modern color painting landscape 20th century', 'Modern colour relationships invite explanation of emotional and visual effect.'),
    slot('Kandinsky Murnau color landscape', 'A modernist colour landscape supports discussion of saturation, contrast, and expressive colour.'),
    slot('Alma Thomas color painting 1970', 'Late-20th-century colour fields and repeated marks support more conceptual colour analysis.', { minPreferredYear: 1950, allowNonPublicDomain: true }),
    slot('Peter Doig Gasthof color painting 2000', 'A 21st-century painting offers layered colour, mood, and ambiguity for senior judgement.', { minPreferredYear: 2000, allowNonPublicDomain: true }),
  ],
  shape_form_forge: [
    slot('geometric shape painting modern', 'Obvious geometric and organic shapes support identification and description.'),
    slot('vessel form design 20th century', 'Designed objects and vessels show three-dimensional form through structure and contour.'),
    slot('modern still life shape form painting', 'Still-life forms support analysis of volume, edges, and spatial relationships.'),
    slot('Eve after the Fall Rodin', 'Rodin’s carved marble figure gives students a powerful three-dimensional form to analyse through pose, volume, surface, and negative space.', { allowSculpture: true }),
    slot('modern design chair form 1980', 'Late-20th-century design provides engaging non-sculptural form, silhouette, and material evidence.', { minPreferredYear: 1980, allowNonPublicDomain: true }),
    slot('contemporary design chair form 2000', 'A contemporary design object supports senior discussion of function, form, material, and audience.', { minPreferredYear: 2000, allowNonPublicDomain: true }),
  ],
  texture_tower: [
    slot('William Morris textile texture', 'Textiles provide immediate visual and implied texture with safe natural motifs.'),
    slot('woven basket texture 20th century', 'Woven surfaces support sensory language and material observation.'),
    slot('modern textile pattern texture', 'Patterned modern textiles support texture, repetition, and surface vocabulary.'),
    slot('ceramic glaze texture modern', 'Surface finish supports analysis of rough, smooth, reflective, and tactile effects.'),
    slot('photograph texture close up modern', 'Photography can make texture, grain, and surface detail visible for older students.', { minPreferredYear: 1950, allowNonPublicDomain: true }),
    slot('contemporary textile texture pattern', 'Contemporary material and pattern choices support senior analysis of texture and meaning.', { minPreferredYear: 1980, allowNonPublicDomain: true }),
  ],
  space_chamber: [
    slot('city street perspective modern painting', 'Foreground, middle ground, background, and scale are clear in an accessible street scene.', { minPreferredYear: 1850 }),
    slot('interior perspective modern painting', 'Interior depth supports spatial description through furniture, walls, and viewpoint.'),
    slot('architecture perspective modern photograph', 'Architecture and photography make linear perspective and scale relationships visible.'),
    slot('The Bedroom Vincent van Gogh', 'The tilted furniture, sharply receding floor and wall lines, and compact interior make perspective and spatial tension especially clear.'),
    slot('Thomas Struth museum space photograph 1990', 'A late-20th-century museum photograph supports discussion of audience, scale, and institutional space.', { minPreferredYear: 1980, allowNonPublicDomain: true }),
    slot('Andreas Gursky Shanghai space photograph 2000', 'A 21st-century photograph offers complex depth, grid, scale, and contemporary visual space.', { minPreferredYear: 2000, allowNonPublicDomain: true }),
  ],
  value_vault: [
    slot('black white drawing shadow modern', 'Light and dark values are easy to identify and connect to mood.'),
    slot('nocturne painting modern', 'Dark tonal range supports mood interpretation without relying on violent imagery.'),
    slot('etching shadow modern', 'Printed value supports vocabulary for tone, contrast, and hatching.'),
    slot('Edward Hopper night value', 'Modern night imagery links value, mood, contrast, and viewer attention.', { allowNonPublicDomain: true }),
    slot('black and white photograph shadow 1950', 'Mid-century photography supports nuanced tonal analysis through light, shadow, and grain.', { minPreferredYear: 1950, allowNonPublicDomain: true }),
    slot('contemporary photograph shadow light 2000', 'Contemporary photography gives senior students subtle tonal relationships to evaluate.', { minPreferredYear: 2000, allowNonPublicDomain: true }),
  ],
  balance_bridge: [
    slot('balanced park scene painting', 'Large and small figures, empty space, and repeated shapes support visual weight discussion.', { minPreferredYear: 1850 }),
    slot('balanced still life modern painting', 'Object arrangement supports discussion of stable and asymmetrical composition.'),
    slot('modern composition balance painting', 'Distributed visual weight supports interpretation of structure and harmony.'),
    slot('At the Moulin Rouge Toulouse-Lautrec', 'The off-centre figures, cropped edges, mirrors, and vivid accents create a rich example of asymmetrical balance and visual weight.'),
    slot('architecture balance photograph 1990', 'Late-20th-century architecture supports complex balance, symmetry, and scale analysis.', { minPreferredYear: 1980, allowNonPublicDomain: true }),
    slot('contemporary design balance 2000', 'Contemporary design supports senior evaluation of balance between function, form, and visual weight.', { minPreferredYear: 2000, allowNonPublicDomain: true }),
  ],
  emphasis_arena: [
    slot('portrait focal point modern painting', 'A clear subject supports emphasis identification through placement and contrast.'),
    slot('red accent painting modern', 'Contrast and colour can create a focal point students can explain.'),
    slot('central figure composition modern', 'Placement supports discussion of attention, hierarchy, and context.'),
    slot('Edward Hopper focal point painting', 'Modern lighting and isolation create strong emphasis for analysis.', { allowNonPublicDomain: true }),
    slot('Jacob Lawrence focal point print', 'Figurative modern work creates focal hierarchy through colour, shape, and social setting.', { minPreferredYear: 1940, allowNonPublicDomain: true }),
    slot('contemporary photograph focal point 2000', 'A 21st-century image supports senior analysis of visual hierarchy and intent.', { minPreferredYear: 2000, allowNonPublicDomain: true }),
  ],
  unity_garden: [
    slot('flower garden painting modern', 'Repeated natural forms support unity and variety with accessible imagery.'),
    slot('floral still life modern', 'Shared colour and varied forms support description and comparison.'),
    slot('Water Lilies Monet unity variety', 'Repeated water, flowers, and reflections connect the image while preserving variation.'),
    slot('modern landscape motif repetition', 'Repeated motifs invite interpretation of cohesion, mood, and viewpoint.'),
    slot('Alma Thomas unity variety painting', 'Repeated marks and shifting colours support late-20th-century unity and variety analysis.', { minPreferredYear: 1950, allowNonPublicDomain: true }),
    slot('contemporary landscape unity variety 2000', 'A contemporary image supports senior judgement of cohesion across colour, space, and repeated motifs.', { minPreferredYear: 2000, allowNonPublicDomain: true }),
  ],
  rhythm_pattern_pavilion: [
    slot('William Morris pattern textile', 'Repeated natural motifs are clear, engaging, and accessible for pattern analysis.'),
    slot('decorative pattern modern textile', 'Alternating visual beats support pattern and rhythm vocabulary.'),
    slot('wallpaper pattern modern design', 'Designed repetition supports rhythm, motif, and surface discussion.'),
    slot('modern textile rhythm pattern', 'Modern textile design supports complex repeated geometry and visual pacing.'),
    slot('Alma Thomas rhythm pattern painting', 'Late-20th-century repeated marks support higher-level analysis of visual rhythm.', { minPreferredYear: 1950, allowNonPublicDomain: true }),
    slot('contemporary pattern photograph 2000', 'A 21st-century image offers complex repetition, scale, and rhythm for senior evaluation.', { minPreferredYear: 2000, allowNonPublicDomain: true }),
  ],
  hall_of_movement: [
    slot('horse movement painting modern', 'Subject movement supports accessible analysis through gesture and direction.', { minPreferredYear: 1850 }),
    slot('dance movement modern painting', 'Gesture and rhythm support movement description.'),
    slot('Love of Winter movement Bellows', 'Active figures and diagonal paths create energetic movement in a modern scene.'),
    slot('Marsden Hartley Movement No. 10', 'Modern composition creates visual pathways through diagonals, curves, and repetition.'),
    slot('train movement modern painting', 'Modern transport imagery supports interpretation of speed, direction, and urban change.', { allowNonPublicDomain: true }),
    slot('contemporary city movement photograph 2000', 'A 21st-century urban image supports senior judgement of visual flow, scale, and rhythm.', { minPreferredYear: 2000, allowNonPublicDomain: true }),
  ],
  final_room: [
    slot('Tiffany lamp color light pattern', 'Colour, value, pattern, and material combine for final analysis.'),
    slot('modern glass design light color', 'Transparent form connects colour, value, shape, and material.'),
    slot('modern painting color form space', 'Modern composition invites synthesis of several elements and principles.'),
    slot('Jacob Lawrence The Wedding', 'Figurative modern work combines colour, shape, emphasis, rhythm, and social meaning.', { allowNonPublicDomain: true }),
    slot('Edward Hopper Nighthawks', 'A familiar modern painting supports broad analysis of colour, value, space, balance, and emphasis.', { allowNonPublicDomain: true }),
    slot('Peter Doig Gasthof painting 2000', 'A 21st-century capstone image supports multi-principle judgement through colour, space, mood, and ambiguity.', { minPreferredYear: 2000, allowNonPublicDomain: true }),
  ],
};

const manualSelections = {
  hall_of_line: {
    7: [20684, 'Street edges, umbrella curves, lamp posts, and perspective lines give Year 7 students both line evidence and a story to interpret.'],
    8: [210484, 'A preparatory drawing makes sketch line, perspective, and compositional planning visible.'],
    9: [50091, 'Printmaking line and train-window geometry support contour, hatching, and directional analysis.'],
    11: [258252, 'A late-20th-century city photograph gives senior students layered edge, grid, and perspective evidence.'],
    12: [180574, 'A 21st-century architectural rendering supports complex line, viewpoint, and design-intent analysis.'],
  },
  realm_of_colour: {
    7: [20701, 'Monet gives accessible colour temperature, light, and atmosphere for junior analysis.'],
    8: [4887, 'High-key floral colour supports clear discussion of hue, contrast, and mood.'],
    9: [129849, 'A modernist colour landscape supports discussion of saturation, contrast, and expressive colour.'],
    10: [8983, 'A modernist painting lets students connect colour relationships to mood, movement, and expressive structure.'],
    11: [24306, 'A modern colour composition supports more conceptual analysis of harmony, contrast, and musical rhythm.'],
    12: [160226, 'A 21st-century painting offers layered colour, mood, and ambiguity for senior judgement.'],
  },
  shape_form_forge: {
    7: [65930, 'A modern still life gives clear shapes, edges, and volumetric forms to identify.'],
    8: [65940, 'A modern still life supports discussion of object form, overlap, and spatial arrangement.'],
    9: [109819, 'Geometric modernism makes shape, proportion, and composition explicit.'],
    10: [16963, 'Rodin’s carved marble figure gives students a powerful three-dimensional form to analyse through pose, volume, surface, and negative space.'],
    11: [191220, 'A 21st-century chair design supports analysis of organic form, function, and material.'],
    12: [205051, 'A contemporary chair supports senior discussion of function, form, material, and audience.'],
  },
  texture_tower: {
    7: [149052, 'A richly patterned textile gives visible surface, motif, and implied texture.'],
    8: [103918, 'Textile design supports sensory language through woven pattern and dense surface detail.'],
    9: [59973, 'A mid-century textile connects texture, pattern, and modern graphic rhythm.'],
    10: [100200, 'A modern furnishing fabric supports analysis of texture, repeat, and designed surface.'],
    11: [121846, 'A mid-century textile gives older students material, motif, and surface relationships to unpack.'],
    12: [160098, 'A contemporary textile-based work supports senior analysis of layered surface, rhythm, and cultural context.'],
  },
  space_chamber: {
    7: [16584, 'Atmospheric depth and landmark scale make foreground, background, and space accessible.'],
    8: [14752, 'A modern interior drawing supports spatial description through walls, furniture, and viewpoint.'],
    9: [14749, 'Architecture and drawing make scale, viewpoint, and built space visible.'],
    10: [28560, 'The tilted furniture, sharply receding floor and wall lines, and compact interior make perspective and spatial tension especially clear.'],
    11: [117271, 'A late-20th-century museum photograph supports discussion of audience, scale, and institutional space.'],
    12: [157154, 'A 21st-century photograph offers complex depth, grid, scale, and contemporary visual space.'],
  },
  value_vault: {
    7: [80607, 'A portrait with visible light, dark, and mid-tone shifts makes value easy to identify.'],
    8: [50049, 'A modern print gives strong black-and-white contrast for tonal vocabulary.'],
    9: [5273, 'Mid-century photography supports nuanced tonal analysis through light, shadow, and grain.'],
    10: [111628, 'Modern night imagery links value, mood, contrast, and viewer attention.'],
    11: [14568, 'A mid-century photograph uses lighting and tonal contrast as the main visual effect.'],
    12: [258251, 'A late-20th-century city photograph supports senior judgement of tonal range, contrast, and atmosphere.'],
  },
  balance_bridge: {
    7: [27992, 'A crowded park scene lets students compare visual weight, empty space, and stable composition.'],
    8: [65908, 'A modern landscape supports balance through mass, horizon, and dark-light placement.'],
    9: [65920, 'Modern shapes and repeated forms support discussion of asymmetrical balance.'],
    10: [61128, 'The off-centre figures, cropped edges, mirrors, and vivid accents create a rich example of asymmetrical balance and visual weight.'],
    11: [189810, 'A contemporary design object supports balance between function, form, and visual weight.'],
    12: [191197, 'A 21st-century design work supports senior analysis of balance, structure, and material logic.'],
  },
  emphasis_arena: {
    7: [27949, 'A central figure and strong colour relationships create an accessible focal point.'],
    8: [8987, 'A clear green centre and surrounding contrast support discussion of focal emphasis.'],
    9: [117319, 'A powerful modern print uses contrast, gaze, and placement to build focal emphasis.'],
    10: [125660, 'Figurative modern work creates focal hierarchy through colour, shape, and social setting.'],
    11: [189200, 'A late-20th-century print uses clustered figures, tools, and contrast to build focal hierarchy.'],
    12: [195902, 'A 21st-century photograph supports senior analysis of focal point, scale, and visual restraint.'],
  },
  unity_garden: {
    7: [87088, 'Repeated water, flowers, and reflections connect the image while preserving variation.'],
    8: [14586, 'A garden image gives shared colour, repeated plants, and varied forms to compare.'],
    9: [144467, 'Repeated landscape motifs invite interpretation of cohesion, mood, and viewpoint.'],
    10: [118577, 'A modern landscape connects repeated forms, colour, and atmosphere into a cohesive whole.'],
    11: [129884, 'A late-20th-century painting connects repeated marks, colour, and variation into a cohesive whole.'],
    12: [186391, 'A late-20th-century landscape photograph supports senior judgement of unity through repeated forms, depth, and atmosphere.'],
  },
  rhythm_pattern_pavilion: {
    7: [52412, 'Repeated natural motifs are clear, engaging, and accessible for pattern analysis.'],
    8: [39170, 'Alternating plant forms support pattern and rhythm vocabulary.'],
    9: [149366, 'A modern textile uses repeated pathways and modular structure to create visual rhythm.'],
    10: [59955, 'A designed bookcover supports pattern, motif, and visual beat analysis.'],
    11: [48506, 'A late-20th-century painting uses repeated everyday forms for clear rhythm, pattern, and variation analysis.'],
    12: [198851, 'A 21st-century architectural drawing offers complex repetition, scale, and rhythm for senior evaluation.'],
  },
  hall_of_movement: {
    7: [71573, 'Active figures and curved paths make movement easy to identify.'],
    8: [16571, 'Train steam, diagonal tracks, and crowd movement support accessible movement analysis.'],
    9: [90207, 'Modern composition creates visual pathways through diagonals, curves, and repetition.'],
    10: [66108, 'Modern boats and forms support analysis of implied motion and directional flow.'],
    11: [145182, 'A late-20th-century street scene uses figures, rhythm, and direction to imply movement.'],
    12: [191464, 'A 21st-century time-based image supports senior judgement of visual flow, duration, and movement.'],
  },
  final_room: {
    7: [185905, 'Colour, value, pattern, form, and material combine for final analysis.'],
    8: [192781, 'Glass, colour, line, pattern, and light connect several elements and principles.'],
    9: [111814, 'A modern figurative work combines line, colour, shape, emphasis, and context.'],
    10: [147629, 'Figurative modern work combines colour, shape, emphasis, rhythm, and social meaning.'],
    11: [64383, 'A modern interior combines value, space, colour, balance, and human context for broad analysis.'],
    12: [188919, 'A 21st-century work supports multi-principle judgement through colour, space, mood, and ambiguity.'],
  },
};

// Cypresses is not held by the Art Institute of Chicago, so retain its
// Metropolitan Museum of Art collection record when refreshing local assets.
const externalSelections = {
  hall_of_line: {
    10: {
      id: 437980,
      title: 'Cypresses',
      artistDisplay: 'Vincent van Gogh (Dutch, 1853–1890)',
      dateDisplay: '1889',
      dateStart: 1889,
      dateEnd: 1889,
      isPublicDomain: true,
      imageId: 'DP130999',
      mediumDisplay: 'Oil on canvas',
      classificationTitle: 'Paintings',
      artworkTypeTitle: 'Painting',
      placeOfOrigin: 'Saint-Rémy-de-Provence, France',
      creditLine: 'Rogers Fund, 1949',
      departmentTitle: 'European Paintings',
      artistTitle: 'Vincent van Gogh',
      styleTitle: 'Post-Impressionism',
      copyrightNotice: '',
      apiLink: 'https://collectionapi.metmuseum.org/public/collection/v1/objects/437980',
      sourceUrl: 'https://www.metmuseum.org/art/collection/search/437980',
      iiifUrl: 'https://images.metmuseum.org/CRDImages/ep/original/DP130999.jpg',
      focusReason: 'Towering cypresses, rolling hills, and animated brushstrokes create expressive vertical, diagonal, and swirling lines for sophisticated analysis.',
    },
  },
};

const suppressedArtworkIds = new Set([
  135,
  936,
  1890,
  5379,
  11492,
  12371,
  114932,
  196350,
  202543,
  65821,
  14757,
  157160,
  229385,
]);

const titleOverrides = {
};

const publicDomainOnly = process.argv.includes('--public-domain-only') || process.argv.includes('--pd-only');

const unsafePattern = /\b(nude|naked|erotic|rape|prostitute|streetwalker|courtesan|brothel|phallus|skull|grave|tomb|death|dead|execution|martyrdom|massacre|beheading|crucifixion|violence|violent|wound|wounded|blood|cannon|cannons|gun|rifle|weapon|war)\b/i;
const weakArchiveRecordPattern = /\b(model:|vehicle id|serial number|license plate|engine data|chassis data|price:|manufacturer:|distributor:|brake horsepower)\b/i;
const abstractSculpturePattern = /\b(abstract|nonobjective|non-objective)\b/i;
const sculpturePattern = /\b(sculpture|statue|statuette|figurine|bust|relief)\b/i;

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

const safeText = (value) => (value || '').toString().replace(/\s+/g, ' ').trim();

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ArtQuest educational artwork fetcher',
      Accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error(`Request failed ${response.status}: ${url}`);
  return response.json();
};

const searchArtworks = async (slotConfig) => {
  const url = new URL(searchUrl);
  url.searchParams.set('q', slotConfig.query);
  if (publicDomainOnly || !slotConfig.allowNonPublicDomain) {
    url.searchParams.set('query[term][is_public_domain]', 'true');
  }
  url.searchParams.set('fields', fields);
  url.searchParams.set('limit', '100');
  const json = await fetchJson(url);
  return Array.isArray(json.data) ? json.data : [];
};

const getArtworkById = async (id) => {
  const url = new URL(`https://api.artic.edu/api/v1/artworks/${id}`);
  url.searchParams.set('fields', fields);
  const json = await fetchJson(url);
  if (!json.data) throw new Error(`No artwork found for manual selection: ${id}`);
  return json.data;
};

const getArtworkStartYear = (artwork) => {
  if (Number.isFinite(artwork?.date_start)) return artwork.date_start;
  const matches = [...safeText(artwork?.date_display).matchAll(/(1[89]\d{2}|20\d{2})/g)].map((match) => Number(match[1]));
  return matches.length > 0 ? Math.min(...matches) : null;
};

const getArtworkEndYear = (artwork) => {
  if (Number.isFinite(artwork?.date_end)) return artwork.date_end;
  const matches = [...safeText(artwork?.date_display).matchAll(/(1[89]\d{2}|20\d{2})/g)].map((match) => Number(match[1]));
  return matches.length > 0 ? Math.max(...matches) : null;
};

const getArtworkText = (artwork) => [
  artwork.title,
  artwork.artist_display,
  artwork.medium_display,
  artwork.classification_title,
  artwork.artwork_type_title,
  artwork.department_title,
  artwork.artist_title,
  artwork.style_title,
  Array.isArray(artwork.subject_titles) ? artwork.subject_titles.join(' ') : '',
  Array.isArray(artwork.term_titles) ? artwork.term_titles.join(' ') : '',
  artwork.thumbnail?.alt_text,
].map(safeText).join(' ');

const getSculptureText = (artwork) => [
  artwork.title,
  artwork.medium_display,
  artwork.classification_title,
  artwork.artwork_type_title,
  Array.isArray(artwork.term_titles) ? artwork.term_titles.join(' ') : '',
].map(safeText).join(' ');

const isSculptureCandidate = (artwork) => sculpturePattern.test(getSculptureText(artwork));

const isSafeCandidate = (artwork, slotConfig) => {
  if (!artwork?.image_id) return false;
  if ((publicDomainOnly || !slotConfig.allowNonPublicDomain) && !artwork.is_public_domain) return false;
  const startYear = getArtworkStartYear(artwork);
  if (!Number.isFinite(startYear) || startYear < slotConfig.minYear) return false;
  const endYear = getArtworkEndYear(artwork);
  if (Number.isFinite(endYear) && endYear < slotConfig.minYear) return false;

  const combined = [
    getArtworkText(artwork),
    artwork.copyright_notice,
  ].map(safeText).join(' ');
  if (unsafePattern.test(combined)) return false;
  if (weakArchiveRecordPattern.test(combined)) return false;

  if (!isSculptureCandidate(artwork)) return true;
  return slotConfig.allowSculpture
    && startYear >= 1980
    && !abstractSculpturePattern.test(combined);
};

const scoreCandidate = (artwork, slotConfig) => {
  const titleText = safeText(artwork.title).toLowerCase();
  const descriptiveText = [
    artwork.medium_display,
    artwork.classification_title,
    artwork.artwork_type_title,
    artwork.department_title,
    artwork.style_title,
    Array.isArray(artwork.subject_titles) ? artwork.subject_titles.join(' ') : '',
    Array.isArray(artwork.term_titles) ? artwork.term_titles.join(' ') : '',
    artwork.thumbnail?.alt_text,
  ].map(safeText).join(' ').toLowerCase();
  const fullText = getArtworkText(artwork).toLowerCase();
  const startYear = getArtworkStartYear(artwork) || 0;
  const artworkType = safeText(artwork.artwork_type_title).toLowerCase();
  const classification = safeText(artwork.classification_title).toLowerCase();
  const medium = safeText(artwork.medium_display).toLowerCase();
  const queryText = slotConfig.query.toLowerCase();

  const relevanceScore = slotConfig.query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 2)
    .reduce((score, term) => {
      if (descriptiveText.includes(term)) return score + 3;
      if (titleText.includes(term)) return score + 1;
      if (fullText.includes(term)) return score + 1;
      return score;
    }, 0);

  const modernScore = [
    startYear >= slotConfig.minPreferredYear ? 8 : 0,
    startYear >= 1900 ? 6 : 0,
    startYear >= 1950 ? 3 : 0,
    startYear >= 1980 ? 3 : 0,
    startYear >= 2000 ? 2 : 0,
    artwork.artwork_type_title === 'Painting' ? 2 : 0,
    artwork.artwork_type_title === 'Drawing and Watercolor' ? 1 : 0,
    artwork.artwork_type_title === 'Print' ? 1 : 0,
    artwork.artwork_type_title === 'Photograph' ? 1 : 0,
    queryText.includes('painting') && artworkType === 'painting' ? 8 : 0,
    queryText.includes('photograph') && artworkType === 'photograph' ? 8 : 0,
    queryText.includes('drawing') && artworkType.includes('drawing') ? 8 : 0,
    queryText.includes('print') && artworkType === 'print' ? 8 : 0,
    queryText.includes('textile') && (artworkType === 'textile' || classification.includes('textile') || medium.includes('textile')) ? 10 : 0,
    queryText.includes('woven') && (classification.includes('basket') || medium.includes('woven') || medium.includes('fiber')) ? 8 : 0,
    queryText.includes('ceramic') && (artworkType === 'ceramics' || classification.includes('ceramic') || medium.includes('ceramic')) ? 10 : 0,
    queryText.includes('design') && artworkType === 'design' ? 10 : 0,
    queryText.includes('chair') && (titleText.includes('chair') || fullText.includes('chair')) ? 8 : 0,
    queryText.includes('architecture') && (artworkType.includes('architectural') || classification.includes('architecture') || fullText.includes('architecture')) ? 8 : 0,
    artwork.is_public_domain ? 0.5 : 0,
    isSculptureCandidate(artwork) ? -30 : 0,
  ].reduce((sum, value) => sum + value, 0);

  return relevanceScore + modernScore;
};

const chooseArtwork = async (slotConfig, usedIds) => {
  const candidates = (await searchArtworks(slotConfig))
    .filter((artwork) => isSafeCandidate(artwork, slotConfig))
    .filter((artwork) => !usedIds.has(artwork.id))
    .sort((a, b) => scoreCandidate(b, slotConfig) - scoreCandidate(a, slotConfig));

  if (candidates.length > 0) return candidates[0];

  const fallbackSlot = {
    ...slotConfig,
    query: slotConfig.query.split(/\s+/).slice(-1)[0],
  };
  const fallbackCandidates = (await searchArtworks(fallbackSlot))
    .filter((artwork) => isSafeCandidate(artwork, fallbackSlot))
    .filter((artwork) => !usedIds.has(artwork.id))
    .sort((a, b) => scoreCandidate(b, fallbackSlot) - scoreCandidate(a, fallbackSlot));

  if (fallbackCandidates.length > 0) return fallbackCandidates[0];

  throw new Error(`No safe ArtIC image candidate found for query: ${slotConfig.query}`);
};

const fetchImageBuffer = async (url, referer) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: referer || 'https://www.artic.edu/',
    },
  });
  if (!response.ok) throw new Error(`Image request failed ${response.status}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
};

const downloadImage = async (url, outputPath, referer) => {
  const buffer = await fetchImageBuffer(url, referer);
  writeFileSync(outputPath, buffer);
};

const writeSelectionsTs = (selectionMap) => {
const source = `export interface ArtworkSelection {
  wingId: string;
  yearLevel: number;
  id: number;
  title: string;
  artistDisplay: string;
  dateDisplay: string;
  dateStart: number | null;
  dateEnd: number | null;
  isPublicDomain: boolean;
  imageId: string;
  mediumDisplay: string;
  classificationTitle: string;
  artworkTypeTitle: string;
  placeOfOrigin: string;
  creditLine: string;
  departmentTitle: string;
  artistTitle: string;
  styleTitle: string;
  copyrightNotice: string;
  apiLink: string;
  sourceUrl: string;
  iiifUrl: string;
  assetPath: string;
  focusReason: string;
}

export const ARTWORK_SELECTIONS: Record<string, Record<number, ArtworkSelection>> = ${JSON.stringify(selectionMap, null, 2)};
`;
  writeFileSync(selectionsFile, source, 'utf8');
};

mkdirSync(outputDir, { recursive: true });

const usedIds = new Set(suppressedArtworkIds);
const selectionMap = {};
const manifest = [];

for (const [wingId, slots] of Object.entries(searchPlan)) {
  selectionMap[wingId] = {};

  for (const [index, slotConfig] of slots.entries()) {
    const yearLevel = years[index];
    const externalSelection = externalSelections[wingId]?.[yearLevel];
    const manualSelection = manualSelections[wingId]?.[yearLevel];
    const manualArtwork = !externalSelection && manualSelection ? await getArtworkById(manualSelection[0]) : null;
    const manualSlotConfig = {
      ...slotConfig,
      allowNonPublicDomain: publicDomainOnly ? false : true,
    };
    const useManualSelection = manualArtwork
      && !usedIds.has(manualArtwork.id)
      && isSafeCandidate(manualArtwork, manualSlotConfig);
    const useExternalSelection = Boolean(externalSelection);
    const artwork = useExternalSelection
      ? externalSelection
      : (useManualSelection ? manualArtwork : await chooseArtwork(slotConfig, usedIds));
    const finalFocusReason = useExternalSelection
      ? externalSelection.focusReason
      : (useManualSelection ? manualSelection[1] : slotConfig.focusReason);
    if (usedIds.has(artwork.id)) {
      throw new Error(`Duplicate artwork selected for ${wingId} Year ${yearLevel}: ${artwork.id}`);
    }
    usedIds.add(artwork.id);

    const filename = `${wingId}-year-${yearLevel}.jpg`;
    const localAssetPath = `images/artworks/${filename}`;
    const outputPath = resolve('public', localAssetPath);
    const iiifUrl = useExternalSelection
      ? externalSelection.iiifUrl
      : `https://www.artic.edu/iiif/2/${artwork.image_id}/full/843,/0/default.jpg`;
    const sourceUrl = useExternalSelection
      ? externalSelection.sourceUrl
      : `https://www.artic.edu/artworks/${artwork.id}`;
    const assetPath = hotlinkOnly ? iiifUrl : localAssetPath;

    console.log(`${wingId} Year ${yearLevel}: ${artwork.title} (${artwork.id})`);
    if (verifyImages) {
      await fetchImageBuffer(iiifUrl, sourceUrl);
      await delay(250);
    } else if (!hotlinkOnly && !dryRun) {
      await downloadImage(iiifUrl, outputPath, sourceUrl);
      await delay(1100);
    }

    const selection = useExternalSelection
      ? {
        wingId,
        yearLevel,
        ...externalSelection,
        assetPath,
      }
      : {
        wingId,
        yearLevel,
        id: artwork.id,
        title: titleOverrides[artwork.id] || safeText(artwork.title),
        artistDisplay: safeText(artwork.artist_display),
        dateDisplay: safeText(artwork.date_display),
        dateStart: getArtworkStartYear(artwork),
        dateEnd: getArtworkEndYear(artwork),
        isPublicDomain: Boolean(artwork.is_public_domain),
        imageId: artwork.image_id,
        mediumDisplay: safeText(artwork.medium_display),
        classificationTitle: safeText(artwork.classification_title),
        artworkTypeTitle: safeText(artwork.artwork_type_title),
        placeOfOrigin: safeText(artwork.place_of_origin),
        creditLine: safeText(artwork.credit_line),
        departmentTitle: safeText(artwork.department_title),
        artistTitle: safeText(artwork.artist_title),
        styleTitle: safeText(artwork.style_title),
        copyrightNotice: safeText(artwork.copyright_notice),
        apiLink: safeText(artwork.api_link),
        sourceUrl,
        iiifUrl,
        assetPath,
        focusReason: finalFocusReason,
      };

    selectionMap[wingId][yearLevel] = selection;
    manifest.push(selection);

    if (!dryRun) {
      writeSelectionsTs(selectionMap);
      writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    }
  }
}

if (!dryRun) {
  writeSelectionsTs(selectionMap);
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}
console.log(`${dryRun ? 'Selected' : 'Fetched'} ${manifest.length} Art Institute of Chicago artworks.`);
