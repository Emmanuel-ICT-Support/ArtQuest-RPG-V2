import { WING_DEFINITIONS } from '../constants';
import { getArtworkBrief } from './ArtworkLibrary';
import { parseClassPackExport } from './ClassPack';
import { getOfflinePhaseTask } from './OfflineCurator';
import { PRELOADED_CLASS_PACK_JSON } from './preloadedClassPacks.generated';
import type { ClassPackArtwork, ClassPackExport } from './ClassPack';
import type { QuestionPhase, YearLevel } from '../types';

export interface PreloadedClassPack {
  id: string;
  label: string;
  source: string;
  classPack: ClassPackExport;
}

const toPreloadedClassPackArtwork = (wingId: string, yearLevel: YearLevel): ClassPackArtwork => {
  const brief = getArtworkBrief(wingId, yearLevel);
  const artwork = brief.sourceArtwork;

  if (!artwork) {
    throw new Error(`The bundled artwork for ${wingId} is unavailable.`);
  }

  return {
    id: artwork.id,
    sourceProvider: artwork.sourceProvider || 'artic',
    title: artwork.title,
    artistName: artwork.artistTitle || artwork.artistDisplay,
    artistDisplay: artwork.artistDisplay || artwork.artistTitle,
    dateDisplay: artwork.dateDisplay,
    dateStart: artwork.dateStart,
    dateEnd: artwork.dateEnd,
    isPublicDomain: artwork.isPublicDomain,
    imageUrl: `./public/${artwork.assetPath}`,
    medium: artwork.mediumDisplay,
    classification: artwork.classificationTitle,
    artworkType: artwork.artworkTypeTitle,
    subject: artwork.artworkTypeTitle || artwork.classificationTitle,
    placeOfOrigin: artwork.placeOfOrigin,
    creditLine: artwork.creditLine,
    department: artwork.departmentTitle,
    style: artwork.styleTitle || brief.style,
    filterText: [
      artwork.title,
      artwork.artistDisplay,
      artwork.mediumDisplay,
      artwork.classificationTitle,
      artwork.artworkTypeTitle,
    ].filter(Boolean).join(' '),
    copyrightNotice: artwork.copyrightNotice,
    apiLink: artwork.apiLink,
    sourceUrl: artwork.sourceUrl,
    wingId,
    yearLevel,
    focus: brief.focus,
    visualFocus: brief.visualFocus,
    focusReason: artwork.focusReason,
  };
};

const createStarterClassPack = (): ClassPackExport => {
  const yearLevel: YearLevel = 9;
  return {
    version: '1.0',
    title: 'Year 9 Studio Demonstration',
    yearLevel,
    createdAt: '2026-07-24T00:00:00.000Z',
    rooms: WING_DEFINITIONS.map((wing) => ({
      id: wing.id,
      name: wing.name,
      artPrinciple: wing.artPrinciple,
      artwork: toPreloadedClassPackArtwork(wing.id, yearLevel),
      questions: Object.fromEntries([1, 2, 3, 4].map((phase) => [
        phase,
        getOfflinePhaseTask(wing.id, phase, yearLevel),
      ])) as Record<QuestionPhase, string>,
    })),
  };
};

const loadBundledClassPacks = (): PreloadedClassPack[] => {
  const packs: PreloadedClassPack[] = [
    {
      id: 'year-9-studio-demonstration',
      label: 'Year 9 Studio Demonstration',
      source: 'Included demonstration pack',
      classPack: createStarterClassPack(),
    },
  ];

  PRELOADED_CLASS_PACK_JSON.forEach(({ source, classPack: moduleValue }) => {
    try {
      const classPack = parseClassPackExport(JSON.stringify(moduleValue));
      const fileName = source.replace(/\.json$/i, '') || 'Class Pack';
      packs.push({
        id: `bundled-${fileName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        label: classPack.title,
        source,
        classPack,
      });
    } catch (error) {
      console.warn(`Ignoring invalid preloaded Class Pack: ${source}`, error);
    }
  });

  return packs.sort((first, second) => first.label.localeCompare(second.label));
};

export const PRELOADED_CLASS_PACKS = loadBundledClassPacks();
