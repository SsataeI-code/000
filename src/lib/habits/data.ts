import { createClient } from "@/lib/supabase/server";
import type { Habit, HabitLog } from "@/lib/types/db";
import { isoDate, addDays } from "@/lib/habits/streaks";

export async function getHabits(clientId: string): Promise<Habit[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("habits")
    .select("*")
    .eq("client_id", clientId)
    .eq("active", true)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  return (data as Habit[] | null) ?? [];
}

/** Habit logs for a client over the last `days` (for streaks + heatmap). */
export async function getHabitLogs(clientId: string, days = 400): Promise<HabitLog[]> {
  const supabase = await createClient();
  const since = isoDate(addDays(new Date(), -days));
  const { data } = await supabase
    .from("habit_logs")
    .select("*")
    .eq("client_id", clientId)
    .gte("log_date", since)
    .order("log_date", { ascending: true });
  return (data as HabitLog[] | null) ?? [];
}

/** Group logs by habit id into a Set of completed ISO dates. */
export function completedDatesByHabit(logs: HabitLog[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const log of logs) {
    if (!log.completed) continue;
    let set = map.get(log.habit_id);
    if (!set) {
      set = new Set<string>();
      map.set(log.habit_id, set);
    }
    set.add(log.log_date);
  }
  return map;
}
