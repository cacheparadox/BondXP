"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import StreakFlame from "@/components/animations/StreakFlame";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Calendar, Gift, Sparkles, MessageCircle, AlertCircle, Plus, Send, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format, startOfDay, endOfDay } from "date-fns";
import { sendNtfyToUser } from "@/lib/ntfy";

export default function RewardGiverDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  
  // Partner stats
  const [partner, setPartner] = useState<any>(null);
  const [partnerProgress, setPartnerProgress] = useState<any>(null);
  const [partnerStreak, setPartnerStreak] = useState<any>(null);
  const [partnerBank, setPartnerBank] = useState<any>(null);

  // Redemptions Queue
  const [redemptions, setRedemptions] = useState<any[]>([]);

  // Partner's Completed Tasks Today
  const [partnerTasks, setPartnerTasks] = useState<any[]>([]);

  // Surprise / Bonus states
  const [bonusAmount, setBonusAmount] = useState(5);
  const [bonusReason, setBonusReason] = useState("");
  const [bonusLoading, setBonusLoading] = useState(false);

  // Adjust partner stats states
  const [newStreak, setNewStreak] = useState(0);
  const [newTasks, setNewTasks] = useState(0);
  const [updatingStats, setUpdatingStats] = useState(false);

  const localDateStr = format(new Date(), "yyyy-MM-dd");

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Load profile
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

      if (!prof.couple_session_id) return;

      // 2. Find partner (task_user)
      const { data: part } = await (supabase
        .from("users") as any)
        .select("*")
        .eq("couple_session_id", prof.couple_session_id)
        .eq("role", "task_user")
        .single();

      if (!part) {
        setLoading(false);
        return;
      }
      setPartner(part);

      // 3. Load partner progress for today
      const { data: prog } = await (supabase
        .from("daily_progress") as any)
        .select("*")
        .eq("user_id", part.id)
        .eq("date", localDateStr)
        .single();
      setPartnerProgress(prog || { tasks_completed: 0, streak_qualified: false });

      // 4. Load partner streak
      const { data: str } = await (supabase
        .from("streaks") as any)
        .select("*")
        .eq("user_id", part.id)
        .single();
      setPartnerStreak(str);
      if (str) {
        setNewStreak(str.current_streak);
      }
      
      // 5. Load partner bank
      const { data: b } = await (supabase
        .from("task_bank") as any)
        .select("*")
        .eq("user_id", part.id)
        .single();
      setPartnerBank(b);
      if (b) {
        setNewTasks(b.available_tasks);
      }

      // 6. Load pending redemptions (including reward title details)
      const { data: redData } = await (supabase
        .from("redemptions") as any)
        .select(`
          id,
          status,
          redeemed_at,
          notes,
          cost_at_time,
          reward:rewards (
            title,
            description,
            icon,
            category
          )
        `)
        .eq("user_id", part.id)
        .eq("status", "pending")
        .order("redeemed_at", { ascending: true });

      setRedemptions(redData || []);

      // 7. Load partner tasks completed today
      const start = startOfDay(new Date()).toISOString();
      const end = endOfDay(new Date()).toISOString();
      const tasksResponse = await fetch(`/api/tasks?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      const tasksData = await tasksResponse.json();
      if (tasksData.tasks) {
        setPartnerTasks(tasksData.tasks);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load partner dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleActionRedemption = async (
    redemptionId: string,
    action: "approved" | "rejected" | "scheduled",
    notes?: string
  ) => {
    try {
      const response = await fetch("/api/redemptions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redemptionId,
          status: action,
          notes,
        }),
      });

      const res = await response.json();

      if (res.success) {
        toast.success(`Redemption ${action}!`);
        // Remove from list
        setRedemptions((prev) => prev.filter((r) => r.id !== redemptionId));
        // Refresh partner bank balance
        loadData();
      } else {
        toast.error(res.error || "Failed to process request");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error processing redemption action");
    }
  };

  const handleSendBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner) return;
    if (bonusAmount <= 0) {
      toast.error("Bonus amount must be positive");
      return;
    }

    setBonusLoading(true);
    try {
      // Fetch current bank
      const { data: currentBank } = await (supabase
        .from("task_bank") as any)
        .select("*")
        .eq("user_id", partner.id)
        .single();

      if (!currentBank) throw new Error("Could not find partner's bank");

      // Update bank
      const { error: bankError } = await (supabase
        .from("task_bank") as any)
        .update({
          lifetime_tasks: currentBank.lifetime_tasks + bonusAmount,
        })
        .eq("user_id", partner.id);

      if (bankError) throw bankError;

      // Add notification to partner
      await (supabase.from("notifications") as any).insert({
        user_id: partner.id,
        type: "bonus",
        title: "Bonus XP Received! 🎁",
        body: `Your partner granted you +${bonusAmount} bonus tasks! Reason: ${bonusReason || "No reason given."}`,
      });

      // Dispatch NTFY Alert
      await sendNtfyToUser(
        supabase,
        partner.id,
        "Bonus XP Received! 🎁",
        `Your partner granted you +${bonusAmount} bonus tasks! Reason: ${bonusReason || "No reason given."}`,
        "gift"
      );

      toast.success(`Sent +${bonusAmount} tasks to ${partner.display_name}!`);
      setBonusReason("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to grant bonus");
      console.error(err);
    } finally {
      setBonusLoading(false);
    }
  };

  const handleUpdateStats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner) return;

    setUpdatingStats(true);
    try {
      // 1. Update streak
      const { error: streakError } = await (supabase
        .from("streaks") as any)
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(partnerStreak?.longest_streak || 0, newStreak),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", partner.id);

      if (streakError) throw streakError;

      // 2. Update task bank
      const spent = partnerBank?.spent_tasks || 0;
      const { error: bankError } = await (supabase
        .from("task_bank") as any)
        .update({
          lifetime_tasks: newTasks + spent,
        })
        .eq("user_id", partner.id);

      if (bankError) throw bankError;

      // 3. Send notification to partner
      await (supabase.from("notifications") as any).insert({
        user_id: partner.id,
        type: "stats_adjusted",
        title: "Stats Adjusted by Partner! ⚙️",
        body: `Your stats were updated: Streak = ${newStreak} days, Tasks = ${newTasks}.`,
      });

      // Dispatch NTFY Alert
      await sendNtfyToUser(
        supabase,
        partner.id,
        "Stats Adjusted! ⚙️",
        `Your stats were updated by your partner: Streak = ${newStreak} days, Available Tasks = ${newTasks}.`,
        "gear"
      );

      toast.success("Partner stats updated successfully!");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update stats");
      console.error(err);
    } finally {
      setUpdatingStats(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-dark">
        <span className="text-white/50 text-xs font-heading font-semibold uppercase tracking-widest animate-pulse">
          Fetching partner stats...
        </span>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen pb-24 md:pb-6 flex flex-col">
        <PageHeader displayName={profile?.display_name || "Giver"} role="reward_giver" />
        <div className="page-content flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto p-6">
          <div className="card w-full border-white/[0.08] bg-white/[0.02] p-8 flex flex-col items-center gap-4">
            <AlertCircle className="w-12 h-12 text-primary" />
            <h2 className="text-lg font-heading font-bold text-white leading-none">Unpaired Profile</h2>
            <p className="text-xs font-body text-white/50 leading-relaxed">
              Your partner hasn't connected to this space yet. Share your invite code in settings to start!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-6 flex flex-col">
      <PageHeader
        displayName={profile?.display_name || "Giver"}
        role="reward_giver"
        currentStreak={partnerStreak?.current_streak || 0}
      />

      <div className="flex-1 max-w-4xl w-full mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Partner Status & Bonus */}
        <div className="space-y-6 md:col-span-1">
          {/* Partner Status Card */}
          <div className="card bg-white/[0.02] border-white/[0.06] p-6 flex flex-col items-center">
            <span className="text-[10px] font-heading font-bold text-white/30 uppercase tracking-widest mb-4">
              Partner Streak
            </span>
            <StreakFlame streak={partnerStreak?.current_streak || 0} />
            
            <div className="w-full divider my-5" />
            
            <div className="w-full text-center space-y-1">
              <span className="text-[10px] font-heading font-bold text-white/30 uppercase tracking-widest">
                Today's Progress
              </span>
              <h4 className="font-heading font-black text-xl text-white">
                {partnerProgress?.tasks_completed || 0} / 10 Tasks
              </h4>
              <p className="text-[10px] font-body text-white/50 leading-relaxed">
                {partnerProgress?.streak_qualified
                  ? "Daily streak secured! 🎉"
                  : "Still working on today's goal."}
              </p>
            </div>
            
            <div className="w-full divider my-5" />
            
            <div className="w-full text-center">
              <span className="text-[10px] font-heading font-bold text-white/30 uppercase tracking-widest">
                Partner Balance
              </span>
              <h4 className="font-heading font-black text-lg text-primary mt-1">
                {partnerBank?.available_tasks || 0} Available
              </h4>
            </div>
          </div>

          {/* Grant Bonus XP Card */}
          <div className="card bg-white/[0.02] border-white/[0.06] p-6">
            <h2 className="text-sm font-heading font-bold uppercase tracking-wider text-white/70 mb-4 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              Gift Bonus Tasks
            </h2>
            
            <form onSubmit={handleSendBonus} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/40">
                  Amount
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    {[2, 5, 10].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setBonusAmount(amt)}
                        className={`py-1.5 rounded-lg border text-[10px] font-bold font-heading transition-all ${
                          bonusAmount === amt
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-white/[0.02] border-white/[0.08] text-white/60"
                        }`}
                      >
                        +{amt} Tasks
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={bonusAmount}
                    onChange={(e) => setBonusAmount(Math.max(1, Number(e.target.value)))}
                    className="input w-24 text-center text-xs font-heading font-bold"
                    title="Or enter custom amount"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/40">
                  Reason / Message
                </label>
                <div className="relative flex items-center">
                  <MessageCircle className="absolute left-3 w-3.5 h-3.5 text-white/30" />
                  <input
                    type="text"
                    value={bonusReason}
                    onChange={(e) => setBonusReason(e.target.value)}
                    placeholder="e.g. Cooking a surprise dinner..."
                    className="input pl-9 text-xs py-2 bg-white/[0.02]"
                    maxLength={50}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={bonusLoading}
                className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                <Send className="w-3.5 h-3.5" />
                {bonusLoading ? "Granting..." : `Grant Bonus`}
              </button>
            </form>
          </div>

          {/* Adjust Partner Stats Card */}
          <div className="card bg-white/[0.02] border-white/[0.06] p-6">
            <h2 className="text-sm font-heading font-bold uppercase tracking-wider text-white/70 mb-4 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-primary rotate-45" />
              Adjust Partner Stats
            </h2>
            
            <form onSubmit={handleUpdateStats} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/40">
                    Active Streak (Days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newStreak}
                    onChange={(e) => setNewStreak(Math.max(0, Number(e.target.value)))}
                    className="input text-center text-xs font-heading font-bold"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/40">
                    Available Tasks
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newTasks}
                    onChange={(e) => setNewTasks(Math.max(0, Number(e.target.value)))}
                    className="input text-center text-xs font-heading font-bold"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={updatingStats}
                className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {updatingStats ? "Saving..." : "Save Stat Adjustments"}
              </button>
            </form>
          </div>
        </div>

        {/* MIDDLE COLUMN: Redemptions Queue */}
        <div className="space-y-6 md:col-span-2 flex flex-col">
          <div className="card bg-white/[0.02] border-white/[0.06] p-6 flex-1 flex flex-col min-h-[400px]">
            <h2 className="text-sm font-heading font-bold uppercase tracking-wider text-white/70 mb-4 flex items-center justify-between">
              <span>Redemption Requests</span>
              <span className="badge-primary px-2.5 py-0.5 text-[10px]">
                {redemptions.length} Pending
              </span>
            </h2>

            {/* Queue List */}
            <div className="flex-1 relative overflow-y-auto max-h-[600px] pr-1 space-y-4">
              <AnimatePresence initial={false}>
                {redemptions.length > 0 ? (
                  redemptions.map((red) => (
                    <motion.div
                      key={red.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex flex-col justify-between gap-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl bg-white/[0.04] p-2.5 rounded-2xl border border-white/[0.08]">
                            {red.reward?.icon || "🎁"}
                          </span>
                          <div>
                            <h4 className="font-heading font-black text-sm text-white">
                              {red.reward?.title}
                            </h4>
                            <p className="text-xs text-white/50 mt-1 leading-relaxed">
                              {red.reward?.description}
                            </p>
                            
                            <div className="flex items-center gap-2 text-[10px] text-white/40 mt-2 font-body">
                              <span className="bg-white/[0.05] px-1.5 py-0.5 rounded text-[8px] uppercase font-bold text-white/60">
                                {red.reward?.category}
                              </span>
                              <span>•</span>
                              <span>Cost: <strong>{red.cost_at_time || 0} tasks</strong></span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-3 gap-2 border-t border-white/[0.04] pt-3">
                        {/* Approve */}
                        <button
                          onClick={() => handleActionRedemption(red.id, "approved")}
                          className="flex items-center justify-center gap-1 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-heading font-bold hover:bg-green-500/20 transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>

                        {/* Schedule */}
                        <button
                          onClick={() => {
                            const dateStr = prompt("Enter scheduled date (e.g. Saturday night, or date format):");
                            if (dateStr) {
                              handleActionRedemption(red.id, "scheduled", dateStr);
                            }
                          }}
                          className="flex items-center justify-center gap-1 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-heading font-bold hover:bg-blue-500/20 transition-all cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Schedule
                        </button>

                        {/* Reject */}
                        <button
                          onClick={() => {
                            const reason = prompt("Enter rejection reason (optional):");
                            handleActionRedemption(red.id, "rejected", reason || undefined);
                          }}
                          className="flex items-center justify-center gap-1 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-heading font-bold hover:bg-red-500/20 transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center text-center h-full min-h-[300px] text-white/40 gap-2">
                    <Gift className="w-8 h-8 text-white/20 stroke-[1.5]" />
                    <p className="text-xs font-body leading-relaxed max-w-[200px]">
                      No pending redemptions in the queue. You will be notified when your partner redeems a reward!
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Partner's Completed Tasks Today Card */}
          <div className="card bg-white/[0.02] border-white/[0.06] p-6 flex-col min-h-[300px]">
            <h2 className="text-sm font-heading font-bold uppercase tracking-wider text-white/70 mb-4 flex items-center justify-between">
              <span>Partner's Logged Tasks Today</span>
              <span className="badge-primary px-2.5 py-0.5 text-[10px]">
                {partnerTasks.length} Completed
              </span>
            </h2>

            <div className="flex-1 relative overflow-y-auto max-h-[350px] pr-1 space-y-3">
              <AnimatePresence initial={false}>
                {partnerTasks.length > 0 ? (
                  partnerTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl bg-white/[0.04] p-2 rounded-xl border border-white/[0.06]">
                          {task.icon || "📝"}
                        </span>
                        <div>
                          <h4 className="font-heading font-semibold text-sm text-white/90">
                            {task.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-white/40 mt-1 font-body">
                            <span className="bg-white/[0.05] px-1.5 py-0.5 rounded text-[8px] uppercase font-bold text-white/60">
                              {task.category}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {format(new Date(task.completed_at), "h:mm a")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center text-center h-full min-h-[200px] text-white/40 gap-2">
                    <CheckCircle className="w-8 h-8 text-white/20 stroke-[1.5]" />
                    <p className="text-xs font-body leading-relaxed max-w-[200px]">
                      Your partner hasn't logged any tasks yet today.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
