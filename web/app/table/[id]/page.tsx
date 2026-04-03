'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';

import { useTableState } from '@/hooks/useTableState';
import { usePlaceBet } from '@/hooks/usePlaceBet';
import { useClaimSeat } from '@/hooks/useClaimSeat';
import { useAbandonSeat } from '@/hooks/useAbandonSeat';
import { useUsdcBalance } from '@/hooks/useUsdcBalance';
import { ProbabilityMonitor } from '@/components/game/ProbabilityMonitor';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { GlowText } from '@/components/ui/GlowText';
import {
  getHeatLevel,
  formatUsdc,
  truncateAddress,
  getLiquidationCountdown,
  type HeatLevel,
} from '@/lib/types';

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const TOTAL_SLOTS = 37; // 0-36
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/** Standard European roulette colour mapping: 0 = green, then alternating red/black */
const SLOT_COLORS: Record<number, 'green' | 'red' | 'black'> = (() => {
  const reds = new Set([
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ]);
  const map: Record<number, 'green' | 'red' | 'black'> = { 0: 'green' };
  for (let i = 1; i <= 36; i++) {
    map[i] = reds.has(i) ? 'red' : 'black';
  }
  return map;
})();

/* Slot order around the wheel (European layout) */
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

type ResultType = 'win' | 'lose' | 'zero';

interface HistoryEntry {
  type: ResultType;
  number: number;
  timestamp: number;
}

/* -------------------------------------------------------------------------- */
/*  Helper Components                                                          */
/* -------------------------------------------------------------------------- */

/** A single slot cell on the wheel ring */
const WheelSlot: React.FC<{
  number: number;
  eliminated: boolean;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  angle: number;
  radius: number;
}> = ({ number, eliminated, selected, disabled, onClick, angle, radius }) => {
  const color = SLOT_COLORS[number];
  const bgMap = {
    green: eliminated
      ? 'bg-white/[0.04]'
      : selected
        ? 'bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.6)]'
        : 'bg-emerald-600/80 hover:bg-emerald-500',
    red: eliminated
      ? 'bg-white/[0.04]'
      : selected
        ? 'bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.6)]'
        : 'bg-red-700/80 hover:bg-red-500',
    black: eliminated
      ? 'bg-white/[0.04]'
      : selected
        ? 'bg-white/30 shadow-[0_0_16px_rgba(255,255,255,0.3)]'
        : 'bg-white/[0.10] hover:bg-white/20',
  };

  /* Position around the circle */
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;

  return (
    <button
      onClick={onClick}
      disabled={disabled || eliminated}
      aria-label={`Slot ${number}${eliminated ? ' (eliminated)' : ''}${selected ? ' (selected)' : ''}`}
      className={[
        'absolute flex items-center justify-center rounded-full transition-all duration-200',
        'w-9 h-9 md:w-10 md:h-10 text-[11px] md:text-xs font-jetbrains font-bold',
        bgMap[color],
        eliminated
          ? 'opacity-30 cursor-not-allowed line-through text-white/20'
          : 'cursor-pointer text-white',
        selected && !eliminated
          ? 'ring-2 ring-accent-blue scale-110 z-10'
          : '',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue',
      ].join(' ')}
      style={{
        left: `calc(50% + ${x}px - 1.25rem)`,
        top: `calc(50% + ${y}px - 1.25rem)`,
      }}
    >
      {eliminated ? <span className="text-white/20">X</span> : number}
    </button>
  );
};

/** History dot */
const HistoryDot: React.FC<{ entry: HistoryEntry }> = ({ entry }) => {
  const colorMap: Record<ResultType, string> = {
    win: 'bg-success',
    lose: 'bg-danger',
    zero: 'bg-accent-purple',
  };
  return (
    <div
      className={`w-3 h-3 rounded-full ${colorMap[entry.type]} shadow-lg`}
      title={`#${entry.number} - ${entry.type}`}
    />
  );
};

/** Bet step indicator */
const StepIndicator: React.FC<{
  step: 'idle' | 'approving' | 'betting' | 'done' | 'error';
}> = ({ step }) => {
  const config: Record<
    string,
    { label: string; color: string; pulse: boolean }
  > = {
    idle: { label: 'READY', color: 'text-white/30', pulse: false },
    approving: {
      label: 'APPROVING USDC...',
      color: 'text-accent-orange',
      pulse: true,
    },
    betting: {
      label: 'PLACING BET...',
      color: 'text-accent-blue',
      pulse: true,
    },
    done: { label: 'BET CONFIRMED', color: 'text-success', pulse: false },
    error: { label: 'TX FAILED', color: 'text-danger', pulse: false },
  };
  const { label, color, pulse } = config[step];

  return (
    <div className="flex items-center gap-2">
      <span
        className={[
          'w-2 h-2 rounded-full',
          step === 'idle'
            ? 'bg-white/20'
            : step === 'error'
              ? 'bg-danger'
              : step === 'done'
                ? 'bg-success'
                : 'bg-accent-blue',
          pulse ? 'animate-pulse' : '',
        ].join(' ')}
      />
      <span
        className={`font-jetbrains text-[11px] uppercase tracking-wider ${color}`}
      >
        {label}
      </span>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Result Overlay                                                             */
/* -------------------------------------------------------------------------- */

const ResultOverlay: React.FC<{
  type: ResultType | null;
  resultNumber: number | null;
  potShareFormatted: string;
  onDismiss: () => void;
}> = ({ type, resultNumber, potShareFormatted, onDismiss }) => {
  if (!type) return null;

  const overlayConfig: Record<
    ResultType,
    { bg: string; title: string; subtitle: string; glow: string }
  > = {
    win: {
      bg: 'from-success/20 via-success/5 to-transparent',
      title: 'YOU WIN',
      subtitle: `+$${potShareFormatted} USDC`,
      glow: 'shadow-[0_0_120px_rgba(0,255,136,0.3)]',
    },
    lose: {
      bg: 'from-danger/20 via-danger/5 to-transparent',
      title: 'SLOT ELIMINATED',
      subtitle: `Number ${resultNumber ?? '?'} removed`,
      glow: 'shadow-[0_0_120px_rgba(255,0,64,0.3)]',
    },
    zero: {
      bg: 'from-danger/40 via-danger/10 to-transparent',
      title: 'SYSTEM WIPE',
      subtitle: 'Zero hit - All slots reset',
      glow: 'shadow-[0_0_200px_rgba(255,0,64,0.5)]',
    },
  };

  const cfg = overlayConfig[type];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-[100] flex items-center justify-center bg-gradient-radial ${cfg.bg}`}
        onClick={onDismiss}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className={`text-center p-12 rounded-3xl bg-surface/80 backdrop-blur-xl border border-white/10 ${cfg.glow}`}
        >
          <GlowText
            color={type === 'win' ? 'green' : 'red'}
            size="2xl"
            as="h2"
            className="font-orbitron tracking-widest"
          >
            {cfg.title}
          </GlowText>

          {type === 'zero' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="mt-4 font-orbitron text-danger text-lg tracking-[0.3em]"
            >
              /// CRITICAL ERROR ///
            </motion.div>
          )}

          <p className="mt-6 font-jetbrains text-lg text-white/80">
            {cfg.subtitle}
          </p>

          {resultNumber !== null && (
            <div className="mt-6 mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/10">
              <span className="font-orbitron text-2xl font-bold text-white">
                {resultNumber}
              </span>
            </div>
          )}

          <p className="mt-8 text-white/30 text-xs font-jetbrains uppercase tracking-wider">
            Click anywhere to dismiss
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* -------------------------------------------------------------------------- */
/*  Number Grid (Bet Selector)                                                 */
/* -------------------------------------------------------------------------- */

const NumberGrid: React.FC<{
  eliminatedSlots: Set<number>;
  selectedNumber: number | null;
  onSelect: (n: number) => void;
}> = ({ eliminatedSlots, selectedNumber, onSelect }) => {
  return (
    <div className="space-y-3">
      {/* Zero */}
      <div className="flex justify-center">
        <button
          onClick={() => onSelect(0)}
          disabled={eliminatedSlots.has(0)}
          className={[
            'w-full max-w-[120px] h-10 rounded-lg font-jetbrains font-bold text-sm transition-all',
            eliminatedSlots.has(0)
              ? 'bg-white/[0.04] text-white/20 cursor-not-allowed line-through'
              : selectedNumber === 0
                ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] ring-2 ring-accent-blue'
                : 'bg-emerald-700/60 text-white hover:bg-emerald-500 cursor-pointer',
          ].join(' ')}
        >
          {eliminatedSlots.has(0) ? 'X' : '0'}
        </button>
      </div>

      {/* Numbers 1-36, 3 columns */}
      <div className="grid grid-cols-3 gap-1.5">
        {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => {
          const color = SLOT_COLORS[n];
          const eliminated = eliminatedSlots.has(n);
          const selected = selectedNumber === n;

          return (
            <button
              key={n}
              onClick={() => onSelect(n)}
              disabled={eliminated}
              className={[
                'h-10 rounded-lg font-jetbrains font-bold text-sm transition-all',
                eliminated
                  ? 'bg-white/[0.04] text-white/20 cursor-not-allowed line-through'
                  : selected
                    ? color === 'red'
                      ? 'bg-red-500 text-white shadow-[0_0_16px_rgba(239,68,68,0.5)] ring-2 ring-accent-blue'
                      : 'bg-white/30 text-white shadow-[0_0_16px_rgba(255,255,255,0.3)] ring-2 ring-accent-blue'
                    : color === 'red'
                      ? 'bg-red-800/60 text-white/90 hover:bg-red-600 cursor-pointer'
                      : 'bg-white/[0.08] text-white/90 hover:bg-white/20 cursor-pointer',
              ].join(' ')}
            >
              {eliminated ? 'X' : n}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Main Page                                                                  */
/* -------------------------------------------------------------------------- */

export default function TablePage() {
  const params = useParams<{ id: string }>();
  const tableId = params.id;
  const { address: userAddress } = useAccount();

  /* ---- Contract hooks ---- */
  const tableAddress = tableId?.startsWith('0x')
    ? (tableId as `0x${string}`)
    : undefined;

  const {
    slots: rawSlots,
    currentPlayer,
    maxBet,
    seatOpen,
    isLoading: tableLoading,
    isError: tableError,
    refetch: refetchTable,
  } = useTableState(tableAddress);

  const { placeBet, step: betStep, isPending: betPending } = usePlaceBet(tableAddress);
  const {
    claimSeat,
    isPending: claimPending,
    isConfirming: claimConfirming,
    isSuccess: claimSuccess,
  } = useClaimSeat(tableAddress);
  const {
    abandonSeat,
    isPending: abandonPending,
    isConfirming: abandonConfirming,
  } = useAbandonSeat(tableAddress);
  const { formatted: usdcFormatted, balance: usdcBalance } = useUsdcBalance();

  /* ---- Local state ---- */
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [resultOverlay, setResultOverlay] = useState<{
    type: ResultType;
    number: number;
    potShare: string;
  } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [showAbandonModal, setShowAbandonModal] = useState(false);

  /* ---- Derived state ---- */
  const slotsArray = useMemo(() => {
    if (!rawSlots || !Array.isArray(rawSlots)) return [];
    return rawSlots as Array<{
      player: string;
      betAmount: bigint;
      timestamp: bigint;
    }>;
  }, [rawSlots]);

  /** Set of eliminated slot indices (where player address is not zero) */
  const eliminatedSlots = useMemo(() => {
    const set = new Set<number>();
    slotsArray.forEach((slot, idx) => {
      if (
        slot.player &&
        slot.player !== ZERO_ADDRESS
      ) {
        set.add(idx);
      }
    });
    return set;
  }, [slotsArray]);

  const slotsRemaining = TOTAL_SLOTS - eliminatedSlots.size;
  const heatLevel: HeatLevel = getHeatLevel(slotsRemaining);

  const isCurrentPlayer = useMemo(() => {
    if (!userAddress || !currentPlayer) return false;
    return currentPlayer.toString().toLowerCase() === userAddress.toLowerCase();
  }, [userAddress, currentPlayer]);

  const isWatching = useMemo(() => {
    if (!currentPlayer) return true;
    if (currentPlayer === ZERO_ADDRESS) return false;
    return !isCurrentPlayer;
  }, [currentPlayer, isCurrentPlayer]);

  const maxBetFormatted = useMemo(() => {
    if (!maxBet) return '0.00';
    return formatUnits(maxBet as bigint, 6);
  }, [maxBet]);

  /** Pot is sum of all bet amounts in occupied slots */
  const potTotal = useMemo(() => {
    return slotsArray.reduce((sum, slot) => {
      if (slot.player && slot.player !== ZERO_ADDRESS) {
        return sum + (slot.betAmount ?? 0n);
      }
      return sum;
    }, 0n);
  }, [slotsArray]);

  /* ---- Countdown timer ---- */
  useEffect(() => {
    const lastTimestamp = slotsArray.reduce((latest, slot) => {
      const ts = Number(slot.timestamp ?? 0n);
      return ts > latest ? ts : latest;
    }, 0);

    if (lastTimestamp === 0) {
      setCountdown(0);
      return;
    }

    const tick = () => {
      const remaining = getLiquidationCountdown(slotsRemaining, lastTimestamp);
      setCountdown(remaining);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [slotsArray, slotsRemaining]);

  /* ---- Refetch after bet ---- */
  useEffect(() => {
    if (betStep === 'done') {
      refetchTable();
    }
  }, [betStep, refetchTable]);

  /* ---- Handlers ---- */
  const handlePlaceBet = useCallback(async () => {
    if (selectedNumber === null || !betAmount || betPending) return;
    await placeBet(betAmount);
  }, [selectedNumber, betAmount, betPending, placeBet]);

  const handleNumberSelect = useCallback(
    (n: number) => {
      if (eliminatedSlots.has(n)) return;
      setSelectedNumber((prev) => (prev === n ? null : n));
    },
    [eliminatedSlots],
  );

  const handleMaxBet = useCallback(() => {
    if (!maxBet || !usdcBalance) return;
    const max = (maxBet as bigint) < (usdcBalance as bigint) ? maxBet : usdcBalance;
    setBetAmount(formatUnits(max as bigint, 6));
  }, [maxBet, usdcBalance]);

  /* ---- Wheel radius ---- */
  const wheelRadius = 140;

  /* ======================================================================== */
  /*  Render                                                                   */
  /* ======================================================================== */

  return (
    <div className="min-h-screen bg-bg text-white">
      {/* ---- Result overlay ---- */}
      {resultOverlay && (
        <ResultOverlay
          type={resultOverlay.type}
          resultNumber={resultOverlay.number}
          potShareFormatted={resultOverlay.potShare}
          onDismiss={() => setResultOverlay(null)}
        />
      )}

      {/* ---- Abandon Seat Modal ---- */}
      <Modal
        isOpen={showAbandonModal}
        onClose={() => setShowAbandonModal(false)}
        title="Abandon Seat"
      >
        <p className="text-white/60 text-sm mb-6 font-inter">
          Are you sure you want to abandon your seat? Your position at this
          table will be released and another player can claim it.
        </p>
        <div className="flex gap-3 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAbandonModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={abandonPending || abandonConfirming}
            onClick={() => {
              abandonSeat();
              setShowAbandonModal(false);
            }}
          >
            Abandon Seat
          </Button>
        </div>
      </Modal>

      {/* ================================================================== */}
      {/*  Header                                                             */}
      {/* ================================================================== */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-white/40 hover:text-accent-blue transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <h1 className="font-orbitron text-lg font-bold tracking-wider">
              <span className="text-accent-blue">CYBER</span>
              <span className="text-accent-purple">ROULETTE</span>
            </h1>
          </Link>

          <div className="flex items-center gap-4">
            {/* Table heat badge */}
            <div
              className={[
                'px-3 py-1 rounded-full text-[10px] font-jetbrains uppercase tracking-widest border',
                heatLevel === 'critical'
                  ? 'border-danger/50 text-danger bg-danger/10'
                  : heatLevel === 'hot'
                    ? 'border-accent-orange/50 text-accent-orange bg-accent-orange/10'
                    : heatLevel === 'warm'
                      ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10'
                      : 'border-accent-blue/30 text-accent-blue/60 bg-accent-blue/5',
              ].join(' ')}
            >
              {heatLevel}
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* ================================================================== */}
      {/*  Main Layout                                                        */}
      {/* ================================================================== */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Loading state */}
        {tableLoading && (
          <div className="flex items-center justify-center py-32">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin mx-auto" />
              <p className="font-jetbrains text-sm text-white/40">
                Loading table data...
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {tableError && !tableLoading && (
          <div className="flex items-center justify-center py-32">
            <div className="text-center space-y-4">
              <GlowText color="red" size="lg" as="p">
                CONNECTION ERROR
              </GlowText>
              <p className="font-jetbrains text-sm text-white/40">
                Failed to read on-chain table state
              </p>
              <Button variant="ghost" size="sm" onClick={() => refetchTable()}>
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Main content */}
        {!tableLoading && !tableError && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6"
          >
            {/* ============================================================ */}
            {/*  Left Column - Wheel + Bet Interface                         */}
            {/* ============================================================ */}
            <div className="space-y-6">
              {/* Table Title */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-orbitron text-xl font-bold tracking-wide">
                    Table{' '}
                    <span className="text-accent-purple">
                      #{tableId?.slice(0, 8)}
                    </span>
                  </h2>
                  <p className="text-[11px] font-jetbrains text-white/30 mt-0.5">
                    {slotsRemaining} / {TOTAL_SLOTS} slots active
                  </p>
                </div>

                {/* Seat management */}
                <div className="flex items-center gap-3">
                  {isCurrentPlayer && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setShowAbandonModal(true)}
                      loading={abandonPending || abandonConfirming}
                    >
                      Abandon Seat
                    </Button>
                  )}
                  {!isCurrentPlayer && seatOpen && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={claimSeat}
                      loading={claimPending || claimConfirming}
                    >
                      Claim Seat
                    </Button>
                  )}
                  {isWatching && !seatOpen && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      <span className="w-2 h-2 rounded-full bg-accent-purple animate-pulse" />
                      <span className="text-xs font-jetbrains text-white/50 uppercase tracking-wider">
                        Watching
                      </span>
                    </div>
                  )}
                  {claimSuccess && (
                    <span className="text-xs font-jetbrains text-success">
                      Seat claimed!
                    </span>
                  )}
                </div>
              </div>

              {/* Current player info */}
              {currentPlayer && currentPlayer !== ZERO_ADDRESS && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-xs font-jetbrains text-white/40">
                    Current Player:
                  </span>
                  <span className="text-xs font-jetbrains text-accent-blue">
                    {truncateAddress(currentPlayer.toString())}
                  </span>
                  {isCurrentPlayer && (
                    <span className="ml-auto text-[10px] font-jetbrains text-success uppercase tracking-wider">
                      (You)
                    </span>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/*  Roulette Wheel                                           */}
              {/* ======================================================== */}
              <div className="relative bg-surface rounded-2xl border border-white/[0.06] p-6 overflow-hidden">
                {/* Scanline overlay effect */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)',
                  }}
                  aria-hidden="true"
                />

                <div
                  className="relative mx-auto"
                  style={{
                    width: `${wheelRadius * 2 + 80}px`,
                    height: `${wheelRadius * 2 + 80}px`,
                  }}
                >
                  {/* Outer ring glow */}
                  <div
                    className="absolute inset-4 rounded-full border border-white/[0.06]"
                    style={{
                      boxShadow: `0 0 40px rgba(${heatLevel === 'critical' ? '255,0,64' : heatLevel === 'hot' ? '255,107,43' : '0,212,255'},0.1)`,
                    }}
                  />

                  {/* Center display */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <GlowText
                        color={
                          heatLevel === 'critical'
                            ? 'red'
                            : heatLevel === 'hot'
                              ? 'orange'
                              : 'blue'
                        }
                        size="2xl"
                        as="div"
                        className="font-orbitron"
                      >
                        {selectedNumber !== null ? selectedNumber : '?'}
                      </GlowText>
                      <p className="text-[10px] font-jetbrains text-white/25 mt-1 uppercase tracking-widest">
                        {selectedNumber !== null
                          ? 'Selected'
                          : 'Pick a number'}
                      </p>
                    </div>
                  </div>

                  {/* Wheel slots */}
                  {WHEEL_ORDER.map((num, idx) => {
                    const angle = (360 / WHEEL_ORDER.length) * idx - 90;
                    return (
                      <WheelSlot
                        key={num}
                        number={num}
                        eliminated={eliminatedSlots.has(num)}
                        selected={selectedNumber === num}
                        disabled={!isCurrentPlayer}
                        onClick={() => handleNumberSelect(num)}
                        angle={angle}
                        radius={wheelRadius}
                      />
                    );
                  })}
                </div>
              </div>

              {/* ======================================================== */}
              {/*  Bet Interface                                            */}
              {/* ======================================================== */}
              <div className="bg-surface rounded-2xl border border-white/[0.06] p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-orbitron text-sm font-bold tracking-wider text-white/80">
                    PLACE BET
                  </h3>
                  <StepIndicator step={betStep} />
                </div>

                {/* Number grid */}
                <NumberGrid
                  eliminatedSlots={eliminatedSlots}
                  selectedNumber={selectedNumber}
                  onSelect={handleNumberSelect}
                />

                {/* Amount + balance */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-jetbrains">
                    <span className="text-white/40 uppercase tracking-wider">
                      Bet Amount (USDC)
                    </span>
                    <span className="text-white/30">
                      Balance:{' '}
                      <span className="text-accent-blue">
                        ${usdcFormatted ?? '0.00'}
                      </span>
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 font-jetbrains text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        disabled={!isCurrentPlayer}
                        className={[
                          'w-full pl-7 pr-3 py-3 rounded-lg',
                          'bg-white/[0.04] border border-white/[0.08]',
                          'font-jetbrains text-sm text-white tabular-nums',
                          'placeholder:text-white/20',
                          'focus:outline-none focus:border-accent-blue/50 focus:bg-white/[0.06]',
                          'transition-all',
                          'disabled:opacity-40 disabled:cursor-not-allowed',
                        ].join(' ')}
                        aria-label="Bet amount in USDC"
                      />
                    </div>
                    <button
                      onClick={handleMaxBet}
                      disabled={!isCurrentPlayer}
                      className={[
                        'px-4 py-3 rounded-lg text-[11px] font-jetbrains font-bold uppercase tracking-wider',
                        'bg-accent-purple/10 text-accent-purple border border-accent-purple/30',
                        'hover:bg-accent-purple/20 hover:border-accent-purple/50',
                        'transition-all',
                        'disabled:opacity-30 disabled:cursor-not-allowed',
                      ].join(' ')}
                    >
                      Max
                    </button>
                  </div>

                  {/* Max bet indicator */}
                  <div className="flex items-center justify-between text-[10px] font-jetbrains text-white/25">
                    <span>
                      Max bet: <span className="text-white/40">${maxBetFormatted}</span>
                    </span>
                    {selectedNumber !== null && (
                      <span>
                        Selected:{' '}
                        <span
                          className={
                            SLOT_COLORS[selectedNumber] === 'red'
                              ? 'text-red-400'
                              : SLOT_COLORS[selectedNumber] === 'green'
                                ? 'text-emerald-400'
                                : 'text-white/60'
                          }
                        >
                          #{selectedNumber}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* SPIN button */}
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full font-orbitron text-lg tracking-[0.2em]"
                  disabled={
                    !isCurrentPlayer ||
                    selectedNumber === null ||
                    !betAmount ||
                    parseFloat(betAmount) <= 0 ||
                    betPending
                  }
                  loading={betPending}
                  onClick={handlePlaceBet}
                >
                  {betPending
                    ? betStep === 'approving'
                      ? 'APPROVING...'
                      : 'SPINNING...'
                    : 'SPIN'}
                </Button>

                {/* Warning if not seated */}
                {!isCurrentPlayer && userAddress && (
                  <p className="text-center text-[11px] font-jetbrains text-white/30">
                    {seatOpen
                      ? 'Claim a seat to start playing'
                      : 'Seat occupied - waiting for opening'}
                  </p>
                )}
                {!userAddress && (
                  <p className="text-center text-[11px] font-jetbrains text-white/30">
                    Connect wallet to play
                  </p>
                )}
              </div>

              {/* ======================================================== */}
              {/*  Game History                                             */}
              {/* ======================================================== */}
              <div className="bg-surface rounded-xl border border-white/[0.06] px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[11px] font-jetbrains text-white/40 uppercase tracking-widest">
                    Recent Results
                  </h4>
                  <span className="text-[10px] font-jetbrains text-white/20">
                    Last {history.length}
                  </span>
                </div>
                {history.length === 0 ? (
                  <p className="text-xs font-jetbrains text-white/20 text-center py-2">
                    No results yet
                  </p>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    {history.slice(0, 10).map((entry, idx) => (
                      <HistoryDot key={`${entry.timestamp}-${idx}`} entry={entry} />
                    ))}
                  </div>
                )}

                {/* Legend */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.04]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-[10px] font-jetbrains text-white/25">
                      Win
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-danger" />
                    <span className="text-[10px] font-jetbrains text-white/25">
                      Lose
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-accent-purple" />
                    <span className="text-[10px] font-jetbrains text-white/25">
                      System Wipe
                    </span>
                  </div>
                </div>
              </div>

              {/* Back to lobby */}
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-accent-blue transition-colors font-jetbrains"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back to Lobby
              </Link>
            </div>

            {/* ============================================================ */}
            {/*  Right Column - Sidebar                                      */}
            {/* ============================================================ */}
            <div className="space-y-6">
              {/* Probability Monitor */}
              <ProbabilityMonitor
                slotsRemaining={slotsRemaining}
                potAmount={potTotal}
                countdown={countdown}
                heatLevel={heatLevel}
              />

              {/* Pot info card */}
              <div className="bg-surface rounded-xl border border-white/[0.06] p-4 space-y-3">
                <h4 className="text-[11px] font-jetbrains text-white/40 uppercase tracking-widest">
                  Pot Summary
                </h4>
                <div className="text-center py-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                  <GlowText color="purple" size="lg" as="div" className="font-orbitron">
                    ${formatUsdc(potTotal)}
                  </GlowText>
                  <p className="text-[10px] font-jetbrains text-white/25 mt-1">
                    Total Pot Value
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="py-2 bg-white/[0.02] rounded-lg">
                    <span className="block text-sm font-jetbrains font-bold text-accent-blue">
                      {slotsRemaining}
                    </span>
                    <span className="text-[10px] font-jetbrains text-white/25">
                      Active
                    </span>
                  </div>
                  <div className="py-2 bg-white/[0.02] rounded-lg">
                    <span className="block text-sm font-jetbrains font-bold text-danger">
                      {eliminatedSlots.size}
                    </span>
                    <span className="text-[10px] font-jetbrains text-white/25">
                      Eliminated
                    </span>
                  </div>
                </div>
              </div>

              {/* Slot status grid (mini) */}
              <div className="bg-surface rounded-xl border border-white/[0.06] p-4">
                <h4 className="text-[11px] font-jetbrains text-white/40 uppercase tracking-widest mb-3">
                  Slot Status
                </h4>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
                    const elim = eliminatedSlots.has(i);
                    const color = SLOT_COLORS[i];
                    return (
                      <div
                        key={i}
                        className={[
                          'w-full aspect-square rounded-sm flex items-center justify-center text-[8px] font-jetbrains font-bold',
                          elim
                            ? 'bg-white/[0.03] text-white/15'
                            : color === 'green'
                              ? 'bg-emerald-700/40 text-emerald-300/80'
                              : color === 'red'
                                ? 'bg-red-800/40 text-red-300/80'
                                : 'bg-white/[0.06] text-white/50',
                          selectedNumber === i && !elim
                            ? 'ring-1 ring-accent-blue'
                            : '',
                        ].join(' ')}
                        title={`Slot ${i}${elim ? ' (eliminated)' : ''}`}
                      >
                        {elim ? 'X' : i}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Connection info */}
              <div className="bg-surface rounded-xl border border-white/[0.06] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="text-[10px] font-jetbrains text-white/30 uppercase tracking-widest">
                    Connected
                  </span>
                </div>
                <div className="space-y-1 text-[10px] font-jetbrains text-white/20">
                  <p>
                    Table:{' '}
                    <span className="text-white/40">
                      {tableAddress
                        ? truncateAddress(tableAddress)
                        : `#${tableId}`}
                    </span>
                  </p>
                  <p>
                    Network:{' '}
                    <span className="text-white/40">Base</span>
                  </p>
                  <p>
                    Polling:{' '}
                    <span className="text-white/40">5s</span>
                  </p>
                </div>

                {/* Terminal cursor */}
                <div
                  className="flex items-center gap-1 mt-3 pt-2 border-t border-white/[0.04]"
                  aria-hidden="true"
                >
                  <span className="text-[10px] text-success/40">$</span>
                  <span className="text-[10px] text-white/15">
                    table_connected
                  </span>
                  <span className="w-1.5 h-3 bg-success/50 animate-pulse" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
