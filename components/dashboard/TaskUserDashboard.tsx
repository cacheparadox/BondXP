"use client";

import { useEffect, useState, useRef } from "react";
import PageHeader from "@/components/layout/PageHeader";
import ProgressRing from "@/components/animations/ProgressRing";
import StreakFlame from "@/components/animations/StreakFlame";
import FloatingXP from "@/components/animations/FloatingXP";
import { TASK_PRESETS, getMotivationalMessage, getNextStreakMilestone } from "@/types/supabase";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, CheckCircle, Clock, Trophy, Gift, Send } from "lucide-react";
import { toast } from "sonner";
import { format, startOfDay, endOfDay } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function TaskUserDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [streak, setStreak] = useState<any>(null);
  const [bank, setBank] = useState<any>(null);

  // Streak claiming states
  const [claimEligibility, setClaimEligibility] = useState<any>(null);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [claimingMilestone, setClaimingMilestone] = useState(false);

  // Form State
  const [customTitle, setCustomTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Other");
  const [selectedIcon, setSelectedIcon] = useState("📝");
  const [taskValue, setTaskValue] = useState(1);

  // Animations State (list of floating XP triggers)
  const [floatingXPs, setFloatingXPs] = useState<{ id: string; x: number; y: number; text: string }[]>([]);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  // Local date
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

      // 2. Load streak
      const { data: str } = await (supabase
        .from("streaks") as any)
        .select("*")
        .eq("user_id", user.id)
        .single();
      setStreak(str);

      // 3. Load bank
      const { data: b } = await (supabase
        .from("task_bank") as any)
        .select("*")
        .eq("user_id", user.id)
        .single();
      setBank(b);

      // 4. Load today's tasks
      const start = startOfDay(new Date()).toISOString();
      const end = endOfDay(new Date()).toISOString();

      const response = await fetch(`/api/tasks?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      const resData = await response.json();
      if (resData.tasks) {
        setTasks(resData.tasks);
      }

      // 5. Load claims status
      const claimsRes = await fetch(`/api/streak-claims?localDate=${localDateStr}`);
      const claimsData = await claimsRes.json();
      setClaimEligibility(claimsData);
      if (claimsData.refreshedStreak) {
        setStreak(claimsData.refreshedStreak);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerFloatingXP = (text = "+1 TASK 💖") => {
    let x = window.innerWidth / 2 - 40;
    let y = window.innerHeight / 2 - 40;

    if (addButtonRef.current) {
      const rect = addButtonRef.current.getBoundingClientRect();
      x = rect.left + rect.width / 2 - 40;
      y = rect.top - 20;
    }

    const newXp = {
      id: `${Date.now()}-${Math.random()}`,
      x,
      y,
      text,
    };
    setFloatingXPs((prev) => [...prev, newXp]);
  };

  const handleAddTask = async (title: string, category: string, icon: string, value: number = 1) => {
    if (!title.trim()) return;

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          icon,
          localDate: localDateStr,
          value,
        }),
      });

      const res = await response.json();

      if (res.success) {
        // Optimistic / Direct update
        setTasks((prev) => [res.task, ...prev]);
        setStreak((prev: any) => ({
          ...prev,
          current_streak: res.currentStreak,
        }));
        setBank((prev: any) => ({
          ...prev,
          available_tasks: (prev?.available_tasks || 0) + (res.task.value || 1),
        }));

        triggerFloatingXP(`+${res.task.value || 1} TASK ${icon}`);

        if (res.milestoneUnlocked) {
          toast.success(`Milestone Unlocked: ${res.milestoneUnlocked.title}! 🎉`);
        } else {
          toast.success("Task completed!");
        }

        // Refresh claims eligibility since streak or completion changed
        const claimsRes = await fetch(`/api/streak-claims?localDate=${localDateStr}`);
        const claimsData = await claimsRes.json();
        setClaimEligibility(claimsData);
        if (claimsData.refreshedStreak) {
          setStreak(claimsData.refreshedStreak);
        }
      } else {
        toast.error(res.error || "Failed to log task");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error adding task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      // 1. Delete task row
      const { error } = await (supabase.from("tasks") as any).delete().eq("id", taskId);
      if (error) throw error;

      toast.success("Task deleted");
      
      // Reload everything to recalculate counters correctly
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete task");
    }
  };

  const handleClaimMilestone = async (milestoneDays: number) => {
    setClaimingMilestone(true);
    try {
      const response = await fetch("/api/streak-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestoneDays,
          localDate: localDateStr,
        }),
      });

      const res = await response.json();
      if (res.success) {
        toast.success("Streak milestone reward claimed! 💖");
        setClaimDialogOpen(false);
        // Refresh claim state
        const claimsRes = await fetch(`/api/streak-claims?localDate=${localDateStr}`);
        const claimsData = await claimsRes.json();
        setClaimEligibility(claimsData);
        if (claimsData.refreshedStreak) {
          setStreak(claimsData.refreshedStreak);
        }
      } else {
        toast.error(res.error || "Failed to claim reward");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error claiming reward");
    } finally {
      setClaimingMilestone(false);
    }
  };

  const removeFloatingXp = (id: string) => {
    setFloatingXPs((prev) => prev.filter((xp) => xp.id !== id));
  };

  const totalTasksCompleted = tasks.reduce((sum, t) => sum + (t.value || 1), 0);
  const nextMilestone = getNextStreakMilestone(streak?.current_streak || 0);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-dark">
        <span className="text-white/50 text-xs font-heading font-semibold uppercase tracking-widest animate-pulse">
          Syncing progress...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-6 flex flex-col">
      {/* Floating XP Portal */}
      <AnimatePresence>
        {floatingXPs.map((xp) => (
          <FloatingXP
            key={xp.id}
            id={xp.id}
            x={xp.x}
            y={xp.y}
            text={xp.text}
            onComplete={removeFloatingXp}
          />
        ))}
      </AnimatePresence>

      <PageHeader
        displayName={profile?.display_name || "Sweetheart"}
        role="task_user"
        currentStreak={streak?.current_streak || 0}
      />

      <div className="flex-1 max-w-4xl w-full mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Progress & Streaks */}
        <div className="space-y-6 md:col-span-1">
          {/* Progress Ring Card */}
          <div className="card bg-white/[0.02] border-white/[0.06] flex flex-col items-center justify-center text-center p-6">
            <ProgressRing completed={totalTasksCompleted} required={10} />
            <h3 className="text-sm font-heading font-bold text-white/90 mt-6 max-w-[200px]">
              {getMotivationalMessage(totalTasksCompleted, 10)}
            </h3>
            
            <div className="flex items-center gap-1.5 justify-center mt-3 text-xs text-white/40">
              <Trophy className="w-3.5 h-3.5 text-primary" />
              <span>Available XP: <strong>{bank?.available_tasks || 0} tasks</strong></span>
            </div>
          </div>

          {/* Streak Detail Card */}
          <div className="card bg-white/[0.02] border-white/[0.06] p-6 flex flex-col items-center">
            <StreakFlame streak={streak?.current_streak || 0} />
            <div className="w-full divider my-5" />
            
            {nextMilestone ? (
              <div className="text-center w-full space-y-1">
                <span className="text-[10px] font-heading font-bold text-white/30 uppercase tracking-widest">
                  Next Milestone
                </span>
                <h4 className="font-heading font-black text-sm text-primary flex items-center justify-center gap-1.5">
                  {nextMilestone.milestone.icon} {nextMilestone.milestone.title}
                </h4>
                <p className="text-[10px] font-body text-white/50 leading-relaxed max-w-[200px] mx-auto mt-1">
                  Unlocks in <strong>{nextMilestone.daysAway} {nextMilestone.daysAway === 1 ? "day" : "days"}</strong> at Day {nextMilestone.milestone.days}.
                </p>
              </div>
            ) : (
              <div className="text-center w-full">
                <span className="text-[10px] font-heading font-bold text-white/30 uppercase tracking-widest">
                  Streak Status
                </span>
                <p className="text-xs font-body text-white/60 mt-1">
                  You have unlocked all standard milestones! Keep it going!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE COLUMN: Logging Tasks */}
        <div className="space-y-6 md:col-span-2 flex flex-col">
          {/* STREAK MILESTONE REWARD CARD */}
          {claimEligibility && (
            <AnimatePresence>
              {claimEligibility.eligible && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="card p-5 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 border-primary/20 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="absolute inset-0 w-full h-full bg-shimmer bg-[length:200%_100%] animate-shimmer pointer-events-none opacity-20" />
                  <div className="flex items-center gap-3.5 relative">
                    <span className="text-3xl bg-white/[0.04] p-2.5 rounded-xl border border-white/[0.08] shadow-inner">
                      🎁
                    </span>
                    <div>
                      <h3 className="font-heading font-black text-sm text-white flex items-center gap-1.5">
                        Streak Reward Available!
                        <span className="inline-block animate-ping w-2 h-2 rounded-full bg-primary" />
                      </h3>
                      <p className="text-[11px] text-white/50 leading-relaxed font-body mt-0.5">
                        Your streak is qualified at <strong>{claimEligibility.currentStreak}d</strong>. Pick any milestone reward at or below this level!
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setClaimDialogOpen(true)}
                    className="btn-primary py-2 px-4 text-xs font-bold whitespace-nowrap self-start sm:self-center cursor-pointer shadow-glow-primary-sm animate-pulse relative"
                  >
                    Pick Reward 💖
                  </button>
                </motion.div>
              )}

              {claimEligibility.claim && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-4 bg-white/[0.01] border-green-500/20 text-green-400 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl bg-green-500/5 p-2 rounded-xl border border-green-500/10">
                      {claimEligibility.claim.milestone_icon || "🎁"}
                    </span>
                    <div>
                      <h4 className="font-heading font-bold text-xs text-white">
                        Streak Reward Claimed Today!
                      </h4>
                      <p className="text-[10px] text-white/50 font-body mt-0.5">
                        You chose: <strong>{claimEligibility.claim.milestone_icon} {claimEligibility.claim.milestone_title}</strong> (Day {claimEligibility.claim.milestone_days} milestone).
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-green-400 border border-green-400/20 bg-green-400/5 px-2.5 py-1 rounded-xl">
                    Claimed
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Quick Add Section */}
          <div className="card bg-white/[0.02] border-white/[0.06] p-6">
            <h2 className="text-sm font-heading font-bold uppercase tracking-wider text-white/70 mb-4">
              Quick Log Presets
            </h2>
            
            {/* Presets List */}
            <div className="flex flex-wrap gap-2.5">
              {TASK_PRESETS.map((preset) => (
                <button
                  key={preset.title}
                  onClick={() => handleAddTask(preset.title, preset.category, preset.icon)}
                  className="chip px-4 py-2 border-white/[0.08]"
                >
                  <span>{preset.icon}</span>
                  <span>{preset.title}</span>
                </button>
              ))}
            </div>

            {/* Custom Add Input */}
            <div className="w-full divider my-6" />
            <h2 className="text-sm font-heading font-bold uppercase tracking-wider text-white/70 mb-4">
              Custom Log Entry
            </h2>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddTask(customTitle, selectedCategory, selectedIcon, taskValue);
                setCustomTitle("");
                setTaskValue(1);
              }}
              className="space-y-3"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="What did you get done?"
                  className="input flex-1"
                  maxLength={45}
                  required
                />
                
                <select
                  value={taskValue}
                  onChange={(e) => setTaskValue(Number(e.target.value))}
                  className="input py-3 w-28 select-custom text-center font-heading font-bold text-xs"
                  title="How many standard tasks is this worth?"
                >
                  <option value={1}>1 Task</option>
                  <option value={2}>2 Tasks</option>
                  <option value={3}>3 Tasks</option>
                  <option value={5}>5 Tasks</option>
                  <option value={10}>10 Tasks</option>
                  <option value={15}>15 Tasks</option>
                  <option value={20}>20 Tasks</option>
                </select>
                
                <button
                  type="submit"
                  ref={addButtonRef}
                  className="btn-primary px-4 py-3 flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[10px] text-white/40 font-body pl-1">
                Select a higher task weight for big achievements (e.g. 10 tasks for finishing a project) to count more towards your streak!
              </p>
            </form>
          </div>

          {/* Today's Feed Section */}
          <div className="card bg-white/[0.02] border-white/[0.06] p-6 flex-1 flex flex-col min-h-[300px]">
            <h2 className="text-sm font-heading font-bold uppercase tracking-wider text-white/70 mb-4 flex items-center justify-between">
              <span>Today's Logged Tasks</span>
              <span className="badge-primary px-2.5 py-0.5 text-[10px]">
                {totalTasksCompleted} Completed
              </span>
            </h2>

            {/* Feed List */}
            <div className="flex-1 relative overflow-y-auto max-h-[400px] pr-1 space-y-3">
              <AnimatePresence initial={false}>
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-colors flex items-center justify-between gap-4 group"
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
                            {task.value > 1 && (
                              <span className="bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold">
                                {task.value}x Weight
                              </span>
                            )}
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {format(new Date(task.completed_at), "h:mm a")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-white/30 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center text-center h-full min-h-[200px] text-white/40 gap-2">
                    <CheckCircle className="w-8 h-8 text-white/20 stroke-[1.5]" />
                    <p className="text-xs font-body leading-relaxed max-w-[200px]">
                      No tasks logged yet today. Use the presets above to start earning!
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>

      {/* STREAK MILESTONE PICKER DIALOG */}
      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent className="max-w-md w-full bg-card border border-white/[0.08] text-white p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-lg text-white">
              Claim Streak Reward
            </DialogTitle>
            <DialogDescription className="text-xs text-white/50 mt-1 font-body leading-relaxed">
              Congratulations on securing today's streak! Since your streak is at <strong className="text-white">{claimEligibility?.currentStreak} days</strong>, you can claim any milestone reward below.
            </DialogDescription>
          </DialogHeader>

          {/* List of Available Milestones */}
          <div className="my-4 space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {claimEligibility?.availableMilestones?.map((milestone: any) => (
              <button
                key={milestone.days}
                onClick={() => handleClaimMilestone(milestone.days)}
                disabled={claimingMilestone}
                className="w-full p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-start gap-3.5 text-left cursor-pointer group hover:border-primary/20"
              >
                <span className="text-2xl p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                  {milestone.icon}
                </span>
                <div className="flex-1">
                  <h4 className="font-heading font-bold text-xs text-white group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>{milestone.title}</span>
                    <span className="text-[9px] uppercase tracking-wider text-white/40 font-normal">Day {milestone.days}</span>
                  </h4>
                  <p className="text-[10px] text-white/50 font-body mt-0.5 leading-relaxed">
                    {milestone.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <DialogFooter>
            <button
              onClick={() => setClaimDialogOpen(false)}
              className="w-full btn-ghost py-2 text-xs"
            >
              Cancel
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
