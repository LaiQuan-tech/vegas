"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function TablePage() {
  const params = useParams<{ id: string }>();

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

      {/* Table Area */}
      <main className="mx-auto max-w-7xl px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="font-orbitron text-3xl font-bold mb-2">
            Table #{params.id}
          </h2>
          <p className="text-white/50 mb-8">
            Roulette table coming soon...
          </p>

          <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-surface p-12">
            <div className="flex flex-col items-center gap-6">
              <div className="h-48 w-48 rounded-full border-4 border-dashed border-accent-purple/30 flex items-center justify-center">
                <span className="font-orbitron text-4xl text-accent-purple/50">
                  ?
                </span>
              </div>
              <p className="font-jetbrains text-sm text-white/40">
                Roulette wheel placeholder
              </p>
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
