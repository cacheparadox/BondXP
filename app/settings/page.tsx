"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { createClient } from "@/lib/supabase/client";
import { BADGES } from "@/types/supabase";
import { motion } from "framer-motion";
import { User, Bell, Palette, Award, Check, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  
  // Profile & stats (needed for badge evaluation)
  const [profile, setProfile] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [bank, setBank] = useState<any>(null);

  // Form States
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [ntfyTopic, setNtfyTopic] = useState("");
  
  // Theme Config States
  const [primaryColor, setPrimaryColor] = useState("#FF4D8D");
  const [bgColor, setBgColor] = useState("#121212");
  const [cardColor, setCardColor] = useState("#1E1E1E");
  const [fontHeading, setFontHeading] = useState("Outfit");
  const [fontBody, setFontBody] = useState("Inter");

  const [saving, setSaving] = useState(false);

  // Import Rewards states
  const [jsonInput, setJsonInput] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [importing, setImporting] = useState(false);

  const loadSettingsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get profile
      const { data: prof } = await (supabase
        .from("users") as any)
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (!prof || !prof.couple_session_id) {
        router.push("/pairing");
        return;
      }
      setProfile(prof);

      // Load states
      setDisplayName(prof.display_name || "");
      setTimezone(prof.timezone || "UTC");
      setNtfyTopic(prof.ntfy_topic || "");

      // Load theme config
      const tc = prof.theme_config || {};
      setPrimaryColor(tc.colorPrimary || "#FF4D8D");
      setBgColor(tc.colorBg || "#121212");
      setCardColor(tc.colorCard || "#1E1E1E");
      setFontHeading(tc.fontHeading || "Outfit");
      setFontBody(tc.fontBody || "Inter");

      // 2. Get streak & bank stats for badge evaluation
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

      const { data: str } = await (supabase
        .from("streaks") as any)
        .select("*")
        .eq("user_id", taskUserId)
        .single();
      setStreak(str);

      const { data: b } = await (supabase
        .from("task_bank") as any)
        .select("*")
        .eq("user_id", taskUserId)
        .single();
      setBank(b);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const themeConfig = {
        colorPrimary: primaryColor,
        colorBg: bgColor,
        colorCard: cardColor,
        fontHeading,
        fontBody,
      };

      // 1. Update DB profile
      const { error } = await (supabase
        .from("users") as any)
        .update({
          display_name: displayName.trim(),
          timezone,
          ntfy_topic: ntfyTopic.trim() || null,
          theme_config: themeConfig,
        })
        .eq("id", profile?.id);

      if (error) throw error;

      // 2. Save in localStorage cache for instant loading
      localStorage.setItem("bondxp-theme", JSON.stringify(themeConfig));

      // 3. Inject CSS properties immediately
      const root = document.documentElement;
      root.style.setProperty("--color-primary", primaryColor);
      root.style.setProperty("--color-primary-glow", `${primaryColor}59`);
      root.style.setProperty("--color-bg", bgColor);
      root.style.setProperty("--color-card", cardColor);
      root.style.setProperty("--color-card-hover", `${cardColor}dd`);
      root.style.setProperty("--font-heading", `'${fontHeading}', 'Outfit', sans-serif`);
      root.style.setProperty("--font-body", `'${fontBody}', 'Inter', sans-serif`);

      toast.success("Settings and theme saved! ❤️");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleResetTheme = () => {
    setPrimaryColor("#FF4D8D");
    setBgColor("#121212");
    setCardColor("#1E1E1E");
    setFontHeading("Outfit");
    setFontBody("Inter");
    toast.info("Theme reset to defaults. Remember to click save!");
  };

  const handleImportRewards = async () => {
    if (!jsonInput.trim()) {
      toast.error("Please enter a JSON string");
      return;
    }

    setImporting(true);
    try {
      const parsed = JSON.parse(jsonInput.trim());
      if (!Array.isArray(parsed)) {
        throw new Error("JSON must be a list of rewards (an array)");
      }

      const validated = parsed.map((item: any, index: number) => {
        if (!item.title || !item.title.trim()) {
          throw new Error(`Reward at index ${index} is missing a title`);
        }
        if (!item.category) {
          throw new Error(`Reward "${item.title}" is missing a category`);
        }
        if (typeof item.cost !== "number" || item.cost < 0) {
          throw new Error(`Reward "${item.title}" cost must be a non-negative number`);
        }
        
        return {
          couple_session_id: profile?.couple_session_id,
          title: item.title.trim(),
          description: item.description || "",
          category: item.category,
          cost: item.cost,
          reward_type: item.reward_type || "redemption",
          icon: item.icon || "🎁",
          cooldown_hours: item.cooldown_hours || 0,
          active: item.active !== undefined ? item.active : true,
          hidden: item.hidden !== undefined ? item.hidden : false,
          sort_order: item.sort_order || index,
          created_by: profile?.id,
        };
      });

      if (overwrite) {
        const { error: deleteError } = await (supabase
          .from("rewards") as any)
          .delete()
          .eq("couple_session_id", profile?.couple_session_id);
        
        if (deleteError) throw deleteError;
      }

      const { error: insertError } = await (supabase
        .from("rewards") as any)
        .insert(validated);

      if (insertError) throw insertError;

      toast.success(`Successfully imported ${validated.length} rewards! 🎉`);
      setJsonInput("");
    } catch (err: any) {
      toast.error(err.message || "Invalid JSON format");
      console.error(err);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-dark text-white">
        <span className="text-white/50 text-xs font-heading font-semibold uppercase tracking-widest animate-pulse">
          Opening cabinet...
        </span>
      </div>
    );
  }

  // Evaluate badge metrics
  const badgeStats = {
    currentStreak: streak?.current_streak || 0,
    longestStreak: streak?.longest_streak || 0,
    lifetimeTasks: bank?.lifetime_tasks || 0,
  };

  return (
    <AppShell>
      <PageHeader
        displayName={profile?.display_name || "Sweetheart"}
        role={profile?.role || "task_user"}
        currentStreak={streak?.current_streak || 0}
      />

      <div className="page-content max-w-4xl w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Profile & Settings Form */}
        <div className="space-y-6 md:col-span-2">
          
          {/* Main Settings Form */}
          <form onSubmit={handleSaveSettings} className="card bg-white/[0.02] border-white/[0.06] p-6 space-y-6">
            
            {/* Section A: Profile Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5 border-b border-white/[0.04] pb-2">
                <User className="w-4 h-4 text-primary" />
                Profile Settings
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/40">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input"
                    maxLength={30}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/40">
                    Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="input py-3 select-custom"
                  >
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                    <option value="America/New_York">EST (Eastern Standard Time)</option>
                    <option value="Europe/London">GMT (London Time)</option>
                    <option value="Asia/Kolkata">IST (Indian Standard Time)</option>
                    <option value="Asia/Tokyo">JST (Tokyo Time)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section B: NTFY Push notifications */}
            <div className="space-y-4 pt-4 border-t border-white/[0.04]">
              <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5 border-b border-white/[0.04] pb-2">
                <Bell className="w-4 h-4 text-primary" />
                Push Notifications (NTFY)
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/40">
                    Private NTFY Topic Topic
                  </label>
                  <input
                    type="text"
                    value={ntfyTopic}
                    onChange={(e) => setNtfyTopic(e.target.value)}
                    placeholder="e.g. bondxp-private-alerts-923"
                    className="input font-mono"
                    maxLength={50}
                  />
                </div>

                <div className="p-3.5 rounded-xl border border-blue-500/10 bg-blue-500/5 text-blue-400 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-[10px] font-body leading-relaxed">
                    <strong className="text-white">How it works:</strong> Install the free <strong>NTFY App</strong> on iOS/Android, and subscribe to this private topic name. You'll receive instant notification pings whenever your partner submits task records or claims store rewards!
                  </div>
                </div>
              </div>
            </div>

            {/* Section C: Theme Editor */}
            <div className="space-y-4 pt-4 border-t border-white/[0.04]">
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-primary" />
                  Theme customizer
                </h3>
                <button
                  type="button"
                  onClick={handleResetTheme}
                  className="text-[9px] font-heading font-bold uppercase tracking-widest text-white/40 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Reset
                </button>
              </div>

              {/* Color pickers */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1 flex flex-col items-center">
                  <label className="text-[9px] font-heading font-bold uppercase tracking-wider text-white/40">
                    Primary Color
                  </label>
                  <div className="relative w-full h-12 rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.02]">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-full h-full flex items-center justify-center pointer-events-none">
                      <div className="w-6 h-6 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: primaryColor }} />
                    </div>
                  </div>
                </div>

                <div className="space-y-1 flex flex-col items-center">
                  <label className="text-[9px] font-heading font-bold uppercase tracking-wider text-white/40">
                    Background
                  </label>
                  <div className="relative w-full h-12 rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.02]">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-full h-full flex items-center justify-center pointer-events-none">
                      <div className="w-6 h-6 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: bgColor }} />
                    </div>
                  </div>
                </div>

                <div className="space-y-1 flex flex-col items-center">
                  <label className="text-[9px] font-heading font-bold uppercase tracking-wider text-white/40">
                    Card Surface
                  </label>
                  <div className="relative w-full h-12 rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.02]">
                    <input
                      type="color"
                      value={cardColor}
                      onChange={(e) => setCardColor(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-full h-full flex items-center justify-center pointer-events-none">
                      <div className="w-6 h-6 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: cardColor }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Font selectors */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-heading font-bold uppercase tracking-wider text-white/40">
                    Heading Font
                  </label>
                  <select
                    value={fontHeading}
                    onChange={(e) => setFontHeading(e.target.value)}
                    className="input py-2.5 text-xs select-custom"
                  >
                    <option value="Outfit">Outfit (Round, Modern)</option>
                    <option value="Poppins">Poppins (Sweet, Geometric)</option>
                    <option value="Inter">Inter (Sleek, Clean)</option>
                    <option value="Quicksand">Quicksand (Cozy, Playful)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-heading font-bold uppercase tracking-wider text-white/40">
                    Body Font
                  </label>
                  <select
                    value={fontBody}
                    onChange={(e) => setFontBody(e.target.value)}
                    className="input py-2.5 text-xs select-custom"
                  >
                    <option value="Inter">Inter (Highly Readable)</option>
                    <option value="Poppins">Poppins (Slightly Rounded)</option>
                    <option value="Outfit">Outfit (Clean Sans)</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full btn-primary py-3.5 flex items-center justify-center gap-1.5 cursor-pointer font-bold text-sm"
            >
              <Check className="w-4 h-4" />
              {saving ? "Saving Configurations..." : "Save Settings & Theme"}
            </button>
          </form>

          {/* Section: Import Rewards JSON (Only for Reward Giver) */}
          {profile?.role === "reward_giver" && (
            <div className="card bg-white/[0.02] border-white/[0.06] p-6 space-y-4 mt-6">
              <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5 border-b border-white/[0.04] pb-2">
                <Palette className="w-4 h-4 text-primary" />
                Import Custom Rewards (JSON)
              </h3>
              
              <div className="space-y-3">
                <p className="text-[10px] text-white/50 leading-relaxed font-body">
                  Paste a JSON array of your custom rewards to populate your partner's store.
                </p>

                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={`[\n  {\n    "title": "Breakfast in bed",\n    "description": "Any basic breakfast cooked and delivered",\n    "category": "Acts of Service",\n    "cost": 15,\n    "icon": "🍳",\n    "cooldown_hours": 24,\n    "reward_type": "redemption"\n  }\n]`}
                  className="w-full h-32 rounded-xl p-3 text-xs font-mono bg-black/40 border border-white/[0.08] outline-none focus:border-primary text-white resize-none"
                />

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="overwriteRewards"
                    checked={overwrite}
                    onChange={(e) => setOverwrite(e.target.checked)}
                    className="rounded border-white/[0.08] bg-white/[0.02] text-primary focus:ring-primary w-3.5 h-3.5"
                  />
                  <label htmlFor="overwriteRewards" className="text-[10px] font-heading font-semibold text-white/60 select-none cursor-pointer">
                    Clear existing rewards in this space before importing
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleImportRewards}
                  disabled={importing}
                  className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  {importing ? "Importing..." : "Import Rewards"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Achievement Badge Collection */}
        <div className="space-y-6 md:col-span-1">
          <div className="card bg-white/[0.02] border-white/[0.06] p-6">
            <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-white/70 mb-4 flex items-center gap-1.5 border-b border-white/[0.04] pb-2">
              <Award className="w-4 h-4 text-primary" />
              Achievements
            </h3>

            {/* Badges Stack */}
            <div className="space-y-4">
              {BADGES.map((badge) => {
                const isUnlocked = badge.unlockCondition(badgeStats);

                return (
                  <div
                    key={badge.id}
                    className={`p-3.5 rounded-2xl border flex items-start gap-3.5 transition-all duration-300 relative overflow-hidden ${
                      isUnlocked
                        ? "bg-white/[0.02] border-primary/20 shadow-glow-primary-sm"
                        : "bg-black/10 border-white/[0.05] opacity-50"
                    }`}
                  >
                    {/* Badge Icon */}
                    <span className={`text-2xl p-2 rounded-xl border flex items-center justify-center ${
                      isUnlocked
                        ? "bg-primary/5 border-primary/20"
                        : "bg-white/[0.02] border-white/[0.05]"
                    }`}>
                      {badge.icon}
                    </span>

                    {/* Badge details */}
                    <div>
                      <h4 className={`font-heading font-bold text-xs ${isUnlocked ? "text-white" : "text-white/40"}`}>
                        {badge.title}
                      </h4>
                      <p className="text-[10px] text-white/50 mt-0.5 leading-relaxed font-body">
                        {badge.description}
                      </p>
                    </div>

                    {/* Status marker */}
                    {isUnlocked && (
                      <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary text-[8px] font-bold">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
