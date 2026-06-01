// ================================================================
// BondXP — Supabase Database Types
// ================================================================

export type UserRole = "task_user" | "reward_giver";
export type RewardType = "streak" | "redemption";
export type RedemptionStatus = "pending" | "approved" | "rejected" | "scheduled";

export interface Database {
  public: {
    Tables: {
      couple_sessions: {
        Row: {
          id: string;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          invite_code?: string;
        };
        Update: {
          id?: string;
          invite_code?: string;
        };
      };

      users: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          role: UserRole;
          couple_session_id: string | null;
          avatar_url: string | null;
          timezone: string;
          ntfy_topic: string | null;
          theme_config: ThemeConfig;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "created_at"> & { id: string };
        Update: Partial<Omit<Database["public"]["Tables"]["users"]["Row"], "id">>;
      };

      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["push_subscriptions"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Insert"]>;
      };

      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          category: string | null;
          icon: string | null;
          note: string | null;
          value: number;
          completed_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tasks"]["Row"], "id" | "created_at" | "completed_at" | "value"> & {
          id?: string;
          value?: number;
          completed_at?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["tasks"]["Row"], "id">>;
      };

      daily_progress: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          tasks_completed: number;
          streak_qualified: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["daily_progress"]["Row"], "id"> & { id?: string };
        Update: Partial<Omit<Database["public"]["Tables"]["daily_progress"]["Row"], "id">>;
      };

      streaks: {
        Row: {
          id: string;
          user_id: string;
          current_streak: number;
          longest_streak: number;
          last_completion_date: string | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["streaks"]["Row"], "id" | "updated_at"> & { id?: string };
        Update: Partial<Omit<Database["public"]["Tables"]["streaks"]["Row"], "id">>;
      };

      task_bank: {
        Row: {
          user_id: string;
          lifetime_tasks: number;
          spent_tasks: number;
          available_tasks: number;
        };
        Insert: Omit<Database["public"]["Tables"]["task_bank"]["Row"], "available_tasks">;
        Update: Pick<Database["public"]["Tables"]["task_bank"]["Row"], "lifetime_tasks" | "spent_tasks">;
      };

      rewards: {
        Row: {
          id: string;
          couple_session_id: string | null;
          title: string;
          description: string | null;
          category: string;
          cost: number;
          reward_type: RewardType;
          icon: string | null;
          cooldown_hours: number;
          hidden: boolean;
          active: boolean;
          sort_order: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["rewards"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<Database["public"]["Tables"]["rewards"]["Row"], "id" | "created_at">>;
      };

      redemptions: {
        Row: {
          id: string;
          reward_id: string;
          user_id: string;
          status: RedemptionStatus;
          redeemed_at: string;
          approved_at: string | null;
          scheduled_at: string | null;
          notes: string | null;
          cost_at_time: number | null;
        };
        Insert: Omit<Database["public"]["Tables"]["redemptions"]["Row"], "id" | "redeemed_at"> & {
          id?: string;
          redeemed_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["redemptions"]["Row"], "id" | "user_id">>;
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<Database["public"]["Tables"]["notifications"]["Row"], "id">>;
      };

      streak_reward_claims: {
        Row: {
          id: string;
          user_id: string;
          claimed_date: string;
          streak_at_claim: number;
          milestone_days: number;
          milestone_title: string;
          milestone_icon: string | null;
          claimed_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["streak_reward_claims"]["Row"], "id" | "claimed_at"> & { id?: string };
        Update: never; // claims are immutable
      };

      analytics: {
        Row: {
          id: string;
          user_id: string;
          month: string;
          streak_days: number;
          tasks_completed: number;
          rewards_redeemed: number;
        };
        Insert: Omit<Database["public"]["Tables"]["analytics"]["Row"], "id"> & { id?: string };
        Update: Partial<Omit<Database["public"]["Tables"]["analytics"]["Row"], "id">>;
      };

      notes: {
        Row: {
          id: string;
          couple_session_id: string;
          sender_id: string;
          content: string;
          image_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notes"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["notes"]["Row"], "id" | "created_at">>;
      };
    };
  };
}

// ================================================================
// Domain Types (derived from DB rows for convenience)
// ================================================================

export type User = Database["public"]["Tables"]["users"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type DailyProgress = Database["public"]["Tables"]["daily_progress"]["Row"];
export type Streak = Database["public"]["Tables"]["streaks"]["Row"];
export type TaskBank = Database["public"]["Tables"]["task_bank"]["Row"];
export type Reward = Database["public"]["Tables"]["rewards"]["Row"];
export type Redemption = Database["public"]["Tables"]["redemptions"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type StreakRewardClaim = Database["public"]["Tables"]["streak_reward_claims"]["Row"];
export type Analytics = Database["public"]["Tables"]["analytics"]["Row"];
export type CoupleSession = Database["public"]["Tables"]["couple_sessions"]["Row"];
export type PushSubscription = Database["public"]["Tables"]["push_subscriptions"]["Row"];
export type Note = Database["public"]["Tables"]["notes"]["Row"];

// ================================================================
// Theme Config
// ================================================================

export interface ThemeConfig {
  colorPrimary?: string;
  colorBg?: string;
  colorCard?: string;
  fontHeading?: string;
  fontBody?: string;
}

// ================================================================
// Streak Milestones
// ================================================================

export interface StreakMilestone {
  days: number;
  title: string;
  icon: string;
  description: string;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 1,  title: "Short Love Note",       icon: "💌", description: "A heartfelt written note." },
  { days: 3,  title: "Cuddles",               icon: "🤗", description: "A long cuddle session." },
  { days: 5,  title: "Massage",               icon: "💆", description: "A full body massage." },
  { days: 7,  title: "Sleeping Naked",         icon: "🌙", description: "Sleeping together, no clothes." },
  { days: 10, title: "HJ / BJ",               icon: "💦", description: "Full-on pleasure session." },
  { days: 12, title: "Crafts / DIY",           icon: "🎨", description: "A handmade gift or craft." },
  { days: 15, title: "Timestop",               icon: "⏱️", description: "A timestop scenario of your choosing." },
  { days: 18, title: "Surprise Small Gift",    icon: "🎁", description: "A surprise gift." },
  { days: 20, title: "Free-use Session",       icon: "🎭", description: "A scheduled free-use block." },
  { days: 25, title: "Special Outfit",         icon: "👗", description: "Wear a chosen outfit." },
  { days: 30, title: "Extended Care Session",  icon: "💆‍♀️", description: "A long, dedicated care session." },
];

/**
 * Returns all streak milestone rewards the user is eligible to pick from
 * on a given day — i.e. every milestone at or below their current streak.
 *
 * Rules:
 * - Must be a milestone day (streak is exactly at a milestone, or has passed one today)
 * - User may pick ONE reward from this pool for the day
 * - Selection must happen same day (before midnight reset)
 * - Cannot stack: only one streak reward claim per streak-qualification day
 */
export function getAvailableStreakRewards(
  currentStreak: number
): StreakMilestone[] {
  return STREAK_MILESTONES.filter((m) => m.days <= currentStreak);
}

/**
 * Returns the next upcoming milestone the user hasn't hit yet,
 * and how many days away it is.
 */
export function getNextStreakMilestone(
  currentStreak: number
): { milestone: StreakMilestone; daysAway: number } | null {
  const next = STREAK_MILESTONES.find((m) => m.days > currentStreak);
  if (!next) return null;
  return { milestone: next, daysAway: next.days - currentStreak };
}

/**
 * Returns true if today is a milestone day (streak just hit a new milestone).
 * Used to trigger the streak reward picker.
 */
export function isMilestoneDay(currentStreak: number): boolean {
  return STREAK_MILESTONES.some((m) => m.days === currentStreak);
}

// ================================================================
// Achievement Badges
// ================================================================

export interface Badge {
  id: string;
  title: string;
  icon: string;
  description: string;
  unlockCondition: (stats: { currentStreak: number; longestStreak: number; lifetimeTasks: number; wishesMet: number }) => boolean;
}

export const BADGES: Badge[] = [
  {
    id: "baby_steps",
    title: "Baby Steps",
    icon: "🐣",
    description: "Completed your first logged task.",
    unlockCondition: ({ lifetimeTasks }) => lifetimeTasks >= 1,
  },
  {
    id: "high_five",
    title: "High Five",
    icon: "✋",
    description: "Completed 5 lifetime tasks.",
    unlockCondition: ({ lifetimeTasks }) => lifetimeTasks >= 5,
  },
  {
    id: "getting_warm",
    title: "Getting Warm",
    icon: "🔥",
    description: "Completed 10 lifetime tasks.",
    unlockCondition: ({ lifetimeTasks }) => lifetimeTasks >= 10,
  },
  {
    id: "dynamic_duo",
    title: "Dynamic Duo",
    icon: "🤝",
    description: "Completed 20 lifetime tasks.",
    unlockCondition: ({ lifetimeTasks }) => lifetimeTasks >= 20,
  },
  {
    id: "duo_power",
    title: "Duo Power",
    icon: "⚡",
    description: "Completed 40 lifetime tasks.",
    unlockCondition: ({ lifetimeTasks }) => lifetimeTasks >= 40,
  },
  {
    id: "consistency_arc",
    title: "Consistency Arc",
    icon: "📈",
    description: "Accumulated 60 lifetime tasks.",
    unlockCondition: ({ lifetimeTasks }) => lifetimeTasks >= 60,
  },
  {
    id: "efficiency_experts",
    title: "Efficiency Experts",
    icon: "⚙️",
    description: "Completed 80 lifetime tasks.",
    unlockCondition: ({ lifetimeTasks }) => lifetimeTasks >= 80,
  },
  {
    id: "task_titan",
    title: "Task Titan",
    icon: "⚔️",
    description: "Accumulated 100 lifetime tasks.",
    unlockCondition: ({ lifetimeTasks }) => lifetimeTasks >= 100,
  },
  {
    id: "century_club",
    title: "Century Club",
    icon: "💯",
    description: "Completed 150 lifetime tasks.",
    unlockCondition: ({ lifetimeTasks }) => lifetimeTasks >= 150,
  },
  {
    id: "relentless",
    title: "Relentless",
    icon: "🦁",
    description: "Accumulated 200 lifetime tasks.",
    unlockCondition: ({ lifetimeTasks }) => lifetimeTasks >= 200,
  },
  {
    id: "workhorse",
    title: "Workhorse",
    icon: "🐴",
    description: "Completed 300 lifetime tasks.",
    unlockCondition: ({ lifetimeTasks }) => lifetimeTasks >= 300,
  },
  {
    id: "milestone_mastery",
    title: "Milestone Mastery",
    icon: "🏆",
    description: "Completed 400 lifetime tasks.",
    unlockCondition: ({ lifetimeTasks }) => lifetimeTasks >= 400,
  },
  {
    id: "task_overlord",
    title: "Task Overlord",
    icon: "👑",
    description: "Completed 500 lifetime tasks.",
    unlockCondition: ({ lifetimeTasks }) => lifetimeTasks >= 500,
  },
  {
    id: "apex_achievers",
    title: "Apex Achievers",
    icon: "🗻",
    description: "Completed 750 lifetime tasks.",
    unlockCondition: ({ lifetimeTasks }) => lifetimeTasks >= 750,
  },
  {
    id: "grandmasters",
    title: "Grandmasters",
    icon: "🧙‍♂️",
    description: "Completed 1000 lifetime tasks.",
    unlockCondition: ({ lifetimeTasks }) => lifetimeTasks >= 1000,
  },
  {
    id: "spark_initiator",
    title: "Spark Initiator",
    icon: "✨",
    description: "Hit an active 3-day streak.",
    unlockCondition: ({ currentStreak }) => currentStreak >= 3,
  },
  {
    id: "five_star_duo",
    title: "Five-Star Duo",
    icon: "⭐",
    description: "Hit an active 5-day streak.",
    unlockCondition: ({ currentStreak }) => currentStreak >= 5,
  },
  {
    id: "discipline_demon",
    title: "Discipline Demon",
    icon: "😈",
    description: "Hit an active 7-day streak.",
    unlockCondition: ({ currentStreak }) => currentStreak >= 7,
  },
  {
    id: "double_digits",
    title: "Double Digits",
    icon: "🔟",
    description: "Hit an active 10-day streak.",
    unlockCondition: ({ currentStreak }) => currentStreak >= 10,
  },
  {
    id: "habit_builder",
    title: "Habit Builder",
    icon: "🔨",
    description: "Hit an active 14-day streak.",
    unlockCondition: ({ currentStreak }) => currentStreak >= 14,
  },
  {
    id: "three_weeks_strong",
    title: "Three Weeks Strong",
    icon: "📅",
    description: "Hit an active 21-day streak.",
    unlockCondition: ({ currentStreak }) => currentStreak >= 21,
  },
  {
    id: "locked_in",
    title: "Locked In",
    icon: "🔒",
    description: "Hit an active 30-day streak.",
    unlockCondition: ({ currentStreak }) => currentStreak >= 30,
  },
  {
    id: "half_century_run",
    title: "Half Century Run",
    icon: "🏃‍♂️",
    description: "Hit an active 45-day streak.",
    unlockCondition: ({ currentStreak }) => currentStreak >= 45,
  },
  {
    id: "streak_legend",
    title: "Streak Legend",
    icon: "🌟",
    description: "Hit an active 50-day streak.",
    unlockCondition: ({ currentStreak }) => currentStreak >= 50,
  },
  {
    id: "diamond_bond",
    title: "Diamond Bond",
    icon: "💎",
    description: "Hit an active 75-day streak.",
    unlockCondition: ({ currentStreak }) => currentStreak >= 75,
  },
  {
    id: "century_streak",
    title: "Century Streak",
    icon: "💯",
    description: "Hit an active 100-day streak.",
    unlockCondition: ({ currentStreak }) => currentStreak >= 100,
  },
  {
    id: "untouchable",
    title: "Untouchable",
    icon: "🚀",
    description: "Hit an active 150-day streak.",
    unlockCondition: ({ currentStreak }) => currentStreak >= 150,
  },
  {
    id: "year_of_bond",
    title: "Year of Bond",
    icon: "☀️",
    description: "Hit an active 365-day streak.",
    unlockCondition: ({ currentStreak }) => currentStreak >= 365,
  },
  {
    id: "seven_day_beast",
    title: "7-Day Beast",
    icon: "🐾",
    description: "Achieved a longest streak of 7 days.",
    unlockCondition: ({ longestStreak }) => longestStreak >= 7,
  },
  {
    id: "fortnight_focus",
    title: "Fortnight Focus",
    icon: "🌗",
    description: "Achieved a longest streak of 14 days.",
    unlockCondition: ({ longestStreak }) => longestStreak >= 14,
  },
  {
    id: "unbreakable",
    title: "Unbreakable",
    icon: "🛡️",
    description: "Achieved a longest streak of 30 days.",
    unlockCondition: ({ longestStreak }) => longestStreak >= 30,
  },
  {
    id: "golden_milestone",
    title: "Golden Milestone",
    icon: "🥇",
    description: "Achieved a longest streak of 50 days.",
    unlockCondition: ({ longestStreak }) => longestStreak >= 50,
  },
  {
    id: "titanium_streak",
    title: "Titanium Streak",
    icon: "🔩",
    description: "Achieved a longest streak of 75 days.",
    unlockCondition: ({ longestStreak }) => longestStreak >= 75,
  },
  {
    id: "centurion_hall",
    title: "Centurion Hall",
    icon: "🏛️",
    description: "Achieved a longest streak of 100 days.",
    unlockCondition: ({ longestStreak }) => longestStreak >= 100,
  },
  {
    id: "first_wish",
    title: "First Wish",
    icon: "🎁",
    description: "Had 1 wish met/redeemed.",
    unlockCondition: ({ wishesMet }) => wishesMet >= 1,
  },
  {
    id: "spoiled_sweet",
    title: "Spoiled Sweet",
    icon: "🍭",
    description: "Had 5 wishes met/redeemed.",
    unlockCondition: ({ wishesMet }) => wishesMet >= 5,
  },
  {
    id: "affection_abundance",
    title: "Affection Abundance",
    icon: "💖",
    description: "Had 15 wishes met/redeemed.",
    unlockCondition: ({ wishesMet }) => wishesMet >= 15,
  },
  {
    id: "wishmaster",
    title: "Wishmaster",
    icon: "🧞‍♂️",
    description: "Had 30 wishes met/redeemed.",
    unlockCondition: ({ wishesMet }) => wishesMet >= 30,
  },
  {
    id: "pampered_partner",
    title: "Pampered Partner",
    icon: "👑",
    description: "Had 50 wishes met/redeemed.",
    unlockCondition: ({ wishesMet }) => wishesMet >= 50,
  },
  {
    id: "dream_relationship",
    title: "Dream Relationship",
    icon: "🌌",
    description: "Had 100 wishes met/redeemed.",
    unlockCondition: ({ wishesMet }) => wishesMet >= 100,
  },
];

// ================================================================
// Quick-add task presets
// ================================================================

export interface TaskPreset {
  title: string;
  icon: string;
  category: string;
}

export const TASK_PRESETS: TaskPreset[] = [
  { title: "Gym",      icon: "💪", category: "Health" },
  { title: "Work",     icon: "💻", category: "Productivity" },
  { title: "Study",    icon: "📚", category: "Learning" },
  { title: "Coding",   icon: "⌨️", category: "Productivity" },
  { title: "Reading",  icon: "📖", category: "Learning" },
  { title: "Water",    icon: "💧", category: "Health" },
  { title: "Cleaning", icon: "🧹", category: "Home" },
  { title: "Walk",     icon: "🚶", category: "Health" },
  { title: "Cooking",  icon: "🍳", category: "Home" },
  { title: "Meditation", icon: "🧘", category: "Health" },
];

// ================================================================
// Reward Categories
// ================================================================

export const REWARD_CATEGORIES = [
  { id: "all",             label: "All",              icon: "✨" },
  { id: "Intimacy",        label: "Intimacy",         icon: "🫶" },
  { id: "Sexual",          label: "Sexual",           icon: "🔥" },
  { id: "Cute",            label: "Cute",             icon: "💌" },
  { id: "Acts of Service", label: "Acts of Service",  icon: "🍳" },
  { id: "Monetary",        label: "Monetary",         icon: "💎" },
  { id: "Outings",         label: "Outings",          icon: "☕" },
  { id: "Special",         label: "Special",          icon: "🦸" },
];

// ================================================================
// Motivational messages based on progress
// ================================================================

export function getMotivationalMessage(completed: number, required: number = 10): string {
  const pct = (completed / required) * 100;
  if (completed === 0) return "Let's get it. 💫 First task is the hardest.";
  if (pct < 30)        return "Warming up. You've got this. 🔥";
  if (pct < 50)        return "Building momentum. Keep going! 💪";
  if (pct < 70)        return "Past the halfway point! Stay locked in. ⚡";
  if (pct < 90)        return "Almost there. Don't stop now! 🏁";
  if (completed < required) return "One more to go! Finish strong. 🌟";
  return "STREAK SECURED! 💥 You absolute unit.";
}
