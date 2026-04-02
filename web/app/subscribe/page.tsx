"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import Link from "next/link";

export default function SubscribePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="font-orbitron text-xl font-bold tracking-wider">
              <span className="text-accent-blue">CYBER</span>
              <span className="text-accent-purple">ROULETTE</span>
            </h1>
          </Link>
          <ConnectButton />
        </div>
      </header>

      {/* Subscribe Content */}
      <main className="mx-auto max-w-3xl px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="font-orbitron text-3xl font-bold mb-2">
            Subscribe
          </h2>
          <p className="text-white/50 mb-8">
            Get access to exclusive tables and features.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Free Tier */}
            <div className="rounded-xl border border-white/10 bg-surface p-8">
              <h3 className="font-orbitron text-lg font-semibold text-white mb-2">
                Free
              </h3>
              <p className="font-jetbrains text-3xl font-bold text-accent-blue mb-4">
                $0
              </p>
              <ul className="space-y-2 text-sm text-white/50 text-left">
                <li>Access to public tables</li>
                <li>Basic statistics</li>
                <li>Community chat</li>
              </ul>
            </div>

            {/* Pro Tier */}
            <div className="rounded-xl border border-accent-purple/50 bg-surface p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 rounded-bl-lg bg-accent-purple px-3 py-1 text-xs font-bold text-white">
                PRO
              </div>
              <h3 className="font-orbitron text-lg font-semibold text-white mb-2">
                Pro
              </h3>
              <p className="font-jetbrains text-3xl font-bold text-accent-purple mb-4">
                TBD
              </p>
              <ul className="space-y-2 text-sm text-white/50 text-left">
                <li>VIP tables access</li>
                <li>Advanced analytics</li>
                <li>Priority support</li>
                <li>Custom themes</li>
              </ul>
            </div>
          </div>

          <Link
            href="/"
            className="mt-8 inline-block rounded-lg border border-white/10 px-6 py-3 text-sm text-white/60 transition-colors hover:border-accent-blue/50 hover:text-accent-blue"
          >
            Back to Lobby
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
