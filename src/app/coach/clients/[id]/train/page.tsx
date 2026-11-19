import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { coachHasClient } from "@/lib/coach/data";
import { getExercises, getClientSessions, getTrainingProgress } from "@/lib/training/data";
import { WorkoutLogger } from "@/components/training/WorkoutLogger";
import { SessionHistory } from "@/components/training/SessionHistory";
import { TrainingProgress } from "@/components/training/TrainingProgress";

export const dynamic = "force-dynamic";

/** Coach logs & reviews a client's workouts (Training Phase 2 — simple logging). */
export default async function ClientTrainPage({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "client") redirect("/client");
  const { id } = await params;
  if (user.role !== "owner" && !(await coachHasClient(user.id, id))) notFound();

  const supabase = await createClient();
  const { data: nameRow } = await supabase.from("profiles").select("display_name").eq("id", id).maybeSingle();
  const name = nameRow?.display_name ?? "This client";

  const [exercises, sessions, progress] = await Promise.all([getExercises(), getClientSessions(id, 20), getTrainingProgress(id)]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-label text-sm uppercase tracking-wide text-ink/50">Training · {name}</p>
          <h1 className="mt-1 text-4xl text-ink">Workouts</h1>
        </div>
        <Link href={`/coach/clients/${id}`} className="min-h-tap font-label text-sm uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">Back</Link>
      </div>

      <WorkoutLogger exercises={exercises} clientId={id} />

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl text-ink">Progress &amp; stats</h2>
        <TrainingProgress progress={progress} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl text-ink">History</h2>
        <SessionHistory sessions={sessions} clientId={id} canDelete viewerIsCoach />
      </section>
    </div>
  );
}
