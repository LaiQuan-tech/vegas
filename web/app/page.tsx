'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { TableCard } from '@/components/lobby/TableCard';
import { GlowText } from '@/components/ui/GlowText';
import { useLobbyData } from '@/hooks/useLobbyData';
import {
  type TableState,
  formatUsdc,
  getLiquidationCountdown,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Filter & Sort Types
// ---------------------------------------------------------------------------

type FilterTab = 'all' | 'hot' | 'critical';
type SortOption = 'pot' | 'slots' | 'newest';

const FILTER_TABS: { key: FilterTab; label: string; description: string }[] = [
  { key: 'all', label: 'All Tables', description: 'Every active table' },
  { key: 'hot', label: 'Hot', description: '10 or fewer slots' },
  { key: 'critical', label: 'Critical', description: '5 or fewer slots' },
];

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'pot', label: 'Pot Size' },
  { key: 'slots', label: 'Slots Left' },
  { key: 'newest', label: 'Newest' },
];

// ---------------------------------------------------------------------------
// Skeleton Card
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-surface p-5 flex flex-col gap-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-white/[0.06]" />
        <div className="h-6 w-16 rounded-lg bg-white/[0.06]" />
      </div>
      <div className="flex items-end gap-3">
        <div className="h-12 w-14 rounded bg-white/[0.06]" />
        <div className="flex flex-col gap-1 pb-1">
          <div className="h-3 w-8 rounded bg-white/[0.06]" />
          <div className="h-2 w-10 rounded bg-white/[0.06]" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-14 rounded-lg bg-white/[0.06]" />
        <div className="h-14 rounded-lg bg-white/[0.06]" />
      </div>
      <div className="h-3 w-28 rounded bg-white/[0.06]" />
      <div className="h-10 w-full rounded-xl bg-white/[0.06] mt-auto" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats Bar
// ---------------------------------------------------------------------------

function StatsBar({
  totalTables,
  totalPot,
  activePlayers,
}: {
  totalTables: number;
  totalPot: bigint;
  activePlayers: number;
}) {
  const stats = [
    {
      label: 'Active Tables',
      value: totalTables.toString(),
      color: 'text-accent-blue',
    },
    {
      label: 'Total Pot',
      value: `$${formatUsdc(totalPot)}`,
      color: 'text-success',
    },
    {
      label: 'Active Players',
      value: activePlayers.toString(),
      color: 'text-accent-purple',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-surface/50 px-5 py-4"
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-jetbrains text-white/30 uppercase tracking-widest">
              {stat.label}
            </span>
            <span
              className={`text-xl font-orbitron font-bold tabular-nums ${stat.color}`}
            >
              {stat.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auto-Refresh Indicator
// ---------------------------------------------------------------------------

function RefreshIndicator({
  secondsUntilRefresh,
  onManualRefresh,
  isRefreshing,
}: {
  secondsUntilRefresh: number;
  onManualRefresh: () => void;
  isRefreshing: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            isRefreshing ? 'bg-accent-blue animate-ping' : 'bg-success'
          }`}
        />
        <span className="text-[10px] font-jetbrains text-white/30 uppercase tracking-widest">
          {isRefreshing
            ? 'Refreshing...'
            : `Live \u00B7 ${secondsUntilRefresh}s`}
        </span>
      </div>
      <button
        onClick={onManualRefresh}
        disabled={isRefreshing}
        className="text-[10px] font-jetbrains text-white/20 hover:text-white/50 uppercase tracking-widest transition-colors disabled:opacity-30"
        aria-label="Refresh tables now"
      >
        Refresh
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ filter }: { filter: FilterTab }) {
  const messages: Record<FilterTab, { title: string; body: string }> = {
    all: {
      title: 'No Active Tables',
      body: 'There are no roulette tables running right now. Check back soon or wait for the next round to begin.',
    },
    hot: {
      title: 'No Hot Tables',
      body: 'No tables with 10 or fewer slots remaining. Switch to "All Tables" to see all active games.',
    },
    critical: {
      title: 'No Critical Tables',
      body: 'No tables in the critical zone right now. These are rare high-value opportunities with 5 or fewer slots left.',
    },
  };

  const { title, body } = messages[filter];

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {/* Roulette wheel icon */}
      <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/[0.08] animate-[spin_20s_linear_infinite]" />
        <div className="absolute inset-2 rounded-full border border-white/[0.06]" />
        <span className="text-2xl text-white/10">&#9898;</span>
      </div>
      <h3 className="text-lg font-orbitron text-white/40 mb-2">{title}</h3>
      <p className="text-sm font-jetbrains text-white/20 max-w-md">{body}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// How To Play Section
// ---------------------------------------------------------------------------

function HowToPlay() {
  const steps = [
    {
      number: '01',
      title: 'Connect Wallet',
      body: 'Link your wallet on Base network. You need USDC to place bets.',
      icon: (
        <svg
          className="w-5 h-5 text-accent-blue"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"
          />
        </svg>
      ),
    },
    {
      number: '02',
      title: 'Pick a Table',
      body: 'Each table has 36 slots. The fewer slots left, the bigger the pot and higher the stakes.',
      icon: (
        <svg
          className="w-5 h-5 text-accent-purple"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z"
          />
        </svg>
      ),
    },
    {
      number: '03',
      title: 'Place Your Bet',
      body: 'Bet USDC to fill a slot. Each bet adds to the pot and tightens the countdown timer.',
      icon: (
        <svg
          className="w-5 h-5 text-accent-orange"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      ),
    },
    {
      number: '04',
      title: 'Win or Liquidate',
      body: 'If the timer runs out, the last bettor wins the pot. If all 36 slots fill, the pot is split among all players.',
      icon: (
        <svg
          className="w-5 h-5 text-danger"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z"
          />
        </svg>
      ),
    },
  ];

  return (
    <section className="mt-16 mb-8" aria-labelledby="how-to-play-heading">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        <h2
          id="how-to-play-heading"
          className="font-orbitron text-sm tracking-[0.2em] text-white/30 uppercase"
        >
          How to Play
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((step) => (
          <div
            key={step.number}
            className="relative rounded-xl border border-white/[0.06] bg-surface/30 p-5 group hover:border-white/[0.1] transition-colors"
          >
            {/* Step number */}
            <span className="absolute top-4 right-4 text-[10px] font-jetbrains text-white/10 font-bold">
              {step.number}
            </span>

            <div className="mb-3">{step.icon}</div>

            <h3 className="font-orbitron text-sm font-semibold text-white/80 mb-1.5">
              {step.title}
            </h3>
            <p className="text-xs font-jetbrains text-white/30 leading-relaxed">
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Error State
// ---------------------------------------------------------------------------

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 mb-6 rounded-full border-2 border-danger/30 flex items-center justify-center">
        <svg
          className="w-7 h-7 text-danger"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-orbitron text-white/50 mb-2">
        Connection Error
      </h3>
      <p className="text-sm font-jetbrains text-white/20 max-w-md mb-6">
        Failed to load table data from the blockchain. Please check your network
        connection and try again.
      </p>
      <button
        onClick={onRetry}
        className="px-6 py-2.5 rounded-xl bg-accent-blue/10 border border-accent-blue/30 text-accent-blue text-sm font-jetbrains font-bold uppercase tracking-wider hover:bg-accent-blue/20 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Lobby Page
// ---------------------------------------------------------------------------

export default function LobbyPage() {
  const router = useRouter();
  const { tables, tableCount, isLoading, isError, refetch } = useLobbyData();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [activeSort, setActiveSort] = useState<SortOption>('pot');
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Countdown timer for auto-refresh indicator
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) return 10;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Manual refresh handler
  const handleManualRefresh = useCallback(() => {
    setIsRefreshing(true);
    setSecondsUntilRefresh(10);
    refetch().finally(() => {
      setIsRefreshing(false);
    });
  }, [refetch]);

  // Normalize tables into a usable array
  const tableList = useMemo(() => {
    if (!tables || !Array.isArray(tables)) return [];
    return (tables as TableState[]).map((t, idx) => ({
      ...t,
      tableId: String(idx + 1),
      countdown: getLiquidationCountdown(t.slots, t.timestamp),
    }));
  }, [tables]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    let result = [...tableList];

    switch (activeFilter) {
      case 'hot':
        result = result.filter((t) => t.slots <= 10);
        break;
      case 'critical':
        result = result.filter((t) => t.slots <= 5);
        break;
    }

    switch (activeSort) {
      case 'pot':
        result.sort((a, b) => {
          if (b.pot > a.pot) return 1;
          if (b.pot < a.pot) return -1;
          return 0;
        });
        break;
      case 'slots':
        result.sort((a, b) => a.slots - b.slots);
        break;
      case 'newest':
        result.sort((a, b) => b.timestamp - a.timestamp);
        break;
    }

    return result;
  }, [tableList, activeFilter, activeSort]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalTables = tableList.length;
    const totalPot = tableList.reduce(
      (sum, t) => sum + t.pot,
      0n
    );
    const activePlayers = tableList.filter(
      (t) =>
        t.player &&
        t.player !== '0x0000000000000000000000000000000000000000'
    ).length;
    return { totalTables, totalPot, activePlayers };
  }, [tableList]);

  // Filter counts for badges
  const filterCounts = useMemo(
    () => ({
      all: tableList.length,
      hot: tableList.filter((t) => t.slots <= 10).length,
      critical: tableList.filter((t) => t.slots <= 5).length,
    }),
    [tableList]
  );

  const handleEnterTable = useCallback(
    (tableId: string) => {
      router.push(`/table/${tableId}`);
    },
    [router]
  );

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero heading */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <GlowText
                color="blue"
                size="xl"
                as="h1"
                className="font-orbitron tracking-wider"
              >
                Lobby
              </GlowText>
              {tableCount !== undefined && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-accent-blue/10 border border-accent-blue/20 text-[10px] font-jetbrains text-accent-blue font-bold uppercase tracking-widest">
                  {String(tableCount)} tables
                </span>
              )}
            </div>
            <p className="text-sm font-jetbrains text-white/30 max-w-lg">
              Pick a table, place your bet, and watch the countdown. When time
              runs out, the last bettor takes the entire pot.
            </p>
          </div>

          {/* Stats bar */}
          {!isLoading && !isError && tableList.length > 0 && (
            <div className="mb-8">
              <StatsBar
                totalTables={stats.totalTables}
                totalPot={stats.totalPot}
                activePlayers={stats.activePlayers}
              />
            </div>
          )}

          {/* Controls row: Filters + Sort + Refresh */}
          {!isLoading && !isError && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              {/* Filter tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-surface/50 border border-white/[0.04]">
                {FILTER_TABS.map((tab) => {
                  const isActive = activeFilter === tab.key;
                  const count = filterCounts[tab.key];
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveFilter(tab.key)}
                      className={[
                        'relative px-4 py-2 rounded-lg text-xs font-jetbrains font-bold uppercase tracking-wider transition-all',
                        isActive
                          ? 'bg-white/[0.08] text-white shadow-sm'
                          : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03]',
                      ].join(' ')}
                      aria-pressed={isActive}
                      aria-label={`Filter: ${tab.description}`}
                    >
                      {tab.label}
                      {count > 0 && (
                        <span
                          className={[
                            'ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md text-[10px] tabular-nums',
                            isActive
                              ? 'bg-accent-blue/20 text-accent-blue'
                              : 'bg-white/[0.06] text-white/20',
                          ].join(' ')}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-4">
                {/* Sort dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-jetbrains text-white/20 uppercase tracking-widest">
                    Sort
                  </span>
                  <select
                    value={activeSort}
                    onChange={(e) =>
                      setActiveSort(e.target.value as SortOption)
                    }
                    className="appearance-none bg-surface/50 border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs font-jetbrains text-white/60 focus:outline-none focus:border-accent-blue/30 cursor-pointer"
                    aria-label="Sort tables by"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto-refresh */}
                <RefreshIndicator
                  secondsUntilRefresh={secondsUntilRefresh}
                  onManualRefresh={handleManualRefresh}
                  isRefreshing={isRefreshing}
                />
              </div>
            </div>
          )}

          {/* Content area */}
          {isLoading ? (
            /* Loading skeleton grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : isError ? (
            <ErrorState onRetry={handleManualRefresh} />
          ) : filteredTables.length === 0 ? (
            <EmptyState filter={activeFilter} />
          ) : (
            /* Table grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTables.map((table) => (
                <TableCard
                  key={table.tableId}
                  tableId={table.tableId}
                  slots={table.slots}
                  potAmount={table.pot}
                  currentPlayer={table.player}
                  countdown={table.countdown}
                  onEnter={() => handleEnterTable(table.tableId)}
                />
              ))}
            </div>
          )}

          {/* How to Play */}
          <HowToPlay />
        </div>
      </main>

      <Footer />
    </div>
  );
}
