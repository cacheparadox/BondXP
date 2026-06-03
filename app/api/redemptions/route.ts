import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { deductFromTaskBank } from "@/lib/reward-engine/task-bank";
import { differenceInHours } from "date-fns";
import { sendNtfyToPartner, sendNtfyToUser } from "@/lib/ntfy";

/**
 * POST /api/redemptions
 * Creates a new pending redemption request, checking balance and cooldown limitations.
 * Expects JSON: `{ rewardId, notes }`
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  // Validate session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile
  const { data: profile } = await (supabase
    .from("users") as any)
    .select("role, couple_session_id, display_name")
    .eq("id", user.id)
    .single();

  if (!profile || (profile as any).role !== "task_user") {
    return NextResponse.json({ error: "Only the Task User can redeem rewards" }, { status: 403 });
  }

  try {
    const { rewardId, notes } = await request.json();

    if (!rewardId) {
      return NextResponse.json({ error: "Missing rewardId" }, { status: 400 });
    }

    // 1. Fetch reward details
    const { data: reward, error: rewardError } = await (supabase
      .from("rewards") as any)
      .select("*")
      .eq("id", rewardId)
      .single();

    if (rewardError || !reward) {
      return NextResponse.json({ error: "Reward not found" }, { status: 404 });
    }

    if (!reward.active) {
      return NextResponse.json({ error: "Reward is currently inactive" }, { status: 400 });
    }

    // 2. Check task bank balance
    const { data: bank } = await (supabase
      .from("task_bank") as any)
      .select("available_tasks")
      .eq("user_id", user.id)
      .single();

    if (!bank || bank.available_tasks < reward.cost) {
      return NextResponse.json({ error: "Insufficient task balance" }, { status: 400 });
    }

    // 3. Check cooldown hours
    if (reward.cooldown_hours > 0) {
      // Get the latest approved/pending redemption of this reward
      const { data: lastRedemption } = await (supabase
        .from("redemptions") as any)
        .select("redeemed_at")
        .eq("reward_id", rewardId)
        .eq("user_id", user.id)
        .in("status", ["pending", "approved", "scheduled"])
        .order("redeemed_at", { ascending: false })
        .limit(1)
        .single();

      if (lastRedemption) {
        const hoursPassed = differenceInHours(new Date(), new Date(lastRedemption.redeemed_at));
        if (hoursPassed < reward.cooldown_hours) {
          const remaining = reward.cooldown_hours - hoursPassed;
          return NextResponse.json({
            error: `Reward is on cooldown! Try again in ${Math.ceil(remaining)} hours.`,
          }, { status: 400 });
        }
      }
    }

    // 4. Deduct cost from Task Bank (using admin client to bypass task user RLS update restriction)
    const adminSupabase = createAdminClient();
    const deducted = await deductFromTaskBank(adminSupabase, user.id, reward.cost);
    if (!deducted) {
      return NextResponse.json({ error: "Deduction failed. Balance changed." }, { status: 400 });
    }

    // 5. Create redemption row
    const { data: redemption, error: redeemError } = await (supabase
      .from("redemptions") as any)
      .insert({
        reward_id: rewardId,
        user_id: user.id,
        status: "pending",
        notes: notes || "",
        cost_at_time: reward.cost,
      })
      .select()
      .single();

    if (redeemError) throw redeemError;

    // 6. Create notifications
    await (supabase.from("notifications") as any).insert({
      user_id: user.id,
      type: "redemption_pending",
      title: "Wish Requested! 🌸",
      body: `You requested to redeem: ${reward.icon || "🎁"} ${reward.title} for ${reward.cost} tasks.`,
    });

    // Notify Reward Giver
    const { data: partner } = await (supabase
      .from("users") as any)
      .select("id")
      .eq("couple_session_id", (profile as any).couple_session_id)
      .eq("role", "reward_giver")
      .single();

    if (partner) {
      await (supabase.from("notifications") as any).insert({
        user_id: partner.id,
        type: "redemption_requested",
        title: "New Wish Request! ✨",
        body: `Your partner wants to redeem: ${reward.icon || "🎁"} ${reward.title}. Review it on your dashboard.`,
      });

      // Send NTFY alert to partner
      await sendNtfyToPartner(
        supabase,
        user.id,
        "New Wish Request! 💖",
        `${profile.display_name}: wants to redeem ${reward.icon || "🎁"} "${reward.title}" (Cost: ${reward.cost} XP)`,
        "gift,love_letter"
      );
    }

    return NextResponse.json({ success: true, redemption });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to redeem reward" }, { status: 500 });
  }
}

/**
 * PUT /api/redemptions
 * Updates status of a redemption request (Approve, Reject, or Schedule).
 * If rejected, refunds the points back to the Task User's bank.
 * Expects JSON: `{ redemptionId, status, notes }`
 */
export async function PUT(request: Request) {
  const supabase = await createClient();

  // Validate session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile
  const { data: profile } = await (supabase
    .from("users") as any)
    .select("role, couple_session_id, display_name")
    .eq("id", user.id)
    .single();

  if (!profile || (profile as any).role !== "reward_giver") {
    return NextResponse.json({ error: "Only the Reward Giver can process requests" }, { status: 403 });
  }

  try {
    const { redemptionId, status, notes } = await request.json();

    if (!redemptionId || !status) {
      return NextResponse.json({ error: "Missing redemptionId or status" }, { status: 400 });
    }

    if (!["approved", "rejected", "scheduled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status state" }, { status: 400 });
    }

    // 1. Fetch redemption row with reward details
    const { data: redemption, error: fetchError } = await (supabase
      .from("redemptions") as any)
      .select(`
        *,
        reward:rewards (
          title,
          icon
        )
      `)
      .eq("id", redemptionId)
      .single() as any;

    if (fetchError || !redemption) {
      return NextResponse.json({ error: "Redemption record not found" }, { status: 404 });
    }

    if (redemption.status !== "pending") {
      return NextResponse.json({ error: "Redemption is already processed" }, { status: 400 });
    }

    // 2. Perform updates
    const updatePayload: any = {
      status,
      notes: notes || redemption.notes,
    };

    if (status === "approved") {
      updatePayload.approved_at = new Date().toISOString();
    } else if (status === "scheduled") {
      updatePayload.approved_at = new Date().toISOString();
      updatePayload.scheduled_at = new Date().toISOString();
    }

    const { error: updateError } = await (supabase
      .from("redemptions") as any)
      .update(updatePayload)
      .eq("id", redemptionId);

    if (updateError) throw updateError;

    // 3. Handle refunds if rejected
    if (status === "rejected") {
      const refundCost = redemption.cost_at_time || 0;

      // Get partner bank
      const { data: bank } = await (supabase
        .from("task_bank") as any)
        .select("*")
        .eq("user_id", redemption.user_id)
        .single();

      if (bank) {
        // Subtract from spent_tasks (using admin client to refund task user)
        const adminSupabase = createAdminClient();
        const { error: refundError } = await (adminSupabase
          .from("task_bank") as any)
          .update({
            spent_tasks: Math.max(0, bank.spent_tasks - refundCost),
          })
          .eq("user_id", redemption.user_id);

        if (refundError) console.error("Refund failed:", refundError);
      }
    }

    // 4. Send notification back to Task User
    const statusText = status === "approved" ? "Approved! ❤️" : status === "scheduled" ? "Scheduled! 📅" : "Rejected. 💔";
    const bodyText = status === "rejected"
      ? `Your request for ${redemption.reward?.title} was declined. Your task XP has been refunded. Reason: ${notes || "None"}`
      : `Your request for ${redemption.reward?.title} was ${status}! Message: ${notes || "None"}`;

    await (supabase.from("notifications") as any).insert({
      user_id: redemption.user_id,
      type: `redemption_${status}`,
      title: `Wish ${statusText}`,
      body: bodyText,
    });

    // Send NTFY push to the Task User
    let ntfyTags = "heart";
    let ntfyTitle = "Wish Processed";
    if (status === "approved") {
      ntfyTitle = "Wish Approved!";
      ntfyTags = "heart,sparkles";
    } else if (status === "scheduled") {
      ntfyTitle = "Wish Scheduled!";
      ntfyTags = "calendar";
    } else if (status === "rejected") {
      ntfyTitle = "Wish Declined";
      ntfyTags = "broken_heart";
    }

    const actionWord = status === "approved" ? "approved" : status === "scheduled" ? "scheduled" : "declined";
    const ntfyBodyText = `${(profile as any).display_name}: ${actionWord} wish for "${redemption.reward?.title}". Message: ${notes || "None"}`;

    await sendNtfyToUser(
      supabase,
      redemption.user_id,
      ntfyTitle,
      ntfyBodyText,
      ntfyTags
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process request" }, { status: 500 });
  }
}
