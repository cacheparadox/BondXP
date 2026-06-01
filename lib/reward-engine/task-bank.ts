import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export interface TaskBankBalance {
  lifetimeTasks: number;
  spentTasks: number;
  availableTasks: number;
}

/**
 * Fetches the user's task bank balance.
 */
export async function getTaskBankBalance(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<TaskBankBalance> {
  const { data, error } = await (supabase
    .from("task_bank") as any)
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return {
      lifetimeTasks: 0,
      spentTasks: 0,
      availableTasks: 0,
    };
  }

  return {
    lifetimeTasks: data.lifetime_tasks,
    spentTasks: data.spent_tasks,
    availableTasks: data.available_tasks,
  };
}

/**
 * Deducts a specific amount of tasks from the available bank balance.
 * Increments `spent_tasks` by the given amount.
 */
export async function deductFromTaskBank(
  supabase: SupabaseClient<Database>,
  userId: string,
  amount: number
): Promise<boolean> {
  const { data: currentBank, error: fetchError } = await (supabase
    .from("task_bank") as any)
    .select("*")
    .eq("user_id", userId)
    .single();

  if (fetchError || !currentBank) {
    throw new Error("Task bank not found for user");
  }

  if (currentBank.available_tasks < amount) {
    return false; // Insufficient balance
  }

  const { error: updateError } = await (supabase
    .from("task_bank") as any)
    .update({
      spent_tasks: currentBank.spent_tasks + amount,
    })
    .eq("user_id", userId);

  if (updateError) {
    throw updateError;
  }

  return true;
}
