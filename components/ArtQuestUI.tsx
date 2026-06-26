import React from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import type { PlayerAvatar, PlayerStats } from '../types';
import { getAvatarBuildForAvatar, getAvatarLayerImageUrls } from '../data/AvatarRewards';
import { getAssessmentDisplayLabel } from '../data/SCSACurriculum';
import AvatarLayeredPreview from './AvatarLayeredPreview';

export const artQuestCx = (...classes: Array<string | false | null | undefined>): string => (
  classes.filter(Boolean).join(' ')
);

const GOLD_TEXT_CLASS = 'text-transparent bg-clip-text bg-gradient-to-b from-[#fff2bc] via-[#f3bd47] to-[#c97921]';
const PANEL_SURFACE_CLASS = 'border border-[#a66c2b]/75 bg-[#061125]/92 shadow-[inset_0_0_0_1px_rgba(255,236,176,0.08),inset_0_0_34px_rgba(105,46,150,0.12),0_12px_28px_rgba(0,0,0,0.36)]';
const INNER_PANEL_CLASS = 'border border-[#7f5524]/70 bg-[#08162e]/88 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]';

interface ArtQuestPageProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  selectedAvatar?: PlayerAvatar | null;
  playerStats?: PlayerStats | null;
  onReturnToMap?: () => void;
  returnLabel?: string;
  className?: string;
  contentClassName?: string;
  footerText?: string;
  headerAddon?: ReactNode;
  showPlayerPanel?: boolean;
}

export const ArtQuestPage: React.FC<ArtQuestPageProps> = ({
  title,
  subtitle,
  children,
  selectedAvatar,
  playerStats,
  onReturnToMap,
  returnLabel = 'Return to Map',
  className,
  contentClassName,
  footerText = 'Creativity is the compass. Curiosity is your guide. Keep creating.',
  headerAddon,
  showPlayerPanel = true,
}) => (
  <div
    className={artQuestCx(
      'relative min-h-screen overflow-y-auto bg-[#030711] p-3 text-[#f8ead1] sm:p-4 lg:p-5',
      className,
    )}
  >
    <div
      className="pointer-events-none fixed inset-0"
      style={{
        backgroundImage: [
          'radial-gradient(circle at 50% -8%, rgba(124, 58, 237, 0.28), transparent 31rem)',
          'radial-gradient(circle at 12% 16%, rgba(14, 165, 233, 0.12), transparent 22rem)',
          'radial-gradient(circle at 88% 62%, rgba(217, 70, 239, 0.12), transparent 25rem)',
          'linear-gradient(180deg, rgba(3, 9, 22, 0.98), rgba(2, 6, 18, 1))',
        ].join(', '),
      }}
      aria-hidden="true"
    />
    <div
      className="pointer-events-none fixed inset-0 opacity-50"
      style={{
        backgroundImage: [
          'radial-gradient(circle, rgba(255, 229, 157, 0.72) 0 1px, transparent 1.5px)',
          'radial-gradient(circle, rgba(208, 117, 255, 0.35) 0 1px, transparent 1.7px)',
          'linear-gradient(120deg, transparent 0 49%, rgba(155, 106, 255, 0.08) 50%, transparent 51% 100%)',
        ].join(', '),
        backgroundPosition: '12px 18px, 42px 54px, center',
        backgroundSize: '104px 104px, 152px 152px, 100% 100%',
      }}
      aria-hidden="true"
    />

    <div className="pointer-events-none fixed inset-2 border border-[#d38c2e]/80 shadow-[inset_0_0_0_2px_rgba(17,8,28,0.92),inset_0_0_0_4px_rgba(216,143,45,0.22)]" aria-hidden="true" />
    {['left-2 top-2', 'right-2 top-2', 'bottom-2 left-2', 'bottom-2 right-2'].map(position => (
      <span
        key={position}
        className={artQuestCx(
          'pointer-events-none fixed z-[1] h-8 w-8 rotate-45 border-2 border-[#dca247] bg-gradient-to-br from-[#f68aff] via-[#662c9d] to-[#120b28] shadow-[0_0_16px_rgba(217,70,239,0.5),inset_0_0_0_2px_rgba(0,0,0,0.42)]',
          position,
        )}
        aria-hidden="true"
      />
    ))}

    <div className="relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1560px] flex-col">
      <ArtQuestHeader
        title={title}
        subtitle={subtitle}
        selectedAvatar={selectedAvatar}
        playerStats={playerStats}
        onReturnToMap={onReturnToMap}
        returnLabel={returnLabel}
        showPlayerPanel={showPlayerPanel}
      />
      {headerAddon}
      <main className={artQuestCx('min-h-0 flex-1', contentClassName)}>
        {children}
      </main>
      {footerText && (
        <footer className="mt-3 flex items-center justify-center gap-3 border-t border-[#9b6728]/45 px-4 py-2 text-center font-serif text-sm italic text-[#e7c886]">
          <span aria-hidden="true">✦</span>
          <span>&quot;{footerText}&quot; - ArtQuest</span>
          <span aria-hidden="true">✦</span>
        </footer>
      )}
    </div>
  </div>
);

interface ArtQuestHeaderProps {
  title: string;
  subtitle?: string;
  selectedAvatar?: PlayerAvatar | null;
  playerStats?: PlayerStats | null;
  onReturnToMap?: () => void;
  returnLabel?: string;
  showPlayerPanel?: boolean;
}

export const ArtQuestHeader: React.FC<ArtQuestHeaderProps> = ({
  title,
  subtitle,
  selectedAvatar,
  playerStats,
  onReturnToMap,
  returnLabel = 'Return to Map',
  showPlayerPanel = true,
}) => (
  <header className="mb-4 grid items-start gap-3 lg:grid-cols-[minmax(210px,0.28fr)_minmax(0,1fr)_minmax(280px,0.32fr)]">
    <div className="flex min-h-20 items-center lg:justify-start">
      {onReturnToMap && (
        <ArtQuestReturnButton onClick={onReturnToMap}>
          {returnLabel}
        </ArtQuestReturnButton>
      )}
    </div>

    <div className="text-center">
      <div className="flex items-center justify-center gap-4">
        <span className="hidden h-px min-w-12 flex-1 bg-gradient-to-r from-transparent via-[#bf7c2c] to-[#f2c15c] sm:block" aria-hidden="true" />
        <span className="text-2xl text-[#f6c55b]" aria-hidden="true">✦</span>
        <h1 className={artQuestCx('font-serif text-4xl font-black uppercase leading-none drop-shadow-[0_4px_0_rgba(0,0,0,0.85)] sm:text-5xl xl:text-6xl', GOLD_TEXT_CLASS)}>
          {title}
        </h1>
        <span className="text-2xl text-[#f6c55b]" aria-hidden="true">✦</span>
        <span className="hidden h-px min-w-12 flex-1 bg-gradient-to-l from-transparent via-[#bf7c2c] to-[#f2c15c] sm:block" aria-hidden="true" />
      </div>
      {subtitle && (
        <p className="mt-1 font-serif text-lg text-[#ffe7b0] sm:text-xl">{subtitle}</p>
      )}
    </div>

    <div className="flex min-h-20 items-start justify-start lg:justify-end lg:pr-8 xl:pr-10 2xl:pr-12">
      {showPlayerPanel && <ArtQuestPlayerPanel selectedAvatar={selectedAvatar} playerStats={playerStats} />}
    </div>
  </header>
);

type ArtQuestReturnButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const ArtQuestReturnButton: React.FC<ArtQuestReturnButtonProps> = ({ className, children, ...props }) => (
  <button
    type="button"
    className={artQuestCx(
      'inline-flex min-h-12 items-center justify-center gap-2 border border-[#dba44a]/80 bg-gradient-to-b from-[#4b1a6f] via-[#321246] to-[#17091f] px-6 py-2 font-serif text-base font-black uppercase text-[#fff3bf] shadow-[0_5px_0_rgba(0,0,0,0.42),inset_0_0_0_1px_rgba(255,229,157,0.16)] transition hover:brightness-115 focus:outline-none focus:ring-2 focus:ring-[#ffd978] disabled:cursor-not-allowed disabled:grayscale disabled:opacity-60',
      className,
    )}
    style={{ clipPath: 'polygon(9% 0, 91% 0, 100% 50%, 91% 100%, 9% 100%, 0 50%)' }}
    {...props}
  >
    <span aria-hidden="true">←</span>
    <span>{children}</span>
  </button>
);

interface ArtQuestPlayerPanelProps {
  selectedAvatar?: PlayerAvatar | null;
  playerStats?: PlayerStats | null;
  className?: string;
}

export const ArtQuestPlayerPanel: React.FC<ArtQuestPlayerPanelProps> = ({
  selectedAvatar,
  playerStats,
  className,
}) => {
  const xp = playerStats?.artEnergy.currentXP || 0;
  const maxXp = playerStats?.artEnergy.maxXp || 600;
  const courseLabel = selectedAvatar
    ? getAssessmentDisplayLabel(selectedAvatar.selectedYearLevel, selectedAvatar.selectedCoursePathway)
    : 'Year';
  const avatarBuild = selectedAvatar?.id === 'custom' && selectedAvatar.avatarBuild
    ? getAvatarBuildForAvatar(selectedAvatar)
    : null;
  const avatarLayerImageUrls = avatarBuild ? getAvatarLayerImageUrls(avatarBuild) : [];
  const shouldUseLayeredAvatar = avatarLayerImageUrls.length > 1;
  const imageUrl = selectedAvatar?.imageUrl;

  return (
    <aside className={artQuestCx('w-full max-w-sm rounded-md border border-[#9a6328]/80 bg-[#071226]/90 p-2 shadow-[inset_0_0_0_1px_rgba(255,238,190,0.08),0_8px_22px_rgba(0,0,0,0.32)]', className)}>
      <div className="grid grid-cols-[58px_minmax(0,1fr)] gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-md border border-[#9a6328]/80 bg-[#0b1934]">
          {shouldUseLayeredAvatar ? (
            <AvatarLayeredPreview
              imageUrls={avatarLayerImageUrls}
              alt=""
              className="h-14 w-12"
            />
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="h-14 w-12 object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <span className="font-serif text-2xl font-black text-[#ffd978]">{selectedAvatar?.iconInitial || '?'}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-serif text-xl font-black text-[#ffe49a]">{selectedAvatar?.name || 'Artist'}</p>
              <p className="truncate text-xs text-[#f7d9ab]" title={selectedAvatar?.title}>{selectedAvatar?.title || 'ArtQuest Adventurer'}</p>
            </div>
            <p className="shrink-0 pt-1 text-xs font-black uppercase text-[#ffd45f]">{courseLabel}</p>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <ArtQuestProgressBar
              current={xp}
              max={maxXp}
              variant="gold"
              className="flex-1"
              ariaLabel="Player art energy"
            />
            <span className="shrink-0 text-xs font-black text-[#fff4d0]">{xp} / {maxXp} XP</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

interface ArtQuestPanelProps extends HTMLAttributes<HTMLElement> {
  as?: 'section' | 'article' | 'div' | 'aside';
  variant?: 'default' | 'inner' | 'selected' | 'danger' | 'success';
}

export const ArtQuestPanel: React.FC<ArtQuestPanelProps> = ({
  as = 'section',
  variant = 'default',
  className,
  children,
  ...props
}) => {
  const Component = as;
  const variantClass = {
    default: PANEL_SURFACE_CLASS,
    inner: INNER_PANEL_CLASS,
    selected: 'border border-[#f287ff]/80 bg-[#24113b]/88 shadow-[0_0_22px_rgba(217,70,239,0.24),inset_0_0_0_1px_rgba(255,255,255,0.08)]',
    danger: 'border border-[#fb7185]/75 bg-[#2a0d1a]/88 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]',
    success: 'border border-[#65d976]/75 bg-[#082316]/88 shadow-[0_0_20px_rgba(34,197,94,0.16),inset_0_0_0_1px_rgba(255,255,255,0.06)]',
  }[variant];

  return (
    <Component
      className={artQuestCx('relative rounded-md p-4', variantClass, className)}
      {...props}
    >
      {children}
    </Component>
  );
};

interface ArtQuestSectionTitleProps {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center';
}

export const ArtQuestSectionTitle: React.FC<ArtQuestSectionTitleProps> = ({
  children,
  className,
  align = 'left',
}) => (
  <div className={artQuestCx('mb-3 flex items-center gap-2', align === 'center' && 'justify-center text-center', className)}>
    <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#d59b3c]" aria-hidden="true" />
    <span className="h-2 w-2 rotate-45 border border-[#ffd978] bg-[#772aa8] shadow-[0_0_8px_rgba(217,70,239,0.5)]" aria-hidden="true" />
    <h2 className="font-serif text-xl font-black uppercase text-[#ffd45f] drop-shadow-[0_2px_0_rgba(0,0,0,0.8)]">{children}</h2>
    <span className="h-2 w-2 rotate-45 border border-[#ffd978] bg-[#772aa8] shadow-[0_0_8px_rgba(217,70,239,0.5)]" aria-hidden="true" />
    <span className="h-px flex-1 bg-gradient-to-r from-[#d59b3c] to-transparent" aria-hidden="true" />
  </div>
);

interface ArtQuestButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'purple' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const ArtQuestButton: React.FC<ArtQuestButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const variantClass = {
    primary: 'border-[#86efac]/70 bg-gradient-to-b from-[#179a5a] via-[#0b7541] to-[#064e2b] text-[#fff7d8] hover:brightness-115 focus:ring-[#86efac]',
    secondary: 'border-[#78b7ff]/70 bg-gradient-to-b from-[#2653b8] via-[#17377c] to-[#0b1b43] text-[#eff8ff] hover:brightness-115 focus:ring-[#93c5fd]',
    purple: 'border-[#f0abfc]/70 bg-gradient-to-b from-[#8a2fc7] via-[#5a1b87] to-[#260d45] text-[#fff2ff] hover:brightness-115 focus:ring-[#f0abfc]',
    danger: 'border-[#fca5a5]/70 bg-gradient-to-b from-[#b91c1c] via-[#7f1d1d] to-[#450a0a] text-[#fff1f2] hover:brightness-115 focus:ring-[#fca5a5]',
    ghost: 'border-[#9a6328]/70 bg-[#08162e]/80 text-[#ffe8ad] hover:border-[#f2c15c] hover:bg-[#102245] focus:ring-[#ffd978]',
  }[variant];
  const sizeClass = {
    sm: 'min-h-9 px-3 py-1.5 text-xs',
    md: 'min-h-10 px-4 py-2 text-sm',
    lg: 'min-h-12 px-6 py-2.5 text-base',
  }[size];

  return (
    <button
      type="button"
      className={artQuestCx(
        'inline-flex items-center justify-center gap-2 rounded-md border font-serif font-black uppercase shadow-[0_4px_0_rgba(0,0,0,0.36),inset_0_0_0_1px_rgba(255,255,255,0.12)] transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:grayscale disabled:opacity-60',
        variantClass,
        sizeClass,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

interface ArtQuestProgressBarProps {
  current: number;
  max: number;
  className?: string;
  barClassName?: string;
  variant?: 'gold' | 'purple' | 'green' | 'cyan';
  ariaLabel?: string;
}

export const ArtQuestProgressBar: React.FC<ArtQuestProgressBarProps> = ({
  current,
  max,
  className,
  barClassName,
  variant = 'purple',
  ariaLabel,
}) => {
  const safeMax = Math.max(1, max);
  const percentage = Math.max(0, Math.min(100, (current / safeMax) * 100));
  const variantClass = {
    gold: 'from-[#f8d76c] via-[#f0a92f] to-[#b66d19]',
    purple: 'from-[#f0abfc] via-[#d946ef] to-[#7e22ce]',
    green: 'from-[#86efac] via-[#22c55e] to-[#047857]',
    cyan: 'from-[#a5f3fc] via-[#22d3ee] to-[#0e7490]',
  }[variant];

  return (
    <div
      className={artQuestCx('h-3 rounded-sm border border-[#9a6328]/75 bg-[#030817] p-0.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.55)]', className)}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={Math.round(current)}
      aria-valuemin={0}
      aria-valuemax={safeMax}
    >
      <div
        className={artQuestCx('h-full rounded-[2px] bg-gradient-to-r shadow-[0_0_10px_rgba(217,70,239,0.28)]', variantClass, barClassName)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

interface ArtQuestStatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export const ArtQuestStatCard: React.FC<ArtQuestStatCardProps> = ({ label, value, icon, className }) => (
  <ArtQuestPanel as="div" variant="inner" className={artQuestCx('flex min-h-24 items-center justify-center gap-3 p-3 text-center', className)}>
    {icon && <span className="text-2xl" aria-hidden="true">{icon}</span>}
    <div>
      <p className="font-serif text-3xl font-black text-[#eaffff]">{value}</p>
      <p className="mt-1 text-xs font-black uppercase text-[#d8c29a]">{label}</p>
    </div>
  </ArtQuestPanel>
);

interface ArtQuestTableProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const ArtQuestTable: React.FC<ArtQuestTableProps> = ({ children, className, ...props }) => (
  <div
    className={artQuestCx('overflow-x-auto rounded-md border border-[#9a6328]/75 bg-[#061125]/88 narrative-scrollbar', className)}
    {...props}
  >
    {children}
  </div>
);

interface ArtQuestEmptyStateProps {
  title: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export const ArtQuestEmptyState: React.FC<ArtQuestEmptyStateProps> = ({ title, children, icon, className }) => (
  <ArtQuestPanel
    as="section"
    className={artQuestCx('relative overflow-hidden px-6 py-12 text-center sm:px-10 sm:py-16', className)}
  >
    <div
      className="pointer-events-none absolute inset-0 opacity-25"
      style={{
        backgroundImage: [
          'radial-gradient(circle at 18% 45%, rgba(255, 216, 122, 0.18), transparent 17rem)',
          'radial-gradient(circle at 82% 42%, rgba(217, 70, 239, 0.18), transparent 18rem)',
        ].join(', '),
      }}
      aria-hidden="true"
    />
    <div className="relative mx-auto max-w-3xl">
      {icon && <div className="mb-5 text-5xl text-[#ffd45f]" aria-hidden="true">{icon}</div>}
      <h2 className="font-serif text-4xl font-black text-[#ffe7a0] drop-shadow-[0_3px_0_rgba(0,0,0,0.75)]">{title}</h2>
      <div className="mx-auto mt-4 max-w-2xl space-y-4 text-lg leading-relaxed text-[#f7e5c9]">
        {children}
      </div>
    </div>
  </ArtQuestPanel>
);

interface ArtQuestIconTileProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  imageSrc?: string;
  label?: ReactNode;
  selected?: boolean;
  locked?: boolean;
}

export const ArtQuestIconTile: React.FC<ArtQuestIconTileProps> = ({
  icon,
  imageSrc,
  label,
  selected = false,
  locked = false,
  className,
  ...props
}) => (
  <div
    className={artQuestCx(
      'flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border bg-[#0b1830]/90 p-2 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]',
      selected ? 'border-[#f287ff] bg-[#341246]/90 shadow-[0_0_18px_rgba(217,70,239,0.28)]' : 'border-[#7f5524]/70',
      locked && 'grayscale opacity-55',
      className,
    )}
    {...props}
  >
    <span className="flex h-12 w-12 items-center justify-center rounded-sm border border-[#9a6328]/75 bg-[#1d1714] text-2xl">
      {imageSrc ? (
        <img src={imageSrc} alt="" className="h-10 w-10 object-contain" style={{ imageRendering: 'pixelated' }} />
      ) : (
        <span aria-hidden="true">{icon}</span>
      )}
    </span>
    {label && <span className="text-sm font-bold leading-tight text-[#fff2cf]">{label}</span>}
  </div>
);
