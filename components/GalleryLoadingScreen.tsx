import React from 'react';

export type GalleryLoadingTone = 'foyer' | 'gallery' | 'analysis' | 'return' | 'panel';

export interface GalleryLoadingScreenProps {
  title: string;
  message: string;
  detail?: string;
  tone?: GalleryLoadingTone;
  compact?: boolean;
}

const LOADING_STEPS = [
  'Lighting frames',
  'Sorting clues',
  'Warming paint',
];

const GALLERY_LOADING_STYLES = `
@keyframes artquest-loader-sweep {
  0% { transform: translateX(-44%); }
  100% { transform: translateX(144%); }
}

@keyframes artquest-loader-float {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50% { transform: translateY(-9px) rotate(3deg); }
}

@keyframes artquest-loader-pulse {
  0%, 100% { opacity: 0.42; transform: scale(0.86); }
  50% { opacity: 1; transform: scale(1); }
}

.artquest-loading-shell {
  background:
    linear-gradient(180deg, rgba(3, 7, 18, 0.94), rgba(10, 10, 28, 0.97)),
    repeating-linear-gradient(90deg, rgba(103, 232, 249, 0.08) 0 1px, transparent 1px 28px),
    repeating-linear-gradient(0deg, rgba(251, 191, 36, 0.06) 0 1px, transparent 1px 30px);
}

.artquest-loading-card {
  border: 2px solid rgba(250, 204, 21, 0.82);
  background:
    linear-gradient(180deg, rgba(18, 24, 48, 0.96), rgba(8, 13, 30, 0.98));
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.12),
    inset 0 0 40px rgba(236, 72, 153, 0.12),
    0 24px 70px rgba(0, 0, 0, 0.5);
}

.artquest-loading-card::before {
  content: "";
  position: absolute;
  inset: 7px;
  border: 1px solid rgba(103, 232, 249, 0.28);
  pointer-events: none;
}

.artquest-loading-sigil {
  animation: artquest-loader-float 2.4s ease-in-out infinite;
}

.artquest-loading-track::after {
  animation: artquest-loader-sweep 1.25s ease-in-out infinite;
}

.artquest-loading-dot {
  animation: artquest-loader-pulse 1.1s ease-in-out infinite;
}
`;

const toneClasses: Record<GalleryLoadingTone, string> = {
  foyer: 'from-amber-200 via-pink-300 to-cyan-200',
  gallery: 'from-cyan-200 via-emerald-200 to-amber-200',
  analysis: 'from-pink-200 via-violet-200 to-cyan-200',
  return: 'from-emerald-200 via-cyan-200 to-amber-200',
  panel: 'from-amber-100 via-purple-200 to-pink-200',
};

const GalleryLoadingScreen: React.FC<GalleryLoadingScreenProps> = ({
  title,
  message,
  detail,
  tone = 'gallery',
  compact = false,
}) => (
  <div
    className="artquest-loading-shell fixed inset-0 z-[120] flex items-center justify-center p-4 text-slate-100"
    role="status"
    aria-live="polite"
    aria-label={`${title}. ${message}`}
  >
    <style>{GALLERY_LOADING_STYLES}</style>
    <div className={`artquest-loading-card relative w-full overflow-hidden rounded-md px-5 py-6 text-center ${compact ? 'max-w-md' : 'max-w-xl sm:px-8 sm:py-8'}`}>
      <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
        <div className="absolute left-[12%] top-[18%] h-20 w-20 rotate-45 border border-cyan-200/25" />
        <div className="absolute right-[10%] top-[14%] h-16 w-16 border border-amber-200/25" />
        <div className="absolute bottom-[14%] left-[18%] h-12 w-24 -rotate-12 border border-pink-200/20" />
      </div>

      <div className="relative z-10 mx-auto mb-4 flex h-20 w-20 items-center justify-center">
        <div className={`absolute inset-0 rounded-md bg-gradient-to-br ${toneClasses[tone]} opacity-20`} />
        <div className="artquest-loading-sigil relative grid h-14 w-14 place-items-center rounded-md border-2 border-amber-200 bg-[#10162b] shadow-[0_8px_0_rgba(0,0,0,0.35)]">
          <div className="h-8 w-8 rotate-45 border-4 border-cyan-200 bg-pink-400/30" aria-hidden="true" />
          <div className="absolute h-3 w-3 rounded-full bg-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.9)]" aria-hidden="true" />
        </div>
      </div>

      <p className="relative z-10 text-xs font-black uppercase tracking-normal text-cyan-200">ArtQuest transit</p>
      <h2 className={`relative z-10 mt-1 font-serif font-black uppercase tracking-normal text-transparent bg-clip-text bg-gradient-to-r ${toneClasses[tone]} ${compact ? 'text-2xl' : 'text-3xl sm:text-4xl'}`}>
        {title}
      </h2>
      <p className="relative z-10 mx-auto mt-3 max-w-md text-base font-bold leading-relaxed text-slate-100">
        {message}
      </p>
      {detail && (
        <p className="relative z-10 mx-auto mt-2 max-w-md text-sm font-semibold text-amber-100/90">
          {detail}
        </p>
      )}

      <div className="artquest-loading-track relative z-10 mt-5 h-3 overflow-hidden rounded-sm border border-cyan-200/45 bg-slate-950/80">
        <div className={`absolute inset-y-0 left-0 w-1/2 rounded-sm bg-gradient-to-r ${toneClasses[tone]}`} />
        <div className="absolute inset-y-0 left-0 w-1/3 bg-white/25 blur-sm" />
      </div>

      {!compact && (
        <div className="relative z-10 mt-4 grid gap-2 text-[11px] font-black uppercase tracking-normal text-slate-200 sm:grid-cols-3">
          {LOADING_STEPS.map((step, index) => (
            <div key={step} className="flex items-center justify-center gap-2 rounded-sm border border-slate-500/50 bg-slate-950/45 px-2 py-2">
              <span
                className="artquest-loading-dot h-2.5 w-2.5 rounded-full bg-cyan-200"
                style={{ animationDelay: `${index * 0.16}s` }}
                aria-hidden="true"
              />
              <span className="truncate">{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default GalleryLoadingScreen;
