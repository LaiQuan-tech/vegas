'use client';

import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { ADDRESSES } from '@/lib/contracts';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    num: 1,
    icon: '01',
    title: 'Connect Wallet',
    desc: 'Link your wallet and fund it with USDC on Base. No gas tokens needed beyond a tiny ETH amount for Base fees.',
    color: 'blue' as const,
  },
  {
    num: 2,
    icon: '02',
    title: 'Pick a Table & Number',
    desc: 'Choose an active table, then select any available number from 1-36. Each number is a unique slot on the wheel.',
    color: 'purple' as const,
  },
  {
    num: 3,
    icon: '03',
    title: 'Place Your Bet',
    desc: 'Confirm your USDC wager. Your bet is locked on-chain in the smart contract until the round resolves.',
    color: 'blue' as const,
  },
  {
    num: 4,
    icon: '04',
    title: 'Win: Payout + Legacy Pot',
    desc: 'If the ball lands on your number, you receive the full payout plus your share of the Legacy Pot. The table resets.',
    color: 'green' as const,
  },
  {
    num: 5,
    icon: '05',
    title: 'Lose: Number Removed',
    desc: 'If you lose, your number is eliminated from the wheel. Fewer remaining slots mean higher odds and bigger payouts for everyone left.',
    color: 'orange' as const,
  },
  {
    num: 6,
    icon: '06',
    title: 'Zero Hit: System Wipe',
    desc: 'If the ball lands on 0, all bets are swept. Funds split between the Legacy Pot and the platform. Table resets fresh.',
    color: 'red' as const,
  },
];

const ODDS_DATA = [
  { slots: 36, winRate: '2.78%', payout: '36x', potUnlock: '0%' },
  { slots: 30, winRate: '3.33%', payout: '30x', potUnlock: '16.7%' },
  { slots: 24, winRate: '4.17%', payout: '24x', potUnlock: '33.3%' },
  { slots: 18, winRate: '5.56%', payout: '18x', potUnlock: '50.0%' },
  { slots: 12, winRate: '8.33%', payout: '12x', potUnlock: '66.7%' },
  { slots: 6,  winRate: '16.7%', payout: '6x',  potUnlock: '83.3%' },
  { slots: 3,  winRate: '33.3%', payout: '3x',  potUnlock: '91.7%' },
  { slots: 1,  winRate: '100%',  payout: '1x',  potUnlock: '97.2%' },
];

const TRANSPARENCY_ITEMS = [
  {
    label: 'Provably Fair',
    desc: 'Chainlink VRF generates verifiable randomness on-chain. No server-side seeds, no manipulation.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
  },
  {
    label: 'On-Chain',
    desc: 'All funds are held in auditable smart contracts on Base. No custodial wallets, no IOUs.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
  },
  {
    label: 'Open Source',
    desc: 'Contract code is verified on Basescan. Audit the logic yourself.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
      </svg>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Pot Progress Bar                                                   */
/* ------------------------------------------------------------------ */

const POT_MARKERS = [
  { slots: 36, pct: 0 },
  { slots: 24, pct: 33 },
  { slots: 12, pct: 67 },
  { slots: 6, pct: 83 },
  { slots: 1, pct: 97 },
];

function PotProgressBar() {
  return (
    <div className="mt-8 space-y-3">
      <div className="flex items-center justify-between text-xs font-jetbrains text-white/40">
        <span>36 slots / 0% unlock</span>
        <span>1 slot / 97% unlock</span>
      </div>
      <div className="relative h-4 rounded-full bg-surface border border-white/[0.06] overflow-hidden">
        {/* Gradient fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: '100%',
            background: 'linear-gradient(90deg, rgba(0,212,255,0.15) 0%, rgba(184,41,221,0.5) 50%, rgba(255,107,43,0.9) 100%)',
          }}
        />
        {/* Animated shimmer */}
        <div
          className="absolute inset-0 rounded-full animate-pulse opacity-30"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
          }}
        />
      </div>
      {/* Markers */}
      <div className="relative h-6">
        {POT_MARKERS.map((m) => (
          <div
            key={m.slots}
            className="absolute flex flex-col items-center -translate-x-1/2"
            style={{ left: `${m.pct}%` }}
          >
            <div className="w-px h-2 bg-white/20" />
            <span className="text-[10px] font-jetbrains text-white/30 mt-0.5 whitespace-nowrap">
              {m.slots}s / {m.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Seat Relay Hunter Tiers                                            */
/* ------------------------------------------------------------------ */

const HUNTER_TIERS = [
  { name: 'Scout', price: 'Free', features: ['Basic seat alerts', 'Public tables only'] },
  { name: 'Tracker', price: '10 USDC/mo', features: ['Priority alerts', 'Tail-knife analytics', 'All tables'] },
  { name: 'Predator', price: '50 USDC/mo', features: ['Instant alerts', 'Auto-claim bot', 'Advanced analytics', 'Custom filters'] },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HowToPlayPage() {
  return (
    <div className="flex flex-col min-h-screen bg-bg text-white">
      <Header />

      <main className="flex-1">
        {/* ========== HERO ========== */}
        <section className="relative overflow-hidden">
          {/* Background grid + glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(0,212,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.3) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              }}
            />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, rgba(184,41,221,0.04) 40%, transparent 70%)',
              }}
            />
          </div>

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent-blue/20 bg-accent-blue/5 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
              <span className="text-xs font-jetbrains text-accent-blue/80 uppercase tracking-widest">
                On-Chain Roulette on Base
              </span>
            </div>

            <GlowText
              as="h1"
              color="blue"
              size="2xl"
              className="font-orbitron tracking-[0.12em] leading-tight"
            >
              HOW CYBERROULETTE WORKS
            </GlowText>

            <p className="mt-6 text-lg text-white/50 max-w-2xl mx-auto leading-relaxed font-inter">
              A provably fair, elimination-style roulette game where every lost bet shrinks the wheel,
              every remaining player gets better odds, and the Legacy Pot grows until someone claims it all.
            </p>
          </div>
        </section>

        {/* ========== GAME MECHANICS ========== */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <GlowText as="h2" color="purple" size="xl" className="font-orbitron tracking-wider">
              GAME MECHANICS
            </GlowText>
            <p className="mt-3 text-sm text-white/40 font-jetbrains">
              Six steps from connect to collect
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {STEPS.map((step) => (
              <Card
                key={step.num}
                glowColor={step.color}
                className="relative group"
              >
                {/* Step number badge */}
                <div
                  className="absolute -top-3 -left-3 w-10 h-10 rounded-lg bg-surface border border-white/[0.08] flex items-center justify-center font-orbitron text-xs font-bold"
                  style={{
                    color: `var(--tw-shadow-color, rgba(255,255,255,0.5))`,
                  }}
                >
                  <GlowText color={step.color} size="sm" className="font-orbitron">
                    {step.icon}
                  </GlowText>
                </div>

                <div className="pt-4">
                  <h3 className="font-orbitron text-sm font-bold tracking-wider text-white/90 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-white/40 leading-relaxed font-inter">
                    {step.desc}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ========== THE LEGACY POT ========== */}
        <section className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent-purple/[0.02] to-transparent pointer-events-none" />

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-10">
              <GlowText as="h2" color="orange" size="xl" className="font-orbitron tracking-wider">
                THE LEGACY POT
              </GlowText>
              <p className="mt-3 text-sm text-white/40 font-jetbrains">
                The jackpot that grows with every loss
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <Card glowColor="orange" className="text-center">
                <div className="text-3xl font-orbitron font-black text-accent-orange mb-2"
                  style={{ textShadow: '0 0 20px rgba(255,107,43,0.4)' }}>
                  15%
                </div>
                <p className="text-xs text-white/40 font-jetbrains uppercase tracking-wider">
                  Of every losing bet
                </p>
                <p className="mt-2 text-sm text-white/50 font-inter">
                  Every time a player loses, 15% of their wager flows directly into the Legacy Pot.
                </p>
              </Card>

              <Card glowColor="purple" className="text-center">
                <div className="text-3xl font-orbitron font-black text-accent-purple mb-2"
                  style={{ textShadow: '0 0 20px rgba(184,41,221,0.4)' }}>
                  0-97%
                </div>
                <p className="text-xs text-white/40 font-jetbrains uppercase tracking-wider">
                  Unlock range
                </p>
                <p className="mt-2 text-sm text-white/50 font-inter">
                  The percentage of the pot you can claim scales with how few slots remain on the wheel.
                </p>
              </Card>

              <Card glowColor="green" className="text-center">
                <div className="text-3xl font-orbitron font-black text-success mb-2"
                  style={{ textShadow: '0 0 20px rgba(0,255,136,0.4)' }}>
                  WIN
                </div>
                <p className="text-xs text-white/40 font-jetbrains uppercase tracking-wider">
                  Claim on victory
                </p>
                <p className="mt-2 text-sm text-white/50 font-inter">
                  When you win, you receive your payout plus the unlocked percentage of the Legacy Pot automatically.
                </p>
              </Card>
            </div>

            <Card glowColor="none" className="bg-surface/60 border-white/[0.04]">
              <h3 className="text-sm font-orbitron font-bold text-white/70 tracking-wider mb-1">
                POT UNLOCK PROGRESSION
              </h3>
              <p className="text-xs text-white/30 font-jetbrains mb-2">
                As numbers are eliminated, the unlock percentage climbs toward 97%
              </p>
              <PotProgressBar />
            </Card>
          </div>
        </section>

        {/* ========== SEAT RELAY ========== */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <GlowText as="h2" color="blue" size="xl" className="font-orbitron tracking-wider">
              SEAT RELAY
            </GlowText>
            <p className="mt-3 text-sm text-white/40 font-jetbrains">
              Abandon, claim, and outmaneuver
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
            <Card glowColor="blue">
              <h3 className="font-orbitron text-sm font-bold tracking-wider text-white/90 mb-3">
                ABANDON & CLAIM
              </h3>
              <p className="text-sm text-white/50 leading-relaxed font-inter mb-4">
                Any player can abandon their seat at any time, forfeiting their bet. The vacated
                slot becomes claimable by anyone willing to place a new bet at the current table stakes.
              </p>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
                <span className="text-xs font-jetbrains text-white/40">
                  Abandoned slots inherit improved odds from the shrinking wheel
                </span>
              </div>
            </Card>

            <Card glowColor="purple">
              <h3 className="font-orbitron text-sm font-bold tracking-wider text-white/90 mb-3">
                THE TAIL-KNIFE STRATEGY
              </h3>
              <p className="text-sm text-white/50 leading-relaxed font-inter mb-4">
                Wait for the wheel to shrink, then claim an abandoned seat at higher odds. The
                "tail-knife" enters late when the pot unlock is high and fewer numbers remain --
                maximum reward, calculated risk.
              </p>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="w-2 h-2 rounded-full bg-accent-purple animate-pulse" />
                <span className="text-xs font-jetbrains text-white/40">
                  Advanced players monitor tables for optimal entry points
                </span>
              </div>
            </Card>
          </div>

          {/* Hunter Tiers */}
          <h3 className="text-center font-orbitron text-sm font-bold text-white/60 tracking-wider mb-5">
            HUNTER SUBSCRIPTION TIERS
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {HUNTER_TIERS.map((tier, i) => {
              const colors = ['blue', 'purple', 'orange'] as const;
              return (
                <Card key={tier.name} glowColor={colors[i]} className="text-center">
                  <GlowText color={colors[i]} size="lg" as="div" className="font-orbitron mb-1">
                    {tier.name.toUpperCase()}
                  </GlowText>
                  <div className="text-sm font-jetbrains text-white/50 mb-4">{tier.price}</div>
                  <ul className="space-y-2 text-left">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-white/40 font-inter">
                        <span className="text-success mt-0.5 shrink-0">+</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </section>

        {/* ========== ODDS TABLE ========== */}
        <section className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent-blue/[0.015] to-transparent pointer-events-none" />

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-10">
              <GlowText as="h2" color="green" size="xl" className="font-orbitron tracking-wider">
                ODDS TABLE
              </GlowText>
              <p className="mt-3 text-sm text-white/40 font-jetbrains">
                Fewer slots = higher win rate, bigger pot unlock
              </p>
            </div>

            <Card glowColor="none" className="overflow-hidden p-0 bg-surface/60 border-white/[0.04]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" role="table">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['Slots Left', 'Win Rate', 'Payout', 'Pot Unlock'].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-4 text-left font-orbitron text-xs font-bold text-white/40 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ODDS_DATA.map((row, i) => (
                      <tr
                        key={row.slots}
                        className={[
                          'border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]',
                          i === ODDS_DATA.length - 1 ? 'border-b-0' : '',
                        ].join(' ')}
                      >
                        <td className="px-5 py-3.5 font-jetbrains font-bold text-white/70">
                          {row.slots}
                        </td>
                        <td className="px-5 py-3.5 font-jetbrains">
                          <span className="text-success">{row.winRate}</span>
                        </td>
                        <td className="px-5 py-3.5 font-jetbrains">
                          <span className="text-accent-blue">{row.payout}</span>
                        </td>
                        <td className="px-5 py-3.5 font-jetbrains">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] max-w-[120px]">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: row.potUnlock,
                                  background: 'linear-gradient(90deg, #b829dd, #ff6b2b)',
                                }}
                              />
                            </div>
                            <span className="text-accent-orange text-xs">{row.potUnlock}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </section>

        {/* ========== TRANSPARENCY ========== */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <GlowText as="h2" color="blue" size="xl" className="font-orbitron tracking-wider">
              TRANSPARENCY
            </GlowText>
            <p className="mt-3 text-sm text-white/40 font-jetbrains">
              Don't trust, verify
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {TRANSPARENCY_ITEMS.map((item) => (
              <Card key={item.label} glowColor="blue" className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-blue/10 text-accent-blue mb-4 mx-auto">
                  {item.icon}
                </div>
                <h3 className="font-orbitron text-sm font-bold tracking-wider text-white/90 mb-2">
                  {item.label.toUpperCase()}
                </h3>
                <p className="text-sm text-white/40 leading-relaxed font-inter">
                  {item.desc}
                </p>
              </Card>
            ))}
          </div>

          {/* Contract link */}
          <div className="text-center">
            <a
              href={`https://basescan.org/address/${ADDRESSES.factory}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/[0.08] bg-surface hover:border-accent-blue/30 hover:bg-accent-blue/5 transition-all text-sm font-jetbrains text-white/50 hover:text-accent-blue"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              View Contract on Basescan
            </a>
          </div>
        </section>

        {/* ========== CTA ========== */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(0,212,255,0.06) 0%, transparent 60%)',
            }}
          />

          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <GlowText as="h2" color="blue" size="xl" className="font-orbitron tracking-wider mb-4">
              READY TO SPIN?
            </GlowText>
            <p className="text-white/40 font-inter mb-8 max-w-lg mx-auto">
              Connect your wallet, pick a number, and enter the arena.
              The wheel is always turning.
            </p>

            <a
              href="/"
              className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-xl font-orbitron font-bold text-sm tracking-wider uppercase overflow-hidden transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(184,41,221,0.15) 100%)',
                border: '1px solid rgba(0,212,255,0.3)',
                boxShadow: '0 0 30px rgba(0,212,255,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              {/* Hover glow overlay */}
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,212,255,0.25) 0%, rgba(184,41,221,0.25) 100%)',
                }}
              />
              <span className="relative z-10 text-accent-blue">START PLAYING</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="relative z-10 w-5 h-5 text-accent-blue group-hover:translate-x-1 transition-transform"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
