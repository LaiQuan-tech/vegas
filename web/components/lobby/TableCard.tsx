'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { GlowText } from '../ui/GlowText';
import { HeatIndicator, getHeatLevel } from './HeatIndicator';
import {
  formatUsdc,
  truncateAddress,
} from '@/lib/types';

interface TableCardProps {
  tableId: string;
  slots: number;
  potAmount: bigint;
  heatLevel?: string;
  currentPlayer: string;
  countdown: number;
  onEnter?: () => void;
  loading?: boolean;
  className?: string;
}

function getGlowFromHeat(heat: ReturnType<typeof getHeatLevel>): 'green' | 'blue' | 'orange' | 'red' {
  switch (heat) {
    case 'green':
      return 'green';
    case 'yellow':
      return 'blue';
    case 'orange':
      return 'orange';
    case 'red':
      return 'red';
    default:
      return 'blue';
  }
}

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

const TableCard: React.FC<TableCardProps> = ({
  tableId,
  slots,
  potAmount,
  heatLevel,
  currentPlayer,
  countdown,
  onEnter,
  loading = false,
  className = '',
}) => {
  const heat = getHeatLevel(slots);
  const glowColor = getGlowFromHeat(heat);
  const isFull = slots <= 0;
  const isEmptyPlayer =
    !currentPlayer || currentPlayer === '0x0000000000000000000000000000000000000000';

  return (
    <Card
      glowColor={glowColor}
      className={[
        'flex flex-col gap-4 relative overflow-hidden group',
        className,
      ].join(' ')}
    >
      {/* Background scan line effect */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.03)_2px,rgba(255,255,255,0.03)_4px)]"
        aria-hidden="true"
      />

      {/* Header row */}
      <div className="flex items-center justify-between relative">
        <span className="text-[10px] font-jetbrains text-white/30 uppercase tracking-widest">
          Table #{tableId}
        </span>
        <HeatIndicator slots={slots} />
      </div>

      {/* Slots big number */}
      <div className="flex items-end gap-3 relative">
        <GlowText
          color={glowColor === 'blue' ? 'blue' : glowColor === 'green' ? 'green' : glowColor === 'orange' ? 'orange' : 'red'}
          size="2xl"
          as="div"
          className="font-orbitron leading-none"
        >
          {slots}
        </GlowText>
        <div className="flex flex-col pb-1">
          <span className="text-white/30 text-xs font-jetbrains">/ 36</span>
          <span className="text-white/50 text-[10px] font-jetbrains uppercase tracking-wider">
            slots
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 relative">
        <div className="bg-white/[0.03] rounded-lg px-3 py-2">
          <span className="block text-[10px] text-white/30 font-jetbrains uppercase tracking-wider mb-0.5">
            Pot
          </span>
          <span className="text-white font-jetbrains font-bold text-sm">
            ${formatUsdc(potAmount)}
          </span>
        </div>
        <div className="bg-white/[0.03] rounded-lg px-3 py-2">
          <span className="block text-[10px] text-white/30 font-jetbrains uppercase tracking-wider mb-0.5">
            Time
          </span>
          <span
            className={[
              'font-jetbrains font-bold text-sm tabular-nums',
              countdown <= 30
                ? 'text-danger animate-pulse'
                : countdown <= 60
                  ? 'text-accent-orange'
                  : 'text-white',
            ].join(' ')}
          >
            {formatCountdown(countdown)}
          </span>
        </div>
      </div>

      {/* Player address */}
      <div className="flex items-center gap-2 relative">
        {!isEmptyPlayer && (
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" aria-hidden="true" />
        )}
        <span className="text-xs font-jetbrains text-white/40">
          {isEmptyPlayer ? 'No player' : truncateAddress(currentPlayer)}
        </span>
      </div>

      {/* Enter button */}
      <Button
        variant={isFull ? 'ghost' : 'primary'}
        size="md"
        onClick={onEnter}
        disabled={isFull}
        loading={loading}
        className="w-full relative mt-auto"
        aria-label={`Enter table ${tableId}`}
      >
        {isFull ? 'TABLE FULL' : 'ENTER TABLE'}
      </Button>
    </Card>
  );
};

export { TableCard, type TableCardProps };
