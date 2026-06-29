import { useCallback, useEffect, useRef } from 'react';
import { publicAssetUrl } from '../utils/publicAssets';

export type GameMusicTrack = 'start' | 'exploration' | null;

type ActiveGameMusicTrack = Exclude<GameMusicTrack, null>;

const MUSIC_TRACKS: Record<ActiveGameMusicTrack, { src: string; volume: number }> = {
  start: {
    src: publicAssetUrl('audio/start-music.mp3'),
    volume: 0.24,
  },
  exploration: {
    src: publicAssetUrl('audio/main-game-exploration.mp3'),
    volume: 0.2,
  },
};

const WALKING_TAP_SRC = publicAssetUrl('audio/footstep.m4a');
const WALKING_TAP_VOLUME = 0.44;
const PAGE_TURN_SRC = publicAssetUrl('audio/page-turn.m4a');
const PAGE_TURN_VOLUME = 0.92;
const PAGE_TURN_POOL_SIZE = 3;
const FAST_PAGE_TURN_SRC = publicAssetUrl('audio/fast-page-turn.m4a');
const FAST_PAGE_TURN_VOLUME = 1;
const FAST_PAGE_TURN_POOL_SIZE = 2;
const PHASE_COMPLETION_SRC = publicAssetUrl('audio/phase-completion.wav');
const PHASE_COMPLETION_VOLUME = 0.82;
const PHASE_COMPLETION_POOL_SIZE = 2;
const ROOM_COMPLETION_SRC = publicAssetUrl('audio/room-completion.wav');
const ROOM_COMPLETION_VOLUME = 0.88;
const ROOM_COMPLETION_POOL_SIZE = 2;
const UNLOCK_DOOR_SRC = publicAssetUrl('audio/unlock-door.m4a');
const UNLOCK_DOOR_VOLUME = 0.9;
const UNLOCK_DOOR_POOL_SIZE = 2;
const DOOR_OPENING_SRC = publicAssetUrl('audio/door-opening.m4a');
const DOOR_OPENING_VOLUME = 0.92;
const DOOR_OPENING_POOL_SIZE = 2;

const pauseAudio = (audio: HTMLAudioElement | undefined) => {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
};

const tryPlay = (audio: HTMLAudioElement) => {
  void audio.play().catch(() => {
    // Browsers can block autoplay until the first user gesture.
  });
};

const createMusicAudio = (track: ActiveGameMusicTrack): HTMLAudioElement => {
  const audio = new Audio(MUSIC_TRACKS[track].src);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = MUSIC_TRACKS[track].volume;
  return audio;
};

const createWalkingTapAudio = (): HTMLAudioElement => {
  const audio = new Audio(WALKING_TAP_SRC);
  audio.preload = 'auto';
  audio.volume = WALKING_TAP_VOLUME;
  return audio;
};

const createPageTurnAudio = (): HTMLAudioElement => {
  const audio = new Audio(PAGE_TURN_SRC);
  audio.preload = 'auto';
  audio.volume = PAGE_TURN_VOLUME;
  return audio;
};

const createFastPageTurnAudio = (): HTMLAudioElement => {
  const audio = new Audio(FAST_PAGE_TURN_SRC);
  audio.preload = 'auto';
  audio.volume = FAST_PAGE_TURN_VOLUME;
  return audio;
};

const createPhaseCompletionAudio = (): HTMLAudioElement => {
  const audio = new Audio(PHASE_COMPLETION_SRC);
  audio.preload = 'auto';
  audio.volume = PHASE_COMPLETION_VOLUME;
  return audio;
};

const createRoomCompletionAudio = (): HTMLAudioElement => {
  const audio = new Audio(ROOM_COMPLETION_SRC);
  audio.preload = 'auto';
  audio.volume = ROOM_COMPLETION_VOLUME;
  return audio;
};

const createUnlockDoorAudio = (): HTMLAudioElement => {
  const audio = new Audio(UNLOCK_DOOR_SRC);
  audio.preload = 'auto';
  audio.volume = UNLOCK_DOOR_VOLUME;
  return audio;
};

const createDoorOpeningAudio = (): HTMLAudioElement => {
  const audio = new Audio(DOOR_OPENING_SRC);
  audio.preload = 'auto';
  audio.volume = DOOR_OPENING_VOLUME;
  return audio;
};

export const useGameAudio = (activeTrack: GameMusicTrack) => {
  const activeTrackRef = useRef<GameMusicTrack>(activeTrack);
  const isMusicSuppressedRef = useRef(false);
  const musicAudioRef = useRef<Partial<Record<ActiveGameMusicTrack, HTMLAudioElement>>>({});
  const walkingTapRef = useRef<HTMLAudioElement | null>(null);
  const pageTurnPoolRef = useRef<HTMLAudioElement[]>([]);
  const pageTurnIndexRef = useRef(0);
  const fastPageTurnPoolRef = useRef<HTMLAudioElement[]>([]);
  const fastPageTurnIndexRef = useRef(0);
  const phaseCompletionPoolRef = useRef<HTMLAudioElement[]>([]);
  const phaseCompletionIndexRef = useRef(0);
  const roomCompletionPoolRef = useRef<HTMLAudioElement[]>([]);
  const roomCompletionIndexRef = useRef(0);
  const unlockDoorPoolRef = useRef<HTMLAudioElement[]>([]);
  const unlockDoorIndexRef = useRef(0);
  const doorOpeningPoolRef = useRef<HTMLAudioElement[]>([]);
  const doorOpeningIndexRef = useRef(0);

  const getMusicAudio = useCallback((track: ActiveGameMusicTrack): HTMLAudioElement => {
    if (!musicAudioRef.current[track]) {
      musicAudioRef.current[track] = createMusicAudio(track);
    }

    return musicAudioRef.current[track];
  }, []);

  const playActiveTrack = useCallback(() => {
    if (isMusicSuppressedRef.current) return;

    const track = activeTrackRef.current;
    if (!track) return;

    const audio = getMusicAudio(track);
    audio.volume = MUSIC_TRACKS[track].volume;
    tryPlay(audio);
  }, [getMusicAudio]);

  const pauseActiveTrack = useCallback(() => {
    isMusicSuppressedRef.current = true;

    const track = activeTrackRef.current;
    if (!track) return;

    musicAudioRef.current[track]?.pause();
  }, []);

  const resumeActiveTrack = useCallback(() => {
    isMusicSuppressedRef.current = false;
    playActiveTrack();
  }, [playActiveTrack]);

  useEffect(() => {
    if (activeTrackRef.current !== activeTrack) {
      isMusicSuppressedRef.current = false;
    }

    activeTrackRef.current = activeTrack;

    (Object.keys(MUSIC_TRACKS) as ActiveGameMusicTrack[]).forEach((track) => {
      if (track !== activeTrack) {
        pauseAudio(musicAudioRef.current[track]);
      }
    });

    if (activeTrack && !isMusicSuppressedRef.current) {
      playActiveTrack();
    }
  }, [activeTrack, playActiveTrack]);

  useEffect(() => {
    window.addEventListener('pointerdown', playActiveTrack, { passive: true });
    window.addEventListener('keydown', playActiveTrack);

    return () => {
      window.removeEventListener('pointerdown', playActiveTrack);
      window.removeEventListener('keydown', playActiveTrack);
    };
  }, [playActiveTrack]);

  useEffect(() => (
    () => {
      Object.values(musicAudioRef.current).forEach(pauseAudio);
      pauseAudio(walkingTapRef.current || undefined);
      pageTurnPoolRef.current.forEach(pauseAudio);
      fastPageTurnPoolRef.current.forEach(pauseAudio);
      phaseCompletionPoolRef.current.forEach(pauseAudio);
      roomCompletionPoolRef.current.forEach(pauseAudio);
      unlockDoorPoolRef.current.forEach(pauseAudio);
      doorOpeningPoolRef.current.forEach(pauseAudio);
    }
  ), []);

  const playWalkingTap = useCallback(() => {
    if (!walkingTapRef.current) {
      walkingTapRef.current = createWalkingTapAudio();
    }

    const tapAudio = walkingTapRef.current;
    if (!tapAudio.paused && !tapAudio.ended) return;

    tapAudio.currentTime = 0;
    tapAudio.volume = WALKING_TAP_VOLUME;
    tryPlay(tapAudio);
  }, []);

  const playPageTurn = useCallback(() => {
    if (pageTurnPoolRef.current.length === 0) {
      pageTurnPoolRef.current = Array.from({ length: PAGE_TURN_POOL_SIZE }, createPageTurnAudio);
    }

    const pageAudio = pageTurnPoolRef.current[pageTurnIndexRef.current % pageTurnPoolRef.current.length];
    pageTurnIndexRef.current += 1;
    pageAudio.currentTime = 0;
    pageAudio.volume = PAGE_TURN_VOLUME;
    tryPlay(pageAudio);
  }, []);

  const playFastPageTurn = useCallback(() => {
    if (fastPageTurnPoolRef.current.length === 0) {
      fastPageTurnPoolRef.current = Array.from({ length: FAST_PAGE_TURN_POOL_SIZE }, createFastPageTurnAudio);
    }

    const pageAudio = fastPageTurnPoolRef.current[fastPageTurnIndexRef.current % fastPageTurnPoolRef.current.length];
    fastPageTurnIndexRef.current += 1;
    pageAudio.currentTime = 0;
    pageAudio.volume = FAST_PAGE_TURN_VOLUME;
    tryPlay(pageAudio);
  }, []);

  const playPhaseCompletion = useCallback(() => {
    if (phaseCompletionPoolRef.current.length === 0) {
      phaseCompletionPoolRef.current = Array.from({ length: PHASE_COMPLETION_POOL_SIZE }, createPhaseCompletionAudio);
    }

    const audio = phaseCompletionPoolRef.current[phaseCompletionIndexRef.current % phaseCompletionPoolRef.current.length];
    phaseCompletionIndexRef.current += 1;
    audio.currentTime = 0;
    audio.volume = PHASE_COMPLETION_VOLUME;
    tryPlay(audio);
  }, []);

  const playRoomCompletion = useCallback(() => {
    if (roomCompletionPoolRef.current.length === 0) {
      roomCompletionPoolRef.current = Array.from({ length: ROOM_COMPLETION_POOL_SIZE }, createRoomCompletionAudio);
    }

    const audio = roomCompletionPoolRef.current[roomCompletionIndexRef.current % roomCompletionPoolRef.current.length];
    roomCompletionIndexRef.current += 1;
    audio.currentTime = 0;
    audio.volume = ROOM_COMPLETION_VOLUME;
    tryPlay(audio);
  }, []);

  const playUnlockDoor = useCallback(() => {
    if (unlockDoorPoolRef.current.length === 0) {
      unlockDoorPoolRef.current = Array.from({ length: UNLOCK_DOOR_POOL_SIZE }, createUnlockDoorAudio);
    }

    const audio = unlockDoorPoolRef.current[unlockDoorIndexRef.current % unlockDoorPoolRef.current.length];
    unlockDoorIndexRef.current += 1;
    audio.currentTime = 0;
    audio.volume = UNLOCK_DOOR_VOLUME;
    tryPlay(audio);
  }, []);

  const playDoorOpening = useCallback(() => {
    if (doorOpeningPoolRef.current.length === 0) {
      doorOpeningPoolRef.current = Array.from({ length: DOOR_OPENING_POOL_SIZE }, createDoorOpeningAudio);
    }

    const audio = doorOpeningPoolRef.current[doorOpeningIndexRef.current % doorOpeningPoolRef.current.length];
    doorOpeningIndexRef.current += 1;
    audio.currentTime = 0;
    audio.volume = DOOR_OPENING_VOLUME;
    tryPlay(audio);
  }, []);

  return {
    playWalkingTap,
    playPageTurn,
    playFastPageTurn,
    playPhaseCompletion,
    playRoomCompletion,
    playUnlockDoor,
    playDoorOpening,
    pauseActiveTrack,
    resumeActiveTrack,
  };
};
