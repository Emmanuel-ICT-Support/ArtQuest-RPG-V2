export type MuseumCollectionFilter = 'all' | 'artic' | 'met' | 'openverse' | 'rijksmuseum';

export type MuseumRightsFilter = 'all' | 'public_domain';

export type MuseumSearchScope = 'general' | 'artist' | 'title' | 'subject';

export interface MuseumArtworkDateFilterOption {
  value: string;
  label: string;
  dateBegin: number;
  dateEnd: number;
}

export interface MuseumArtworkFilterSelection {
  collection: MuseumCollectionFilter;
  rights: MuseumRightsFilter;
  date: string;
  scope: MuseumSearchScope;
}

export const MUSEUM_COLLECTION_OPTIONS: ReadonlyArray<{ value: MuseumCollectionFilter; label: string }> = [
  { value: 'all', label: 'All sources' },
  { value: 'artic', label: 'Art Institute of Chicago' },
  { value: 'met', label: 'The Met collection' },
  { value: 'rijksmuseum', label: 'Rijksmuseum collection' },
  { value: 'openverse', label: 'Wikimedia public-domain works' },
];

export const MUSEUM_RIGHTS_OPTIONS: ReadonlyArray<{ value: MuseumRightsFilter; label: string }> = [
  { value: 'all', label: 'All image records' },
  { value: 'public_domain', label: 'Open-access works only' },
];

export const MUSEUM_SEARCH_SCOPE_OPTIONS: ReadonlyArray<{ value: MuseumSearchScope; label: string }> = [
  { value: 'general', label: 'Search by: General' },
  { value: 'artist', label: 'Search by: Artist' },
  { value: 'title', label: 'Search by: Title' },
  { value: 'subject', label: 'Search by: Subject' },
];

export const MUSEUM_DATE_OPTIONS: ReadonlyArray<MuseumArtworkDateFilterOption> = [
  { value: 'before_1000_bce', label: 'Before 1000 BCE', dateBegin: -3000, dateEnd: -1001 },
  { value: '1000_bce_to_1_ce', label: '1000 BCE–1 CE', dateBegin: -1000, dateEnd: 1 },
  { value: '1_to_500', label: '1–500', dateBegin: 1, dateEnd: 500 },
  { value: '501_to_1000', label: '501–1000', dateBegin: 501, dateEnd: 1000 },
  { value: '1001_to_1400', label: '1001–1400', dateBegin: 1001, dateEnd: 1400 },
  { value: '1401_to_1600', label: '1401–1600', dateBegin: 1401, dateEnd: 1600 },
  { value: '1601_to_1750', label: '1601–1750', dateBegin: 1601, dateEnd: 1750 },
  { value: '1751_to_1800', label: '1751–1800', dateBegin: 1751, dateEnd: 1800 },
  { value: '1801_to_1850', label: '1801–1850', dateBegin: 1801, dateEnd: 1850 },
  { value: '1851_to_1900', label: '1851–1900', dateBegin: 1851, dateEnd: 1900 },
  { value: '1901_to_1945', label: '1901–1945', dateBegin: 1901, dateEnd: 1945 },
  { value: '1946_to_1970', label: '1946–1970', dateBegin: 1946, dateEnd: 1970 },
  { value: '1971_to_2000', label: '1971–2000', dateBegin: 1971, dateEnd: 2000 },
  { value: '2001_to_2020', label: '2001–2020', dateBegin: 2001, dateEnd: 2020 },
  { value: '2021_to_present', label: '2021–present', dateBegin: 2021, dateEnd: 2100 },
];

export const getMuseumDateFilterOption = (value: string): MuseumArtworkDateFilterOption | undefined => (
  MUSEUM_DATE_OPTIONS.find((option) => option.value === value)
);
