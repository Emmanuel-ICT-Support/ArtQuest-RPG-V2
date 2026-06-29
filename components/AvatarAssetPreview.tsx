import React from 'react';
import type { AvatarAssetTabId } from '../types';
import { AVATAR_ASSET_BOUNDS_BY_URL } from '../data/AvatarAssetBounds.generated';
import { publicAssetLookupKey } from '../utils/publicAssets';

const assetPreviewCx = (...classes: Array<string | false | null | undefined>): string => (
  classes.filter(Boolean).join(' ')
);

const ASSET_PREVIEW_LONG_FILL: Record<AvatarAssetTabId, number> = {
  skinToneId: 0.9,
  hairStyleId: 0.94,
  faceId: 0.94,
  outfitId: 0.92,
  heldObjectId: 0.94,
  accessoryId: 0.94,
};

interface AvatarAssetPreviewProps {
  imageUrls: string[];
  tabId: AvatarAssetTabId;
  label: string;
  className?: string;
}

interface AvatarAssetBounds {
  naturalWidth: number;
  naturalHeight: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

const combineAssetBounds = (bounds: AvatarAssetBounds[]): AvatarAssetBounds | null => {
  if (bounds.length === 0) return null;
  const naturalWidth = Math.max(...bounds.map(bound => bound.naturalWidth));
  const naturalHeight = Math.max(...bounds.map(bound => bound.naturalHeight));
  const minX = Math.min(...bounds.map(bound => bound.left));
  const minY = Math.min(...bounds.map(bound => bound.top));
  const maxX = Math.max(...bounds.map(bound => bound.left + bound.width));
  const maxY = Math.max(...bounds.map(bound => bound.top + bound.height));

  return {
    naturalWidth,
    naturalHeight,
    left: minX,
    top: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

const getAssetFitStyle = (
  bounds: AvatarAssetBounds,
  tabId: AvatarAssetTabId,
): React.CSSProperties => {
  const safeBoundsWidth = Math.max(1, bounds.width);
  const safeBoundsHeight = Math.max(1, bounds.height);
  const longFill = ASSET_PREVIEW_LONG_FILL[tabId];
  const visibleAspect = safeBoundsWidth / safeBoundsHeight;
  const targetWidth = visibleAspect >= 1
    ? longFill
    : visibleAspect * longFill;
  const targetHeight = visibleAspect >= 1
    ? (1 / visibleAspect) * longFill
    : longFill;
  const widthPercent = (bounds.naturalWidth / safeBoundsWidth) * targetWidth * 100;
  const heightPercent = (bounds.naturalHeight / safeBoundsHeight) * targetHeight * 100;
  const centerX = bounds.left + (bounds.width / 2);
  const centerY = bounds.top + (bounds.height / 2);

  return {
    left: `${50 - ((centerX / bounds.naturalWidth) * widthPercent)}%`,
    top: `${50 - ((centerY / bounds.naturalHeight) * heightPercent)}%`,
    width: `${widthPercent}%`,
    height: `${heightPercent}%`,
    imageRendering: 'pixelated',
  };
};

const normalizeAssetUrl = (imageUrl: string): string => {
  try {
    return decodeURI(imageUrl);
  } catch {
    return imageUrl;
  }
};

const getBoundsForImageUrl = (imageUrl: string): AvatarAssetBounds | null => (
  AVATAR_ASSET_BOUNDS_BY_URL[imageUrl]
    || AVATAR_ASSET_BOUNDS_BY_URL[normalizeAssetUrl(imageUrl)]
    || AVATAR_ASSET_BOUNDS_BY_URL[publicAssetLookupKey(imageUrl)]
    || null
);

const getCombinedBoundsForImageUrls = (imageUrls: string[]): AvatarAssetBounds | null => (
  combineAssetBounds(
    imageUrls
      .map(getBoundsForImageUrl)
      .filter((bounds): bounds is AvatarAssetBounds => !!bounds),
  )
);

const AssetPreviewFrame: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <span
    className={assetPreviewCx(
      'relative inline-flex items-center justify-center overflow-hidden rounded-md border border-cyan-100/20 bg-[radial-gradient(circle,rgba(226,232,240,0.24),rgba(30,41,59,0.56)_62%,rgba(3,7,18,0.86))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]',
      className,
    )}
  >
    {children}
  </span>
);

const AvatarAssetPreview: React.FC<AvatarAssetPreviewProps> = ({
  imageUrls,
  tabId,
  label,
  className,
}) => {
  if (imageUrls.length === 0) {
    return (
      <span
        className={assetPreviewCx(
          'flex items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-500/45 bg-[#030817]/80 px-1 text-center font-serif text-[10px] font-black uppercase leading-tight text-slate-300',
          className,
        )}
      >
        {label}
      </span>
    );
  }

  const combinedBounds = getCombinedBoundsForImageUrls(imageUrls);

  if (!combinedBounds) {
    return (
      <AssetPreviewFrame className={className}>
        {imageUrls.map(imageUrl => (
          <img
            key={imageUrl}
            src={imageUrl}
            alt=""
            className="pointer-events-none absolute h-full w-full max-h-none max-w-none object-contain"
            style={{ imageRendering: 'pixelated' }}
            draggable={false}
            aria-hidden="true"
          />
        ))}
      </AssetPreviewFrame>
    );
  }

  const fitStyle = getAssetFitStyle(combinedBounds, tabId);

  return (
    <AssetPreviewFrame className={className}>
      {imageUrls.map(imageUrl => (
        <img
          key={imageUrl}
          src={imageUrl}
          alt=""
          className="pointer-events-none absolute max-h-none max-w-none object-fill"
          style={fitStyle}
          draggable={false}
          aria-hidden="true"
        />
      ))}
    </AssetPreviewFrame>
  );
};

export default AvatarAssetPreview;
