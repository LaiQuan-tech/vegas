'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

// ---------------------------------------------------------------------------
// Standard European roulette order (single-zero)
// ---------------------------------------------------------------------------
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface RouletteWheelProps {
  totalSlots: number;
  eliminatedSlots: number[];
  isSpinning: boolean;
  result?: number | null;
  onSpinComplete?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getSlotColor(num: number): string {
  if (num === 0) return '#00ff88';
  return RED_NUMBERS.has(num) ? '#ff0040' : '#1a1a2e';
}

function getSlotBorder(num: number): string {
  if (num === 0) return '#00ff88';
  return RED_NUMBERS.has(num) ? '#ff0040' : '#6366f1';
}

/** Angle for a given index in the 37-slot wheel */
function slotAngle(index: number): number {
  return (index / 37) * 360;
}

/** Find the index of a number in WHEEL_ORDER */
function indexOfNumber(num: number): number {
  return WHEEL_ORDER.indexOf(num as (typeof WHEEL_ORDER)[number]);
}

// ---------------------------------------------------------------------------
// Particle burst component
// ---------------------------------------------------------------------------
const ParticleBurst: React.FC<{ color: string }> = ({ color }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        angle: (i / 24) * 360 + (Math.random() - 0.5) * 15,
        distance: 60 + Math.random() * 80,
        size: 2 + Math.random() * 4,
        delay: Math.random() * 0.15,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: color,
            left: '50%',
            top: '50%',
            boxShadow: `0 0 6px ${color}`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
            y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
            opacity: 0,
            scale: 0.2,
          }}
          transition={{
            duration: 0.8,
            delay: p.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Single slot segment
// ---------------------------------------------------------------------------
const WheelSlot: React.FC<{
  number: number;
  index: number;
  isEliminated: boolean;
  isWinner: boolean;
  showResult: boolean;
}> = React.memo(({ number, index, isEliminated, isWinner, showResult }) => {
  const angle = slotAngle(index);
  const segAngle = 360 / 37;
  const color = getSlotColor(number);
  const borderColor = getSlotBorder(number);

  return (
    <AnimatePresence mode="popLayout">
      {!isEliminated ? (
        <motion.div
          key={`slot-${number}`}
          className="absolute"
          style={{
            width: '100%',
            height: '100%',
            left: 0,
            top: 0,
          }}
          initial={{ opacity: 1, scale: 1 }}
          exit={{
            opacity: 0,
            scale: 0.5,
            filter: 'blur(8px) brightness(2)',
            transition: { duration: 0.6, ease: 'easeIn' },
          }}
        >
          {/* Segment shape via clip-path */}
          <div
            className="absolute"
            style={{
              width: '100%',
              height: '100%',
              transform: `rotate(${angle}deg)`,
              transformOrigin: 'center center',
            }}
          >
            {/* The visible slice */}
            <div
              className="absolute overflow-hidden"
              style={{
                width: '50%',
                height: '50%',
                top: 0,
                left: '50%',
                transformOrigin: 'bottom left',
                transform: `rotate(${segAngle / 2}deg) skewY(${-(90 - segAngle)}deg)`,
                background: isWinner && showResult
                  ? color
                  : `${color}cc`,
                borderRight: `1px solid ${borderColor}33`,
                boxShadow: isWinner && showResult
                  ? `inset 0 0 30px ${color}, 0 0 20px ${color}88`
                  : number === 0
                    ? `inset 0 0 15px ${color}44`
                    : 'none',
              }}
            />

            {/* Number label */}
            <div
              className="absolute flex items-center justify-center pointer-events-none"
              style={{
                width: 28,
                height: 28,
                left: '50%',
                top: '15%',
                transform: `translateX(-50%) rotate(${-angle}deg)`,
              }}
            >
              <motion.span
                className="font-jetbrains font-bold text-[11px] leading-none select-none"
                style={{
                  color: number === 0 ? '#0a0a0f' : '#ffffff',
                  textShadow:
                    isWinner && showResult
                      ? `0 0 8px ${color}, 0 0 16px ${color}`
                      : '0 1px 3px rgba(0,0,0,0.8)',
                }}
                animate={
                  isWinner && showResult
                    ? {
                        scale: [1, 1.3, 1],
                        textShadow: [
                          `0 0 8px ${color}`,
                          `0 0 24px ${color}`,
                          `0 0 8px ${color}`,
                        ],
                      }
                    : {}
                }
                transition={
                  isWinner && showResult
                    ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
                    : {}
                }
              >
                {number}
              </motion.span>
            </div>
          </div>
        </motion.div>
      ) : (
        /* Ghost slot for eliminated numbers */
        <motion.div
          key={`ghost-${number}`}
          className="absolute pointer-events-none"
          style={{
            width: '100%',
            height: '100%',
            left: 0,
            top: 0,
          }}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: 0.08 }}
          transition={{ duration: 2, ease: 'easeOut' }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              transform: `rotate(${angle}deg)`,
              transformOrigin: 'center center',
            }}
          >
            <div
              className="absolute overflow-hidden"
              style={{
                width: '50%',
                height: '50%',
                top: 0,
                left: '50%',
                transformOrigin: 'bottom left',
                transform: `rotate(${segAngle / 2}deg) skewY(${-(90 - segAngle)}deg)`,
                background: '#1a1a2e44',
                borderRight: '1px solid #ffffff08',
              }}
            />
            <div
              className="absolute flex items-center justify-center pointer-events-none"
              style={{
                width: 28,
                height: 28,
                left: '50%',
                top: '15%',
                transform: `translateX(-50%) rotate(${-angle}deg)`,
              }}
            >
              <span
                className="font-jetbrains text-[10px] text-white/20 line-through select-none"
              >
                {number}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
WheelSlot.displayName = 'WheelSlot';

// ---------------------------------------------------------------------------
// Ball indicator
// ---------------------------------------------------------------------------
const Ball: React.FC<{ angle: number; visible: boolean; radius: number }> = ({
  angle,
  visible,
  radius,
}) => {
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;

  return (
    <motion.div
      className="absolute rounded-full z-30"
      style={{
        width: 14,
        height: 14,
        left: '50%',
        top: '50%',
        marginLeft: -7,
        marginTop: -7,
        background: 'radial-gradient(circle at 35% 35%, #ffffff, #c0c0c0, #888888)',
        boxShadow:
          '0 0 12px rgba(255,255,255,0.8), 0 0 24px rgba(0,212,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.3)',
      }}
      animate={{
        x,
        y,
        opacity: visible ? 1 : 0,
        scale: visible ? 1 : 0.3,
      }}
      transition={{ type: 'tween', duration: 0.05, ease: 'linear' }}
    />
  );
};

// ---------------------------------------------------------------------------
// System Wipe overlay
// ---------------------------------------------------------------------------
const SystemWipeOverlay: React.FC<{ visible: boolean }> = ({ visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        className="absolute inset-0 z-40 flex items-center justify-center rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Background flash */}
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle, rgba(0,255,136,0.15) 0%, rgba(0,255,136,0.02) 70%, transparent 100%)',
          }}
          animate={{
            opacity: [0.6, 1, 0.6],
          }}
          transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Scan lines */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.03) 2px, rgba(0,255,136,0.03) 4px)',
          }}
          animate={{ y: [0, 4] }}
          transition={{ duration: 0.15, repeat: Infinity, ease: 'linear' }}
        />

        {/* Text */}
        <motion.div
          className="relative flex flex-col items-center gap-2"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <motion.span
            className="font-orbitron text-2xl font-black tracking-[0.3em] text-success"
            style={{
              textShadow:
                '0 0 20px #00ff88, 0 0 40px #00ff88, 0 0 80px #00ff8844',
            }}
            animate={{
              opacity: [1, 0.7, 1],
              textShadow: [
                '0 0 20px #00ff88, 0 0 40px #00ff88, 0 0 80px #00ff8844',
                '0 0 30px #00ff88, 0 0 60px #00ff88, 0 0 120px #00ff8866',
                '0 0 20px #00ff88, 0 0 40px #00ff88, 0 0 80px #00ff8844',
              ],
            }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            SYSTEM WIPE
          </motion.span>
          <motion.div
            className="h-[1px] bg-success/60"
            initial={{ width: 0 }}
            animate={{ width: 180 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />
          <motion.span
            className="font-jetbrains text-[10px] text-success/60 tracking-widest uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            all bets liquidated
          </motion.span>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ---------------------------------------------------------------------------
// Main RouletteWheel component
// ---------------------------------------------------------------------------
const RouletteWheel: React.FC<RouletteWheelProps> = ({
  totalSlots,
  eliminatedSlots,
  isSpinning,
  result = null,
  onSpinComplete,
}) => {
  const wheelControls = useAnimation();
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballAngle, setBallAngle] = useState(0);
  const [ballVisible, setBallVisible] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showWipe, setShowWipe] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const spinRef = useRef<number | null>(null);
  const hasSpunRef = useRef(false);

  const eliminatedSet = useMemo(
    () => new Set(eliminatedSlots),
    [eliminatedSlots],
  );

  // -----------------------------------------------------------------------
  // Spin logic
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isSpinning) {
      hasSpunRef.current = false;
      return;
    }
    if (hasSpunRef.current) return;
    hasSpunRef.current = true;

    setShowResult(false);
    setShowWipe(false);
    setShowParticles(false);
    setBallVisible(true);

    // Total spin: 4-6 full rotations + offset to land on result
    const totalRotations = 4 + Math.random() * 2;
    const resultIndex = result != null ? indexOfNumber(result) : 0;
    const targetAngle = slotAngle(resultIndex);
    // We rotate the wheel clockwise; the ball visually "lands" on the target
    const totalDegrees = totalRotations * 360 + (360 - targetAngle);

    // Animate ball around the wheel (opposite direction)
    const duration = 4000; // ms
    const startTime = performance.now();
    const startBallAngle = ballAngle;
    const ballTotalTravel = -(totalRotations * 360 + targetAngle + 90);

    function animateBall(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out for deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentBallAngle = startBallAngle + ballTotalTravel * eased;
      setBallAngle(currentBallAngle % 360);

      if (progress < 1) {
        spinRef.current = requestAnimationFrame(animateBall);
      }
    }

    spinRef.current = requestAnimationFrame(animateBall);

    // Animate wheel rotation
    const baseRotation = wheelRotation;
    wheelControls.start({
      rotate: baseRotation + totalDegrees,
      transition: {
        duration: duration / 1000,
        ease: [0.15, 0.8, 0.3, 1], // fast start, slow end
      },
    }).then(() => {
      setWheelRotation(baseRotation + totalDegrees);
      setBallVisible(false);
      setShowResult(true);

      if (result === 0) {
        setShowWipe(true);
        setTimeout(() => setShowWipe(false), 3000);
      } else {
        setShowParticles(true);
        setTimeout(() => setShowParticles(false), 1200);
      }

      onSpinComplete?.();
    });

    return () => {
      if (spinRef.current) cancelAnimationFrame(spinRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning]);

  // -----------------------------------------------------------------------
  // Wheel size
  // -----------------------------------------------------------------------
  const WHEEL_SIZE = 380;
  const BALL_RADIUS = WHEEL_SIZE * 0.38;

  const resultColor = result != null ? getSlotColor(result) : '#00d4ff';

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
      role="img"
      aria-label={`Roulette wheel with ${totalSlots} active slots${result != null ? `, result: ${result}` : ''}`}
    >
      {/* Outer ring glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: WHEEL_SIZE + 16,
          height: WHEEL_SIZE + 16,
          background:
            'conic-gradient(from 0deg, #ff004066, #00ff8844, #00d4ff66, #b829dd66, #ff004066)',
          filter: 'blur(8px)',
          opacity: isSpinning ? 0.8 : 0.3,
          transition: 'opacity 0.5s ease',
        }}
      />

      {/* Outer border ring */}
      <div
        className="absolute rounded-full border-2 border-white/10"
        style={{
          width: WHEEL_SIZE + 4,
          height: WHEEL_SIZE + 4,
          boxShadow:
            'inset 0 0 30px rgba(0,0,0,0.6), 0 0 20px rgba(0,212,255,0.1)',
        }}
      />

      {/* Wheel body */}
      <motion.div
        className="absolute rounded-full overflow-hidden"
        style={{
          width: WHEEL_SIZE,
          height: WHEEL_SIZE,
          background:
            'radial-gradient(circle at center, #1a1a2e 0%, #0a0a0f 60%, #050508 100%)',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.8)',
        }}
        animate={wheelControls}
      >
        {/* Slot segments */}
        {WHEEL_ORDER.map((num, idx) => (
          <WheelSlot
            key={num}
            number={num}
            index={idx}
            isEliminated={num !== 0 && eliminatedSet.has(num)}
            isWinner={result === num && result != null}
            showResult={showResult}
          />
        ))}

        {/* Inner ring decoration */}
        <div
          className="absolute rounded-full border border-white/[0.06]"
          style={{
            width: '55%',
            height: '55%',
            left: '22.5%',
            top: '22.5%',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
          }}
        />
      </motion.div>

      {/* Center hub */}
      <div
        className="absolute rounded-full z-20 flex items-center justify-center"
        style={{
          width: 72,
          height: 72,
          background:
            'radial-gradient(circle at 40% 35%, #2a2a3e, #12121a 70%, #0a0a0f)',
          boxShadow:
            '0 0 20px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.05), 0 0 40px rgba(0,212,255,0.08)',
          border: '2px solid rgba(255,255,255,0.08)',
        }}
      >
        {showResult && result != null ? (
          <motion.span
            className="font-orbitron font-black text-lg"
            style={{
              color: resultColor,
              textShadow: `0 0 12px ${resultColor}, 0 0 24px ${resultColor}88`,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            {result}
          </motion.span>
        ) : (
          <div
            className="w-3 h-3 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 35% 35%, #00d4ff44, transparent)',
              boxShadow: '0 0 8px rgba(0,212,255,0.3)',
            }}
          />
        )}
      </div>

      {/* Ball */}
      <Ball angle={ballAngle} visible={ballVisible} radius={BALL_RADIUS} />

      {/* Pointer / marker at top */}
      <div
        className="absolute z-30"
        style={{
          top: -6,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '14px solid #00d4ff',
            filter: 'drop-shadow(0 0 6px #00d4ff88)',
          }}
        />
      </div>

      {/* Win particles */}
      <AnimatePresence>
        {showParticles && result != null && result !== 0 && (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ParticleBurst color={resultColor} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* System Wipe overlay */}
      <SystemWipeOverlay visible={showWipe} />

      {/* Neon ring pulse when spinning */}
      {isSpinning && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: WHEEL_SIZE + 30,
            height: WHEEL_SIZE + 30,
            border: '1px solid rgba(0,212,255,0.2)',
          }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.3, 0.6, 0.3],
            borderColor: [
              'rgba(0,212,255,0.2)',
              'rgba(0,212,255,0.5)',
              'rgba(0,212,255,0.2)',
            ],
          }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Active slots counter */}
      <div
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2"
      >
        <span className="font-jetbrains text-[10px] text-white/30 uppercase tracking-widest">
          active
        </span>
        <span
          className="font-orbitron text-sm font-bold tabular-nums"
          style={{
            color:
              totalSlots <= 5
                ? '#ff0040'
                : totalSlots <= 10
                  ? '#ff6b2b'
                  : '#00d4ff',
            textShadow:
              totalSlots <= 5
                ? '0 0 8px #ff004088'
                : totalSlots <= 10
                  ? '0 0 8px #ff6b2b88'
                  : '0 0 8px #00d4ff88',
          }}
        >
          {totalSlots}/37
        </span>
      </div>
    </div>
  );
};

export default RouletteWheel;
