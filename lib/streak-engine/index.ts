import { differenceInCalendarDays, parseISO, subDays, format } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { STREAK_MILESTONES, type StreakMilestone } from "@/types/supabase";

/**
 * Checks and updates the user's streak if they have just qualified (hit 10 tasks completed).
 * 
 * Logic:
 * 1. Increment completed tasks in daily_progress for today's date.
 * 2. If completed tasks reaches 10, check if we need to advance the streak.
 * 3. Returns the updated streak status, total tasks today, and whether a milestone was unlocked.
 */
export async function logTaskAndCheckStreak(
  supabase: SupabaseClient<Database>,
  userId: string,
  localDateStr: string // Format: 'YYYY-MM-DD'
): Promise<{
  tasksCompletedToday: number;
  streakQualified: boolean;
  currentStreak: number;
  milestoneUnlocked: StreakMilestone | null;
}> {
  // 1. Increment completed tasks today in daily_progress
  const { data: progress, error: progressError } = await (supabase
    .from("daily_progress") as any)
    .select("*")
    .eq("user_id", userId)
    .eq("date", localDateStr)
    .single();

  let completedToday = 1;
  let qualifiedToday = false;

  if (progress) {
    completedToday = progress.tasks_completed + 1;
    qualifiedToday = progress.streak_qualified;
  }

  // Determine if this task makes the user qualify today
  const qualifiesNow = completedToday >= 10 && !qualifiedToday;
  const isQualified = completedToday >= 10;

  // Upsert progress
  const { error: upsertError } = await (supabase
    .from("daily_progress") as any)
    .upsert({
      user_id: userId,
      date: localDateStr,
      tasks_completed: completedToday,
      streak_qualified: isQualified,
    });

  if (upsertError) throw upsertError;

  // 2. Increment lifetime tasks in task_bank
  const { data: bankData } = await (supabase
    .from("task_bank") as any)
    .select("*")
    .eq("user_id", userId)
    .single();

  const lifetime = (bankData?.lifetime_tasks || 0) + 1;
  const spent = bankData?.spent_tasks || 0;

  const { error: bankError } = await (supabase
    .from("task_bank") as any)
    .upsert({
      user_id: userId,
      lifetime_tasks: lifetime,
      spent_tasks: spent,
    });

  if (bankError) throw bankError;

  // 3. Process streak updates if qualifies now
  let currentStreak = 0;
  let milestoneUnlocked: StreakMilestone | null = null;

  // Retrieve current streak status
  const { data: streakRecord } = await (supabase
    .from("streaks") as any)
    .select("*")
    .eq("user_id", userId)
    .single();

  if (qualifiesNow) {
    const today = parseISO(localDateStr);
    let newStreak = 1;

    if (streakRecord && streakRecord.last_completion_date) {
      const lastCompletion = parseISO(streakRecord.last_completion_date);
      const daysDiff = differenceInCalendarDays(today, lastCompletion);

      if (daysDiff === 1) {
        // Consecutive completion -> increment streak
        newStreak = streakRecord.current_streak + 1;
      } else if (daysDiff === 0) {
        // Already completed today -> keep current streak
        newStreak = streakRecord.current_streak;
      } else {
        // Broken streak -> starts at 1
        newStreak = 1;
      }
    }

    currentStreak = newStreak;
    const longest = Math.max(streakRecord?.longest_streak || 0, newStreak);

    // Save streak update
    const { error: streakUpdateError } = await (supabase
      .from("streaks") as any)
      .upsert({
        user_id: userId,
        current_streak: newStreak,
        longest_streak: longest,
        last_completion_date: localDateStr,
        updated_at: new Date().toISOString(),
      });

    if (streakUpdateError) throw streakUpdateError;

    // Check if a milestone was unlocked at this level
    const milestone = STREAK_MILESTONES.find((m) => m.days === newStreak);
    if (milestone) {
      milestoneUnlocked = milestone;
    }
  } else {
    currentStreak = streakRecord?.current_streak || 0;
  }

  return {
    tasksCompletedToday: completedToday,
    streakQualified: isQualified,
    currentStreak,
    milestoneUnlocked,
  };
}

/**
 * Midnight reset handler for daily streaks.
 * Checks if the user missed completing their tasks yesterday and resets their streak if so.
 * This runs on user dashboard load to make sure their active UI reflects the correct state.
 */
export async function refreshStreakState(
  supabase: SupabaseClient<Database>,
  userId: string,
  localDateStr: string // Format: 'YYYY-MM-DD'
): Promise<number> {
  const { data: streakRecord } = await (supabase
    .from("streaks") as any)
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!streakRecord || !streakRecord.last_completion_date) {
    return 0;
  }

  const today = parseISO(localDateStr);
  const lastCompletion = parseISO(streakRecord.last_completion_date);
  const daysDiff = differenceInCalendarDays(today, lastCompletion);

  // If the last completion date was before yesterday, the streak is broken
  if (daysDiff > 1) {
    const { error } = await (supabase
      .from("streaks") as any)
      .update({
        current_streak: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) console.error("Error resetting streak:", error);
    return 0;
  }

  return streakRecord.current_streak;
}
