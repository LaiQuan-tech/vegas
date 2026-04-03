'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  playBetSound,
  playSpinSound,
  playWinSound,
  playLoseSound,
  playSystemWipeSound,
  playSlotRemoveSound,
  playCountdownTick,
  playAlertSound,
  setVolume as setGlobalVolume,
  getVolume,
  toggleMute as globalToggleMute,
  isMuted as globalIsMuted,
} from '../lib/sounds';

const STORAGE_KEY_VOLUME = 'cyberroulette:volume';
const STORAGE_KEY_MUTED = 'cyberroulette:muted';

export interface UseSoundReturn {
  playBet: () => void;
  playSpin: () => void;
  playWin: () => void;
  playLose: () => void;
  playWipe: () => void;
  playSlotRemove: () => void;
  playTick: () => void;
  playAlert: () => void;
  volume: number;
  setVolume: (v: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
}

export function useSound(): UseSoundReturn {
  const [volume, setVolumeState] = useState(0.5);
  const [muted, setMutedState] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const savedVolume = localStorage.getItem(STORAGE_KEY_VOLUME);
      const savedMuted = localStorage.getItem(STORAGE_KEY_MUTED);

      if (savedVolume !== null) {
        const v = parseFloat(savedVolume);
        if (!isNaN(v)) {
          setVolumeState(v);
          setGlobalVolume(v);
        }
      }

      if (savedMuted !== null) {
        const m = savedMuted === 'true';
        setMutedState(m);
        // Sync the global mute state if it differs
        if (m !== globalIsMuted()) {
          globalToggleMute();
        }
      }
    } catch {
      // localStorage may be unavailable (SSR, private browsing, etc.)
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    setGlobalVolume(clamped);
    try {
      localStorage.setItem(STORAGE_KEY_VOLUME, String(clamped));
    } catch {
      // noop
    }
  }, []);

  const toggleMute = useCallback(() => {
    const nowMuted = globalToggleMute();
    setMutedState(nowMuted);
    try {
      localStorage.setItem(STORAGE_KEY_MUTED, String(nowMuted));
    } catch {
      // noop
    }
  }, []);

  return {
    playBet: playBetSound,
    playSpin: playSpinSound,
    playWin: playWinSound,
    playLose: playLoseSound,
    playWipe: playSystemWipeSound,
    playSlotRemove: playSlotRemoveSound,
    playTick: playCountdownTick,
    playAlert: playAlertSound,
    volume,
    setVolume,
    isMuted: muted,
    toggleMute,
  };
}
