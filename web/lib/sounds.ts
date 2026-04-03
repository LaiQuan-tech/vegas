/**
 * CyberRoulette Sound Manager
 *
 * Generates all sounds programmatically using the Web Audio API.
 * No external audio files are needed. Every sound has a cyberpunk /
 * electronic aesthetic built from oscillators, noise bursts, and
 * filter sweeps.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let _volume = 0.5;
let _muted = false;

// ---------------------------------------------------------------------------
// Lazy AudioContext bootstrap (must be called after a user gesture)
// ---------------------------------------------------------------------------

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = _muted ? 0 : _volume;
    masterGain.connect(audioCtx.destination);
  }

  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  return audioCtx;
}

function getMaster(): GainNode {
  getContext();
  return masterGain!;
}

// ---------------------------------------------------------------------------
// Volume / mute helpers
// ---------------------------------------------------------------------------

export function setVolume(v: number): void {
  _volume = Math.max(0, Math.min(1, v));
  if (masterGain && !_muted) {
    masterGain.gain.setValueAtTime(_volume, audioCtx!.currentTime);
  }
}

export function getVolume(): number {
  return _volume;
}

export function toggleMute(): boolean {
  _muted = !_muted;
  if (masterGain) {
    masterGain.gain.setValueAtTime(
      _muted ? 0 : _volume,
      audioCtx!.currentTime,
    );
  }
  return _muted;
}

export function isMuted(): boolean {
  return _muted;
}

// ---------------------------------------------------------------------------
// Utility: create a white-noise buffer
// ---------------------------------------------------------------------------

function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// ---------------------------------------------------------------------------
// Sound: Bet click / beep
// ---------------------------------------------------------------------------

export function playBetSound(): void {
  const ctx = getContext();
  const master = getMaster();
  const now = ctx.currentTime;

  // Short digital click — square wave blip
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(1800, now);
  osc.frequency.exponentialRampToValueAtTime(2400, now + 0.03);

  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gain);
  gain.connect(master);

  osc.start(now);
  osc.stop(now + 0.08);
}

// ---------------------------------------------------------------------------
// Sound: Roulette spinning whir (oscillator sweep)
// ---------------------------------------------------------------------------

export function playSpinSound(): void {
  const ctx = getContext();
  const master = getMaster();
  const now = ctx.currentTime;
  const duration = 2.5;

  // Primary whirring oscillator — sawtooth sweep
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(80, now);
  osc1.frequency.exponentialRampToValueAtTime(600, now + 0.6);
  osc1.frequency.exponentialRampToValueAtTime(200, now + duration);

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(400, now);
  filter.frequency.exponentialRampToValueAtTime(2000, now + 0.5);
  filter.frequency.exponentialRampToValueAtTime(300, now + duration);
  filter.Q.value = 2;

  gain1.gain.setValueAtTime(0.25, now);
  gain1.gain.setValueAtTime(0.25, now + duration * 0.6);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc1.connect(filter);
  filter.connect(gain1);
  gain1.connect(master);

  osc1.start(now);
  osc1.stop(now + duration);

  // Secondary — clicking ticks that slow down
  const tickCount = 24;
  for (let i = 0; i < tickCount; i++) {
    // Ticks accelerate then decelerate
    const t = (i / tickCount);
    const spacing = 0.04 + t * t * 0.18;
    const tickTime = now + i * spacing;
    if (tickTime > now + duration) break;

    const tickOsc = ctx.createOscillator();
    const tickGain = ctx.createGain();

    tickOsc.type = 'square';
    tickOsc.frequency.setValueAtTime(3000 - i * 60, tickTime);

    tickGain.gain.setValueAtTime(0.12, tickTime);
    tickGain.gain.exponentialRampToValueAtTime(0.001, tickTime + 0.02);

    tickOsc.connect(tickGain);
    tickGain.connect(master);

    tickOsc.start(tickTime);
    tickOsc.stop(tickTime + 0.025);
  }
}

// ---------------------------------------------------------------------------
// Sound: Win — triumphant ascending tones
// ---------------------------------------------------------------------------

export function playWinSound(): void {
  const ctx = getContext();
  const master = getMaster();
  const now = ctx.currentTime;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  const noteSpacing = 0.12;

  notes.forEach((freq, i) => {
    const t = now + i * noteSpacing;

    // Main tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
    gain.gain.setValueAtTime(0.25, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(master);

    osc.start(t);
    osc.stop(t + 0.35);

    // Shimmer overtone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, t);

    gain2.gain.setValueAtTime(0, t);
    gain2.gain.linearRampToValueAtTime(0.08, t + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc2.connect(gain2);
    gain2.connect(master);

    osc2.start(t);
    osc2.stop(t + 0.4);
  });

  // Final sparkle sweep
  const sweepTime = now + notes.length * noteSpacing;
  const sweepOsc = ctx.createOscillator();
  const sweepGain = ctx.createGain();
  const sweepFilter = ctx.createBiquadFilter();

  sweepOsc.type = 'sawtooth';
  sweepOsc.frequency.setValueAtTime(2000, sweepTime);
  sweepOsc.frequency.exponentialRampToValueAtTime(6000, sweepTime + 0.15);

  sweepFilter.type = 'bandpass';
  sweepFilter.frequency.setValueAtTime(3000, sweepTime);
  sweepFilter.Q.value = 5;

  sweepGain.gain.setValueAtTime(0.1, sweepTime);
  sweepGain.gain.exponentialRampToValueAtTime(0.001, sweepTime + 0.3);

  sweepOsc.connect(sweepFilter);
  sweepFilter.connect(sweepGain);
  sweepGain.connect(master);

  sweepOsc.start(sweepTime);
  sweepOsc.stop(sweepTime + 0.3);
}

// ---------------------------------------------------------------------------
// Sound: Lose — short descending tone
// ---------------------------------------------------------------------------

export function playLoseSound(): void {
  const ctx = getContext();
  const master = getMaster();
  const now = ctx.currentTime;

  // Descending sawtooth with low-pass filter
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(500, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.4);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);

  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(master);

  osc.start(now);
  osc.stop(now + 0.5);

  // Secondary sub-bass thud
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();

  sub.type = 'sine';
  sub.frequency.setValueAtTime(80, now);
  sub.frequency.exponentialRampToValueAtTime(40, now + 0.3);

  subGain.gain.setValueAtTime(0.3, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  sub.connect(subGain);
  subGain.connect(master);

  sub.start(now);
  sub.stop(now + 0.35);
}

// ---------------------------------------------------------------------------
// Sound: System wipe — alarm/siren + bass drop
// ---------------------------------------------------------------------------

export function playSystemWipeSound(): void {
  const ctx = getContext();
  const master = getMaster();
  const now = ctx.currentTime;
  const duration = 1.8;

  // Alarm siren — oscillating between two pitches
  const siren = ctx.createOscillator();
  const sirenGain = ctx.createGain();

  siren.type = 'square';
  // Create siren effect with rapid frequency modulation
  siren.frequency.setValueAtTime(800, now);
  const steps = 12;
  for (let i = 0; i < steps; i++) {
    const t = now + (i / steps) * duration * 0.7;
    const freq = i % 2 === 0 ? 800 : 1200;
    siren.frequency.setValueAtTime(freq, t);
  }

  sirenGain.gain.setValueAtTime(0.2, now);
  sirenGain.gain.setValueAtTime(0.2, now + duration * 0.6);
  sirenGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  siren.connect(sirenGain);
  sirenGain.connect(master);

  siren.start(now);
  siren.stop(now + duration);

  // Bass drop — massive sub sweep
  const bass = ctx.createOscillator();
  const bassGain = ctx.createGain();

  bass.type = 'sine';
  bass.frequency.setValueAtTime(200, now + 0.6);
  bass.frequency.exponentialRampToValueAtTime(25, now + duration);

  bassGain.gain.setValueAtTime(0, now);
  bassGain.gain.setValueAtTime(0.4, now + 0.6);
  bassGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  bass.connect(bassGain);
  bassGain.connect(master);

  bass.start(now + 0.6);
  bass.stop(now + duration);

  // Noise burst at the impact point
  const noiseBuffer = createNoiseBuffer(ctx, 0.4);
  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  const noiseFilter = ctx.createBiquadFilter();

  noise.buffer = noiseBuffer;

  noiseFilter.type = 'highpass';
  noiseFilter.frequency.setValueAtTime(1000, now + 0.6);
  noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 1.0);

  noiseGain.gain.setValueAtTime(0.25, now + 0.6);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);

  noise.start(now + 0.6);
  noise.stop(now + 1.0);
}

// ---------------------------------------------------------------------------
// Sound: Slot remove — digital glitch / static burst
// ---------------------------------------------------------------------------

export function playSlotRemoveSound(): void {
  const ctx = getContext();
  const master = getMaster();
  const now = ctx.currentTime;

  // White-noise static burst through bandpass
  const noiseBuffer = createNoiseBuffer(ctx, 0.25);
  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  const noiseFilter = ctx.createBiquadFilter();

  noise.buffer = noiseBuffer;

  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(4000, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(800, now + 0.2);
  noiseFilter.Q.value = 3;

  noiseGain.gain.setValueAtTime(0.3, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);

  noise.start(now);
  noise.stop(now + 0.25);

  // Digital glitch — rapid random-pitch square-wave stabs
  const glitchCount = 6;
  for (let i = 0; i < glitchCount; i++) {
    const t = now + i * 0.03;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(200 + Math.random() * 3000, t);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    osc.connect(gain);
    gain.connect(master);

    osc.start(t);
    osc.stop(t + 0.025);
  }

  // Pitched-down sweep for "removal" feel
  const sweep = ctx.createOscillator();
  const sweepGain = ctx.createGain();

  sweep.type = 'sawtooth';
  sweep.frequency.setValueAtTime(1200, now);
  sweep.frequency.exponentialRampToValueAtTime(60, now + 0.2);

  sweepGain.gain.setValueAtTime(0.15, now);
  sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  sweep.connect(sweepGain);
  sweepGain.connect(master);

  sweep.start(now);
  sweep.stop(now + 0.22);
}

// ---------------------------------------------------------------------------
// Sound: Countdown tick
// ---------------------------------------------------------------------------

export function playCountdownTick(): void {
  const ctx = getContext();
  const master = getMaster();
  const now = ctx.currentTime;

  // Sharp metallic tick
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(3200, now);
  osc.frequency.exponentialRampToValueAtTime(2200, now + 0.03);

  filter.type = 'highpass';
  filter.frequency.value = 1500;

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(master);

  osc.start(now);
  osc.stop(now + 0.06);

  // Subtle body click
  const body = ctx.createOscillator();
  const bodyGain = ctx.createGain();

  body.type = 'triangle';
  body.frequency.setValueAtTime(800, now);

  bodyGain.gain.setValueAtTime(0.12, now);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

  body.connect(bodyGain);
  bodyGain.connect(master);

  body.start(now);
  body.stop(now + 0.04);
}

// ---------------------------------------------------------------------------
// Sound: Alert / notification ping
// ---------------------------------------------------------------------------

export function playAlertSound(): void {
  const ctx = getContext();
  const master = getMaster();
  const now = ctx.currentTime;

  // Two-tone digital ping (ascending)
  const freqs = [1400, 2100];

  freqs.forEach((freq, i) => {
    const t = now + i * 0.1;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(master);

    osc.start(t);
    osc.stop(t + 0.25);

    // Harmonic shimmer
    const harm = ctx.createOscillator();
    const harmGain = ctx.createGain();

    harm.type = 'sine';
    harm.frequency.setValueAtTime(freq * 2.5, t);

    harmGain.gain.setValueAtTime(0.06, t);
    harmGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    harm.connect(harmGain);
    harmGain.connect(master);

    harm.start(t);
    harm.stop(t + 0.2);
  });
}
