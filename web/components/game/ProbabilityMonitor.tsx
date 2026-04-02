'use client';

import React from 'react';
import { GlowText } from '../ui/GlowText';
import {
  formatUsdc,
  getPotUnlockPercent,
  type HeatLevel,
} from '@/lib/types';

interface ProbabilityMonitorProps {
  slotsRemaining: number;
  potAmount: bigint;
  countdown: number;
  heatLevel: HeatLevel;
  className?: string;
}

const StatRow: React.FC<{
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}> = ({ label, value, highlight = false }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
    <span className="text-[11px] font-jetbrains text-white/40 uppercase tracking-wider">
      {label}
    </span>
    <span
      className={[
        'text-sm font-jetbrains font-bold tabular-nums',
        highlight ? 'text-accent-blue' : 'text-white/70',
      ].join(' ')}
    >
      {value}
    </span>
  </div>
);

const BarFill: React.FC<{ percent: number; color: string; label: string }> = ({
  percent,
  color,
  label,
}) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px] font-jetbrains text-white/30 uppercase tracking-wider">
      <span>{label}</span>
      <span>{percent.toFixed(1)}%</span>
    </div>
    <div
      className="h-2 bg-white/[0.05] rounded-full overflow-hidden"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label}: ${percent.toFixed(1)}%`}
    >
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  </div>
);

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const ProbabilityMonitor: React.FC<ProbabilityMonitorProps> = ({
  slotsRemaining,
  potAmount,
  countdown,
  heatLevel,
  className = '',
}) => {
  const n = slotsRemaining;
  const winRate = n > 0 ? `1/${n + 1}` : 'N/A';
  const payoutRatio = n > 0 ? `1:${n}` : 'N/A';
  const unlockPercent = getPotUnlockPercent(n);
  const taxRate = '5%';

  return (
    <div
      className={[
        'bg-surface border border-white/[0.06] rounded-xl overflow-hidden',
        'font-jetbrains',
        className,
      ].join(' ')}
    >
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06]">
        <div className="flex gap-1.5" aria-hidden="true">
          <div className="w-2.5 h-2.5 rounded-full bg-danger/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-accent-orange/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
        </div>
        <span className="text-[10px] text-white/25 uppercase tracking-widest ml-2">
          probability_monitor.exe
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Countdown */}
        <div className="text-center py-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
          <span className="block text-[10px] text-white/30 uppercase tracking-widest mb-1">
            Round Ends
          </span>
          <GlowText
            color={heatLevel === 'critical' ? 'red' : heatLevel === 'hot' ? 'orange' : 'blue'}
            size="xl"
            as="div"
            className="font-jetbrains tabular-nums"
          >
            {formatCountdown(countdown)}
          </GlowText>
        </div>

        {/* Stats */}
        <div className="space-y-0">
          <StatRow label="Win Rate" value={winRate} highlight />
          <StatRow label="Payout" value={payoutRatio} />
          <StatRow
            label="Pot"
            value={
              <GlowText color="purple" size="sm" className="font-bold">
                ${formatUsdc(potAmount)}
              </GlowText>
            }
          />
          <StatRow label="Unlock %" value={`${unlockPercent.toFixed(1)}%`} />
          <StatRow label="Tax" value={taxRate} />
        </div>

        {/* Bars */}
        <div className="space-y-3">
          <BarFill
            percent={unlockPercent}
            color="bg-gradient-to-r from-accent-blue to-accent-purple"
            label="Pot Unlock"
          />
          <BarFill
            percent={100 - unlockPercent}
            color="bg-gradient-to-r from-accent-orange to-danger"
            label="Reserve"
          />
        </div>

        {/* Terminal cursor blink */}
        <div className="flex items-center gap-1 pt-1" aria-hidden="true">
          <span className="text-[10px] text-success/40">$</span>
          <span className="text-[10px] text-white/20">monitoring</span>
          <span className="w-1.5 h-3 bg-success/60 animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export { ProbabilityMonitor, type ProbabilityMonitorProps };
