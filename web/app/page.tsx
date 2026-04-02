"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import Link from "next/link";

const PLACEHOLDER_TABLES = [
  { id: "1", name: "High Rollers", minBet: "0.1 ETH", players: 5, maxPlayers: 8 },
  { id: "2", name: "Beginners", minBet: "0.01 ETH", players: 3, maxPlayers: 8 },
  { id: "3", name: "VIP Lounge", minBet: "1 ETH", players: 2, maxPlayers: 4 },
  { id: "4", name: "Quick Spin", minBet: "0.005 ETH", players: 7, maxPlayers: 10 },
];

export default function LobbyPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="font-orbitron text-2xl font-bold tracking-wider">
              <span className="text-accent-blue">CYBER</span>
              <span className="text-accent-purple">ROULETTE</span>
            </h1>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/subscribe"
              className="text-sm text-white/60 transition-colors hover:text-accent-blue"
            >
              Subscribe
            </Link>
          </nav>

          <ConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-orbitron text-3xl font-bold mb-2">
            Choose Your Table
          </h2>
          <p className="text-white/50 mb-8">
            Select a table to join or create your own.
          </p>
        </motion.div>

        {/* Table Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {PLACEHOLDER_TABLES.map((table, i) => (
            <motion.div
              key={table.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Link href={`/table/${table.id}`}>
                <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-surface p-6 transition-all hover:border-accent-blue/50 hover:shadow-lg hover:shadow-accent-blue/10">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-orbitron text-lg font-semibold text-white">
                      {table.name}
                    </h3>
                    <span className="rounded-full bg-accent-blue/10 px-3 py-1 font-jetbrains text-xs text-accent-blue">
                      {table.minBet}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-white/50">
                    <span>
                      Players: {table.players}/{table.maxPlayers}
                    </span>
                    <span className="text-success">Live</span>
                  </div>

                  {/* Progress bar for player count */}
                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-purple transition-all"
                      style={{
                        width: `${(table.players / table.maxPlayers) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
