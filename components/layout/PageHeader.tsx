"use client";

import { useEffect, useState } from "react";
import { Flame, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { getNextStreakMilestone } from "@/types/supabase";

interface PageHeaderProps {
  displayName?: string;
  role?: "task_user" | "reward_giver";
  currentStreak?: number;
}

export default function PageHeader({
  displayName = "Sweetheart",
  role = "task_user",
  currentStreak = 0,
}: PageHeaderProps) {
  const [timeLeft, setTimeLeft] = useState("");

  // Countdown timer to local midnight
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);

      const diffMs = midnight.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      const pad = (num: number) => String(num).padStart(2, "0");
      setTimeLeft(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const milestoneInfo = getNextStreakMilestone(currentStreak);

  // Time-based greeting
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "Good morning";
    if (hours < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border-b border-white/[0.06] bg-black/10 backdrop-blur-sm">
      {/* User Info & Greeting */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-heading">
          {getGreeting()},{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {displayName}
          </span>
          ! 👋
        </h1>
        <p className="text-xs text-white/50 font-body mt-1">
          {role === "task_user"
            ? "Log your progress, unlock sweet rewards."
            : "Review progress, approve pending wishes."}
        </p>
      </div>

      {/* Stats Quick Overview */}
      <div className="flex items-center gap-3">
        {/* Streak Counter Badge */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-orange-500/15 to-rose-500/15 border border-orange-500/30 text-orange-400 cursor-default shadow-sm"
        >
          <Flame className="w-5 h-5 fill-orange-500/20 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-[10px] text-orange-300/60 uppercase font-heading font-bold tracking-wider leading-none">
              Streak
            </span>
            <span className="font-heading font-black text-sm leading-none mt-0.5">
              {currentStreak} {currentStreak === 1 ? "day" : "days"}
            </span>
          </div>
        </motion.div>

        {/* Local Time Reset Countdown */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-white/70 cursor-default">
          <Clock className="w-5 h-5 text-white/40" />
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 uppercase font-heading font-bold tracking-wider leading-none">
              Reset In
            </span>
            <span className="font-mono text-sm leading-none mt-0.5 font-bold tabular-nums">
              {timeLeft}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
