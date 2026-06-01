import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logTaskAndCheckStreak } from "@/lib/streak-engine";
import { sendNtfyToPartner } from "@/lib/ntfy";

/**
 * GET /api/tasks
 * Fetches completed tasks for the authenticated user within a specified date range.
 * Expects query params: `start` (ISO string) and `end` (ISO string).
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  // Validate session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "Missing start or end date range" }, { status: 400 });
  }

  // Get profile to check role and couple session
  const { data: profile } = await (supabase
    .from("users") as any)
    .select("id, couple_session_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Query tasks for the couple session or user
  // (Both Task User and Reward Giver can view tasks logged in their shared couple space)
  let targetUserId = user.id;
  if ((profile as any).role !== "task_user") {
    const { data: partner } = await (supabase
      .from("users") as any)
      .select("id")
      .eq("couple_session_id", (profile as any).couple_session_id)
      .eq("role", "task_user")
      .single();
    if (partner) {
      targetUserId = partner.id;
    }
  }

  const { data: tasks, error } = await (supabase
    .from("tasks") as any)
    .select("*")
    .eq("user_id", targetUserId)
    .gte("completed_at", start)
    .lte("completed_at", end)
    .order("completed_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks });
}

/**
 * POST /api/tasks
 * Logs a new task and recalculates daily streak progress and balance.
 * Expects JSON body: `{ title, category, icon, note, localDate }`
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  // Validate session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check role
  const { data: profile } = await (supabase
    .from("users") as any)
    .select("role, couple_session_id")
    .eq("id", user.id)
    .single();

  if (!profile || (profile as any).role !== "task_user") {
    return NextResponse.json({ error: "Only the Task User can log tasks" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, category, icon, note, localDate, value } = body;

    if (!title || !localDate) {
      return NextResponse.json({ error: "Missing title or localDate" }, { status: 400 });
    }

    const taskValue = typeof value === "number" && value > 0 ? value : 1;

    // 1. Insert task into database
    const { data: taskData, error: taskError } = await (supabase
      .from("tasks") as any)
      .insert({
        user_id: user.id,
        title: title.trim(),
        category: category || "Other",
        icon: icon || "📝",
        note: note || "",
        value: taskValue,
      })
      .select()
      .single();

    if (taskError) throw taskError;

    // 2. Process streak validation & task bank logic
    const streakResult = await logTaskAndCheckStreak(supabase, user.id, localDate, taskValue);

    // Send NTFY Alert to partner
    await sendNtfyToPartner(
      supabase,
      user.id,
      "Task Completed! ✅",
      `${profile.display_name} completed: "${title.trim()}" (${taskValue} standard task XP)`,
      "ballot_box_with_check,sparkles"
    );

    // 3. Create milestone notifications if unlocked
    if (streakResult.milestoneUnlocked) {
      await (supabase.from("notifications") as any).insert({
        user_id: user.id,
        type: "milestone",
        title: "Milestone Unlocked! 🎉",
        body: `You unlocked the Day ${streakResult.milestoneUnlocked.days} streak reward: ${streakResult.milestoneUnlocked.title}!`,
      });

      // Send to partner too
      const { data: partner } = await (supabase
        .from("users") as any)
        .select("id")
        .eq("couple_session_id", (profile as any).couple_session_id)
        .eq("role", "reward_giver")
        .single();
      
      if (partner) {
        await (supabase.from("notifications") as any).insert({
          user_id: partner.id,
          type: "milestone",
          title: "Partner Milestone! 🌟",
          body: `Your partner unlocked the Day ${streakResult.milestoneUnlocked.days} milestone! They can now claim: ${streakResult.milestoneUnlocked.title}.`,
        });

        // Send NTFY alert to partner for milestone unlock
        await sendNtfyToPartner(
          supabase,
          user.id,
          "Milestone Unlocked! 🎁",
          `${profile.display_name} unlocked the Day ${streakResult.milestoneUnlocked.days} milestone: "${streakResult.milestoneUnlocked.title}"!`,
          "tada,fire"
        );
      }
    }

    return NextResponse.json({
      success: true,
      task: taskData,
      ...streakResult,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to log task" }, { status: 500 });
  }
}
