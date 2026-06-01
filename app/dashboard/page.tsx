"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(data);
      }
    }
    loadProfile();
  }, [supabase]);

  return (
    <AppShell>
      <PageHeader
        displayName={profile?.display_name || "Sweetheart"}
        role={profile?.role || "task_user"}
        currentStreak={0}
      />
      <div className="page-content flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="card max-w-sm w-full p-8 border border-white/[0.08] bg-white/[0.02]">
          <h2 className="text-lg font-heading font-bold text-white mb-2">Welcome to BondXP</h2>
          <p className="text-xs font-body text-white/50 leading-relaxed">
            Your profile is successfully paired! In Phase 2, we will enable daily task logging, streak tracking, and XP gains.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
