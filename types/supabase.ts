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
          completed_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tasks"]["Row"], "id" | "created_at" | "completed_at"> & {
          id?: string;
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
  unlockCondition: (stats: { currentStreak: number; longestStreak: number; lifetimeTasks: number }) => boolean;
}

export const BADGES: Badge[] = [
  {
    id: "discipline_demon",
    title: "Discipline Demon",
    icon: "😈",
    description: "Hit a 7-day streak.",
    unlockCondition: ({ currentStreak }) => currentStreak >= 7,
  },
  {
    id: "locked_in",
    title: "Locked In",
    icon: "🔒",
    description: "Hit a 30-day streak.",
    unlockCondition: ({ currentStreak }) => currentStreak >= 30,
  },
  {
    id: "seven_day_beast",
    title: "7-Day Beast",
    icon: "🦁",
    description: "Completed your first 7-day streak.",
    unlockCondition: ({ longestStreak }) => longestStreak >= 7,
  },
  {
    id: "consistency_arc",
    title: "Consistency Arc",
    icon: "⚡",
    description: "Accumulated 60 lifetime tasks.",
    unlockCondition: ({ lifetimeTasks }) => lifetimeTasks >= 60,
  },
  {
    id: "unbreakable",
    title: "Unbreakable",
    icon: "💎",
    description: "Achieved a 30-day streak and never broke it.",
    unlockCondition: ({ longestStreak }) => longestStreak >= 30,
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
