import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { DoorUnlockAssetSet } from '../data/DoorUnlockAssets';

interface DoorUnlockAnimationProps {
  assets: DoorUnlockAssetSet;
  roomName: string;
  onCancel: () => void;
  onComplete: () => void;
  onOpenStart?: () => void;
}

const DOOR_UNLOCK_FRAME_DURATION_MS = 320;
const DOOR_UNLOCK_OPEN_HOLD_MS = 820;
const REDUCED_MOTION_DURATION_MS = 520;

const DOOR_UNLOCK_STYLES = `
  .door-unlock-overlay {
    --door-prompt-clearance: clamp(300px, 42vh, 650px);
    --door-prompt-max-height: min(56vh, 941px);
    position: fixed;
    inset: 0;
    z-index: 70;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    align-items: end;
    justify-items: center;
    gap: min(1.6vh, 12px);
    overflow: hidden;
    padding: min(2.6vh, 22px) min(1.6vw, 20px) var(--door-prompt-clearance);
    background:
      radial-gradient(circle at 50% 44%, rgba(249, 189, 72, 0.24), rgba(8, 10, 25, 0.9) 55%, #02030a 84%),
      linear-gradient(180deg, #08111f 0%, #02030a 100%);
    color: #fff7d6;
  }

  .door-unlock-vignette {
    position: absolute;
    inset: -12%;
    background:
      radial-gradient(circle at 50% 48%, rgba(255, 221, 128, 0.16), transparent 34%),
      radial-gradient(circle at 50% 46%, transparent 0 34%, rgba(0, 0, 0, 0.6) 78%);
    opacity: 0;
    pointer-events: none;
  }

  .door-unlock-overlay-ready .door-unlock-vignette,
  .door-unlock-overlay-opening .door-unlock-vignette {
    animation: doorUnlockVignette 1800ms ease forwards;
  }

  .door-unlock-stage {
    position: relative;
    align-self: end;
    width: min(82vw, 760px);
    max-height: 53vh;
    aspect-ratio: var(--door-frame-aspect);
    overflow: hidden;
    opacity: 0;
    transform: scale(0.94) translateY(10px);
    filter: drop-shadow(0 24px 34px rgba(0, 0, 0, 0.58));
  }

  .door-unlock-stage-ready {
    opacity: 1;
    animation: doorUnlockStageReady 420ms cubic-bezier(0.18, 0.82, 0.24, 1) forwards;
  }

  .door-unlock-stage-opening {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: drop-shadow(0 24px 34px rgba(0, 0, 0, 0.58));
  }

  .door-unlock-frame {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
    pointer-events: none;
    user-select: none;
    image-rendering: pixelated;
  }

  .door-unlock-stage-loading {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: #ffe4ad;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .door-unlock-preload {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
  }

  .door-unlock-prompt {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    width: 100vw;
    height: var(--door-prompt-max-height);
    max-width: none;
    max-height: none;
    opacity: 0;
    filter: drop-shadow(0 18px 24px rgba(0, 0, 0, 0.56));
    pointer-events: none;
  }

  .door-unlock-overlay-ready .door-unlock-prompt,
  .door-unlock-overlay-opening .door-unlock-prompt {
    animation: doorUnlockPromptReady 420ms ease forwards;
  }

  .door-unlock-overlay-opening .door-unlock-prompt {
    opacity: 0.92;
  }

  .door-unlock-prompt-frame {
    position: relative;
    max-width: min(96vw, 1672px);
    max-height: var(--door-prompt-max-height);
    pointer-events: auto;
  }

  .door-unlock-prompt-image {
    display: block;
    width: auto;
    height: auto;
    max-width: min(96vw, 1672px);
    max-height: var(--door-prompt-max-height);
    object-fit: contain;
    image-rendering: pixelated;
    user-select: none;
    pointer-events: none;
  }

  .door-unlock-prompt-button {
    position: absolute;
    border: 0;
    background: transparent;
    color: transparent;
    cursor: pointer;
    overflow: hidden;
    padding: 0;
  }

  .door-unlock-prompt-button:disabled {
    cursor: wait;
  }

  .door-unlock-prompt-button:focus-visible {
    outline: 4px solid rgba(103, 232, 249, 0.88);
    outline-offset: 2px;
  }

  .door-unlock-prompt-enter {
    left: 34.2%;
    top: 80.5%;
    width: 38.6%;
    height: 13.6%;
  }

  .door-unlock-prompt-cancel {
    left: 73.8%;
    top: 80.5%;
    width: 20.4%;
    height: 13.6%;
  }

  @keyframes doorUnlockVignette {
    0% { opacity: 0; transform: scale(0.96); }
    30% { opacity: 1; }
    100% { opacity: 0.84; transform: scale(1.04); }
  }

  @keyframes doorUnlockStageReady {
    0% { transform: scale(0.94) translateY(10px); }
    100% { transform: scale(1) translateY(0); opacity: 1; }
  }

  @keyframes doorUnlockPromptReady {
    0% { opacity: 0; transform: translateY(12px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 640px) {
    .door-unlock-overlay {
      --door-prompt-clearance: clamp(180px, 37vh, 360px);
      --door-prompt-max-height: min(46vh, 520px);
      padding: 12px 6px 4px;
      padding-bottom: var(--door-prompt-clearance);
      gap: 6px;
    }

    .door-unlock-stage {
      width: min(96vw, 540px);
      max-height: 49vh;
    }

    .door-unlock-prompt {
      width: 100vw;
      max-height: none;
    }

    .door-unlock-prompt-frame,
    .door-unlock-prompt-image {
      max-height: var(--door-prompt-max-height);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .door-unlock-overlay-ready .door-unlock-vignette,
    .door-unlock-overlay-opening .door-unlock-vignette,
    .door-unlock-stage-ready,
    .door-unlock-stage-opening,
    .door-unlock-overlay-ready .door-unlock-prompt,
    .door-unlock-overlay-opening .door-unlock-prompt {
      animation-duration: 260ms;
      animation-delay: 0ms;
    }
  }
`;

const DoorUnlockAnimation = ({ assets, roomName, onCancel, onComplete, onOpenStart }: DoorUnlockAnimationProps) => {
  const requiredAssetCount = assets.frames.length + 1;
  const [settledAssetCount, setSettledAssetCount] = useState(0);
  const [isOpening, setIsOpening] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const hasCompletedRef = useRef(false);
  const animationIntervalRef = useRef<number | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const isReady = settledAssetCount >= requiredAssetCount;
  const finalFrameIndex = Math.max(0, assets.frames.length - 1);
  const activeFrame = assets.frames[Math.min(frameIndex, finalFrameIndex)] || assets.frames[0];

  const stageStyle = useMemo<CSSProperties & Record<`--${string}`, string>>(() => ({
    aspectRatio: `${assets.frameWidth} / ${assets.frameHeight}`,
    '--door-frame-aspect': `${assets.frameWidth} / ${assets.frameHeight}`,
  }), [assets.frameHeight, assets.frameWidth]);

  const clearDoorAnimation = useCallback(() => {
    if (animationIntervalRef.current !== null) {
      window.clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }

    if (completionTimerRef.current !== null) {
      window.clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
  }, []);

  const complete = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    clearDoorAnimation();
    onComplete();
  }, [clearDoorAnimation, onComplete]);

  const cancel = useCallback(() => {
    if (isOpening || hasCompletedRef.current) return;
    clearDoorAnimation();
    onCancel();
  }, [clearDoorAnimation, isOpening, onCancel]);

  const startOpening = useCallback(() => {
    if (!isReady || isOpening || hasCompletedRef.current) return;

    clearDoorAnimation();
    onOpenStart?.();
    setIsOpening(true);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setFrameIndex(finalFrameIndex);
      completionTimerRef.current = window.setTimeout(complete, REDUCED_MOTION_DURATION_MS);
      return;
    }

    let nextFrameIndex = 0;
    setFrameIndex(nextFrameIndex);

    animationIntervalRef.current = window.setInterval(() => {
      nextFrameIndex += 1;
      setFrameIndex(Math.min(nextFrameIndex, finalFrameIndex));

      if (nextFrameIndex >= finalFrameIndex) {
        if (animationIntervalRef.current !== null) {
          window.clearInterval(animationIntervalRef.current);
          animationIntervalRef.current = null;
        }

        completionTimerRef.current = window.setTimeout(complete, DOOR_UNLOCK_OPEN_HOLD_MS);
      }
    }, DOOR_UNLOCK_FRAME_DURATION_MS);
  }, [clearDoorAnimation, complete, finalFrameIndex, isOpening, isReady, onOpenStart]);

  const handleAssetSettled = useCallback(() => {
    setSettledAssetCount((currentCount) => Math.min(requiredAssetCount, currentCount + 1));
  }, [requiredAssetCount]);

  useEffect(() => () => {
    clearDoorAnimation();
  }, [clearDoorAnimation]);

  useEffect(() => {
    if (isReady) return undefined;

    const loadingFallback = window.setTimeout(() => {
      setSettledAssetCount(requiredAssetCount);
    }, 1400);

    return () => window.clearTimeout(loadingFallback);
  }, [isReady, requiredAssetCount]);

  return (
    <div
      className={`door-unlock-overlay ${isReady ? 'door-unlock-overlay-ready' : ''} ${isOpening ? 'door-unlock-overlay-opening' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${roomName} opening`}
    >
      <style>{DOOR_UNLOCK_STYLES}</style>
      <div className="door-unlock-vignette" aria-hidden="true" />
      <div className="door-unlock-preload" aria-hidden="true">
        {assets.frames.map((frameSrc) => (
          <img key={frameSrc} src={frameSrc} alt="" onLoad={handleAssetSettled} onError={handleAssetSettled} draggable={false} />
        ))}
        <img src={assets.prompt} alt="" onLoad={handleAssetSettled} onError={handleAssetSettled} draggable={false} />
      </div>
      <div
        className={`door-unlock-stage ${isReady ? 'door-unlock-stage-ready' : ''} ${isOpening ? 'door-unlock-stage-opening' : ''}`}
        role="img"
        aria-label={`${roomName} doorway opening`}
        style={stageStyle}
      >
        {activeFrame ? (
          <img
            key={activeFrame}
            className="door-unlock-frame"
            src={activeFrame}
            alt=""
            draggable={false}
          />
        ) : (
          <div className="door-unlock-stage-loading">Loading</div>
        )}
      </div>
      <div className="door-unlock-prompt">
        <div className="door-unlock-prompt-frame">
          <img className="door-unlock-prompt-image" src={assets.prompt} alt="" draggable={false} />
          <button
            type="button"
            className="door-unlock-prompt-button door-unlock-prompt-enter"
            aria-label={`Enter ${roomName}`}
            disabled={!isReady || isOpening}
            onClick={startOpening}
          >
            Enter {roomName}
          </button>
          <button
            type="button"
            className="door-unlock-prompt-button door-unlock-prompt-cancel"
            aria-label={`Not yet, stay outside ${roomName}`}
            disabled={isOpening}
            onClick={cancel}
          >
            Not Yet
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoorUnlockAnimation;
