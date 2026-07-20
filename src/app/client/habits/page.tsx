import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getHabits, getHabitLogs, completedDatesByHabit } from "@/lib/habits/data";
import { consistency, currentStreak } from "@/lib/habits/streaks";
import { HabitBuilderForm } from "@/components/habits/HabitBuilderForm";
import { HabitManageList, type ManageItem } from "@/components/habits/HabitManageList";
import type { Habit } from "@/lib/types/db";

export const dynamic = "force-dynamic";

function cadenceLabel(h: Habit): string {
  if (h.cadence === "daily") return "Daily";
  if (h.cadence === "weekly_count") return `${h.times_per_week ?? 1}×/week`;
  const days = (h.days_of_week ?? []).map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(" ");
  return days || "Specific days";
}

export default async function HabitsPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [habits, logs] = await Promise.all([getHabits(user.id), getHabitLogs(user.id)]);
  const byHabit = completedDatesByHabit(logs);
  const today = new Date();

  const items: ManageItem[] = habits.map((h) => {
    const done = byHabit.get(h.id) ?? new Set<string>();
    return {
      id: h.id,
      name: h.name,
      cadenceLabel: cadenceLabel(h),
      streak: currentStreak(h, done, today),
      consistencyPct: Math.round(consistency(h, done, today) * 100),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl text-ink">Habits</h1>
        <Link href="/client" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Done
        </Link>
      </div>

      <HabitManageList items={items} />

      <div>
        <h2 className="mb-3 text-2xl text-ink">New habit</h2>
        <HabitBuilderForm />
      </div>
    </div>
  );
}
