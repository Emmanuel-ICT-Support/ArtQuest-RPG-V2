import { WING_DEFINITIONS } from '../constants';
import type { MuseumArtwork, MuseumArtworkSource } from './MuseumArtworkSearch';
import type { QuestionPhase, YearLevel } from '../types';

export type ClassPackArtwork = MuseumArtwork & {
  wingId?: string;
  yearLevel?: number;
  focus?: string;
  visualFocus?: string;
  focusReason?: string;
};

export interface ClassPackRoom {
  id: string;
  name: string;
  artPrinciple: string;
  artwork: ClassPackArtwork;
  questions: Record<QuestionPhase, string>;
}

export interface ClassPackExport {
  version: '1.0';
  title: string;
  yearLevel: YearLevel;
  createdAt: string;
  rooms: ClassPackRoom[];
}

export interface PreparedClassPackImage {
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  byteLength: number;
}

const QUESTION_PHASES: readonly QuestionPhase[] = [1, 2, 3, 4];
const MUSEUM_ARTWORK_SOURCES: readonly MuseumArtworkSource[] = ['artic', 'met', 'openverse', 'rijksmuseum', 'teacher_upload'];
const YEAR_LEVELS: readonly YearLevel[] = [7, 8, 9, 10, 11, 12];
export const CLASS_PACK_IMAGE_MAX_BYTES = 650 * 1024;
const CLASS_PACK_IMAGE_MAX_FILE_BYTES = 15 * 1024 * 1024;
const CLASS_PACK_IMAGE_MAX_DIMENSION = 1280;
const CLASS_PACK_IMAGE_MIN_DIMENSION = 640;
const IMAGE_QUALITIES = [0.82, 0.72, 0.62, 0.54];

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const requiredText = (record: Record<string, unknown>, field: string, context: string): string => {
  const value = record[field];
  if (typeof value !== 'string') throw new Error(`${context} is missing ${field}.`);
  return value;
};

const optionalText = (record: Record<string, unknown>, field: string): string | undefined => (
  typeof record[field] === 'string' ? record[field] : undefined
);

const loadImageFile = async (file: File): Promise<HTMLImageElement> => {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('The selected file is not a usable image.'));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> => (
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The image could not be prepared for this Class Pack.'));
    }, type, quality);
  })
);

const blobToDataUrl = (blob: Blob): Promise<string> => (
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('The image could not be encoded for this Class Pack.'));
    reader.onerror = () => reject(new Error('The image could not be encoded for this Class Pack.'));
    reader.readAsDataURL(blob);
  })
);

const getDataUrlByteLength = (dataUrl: string): number => {
  // Base64 is larger than its binary image payload. Measure the encoded string
  // itself so the limit reflects its real contribution to the JSON file.
  return new TextEncoder().encode(dataUrl).byteLength;
};

const renderCompressedImage = async (
  image: HTMLImageElement,
  maximumDimension: number,
  quality: number,
): Promise<PreparedClassPackImage> => {
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = Math.min(1, maximumDimension / longestSide);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser cannot prepare this image for a Class Pack.');
  context.drawImage(image, 0, 0, width, height);

  let blob = await canvasToBlob(canvas, 'image/webp', quality);
  if (blob.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  const dataUrl = await blobToDataUrl(blob);
  return {
    dataUrl,
    mimeType: blob.type,
    width,
    height,
    byteLength: getDataUrlByteLength(dataUrl),
  };
};

/**
 * Makes an uploaded image portable without allowing it to make a Class Pack
 * unmanageably large. The resulting Base64 data is capped at roughly 650 KB.
 */
export const prepareClassPackImage = async (file: File): Promise<PreparedClassPackImage> => {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file (JPEG, PNG, WebP, or similar).');
  if (file.size > CLASS_PACK_IMAGE_MAX_FILE_BYTES) throw new Error('Choose an image smaller than 15 MB. It will then be resized for the Class Pack.');

  const image = await loadImageFile(file);
  let maximumDimension = CLASS_PACK_IMAGE_MAX_DIMENSION;
  let smallestPreparedImage: PreparedClassPackImage | null = null;
  while (maximumDimension >= CLASS_PACK_IMAGE_MIN_DIMENSION) {
    for (const quality of IMAGE_QUALITIES) {
      const preparedImage = await renderCompressedImage(image, maximumDimension, quality);
      if (preparedImage.byteLength <= CLASS_PACK_IMAGE_MAX_BYTES) return preparedImage;
      smallestPreparedImage = preparedImage;
    }
    maximumDimension = Math.floor(maximumDimension * 0.8);
  }

  if (smallestPreparedImage?.byteLength && smallestPreparedImage.byteLength <= CLASS_PACK_IMAGE_MAX_BYTES) {
    return smallestPreparedImage;
  }
  throw new Error('This image is still too large after compression. Please choose a simpler or smaller image.');
};

const nullableNumber = (record: Record<string, unknown>, field: string, context: string): number | null => {
  const value = record[field];
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${context} has an invalid ${field}.`);
  return value;
};

const parseArtwork = (value: unknown, roomName: string): ClassPackArtwork => {
  const context = `The artwork for ${roomName}`;
  if (!isRecord(value)) throw new Error(`${context} is missing.`);
  const id = value.id;
  const sourceProvider = value.sourceProvider;
  if (typeof id !== 'number' || !Number.isFinite(id)) throw new Error(`${context} has an invalid id.`);
  if (typeof sourceProvider !== 'string' || !MUSEUM_ARTWORK_SOURCES.includes(sourceProvider as MuseumArtworkSource)) {
    throw new Error(`${context} has an unknown collection source.`);
  }
  if (typeof value.isPublicDomain !== 'boolean') throw new Error(`${context} has invalid image-rights data.`);

  return {
    id,
    sourceProvider: sourceProvider as MuseumArtworkSource,
    title: requiredText(value, 'title', context),
    artistName: requiredText(value, 'artistName', context),
    artistDisplay: requiredText(value, 'artistDisplay', context),
    dateDisplay: requiredText(value, 'dateDisplay', context),
    dateStart: nullableNumber(value, 'dateStart', context),
    dateEnd: nullableNumber(value, 'dateEnd', context),
    isPublicDomain: value.isPublicDomain,
    imageUrl: requiredText(value, 'imageUrl', context),
    ...(optionalText(value, 'fallbackImageUrl') ? { fallbackImageUrl: optionalText(value, 'fallbackImageUrl') } : {}),
    medium: requiredText(value, 'medium', context),
    classification: requiredText(value, 'classification', context),
    artworkType: requiredText(value, 'artworkType', context),
    subject: requiredText(value, 'subject', context),
    placeOfOrigin: requiredText(value, 'placeOfOrigin', context),
    creditLine: requiredText(value, 'creditLine', context),
    department: requiredText(value, 'department', context),
    style: requiredText(value, 'style', context),
    filterText: requiredText(value, 'filterText', context),
    copyrightNotice: requiredText(value, 'copyrightNotice', context),
    apiLink: requiredText(value, 'apiLink', context),
    sourceUrl: requiredText(value, 'sourceUrl', context),
    ...(optionalText(value, 'wingId') ? { wingId: optionalText(value, 'wingId') } : {}),
    ...(typeof value.yearLevel === 'number' ? { yearLevel: value.yearLevel } : {}),
    ...(optionalText(value, 'focus') ? { focus: optionalText(value, 'focus') } : {}),
    ...(optionalText(value, 'visualFocus') ? { visualFocus: optionalText(value, 'visualFocus') } : {}),
    ...(optionalText(value, 'focusReason') ? { focusReason: optionalText(value, 'focusReason') } : {}),
  };
};

const parseQuestions = (value: unknown, roomName: string): Record<QuestionPhase, string> => {
  if (!isRecord(value)) throw new Error(`The questions for ${roomName} are missing.`);
  return Object.fromEntries(QUESTION_PHASES.map((phase) => {
    const question = value[String(phase)];
    if (typeof question !== 'string') throw new Error(`The ${phase} question for ${roomName} is missing.`);
    return [phase, question];
  })) as Record<QuestionPhase, string>;
};

export const parseClassPackExport = (fileContent: string): ClassPackExport => {
  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(fileContent);
  } catch {
    throw new Error('This file is not valid JSON. Choose a Class Pack exported by ArtQuest.');
  }
  if (!isRecord(parsedValue)) throw new Error('This file is not an ArtQuest Class Pack.');
  if (parsedValue.version !== '1.0') throw new Error('This Class Pack version is not supported.');
  if (typeof parsedValue.title !== 'string' || !parsedValue.title.trim()) throw new Error('This Class Pack has no class name.');
  if (!YEAR_LEVELS.includes(parsedValue.yearLevel as YearLevel)) throw new Error('This Class Pack has an invalid year level.');
  if (typeof parsedValue.createdAt !== 'string') throw new Error('This Class Pack has no export date.');
  if (!Array.isArray(parsedValue.rooms)) throw new Error('This Class Pack has no room data.');

  const roomRecords = new Map<string, Record<string, unknown>>();
  parsedValue.rooms.forEach((room) => {
    if (!isRecord(room) || typeof room.id !== 'string') throw new Error('This Class Pack contains an invalid room.');
    if (roomRecords.has(room.id)) throw new Error(`This Class Pack has more than one entry for ${room.id}.`);
    roomRecords.set(room.id, room);
  });

  const rooms = WING_DEFINITIONS.map((wing) => {
    const room = roomRecords.get(wing.id);
    if (!room) throw new Error(`This Class Pack is missing ${wing.name}.`);
    return {
      id: wing.id,
      name: typeof room.name === 'string' ? room.name : wing.name,
      artPrinciple: typeof room.artPrinciple === 'string' ? room.artPrinciple : wing.artPrinciple,
      artwork: parseArtwork(room.artwork, wing.name),
      questions: parseQuestions(room.questions, wing.name),
    };
  });

  return {
    version: '1.0',
    title: parsedValue.title.trim(),
    yearLevel: parsedValue.yearLevel as YearLevel,
    createdAt: parsedValue.createdAt,
    rooms,
  };
};
