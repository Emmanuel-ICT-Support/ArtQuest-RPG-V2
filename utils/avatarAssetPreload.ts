import type { AvatarAssetTabId, AvatarBuilderConfig } from '../types';
import {
  getAvatarAssetPreviewImageUrls,
  getAvatarLayerImageUrls,
} from '../data/AvatarRewards';
import type { PreloadAsset } from './assetPreloader';

export const avatarPreloadImage = (src: string | null | undefined): PreloadAsset => ({
  type: 'image',
  src,
});

export const getAvatarLayerPreloadAssets = (avatarBuild: AvatarBuilderConfig): PreloadAsset[] => (
  getAvatarLayerImageUrls(avatarBuild).map(avatarPreloadImage)
);

export const getAvatarTabPreviewPreloadAssets = (
  avatarBuild: AvatarBuilderConfig,
  tabId: AvatarAssetTabId,
  optionIds: string[],
): PreloadAsset[] => (
  optionIds.flatMap((optionId) => (
    getAvatarAssetPreviewImageUrls(avatarBuild, tabId, optionId).map(avatarPreloadImage)
  ))
);
