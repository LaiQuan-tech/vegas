'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/ui/GlowText';
import type { GlowColor } from '@/components/ui/Card';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TierFeature {
  text: string;
  included: boolean;
}

interface Tier {
  id: number;
  name: string;
  tagline: string;
  price: string;
  period: string;
  glowColor: GlowColor;
  textColor: 'blue' | 'purple' | 'orange';
  features: TierFeature[];
  popular?: boolean;
  cta: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const tiers: Tier[] = [
  {
    id: 0,
    name: 'Free Hunter',
    tagline: 'Observe the battlefield',
    price: '$0',
    period: 'forever',
    glowColor: 'none',
    textColor: 'blue',
    features: [
      { text: 'Lobby access & table browsing', included: true },
      { text: '5-10s delayed table data', included: true },
      { text: 'Basic statistics view', included: true },
      { text: 'Telegram alerts', included: false },
      { text: 'WebSocket real-time sync', included: false },
      { text: 'Heat map overlay', included: false },
      { text: 'Priority seat claim', included: false },
      { text: 'Fast bet deep-link', included: false },
    ],
    cta: 'Current Plan',
  },
  {
    id: 1,
    name: 'Pro Hunter',
    tagline: 'Strike with precision',
    price: '$9.90',
    period: '/mo',
    glowColor: 'purple',
    textColor: 'purple',
    popular: true,
    features: [
      { text: 'Lobby access & table browsing', included: true },
      { text: 'Real-time table data', included: true },
      { text: 'Advanced statistics & analytics', included: true },
      { text: 'Telegram alerts at 10 slots', included: true },
      { text: 'WebSocket real-time sync', included: true },
      { text: 'Heat map overlay', included: true },
      { text: 'Priority seat claim', included: false },
      { text: 'Fast bet deep-link', included: false },
    ],
    cta: 'Subscribe',
  },
  {
    id: 2,
    name: 'Apex Predator',
    tagline: 'Dominate every table',
    price: '$29.90',
    period: '/mo',
    glowColor: 'orange',
    textColor: 'orange',
    features: [
      { text: 'Lobby access & table browsing', included: true },
      { text: 'Real-time table data', included: true },
      { text: 'Advanced statistics & analytics', included: true },
      { text: 'Telegram alerts at 5 slots', included: true },
      { text: 'WebSocket real-time sync', included: true },
      { text: 'Heat map overlay', included: true },
      { text: 'Priority seat claim (5s head start)', included: true },
      { text: 'Fast bet deep-link', included: true },
    ],
    cta: 'Upgrade',
  },
];

const faqs: { q: string; a: string }[] = [
  {
    q: 'How do Telegram alerts work?',
    a: 'Once you link your Telegram account via our bot, you will receive instant notifications when a table reaches your tier threshold. Pro Hunter alerts fire at 10 remaining slots. Apex Predator alerts fire earlier at 5 remaining slots, giving you more time to act.',
  },
  {
    q: 'What is priority seat claim?',
    a: 'Apex Predator subscribers get a 5-second exclusive window to claim a seat before the table opens to all users. This gives you a strategic edge on high-value critical tables where every second counts.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Your subscription renews monthly and you can cancel at any time from your account settings. You will retain access to your tier features until the end of your current billing period.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'Subscriptions are paid on-chain with USDC on Base. Simply connect your wallet and approve the transaction. Recurring billing is handled via a smart contract allowance.',
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M3 8.5L6.5 12L13 4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CrossIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M4 4L12 12M12 4L4 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TelegramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.504-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

// ---------------------------------------------------------------------------
// Tier Card
// ---------------------------------------------------------------------------

const TierCard: React.FC<{
  tier: Tier;
  index: number;
}> = ({ tier, index }) => {
  const colorMap: Record<string, string> = {
    blue: 'text-accent-blue',
    purple: 'text-accent-purple',
    orange: 'text-accent-orange',
  };

  const borderHighlight: Record<string, string> = {
    blue: '',
    purple: 'ring-2 ring-accent-purple/30',
    orange: 'ring-2 ring-accent-orange/30',
  };

  const buttonVariantMap: Record<string, 'primary' | 'ghost'> = {
    blue: 'ghost',
    purple: 'primary',
    orange: 'primary',
  };

  const buttonColorOverride: Record<string, string> = {
    blue: '',
    purple:
      'bg-accent-purple/10 text-accent-purple border-accent-purple/40 hover:bg-accent-purple/20 hover:border-accent-purple/70 hover:shadow-[0_0_20px_rgba(184,41,221,0.3)]',
    orange:
      'bg-accent-orange/10 text-accent-orange border-accent-orange/40 hover:bg-accent-orange/20 hover:border-accent-orange/70 hover:shadow-[0_0_20px_rgba(255,107,43,0.3)]',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.12 }}
      className="relative flex"
    >
      {/* Popular badge */}
      {tier.popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-accent-purple text-white text-xs font-bold font-inter uppercase tracking-wider shadow-[0_0_20px_rgba(184,41,221,0.4)]">
            Most Popular
          </span>
        </div>
      )}

      <Card
        glowColor={tier.glowColor}
        className={[
          'flex flex-col w-full p-6 sm:p-8',
          tier.popular ? 'scale-[1.03] sm:scale-105' : '',
          borderHighlight[tier.textColor] ?? '',
        ].join(' ')}
      >
        {/* Tier header */}
        <div className="mb-6">
          <GlowText
            color={tier.textColor}
            size="lg"
            as="h3"
            className="font-orbitron tracking-wider"
          >
            {tier.name}
          </GlowText>
          <p className="text-white/40 text-xs font-jetbrains mt-1 tracking-wide">
            {tier.tagline}
          </p>
        </div>

        {/* Price */}
        <div className="mb-6">
          <span className={`font-orbitron text-4xl font-black ${colorMap[tier.textColor]}`}>
            {tier.price}
          </span>
          <span className="text-white/30 text-sm font-jetbrains ml-1">
            {tier.period}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.06] mb-6" />

        {/* Features */}
        <ul className="flex-1 space-y-3 mb-8" role="list">
          {tier.features.map((feat) => (
            <li
              key={feat.text}
              className="flex items-start gap-3 text-sm"
            >
              {feat.included ? (
                <CheckIcon className={`${colorMap[tier.textColor]} flex-shrink-0 mt-0.5`} />
              ) : (
                <CrossIcon className="text-white/15 flex-shrink-0 mt-0.5" />
              )}
              <span className={feat.included ? 'text-white/70' : 'text-white/25 line-through'}>
                {feat.text}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Button
          variant={buttonVariantMap[tier.textColor]}
          size="lg"
          className={[
            'w-full',
            buttonColorOverride[tier.textColor],
          ].join(' ')}
          disabled={tier.id === 0}
        >
          {tier.cta}
        </Button>
      </Card>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// FAQ Item
// ---------------------------------------------------------------------------

const FaqItem: React.FC<{
  faq: { q: string; a: string };
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ faq, index, isOpen, onToggle }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 + index * 0.08 }}
    >
      <button
        onClick={onToggle}
        className={[
          'w-full flex items-center justify-between gap-4 px-6 py-5',
          'bg-surface border rounded-xl text-left',
          'transition-all duration-300',
          isOpen
            ? 'border-accent-blue/20 shadow-[0_0_20px_rgba(0,212,255,0.06)]'
            : 'border-white/[0.06] hover:border-white/[0.12]',
        ].join(' ')}
        aria-expanded={isOpen}
      >
        <span className="font-inter font-medium text-sm text-white/80">
          {faq.q}
        </span>
        <svg
          className={[
            'flex-shrink-0 w-5 h-5 text-accent-blue/60 transition-transform duration-300',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <motion.div
        initial={false}
        animate={{
          height: isOpen ? 'auto' : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <p className="px-6 pt-3 pb-1 text-sm text-white/45 leading-relaxed font-inter">
          {faq.a}
        </p>
      </motion.div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SubscribePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Background glow effects */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(184,41,221,0.08) 0%, rgba(0,212,255,0.04) 40%, transparent 70%)',
            }}
            aria-hidden="true"
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8 text-center relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <GlowText
                color="blue"
                size="2xl"
                as="h1"
                className="font-orbitron tracking-[0.15em]"
              >
                CHOOSE YOUR EDGE
              </GlowText>
              <p className="mt-4 text-white/40 text-base sm:text-lg font-inter max-w-xl mx-auto leading-relaxed">
                Unlock real-time intelligence, Telegram alerts, and priority
                access to dominate the roulette.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Pricing Tiers */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
            {tiers.map((tier, i) => (
              <TierCard key={tier.id} tier={tier} index={i} />
            ))}
          </div>
        </section>

        {/* Telegram Link Section */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card glowColor="blue" className="p-8 sm:p-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Icon */}
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center">
                  <TelegramIcon className="text-accent-blue w-7 h-7" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <GlowText
                    color="blue"
                    size="lg"
                    as="h2"
                    className="font-orbitron tracking-wider"
                  >
                    LINK YOUR TELEGRAM
                  </GlowText>
                  <p className="mt-2 text-white/40 text-sm font-inter leading-relaxed">
                    Connect your Telegram account to receive real-time alerts
                    when tables reach critical thresholds. Follow the steps
                    below to get started.
                  </p>

                  <div className="mt-5 space-y-3">
                    <Step
                      number={1}
                      text={
                        <>
                          Open our bot at{' '}
                          <a
                            href="https://t.me/CyberRouletteBot"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-blue hover:underline font-jetbrains"
                          >
                            @CyberRouletteBot
                          </a>
                        </>
                      }
                    />
                    <Step
                      number={2}
                      text={
                        <>
                          Send the command{' '}
                          <code className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-accent-blue font-jetbrains text-xs">
                            /link
                          </code>{' '}
                          to start the linking process
                        </>
                      }
                    />
                    <Step
                      number={3}
                      text="Paste your wallet address when prompted to verify ownership"
                    />
                    <Step
                      number={4}
                      text="Done. You will now receive alerts based on your subscription tier"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-center mb-10"
          >
            <GlowText
              color="blue"
              size="xl"
              as="h2"
              className="font-orbitron tracking-[0.12em]"
            >
              FAQ
            </GlowText>
            <p className="mt-2 text-white/35 text-sm font-inter">
              Common questions about subscriptions and features
            </p>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FaqItem
                key={i}
                faq={faq}
                index={i}
                isOpen={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>

          {/* Back to lobby */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-12 text-center"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-white/30 hover:text-accent-blue font-jetbrains uppercase tracking-wider transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Lobby
            </Link>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step indicator for Telegram section
// ---------------------------------------------------------------------------

const Step: React.FC<{
  number: number;
  text: React.ReactNode;
}> = ({ number, text }) => (
  <div className="flex items-start gap-3">
    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center text-accent-blue text-xs font-bold font-jetbrains">
      {number}
    </span>
    <span className="text-sm text-white/50 font-inter pt-0.5">{text}</span>
  </div>
);
