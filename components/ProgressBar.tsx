
import React from 'react';
import { ProgressBarProps } from '../types';

const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  max,
  label,
  colorClass = 'bg-teal-500',
  heightClass = 'h-3', // Reduced height for trait bars
}) => {
  const percentage = max > 0 ? (current / max) * 100 : 0;

  return (
    <div className="w-full">
      {label && <span className="text-xs text-gray-400 mb-0.5 block">{label}</span>}
      <div className={`artquest-progress-track w-full ${heightClass} overflow-hidden shadow-inner`}>
        <div
          className={`${colorClass} ${heightClass} transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label || 'Progress'}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
