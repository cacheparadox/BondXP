"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { REWARD_CATEGORIES } from "@/types/supabase";
import { Plus, Edit2, ToggleLeft, ToggleRight, Eye, EyeOff, ArrowUp, ArrowDown, Trash2, Sparkles, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

function getStreakMilestoneDay(reward: any): number {
  const STREAK_DAYS_MAP: Record<string, number> = {
    "short love note": 1,
    "cuddles": 3,
    "massage": 5,
    "sleeping naked": 7,
    "hj / bj": 10,
    "crafts / diy": 12,
    "timestop": 15,
    "surprise small gift": 18,
    "free-use session": 20,
    "special outfit": 25,
    "extended care session": 30,
  };
  
  const titleKey = (reward.title || "").toLowerCase().trim();
  if (STREAK_DAYS_MAP[titleKey]) {
    return STREAK_DAYS_MAP[titleKey];
  }
  
  if (reward.description) {
    const match = reward.description.match(/Day\s+(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  return reward.cost || 0;
}

export default function RewardManager() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);

  // Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<any>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Intimacy");
  const [cost, setCost] = useState(10);
  const [cooldownHours, setCooldownHours] = useState(0);
  const [icon, setIcon] = useState("🎁");
  const [rewardType, setRewardType] = useState<"redemption" | "streak">("redemption");
  const [formLoading, setFormLoading] = useState(false);

  const loadManagerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

      const { data: rew } = await (supabase
        .from("rewards") as any)
        .select("*")
        .eq("couple_session_id", prof.couple_session_id)
        .order("sort_order", { ascending: true });
      setRewards(rew || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load rewards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManagerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateDialog = () => {
    setEditingReward(null);
    setTitle("");
    setDescription("");
    setCategory("Intimacy");
    setCost(10);
    setCooldownHours(0);
    setIcon("🎁");
    setRewardType("redemption");
    setDialogOpen(true);
  };

  const openEditDialog = (reward: any) => {
    setEditingReward(reward);
    setTitle(reward.title);
    setDescription(reward.description || "");
    setCategory(reward.category);
    setCost(reward.cost);
    setCooldownHours(reward.cooldown_hours || 0);
    setIcon(reward.icon || "🎁");
    setRewardType(reward.reward_type || "redemption");
    setDialogOpen(true);
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setFormLoading(true);
    try {
      if (editingReward) {
        // Edit existing reward
        const { error } = await (supabase
          .from("rewards") as any)
          .update({
            title: title.trim(),
            description: description.trim(),
            category: rewardType === 'streak' ? 'Streak' : category,
            cost,
            cooldown_hours: rewardType === 'streak' ? 0 : cooldownHours,
            icon,
            reward_type: rewardType,
          })
          .eq("id", editingReward.id);

        if (error) throw error;
        toast.success("Reward updated successfully!");
      } else {
        // Create new reward
        const { error } = await (supabase
          .from("rewards") as any)
          .insert({
            couple_session_id: profile?.couple_session_id,
            title: title.trim(),
            description: description.trim(),
            category: rewardType === 'streak' ? 'Streak' : category,
            cost,
            cooldown_hours: rewardType === 'streak' ? 0 : cooldownHours,
            icon,
            reward_type: rewardType,
            sort_order: rewards.length,
            created_by: profile?.id,
          });

        if (error) throw error;
        toast.success("New reward added!");
      }

      setDialogOpen(false);
      loadManagerData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save reward");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (reward: any) => {
    try {
      const { error } = await (supabase
        .from("rewards") as any)
        .update({ active: !reward.active })
        .eq("id", reward.id);

      if (error) throw error;
      setRewards((prev) =>
        prev.map((r) => (r.id === reward.id ? { ...r, active: !r.active } : r))
      );
      toast.success(reward.active ? "Reward deactivated" : "Reward activated");
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    }
  };

  const handleToggleHidden = async (reward: any) => {
    try {
      const { error } = await (supabase
        .from("rewards") as any)
        .update({ hidden: !reward.hidden })
        .eq("id", reward.id);

      if (error) throw error;
      setRewards((prev) =>
        prev.map((r) => (r.id === reward.id ? { ...r, hidden: !r.hidden } : r))
      );
      toast.success(reward.hidden ? "Reward is now visible to partner" : "Reward is now hidden from partner");
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle visibility");
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    if (!confirm("Are you sure you want to delete this reward?")) return;

    try {
      const { error } = await (supabase.from("rewards") as any).delete().eq("id", rewardId);
      if (error) throw error;

      toast.success("Reward deleted");
      loadManagerData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete reward");
    }
  };

  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === rewards.length - 1) return;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    const current = rewards[index];
    const target = rewards[swapIndex];

    try {
      // Perform DB updates swap sort order
      const { error: err1 } = await (supabase
        .from("rewards") as any)
        .update({ sort_order: target.sort_order })
        .eq("id", current.id);
      
      const { error: err2 } = await (supabase
        .from("rewards") as any)
        .update({ sort_order: current.sort_order })
        .eq("id", target.id);

      if (err1 || err2) throw new Error("Order swap failed");

      // Swap in local state
      setRewards((prev) => {
        const copy = [...prev];
        copy[index] = { ...target, sort_order: current.sort_order };
        copy[swapIndex] = { ...current, sort_order: target.sort_order };
        return copy.sort((a, b) => a.sort_order - b.sort_order);
      });
    } catch (err: any) {
      toast.error("Failed to reorder items");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-dark">
        <span className="text-white/50 text-xs font-heading font-semibold uppercase tracking-widest animate-pulse">
          Opening admin inventory...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-6 p-4 max-w-4xl w-full mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-heading">
            Reward Catalog
          </h1>
          <p className="text-xs text-white/50 font-body mt-1">
            Create, edit, toggle, and drag-order wishes for your partner.
          </p>
        </div>

        <button
          onClick={openCreateDialog}
          className="btn-primary py-2.5 px-4 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-glow-primary-sm"
        >
          <Plus className="w-4 h-4" />
          Add Reward
        </button>
      </div>

      {/* Rewards Catalog List */}
      <div className="space-y-4">
        {rewards.length > 0 ? (
          rewards.map((reward, idx) => (
            <div
              key={reward.id}
              className={`card flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white/[0.01] border-white/[0.06] transition-all hover:bg-white/[0.02] ${
                !reward.active ? "opacity-60 border-dashed" : ""
              }`}
            >
              {/* Left detail info */}
              <div className="flex items-center gap-3.5">
                <span className="text-2xl bg-white/[0.04] p-2.5 rounded-xl border border-white/[0.08]">
                  {reward.icon || "🎁"}
                </span>
                
                <div>
                  <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                    {reward.title}
                    {reward.hidden && (
                      <span className="flex items-center text-[9px] font-medium font-heading uppercase text-white/40 tracking-wider gap-0.5 bg-white/[0.04] px-1.5 py-0.5 rounded">
                        <EyeOff className="w-2.5 h-2.5" /> Hidden
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-white/40 leading-relaxed max-w-md mt-0.5 font-body">
                    {reward.description || "No description provided."}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-2 font-body text-[10px] text-white/30">
                    <span className="bg-white/[0.04] px-1.5 py-0.5 rounded text-[8px] uppercase font-bold text-white/50">
                      {reward.category}
                    </span>
                    <span>•</span>
                    {reward.reward_type === 'streak' ? (
                      <span>Milestone: <strong>Day {getStreakMilestoneDay(reward)}</strong></span>
                    ) : (
                      <span>Cost: <strong>{reward.cost} tasks</strong></span>
                    )}
                    {reward.reward_type !== 'streak' && reward.cooldown_hours > 0 && (
                      <>
                        <span>•</span>
                        <span>Cooldown: <strong>{reward.cooldown_hours}h</strong></span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Admin controls */}
              <div className="flex items-center gap-2 sm:self-center">
                {/* Active Toggle */}
                <button
                  onClick={() => handleToggleActive(reward)}
                  title={reward.active ? "Deactivate" : "Activate"}
                  className={`p-2 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-all ${
                    reward.active ? "text-primary" : "text-white/30"
                  }`}
                >
                  {reward.active ? (
                    <ToggleRight className="w-5 h-5" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                </button>

                {/* Visibility Toggle */}
                <button
                  onClick={() => handleToggleHidden(reward)}
                  title={reward.hidden ? "Show in store" : "Hide from store"}
                  className="p-2 rounded-lg hover:bg-white/[0.04] text-white/60 hover:text-white cursor-pointer transition-all"
                >
                  {reward.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>

                {/* Edit Button */}
                <button
                  onClick={() => openEditDialog(reward)}
                  title="Edit Reward"
                  className="p-2 rounded-lg hover:bg-white/[0.04] text-white/60 hover:text-white cursor-pointer transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {/* Ordering buttons */}
                <div className="flex flex-col sm:flex-row gap-0.5 sm:gap-1 pl-2 border-l border-white/[0.06]">
                  <button
                    onClick={() => handleMoveOrder(idx, "up")}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-white/[0.04] text-white/40 hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveOrder(idx, "down")}
                    disabled={idx === rewards.length - 1}
                    className="p-1 rounded hover:bg-white/[0.04] text-white/40 hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteReward(reward.id)}
                  title="Delete Reward"
                  className="p-2 rounded-lg hover:bg-red-500/10 text-red-500/50 hover:text-red-400 cursor-pointer transition-all ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center text-white/40 flex flex-col items-center justify-center gap-3 card border-white/[0.06] bg-white/[0.01]">
            <Sparkles className="w-12 h-12 text-white/20 stroke-[1.5]" />
            <h3 className="font-heading font-bold text-sm text-white">Create Your First Reward</h3>
            <p className="text-xs font-body max-w-[240px] leading-relaxed mx-auto">
              Your partner doesn't have any rewards to claim yet! Click "Add Reward" above to seed their store.
            </p>
          </div>
        )}
      </div>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md w-full bg-card border border-white/[0.08] text-white p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-lg text-white">
              {editingReward ? "Modify Reward" : "Add New Reward"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveReward} className="space-y-4 my-2">
            {/* Reward Type Selection */}
            <div className="space-y-1">
              <label className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/40">
                Reward Type
              </label>
              {editingReward ? (
                <input
                  type="text"
                  value={rewardType === "streak" ? "Streak Reward" : "Normal Reward (XP)"}
                  disabled
                  className="input opacity-60 cursor-not-allowed font-semibold"
                />
              ) : (
                <select
                  value={rewardType}
                  onChange={(e) => {
                    const val = e.target.value as "redemption" | "streak";
                    setRewardType(val);
                    if (val === "streak") {
                      setCategory("Streak");
                      setCost(1); // default milestone day
                    } else {
                      setCategory("Intimacy");
                      setCost(10); // default task cost
                    }
                  }}
                  className="input py-3 pr-8 select-custom text-xs font-semibold"
                >
                  <option value="redemption">Normal Reward (Costs Tasks/XP)</option>
                  <option value="streak">Streak Reward (Unlocked by streak days)</option>
                </select>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/40">
                Reward Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cooking a warm lasagna..."
                className="input"
                maxLength={45}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/40">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={rewardType === 'streak' ? "e.g. Day 5 streak reward." : "Details of what this entails..."}
                className="input"
                maxLength={100}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Category selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/40">
                  Category
                </label>
                {rewardType === 'streak' ? (
                  <input
                    type="text"
                    value="Streak"
                    disabled
                    className="input opacity-60 cursor-not-allowed"
                  />
                ) : (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input py-3 pr-8 select-custom"
                  >
                    <option value="Intimacy">Intimacy</option>
                    <option value="Sexual">Sexual</option>
                    <option value="Cute">Cute</option>
                    <option value="Acts of Service">Acts of Service</option>
                    <option value="Monetary">Monetary</option>
                    <option value="Outings">Outings</option>
                    <option value="Special">Special</option>
                  </select>
                )}
              </div>

              {/* Icon / Emoji */}
              <div className="space-y-1">
                <label className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/40">
                  Emoji Icon
                </label>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="e.g. 💆, 👙, 🎁"
                  className="input text-center"
                  maxLength={4}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Cost */}
              <div className="space-y-1">
                <label className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/40">
                  {rewardType === 'streak' ? 'Required Milestone (Days)' : 'Task Cost (XP)'}
                </label>
                <input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  className="input"
                  required
                />
              </div>

              {/* Cooldown */}
              {rewardType !== 'streak' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/40">
                    Cooldown (Hours)
                  </label>
                  <input
                    type="number"
                    value={cooldownHours}
                    onChange={(e) => setCooldownHours(Math.max(0, parseInt(e.target.value) || 0))}
                    min={0}
                    className="input"
                    required
                  />
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="btn-ghost flex-1 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="btn-primary flex-1 py-2 text-xs font-bold"
              >
                {formLoading ? "Saving..." : "Save Reward"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
