import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { STREAK_MILESTONES } from "@/types/supabase";
import { sendNtfyToPartner } from "@/lib/ntfy";
import { refreshStreakState } from "@/lib/streak-engine";

/**
 * Resolves the milestone day number from the reward title or description.
 * Useful when streak rewards are stored with cost = 0.
 */
function getStreakMilestoneDay(title: string, description: string, cost: number): number {
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
  
  const titleKey = (title || "").toLowerCase().trim();
  if (STREAK_DAYS_MAP[titleKey]) {
    return STREAK_DAYS_MAP[titleKey];
  }
  
  if (description) {
    const match = description.match(/Day\s+(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  return cost || 0;
}

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

    // 2. Fetch the streak record using the authenticated client first (bypasses RLS select block)
    const { data: streakRecord } = await (supabase
      .from("streaks") as any)
      .select("current_streak, last_completion_date")
      .eq("user_id", user.id)
      .single();

    let currentStreak = streakRecord?.current_streak || 0;

    // Refresh the database streak state if possible, otherwise do a local check
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasServiceKey = serviceKey && serviceKey !== "your_service_role_key_here";

    if (hasServiceKey) {
      const adminSupabase = createAdminClient();
      currentStreak = await refreshStreakState(adminSupabase, user.id, localDate);
    } else if (streakRecord && streakRecord.last_completion_date) {
      // Local fallback calculation for broken streaks when service key is placeholder
      const today = new Date(localDate);
      const lastCompletion = new Date(streakRecord.last_completion_date);
      const diffTime = Math.abs(today.getTime() - lastCompletion.getTime());
      const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysDiff > 1) {
        currentStreak = 0;
      }
    }

    if (currentStreak <= 0) {
      return NextResponse.json({
        eligible: false,
        reason: "no_streak",
        message: "You don't have an active streak yet.",
        refreshedStreak: {
          current_streak: currentStreak,
          last_completion_date: streakRecord?.last_completion_date
        }
      });
    }

    // 3. Check if already claimed today (enforcing 1 claim per day rule)
    const { data: existingClaim } = await (supabase
      .from("streak_reward_claims") as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("claimed_date", localDate)
      .single();

    // Find all active milestone rewards in the database for this couple session
    const { data: dbStreakRewards } = await (supabase
      .from("rewards") as any)
      .select("*")
      .eq("couple_session_id", profile.couple_session_id)
      .eq("reward_type", "streak")
      .eq("active", true);

    let availableMilestones = [];
    if (dbStreakRewards && dbStreakRewards.length > 0) {
      availableMilestones = dbStreakRewards
        .map((r: any) => {
          const days = getStreakMilestoneDay(r.title, r.description || "", r.cost);
          return {
            days,
            title: r.title,
            icon: r.icon || "🎁",
            description: r.description || "",
          };
        })
        .filter((m: any) => m.days > 0 && m.days <= currentStreak)
        .sort((a: any, b: any) => a.days - b.days);
    } else {
      // Fallback to default presets
      availableMilestones = STREAK_MILESTONES
        .filter((m) => m.days <= currentStreak);
    }

    const outputStreakRecord = {
      current_streak: currentStreak,
      last_completion_date: streakRecord?.last_completion_date
    };

    if (existingClaim) {
      return NextResponse.json({
        eligible: false,
        reason: "already_claimed",
        message: "You've already claimed today's milestone reward!",
        claim: existingClaim,
        currentStreak,
        availableMilestones,
        refreshedStreak: outputStreakRecord
      });
    }

    if (availableMilestones.length === 0) {
      return NextResponse.json({
        eligible: false,
        reason: "all_claimed",
        message: "You don't have any milestone rewards available for your current streak level!",
        refreshedStreak: outputStreakRecord
      });
    }

    return NextResponse.json({
      eligible: true,
      currentStreak,
      availableMilestones,
      refreshedStreak: outputStreakRecord
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
      .select("role, couple_session_id, display_name")
      .eq("id", user.id)
      .single();

    if (!profile || (profile as any).role !== "task_user") {
      return NextResponse.json({ error: "Only the Task User can claim streak rewards" }, { status: 403 });
    }

    // 2. Get streak using authenticated user client to bypass RLS select block
    const { data: streakRecord } = await (supabase
      .from("streaks") as any)
      .select("current_streak")
      .eq("user_id", user.id)
      .single();

    const currentStreak = streakRecord?.current_streak || 0;
    if (milestoneDays > currentStreak) {
      return NextResponse.json({ error: `Cannot claim a Day ${milestoneDays} reward with a streak of only ${currentStreak} days.` }, { status: 400 });
    }

    // 3. Check duplicate claims for today (enforcing 1 claim per day rule)
    const { data: existingClaim } = await (supabase
      .from("streak_reward_claims") as any)
      .select("id")
      .eq("user_id", user.id)
      .eq("claimed_date", localDate)
      .single();

    if (existingClaim) {
      return NextResponse.json({ error: "You have already claimed a streak reward today" }, { status: 400 });
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
      const dbMilestone = dbStreakRewards.find((r: any) => {
        const days = getStreakMilestoneDay(r.title, r.description || "", r.cost);
        return days === milestoneDays;
      });

      if (dbMilestone) {
        const days = getStreakMilestoneDay(dbMilestone.title, dbMilestone.description || "", dbMilestone.cost);
        milestone = {
          days,
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

      // Send NTFY alert to partner
      await sendNtfyToPartner(
        supabase,
        user.id,
        "Streak Reward Claimed! 🌟",
        `${profile.display_name}: hit a ${currentStreak}-day streak and claimed: ${milestone.icon} ${milestone.title} (Day ${milestoneDays} milestone).`,
        "tada,fire"
      );
    }

    return NextResponse.json({ success: true, claim });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to submit claim" }, { status: 500 });
  }
}
