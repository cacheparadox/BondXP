"use client";

import { motion } from "framer-motion";

interface StreakFlameProps {
  streak: number;
}

// Fixed ember values to prevent SSR hydration mismatch
const EMBERS = [
  { id: 1, size: 2.5, delay: 0.1, duration: 1.8, xOffset: -10, targetX: -22 },
  { id: 2, size: 3.5, delay: 0.5, duration: 2.2, xOffset: 8, targetX: 18 },
  { id: 3, size: 2.0, delay: 1.0, duration: 1.5, xOffset: -4, targetX: -12 },
  { id: 4, size: 4.0, delay: 1.3, duration: 2.5, xOffset: 12, targetX: 4 },
  { id: 5, size: 2.8, delay: 0.7, duration: 2.0, xOffset: -14, targetX: -2 },
  { id: 6, size: 3.0, delay: 1.6, duration: 2.1, xOffset: 2, targetX: 10 },
];

export default function StreakFlame({ streak }: StreakFlameProps) {
  const isDormant = streak === 0;

  // Path morphing keyframes for Outer Flame (licking fire effect)
  const pathOuterKeyframes = [
    "M50,5 C55,22 78,42 78,65 C78,82 65,95 50,95 C35,95 22,82 22,65 C22,45 38,25 44,10 C46,7 48.5,5 50,5 Z",
    "M50,7 C53,24 75,44 75,67 C75,84 63,95 50,95 C37,95 25,84 25,67 C25,47 35,27 42,12 C44,9 47.5,7 50,7 Z",
    "M50,3 C57,20 80,40 80,63 C80,80 67,95 50,95 C33,95 20,80 20,63 C20,43 40,23 46,8 C48,5 49.5,3 50,3 Z",
    "M50,5 C55,22 78,42 78,65 C78,82 65,95 50,95 C35,95 22,82 22,65 C22,45 38,25 44,10 C46,7 48.5,5 50,5 Z"
  ];

  // Path morphing keyframes for Middle Flame
  const pathMidKeyframes = [
    "M50,20 C54,32 70,50 70,68 C70,80 61,90 50,90 C39,90 30,80 30,68 C30,52 42,35 46,24 C47.5,21.5 49,20 50,20 Z",
    "M50,22 C52,34 68,52 68,70 C68,82 59,90 50,90 C41,90 32,82 32,70 C32,54 40,37 44,26 C45.5,23.5 47,22 50,22 Z",
    "M50,18 C56,30 72,48 72,66 C72,78 63,90 50,90 C37,90 28,78 28,66 C28,50 44,33 48,22 C49.5,19.5 50,18 50,18 Z",
    "M50,20 C54,32 70,50 70,68 C70,80 61,90 50,90 C39,90 30,80 30,68 C30,52 42,35 46,24 C47.5,21.5 49,20 50,20 Z"
  ];

  // Path morphing keyframes for Inner Flame
  const pathInnerKeyframes = [
    "M50,40 C52,48 62,60 62,72 C62,80 57,86 50,86 C43,86 38,80 38,72 C38,62 45,50 48,43 C49,41 49.5,40 50,40 Z",
    "M50,42 C51,50 60,62 60,74 C60,82 55,86 50,86 C45,86 40,82 40,74 C40,64 44,52 47,45 C48,43 49,42 50,42 Z",
    "M50,38 C53,46 64,58 64,70 C64,78 59,86 50,86 C41,86 36,78 36,70 C36,60 46,48 49,41 C50,39 50,38 50,38 Z",
    "M50,40 C52,48 62,60 62,72 C62,80 57,86 50,86 C43,86 38,80 38,72 C38,62 45,50 48,43 C49,41 49.5,40 50,40 Z"
  ];

  return (
    <div className="relative flex flex-col items-center justify-center w-28 h-32 select-none">
      {/* Glow Behind Flame */}
      {!isDormant && (
        <motion.div
          animate={{
            scale: [0.9, 1.15, 0.9],
            opacity: [0.35, 0.6, 0.35],
          }}
          transition={{
            repeat: Infinity,
            duration: 2.5,
            ease: "easeInOut",
          }}
          className="absolute w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-amber-500/30 blur-2xl pointer-events-none"
        />
      )}

      {/* Flame SVG */}
      <div className="w-20 h-24 flex items-center justify-center relative">
        <svg
          viewBox="0 0 100 100"
          className={`w-full h-full filter transition-all duration-500 ${
            isDormant 
              ? "drop-shadow-[0_0_4px_rgba(255,255,255,0.05)] opacity-20" 
              : "drop-shadow-[0_0_12px_rgba(255,77,141,0.4)]"
          }`}
        >
          <defs>
            {/* Active gradients */}
            <linearGradient id="outerFlameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#FF4D8D" />
              <stop offset="50%" stopColor="#FF6B3B" />
              <stop offset="100%" stopColor="#FFC837" />
            </linearGradient>
            <linearGradient id="midFlameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#FF6B3B" />
              <stop offset="70%" stopColor="#FFC837" />
              <stop offset="100%" stopColor="#FFE57F" />
            </linearGradient>
            <linearGradient id="innerFlameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#FFD54F" />
              <stop offset="100%" stopColor="#FFFFFF" />
            </linearGradient>
            <radialGradient id="emberGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="60%" stopColor="#FFC837" />
              <stop offset="100%" stopColor="#FF4D8D" stopOpacity="0" />
            </radialGradient>

            {/* Dormant gradients */}
            <linearGradient id="dormantOuterGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#2D2D2D" />
              <stop offset="100%" stopColor="#4A4A4A" />
            </linearGradient>
            <linearGradient id="dormantMidGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#3A3A3A" />
              <stop offset="100%" stopColor="#5E5E5E" />
            </linearGradient>
            <linearGradient id="dormantInnerGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#4F4F4F" />
              <stop offset="100%" stopColor="#7E7E7E" />
            </linearGradient>
          </defs>

          {/* Layer 1: Outer Flame */}
          <motion.path
            d={pathOuterKeyframes[0]}
            fill={isDormant ? "url(#dormantOuterGrad)" : "url(#outerFlameGrad)"}
            animate={
              !isDormant
                ? {
                    d: pathOuterKeyframes,
                  }
                : {}
            }
            transition={{
              repeat: Infinity,
              duration: 2.2,
              ease: "easeInOut",
            }}
          />

          {/* Layer 2: Middle Flame */}
          <motion.path
            d={pathMidKeyframes[0]}
            fill={isDormant ? "url(#dormantMidGrad)" : "url(#midFlameGrad)"}
            animate={
              !isDormant
                ? {
                    d: pathMidKeyframes,
                  }
                : {}
            }
            transition={{
              repeat: Infinity,
              duration: 1.7,
              ease: "easeInOut",
            }}
          />

          {/* Layer 3: Inner Core */}
          <motion.path
            d={pathInnerKeyframes[0]}
            fill={isDormant ? "url(#dormantInnerGrad)" : "url(#innerFlameGrad)"}
            animate={
              !isDormant
                ? {
                    d: pathInnerKeyframes,
                  }
                : {}
            }
            transition={{
              repeat: Infinity,
              duration: 1.2,
              ease: "easeInOut",
            }}
          />

          {/* Animated Embers / Sparks */}
          {!isDormant && EMBERS.map((ember) => (
            <motion.circle
              key={ember.id}
              cx={50 + ember.xOffset}
              cy={75}
              r={ember.size}
              fill="url(#emberGrad)"
              initial={{ opacity: 0, y: 0, scale: 1 }}
              animate={{
                opacity: [0, 1, 0.8, 0],
                y: [-15, -65],
                x: [50 + ember.xOffset, 50 + ember.targetX],
                scale: [1, 1.2, 0.6, 0.2],
              }}
              transition={{
                duration: ember.duration,
                repeat: Infinity,
                delay: ember.delay,
                ease: "easeOut",
              }}
            />
          ))}
        </svg>
      </div>

      {/* Streak Number Overlay (Glassmorphism Pill at the Base) */}
      <div className="absolute -bottom-1 flex flex-col items-center justify-center">
        <div className={`px-3.5 py-1 rounded-full border flex items-center gap-1.5 backdrop-blur-md shadow-md transition-all duration-300 ${
          isDormant 
            ? "bg-white/[0.01] border-white/[0.04] text-white/30" 
            : "bg-white/[0.05] border-white/[0.12] text-white shadow-[0_0_8px_rgba(255,77,141,0.2)]"
        }`}>
          <span className={`font-heading font-black text-sm tracking-tight leading-none ${
            isDormant ? "" : "text-primary animate-pulse"
          }`}>
            {streak}
          </span>
          <span className="text-[9px] font-heading font-extrabold uppercase tracking-wider text-white/50 leading-none">
            {streak === 1 ? "Day" : "Days"}
          </span>
        </div>
      </div>
    </div>
  );
}
