"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Trophy, Flame, Gift, CheckCircle, BarChart3, Calendar, ShieldAlert } from "lucide-react";
import { format, subDays, startOfDay, parseISO } from "date-fns";
import { toast } from "sonner";

export default function AnalyticsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  
  // Stats
  const [streak, setStreak] = useState<any>(null);
  const [bank, setBank] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ [key: string]: number }>({});
  
  // Heatmap: past 28 days of completions
  const [heatmap, setHeatmap] = useState<{ date: string; count: number; qualified: boolean }[]>([]);

  const loadAnalyticsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get profile
      const { data: prof } = await (supabase
        .from("users") as any)
        .select("*")
        .eq("id", user.id)
        .single();

      if (!prof) {
        setLoading(false);
        return;
      }
      setProfile(prof);

      // Check partner's ID to fetch overall couple data
      const isTaskUser = prof.role === "task_user";
      let taskUserId = user.id;

      if (!isTaskUser) {
        const { data: partner } = await (supabase
          .from("users") as any)
          .select("id")
          .eq("couple_session_id", prof.couple_session_id)
          .eq("role", "task_user")
          .single();
        if (partner) {
          taskUserId = partner.id;
        }
      }

      // 2. Load streak
      const { data: str } = await supabase
        .from("streaks")
        .select("*")
        .eq("user_id", taskUserId)
        .single();
      setStreak(str);

      // 3. Load bank
      const { data: b } = await supabase
        .from("task_bank")
        .select("*")
        .eq("user_id", taskUserId)
        .single();
      setBank(b);

      // 4. Load redemption history
      const { data: redHistory } = await supabase
        .from("redemptions")
        .select(`
          id,
          status,
          redeemed_at,
          cost_at_time,
          reward:rewards (
            title,
            icon,
            category
          )
        `)
        .eq("user_id", taskUserId)
        .order("redeemed_at", { ascending: false });
      setHistory(redHistory || []);

      // 5. Load past 28 days daily progress for heatmap
      const past28Days: any[] = [];
      const daysToFetch: string[] = [];

      for (let i = 27; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const dateStr = format(d, "yyyy-MM-dd");
        daysToFetch.push(dateStr);
        past28Days.push({ date: dateStr, count: 0, qualified: false });
      }

      const { data: progressData } = await (supabase
        .from("daily_progress") as any)
        .select("*")
        .eq("user_id", taskUserId)
        .in("date", daysToFetch);

      if (progressData) {
        progressData.forEach((progress: any) => {
          const idx = past28Days.findIndex((p) => p.date === progress.date);
          if (idx !== -1) {
            past28Days[idx].count = progress.tasks_completed;
            past28Days[idx].qualified = progress.streak_qualified;
          }
        });
      }
      setHeatmap(past28Days);

      // 6. Calculate category aggregates from all tasks
      const { data: tasks } = await (supabase
        .from("tasks") as any)
        .select("category")
        .eq("user_id", taskUserId);
      
      const cats: { [key: string]: number } = {};
      if (tasks) {
        tasks.forEach((t: any) => {
          const cat = t.category || "Other";
          cats[cat] = (cats[cat] || 0) + 1;
        });
      }
      setCategories(cats);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-dark text-white">
        <span className="text-white/50 text-xs font-heading font-semibold uppercase tracking-widest animate-pulse">
          Crunching numbers...
        </span>
      </div>
    );
  }

  // Calculate totals
  const totalTasks = bank?.lifetime_tasks || 0;
  const approvedRedemptions = history.filter((h) => h.status === "approved" || h.status === "scheduled").length;

  const categoryKeys = Object.keys(categories);
  const maxCategoryCount = Math.max(...Object.values(categories), 1);

  return (
    <AppShell>
      <PageHeader
        displayName={profile?.display_name || "Sweetheart"}
        role={profile?.role || "task_user"}
        currentStreak={streak?.current_streak || 0}
      />

      <div className="page-content max-w-4xl w-full mx-auto space-y-6">
        
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-3 gap-4">
          {/* Total Tasks completed */}
          <div className="card p-4 bg-white/[0.01] border-white/[0.05] flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-6 h-6 text-green-400 mb-2" />
            <span className="text-[9px] font-heading font-bold text-white/30 uppercase tracking-widest">
              Total Tasks
            </span>
            <span className="font-heading font-black text-lg text-white mt-1">
              {totalTasks}
            </span>
          </div>

          {/* Longest streak */}
          <div className="card p-4 bg-white/[0.01] border-white/[0.05] flex flex-col items-center justify-center text-center">
            <Flame className="w-6 h-6 text-orange-400 mb-2 fill-orange-400/10" />
            <span className="text-[9px] font-heading font-bold text-white/30 uppercase tracking-widest">
              Longest Streak
            </span>
            <span className="font-heading font-black text-lg text-white mt-1">
              {streak?.longest_streak || 0}d
            </span>
          </div>

          {/* Rewards Redeemed */}
          <div className="card p-4 bg-white/[0.01] border-white/[0.05] flex flex-col items-center justify-center text-center">
            <Gift className="w-6 h-6 text-primary mb-2" />
            <span className="text-[9px] font-heading font-bold text-white/30 uppercase tracking-widest">
              Wishes Met
            </span>
            <span className="font-heading font-black text-lg text-white mt-1">
              {approvedRedemptions}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* LEFT: Consistency Heatmap Grid */}
          <div className="card bg-white/[0.02] border-white/[0.06] p-5">
            <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-white/70 mb-4 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              Consistency Heatmap (Past 28 Days)
            </h3>

            {/* Heatmap Grid */}
            <div className="grid grid-cols-7 gap-2">
              {heatmap.map((day) => {
                let colorClass = "bg-white/[0.02] border-white/[0.05]";
                if (day.count > 0 && day.count < 5) colorClass = "bg-primary/10 border-primary/20 text-primary/60";
                if (day.count >= 5 && day.count < 10) colorClass = "bg-primary/30 border-primary/45 text-primary/85";
                if (day.qualified) colorClass = "bg-primary border-primary text-white shadow-glow-primary-sm";

                return (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.count} tasks completed`}
                    className={`aspect-square rounded-xl border flex flex-col items-center justify-center text-[10px] font-heading font-black transition-all cursor-default ${colorClass}`}
                  >
                    {format(parseISO(day.date), "d")}
                  </div>
                );
              })}
            </div>

            {/* Map Legend */}
            <div className="flex items-center gap-3 justify-end mt-4 text-[9px] text-white/40 font-heading">
              <span>Less</span>
              <div className="w-2.5 h-2.5 rounded bg-white/[0.02] border border-white/[0.05]" />
              <div className="w-2.5 h-2.5 rounded bg-primary/20" />
              <div className="w-2.5 h-2.5 rounded bg-primary/50" />
              <div className="w-2.5 h-2.5 rounded bg-primary" />
              <span>More (10+)</span>
            </div>
          </div>

          {/* RIGHT: Categories Bar Chart */}
          <div className="card bg-white/[0.02] border-white/[0.06] p-5">
            <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-white/70 mb-4 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-primary" />
              Productivity breakdown
            </h3>

            {categoryKeys.length > 0 ? (
              <div className="space-y-3.5 pr-2 max-h-[220px] overflow-y-auto">
                {categoryKeys.map((cat) => {
                  const count = categories[cat];
                  const ratio = count / maxCategoryCount;

                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-heading font-medium text-white/70">
                        <span>{cat}</span>
                        <span className="font-bold text-white">{count} completed</span>
                      </div>
                      
                      {/* Bar container */}
                      <div className="w-full h-2 rounded-full bg-white/[0.03]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${ratio * 100}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-[200px] text-white/30 gap-2">
                <BarChart3 className="w-8 h-8 text-white/10" />
                <p className="text-xs font-body max-w-[180px] leading-relaxed">
                  Start logging tasks to populate productivity categories.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* TIMELINE: Recently Approved Redemptions */}
        <div className="card bg-white/[0.02] border-white/[0.06] p-6">
          <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-white/70 mb-4">
            Wish History Timeline
          </h3>

          <div className="relative border-l border-white/[0.06] pl-5 ml-2.5 space-y-6">
            {history.length > 0 ? (
              history.map((red) => {
                let statusColor = "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
                if (red.status === "approved" || red.status === "scheduled") {
                  statusColor = "text-green-400 bg-green-400/10 border-green-400/20";
                } else if (red.status === "rejected") {
                  statusColor = "text-red-400 bg-red-400/10 border-red-400/20";
                }

                return (
                  <div key={red.id} className="relative group">
                    {/* Circle icon on the timeline line */}
                    <div className="absolute -left-[30px] top-0.5 w-4 h-4 rounded-full bg-dark border-2 border-white/[0.12] flex items-center justify-center group-hover:border-primary transition-colors">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-primary transition-colors" />
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-heading font-bold text-sm text-white flex items-center gap-1.5">
                          <span>{red.reward?.icon || "🎁"}</span>
                          <span>{red.reward?.title}</span>
                        </h4>
                        
                        <div className="flex items-center gap-2 text-[10px] text-white/40 mt-1 font-body">
                          <span>{format(new Date(red.redeemed_at), "PPP p")}</span>
                          <span>•</span>
                          <span>Cost: {red.cost_at_time} tasks</span>
                        </div>
                      </div>

                      {/* Status pill */}
                      <span className={`badge uppercase text-[8px] font-bold tracking-wider px-2 py-0.5 border ${statusColor}`}>
                        {red.status}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-white/30 font-body text-xs">
                No wishes redeemed yet.
              </div>
            )}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
