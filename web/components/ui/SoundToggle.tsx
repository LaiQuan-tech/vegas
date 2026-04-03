'use client';

import React, { useRef, useState } from 'react';
import { useSound } from '../../hooks/useSound';

/**
 * Compact mute / unmute toggle for the header bar.
 * Shows a volume slider on hover.
 */
export function SoundToggle() {
  const { volume, setVolume, isMuted, toggleMute, playBet } = useSound();
  const [showSlider, setShowSlider] = useState(false);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
    setShowSlider(true);
  };

  const handleMouseLeave = () => {
    hideTimeout.current = setTimeout(() => setShowSlider(false), 300);
  };

  const handleToggle = () => {
    toggleMute();
    // Give audible feedback when un-muting
    if (isMuted) {
      setTimeout(() => playBet(), 50);
    }
  };

  return (
    <div
      className="relative flex items-center gap-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Volume slider — appears on hover */}
      <div
        className={[
          'absolute right-full mr-2 flex items-center',
          'bg-surface/90 backdrop-blur-sm border border-white/10 rounded-lg',
          'px-3 py-1.5 transition-all duration-200',
          showSlider
            ? 'opacity-100 translate-x-0 pointer-events-auto'
            : 'opacity-0 translate-x-2 pointer-events-none',
        ].join(' ')}
      >
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setVolume(v);
            if (isMuted && v > 0) toggleMute();
          }}
          className="
            w-20 h-1 appearance-none cursor-pointer rounded-full
            bg-white/20 accent-accent-blue
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-accent-blue
            [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(0,212,255,0.6)]
            [&::-moz-range-thumb]:w-3
            [&::-moz-range-thumb]:h-3
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-accent-blue
            [&::-moz-range-thumb]:border-0
          "
          aria-label="Volume"
        />
        <span className="ml-2 text-[10px] font-jetbrains text-white/40 w-7 text-right tabular-nums">
          {isMuted ? '0' : Math.round(volume * 100)}
        </span>
      </div>

      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className={[
          'group relative flex items-center justify-center',
          'w-8 h-8 rounded-lg border transition-all duration-200',
          'focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          'outline-none select-none',
          isMuted
            ? 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10 hover:text-white/50'
            : 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue hover:bg-accent-blue/20 hover:shadow-[0_0_12px_rgba(0,212,255,0.2)]',
        ].join(' ')}
        aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <SpeakerOffIcon /> : <SpeakerOnIcon />}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG icons (no external dependency)
// ---------------------------------------------------------------------------

function SpeakerOnIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}
