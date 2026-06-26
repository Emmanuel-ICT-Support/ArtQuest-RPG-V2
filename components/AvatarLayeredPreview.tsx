import React from 'react';

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

  return (
    <span className={`relative inline-flex items-center justify-center ${className}`}>
      <img
        src={baseImageUrl}
        alt={alt}
        className={`h-full w-full object-contain ${imageClassName}`}
        style={{ imageRendering: 'pixelated' }}
      />
      {layerImageUrls.map((imageUrl) => (
        <img
          key={imageUrl}
          src={imageUrl}
          alt=""
          className={`pointer-events-none absolute inset-0 h-full w-full object-contain ${imageClassName}`}
          style={{ imageRendering: 'pixelated' }}
          aria-hidden="true"
        />
      ))}
    </span>
  );
};

export default AvatarLayeredPreview;
