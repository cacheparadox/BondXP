"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { REWARD_CATEGORIES } from "@/types/supabase";
import { Sparkles, Trophy, Flame, Clock, Lock, Send, Gift } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function RewardStore() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [bank, setBank] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showAffordableOnly, setShowAffordableOnly] = useState(false);

  // Cooldown Trackers (stores latest redemptions to calculate remaining cooldowns)
  const [redemptions, setRedemptions] = useState<any[]>([]);

  // Redeem modal state
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [redeemNotes, setRedeemNotes] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const loadStoreData = async () => {
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

      // 2. Get task bank
      const { data: b } = await (supabase
        .from("task_bank") as any)
        .select("*")
        .eq("user_id", user.id)
        .single();
      setBank(b);

      // 3. Get all active & visible redemption rewards in this couple session (excl. streak rewards)
      const { data: rew } = await (supabase
        .from("rewards") as any)
        .select("*")
        .eq("couple_session_id", prof.couple_session_id)
        .eq("reward_type", "redemption")
        .eq("active", true)
        .eq("hidden", false)
        .order("sort_order", { ascending: true });
      setRewards(rew || []);

      // 4. Get active redemptions to track cooldowns
      const { data: red } = await (supabase
        .from("redemptions") as any)
        .select("reward_id, redeemed_at")
        .eq("user_id", user.id)
        .in("status", ["pending", "approved", "scheduled"])
        .order("redeemed_at", { ascending: false });
      setRedemptions(red || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load reward store");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStoreData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCooldownRemaining = (reward: any) => {
    if (reward.cooldown_hours <= 0) return 0;

    const lastRed = redemptions.find((r) => r.reward_id === reward.id);
    if (!lastRed) return 0;

    const diffMs = new Date().getTime() - new Date(lastRed.redeemed_at).getTime();
    const hoursPassed = diffMs / (1000 * 60 * 60);
    
    if (hoursPassed < reward.cooldown_hours) {
      return Math.ceil(reward.cooldown_hours - hoursPassed);
    }
    return 0;
  };

  const handleRequestRedeem = async () => {
    if (!selectedReward) return;

    setRedeeming(true);
    try {
      const response = await fetch("/api/redemptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rewardId: selectedReward.id,
          notes: redeemNotes.trim(),
        }),
      });

      const res = await response.json();

      if (res.success) {
        toast.success(`Redeemed: ${selectedReward.title}! Wish request sent.`);
        setSelectedReward(null);
        setRedeemNotes("");
        // Reload balances
        loadStoreData();
      } else {
        toast.error(res.error || "Failed to request redemption");
      }
    } catch (err: any) {
      toast.error("Error processing redemption");
      console.error(err);
    } finally {
      setRedeeming(false);
    }
  };

  const availableBalance = bank?.available_tasks || 0;

  const filteredRewards = rewards.filter((r) => {
    if (activeCategory !== "all" && r.category !== activeCategory) return false;
    if (showAffordableOnly && availableBalance < r.cost) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-dark">
        <span className="text-white/50 text-xs font-heading font-semibold uppercase tracking-widest animate-pulse">
          Opening store catalog...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-6 p-4 max-w-4xl w-full mx-auto">
      
      {/* Header and Balance */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-heading">
            Reward Store
          </h1>
          <p className="text-xs text-white/50 font-body mt-1">
            Redeem your logged task XP for sweet rewards.
          </p>
        </div>

        {/* Balance Badge */}
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/15 border border-primary/20 text-primary shadow-glow-primary-sm cursor-default">
          <Trophy className="w-5 h-5 fill-primary/10 animate-bounce" />
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 uppercase font-heading font-bold tracking-wider leading-none">
              Balance
            </span>
            <span className="font-heading font-black text-sm mt-0.5 text-white">
              {availableBalance} {availableBalance === 1 ? "task" : "tasks"}
            </span>
          </div>
        </div>
      </div>

      {/* Filters and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        {/* Category Tab List */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none max-w-full sm:max-w-[75%]">
          {REWARD_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`chip whitespace-nowrap px-4 py-2 border-white/[0.06] text-xs font-bold font-heading ${
                activeCategory === cat.id ? "chip-active" : ""
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Affordable filter button */}
        <button
          onClick={() => setShowAffordableOnly(!showAffordableOnly)}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-heading font-bold transition-all cursor-pointer ${
            showAffordableOnly
              ? "bg-primary/10 border-primary text-primary shadow-glow-primary-sm"
              : "bg-white/[0.02] border-white/[0.08] text-white/60 hover:text-white"
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Affordable Only</span>
        </button>
      </div>

      {/* Reward Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4">
        <AnimatePresence mode="popLayout">
          {filteredRewards.length > 0 ? (
            filteredRewards.map((reward) => {
              const cooldownLeft = getCooldownRemaining(reward);
              const isAffordable = availableBalance >= reward.cost;
              const isLocked = !isAffordable || cooldownLeft > 0;

              return (
                <motion.div
                  key={reward.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={!isLocked ? { y: -2 } : {}}
                  className={`card flex flex-col p-5 bg-white/[0.02] border-white/[0.06] relative overflow-hidden transition-all duration-200 ${
                    isLocked ? "opacity-75" : "hover:border-primary/30"
                  }`}
                >
                  {/* Shimmer effect if affordable and unlocked */}
                  {!isLocked && (
                    <div className="absolute inset-0 w-full h-full bg-shimmer bg-[length:200%_100%] animate-shimmer pointer-events-none opacity-20" />
                  )}

                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-3xl bg-white/[0.04] p-2.5 rounded-2xl border border-white/[0.08] shadow-inner">
                      {reward.icon || "🎁"}
                    </span>
                    
                    {/* Cost Badge */}
                    <span className={`badge font-bold font-heading text-xs px-2.5 py-1 ${
                      isAffordable
                        ? "bg-primary/10 border border-primary/20 text-primary"
                        : "bg-white/[0.04] text-white/50 border border-white/[0.06]"
                    }`}>
                      {reward.cost} Tasks
                    </span>
                  </div>

                  {/* Body Info */}
                  <div className="mt-4 flex-1">
                    <h3 className="font-heading font-black text-sm text-white">
                      {reward.title}
                    </h3>
                    <p className="text-xs text-white/50 leading-relaxed mt-1 font-body">
                      {reward.description}
                    </p>
                  </div>

                  {/* Footer Action */}
                  <div className="mt-6 pt-4 border-t border-white/[0.04] flex flex-col gap-2">
                    {cooldownLeft > 0 ? (
                      <div className="flex items-center justify-center gap-1 text-[10px] text-orange-400 font-heading font-bold bg-orange-400/5 py-2.5 rounded-xl border border-orange-400/10">
                        <Clock className="w-3.5 h-3.5" />
                        Cooldown: {cooldownLeft}h left
                      </div>
                    ) : !isAffordable ? (
                      <div className="flex items-center justify-center gap-1 text-[10px] text-white/40 font-heading font-bold bg-white/[0.02] py-2.5 rounded-xl border border-white/[0.06]">
                        <Lock className="w-3.5 h-3.5" />
                        Need {reward.cost - availableBalance} more tasks
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedReward(reward)}
                        className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Redeem Wish
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-full py-20 text-center text-white/40 flex flex-col items-center justify-center gap-3">
              <Gift className="w-12 h-12 text-white/20 stroke-[1.5]" />
              <h3 className="font-heading font-bold text-sm text-white">No Rewards Found</h3>
              <p className="text-xs font-body max-w-[200px] leading-relaxed">
                There are no active rewards under this category.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Redemption Dialog */}
      <Dialog open={!!selectedReward} onOpenChange={(open) => !open && setSelectedReward(null)}>
        <DialogContent className="max-w-md w-full bg-card border border-white/[0.08] text-white p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-lg text-white">
              Confirm Redemption
            </DialogTitle>
            <DialogDescription className="text-xs text-white/50 mt-1 font-body leading-relaxed">
              Are you sure you want to request: <strong className="text-white">{selectedReward?.icon} {selectedReward?.title}</strong>? This will deduct <strong className="text-primary">{selectedReward?.cost} tasks</strong> from your XP balance.
            </DialogDescription>
          </DialogHeader>

          {/* Notes input */}
          <div className="space-y-1.5 my-4">
            <label className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/40">
              Redemption Note / Message (Optional)
            </label>
            <textarea
              value={redeemNotes}
              onChange={(e) => setRedeemNotes(e.target.value)}
              placeholder="Add a sweet message, or details (e.g. which outfit, or date preferences)..."
              className="w-full rounded-xl p-3 text-xs bg-white/[0.02] border border-white/[0.08] outline-none focus:border-primary text-white min-h-[80px] resize-none"
              maxLength={150}
            />
          </div>

          <DialogFooter className="flex gap-2">
            <button
              onClick={() => setSelectedReward(null)}
              className="btn-ghost flex-1 py-2 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleRequestRedeem}
              disabled={redeeming}
              className="btn-primary flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              {redeeming ? "Processing..." : "Confirm Wish"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
