import type {
  MuseumCollectionFilter,
  MuseumRightsFilter,
  MuseumSearchScope,
} from './MuseumArtworkFilters';
import type { MuseumArtwork } from './MuseumArtworkSearch';

/**
 * Phase 2 catalogue index
 *
 * The museum APIs remain the authoritative source, but every image-verified
 * record that a teacher discovers is normalised and retained in IndexedDB. The
 * saved records can then take part in later searches, even if a provider's
 * live result window would not contain them on its first page.
 */
const DATABASE_NAME = 'artquest-museum-catalogue';
const DATABASE_VERSION = 1;
const ARTWORK_STORE = 'artworks';
const MAX_INDEXED_SEARCH_RESULTS = 72;
const STOP_WORDS = new Set(['a', 'an', 'and', 'art', 'for', 'in', 'of', 'on', 'the', 'to', 'with']);

type IndexedSearchField = 'allTokens' | 'titleTokens' | 'subjectTokens';

interface IndexedMuseumArtwork extends MuseumArtwork {
  cacheKey: string;
  cachedAt: number;
  allTokens: string[];
  titleTokens: string[];
  subjectTokens: string[];
}

export interface IndexedMuseumArtworkSearchOptions {
  collection?: MuseumCollectionFilter;
  rights?: MuseumRightsFilter;
  scope?: MuseumSearchScope;
  dateBegin?: number;
  dateEnd?: number;
}

export interface IndexedMuseumArtworkSearchResult {
  artworks: MuseumArtwork[];
  isAvailable: boolean;
}

export interface MuseumArtworkIndexWriteResult {
  savedArtworkCount: number;
  indexedArtworkCount: number;
  isAvailable: boolean;
}

let catalogueDatabasePromise: Promise<IDBDatabase | null> | null = null;

const normaliseText = (value: string): string => (
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
);

const toSearchTokens = (...values: string[]): string[] => (
  Array.from(new Set(
    values
      .join(' ')
      .split(/[^\p{L}\p{N}]+/u)
      .map(normaliseText)
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
  ))
);

const getArtworkKey = (artwork: MuseumArtwork): string => (
  `${artwork.sourceProvider}:${artwork.id}`
);

const getIndexedSearchField = (scope: MuseumSearchScope | undefined): IndexedSearchField => {
  if (scope === 'title') return 'titleTokens';
  if (scope === 'subject') return 'subjectTokens';
  return 'allTokens';
};

const toIndexedArtwork = (artwork: MuseumArtwork): IndexedMuseumArtwork => {
  const { searchMatch: _searchMatch, ...record } = artwork;
  return {
    ...record,
    cacheKey: getArtworkKey(artwork),
    cachedAt: Date.now(),
    titleTokens: toSearchTokens(artwork.title),
    subjectTokens: toSearchTokens(
      artwork.subject,
      artwork.style,
      artwork.classification,
      artwork.artworkType,
      artwork.medium,
    ),
    allTokens: toSearchTokens(
      artwork.title,
      artwork.artistName,
      artwork.artistDisplay,
      artwork.subject,
      artwork.style,
      artwork.classification,
      artwork.artworkType,
      artwork.medium,
      artwork.department,
      artwork.placeOfOrigin,
      artwork.filterText,
    ),
  };
};

const toMuseumArtwork = (indexedArtwork: IndexedMuseumArtwork): MuseumArtwork => {
  const {
    cacheKey: _cacheKey,
    cachedAt: _cachedAt,
    allTokens: _allTokens,
    titleTokens: _titleTokens,
    subjectTokens: _subjectTokens,
    ...artwork
  } = indexedArtwork;
  return artwork;
};

const getCatalogueDatabase = (): Promise<IDBDatabase | null> => {
  if (catalogueDatabasePromise) return catalogueDatabasePromise;
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);

  catalogueDatabasePromise = new Promise((resolve) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.objectStoreNames.contains(ARTWORK_STORE)
        ? request.transaction?.objectStore(ARTWORK_STORE)
        : database.createObjectStore(ARTWORK_STORE, { keyPath: 'cacheKey' });
      if (!store) return;
      if (!store.indexNames.contains('allTokens')) store.createIndex('allTokens', 'allTokens', { multiEntry: true });
      if (!store.indexNames.contains('titleTokens')) store.createIndex('titleTokens', 'titleTokens', { multiEntry: true });
      if (!store.indexNames.contains('subjectTokens')) store.createIndex('subjectTokens', 'subjectTokens', { multiEntry: true });
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });

  return catalogueDatabasePromise;
};

const requestResult = <T,>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Indexed catalogue request failed.'));
});

const transactionComplete = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onabort = () => reject(transaction.error || new Error('Indexed catalogue transaction was aborted.'));
  transaction.onerror = () => reject(transaction.error || new Error('Indexed catalogue transaction failed.'));
});

const matchesSelectedFilters = (
  artwork: MuseumArtwork,
  options: IndexedMuseumArtworkSearchOptions,
): boolean => {
  if (options.collection && options.collection !== 'all' && artwork.sourceProvider !== options.collection) return false;
  if (options.rights === 'public_domain' && !artwork.isPublicDomain) return false;
  if (options.dateBegin !== undefined && options.dateEnd !== undefined) {
    if (artwork.dateStart === null) return false;
    const artworkEnd = artwork.dateEnd ?? artwork.dateStart;
    if (artworkEnd < options.dateBegin || artwork.dateStart > options.dateEnd) return false;
  }
  return true;
};

export const searchIndexedMuseumArtworks = async (
  query: string,
  options: IndexedMuseumArtworkSearchOptions = {},
): Promise<IndexedMuseumArtworkSearchResult> => {
  const queryTokens = toSearchTokens(query);
  if (queryTokens.length === 0) return { artworks: [], isAvailable: typeof indexedDB !== 'undefined' };

  const database = await getCatalogueDatabase();
  if (!database) return { artworks: [], isAvailable: false };

  try {
    const searchField = getIndexedSearchField(options.scope);
    const transaction = database.transaction(ARTWORK_STORE, 'readonly');
    const index = transaction.objectStore(ARTWORK_STORE).index(searchField);
    const seedToken = [...queryTokens].sort((left, right) => right.length - left.length)[0];
    const candidates = await requestResult(index.getAll(seedToken)) as IndexedMuseumArtwork[];
    await transactionComplete(transaction);

    const artworks = candidates
      .filter((artwork) => queryTokens.every((token) => artwork[searchField].includes(token)))
      .filter((artwork) => matchesSelectedFilters(artwork, options))
      .sort((left, right) => right.cachedAt - left.cachedAt || left.title.localeCompare(right.title))
      .slice(0, MAX_INDEXED_SEARCH_RESULTS)
      .map(toMuseumArtwork);
    return { artworks, isAvailable: true };
  } catch {
    return { artworks: [], isAvailable: false };
  }
};

export const saveMuseumArtworksToIndex = async (
  artworks: MuseumArtwork[],
): Promise<MuseumArtworkIndexWriteResult> => {
  const database = await getCatalogueDatabase();
  if (!database || artworks.length === 0) {
    return { savedArtworkCount: 0, indexedArtworkCount: 0, isAvailable: !!database };
  }

  try {
    const uniqueArtworks = Array.from(new Map(
      artworks.map((artwork) => [getArtworkKey(artwork), artwork]),
    ).values());
    const writeTransaction = database.transaction(ARTWORK_STORE, 'readwrite');
    const store = writeTransaction.objectStore(ARTWORK_STORE);
    uniqueArtworks.forEach((artwork) => store.put(toIndexedArtwork(artwork)));
    await transactionComplete(writeTransaction);

    const countTransaction = database.transaction(ARTWORK_STORE, 'readonly');
    const indexedArtworkCount = await requestResult(countTransaction.objectStore(ARTWORK_STORE).count());
    await transactionComplete(countTransaction);
    return {
      savedArtworkCount: uniqueArtworks.length,
      indexedArtworkCount,
      isAvailable: true,
    };
  } catch {
    return { savedArtworkCount: 0, indexedArtworkCount: 0, isAvailable: false };
  }
};
