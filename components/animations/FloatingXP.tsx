"use client";

import { motion } from "framer-motion";

interface FloatingXPProps {
  id: string;
  x: number;
  y: number;
  text?: string;
  onComplete: (id: string) => void;
}

export default function FloatingXP({
  id,
  x,
  y,
  text = "+1 TASK 💖",
  onComplete,
}: FloatingXPProps) {
  return (
    <motion.div
      initial={{ opacity: 1, y: y, x: x, scale: 0.8 }}
      animate={{
        opacity: [1, 1, 0],
        y: y - 100,
        x: x + (Math.random() * 40 - 20), // random slight horizontal drift
        scale: [0.8, 1.2, 1],
      }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      onAnimationComplete={() => onComplete(id)}
      className="absolute z-50 font-heading font-black text-primary text-sm pointer-events-none select-none whitespace-nowrap bg-primary/10 border border-primary/20 backdrop-blur-md px-3 py-1.5 rounded-full shadow-glow-primary-sm"
    >
      {text}
    </motion.div>
  );
}
