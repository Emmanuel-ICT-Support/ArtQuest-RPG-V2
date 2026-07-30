import React, { useEffect, useRef } from 'react';
import type { AvatarRewardReveal, PlayerAvatar, TraitName } from '../types';
import { getAvatarAssetPreviewImageUrls, getAvatarBuildForAvatar } from '../data/AvatarRewards';
import AvatarAssetPreview from './AvatarAssetPreview';

interface RewardRevealPanelProps {
  rewards: AvatarRewardReveal[];
  avatar: PlayerAvatar | null | undefined;
  onEquip: (reward: AvatarRewardReveal) => void;
  onDismiss: () => void;
  onReveal: () => void;
}

const TRAIT_ICONS: Record<TraitName, string> = {
  Focus: '🎯',
  Expression: '✍️',
  Insight: '🧠',
  Imagination: '🎨',
};

const RewardRevealPanel: React.FC<RewardRevealPanelProps> = ({
  rewards,
  avatar,
  onEquip,
  onDismiss,
  onReveal,
}) => {
  const reward = rewards[0];
  const lastRevealedRewardRef = useRef<AvatarRewardReveal | null>(null);

  useEffect(() => {
    if (!reward || lastRevealedRewardRef.current === reward) return;

    lastRevealedRewardRef.current = reward;
    onReveal();
  }, [onReveal, reward]);

  useEffect(() => {
    if (!reward) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss, reward]);

  if (!reward) return null;

  const previewBuild = {
    ...getAvatarBuildForAvatar(avatar || null),
    [reward.assetCategory]: reward.assetId,
  };
  const previewImageUrls = getAvatarAssetPreviewImageUrls(
    previewBuild,
    reward.assetCategory,
    reward.assetId,
  );
  const hasMoreRewards = rewards.length > 1;
  const unlockLabel = reward.unlockSource || `${reward.traitName} ${reward.level} · ${reward.badgeName}`;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#02030a]/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reward-reveal-title"
      aria-describedby="reward-reveal-description"
    >
      <section className="relative w-full max-w-md overflow-hidden rounded-xl border border-[#ffd978]/75 bg-[#07152e] shadow-[0_0_0_1px_rgba(255,239,183,0.18),0_24px_80px_rgba(0,0,0,0.72),0_0_48px_rgba(217,70,239,0.28)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.28),transparent_31%),radial-gradient(circle_at_8%_88%,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_92%_80%,rgba(217,70,239,0.2),transparent_35%)]" aria-hidden="true" />
        <div className="relative p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffe39a]">Reward Unlocked</p>
              <h2 id="reward-reveal-title" className="mt-1 font-serif text-3xl font-black text-white">
                {reward.assetName}
              </h2>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#ffe5a4]/70 bg-[#573278]/75 text-2xl shadow-[0_0_24px_rgba(250,204,21,0.45)]" aria-hidden="true">
              ✦
            </span>
          </div>

          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_9.5rem] items-center gap-4 rounded-lg border border-[#d38c2e]/55 bg-[#020a1c]/60 p-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wider text-cyan-200">New {reward.assetCategoryLabel}</p>
              <p id="reward-reveal-description" className="mt-2 text-sm leading-relaxed text-[#f8e7c7]">
                {reward.description}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-fuchsia-200/35 bg-fuchsia-500/15 px-3 py-1.5 text-xs font-bold text-fuchsia-100">
                <span aria-hidden="true">{reward.unlockSource ? '✦' : TRAIT_ICONS[reward.traitName]}</span>
                {unlockLabel}
              </div>
            </div>
            <AvatarAssetPreview
              imageUrls={previewImageUrls}
              tabId={reward.assetCategory}
              label={reward.assetName}
              className="h-36 w-full border-[#ffe2a2]/45 sm:h-40"
            />
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => onEquip(reward)}
              className="artquest-button min-h-12 flex-1 px-4 py-3 text-sm font-black focus:outline-none focus:ring-4 focus:ring-[#ffe39a]"
              autoFocus
            >
              Equip Now
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="min-h-12 flex-1 rounded-md border border-[#c79655]/70 bg-[#0a1c39]/90 px-4 py-3 text-sm font-black text-[#ffe7bc] transition hover:border-[#ffe39a] hover:bg-[#102a52] focus:outline-none focus:ring-4 focus:ring-fuchsia-300"
            >
              Keep Exploring
            </button>
          </div>

          {hasMoreRewards && (
            <p className="mt-4 text-center text-xs font-semibold text-[#d8c29a]" aria-live="polite">
              Reward 1 of {rewards.length}. Choose an option to reveal the next reward.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default RewardRevealPanel;
