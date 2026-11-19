import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { canAccessArea } from "@/lib/auth/roles";
import { getExercises, getClientSessions, getTrainingProgress } from "@/lib/training/data";
import { WorkoutLogger } from "@/components/training/WorkoutLogger";
import { SessionHistory } from "@/components/training/SessionHistory";
import { TrainingProgress } from "@/components/training/TrainingProgress";

export const dynamic = "force-dynamic";

/** The client's own Train screen — log workouts and track progress (Training). */
export default async function ClientTrainPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canAccessArea(user.role, "client")) redirect("/coach");

  const [exercises, sessions, progress] = await Promise.all([
    getExercises(),
    getClientSessions(user.id, 20),
    getTrainingProgress(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-label text-sm uppercase tracking-wide text-ink/50">Training</p>
        <h1 className="mt-1 text-4xl text-ink">Workouts</h1>
        <p className="mt-2 font-body text-sm text-ink/60">Log what you did and watch your numbers climb. Your coach sees it too.</p>
      </div>

      <WorkoutLogger exercises={exercises} clientId={user.id} />

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl text-ink">Progress &amp; stats</h2>
        <TrainingProgress progress={progress} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl text-ink">History</h2>
        <SessionHistory sessions={sessions} clientId={user.id} canDelete />
      </section>
    </div>
  );
}
