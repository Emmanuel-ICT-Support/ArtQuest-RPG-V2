
import React from 'react';
import { PlayerStatsDisplayProps, PlayerTrait, TraitName } from '../types';
import ProgressBar from './ProgressBar';

const TraitBadge: React.FC<{ trait: PlayerTrait }> = ({ trait }) => {
  let textColor = 'text-gray-400';
  let levelTextColor = 'text-gray-300';
  let iconFilter = '';
  let traitStateClass = 'analysis-trait-locked';

  switch (trait.level) {
    case 'Bronze':
      textColor = 'text-amber-200';
      levelTextColor = 'text-amber-300 font-semibold';
      traitStateClass = 'analysis-trait-bronze';
      break;
    case 'Silver':
      textColor = 'text-cyan-100';
      levelTextColor = 'text-cyan-50 font-semibold';
      traitStateClass = 'analysis-trait-silver';
      break;
    case 'Gold':
      textColor = 'text-yellow-100';
      levelTextColor = 'text-yellow-200 font-bold';
      traitStateClass = 'analysis-trait-gold';
      break;
    case 'Locked':
      iconFilter = 'filter grayscale opacity-60';
      textColor = 'text-gray-500';
      levelTextColor = 'text-gray-400 italic';
      break;
  }

  return (
    <div className={`analysis-trait-card ${traitStateClass}`}>
      <div className="min-h-0">
        <div className="mb-1 flex items-start gap-3">
          <span className={`analysis-trait-icon ${iconFilter}`} aria-hidden="true">{trait.icon}</span>
          <div className="min-w-0 flex-1">
            <h4 className={`truncate text-sm font-medium ${textColor}`} title={trait.name}>{trait.name}</h4>
            <p className={`text-xs ${levelTextColor}`}>{trait.level}</p>
          </div>
        </div>
        <p className="analysis-trait-description text-xs leading-snug text-gray-400/80" title={trait.description}>{trait.description}</p>
      </div>
      <div className="mt-auto">
        <ProgressBar
          current={trait.currentXP}
          max={trait.xpToNextLevel}
          colorClass={trait.level === 'Gold' ? 'bg-yellow-400' : trait.level === 'Silver' ? 'bg-gray-300' : trait.level === 'Bronze' ? 'bg-yellow-600' : 'bg-gray-500'}
          heightClass="h-2"
        />
        <p className="mt-1 text-right text-[10px] text-gray-400/90">
          {trait.level === 'Gold' ? 'Maxed' : `${trait.currentXP}/${trait.xpToNextLevel} XP`}
        </p>
      </div>
    </div>
  );
};

const PlayerStatsDisplay: React.FC<PlayerStatsDisplayProps> = ({ playerStats }) => {
  if (!playerStats) {
    return (
      <div className="p-0.5 text-center text-gray-500 italic text-sm">
        Player stats are loading...
      </div>
    );
  }

  const traitOrder: TraitName[] = ['Focus', 'Expression', 'Insight', 'Imagination'];

  return (
    <div className="analysis-stats-display">
      <div className="shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="analysis-stats-heading">Art Energy Meter</h3>
          <p className="whitespace-nowrap text-right text-xs font-bold text-purple-100">
            {playerStats.artEnergy.currentXP} / {playerStats.artEnergy.maxXp} XP
          </p>
        </div>
        <ProgressBar
          current={playerStats.artEnergy.currentXP}
          max={playerStats.artEnergy.maxXp}
          colorClass="bg-[#314fbd]"
          heightClass="h-2" 
        />
      </div>

      <div className="flex min-h-0 flex-grow flex-col overflow-hidden">
        <h3 className="analysis-stats-heading mb-2">Trait Badges</h3>
        <div className="analysis-trait-grid"> 
          {traitOrder.map(traitName => (
            playerStats.traits[traitName] &&
            <TraitBadge key={traitName} trait={playerStats.traits[traitName]} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsDisplay;
