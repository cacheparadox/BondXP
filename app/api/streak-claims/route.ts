import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { STREAK_MILESTONES } from "@/types/supabase";

/**
 * GET /api/streak-claims
 * Checks if the user is eligible to claim a streak reward today and returns any existing claim.
 * Query param: `localDate` (YYYY-MM-DD)
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const localDate = searchParams.get("localDate");

  if (!localDate) {
    return NextResponse.json({ error: "Missing localDate parameter" }, { status: 400 });
  }

  try {
    // 1. Get profile
    const { data: profile } = await (supabase
      .from("users") as any)
      .select("role, couple_session_id")
      .eq("id", user.id)
      .single();

    if (!profile || (profile as any).role !== "task_user") {
      return NextResponse.json({ eligible: false, message: "Only the Task User can claim streak rewards" });
    }

    // 2. Check if today's daily progress is streak-qualified
    const { data: progress } = await (supabase
      .from("daily_progress") as any)
      .select("streak_qualified")
      .eq("user_id", user.id)
      .eq("date", localDate)
      .single();

    if (!progress || !progress.streak_qualified) {
      return NextResponse.json({
        eligible: false,
        reason: "goal_not_met",
        message: "Complete today's 10-task goal to secure your streak and unlock rewards!"
      });
    }

    // 3. Get current streak
    const { data: streak } = await (supabase
      .from("streaks") as any)
      .select("current_streak")
      .eq("user_id", user.id)
      .single();

    const currentStreak = streak?.current_streak || 0;
    if (currentStreak <= 0) {
      return NextResponse.json({
        eligible: false,
        reason: "no_streak",
        message: "You don't have an active streak yet."
      });
    }

    // 4. Check if already claimed today
    const { data: existingClaim } = await (supabase
      .from("streak_reward_claims") as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("claimed_date", localDate)
      .single();

    if (existingClaim) {
      return NextResponse.json({
        eligible: false,
        reason: "already_claimed",
        message: "You've already claimed today's milestone reward!",
        claim: existingClaim
      });
    }

    // User is eligible! Find all milestones at or below their streak level from database
    const { data: dbStreakRewards } = await (supabase
      .from("rewards") as any)
      .select("*")
      .eq("couple_session_id", profile.couple_session_id)
      .eq("reward_type", "streak")
      .eq("active", true);

    let availableMilestones = [];
    if (dbStreakRewards && dbStreakRewards.length > 0) {
      availableMilestones = dbStreakRewards
        .map((r: any) => ({
          days: r.cost, // Use cost as the milestone day
          title: r.title,
          icon: r.icon || "🎁",
          description: r.description || "",
        }))
        .filter((m: any) => m.days <= currentStreak)
        .sort((a: any, b: any) => a.days - b.days);
    } else {
      // Fallback to default presets
      availableMilestones = STREAK_MILESTONES.filter((m) => m.days <= currentStreak);
    }

    return NextResponse.json({
      eligible: true,
      currentStreak,
      availableMilestones,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/streak-claims
 * Claims a streak reward milestone.
 * Expects JSON: `{ milestoneDays, localDate }`
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { milestoneDays, localDate } = await request.json();

    if (!milestoneDays || !localDate) {
      return NextResponse.json({ error: "Missing milestoneDays or localDate" }, { status: 400 });
    }

    // 1. Get profile
    const { data: profile } = await (supabase
      .from("users") as any)
      .select("role, couple_session_id")
      .eq("id", user.id)
      .single();

    if (!profile || (profile as any).role !== "task_user") {
      return NextResponse.json({ error: "Only the Task User can claim streak rewards" }, { status: 403 });
    }

    // 2. Check if today is qualified
    const { data: progress } = await (supabase
      .from("daily_progress") as any)
      .select("streak_qualified")
      .eq("user_id", user.id)
      .eq("date", localDate)
      .single();

    if (!progress || !progress.streak_qualified) {
      return NextResponse.json({ error: "Goal not met. Complete 10 tasks to claim!" }, { status: 400 });
    }

    // 3. Get streak
    const { data: streak } = await (supabase
      .from("streaks") as any)
      .select("current_streak")
      .eq("user_id", user.id)
      .single();

    const currentStreak = streak?.current_streak || 0;
    if (milestoneDays > currentStreak) {
      return NextResponse.json({ error: `Cannot claim a Day ${milestoneDays} reward with a streak of only ${currentStreak} days.` }, { status: 400 });
    }

    // Find milestone details from database
    let milestone = null;
    const { data: dbStreakRewards } = await (supabase
      .from("rewards") as any)
      .select("*")
      .eq("couple_session_id", profile.couple_session_id)
      .eq("reward_type", "streak")
      .eq("active", true);

    if (dbStreakRewards && dbStreakRewards.length > 0) {
      const dbMilestone = dbStreakRewards.find((r: any) => r.cost === milestoneDays);
      if (dbMilestone) {
        milestone = {
          days: dbMilestone.cost,
          title: dbMilestone.title,
          icon: dbMilestone.icon || "🎁",
          description: dbMilestone.description || "",
        };
      }
    }

    if (!milestone) {
      // Fallback to default presets
      milestone = STREAK_MILESTONES.find((m) => m.days === milestoneDays);
    }

    if (!milestone) {
      return NextResponse.json({ error: "Invalid milestone level" }, { status: 400 });
    }

    // 4. Check duplicate claims for today
    const { data: existingClaim } = await (supabase
      .from("streak_reward_claims") as any)
      .select("id")
      .eq("user_id", user.id)
      .eq("claimed_date", localDate)
      .single();

    if (existingClaim) {
      return NextResponse.json({ error: "You have already claimed a streak reward today" }, { status: 400 });
    }

    // 5. Insert claim record
    const { data: claim, error: claimError } = await (supabase
      .from("streak_reward_claims") as any)
      .insert({
        user_id: user.id,
        claimed_date: localDate,
        streak_at_claim: currentStreak,
        milestone_days: milestoneDays,
        milestone_title: milestone.title,
        milestone_icon: milestone.icon,
      })
      .select()
      .single();

    if (claimError) throw claimError;

    // 6. Create notifications
    await (supabase.from("notifications") as any).insert({
      user_id: user.id,
      type: "streak_claimed",
      title: "Milestone Claimed! 🌟",
      body: `You selected: ${milestone.icon} ${milestone.title} as your Day ${milestoneDays} reward!`,
    });

    // Notify Giver
    const { data: partner } = await (supabase
      .from("users") as any)
      .select("id")
      .eq("couple_session_id", (profile as any).couple_session_id)
      .eq("role", "reward_giver")
      .single();

    if (partner) {
      await (supabase.from("notifications") as any).insert({
        user_id: partner.id,
        type: "partner_streak_claimed",
        title: "Partner Claimed Streak Reward! 🎁",
        body: `Your partner hit a ${currentStreak}-day streak and claimed: ${milestone.icon} ${milestone.title} (Day ${milestoneDays} milestone). Surprise them soon!`,
      });
    }

    return NextResponse.json({ success: true, claim });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to submit claim" }, { status: 500 });
  }
}
