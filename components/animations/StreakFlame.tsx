"use client";

import { motion } from "framer-motion";

interface StreakFlameProps {
  streak: number;
}

export default function StreakFlame({ streak }: StreakFlameProps) {
  const getFlameScale = () => {
    if (streak === 0) return 0.7;
    if (streak < 3) return 0.9;
    if (streak < 7) return 1.0;
    if (streak < 15) return 1.15;
    return 1.3; // Raging fire for massive streaks!
  };

  const getFlameColorClass = () => {
    if (streak === 0) return "from-gray-500 to-gray-700 opacity-40";
    if (streak < 7) return "from-amber-500 via-orange-500 to-rose-500";
    if (streak < 20) return "from-orange-500 via-rose-500 to-primary";
    return "from-rose-500 via-primary to-accent animate-pulse shadow-glow-primary";
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-24 h-24 select-none">
      {/* Glow pulse behind the flame */}
      {streak > 0 && (
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute w-16 h-16 rounded-full bg-orange-500/20 blur-xl pointer-events-none"
        />
      )}

      {/* The Flame Structure */}
      <motion.div
        style={{ scale: getFlameScale() }}
        animate={
          streak > 0
            ? {
                y: [0, -3, 0],
                rotate: [-1, 1, -1],
              }
            : {}
        }
        transition={{
          repeat: Infinity,
          duration: 1.2,
          ease: "easeInOut",
        }}
        className={`relative w-12 h-16 rounded-t-full rounded-b-2xl bg-gradient-to-t ${getFlameColorClass()} overflow-visible`}
      >
        {/* Core hot center */}
        {streak > 0 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-5 h-8 rounded-full bg-yellow-300 opacity-80 blur-[1px]" />
        )}
      </motion.div>

      {/* Streak Number */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-5">
        <span className="font-heading font-black text-2xl text-white tracking-tighter drop-shadow-md leading-none">
          {streak}
        </span>
        <span className="text-[8px] font-heading font-bold text-white/80 uppercase tracking-widest leading-none mt-0.5">
          Days
        </span>
      </div>
    </div>
  );
}
