import React from 'react';
import { markAssetPreloaded } from '../utils/assetPreloader';

interface AvatarLayeredPreviewProps {
  imageUrls: string[];
  alt: string;
  className?: string;
  imageClassName?: string;
}

const AvatarLayeredPreview: React.FC<AvatarLayeredPreviewProps> = ({
  imageUrls,
  alt,
  className = '',
  imageClassName = '',
}) => {
  const [baseImageUrl, ...layerImageUrls] = imageUrls;
  if (!baseImageUrl) return null;

  const handleImageSettled = (imageUrl: string) => {
    markAssetPreloaded({ type: 'image', src: imageUrl });
  };

  return (
    <span className={`relative inline-flex items-center justify-center ${className}`}>
      <img
        src={baseImageUrl}
        alt={alt}
        className={`h-full w-full object-contain ${imageClassName}`}
        style={{ imageRendering: 'pixelated' }}
        onLoad={() => handleImageSettled(baseImageUrl)}
        onError={() => handleImageSettled(baseImageUrl)}
      />
      {layerImageUrls.map((imageUrl) => (
        <img
          key={imageUrl}
          src={imageUrl}
          alt=""
          className={`pointer-events-none absolute inset-0 h-full w-full object-contain ${imageClassName}`}
          style={{ imageRendering: 'pixelated' }}
          aria-hidden="true"
          onLoad={() => handleImageSettled(imageUrl)}
          onError={() => handleImageSettled(imageUrl)}
        />
      ))}
    </span>
  );
};

export default AvatarLayeredPreview;
