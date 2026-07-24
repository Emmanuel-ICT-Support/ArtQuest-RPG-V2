import React, { useMemo, useRef, useState } from 'react';
import { WING_DEFINITIONS } from '../constants';
import { getArtworkBatch } from '../data/ArtworkLibrary';
import {
  getMuseumDateFilterOption,
  MUSEUM_COLLECTION_OPTIONS,
  MUSEUM_DATE_OPTIONS,
  MUSEUM_RIGHTS_OPTIONS,
  MUSEUM_SEARCH_SCOPE_OPTIONS,
} from '../data/MuseumArtworkFilters';
import { searchMuseumArtworks } from '../data/MuseumArtworkSearch';
import { CLASS_PACK_IMAGE_MAX_BYTES, prepareClassPackImage } from '../data/ClassPack';
import type { ClassPackArtwork, ClassPackExport, PreparedClassPackImage } from '../data/ClassPack';
import { getOfflinePhaseTask } from '../data/OfflineCurator';
import type { ArtworkBrief } from '../data/ArtworkLibrary';
import type { MuseumArtworkFilterSelection } from '../data/MuseumArtworkFilters';
import type { RijksmuseumSearchCursor } from '../data/MuseumArtworkSearch';
import type { QuestionPhase, YearLevel } from '../types';
import GalleryLoadingScreen from './GalleryLoadingScreen';
import Modal from './Modal';

const CLASS_PACK_BUILDER_BACKGROUND = './public/images/screens/class-pack-builder-screen.png';
const CLASS_PACK_BUILDER_FRAME_STYLE: React.CSSProperties = {
  width: 'min(100vw, calc(100vh * 1672 / 941))',
  height: 'min(100vh, calc(100vw * 941 / 1672))',
};
const CLASS_PACK_ARTWORKS_PER_PAGE = 10;
const CLASS_PACK_PHASES: ReadonlyArray<{ phase: QuestionPhase; label: string }> = [
  { phase: 1, label: 'See' },
  { phase: 2, label: 'Think' },
  { phase: 3, label: 'Interpret' },
  { phase: 4, label: 'Reflect' },
];

const EMPTY_UPLOAD_ARTWORK_FORM = {
  title: '',
  artistName: '',
  medium: '',
  year: '',
  sourceUrl: '',
};

interface ClassPackBuilderScreenProps {
  yearLevel: YearLevel;
  initialClassPack?: ClassPackExport | null;
  onReturnToTeacherMenu: () => void;
}

type ClassPackQuestions = Record<QuestionPhase, string>;

interface UploadArtworkForm {
  title: string;
  artistName: string;
  medium: string;
  year: string;
  sourceUrl: string;
}

interface MuseumSearchSession {
  query: string;
  filters: MuseumArtworkFilterSelection;
  dateBegin?: number;
  dateEnd?: number;
  nextArticOffset: number;
  nextMetOffset: number;
  nextOpenverseOffset: number;
  nextRijksmuseumCursor?: RijksmuseumSearchCursor;
  hasMoreArtic: boolean;
  hasMoreMet: boolean;
  hasMoreOpenverse: boolean;
  hasMoreRijksmuseum: boolean;
}

interface MuseumResultPage {
  artworks: ClassPackArtwork[];
}

const getClassPackDefaultQuestions = (wingId: string, yearLevel: YearLevel): ClassPackQuestions => ({
  1: getOfflinePhaseTask(wingId, 1, yearLevel),
  2: getOfflinePhaseTask(wingId, 2, yearLevel),
  3: getOfflinePhaseTask(wingId, 3, yearLevel),
  4: getOfflinePhaseTask(wingId, 4, yearLevel),
});

const toClassPackArtwork = (artwork: ArtworkBrief): ClassPackArtwork => {
  const source = artwork.sourceArtwork;
  if (!source) {
    throw new Error(`Missing source metadata for the default class-pack artwork: ${artwork.title}`);
  }
  return {
    id: source.id,
    sourceProvider: source.sourceProvider || 'artic',
    title: source.title || artwork.title,
    artistName: source.artistTitle || source.artistDisplay || 'Artist unknown',
    artistDisplay: source.artistDisplay || source.artistTitle || 'Artist unknown',
    dateDisplay: source.dateDisplay,
    dateStart: source.dateStart,
    dateEnd: source.dateEnd,
    isPublicDomain: source.isPublicDomain,
    imageUrl: artwork.assetPath,
    medium: artwork.medium || source.mediumDisplay,
    classification: source.classificationTitle,
    artworkType: source.artworkTypeTitle,
    subject: source.artworkTypeTitle || source.classificationTitle,
    placeOfOrigin: source.placeOfOrigin,
    creditLine: source.creditLine,
    department: source.departmentTitle,
    style: source.styleTitle || artwork.style,
    filterText: [
      source.title,
      source.artistDisplay,
      source.artistTitle,
      artwork.medium,
      source.mediumDisplay,
      source.classificationTitle,
      source.artworkTypeTitle,
      artwork.subject,
      source.placeOfOrigin,
      source.departmentTitle,
      source.styleTitle,
      artwork.style,
    ].filter(Boolean).join(' '),
    copyrightNotice: source.copyrightNotice,
    apiLink: source.apiLink,
    sourceUrl: source.sourceUrl,
    wingId: artwork.wingId,
    yearLevel: artwork.yearLevel,
    focus: artwork.focus,
    visualFocus: artwork.visualFocus,
    focusReason: source.focusReason,
  };
};

const getClassPackArtworkSourceName = (artwork: ClassPackArtwork): string => (
  artwork.sourceProvider === 'met'
    ? 'The Metropolitan Museum of Art'
    : artwork.sourceProvider === 'openverse'
      ? 'Wikimedia Commons via Openverse'
      : artwork.sourceProvider === 'rijksmuseum'
        ? 'Rijksmuseum'
        : artwork.sourceProvider === 'teacher_upload'
          ? 'Teacher upload'
    : 'Art Institute of Chicago'
);

const getClassPackArtworkStyle = (artwork: ClassPackArtwork): string => (
  artwork.style || 'No movement label supplied by collection'
);

const getClassPackArtworkSubject = (artwork: ClassPackArtwork): string => (
  artwork.subject || artwork.artworkType || artwork.classification || 'Artwork'
);

const getClassPackArtworkMatchLabel = (artwork: ClassPackArtwork): string => (
  artwork.searchMatch?.tier === 'best' ? 'Best match' : 'Broader catalogue match'
);

const describeMatchMix = (bestMatchCount: number, broaderMatchCount: number): string => {
  if (bestMatchCount === 0 && broaderMatchCount === 0) return '';
  const descriptions = [
    bestMatchCount > 0 ? `${bestMatchCount} best match${bestMatchCount === 1 ? '' : 'es'}` : '',
    broaderMatchCount > 0 ? `${broaderMatchCount} broader match${broaderMatchCount === 1 ? '' : 'es'}` : '',
  ].filter(Boolean);
  return ` ${descriptions.join(' · ')}.`;
};

const artworkKey = (artwork: ClassPackArtwork): string => `${artwork.sourceProvider}-${artwork.id}`;

const getUploadYear = (year: string): number | null => {
  const match = year.match(/-?\d{1,4}/);
  return match ? Number(match[0]) : null;
};

const toMuseumResultPages = (artworks: ClassPackArtwork[]): MuseumResultPage[] => (
  Array.from({ length: Math.ceil(artworks.length / CLASS_PACK_ARTWORKS_PER_PAGE) }, (_, index) => ({
    artworks: artworks.slice(
      index * CLASS_PACK_ARTWORKS_PER_PAGE,
      (index + 1) * CLASS_PACK_ARTWORKS_PER_PAGE,
    ),
  }))
);

const describeSearchTotals = (totals: Partial<Record<'artic' | 'met' | 'openverse' | 'rijksmuseum', number>>): string => {
  const descriptions = [
    totals.artic !== undefined ? `AIC ${totals.artic.toLocaleString()}` : '',
    totals.met !== undefined ? `Met ${totals.met.toLocaleString()}` : '',
    totals.rijksmuseum !== undefined ? `Rijksmuseum ${totals.rijksmuseum.toLocaleString()}` : '',
    totals.openverse !== undefined ? `Openverse ${totals.openverse.toLocaleString()}` : '',
  ].filter(Boolean);
  return descriptions.length > 0 ? ` Catalogue matches: ${descriptions.join(' · ')}.` : '';
};

const ClassPackBuilderScreen: React.FC<ClassPackBuilderScreenProps> = ({
  yearLevel,
  initialClassPack = null,
  onReturnToTeacherMenu,
}) => {
  const defaultRoomArtworks = useMemo(() => getArtworkBatch().map(toClassPackArtwork), []);
  const searchRequestId = useRef(0);
  const [activeWingId, setActiveWingId] = useState(WING_DEFINITIONS[0].id);
  const [className, setClassName] = useState(initialClassPack?.title || `Year ${yearLevel} ArtQuest Class Pack`);
  const [searchQuery, setSearchQuery] = useState('');
  const [collectionFilter, setCollectionFilter] = useState<MuseumArtworkFilterSelection['collection']>('all');
  const [rightsFilter, setRightsFilter] = useState<MuseumArtworkFilterSelection['rights']>('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState<MuseumArtworkFilterSelection['scope']>('general');
  const [page, setPage] = useState(0);
  const [museumResultPages, setMuseumResultPages] = useState<MuseumResultPage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [museumSearchSession, setMuseumSearchSession] = useState<MuseumSearchSession | null>(null);
  const [unavailableArtworkKeys, setUnavailableArtworkKeys] = useState<Set<string>>(() => new Set());
  const [searchMessage, setSearchMessage] = useState('Search museum collections and Wikimedia public-domain works to add artwork to this pack.');
  const [editingPhase, setEditingPhase] = useState<QuestionPhase | null>(null);
  const [viewedArtwork, setViewedArtwork] = useState<ClassPackArtwork | null>(null);
  const [isUploadArtworkOpen, setIsUploadArtworkOpen] = useState(false);
  const [uploadArtworkForm, setUploadArtworkForm] = useState<UploadArtworkForm>(EMPTY_UPLOAD_ARTWORK_FORM);
  const [preparedUploadImage, setPreparedUploadImage] = useState<PreparedClassPackImage | null>(null);
  const [isPreparingUploadImage, setIsPreparingUploadImage] = useState(false);
  const [uploadArtworkError, setUploadArtworkError] = useState<string | null>(null);
  const uploadArtworkFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedArtworks, setSelectedArtworks] = useState<Record<string, ClassPackArtwork>>(() => (
    Object.fromEntries(
      WING_DEFINITIONS.map((wing) => [
        wing.id,
        initialClassPack?.rooms.find((room) => room.id === wing.id)?.artwork
          || defaultRoomArtworks.find((artwork) => artwork.wingId === wing.id && artwork.yearLevel === yearLevel),
      ]).filter(([, artwork]) => !!artwork),
    ) as Record<string, ClassPackArtwork>
  ));
  const [questionsByRoom, setQuestionsByRoom] = useState<Record<string, ClassPackQuestions>>(() => (
    Object.fromEntries(
      WING_DEFINITIONS.map((wing) => [
        wing.id,
        initialClassPack?.rooms.find((room) => room.id === wing.id)?.questions || getClassPackDefaultQuestions(wing.id, yearLevel),
      ]),
    ) as Record<string, ClassPackQuestions>
  ));

  const museumFilterSelection: MuseumArtworkFilterSelection = {
    collection: collectionFilter,
    rights: rightsFilter,
    date: dateFilter,
    scope: scopeFilter,
  };

  const visibleArtworks = museumResultPages[page]?.artworks || [];
  const activeQuestions = questionsByRoom[activeWingId];
  const selectedArtwork = selectedArtworks[activeWingId];
  const hasLocalNextPage = page < museumResultPages.length - 1;
  const canLoadMoreArtworks = !!museumSearchSession && (
    museumSearchSession.hasMoreArtic || museumSearchSession.hasMoreMet || museumSearchSession.hasMoreOpenverse || museumSearchSession.hasMoreRijksmuseum
  );

  const resetMuseumSearch = () => {
    searchRequestId.current += 1;
    setPage(0);
    setMuseumResultPages([]);
    setMuseumSearchSession(null);
    setUnavailableArtworkKeys(new Set());
    setIsSearching(false);
    setIsLoadingMore(false);
    setSearchMessage('Press Search to find image-verified artwork from every available collection source.');
  };

  const searchMuseumCollections = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const effectiveSearchQuery = searchQuery.trim();
    if (!effectiveSearchQuery) {
      setSearchMessage('Enter an artist, artwork title, visual subject, or art term to begin a museum search.');
      return;
    }

    const requestId = searchRequestId.current + 1;
    searchRequestId.current = requestId;
    setIsSearching(true);
    setPage(0);
    setSearchMessage('Searching the selected collections and checking image records…');

    const selectedDate = getMuseumDateFilterOption(dateFilter);
    try {
      const result = await searchMuseumArtworks(effectiveSearchQuery, {
        collection: museumFilterSelection.collection,
        rights: museumFilterSelection.rights,
        scope: museumFilterSelection.scope,
        ...(selectedDate ? {
          dateBegin: selectedDate.dateBegin,
          dateEnd: selectedDate.dateEnd,
        } : {}),
      });
      if (requestId !== searchRequestId.current) return;

      const resultPages = toMuseumResultPages(result.artworks);
      setMuseumResultPages(resultPages);
      setUnavailableArtworkKeys(new Set());
      setMuseumSearchSession({
        query: effectiveSearchQuery,
        filters: { ...museumFilterSelection },
        dateBegin: selectedDate?.dateBegin,
        dateEnd: selectedDate?.dateEnd,
        nextArticOffset: result.nextArticOffset,
        nextMetOffset: result.nextMetOffset,
        nextOpenverseOffset: result.nextOpenverseOffset,
        nextRijksmuseumCursor: result.nextRijksmuseumCursor,
        hasMoreArtic: result.hasMoreArtic,
        hasMoreMet: result.hasMoreMet,
        hasMoreOpenverse: result.hasMoreOpenverse,
        hasMoreRijksmuseum: result.hasMoreRijksmuseum,
      });
      const imageNote = result.rejectedImageCount > 0
        ? ` ${result.rejectedImageCount} record${result.rejectedImageCount === 1 ? '' : 's'} had no reachable image and was not added.`
        : '';
      const pageNote = resultPages.length > 1 ? ` Ready to browse ${resultPages.length} stable pages.` : '';
      const matchNote = describeMatchMix(result.bestMatchCount, result.broaderMatchCount);
      setSearchMessage(
        result.artworks.length > 0
          ? `Loaded ${result.artworks.length} image-verified artwork${result.artworks.length === 1 ? '' : 's'}.${matchNote}${pageNote}${describeSearchTotals(result.totals)}${imageNote}${result.errors.length > 0 ? ` ${result.errors.join(' ')}` : ''}`
          : `No image-verified artworks matched this search.${describeSearchTotals(result.totals)}${result.errors.length > 0 ? ` ${result.errors.join(' ')}` : ' Try another search term or broaden the controls.'}`,
      );
    } catch (error) {
      if (requestId !== searchRequestId.current) return;
      setMuseumResultPages([]);
      setMuseumSearchSession(null);
      setSearchMessage(`The museum search could not be completed: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      if (requestId === searchRequestId.current) setIsSearching(false);
    }
  };

  const loadMoreMuseumArtworks = async () => {
    const session = museumSearchSession;
    if (!session || isLoadingMore || (!session.hasMoreArtic && !session.hasMoreMet && !session.hasMoreOpenverse && !session.hasMoreRijksmuseum)) return;

    const requestId = searchRequestId.current + 1;
    searchRequestId.current = requestId;
    setIsLoadingMore(true);
    setSearchMessage('Loading the next stable page of image-verified artworks…');
    try {
      const result = await searchMuseumArtworks(session.query, {
        collection: session.filters.collection,
        rights: session.filters.rights,
        scope: session.filters.scope,
        dateBegin: session.dateBegin,
        dateEnd: session.dateEnd,
        articOffset: session.nextArticOffset,
        metOffset: session.nextMetOffset,
        openverseOffset: session.nextOpenverseOffset,
        rijksmuseumCursor: session.nextRijksmuseumCursor,
      });
      if (requestId !== searchRequestId.current) return;

      const existingArtworkKeys = new Set(museumResultPages.flatMap((resultPage) => (
        resultPage.artworks.map(artworkKey)
      )));
      const newArtworks = result.artworks.filter((artwork) => !existingArtworkKeys.has(artworkKey(artwork)));
      const newPages = toMuseumResultPages(newArtworks);
      if (newPages.length > 0) {
        setMuseumResultPages((previous) => [...previous, ...newPages]);
        setPage((currentPage) => currentPage + 1);
      }
      setMuseumSearchSession({
        ...session,
        nextArticOffset: result.nextArticOffset,
        nextMetOffset: result.nextMetOffset,
        nextOpenverseOffset: result.nextOpenverseOffset,
        nextRijksmuseumCursor: result.nextRijksmuseumCursor,
        hasMoreArtic: result.hasMoreArtic,
        hasMoreMet: result.hasMoreMet,
        hasMoreOpenverse: result.hasMoreOpenverse,
        hasMoreRijksmuseum: result.hasMoreRijksmuseum,
      });

      const imageNote = result.rejectedImageCount > 0
        ? ` ${result.rejectedImageCount} record${result.rejectedImageCount === 1 ? '' : 's'} without a reachable image was excluded.`
        : '';
      const matchNote = describeMatchMix(result.bestMatchCount, result.broaderMatchCount);
      setSearchMessage(
        newArtworks.length > 0
          ? `Loaded ${newArtworks.length} more image-verified artwork${newArtworks.length === 1 ? '' : 's'} into stable page${newPages.length === 1 ? '' : 's'}.${matchNote}${imageNote}`
          : result.hasMoreArtic || result.hasMoreMet || result.hasMoreOpenverse || result.hasMoreRijksmuseum
            ? `No image-verified works were found in this batch. Select Next to keep searching.${imageNote}`
            : `You have reached the end of the image-verified results for this search.${imageNote}`,
      );
    } catch (error) {
      if (requestId !== searchRequestId.current) return;
      setSearchMessage(`More artworks could not be loaded: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      if (requestId === searchRequestId.current) setIsLoadingMore(false);
    }
  };

  const markArtworkImageUnavailable = (artwork: ClassPackArtwork) => {
    setUnavailableArtworkKeys((previous) => {
      const next = new Set(previous);
      next.add(artworkKey(artwork));
      return next;
    });
    setSearchMessage('A collection image became unavailable after verification. The artwork record has been kept in its original place.');
  };

  const updateQuestion = (phase: QuestionPhase, value: string) => {
    setQuestionsByRoom((previous) => ({
      ...previous,
      [activeWingId]: {
        ...previous[activeWingId],
        [phase]: value,
      },
    }));
  };

  const resetQuestions = () => {
    setQuestionsByRoom((previous) => ({
      ...previous,
      [activeWingId]: getClassPackDefaultQuestions(activeWingId, yearLevel),
    }));
    setEditingPhase(null);
  };

  const selectArtworkForActiveRoom = (artwork: ClassPackArtwork) => {
    setSelectedArtworks((previous) => ({ ...previous, [activeWingId]: artwork }));
  };

  const closeUploadArtwork = () => {
    setIsUploadArtworkOpen(false);
    setUploadArtworkForm(EMPTY_UPLOAD_ARTWORK_FORM);
    setPreparedUploadImage(null);
    setIsPreparingUploadImage(false);
    setUploadArtworkError(null);
  };

  const openUploadArtwork = () => {
    setUploadArtworkForm(EMPTY_UPLOAD_ARTWORK_FORM);
    setPreparedUploadImage(null);
    setUploadArtworkError(null);
    setIsUploadArtworkOpen(true);
  };

  const handleUploadArtworkImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const imageFile = event.target.files?.[0];
    event.target.value = '';
    if (!imageFile) return;

    setIsPreparingUploadImage(true);
    setPreparedUploadImage(null);
    setUploadArtworkError(null);
    try {
      setPreparedUploadImage(await prepareClassPackImage(imageFile));
    } catch (error) {
      setUploadArtworkError(error instanceof Error ? error.message : 'The image could not be prepared for this Class Pack.');
    } finally {
      setIsPreparingUploadImage(false);
    }
  };

  const addUploadedArtworkToActiveRoom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!preparedUploadImage) {
      setUploadArtworkError('Choose an image before adding this artwork.');
      return;
    }

    const title = uploadArtworkForm.title.trim();
    const artistName = uploadArtworkForm.artistName.trim();
    const medium = uploadArtworkForm.medium.trim();
    const year = uploadArtworkForm.year.trim();
    if (!title || !artistName || !medium || !year) {
      setUploadArtworkError('Complete the title, artist name, medium, and year fields.');
      return;
    }

    let sourceUrl: string;
    try {
      const source = new URL(uploadArtworkForm.sourceUrl.trim());
      if (!['http:', 'https:'].includes(source.protocol)) throw new Error();
      sourceUrl = source.toString();
    } catch {
      setUploadArtworkError('Enter a valid http or https source website URL for acknowledgement.');
      return;
    }

    const yearValue = getUploadYear(year);
    const uploadedArtwork: ClassPackArtwork = {
      id: Date.now(),
      sourceProvider: 'teacher_upload',
      title,
      artistName,
      artistDisplay: artistName,
      dateDisplay: year,
      dateStart: yearValue,
      dateEnd: yearValue,
      isPublicDomain: false,
      imageUrl: preparedUploadImage.dataUrl,
      medium,
      classification: 'Teacher-uploaded artwork',
      artworkType: 'Image',
      subject: 'Teacher-uploaded artwork',
      placeOfOrigin: '',
      creditLine: `Teacher upload · Source: ${sourceUrl}`,
      department: 'Teacher uploads',
      style: '',
      filterText: [title, artistName, medium, year, sourceUrl, 'teacher upload'].join(' '),
      copyrightNotice: `Teacher-uploaded image. Acknowledge the source: ${sourceUrl}`,
      apiLink: sourceUrl,
      sourceUrl,
    };
    selectArtworkForActiveRoom(uploadedArtwork);
    setSearchMessage(`Selected your uploaded artwork for ${WING_DEFINITIONS.find((wing) => wing.id === activeWingId)?.name || 'this room'}. Its compressed image will be embedded in the exported Class Pack.`);
    closeUploadArtwork();
  };

  const exportClassPack = () => {
    const exportData: ClassPackExport = {
      version: '1.0',
      title: className.trim() || `Year ${yearLevel} ArtQuest Class Pack`,
      yearLevel,
      createdAt: new Date().toISOString(),
      rooms: WING_DEFINITIONS.map((wing) => ({
        id: wing.id,
        name: wing.name,
        artPrinciple: wing.artPrinciple,
        artwork: selectedArtworks[wing.id],
        questions: questionsByRoom[wing.id],
      })),
    };
    const fileName = exportData.title.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'ArtQuest_Class_Pack';
    const downloadUrl = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }));
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = `${fileName}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080b16] text-[#fff4d6] selection:bg-pink-500 selection:text-white">
      <div className="relative overflow-hidden" style={CLASS_PACK_BUILDER_FRAME_STYLE}>
        <img
          src={CLASS_PACK_BUILDER_BACKGROUND}
          alt="ArtQuest Class Pack Builder"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />

        <div className="absolute left-[2.3%] top-[20.7%] z-20 flex h-[68.5%] w-[16.1%] flex-col gap-[0.3%]" aria-label="ArtQuest rooms">
          {WING_DEFINITIONS.map((wing) => {
            const isActive = wing.id === activeWingId;
            return (
              <button
                key={wing.id}
                type="button"
                onClick={() => {
                  setActiveWingId(wing.id);
                  setEditingPhase(null);
                }}
                className={`min-h-0 flex-1 rounded-sm text-transparent transition focus:outline-none focus:ring-2 focus:ring-pink-200/80 ${
                  isActive ? 'bg-white/10 shadow-[inset_0_0_0_2px_rgba(255,211,99,0.72)]' : 'hover:bg-white/5'
                }`}
                aria-label={`Edit ${wing.name.replace(/^\S+\s/, '')}`}
                aria-pressed={isActive}
              >
                {wing.name}
              </button>
            );
          })}
        </div>

        <label className="absolute left-[33.2%] top-[14.7%] z-20 h-[4.5%] w-[32.2%]">
          <span className="sr-only">Class name</span>
          <input
            value={className}
            onChange={(event) => setClassName(event.target.value)}
            className="h-full w-full rounded-md border border-amber-300/30 bg-[#0a0b18]/70 px-[2.4%] text-[clamp(0.65rem,1.15vw,1.1rem)] font-semibold text-[#fff4d6] outline-none transition focus:border-pink-300 focus:ring-2 focus:ring-pink-200/70"
            aria-label="Class name"
          />
        </label>

        <form
          className="absolute left-[20%] top-[20.6%] z-20 h-[52.8%] w-[54.8%]"
          aria-label="Find artwork across collection sources"
          onSubmit={searchMuseumCollections}
        >
          <div className="absolute left-[1.9%] top-[7%] h-[9.3%] w-[96.2%] rounded-md border border-amber-300/55 bg-[#090b17]/90 shadow-[inset_0_0_20px_rgba(0,0,0,0.32)]">
            <label className="block h-full w-full">
              <span className="sr-only">Search artworks</span>
              <input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  resetMuseumSearch();
                }}
                placeholder="Search an artist, artwork title, or visual subject"
                className="h-full w-full rounded-md bg-transparent pl-[2.5%] pr-[15%] text-[clamp(0.58rem,0.95vw,1rem)] text-[#fff4d6] placeholder:text-amber-100/45 outline-none focus:ring-2 focus:ring-pink-200/70"
              />
            </label>
            <button
              type="submit"
              disabled={isSearching}
              className="absolute bottom-[12%] right-[0.8%] top-[12%] rounded border border-amber-200/55 bg-[#7e1c59] px-[3%] text-[clamp(0.46rem,0.72vw,0.76rem)] font-bold text-[#fff4d6] shadow-[inset_0_0_12px_rgba(255,255,255,0.12)] transition hover:bg-[#a62770] focus:outline-none focus:ring-2 focus:ring-pink-200/80 disabled:cursor-wait disabled:opacity-65"
              aria-label="Search the available artwork collections"
            >
              Search
            </button>
          </div>

          <div className="absolute left-[1.9%] top-[18.8%] grid h-[12.4%] w-[96.2%] grid-cols-4 gap-[1.3%]">
            <label className="min-w-0">
              <span className="mb-[3%] block pl-[2%] text-[clamp(0.4rem,0.63vw,0.66rem)] font-bold uppercase tracking-wide text-amber-200">Collection</span>
              <select
                value={collectionFilter}
                onChange={(event) => {
                  setCollectionFilter(event.target.value as MuseumArtworkFilterSelection['collection']);
                  resetMuseumSearch();
                }}
                className="h-[72%] w-full rounded-md border border-amber-300/40 bg-[#17142c]/95 px-[5%] text-[clamp(0.42rem,0.64vw,0.68rem)] text-[#fff4d6] outline-none focus:ring-2 focus:ring-pink-200/70"
                aria-label="Choose museum collection"
              >
                {MUSEUM_COLLECTION_OPTIONS.map((collection) => (
                  <option key={collection.value} value={collection.value}>{collection.label}</option>
                ))}
              </select>
            </label>
            <label className="min-w-0">
              <span className="mb-[3%] block pl-[2%] text-[clamp(0.4rem,0.63vw,0.66rem)] font-bold uppercase tracking-wide text-amber-200">Image rights</span>
              <select
                value={rightsFilter}
                onChange={(event) => {
                  setRightsFilter(event.target.value as MuseumArtworkFilterSelection['rights']);
                  resetMuseumSearch();
                }}
                className="h-[72%] w-full rounded-md border border-amber-300/40 bg-[#17142c]/95 px-[5%] text-[clamp(0.42rem,0.64vw,0.68rem)] text-[#fff4d6] outline-none focus:ring-2 focus:ring-pink-200/70"
                aria-label="Filter by image rights"
              >
                {MUSEUM_RIGHTS_OPTIONS.map((rights) => (
                  <option key={rights.value} value={rights.value}>{rights.label}</option>
                ))}
              </select>
            </label>
            <label className="min-w-0">
              <span className="mb-[3%] block pl-[2%] text-[clamp(0.4rem,0.63vw,0.66rem)] font-bold uppercase tracking-wide text-amber-200">Date</span>
              <select
                value={dateFilter}
                onChange={(event) => {
                  setDateFilter(event.target.value);
                  resetMuseumSearch();
                }}
                className="h-[72%] w-full rounded-md border border-amber-300/40 bg-[#17142c]/95 px-[5%] text-[clamp(0.42rem,0.64vw,0.68rem)] text-[#fff4d6] outline-none focus:ring-2 focus:ring-pink-200/70"
                aria-label="Filter by date"
              >
                <option value="all">Any date</option>
                {MUSEUM_DATE_OPTIONS.map((date) => <option key={date.value} value={date.value}>{date.label}</option>)}
              </select>
            </label>
            <label className="min-w-0">
              <span className="mb-[3%] block pl-[2%] text-[clamp(0.4rem,0.63vw,0.66rem)] font-bold uppercase tracking-wide text-amber-200">Search by</span>
              <select
                value={scopeFilter}
                onChange={(event) => {
                  setScopeFilter(event.target.value as MuseumArtworkFilterSelection['scope']);
                  resetMuseumSearch();
                }}
                className="h-[72%] w-full rounded-md border border-amber-300/40 bg-[#17142c]/95 px-[5%] text-[clamp(0.42rem,0.64vw,0.68rem)] text-[#fff4d6] outline-none focus:ring-2 focus:ring-pink-200/70"
                aria-label="Choose search field"
              >
                {MUSEUM_SEARCH_SCOPE_OPTIONS.map((scope) => (
                  <option key={scope.value} value={scope.value}>{scope.label.replace('Search by: ', '')}</option>
                ))}
              </select>
            </label>
          </div>

          <p className="absolute left-[2.2%] top-[32.4%] max-w-[94%] text-[clamp(0.4rem,0.64vw,0.68rem)] leading-tight text-amber-100/85" aria-live="polite">
            {(isSearching || isLoadingMore) && (
              <span className="mr-1 inline-block h-[0.65em] w-[0.65em] animate-spin rounded-full border border-amber-100/35 border-t-amber-100 align-[-0.04em]" aria-hidden="true" />
            )}
            {searchMessage}
          </p>

          <button
            type="button"
            onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
            disabled={page === 0}
            className="absolute left-[-0.7%] top-[86.1%] h-[14%] w-[5.2%] rounded-md text-transparent outline-none transition hover:bg-white/10 focus:ring-2 focus:ring-pink-200/80 disabled:cursor-default"
            aria-label="Previous artwork page"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => {
              if (hasLocalNextPage) {
                setPage((currentPage) => currentPage + 1);
              } else {
                void loadMoreMuseumArtworks();
              }
            }}
            disabled={isSearching || isLoadingMore || (!hasLocalNextPage && !canLoadMoreArtworks)}
            className="absolute right-[-0.7%] top-[86.1%] h-[14%] w-[5.2%] rounded-md text-transparent outline-none transition hover:bg-white/10 focus:ring-2 focus:ring-pink-200/80 disabled:cursor-default disabled:opacity-60"
            aria-label="Next artwork page"
          >
            Next
          </button>

          <div className="absolute left-[5.8%] top-[37.1%] grid h-[57.8%] w-[88.4%] grid-cols-5 grid-rows-2 gap-x-[1.4%] gap-y-[3.2%]">
            {visibleArtworks.map((artwork) => {
              const isSelected = selectedArtwork?.id === artwork.id
                && selectedArtwork?.sourceProvider === artwork.sourceProvider;
              const imageUnavailable = unavailableArtworkKeys.has(artworkKey(artwork));
              const selectedRoomName = WING_DEFINITIONS.find((wing) => wing.id === activeWingId)?.name || 'this room';
              return (
                <article
                  key={`${artwork.sourceProvider}-${artwork.id}`}
                  className={`flex min-h-0 flex-col overflow-hidden rounded-md border p-[3.2%] shadow-[0_5px_14px_rgba(0,0,0,0.34)] transition ${
                    isSelected
                      ? 'border-pink-300 bg-[#351b44]/95 shadow-[0_0_0_2px_rgba(246,168,255,0.65)]'
                      : 'border-amber-200/45 bg-[#11142d]/95 hover:border-amber-200/90'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setViewedArtwork(artwork)}
                    className="relative h-[53%] w-full shrink-0 overflow-hidden rounded border border-amber-200/30 bg-[#080b16] text-transparent outline-none focus:ring-2 focus:ring-pink-200/80"
                    aria-label={`View details for ${artwork.title}`}
                  >
                    {imageUnavailable ? (
                      <span className="flex h-full w-full items-center justify-center px-1 text-center text-[clamp(0.32rem,0.48vw,0.52rem)] font-bold leading-tight text-amber-100">
                        Image unavailable
                      </span>
                    ) : (
                      <img
                        src={artwork.imageUrl}
                        alt={artwork.title}
                        className="h-full w-full object-cover transition duration-200 hover:scale-105"
                        loading="eager"
                        onError={() => markArtworkImageUnavailable(artwork)}
                      />
                    )}
                  </button>
                  <div className="min-h-0 flex-1 px-[1%] pt-[3%]">
                    <p className="truncate text-[clamp(0.38rem,0.57vw,0.62rem)] font-black leading-tight text-[#fff4d6]" title={artwork.title}>{artwork.title}</p>
                    <p className="mt-[2%] truncate text-[clamp(0.32rem,0.49vw,0.54rem)] leading-tight text-pink-200" title={artwork.artistDisplay}>{artwork.artistDisplay || 'Artist unknown'}</p>
                  </div>
                  <div className="grid shrink-0 grid-cols-2 gap-[4%] pt-[3%]">
                    <button
                      type="button"
                      onClick={() => setViewedArtwork(artwork)}
                      className="rounded border border-amber-200/55 bg-[#211b45] px-1 py-[5%] text-[clamp(0.32rem,0.48vw,0.53rem)] font-bold text-amber-100 transition hover:bg-[#33285d] focus:outline-none focus:ring-2 focus:ring-pink-200/80"
                      aria-label={`View details for ${artwork.title}`}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => selectArtworkForActiveRoom(artwork)}
                      className={`rounded border px-1 py-[5%] text-[clamp(0.32rem,0.48vw,0.53rem)] font-bold transition focus:outline-none focus:ring-2 focus:ring-pink-200/80 ${
                        isSelected
                          ? 'border-pink-200 bg-[#a12670] text-white'
                          : 'border-amber-200/60 bg-[#075d66] text-[#efffec] hover:bg-[#0d7b83]'
                      }`}
                      aria-label={`Select ${artwork.title} for ${selectedRoomName}`}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </button>
                  </div>
                </article>
              );
            })}
            {visibleArtworks.length === 0 && !isSearching && (
              <div className="col-span-5 row-span-2 flex items-center justify-center rounded-md border border-dashed border-amber-200/45 bg-[#090b17]/70 p-4 text-center text-[clamp(0.52rem,0.82vw,0.88rem)] font-semibold text-amber-100/85">
                Search for a work to begin building this class pack.
              </div>
            )}
          </div>
        </form>

        <section className="absolute left-[20.1%] top-[74.7%] z-20 h-[16.2%] w-[54.5%]" aria-label="Selected artwork for active room">
          <div className="flex h-full w-full items-center gap-[1.5%] rounded-md border border-amber-200/35 bg-[#0c1026]/62 px-[1.6%] pt-[3.5%] shadow-[inset_0_0_18px_rgba(0,0,0,0.28)]">
            {selectedArtwork && (
              <>
                <button
                  type="button"
                  onClick={() => setViewedArtwork(selectedArtwork)}
                  className="h-[82%] w-[14%] shrink-0 overflow-hidden rounded border border-amber-200/55 bg-[#080b16] outline-none focus:ring-2 focus:ring-pink-200/80"
                  aria-label={`View selected artwork: ${selectedArtwork.title}`}
                >
                  {unavailableArtworkKeys.has(artworkKey(selectedArtwork)) ? (
                    <span className="flex h-full w-full items-center justify-center px-1 text-center text-[clamp(0.34rem,0.52vw,0.56rem)] font-bold text-amber-100">Image unavailable</span>
                  ) : (
                    <img
                      src={selectedArtwork.imageUrl}
                      alt={selectedArtwork.title}
                      className="h-full w-full object-cover"
                      onError={() => markArtworkImageUnavailable(selectedArtwork)}
                    />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="max-w-[43%] truncate rounded-full border border-amber-200/45 bg-[#251f46] px-2 py-0.5 text-[clamp(0.34rem,0.52vw,0.56rem)] font-bold text-amber-100">
                      {WING_DEFINITIONS.find((wing) => wing.id === activeWingId)?.name || 'Active room'}
                    </span>
                    <span className="text-[clamp(0.32rem,0.48vw,0.52rem)] font-semibold uppercase tracking-wide text-pink-200">Current selection</span>
                  </div>
                  <p className="mt-[1.8%] truncate text-[clamp(0.56rem,0.9vw,0.96rem)] font-black leading-tight text-[#fff4d6]" title={selectedArtwork.title}>{selectedArtwork.title}</p>
                  <p className="mt-[0.8%] truncate text-[clamp(0.4rem,0.62vw,0.68rem)] text-pink-200" title={selectedArtwork.artistDisplay}>{selectedArtwork.artistDisplay || 'Artist unknown'}</p>
                  <dl className="mt-[2%] grid grid-cols-3 gap-x-3 text-[clamp(0.32rem,0.5vw,0.54rem)] leading-tight text-purple-100">
                    <div className="min-w-0"><dt className="font-bold text-amber-200">Date</dt><dd className="truncate" title={selectedArtwork.dateDisplay}>{selectedArtwork.dateDisplay || 'Not recorded'}</dd></div>
                    <div className="min-w-0"><dt className="font-bold text-amber-200">Medium</dt><dd className="truncate" title={selectedArtwork.medium}>{selectedArtwork.medium || 'Not recorded'}</dd></div>
                    <div className="min-w-0"><dt className="font-bold text-amber-200">Collection</dt><dd className="truncate" title={getClassPackArtworkSourceName(selectedArtwork)}>{getClassPackArtworkSourceName(selectedArtwork)}</dd></div>
                  </dl>
                </div>
                <button
                  type="button"
                  onClick={() => setViewedArtwork(selectedArtwork)}
                  className="shrink-0 rounded border border-amber-200/60 bg-[#211b45] px-[1.7%] py-[1.4%] text-[clamp(0.36rem,0.56vw,0.6rem)] font-bold text-amber-100 transition hover:bg-[#33285d] focus:outline-none focus:ring-2 focus:ring-pink-200/80"
                  aria-label={`View selected artwork details for ${selectedArtwork.title}`}
                >
                  Details
                </button>
              </>
            )}
          </div>
        </section>

        <section className="absolute left-[75.6%] top-[15.1%] z-20 h-[76.9%] w-[22.2%]" aria-label="Class pack questions">
          <button
            type="button"
            onClick={resetQuestions}
            className="absolute left-[24.7%] top-[8.5%] h-[5.4%] w-[55%] rounded-md text-transparent outline-none transition hover:bg-white/10 focus:ring-2 focus:ring-pink-200/80"
            aria-label={`Reset ${WING_DEFINITIONS.find((wing) => wing.id === activeWingId)?.name || 'room'} questions to default`}
          >
            Reset to default
          </button>

          <div className="absolute left-[3.1%] top-[16%] flex h-[79.8%] w-[93.1%] flex-col gap-[2.05%]">
            {CLASS_PACK_PHASES.map(({ phase, label }) => {
              const isEditing = editingPhase === phase;
              return (
                <div key={phase} className="relative min-h-0 flex-1">
                  <label className="absolute inset-x-[3.6%] bottom-[9.5%] top-[40.5%]">
                    <span className="sr-only">{label} question</span>
                    <textarea
                      value={activeQuestions[phase]}
                      onChange={(event) => updateQuestion(phase, event.target.value)}
                      readOnly={!isEditing}
                      onBlur={() => isEditing && setEditingPhase(null)}
                      className={`h-full w-full resize-none rounded-md border border-amber-200/25 bg-[#f5e7cc]/85 p-[3.5%] text-[clamp(0.42rem,0.72vw,0.78rem)] font-medium leading-snug text-black outline-none transition ${
                        isEditing ? 'border-pink-300 bg-[#f5e7cc] ring-2 ring-pink-200/70' : 'cursor-default'
                      }`}
                      aria-label={`${label} question`}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditingPhase(isEditing ? null : phase)}
                    className={`absolute right-[1.5%] top-[10%] h-[20%] w-[7%] rounded-sm text-transparent outline-none transition focus:ring-2 focus:ring-pink-200/80 ${
                      isEditing ? 'bg-pink-300/25' : 'hover:bg-white/10'
                    }`}
                    aria-label={`${isEditing ? 'Finish editing' : 'Edit'} ${label} question`}
                  >
                    Edit {label}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <button
          type="button"
          onClick={onReturnToTeacherMenu}
          className="absolute left-[3.8%] top-[6.3%] z-20 h-[6.1%] w-[16.6%] rounded-md text-transparent outline-none transition hover:bg-white/10 focus:ring-2 focus:ring-pink-200/80"
          aria-label="Return to Teacher Mode menu"
        >
          Return to menu
        </button>
        <button
          type="button"
          onClick={openUploadArtwork}
          className="absolute left-[68.5%] top-[6.3%] z-20 h-[6.1%] w-[12.4%] rounded-md text-transparent outline-none transition hover:bg-white/10 focus:ring-2 focus:ring-pink-200/80"
          aria-label="Upload artwork for the active room"
        >
          Upload artwork
        </button>
        <button
          type="button"
          onClick={exportClassPack}
          className="absolute left-[81.7%] top-[6.3%] z-20 h-[6.1%] w-[10.8%] rounded-md text-transparent outline-none transition hover:bg-white/10 focus:ring-2 focus:ring-pink-200/80"
          aria-label="Export Class Pack"
        >
          Export Pack
        </button>
      </div>

      {(isSearching || isLoadingMore) && (
        <GalleryLoadingScreen
          title={isSearching ? 'Searching Collections' : 'Finding More Artworks'}
          message={isSearching
            ? 'Searching the selected catalogues and checking that each artwork image can be used in the builder.'
            : 'Preparing the next stable page of image-verified artworks.'}
          detail="The current artwork pages remain unchanged while this search is underway."
          tone="analysis"
          steps={['Searching catalogues', 'Checking image records', 'Preparing artwork cards']}
        />
      )}

      <Modal
        isOpen={isUploadArtworkOpen}
        title="Upload artwork"
        onClose={closeUploadArtwork}
        size="lg"
      >
        <form className="space-y-5" onSubmit={addUploadedArtworkToActiveRoom}>
          <div className="grid gap-5 md:grid-cols-[minmax(14rem,0.8fr)_minmax(0,1.2fr)]">
            <div className="rounded-xl border border-amber-300/35 bg-slate-950/60 p-4">
              <p className="text-sm font-black text-amber-200">Artwork image</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-300">The image is resized and compressed before it is embedded in the exported JSON.</p>
              <input
                ref={uploadArtworkFileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => { void handleUploadArtworkImage(event); }}
              />
              <button
                type="button"
                onClick={() => uploadArtworkFileInputRef.current?.click()}
                disabled={isPreparingUploadImage}
                className="artquest-button mt-4 w-full px-4 py-3 text-sm font-black focus:outline-none focus:ring-4 focus:ring-pink-200 disabled:cursor-wait disabled:opacity-65"
              >
                {isPreparingUploadImage ? 'Preparing image…' : preparedUploadImage ? 'Choose another image' : 'Choose image'}
              </button>
              {preparedUploadImage && (
                <div className="mt-4">
                  <img
                    src={preparedUploadImage.dataUrl}
                    alt="Prepared artwork upload preview"
                    className="h-44 w-full rounded-lg border border-amber-300/40 bg-slate-950 object-contain"
                  />
                  <p className="mt-2 text-center text-xs text-emerald-200">
                    Ready: {preparedUploadImage.width} × {preparedUploadImage.height}px · about {Math.ceil(preparedUploadImage.byteLength / 1024)} KB in the pack
                  </p>
                </div>
              )}
            </div>

            <div className="grid content-start gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-amber-200 sm:col-span-2">
                Artwork title
                <input
                  required
                  value={uploadArtworkForm.title}
                  onChange={(event) => setUploadArtworkForm((previous) => ({ ...previous, title: event.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-amber-300/45 bg-slate-950 px-3 py-2.5 text-sm font-medium text-white outline-none focus:ring-4 focus:ring-pink-200"
                  placeholder="e.g. The Great Wave off Kanagawa"
                />
              </label>
              <label className="block text-sm font-bold text-amber-200">
                Artist name
                <input
                  required
                  value={uploadArtworkForm.artistName}
                  onChange={(event) => setUploadArtworkForm((previous) => ({ ...previous, artistName: event.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-amber-300/45 bg-slate-950 px-3 py-2.5 text-sm font-medium text-white outline-none focus:ring-4 focus:ring-pink-200"
                  placeholder="Artist name"
                />
              </label>
              <label className="block text-sm font-bold text-amber-200">
                Medium
                <input
                  required
                  value={uploadArtworkForm.medium}
                  onChange={(event) => setUploadArtworkForm((previous) => ({ ...previous, medium: event.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-amber-300/45 bg-slate-950 px-3 py-2.5 text-sm font-medium text-white outline-none focus:ring-4 focus:ring-pink-200"
                  placeholder="e.g. Woodblock print"
                />
              </label>
              <label className="block text-sm font-bold text-amber-200">
                Year
                <input
                  required
                  value={uploadArtworkForm.year}
                  onChange={(event) => setUploadArtworkForm((previous) => ({ ...previous, year: event.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-amber-300/45 bg-slate-950 px-3 py-2.5 text-sm font-medium text-white outline-none focus:ring-4 focus:ring-pink-200"
                  placeholder="e.g. 1831 or c. 1831"
                />
              </label>
              <label className="block text-sm font-bold text-amber-200">
                Source website URL
                <input
                  required
                  type="url"
                  value={uploadArtworkForm.sourceUrl}
                  onChange={(event) => setUploadArtworkForm((previous) => ({ ...previous, sourceUrl: event.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-amber-300/45 bg-slate-950 px-3 py-2.5 text-sm font-medium text-white outline-none focus:ring-4 focus:ring-pink-200"
                  placeholder="https://collection.example.org/artwork"
                />
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200/25 bg-slate-950/45 px-4 py-3 text-xs leading-relaxed text-gray-300">
            Uploaded images are stored as portable Base64 data inside the exported Class Pack, capped at about {Math.round(CLASS_PACK_IMAGE_MAX_BYTES / 1024)} KB per image. Only upload artwork you are permitted to use, and provide the source website for acknowledgement.
          </div>
          {uploadArtworkError && (
            <p className="rounded-lg border border-rose-300/50 bg-rose-950/45 px-4 py-3 text-sm font-semibold text-rose-100" role="alert">
              {uploadArtworkError}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={closeUploadArtwork}
              className="rounded-lg bg-slate-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-600 focus:outline-none focus:ring-4 focus:ring-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPreparingUploadImage || !preparedUploadImage}
              className="artquest-button px-5 py-3 text-sm font-black focus:outline-none focus:ring-4 focus:ring-pink-200 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Add to selected room
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!viewedArtwork}
        title="Artwork details"
        onClose={() => setViewedArtwork(null)}
        size="xl"
      >
        {viewedArtwork && (
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
            {unavailableArtworkKeys.has(artworkKey(viewedArtwork)) ? (
              <div className="flex min-h-64 items-center justify-center rounded-lg border border-amber-300/50 bg-slate-950 p-8 text-center font-semibold text-amber-100">
                This collection image is currently unavailable. The source record and artwork details are still available.
              </div>
            ) : (
              <img
                src={viewedArtwork.imageUrl}
                alt={viewedArtwork.title}
                className="max-h-[68vh] w-full rounded-lg border border-amber-300/50 bg-slate-950 object-contain"
                onError={() => markArtworkImageUnavailable(viewedArtwork)}
              />
            )}
            <div className="space-y-4 text-sm leading-relaxed text-purple-100">
              <div>
                <p className="text-xl font-black text-[#fff4d6]">{viewedArtwork.title}</p>
                <p className="mt-1 text-pink-200">{viewedArtwork.artistDisplay || 'Artist unknown'}</p>
              </div>
              <dl className="space-y-2 rounded-lg border border-amber-200/25 bg-slate-950/45 p-4">
                <div><dt className="font-bold text-amber-200">Date</dt><dd>{viewedArtwork.dateDisplay || 'Not recorded'}</dd></div>
                <div><dt className="font-bold text-amber-200">Medium</dt><dd>{viewedArtwork.medium || 'Not recorded'}</dd></div>
                <div><dt className="font-bold text-amber-200">Style</dt><dd>{getClassPackArtworkStyle(viewedArtwork)}</dd></div>
                <div><dt className="font-bold text-amber-200">Collection</dt><dd>{getClassPackArtworkSourceName(viewedArtwork)}</dd></div>
                <div><dt className="font-bold text-amber-200">Subject</dt><dd>{getClassPackArtworkSubject(viewedArtwork)}</dd></div>
                {viewedArtwork.searchMatch && (
                  <>
                    <div><dt className="font-bold text-amber-200">Search match</dt><dd>{getClassPackArtworkMatchLabel(viewedArtwork)}</dd></div>
                    <div><dt className="font-bold text-amber-200">Why it appeared</dt><dd>{viewedArtwork.searchMatch.reasons.join(' · ')}</dd></div>
                  </>
                )}
                <div><dt className="font-bold text-amber-200">Image rights</dt><dd>{viewedArtwork.isPublicDomain ? 'Open access / public domain record' : 'Check the collection source record before reuse'}</dd></div>
                {viewedArtwork.focus && <div><dt className="font-bold text-amber-200">ArtQuest focus</dt><dd>{viewedArtwork.focus}</dd></div>}
                {(viewedArtwork.focusReason || viewedArtwork.visualFocus) && (
                  <div><dt className="font-bold text-amber-200">Why it suits this room</dt><dd>{viewedArtwork.focusReason || viewedArtwork.visualFocus}</dd></div>
                )}
                {viewedArtwork.creditLine && (
                  <div><dt className="font-bold text-amber-200">Credit</dt><dd>{viewedArtwork.creditLine}</dd></div>
                )}
              </dl>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    selectArtworkForActiveRoom(viewedArtwork);
                    setViewedArtwork(null);
                  }}
                  className="artquest-button px-4 py-2 text-sm font-black focus:outline-none focus:ring-4 focus:ring-pink-200"
                >
                  Use in selected room
                </button>
                {viewedArtwork.sourceUrl && (
                  <a
                    href={viewedArtwork.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="artquest-button px-4 py-2 text-sm font-black focus:outline-none focus:ring-4 focus:ring-amber-200"
                  >
                    View source record
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
};

export default ClassPackBuilderScreen;
