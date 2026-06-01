"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  completed: number;
  required?: number;
  className?: string;
}

export default function ProgressRing({
  completed,
  required = 10,
  className,
}: ProgressRingProps) {
  const percent = Math.min((completed / required) * 100, 100);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const isCompleted = completed >= required;

  return (
    <div className={cn("relative flex items-center justify-center select-none", className)}>
      {/* SVG Ring */}
      <svg className="w-48 h-48 transform -rotate-90 overflow-visible">
        {/* Track circle */}
        <circle
          cx="96"
          cy="96"
          r={radius}
          className="stroke-white/[0.04] fill-none"
          strokeWidth="10"
        />

        {/* Glow path behind active circle (only if completed > 0) */}
        {completed > 0 && (
          <circle
            cx="96"
            cy="96"
            r={radius}
            className="stroke-primary/20 fill-none blur-[4px]"
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        )}

        {/* Active progress path */}
        <motion.circle
          cx="96"
          cy="96"
          r={radius}
          className={cn(
            "fill-none transition-all duration-500 ease-out",
            isCompleted ? "stroke-primary" : "stroke-accent"
          )}
          strokeWidth="10"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          strokeLinecap="round"
        />
      </svg>

      {/* Internal Content (Text Counter) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <motion.span
          key={completed}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-heading font-black text-4xl text-white tracking-tighter drop-shadow-md"
        >
          {completed}
        </motion.span>
        <span className="text-[10px] font-heading font-bold text-white/40 uppercase tracking-widest leading-none mt-1">
          of {required} tasks
        </span>
        
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -bottom-1 px-3 py-1 rounded-full bg-primary text-[9px] font-heading font-bold uppercase tracking-wider text-white shadow-glow-primary"
          >
            Secured! 💥
          </motion.div>
        )}
      </div>
    </div>
  );
}
