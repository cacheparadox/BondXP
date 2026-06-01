import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Sends a push notification to a specific user's ntfy topic.
 */
export async function sendNtfyToUser(
  supabase: SupabaseClient<Database>,
  targetUserId: string,
  title: string,
  body: string,
  tags: string = "heart"
) {
  try {
    const { data: userProf } = await (supabase
      .from("users") as any)
      .select("ntfy_topic")
      .eq("id", targetUserId)
      .single();

    if (!userProf || !userProf.ntfy_topic) return;

    const topic = userProf.ntfy_topic.trim();
    if (!topic) return;

    await fetch(`https://ntfy.sh/${topic}`, {
      method: "POST",
      headers: {
        "Title": title,
        "Tags": tags,
      },
      body: body,
    });
  } catch (err) {
    console.error("Failed to send NTFY notification to user:", err);
  }
}

/**
 * Sends a push notification to the partner of the specified user.
 */
export async function sendNtfyToPartner(
  supabase: SupabaseClient<Database>,
  senderUserId: string,
  title: string,
  body: string,
  tags: string = "heart"
) {
  try {
    // 1. Get sender's couple_session_id
    const { data: senderProf } = await (supabase
      .from("users") as any)
      .select("couple_session_id")
      .eq("id", senderUserId)
      .single();

    if (!senderProf || !senderProf.couple_session_id) return;

    // 2. Find partner in the same couple session
    const { data: partnerProf } = await (supabase
      .from("users") as any)
      .select("ntfy_topic")
      .eq("couple_session_id", senderProf.couple_session_id)
      .neq("id", senderUserId)
      .single();

    if (!partnerProf || !partnerProf.ntfy_topic) return;

    const topic = partnerProf.ntfy_topic.trim();
    if (!topic) return;

    await fetch(`https://ntfy.sh/${topic}`, {
      method: "POST",
      headers: {
        "Title": title,
        "Tags": tags,
      },
      body: body,
    });
  } catch (err) {
    console.error("Failed to send NTFY notification to partner:", err);
  }
}
