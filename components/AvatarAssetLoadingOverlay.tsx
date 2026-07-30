import React from 'react';

interface AvatarAssetLoadingOverlayProps {
  label: string;
}

const AvatarAssetLoadingOverlay: React.FC<AvatarAssetLoadingOverlayProps> = ({ label }) => (
  <div
    className="absolute inset-0 z-30 grid place-items-center bg-[#050914]/82 p-2 text-center backdrop-blur-[1px]"
    role="status"
    aria-live="polite"
    aria-label={label}
  >
    <div className="flex max-w-[12rem] items-center justify-center gap-2 rounded-md border border-cyan-200/45 bg-[#111a2e]/95 px-2.5 py-2 text-[10px] font-black uppercase leading-tight text-cyan-100 shadow-[0_4px_16px_rgba(0,0,0,0.45)]">
      <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-cyan-100/30 border-t-amber-200" aria-hidden="true" />
      <span>{label}</span>
    </div>
  </div>
);

export default AvatarAssetLoadingOverlay;
