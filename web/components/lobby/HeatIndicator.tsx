'use client';

import React from 'react';

interface HeatIndicatorProps {
  slots: number;
  className?: string;
}

type HeatLevel = 'green' | 'yellow' | 'orange' | 'red';

function getHeatLevel(slots: number): HeatLevel {
  if (slots >= 25) return 'green';
  if (slots >= 11) return 'yellow';
  if (slots >= 6) return 'orange';
  return 'red';
}

const heatConfig: Record<
  HeatLevel,
  { label: string; color: string; bg: string; border: string; pulse: boolean }
> = {
  green: {
    label: 'COOL',
    color: 'text-success',
    bg: 'bg-success/15',
    border: 'border-success/30',
    pulse: false,
  },
  yellow: {
    label: 'WARM',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/15',
    border: 'border-yellow-400/30',
    pulse: false,
  },
  orange: {
    label: 'HOT',
    color: 'text-accent-orange',
    bg: 'bg-accent-orange/15',
    border: 'border-accent-orange/30',
    pulse: false,
  },
  red: {
    label: 'CRITICAL',
    color: 'text-danger',
    bg: 'bg-danger/15',
    border: 'border-danger/30',
    pulse: true,
  },
};

const HeatIndicator: React.FC<HeatIndicatorProps> = ({ slots, className = '' }) => {
  const level = getHeatLevel(slots);
  const config = heatConfig[level];

  return (
    <div
      className={[
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border',
        config.bg,
        config.border,
        config.pulse ? 'animate-pulse' : '',
        className,
      ].join(' ')}
    >
      {/* Heat bar segments */}
      <div className="flex gap-0.5">
        {[3, 2, 1, 0].map((threshold) => {
          const levels: HeatLevel[] = ['green', 'yellow', 'orange', 'red'];
          const idx = levels.indexOf(level);
          const filled = threshold <= idx;
          return (
            <div
              key={threshold}
              className={[
                'w-1.5 rounded-full transition-all duration-300',
                threshold === 0 ? 'h-2' : threshold === 1 ? 'h-3' : threshold === 2 ? 'h-4' : 'h-5',
                filled ? config.color.replace('text-', 'bg-') : 'bg-white/10',
              ].join(' ')}
            />
          );
        })}
      </div>

      <span
        className={[
          'text-[10px] font-bold font-jetbrains uppercase tracking-widest',
          config.color,
        ].join(' ')}
      >
        {config.label}
      </span>
    </div>
  );
};

export { HeatIndicator, type HeatIndicatorProps, getHeatLevel };
