import type {
  MuseumCollectionFilter,
  MuseumRightsFilter,
  MuseumSearchScope,
} from './MuseumArtworkFilters';

export type MuseumArtworkSource = 'artic' | 'met' | 'openverse' | 'rijksmuseum' | 'teacher_upload';

export type MuseumArtworkMatchTier = 'best' | 'broader';

export interface MuseumArtworkMatch {
  tier: MuseumArtworkMatchTier;
  score: number;
  matchedTerms: string[];
  reasons: string[];
}

export interface MuseumArtwork {
  id: number;
  sourceProvider: MuseumArtworkSource;
  title: string;
  /** A clean creator name for precise artist searches and ranking. */
  artistName: string;
  artistDisplay: string;
  dateDisplay: string;
  dateStart: number | null;
  dateEnd: number | null;
  isPublicDomain: boolean;
  imageUrl: string;
  fallbackImageUrl?: string;
  medium: string;
  classification: string;
  artworkType: string;
  subject: string;
  placeOfOrigin: string;
  creditLine: string;
  department: string;
  style: string;
  filterText: string;
  copyrightNotice: string;
  apiLink: string;
  sourceUrl: string;
  searchMatch?: MuseumArtworkMatch;
}

export interface MuseumArtworkSearchOptions {
  collection?: MuseumCollectionFilter;
  rights?: MuseumRightsFilter;
  scope?: MuseumSearchScope;
  dateBegin?: number;
  dateEnd?: number;
  articOffset?: number;
  metOffset?: number;
  openverseOffset?: number;
  rijksmuseumCursor?: RijksmuseumSearchCursor;
}

/**
 * Rijksmuseum returns up to 100 identifiers per catalogue page.  Keeping the
 * unused identifiers (and already verified overflow) gives the Builder a
 * reliable 12-card page without skipping most of that catalogue page.
 */
export interface RijksmuseumSearchCursor {
  pendingObjectIds: string[];
  pendingArtworks: MuseumArtwork[];
  nextPageUrl?: string;
  total?: number | null;
}

export interface MuseumArtworkSearchResult {
  artworks: MuseumArtwork[];
  errors: string[];
  nextArticOffset: number;
  nextMetOffset: number;
  nextOpenverseOffset: number;
  nextRijksmuseumCursor?: RijksmuseumSearchCursor;
  hasMoreArtic: boolean;
  hasMoreMet: boolean;
  hasMoreOpenverse: boolean;
  hasMoreRijksmuseum: boolean;
  rejectedImageCount: number;
  totals: Partial<Record<MuseumArtworkSource, number>>;
  bestMatchCount: number;
  broaderMatchCount: number;
}

interface MuseumSourceSearchPage {
  artworks: MuseumArtwork[];
  nextOffset: number;
  hasMore: boolean;
  rejectedImageCount: number;
  total: number | null;
}

interface RijksmuseumSourceSearchPage {
  artworks: MuseumArtwork[];
  nextCursor: RijksmuseumSearchCursor;
  hasMore: boolean;
  rejectedImageCount: number;
  total: number | null;
}

const ARTIC_API_BASE_URL = 'https://api.artic.edu/api/v1';
const MET_API_BASE_URL = 'https://collectionapi.metmuseum.org/public/collection/v1';
const OPENVERSE_API_BASE_URL = 'https://api.openverse.org/v1';
const RIJKSMUSEUM_DATA_BASE_URL = 'https://data.rijksmuseum.nl';
// The builder grid is a fixed set of twelve cards, so each remote load always
// produces a complete page with no empty result slots.
const VERIFIED_ARTWORKS_PER_SOURCE_BATCH = 12;
const CANDIDATES_PER_PROVIDER_REQUEST = 12;
const MAX_CANDIDATE_PAGES_PER_BATCH = 6;
const IMAGE_LOAD_TIMEOUT_MS = 4500;
const ARTIC_FIELDS = [
  'id',
  'title',
  'artist_display',
  'artist_title',
  'date_display',
  'date_start',
  'date_end',
  'image_id',
  'is_public_domain',
  'medium_display',
  'classification_title',
  'artwork_type_title',
  'subject_titles',
  'term_titles',
  'place_of_origin',
  'credit_line',
  'department_title',
  'style_title',
  'copyright_notice',
  'api_link',
].join(',');

const imageVerificationCache = new Map<string, Promise<boolean>>();
const QUERY_STOP_WORDS = new Set(['a', 'an', 'and', 'art', 'for', 'in', 'of', 'on', 'the', 'to', 'with']);

const safeText = (value: unknown): string => (
  value == null ? '' : String(value).replace(/\s+/g, ' ').trim()
);

const stripHtml = (value: unknown): string => (
  safeText(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
);

const safeNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const stableExternalId = (value: string): number => {
  const hash = Array.from(value).reduce((current, character) => (
    ((current * 31) + character.charCodeAt(0)) >>> 0
  ), 17);
  return hash || 1;
};

const toSubjectText = (...values: unknown[]): string => (
  values.flatMap((value) => Array.isArray(value) ? value : [value])
    .map(safeText)
    .filter(Boolean)
    .slice(0, 4)
    .join(', ')
);

const toFilterText = (...values: unknown[]): string => (
  values.flatMap((value) => Array.isArray(value) ? value : [value])
    .map((value) => typeof value === 'object' && value !== null ? '' : safeText(value))
    .filter(Boolean)
    .join(' ')
);

const normaliseMatchText = (value: string): string => (
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
);

const getSearchTerms = (query: string): string[] => (
  Array.from(new Set(
    normaliseMatchText(query)
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length >= 3 && !QUERY_STOP_WORDS.has(term)),
  ))
);

const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
};

const canLoadArtworkImage = (imageUrl: string): Promise<boolean> => {
  const cachedCheck = imageVerificationCache.get(imageUrl);
  if (cachedCheck) return cachedCheck;

  const check = new Promise<boolean>((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (didLoad: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      image.onload = null;
      image.onerror = null;
      resolve(didLoad);
    };
    const timeoutId = window.setTimeout(() => finish(false), IMAGE_LOAD_TIMEOUT_MS);
    image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0);
    image.onerror = () => finish(false);
    image.src = imageUrl;
  });

  imageVerificationCache.set(imageUrl, check);
  return check;
};

const keepArtworksWithLoadableImages = async (artworks: MuseumArtwork[]): Promise<{
  artworks: MuseumArtwork[];
  rejectedImageCount: number;
}> => {
  const imageChecks = await Promise.all(artworks.map(async (artwork) => {
    const imageUrls = [artwork.imageUrl, artwork.fallbackImageUrl]
      .filter((imageUrl): imageUrl is string => !!imageUrl);
    for (const imageUrl of imageUrls) {
      if (await canLoadArtworkImage(imageUrl)) {
        return { artwork: { ...artwork, imageUrl }, canLoad: true };
      }
    }
    return { artwork, canLoad: false };
  }));
  const loadableArtworks = imageChecks
    .filter(({ canLoad }) => canLoad)
    .map(({ artwork }) => artwork);
  return {
    artworks: loadableArtworks,
    rejectedImageCount: artworks.length - loadableArtworks.length,
  };
};

const mapArticArtwork = (rawArtwork: Record<string, unknown>): MuseumArtwork | null => {
  const id = safeNumber(rawArtwork.id);
  const imageId = safeText(rawArtwork.image_id);
  if (!id || !imageId) return null;

  return {
    id,
    sourceProvider: 'artic',
    title: safeText(rawArtwork.title) || 'Untitled',
    artistName: safeText(rawArtwork.artist_title) || safeText(rawArtwork.artist_display) || 'Artist unknown',
    artistDisplay: safeText(rawArtwork.artist_display) || safeText(rawArtwork.artist_title) || 'Artist unknown',
    dateDisplay: safeText(rawArtwork.date_display),
    dateStart: safeNumber(rawArtwork.date_start),
    dateEnd: safeNumber(rawArtwork.date_end),
    isPublicDomain: Boolean(rawArtwork.is_public_domain),
    imageUrl: `https://www.artic.edu/iiif/2/${imageId}/full/400,/0/default.jpg`,
    fallbackImageUrl: `https://www.artic.edu/iiif/2/${imageId}/full/843,/0/default.jpg`,
    medium: safeText(rawArtwork.medium_display),
    classification: safeText(rawArtwork.classification_title),
    artworkType: safeText(rawArtwork.artwork_type_title),
    subject: toSubjectText(rawArtwork.subject_titles),
    placeOfOrigin: safeText(rawArtwork.place_of_origin),
    creditLine: safeText(rawArtwork.credit_line),
    department: safeText(rawArtwork.department_title),
    style: safeText(rawArtwork.style_title),
    filterText: toFilterText(
      rawArtwork.title,
      rawArtwork.artist_display,
      rawArtwork.medium_display,
      rawArtwork.classification_title,
      rawArtwork.artwork_type_title,
      rawArtwork.subject_titles,
      rawArtwork.term_titles,
      rawArtwork.place_of_origin,
      rawArtwork.department_title,
      rawArtwork.style_title,
    ),
    copyrightNotice: safeText(rawArtwork.copyright_notice),
    apiLink: safeText(rawArtwork.api_link) || `${ARTIC_API_BASE_URL}/artworks/${id}`,
    sourceUrl: `https://www.artic.edu/artworks/${id}`,
  };
};

const mapMetArtwork = (rawArtwork: Record<string, unknown>): MuseumArtwork | null => {
  const id = safeNumber(rawArtwork.objectID);
  const primaryImageSmall = safeText(rawArtwork.primaryImageSmall);
  const primaryImage = safeText(rawArtwork.primaryImage);
  const imageUrl = primaryImageSmall || primaryImage;
  if (!id || !imageUrl) return null;

  const artistName = safeText(rawArtwork.artistDisplayName);
  const artistBio = safeText(rawArtwork.artistDisplayBio);
  const placeOfOrigin = [rawArtwork.city, rawArtwork.state, rawArtwork.country]
    .map(safeText)
    .filter(Boolean)
    .join(', ');
  const tagTerms = (rawArtwork.tags as Array<{ term?: string }> | undefined)?.map((tag) => tag?.term) || [];

  return {
    id,
    sourceProvider: 'met',
    title: safeText(rawArtwork.title) || 'Untitled',
    artistName: artistName || artistBio || 'Artist unknown',
    artistDisplay: artistName && artistBio ? `${artistName} (${artistBio})` : artistName || artistBio || 'Artist unknown',
    dateDisplay: safeText(rawArtwork.objectDate),
    dateStart: safeNumber(rawArtwork.objectBeginDate),
    dateEnd: safeNumber(rawArtwork.objectEndDate),
    isPublicDomain: Boolean(rawArtwork.isPublicDomain),
    imageUrl,
    fallbackImageUrl: primaryImage && primaryImage !== imageUrl ? primaryImage : undefined,
    medium: safeText(rawArtwork.medium),
    classification: safeText(rawArtwork.classification),
    artworkType: safeText(rawArtwork.objectName),
    subject: toSubjectText(tagTerms),
    placeOfOrigin,
    creditLine: safeText(rawArtwork.creditLine),
    department: safeText(rawArtwork.department),
    style: safeText(rawArtwork.period),
    filterText: toFilterText(
      rawArtwork.title,
      rawArtwork.artistDisplayName,
      rawArtwork.medium,
      rawArtwork.classification,
      rawArtwork.objectName,
      rawArtwork.period,
      rawArtwork.culture,
      rawArtwork.department,
      rawArtwork.city,
      rawArtwork.state,
      rawArtwork.country,
      tagTerms,
    ),
    copyrightNotice: safeText(rawArtwork.rightsAndReproduction),
    apiLink: `${MET_API_BASE_URL}/objects/${id}`,
    sourceUrl: safeText(rawArtwork.objectURL) || `https://www.metmuseum.org/art/collection/search/${id}`,
  };
};

const mapOpenverseArtwork = (rawArtwork: Record<string, unknown>): MuseumArtwork | null => {
  const externalId = safeText(rawArtwork.id);
  const fullImageUrl = safeText(rawArtwork.url);
  const thumbnailUrl = safeText(rawArtwork.thumbnail);
  const imageUrl = fullImageUrl || thumbnailUrl;
  if (!externalId || !imageUrl) return null;

  const rawTags = Array.isArray(rawArtwork.tags) ? rawArtwork.tags : [];
  const tags = rawTags
    .map((tag) => typeof tag === 'object' && tag !== null
      ? safeText((tag as Record<string, unknown>).name)
      : safeText(tag))
    .filter(Boolean);
  const creator = stripHtml(rawArtwork.creator);
  const licence = safeText(rawArtwork.license).toLocaleLowerCase();
  const licenceVersion = safeText(rawArtwork.license_version);
  const source = safeText(rawArtwork.source) || 'Wikimedia Commons';

  return {
    id: stableExternalId(externalId),
    sourceProvider: 'openverse',
    title: stripHtml(rawArtwork.title).replace(/^file:\s*/i, '') || 'Untitled',
    artistName: creator || 'Artist unknown',
    artistDisplay: creator || 'Artist unknown',
    dateDisplay: '',
    dateStart: null,
    dateEnd: null,
    isPublicDomain: licence === 'cc0' || licence === 'pdm',
    imageUrl,
    fallbackImageUrl: thumbnailUrl && thumbnailUrl !== imageUrl ? thumbnailUrl : undefined,
    medium: '',
    classification: source,
    artworkType: 'Image',
    subject: toSubjectText(tags),
    placeOfOrigin: '',
    creditLine: creator ? `${creator} · ${licenceVersion ? `${licence.toUpperCase()} ${licenceVersion}` : licence.toUpperCase()}` : licence.toUpperCase(),
    department: 'Openverse / Wikimedia Commons',
    style: '',
    filterText: toFilterText(rawArtwork.title, creator, tags, source),
    copyrightNotice: licenceVersion ? `${licence.toUpperCase()} ${licenceVersion}` : licence.toUpperCase(),
    apiLink: `${OPENVERSE_API_BASE_URL}/images/${externalId}/`,
    sourceUrl: safeText(rawArtwork.foreign_landing_url) || `${OPENVERSE_API_BASE_URL}/images/${externalId}/`,
  };
};

const asRecord = (value: unknown): Record<string, unknown> | null => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
);

const asRecords = (value: unknown): Record<string, unknown>[] => (
  Array.isArray(value)
    ? value.map(asRecord).filter((record): record is Record<string, unknown> => record !== null)
    : []
);

const rijksmuseumLinkedId = (value: unknown): string => {
  const record = asRecord(value);
  return safeText(record?.id || value);
};

const rijksmuseumRecordId = (value: string): string | null => {
  const match = value.match(/\/(\d+)\/?$/);
  return match?.[1] || null;
};

const getRijksmuseumRecord = async (identifier: string): Promise<Record<string, unknown>> => {
  const recordId = rijksmuseumRecordId(identifier);
  if (!recordId) throw new Error('Rijksmuseum returned an invalid collection identifier.');
  return fetchJson<Record<string, unknown>>(
    `${RIJKSMUSEUM_DATA_BASE_URL}/${recordId}?_profile=la-framed`,
  );
};

const getRijksmuseumNotation = (record: Record<string, unknown>): string => {
  const notations = asRecords(record.notation);
  const englishNotation = notations.find((notation) => safeText(notation['@language']) === 'en');
  return safeText(englishNotation?.['@value']) || safeText(notations[0]?.['@value']) || safeText(record.content);
};

const getRijksmuseumRecordText = (records: Record<string, unknown>[]): string => (
  records
    .map((record) => safeText(record.content) || getRijksmuseumNotation(record))
    .filter(Boolean)
    .join(', ')
);

const getRijksmuseumPrimaryName = (records: Record<string, unknown>[]): string => {
  const name = records.find((record) => safeText(record.type) === 'Name' && safeText(record.content));
  return safeText(name?.content);
};

const getRijksmuseumObjectNumber = (record: Record<string, unknown>): string => {
  const identifier = getRijksmuseumLinkedRecords(record, 'identified_by')
    .find((entry) => safeText(entry.type) === 'Identifier' && safeText(entry.content));
  return safeText(identifier?.content);
};

const parseRijksmuseumYear = (value: unknown): number | null => {
  const match = safeText(value).match(/^-?\d{1,4}/);
  return match ? safeNumber(match[0]) : null;
};

const getRijksmuseumAccessPoint = (record: Record<string, unknown>): string => (
  asRecords(record.access_point)
    .map(rijksmuseumLinkedId)
    .find(Boolean) || ''
);

const getRijksmuseumLinkedRecords = (
  record: Record<string, unknown>,
  property: string,
): Record<string, unknown>[] => asRecords(record[property]);

const findRijksmuseumCollectionUrl = (record: Record<string, unknown>): string => {
  for (const subject of getRijksmuseumLinkedRecords(record, 'subject_of')) {
    for (const digitalCarrier of getRijksmuseumLinkedRecords(subject, 'digitally_carried_by')) {
      const pageUrl = getRijksmuseumAccessPoint(digitalCarrier);
      if (pageUrl.includes('rijksmuseum.nl')) return pageUrl;
    }
  }
  return '';
};

const getRijksmuseumArtist = (record: Record<string, unknown>): string => {
  const production = asRecord(record.produced_by);
  if (!production) return '';
  const productionParts = [production, ...getRijksmuseumLinkedRecords(production, 'part')];
  const artistRecords = productionParts.flatMap((part) => getRijksmuseumLinkedRecords(part, 'carried_out_by'));
  return artistRecords.map(getRijksmuseumNotation).filter(Boolean).join(', ');
};

const isRijksmuseumPublicDomainVisual = (visualRecord: Record<string, unknown>): boolean => (
  getRijksmuseumLinkedRecords(visualRecord, 'subject_to').some((rightsStatement) => (
    getRijksmuseumLinkedRecords(rightsStatement, 'classified_as').some((classification) => {
      const rightsId = rijksmuseumLinkedId(classification).toLocaleLowerCase();
      return rightsId.includes('/publicdomain/mark/') || rightsId.includes('/publicdomain/zero/');
    })
  ))
);

const toRijksmuseumPreviewUrl = (imageUrl: string): string => (
  imageUrl.replace('/full/max/', '/full/400,/')
);

const resolveRijksmuseumArtwork = async (identifier: string): Promise<MuseumArtwork | null> => {
  const artworkRecord = await getRijksmuseumRecord(identifier);
  const artworkId = rijksmuseumRecordId(rijksmuseumLinkedId(artworkRecord.id) || identifier);
  const visualId = rijksmuseumLinkedId(getRijksmuseumLinkedRecords(artworkRecord, 'shows')[0]);
  if (!artworkId || !visualId) return null;

  const visualRecord = await getRijksmuseumRecord(visualId);
  if (!isRijksmuseumPublicDomainVisual(visualRecord)) return null;
  const digitalImageId = rijksmuseumLinkedId(getRijksmuseumLinkedRecords(visualRecord, 'digitally_shown_by')[0]);
  if (!digitalImageId) return null;

  const imageRecord = await getRijksmuseumRecord(digitalImageId);
  const fullImageUrl = getRijksmuseumAccessPoint(imageRecord);
  if (!fullImageUrl) return null;

  const production = asRecord(artworkRecord.produced_by);
  const timespan = production ? asRecord(production.timespan) : null;
  const dateDisplay = timespan ? getRijksmuseumRecordText(getRijksmuseumLinkedRecords(timespan, 'identified_by')) : '';
  const dateStart = timespan ? parseRijksmuseumYear(timespan.begin_of_the_begin) : null;
  const dateEnd = timespan ? parseRijksmuseumYear(timespan.end_of_the_end) : dateStart;
  const artistName = getRijksmuseumArtist(artworkRecord) || 'Artist unknown';
  const medium = getRijksmuseumLinkedRecords(artworkRecord, 'made_of').map(getRijksmuseumNotation).filter(Boolean).join(', ');
  const classification = getRijksmuseumLinkedRecords(artworkRecord, 'classified_as').map(getRijksmuseumNotation).filter(Boolean).join(', ');
  const title = getRijksmuseumPrimaryName(getRijksmuseumLinkedRecords(artworkRecord, 'identified_by')) || 'Untitled';
  const objectNumber = getRijksmuseumObjectNumber(artworkRecord);
  const sourceUrl = findRijksmuseumCollectionUrl(artworkRecord);

  return {
    id: Number(artworkId),
    sourceProvider: 'rijksmuseum',
    title,
    artistName,
    artistDisplay: artistName,
    dateDisplay,
    dateStart,
    dateEnd,
    isPublicDomain: true,
    imageUrl: toRijksmuseumPreviewUrl(fullImageUrl),
    fallbackImageUrl: fullImageUrl,
    medium,
    classification,
    artworkType: classification || 'Artwork',
    subject: '',
    placeOfOrigin: '',
    creditLine: 'Rijksmuseum · Public Domain Mark 1.0',
    department: 'Rijksmuseum collection',
    style: '',
    filterText: toFilterText(
      getRijksmuseumRecordText(getRijksmuseumLinkedRecords(artworkRecord, 'identified_by')),
      title,
      artistName,
      medium,
      classification,
      dateDisplay,
    ),
    copyrightNotice: 'Public Domain Mark 1.0',
    apiLink: `${RIJKSMUSEUM_DATA_BASE_URL}/${artworkId}?_profile=la-framed`,
    sourceUrl: sourceUrl || (objectNumber
      ? `https://www.rijksmuseum.nl/en/collection/${encodeURIComponent(objectNumber)}`
      : `${RIJKSMUSEUM_DATA_BASE_URL}/${artworkId}?_profile=la-framed`),
  };
};

const matchesSelectedRecordFilters = (artwork: MuseumArtwork, options: MuseumArtworkSearchOptions): boolean => {
  if (options.rights === 'public_domain' && !artwork.isPublicDomain) return false;
  if (options.dateBegin !== undefined && options.dateEnd !== undefined) {
    if (artwork.dateStart === null) return false;
    const artworkEnd = artwork.dateEnd ?? artwork.dateStart;
    if (artworkEnd < options.dateBegin || artwork.dateStart > options.dateEnd) return false;
  }
  return true;
};

interface MatchField {
  label: string;
  value: string;
  weight: number;
}

const getMatchFields = (artwork: MuseumArtwork, scope: MuseumSearchScope): MatchField[] => {
  const allFields: MatchField[] = [
    { label: 'artwork title', value: artwork.title, weight: 120 },
    { label: 'artist', value: artwork.artistName, weight: 116 },
    { label: 'style or period', value: artwork.style, weight: 104 },
    { label: 'subject or collection tags', value: artwork.subject, weight: 96 },
    { label: 'artwork classification', value: artwork.classification, weight: 70 },
    { label: 'artwork type', value: artwork.artworkType, weight: 48 },
    { label: 'medium', value: artwork.medium, weight: 42 },
  ];
  if (scope === 'artist') return [allFields[1]];
  if (scope === 'title') return allFields.slice(0, 1);
  if (scope === 'subject') return [allFields[3], allFields[4], allFields[5]];
  return allFields;
};

const matchesSearchScope = (
  artwork: MuseumArtwork,
  query: string,
  scope: MuseumSearchScope,
): boolean => {
  if (scope === 'general') return true;
  const searchTerms = getSearchTerms(query);
  if (searchTerms.length === 0) return true;
  const fieldText = getMatchFields(artwork, scope)
    .map((field) => normaliseMatchText(field.value))
    .join(' ');
  return searchTerms.every((term) => fieldText.includes(term));
};

const scoreMuseumArtworkMatch = (
  artwork: MuseumArtwork,
  query: string,
  scope: MuseumSearchScope,
): MuseumArtwork => {
  const queryTerms = getSearchTerms(query);
  if (queryTerms.length === 0) return artwork;

  const matchFields = getMatchFields(artwork, scope);
  const matchedTerms: string[] = [];
  const reasons: string[] = [];
  let score = 0;
  let hasOnlyCatalogueMatch = false;

  queryTerms.forEach((term) => {
    const matchingField = matchFields.find((field) => normaliseMatchText(field.value).includes(term));
    if (matchingField) {
      matchedTerms.push(term);
      score += matchingField.weight;
      reasons.push(`“${term}” matched ${matchingField.label}`);
      return;
    }

    if (scope === 'general' && normaliseMatchText(artwork.filterText).includes(term)) {
      matchedTerms.push(term);
      score += 18;
      hasOnlyCatalogueMatch = true;
      reasons.push(`“${term}” matched broader catalogue metadata`);
    }
  });

  const isBestMatch = matchedTerms.length === queryTerms.length && !hasOnlyCatalogueMatch;
  const providerName = artwork.sourceProvider === 'met'
    ? 'Met'
    : artwork.sourceProvider === 'openverse'
      ? 'Openverse public-domain archive'
    : artwork.sourceProvider === 'rijksmuseum'
        ? 'Rijksmuseum collection'
      : artwork.sourceProvider === 'teacher_upload'
        ? 'teacher upload'
      : 'Art Institute of Chicago';
  const fallbackReason = `Returned by the ${providerName} catalogue search`;
  const match: MuseumArtworkMatch = {
    tier: isBestMatch ? 'best' : 'broader',
    score: score + (isBestMatch ? 240 : 0),
    matchedTerms,
    reasons: reasons.length > 0 ? reasons : [fallbackReason],
  };

  return { ...artwork, searchMatch: match };
};

const rankMuseumArtworks = (
  artworks: MuseumArtwork[],
  query: string,
  scope: MuseumSearchScope,
): MuseumArtwork[] => (
  artworks
    .map((artwork) => scoreMuseumArtworkMatch(artwork, query, scope))
    .sort((left, right) => {
      const leftTier = left.searchMatch?.tier === 'best' ? 1 : 0;
      const rightTier = right.searchMatch?.tier === 'best' ? 1 : 0;
      if (leftTier !== rightTier) return rightTier - leftTier;
      const scoreDifference = (right.searchMatch?.score || 0) - (left.searchMatch?.score || 0);
      if (scoreDifference !== 0) return scoreDifference;
      return left.title.localeCompare(right.title);
    })
);

const buildArticSearchUrl = (
  query: string,
  options: MuseumArtworkSearchOptions,
  offset: number,
): string => {
  const url = new URL(`${ARTIC_API_BASE_URL}/artworks/search`);
  const filterClauses: Array<Record<string, unknown>> = [];
  if (options.rights === 'public_domain') {
    filterClauses.push({ term: { is_public_domain: true } });
  }
  if (options.dateBegin !== undefined && options.dateEnd !== undefined) {
    filterClauses.push(
      { range: { date_start: { lte: options.dateEnd } } },
      { range: { date_end: { gte: options.dateBegin } } },
    );
  }

  const fieldsByScope: Record<MuseumSearchScope, string[]> = {
    general: ['title^3', 'artist_title^3', 'term_titles^2', 'style_title^2', 'subject_titles^2', 'medium_display', 'classification_title'],
    artist: ['artist_title^5', 'artist_display^4'],
    title: ['title^4'],
    subject: ['subject_titles^4', 'term_titles^3', 'theme_titles^2'],
  };
  const matchClause: Record<string, unknown> = {
    multi_match: {
      query,
      fields: fieldsByScope[options.scope || 'general'],
      type: options.scope === 'general' || !options.scope ? 'cross_fields' : 'best_fields',
    },
  };
  const params: Record<string, unknown> = {
    query: filterClauses.length > 0
      ? { bool: { must: [matchClause], filter: filterClauses } }
      : matchClause,
    from: offset,
    size: CANDIDATES_PER_PROVIDER_REQUEST,
    fields: ARTIC_FIELDS,
  };
  url.searchParams.set('params', JSON.stringify(params));
  return url.toString();
};

const searchArticArtworkPage = async (
  query: string,
  options: MuseumArtworkSearchOptions,
  offset: number,
): Promise<MuseumSourceSearchPage> => {
  const response = await fetchJson<{
    data?: Array<Record<string, unknown>>;
    pagination?: { total?: number };
  }>(buildArticSearchUrl(query, options, offset));
  const rawArtworks = response.data || [];
  const candidates = rawArtworks
    .map(mapArticArtwork)
    .filter((artwork): artwork is MuseumArtwork => artwork !== null)
    .filter((artwork) => matchesSelectedRecordFilters(artwork, options))
    .filter((artwork) => matchesSearchScope(artwork, query, options.scope || 'general'));
  const imageCheck = await keepArtworksWithLoadableImages(candidates);
  const nextOffset = offset + rawArtworks.length;
  const total = safeNumber(response.pagination?.total);

  return {
    artworks: imageCheck.artworks,
    nextOffset,
    hasMore: rawArtworks.length > 0 && (total !== null ? nextOffset < total : rawArtworks.length === CANDIDATES_PER_PROVIDER_REQUEST),
    rejectedImageCount: imageCheck.rejectedImageCount,
    total,
  };
};

const buildMetSearchUrl = (query: string, options: MuseumArtworkSearchOptions): string => {
  const url = new URL(`${MET_API_BASE_URL}/search`);
  url.searchParams.set('q', query);
  url.searchParams.set('hasImages', 'true');
  if (options.scope === 'artist') url.searchParams.set('artistOrCulture', 'true');
  if (options.scope === 'title') url.searchParams.set('title', 'true');
  if (options.scope === 'subject') url.searchParams.set('tags', 'true');
  if (options.dateBegin !== undefined && options.dateEnd !== undefined) {
    url.searchParams.set('dateBegin', String(options.dateBegin));
    url.searchParams.set('dateEnd', String(options.dateEnd));
  }
  return url.toString();
};

const searchMetArtworkPage = async (
  query: string,
  options: MuseumArtworkSearchOptions,
  offset: number,
): Promise<MuseumSourceSearchPage> => {
  const response = await fetchJson<{ total?: number; objectIDs?: number[] }>(buildMetSearchUrl(query, options));
  const allObjectIds = response.objectIDs || [];
  const objectIds = allObjectIds.slice(offset, offset + CANDIDATES_PER_PROVIDER_REQUEST);

  const results = await Promise.allSettled(
    objectIds.map((objectId) => fetchJson<Record<string, unknown>>(`${MET_API_BASE_URL}/objects/${objectId}`)),
  );
  const candidates = results
    .flatMap((result) => result.status === 'fulfilled' ? [mapMetArtwork(result.value)] : [])
    .filter((artwork): artwork is MuseumArtwork => artwork !== null)
    .filter((artwork) => matchesSelectedRecordFilters(artwork, options))
    .filter((artwork) => matchesSearchScope(artwork, query, options.scope || 'general'));
  const imageCheck = await keepArtworksWithLoadableImages(candidates);

  return {
    artworks: imageCheck.artworks,
    nextOffset: offset + objectIds.length,
    hasMore: offset + objectIds.length < allObjectIds.length,
    rejectedImageCount: imageCheck.rejectedImageCount,
    total: safeNumber(response.total),
  };
};

const buildOpenverseSearchUrl = (query: string, offset: number, scope: MuseumSearchScope): string => {
  const url = new URL(`${OPENVERSE_API_BASE_URL}/images/`);
  const searchParameter = scope === 'artist'
    ? 'creator'
    : scope === 'title'
      ? 'title'
      : scope === 'subject'
        ? 'tags'
        : 'q';
  url.searchParams.set(searchParameter, query);
  // Wikimedia has the clearest source-record links and is a high-quality
  // public-domain art source within Openverse's broader global catalogue.
  url.searchParams.set('source', 'wikimedia');
  url.searchParams.set('license', 'cc0,pdm');
  url.searchParams.set('mature', 'false');
  url.searchParams.set('page_size', String(CANDIDATES_PER_PROVIDER_REQUEST));
  url.searchParams.set('page', String(Math.floor(offset / CANDIDATES_PER_PROVIDER_REQUEST) + 1));
  return url.toString();
};

const searchOpenverseArtworkPage = async (
  query: string,
  options: MuseumArtworkSearchOptions,
  offset: number,
): Promise<MuseumSourceSearchPage> => {
  const response = await fetchJson<{
    result_count?: number;
    results?: Array<Record<string, unknown>>;
  }>(buildOpenverseSearchUrl(query, offset, options.scope || 'general'));
  const rawArtworks = response.results || [];
  const candidates = rawArtworks
    .map(mapOpenverseArtwork)
    .filter((artwork): artwork is MuseumArtwork => artwork !== null)
    .filter((artwork) => matchesSelectedRecordFilters(artwork, options))
    .filter((artwork) => matchesSearchScope(artwork, query, options.scope || 'general'));
  const imageCheck = await keepArtworksWithLoadableImages(candidates);
  const nextOffset = offset + rawArtworks.length;
  const total = safeNumber(response.result_count);

  return {
    artworks: imageCheck.artworks,
    nextOffset,
    hasMore: rawArtworks.length > 0 && (total !== null ? nextOffset < total : rawArtworks.length === CANDIDATES_PER_PROVIDER_REQUEST),
    rejectedImageCount: imageCheck.rejectedImageCount,
    total,
  };
};

const buildRijksmuseumSearchUrl = (query: string, scope: MuseumSearchScope): string => {
  const url = new URL(`${RIJKSMUSEUM_DATA_BASE_URL}/search/collection`);
  // Rijksmuseum's current search API exposes creator, title and description
  // fields. Its description index is the broadest field and includes useful
  // creator/title catalogue context, while the dedicated Title control remains
  // precise. A future Artist control can map directly to `creator`.
  const searchField = scope === 'artist'
    ? 'creator'
    : scope === 'title'
      ? 'title'
      : 'description';
  url.searchParams.set(searchField, query);
  return url.toString();
};

const getRijksmuseumNextPageUrl = (response: Record<string, unknown>): string | undefined => {
  const nextPage = asRecord(response.next);
  const nextUrl = safeText(nextPage?.id);
  return nextUrl.startsWith(`${RIJKSMUSEUM_DATA_BASE_URL}/search/collection`) ? nextUrl : undefined;
};

const getRijksmuseumSearchObjectIds = (response: Record<string, unknown>): string[] => (
  asRecords(response.orderedItems)
    .map(rijksmuseumLinkedId)
    .filter((identifier) => rijksmuseumRecordId(identifier) !== null)
);

const getRijksmuseumSearchTotal = (response: Record<string, unknown>): number | null => {
  const collection = asRecord(response.partOf);
  return safeNumber(collection?.totalItems);
};

const searchRijksmuseumArtworkPage = async (
  query: string,
  options: MuseumArtworkSearchOptions,
): Promise<RijksmuseumSourceSearchPage> => {
  const existingCursor = options.rijksmuseumCursor;
  let pendingObjectIds = [...(existingCursor?.pendingObjectIds || [])];
  let pendingArtworks = [...(existingCursor?.pendingArtworks || [])];
  let nextPageUrl = existingCursor?.nextPageUrl;
  let total = existingCursor?.total ?? null;
  let rejectedImageCount = 0;
  const artworks: MuseumArtwork[] = pendingArtworks.splice(0, VERIFIED_ARTWORKS_PER_SOURCE_BATCH);
  let cataloguePagesRead = 0;
  // When a cursor exists without identifiers or a next link, it represents the
  // end of the source. An omitted cursor starts a fresh Rijksmuseum search.
  let canReadCataloguePage = !existingCursor || !!nextPageUrl;

  while (
    artworks.length < VERIFIED_ARTWORKS_PER_SOURCE_BATCH
    && cataloguePagesRead < MAX_CANDIDATE_PAGES_PER_BATCH
  ) {
    if (pendingObjectIds.length === 0) {
      if (!canReadCataloguePage) break;
      const response = await fetchJson<Record<string, unknown>>(
        nextPageUrl || buildRijksmuseumSearchUrl(query, options.scope || 'general'),
      );
      pendingObjectIds = getRijksmuseumSearchObjectIds(response);
      nextPageUrl = getRijksmuseumNextPageUrl(response);
      total = getRijksmuseumSearchTotal(response) ?? total;
      canReadCataloguePage = !!nextPageUrl;
      cataloguePagesRead += 1;
      if (pendingObjectIds.length === 0) continue;
    }

    const objectIds = pendingObjectIds.splice(0, CANDIDATES_PER_PROVIDER_REQUEST);
    const resolvedResults = await Promise.allSettled(objectIds.map(resolveRijksmuseumArtwork));
    const resolvedArtworks = resolvedResults
      .flatMap((result) => result.status === 'fulfilled' && result.value ? [result.value] : []);
    rejectedImageCount += objectIds.length - resolvedArtworks.length;
    const filteredArtworks = resolvedArtworks
      .filter((artwork) => matchesSelectedRecordFilters(artwork, options))
      .filter((artwork) => matchesSearchScope(artwork, query, options.scope || 'general'));
    const imageCheck = await keepArtworksWithLoadableImages(filteredArtworks);
    rejectedImageCount += imageCheck.rejectedImageCount;
    const remainingSlots = VERIFIED_ARTWORKS_PER_SOURCE_BATCH - artworks.length;
    artworks.push(...imageCheck.artworks.slice(0, remainingSlots));
    pendingArtworks.push(...imageCheck.artworks.slice(remainingSlots));
  }

  const nextCursor: RijksmuseumSearchCursor = {
    pendingObjectIds,
    pendingArtworks,
    ...(nextPageUrl ? { nextPageUrl } : {}),
    ...(total !== null ? { total } : {}),
  };

  return {
    artworks,
    nextCursor,
    hasMore: pendingObjectIds.length > 0 || pendingArtworks.length > 0 || !!nextPageUrl,
    rejectedImageCount,
    total,
  };
};

const collectMuseumSourceArtworks = async (
  searchPage: (offset: number) => Promise<MuseumSourceSearchPage>,
  initialOffset: number,
): Promise<MuseumSourceSearchPage> => {
  const artworks: MuseumArtwork[] = [];
  let nextOffset = initialOffset;
  let hasMore = true;
  let rejectedImageCount = 0;
  let total: number | null = null;
  let pageCount = 0;

  while (artworks.length < VERIFIED_ARTWORKS_PER_SOURCE_BATCH && hasMore && pageCount < MAX_CANDIDATE_PAGES_PER_BATCH) {
    const previousOffset = nextOffset;
    const page = await searchPage(previousOffset);
    artworks.push(...page.artworks);
    nextOffset = page.nextOffset;
    hasMore = page.hasMore;
    rejectedImageCount += page.rejectedImageCount;
    total = page.total ?? total;
    pageCount += 1;

    if (nextOffset <= previousOffset) break;
  }

  return {
    artworks: artworks.slice(0, VERIFIED_ARTWORKS_PER_SOURCE_BATCH),
    nextOffset,
    hasMore,
    rejectedImageCount,
    total,
  };
};

export const searchMuseumArtworks = async (
  query: string,
  options: MuseumArtworkSearchOptions = {},
): Promise<MuseumArtworkSearchResult> => {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return {
      artworks: [],
      errors: ['Enter an artist, artwork title, visual subject, or art term to search the available artwork sources.'],
      nextArticOffset: options.articOffset || 0,
      nextMetOffset: options.metOffset || 0,
      nextOpenverseOffset: options.openverseOffset || 0,
      nextRijksmuseumCursor: options.rijksmuseumCursor,
      hasMoreArtic: false,
      hasMoreMet: false,
      hasMoreOpenverse: false,
      hasMoreRijksmuseum: false,
      rejectedImageCount: 0,
      totals: {},
      bestMatchCount: 0,
      broaderMatchCount: 0,
    };
  }

  const includeArtic = !options.collection || options.collection === 'all' || options.collection === 'artic';
  const includeMet = !options.collection || options.collection === 'all' || options.collection === 'met';
  const includeOpenverse = !options.collection || options.collection === 'all' || options.collection === 'openverse';
  const includeRijksmuseum = !options.collection || options.collection === 'all' || options.collection === 'rijksmuseum';
  const tasks: Array<Promise<{ source: MuseumArtworkSource; page: MuseumSourceSearchPage }>> = [];
  if (includeArtic) {
    tasks.push(collectMuseumSourceArtworks(
      (offset) => searchArticArtworkPage(normalizedQuery, options, offset),
      options.articOffset || 0,
    ).then((page) => ({ source: 'artic', page })));
  }
  if (includeMet) {
    tasks.push(collectMuseumSourceArtworks(
      (offset) => searchMetArtworkPage(normalizedQuery, options, offset),
      options.metOffset || 0,
    ).then((page) => ({ source: 'met', page })));
  }
  if (includeOpenverse) {
    tasks.push(collectMuseumSourceArtworks(
      (offset) => searchOpenverseArtworkPage(normalizedQuery, options, offset),
      options.openverseOffset || 0,
    ).then((page) => ({ source: 'openverse', page })));
  }
  const rijksmuseumTask: Promise<{ source: 'rijksmuseum'; page: RijksmuseumSourceSearchPage }> | undefined = includeRijksmuseum
    ? searchRijksmuseumArtworkPage(normalizedQuery, options).then((page) => ({ source: 'rijksmuseum', page }))
    : undefined;

  const providerResults = await Promise.allSettled([...tasks, ...(rijksmuseumTask ? [rijksmuseumTask] : [])]);
  const errors = providerResults.flatMap((result) => {
    if (result.status === 'fulfilled') return [];
    return [`Artwork search: ${result.reason instanceof Error ? result.reason.message : 'Search unavailable.'}`];
  });
  const articPage = providerResults.find((result) => (
    result.status === 'fulfilled' && result.value.source === 'artic'
  ));
  const metPage = providerResults.find((result) => (
    result.status === 'fulfilled' && result.value.source === 'met'
  ));
  const openversePage = providerResults.find((result) => (
    result.status === 'fulfilled' && result.value.source === 'openverse'
  ));
  const rijksmuseumPage = providerResults.find((result) => (
    result.status === 'fulfilled' && result.value.source === 'rijksmuseum'
  ));
  const resolvedArticPage = articPage?.status === 'fulfilled' ? articPage.value.page as MuseumSourceSearchPage : undefined;
  const resolvedMetPage = metPage?.status === 'fulfilled' ? metPage.value.page as MuseumSourceSearchPage : undefined;
  const resolvedOpenversePage = openversePage?.status === 'fulfilled' ? openversePage.value.page as MuseumSourceSearchPage : undefined;
  const resolvedRijksmuseumPage = rijksmuseumPage?.status === 'fulfilled' ? rijksmuseumPage.value.page as RijksmuseumSourceSearchPage : undefined;
  const rankedArtworks = rankMuseumArtworks(
    [
      ...(resolvedArticPage?.artworks || []),
      ...(resolvedMetPage?.artworks || []),
      ...(resolvedOpenversePage?.artworks || []),
      ...(resolvedRijksmuseumPage?.artworks || []),
    ],
    normalizedQuery,
    options.scope || 'general',
  );
  const bestMatchCount = rankedArtworks.filter((artwork) => artwork.searchMatch?.tier === 'best').length;

  return {
    artworks: rankedArtworks,
    errors,
    nextArticOffset: resolvedArticPage?.nextOffset ?? options.articOffset ?? 0,
    nextMetOffset: resolvedMetPage?.nextOffset ?? options.metOffset ?? 0,
    nextOpenverseOffset: resolvedOpenversePage?.nextOffset ?? options.openverseOffset ?? 0,
    nextRijksmuseumCursor: resolvedRijksmuseumPage?.nextCursor ?? options.rijksmuseumCursor,
    hasMoreArtic: resolvedArticPage?.hasMore || false,
    hasMoreMet: resolvedMetPage?.hasMore || false,
    hasMoreOpenverse: resolvedOpenversePage?.hasMore || false,
    hasMoreRijksmuseum: resolvedRijksmuseumPage?.hasMore || false,
    rejectedImageCount: (resolvedArticPage?.rejectedImageCount || 0) + (resolvedMetPage?.rejectedImageCount || 0) + (resolvedOpenversePage?.rejectedImageCount || 0) + (resolvedRijksmuseumPage?.rejectedImageCount || 0),
    totals: {
      ...(resolvedArticPage?.total !== null && resolvedArticPage?.total !== undefined ? { artic: resolvedArticPage.total } : {}),
      ...(resolvedMetPage?.total !== null && resolvedMetPage?.total !== undefined ? { met: resolvedMetPage.total } : {}),
      ...(resolvedOpenversePage?.total !== null && resolvedOpenversePage?.total !== undefined ? { openverse: resolvedOpenversePage.total } : {}),
      ...(resolvedRijksmuseumPage?.total !== null && resolvedRijksmuseumPage?.total !== undefined ? { rijksmuseum: resolvedRijksmuseumPage.total } : {}),
    },
    bestMatchCount,
    broaderMatchCount: rankedArtworks.length - bestMatchCount,
  };
};
