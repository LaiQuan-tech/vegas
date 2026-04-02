'use client';

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { GlowText } from '../ui/GlowText';
import { useUsdcBalance } from '@/hooks/useUsdcBalance';

interface HeaderProps {
  className?: string;
}

const UsdcBadge: React.FC = () => {
  const { formatted, isLoading } = useUsdcBalance();

  if (isLoading) {
    return (
      <span className="text-xs font-jetbrains text-white/40 animate-pulse">
        USDC ...
      </span>
    );
  }

  if (formatted === undefined) return null;

  const display = parseFloat(formatted).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-white/[0.06] text-sm font-jetbrains"
      aria-label={`USDC balance: ${display}`}
    >
      <span className="text-white/40">USDC</span>
      <GlowText color="blue" size="sm" className="font-bold">
        {display}
      </GlowText>
    </span>
  );
};

const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  return (
    <header
      className={[
        'w-full border-b border-white/[0.06]',
        'bg-bg/80 backdrop-blur-xl',
        'sticky top-0 z-40',
        className,
      ].join(' ')}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group" aria-label="CyberRoulette home">
            {/* Neon diamond icon */}
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-lg bg-accent-blue/20 rotate-45 group-hover:bg-accent-blue/30 transition-colors"
                style={{
                  boxShadow: '0 0 15px rgba(0,212,255,0.2)',
                }}
              />
              <span className="relative text-accent-blue font-orbitron font-black text-sm">
                CR
              </span>
            </div>

            <GlowText
              color="blue"
              size="lg"
              as="span"
              className="font-orbitron tracking-[0.15em] hidden sm:inline"
            >
              CYBERROULETTE
            </GlowText>
          </a>

          {/* Right side: USDC balance + wallet */}
          <div className="flex items-center gap-3">
            <UsdcBadge />
            <ConnectButton
              chainStatus="icon"
              showBalance={false}
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export { Header, type HeaderProps };
