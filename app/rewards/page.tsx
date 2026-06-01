"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import RewardStore from "@/components/rewards/RewardStore";
import RewardManager from "@/components/rewards/RewardManager";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";

export default function RewardsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"task_user" | "reward_giver" | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Query profile
      const { data: profile, error } = await (supabase
        .from("users") as any)
        .select("role")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        router.push("/pairing");
        return;
      }

      setRole(profile.role);
      setLoading(false);
    }
    loadProfile();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-dark text-white">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="relative flex items-center justify-center"
        >
          <Heart className="w-12 h-12 text-primary fill-primary" />
        </motion.div>
        <p className="mt-4 text-xs font-heading font-semibold text-white/50 uppercase tracking-widest animate-pulse">
          Opening Catalog...
        </p>
      </div>
    );
  }

  return (
    <AppShell>
      {role === "task_user" ? <RewardStore /> : <RewardManager />}
    </AppShell>
  );
}
