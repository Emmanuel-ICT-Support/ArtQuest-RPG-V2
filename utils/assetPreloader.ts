export type PreloadAssetType = 'image' | 'audio';

export interface PreloadAsset {
  type: PreloadAssetType;
  src: string | null | undefined;
}

export interface PreloadOptions {
  timeoutMs?: number;
  minimumMs?: number;
}

const imageLoadCache = new Map<string, Promise<void>>();
const audioLoadCache = new Map<string, Promise<void>>();
const WARM_ASSET_CONCURRENCY = 2;

type IdleCallbackWindow = Window & typeof globalThis & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
};

const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

const withTimeout = (promise: Promise<void>, timeoutMs: number): Promise<void> => (
  Promise.race([promise, wait(timeoutMs)])
);

const normalizeAssetSrc = (src: string | null | undefined): string | null => {
  const trimmed = src?.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;
  return trimmed;
};

const preloadImage = (src: string): Promise<void> => {
  const cached = imageLoadCache.get(src);
  if (cached) return cached;

  const request = new Promise<void>((resolve) => {
    const image = new Image();
    image.decoding = 'async';

    image.onload = () => {
      if (typeof image.decode === 'function') {
        image.decode().catch(() => undefined).finally(resolve);
        return;
      }

      resolve();
    };

    image.onerror = () => resolve();
    image.src = src;
  });

  imageLoadCache.set(src, request);
  return request;
};

const preloadAudio = (src: string): Promise<void> => {
  const cached = audioLoadCache.get(src);
  if (cached) return cached;

  const request = new Promise<void>((resolve) => {
    const audio = new Audio();

    function cleanup() {
      audio.removeEventListener('canplaythrough', done);
      audio.removeEventListener('loadeddata', done);
      audio.removeEventListener('error', done);
    }

    function done() {
      cleanup();
      resolve();
    }

    audio.preload = 'auto';
    audio.addEventListener('canplaythrough', done, { once: true });
    audio.addEventListener('loadeddata', done, { once: true });
    audio.addEventListener('error', done, { once: true });
    audio.src = src;
    audio.load();
  });

  audioLoadCache.set(src, request);
  return request;
};

const preloadOneAsset = (asset: PreloadAsset): Promise<void> => {
  const src = normalizeAssetSrc(asset.src);
  if (!src) return Promise.resolve();

  return asset.type === 'audio' ? preloadAudio(src) : preloadImage(src);
};

export const preloadAssets = async (
  assets: PreloadAsset[],
  options: PreloadOptions = {},
): Promise<void> => {
  const timeoutMs = options.timeoutMs ?? 3500;
  const minimumMs = options.minimumMs ?? 0;
  const startedAt = Date.now();
  const uniqueAssets: PreloadAsset[] = [];
  const seenAssets = new Set<string>();

  assets.forEach((asset) => {
    const src = normalizeAssetSrc(asset.src);
    if (!src) return;

    const key = `${asset.type}:${src}`;
    if (seenAssets.has(key)) return;

    seenAssets.add(key);
    uniqueAssets.push({ ...asset, src });
  });

  await Promise.allSettled(
    uniqueAssets.map((asset) => withTimeout(preloadOneAsset(asset), timeoutMs)),
  );

  const remainingMinimumMs = minimumMs - (Date.now() - startedAt);
  if (remainingMinimumMs > 0) {
    await wait(remainingMinimumMs);
  }
};

export const warmAssets = (assets: PreloadAsset[]): void => {
  const beginWarming = () => {
    const uniqueAssets: PreloadAsset[] = [];
    const seenAssets = new Set<string>();

    assets.forEach((asset) => {
      const src = normalizeAssetSrc(asset.src);
      if (!src) return;

      const key = `${asset.type}:${src}`;
      if (seenAssets.has(key)) return;

      seenAssets.add(key);
      uniqueAssets.push({ ...asset, src });
    });

    let nextAssetIndex = 0;
    const warmNextAsset = async (): Promise<void> => {
      while (nextAssetIndex < uniqueAssets.length) {
        const asset = uniqueAssets[nextAssetIndex];
        nextAssetIndex += 1;
        await withTimeout(preloadOneAsset(asset), 3500);
      }
    };

    // Speculative downloads must not saturate the connection or compete with a
    // player action. Critical transition preloads above remain parallel; only
    // background warming is kept intentionally small and steady.
    for (let worker = 0; worker < Math.min(WARM_ASSET_CONCURRENCY, uniqueAssets.length); worker += 1) {
      void warmNextAsset();
    }
  };

  // Warming is only an optimisation. Starting it after the current screen has
  // painted keeps speculative room downloads and image decoding off the critical
  // path, while the transition preloader still guarantees required assets.
  const idleWindow = window as IdleCallbackWindow;
  if (typeof idleWindow.requestIdleCallback === 'function') {
    idleWindow.requestIdleCallback(beginWarming, { timeout: 1000 });
    return;
  }

  window.setTimeout(beginWarming, 120);
};

export const waitForMinimum = wait;
