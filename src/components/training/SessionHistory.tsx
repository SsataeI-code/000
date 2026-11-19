"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SessionSet } from "@/lib/types/db";
import type { SessionWithSets } from "@/lib/training/data";
import { deleteSessionAction } from "@/lib/training/actions";

/** One set → a compact readout from whatever values it carries. */
function fmtSet(s: SessionSet): string {
  const parts: string[] = [];
  if (s.weight != null && s.reps != null) return `${trim(s.weight)}×${s.reps}`;
  if (s.weight != null) parts.push(`+${trim(s.weight)}`);
  if (s.reps != null) parts.push(`${s.reps} reps`);
  if (s.distance != null) parts.push(`${trim(s.distance)}`);
  if (s.time_sec != null) parts.push(fmtTime(s.time_sec));
  return parts.join(" · ") || "—";
}
function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}
function fmtTime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** Group a session's sets by exercise, preserving first-seen order. */
function byExercise(sets: (SessionSet & { exerciseName: string })[]) {
  const groups: { name: string; sets: (SessionSet & { exerciseName: string })[] }[] = [];
  const idx = new Map<string, number>();
  for (const s of sets) {
    const key = s.exercise_id;
    if (!idx.has(key)) {
      idx.set(key, groups.length);
      groups.push({ name: s.exerciseName, sets: [] });
    }
    groups[idx.get(key)!].sets.push(s);
  }
  return groups;
}

/** Read-only workout history; coaches/owner get a delete control per session. */
export function SessionHistory({ sessions, clientId, canDelete = false }: { sessions: SessionWithSets[]; clientId: string; canDelete?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (sessions.length === 0) {
    return <p className="rounded-2xl border border-hairline bg-surface shadow-card p-5 font-body text-sm text-ink/60">No workouts logged yet.</p>;
  }

  function del(id: string) {
    start(async () => {
      await deleteSessionAction(id, clientId);
      router.refresh();
    });
  }

  return (
    <ul className="flex flex-col gap-3">
      {sessions.map((s) => {
        const groups = byExercise(s.sets);
        const totalSets = s.sets.length;
        return (
          <li key={s.id} className="rounded-2xl border border-hairline bg-surface shadow-card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-body text-base text-ink">{fmtDate(s.log_date)}</span>
              <span className="flex items-center gap-3">
                <span className="font-label text-sm uppercase tracking-wide text-ink/45">
                  {s.source === "client" ? "Client-logged" : "Coach"} · {totalSets} set{totalSets === 1 ? "" : "s"}
                </span>
                {canDelete ? (
                  <button type="button" onClick={() => del(s.id)} disabled={pending} className="min-h-tap font-label text-sm uppercase tracking-wide text-ink/40 hover:text-red disabled:opacity-40">Delete</button>
                ) : null}
              </span>
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              {groups.map((g, i) => (
                <div key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-body text-sm text-ink">{g.name}</span>
                  <span className="font-body text-sm text-ink/55">{g.sets.map(fmtSet).join(",  ")}</span>
                </div>
              ))}
            </div>
            {s.notes ? <p className="mt-2 font-body text-sm text-ink/50">{s.notes}</p> : null}
            {s.client_note ? <p className="mt-1 font-body text-sm text-ink/50">Client note: {s.client_note}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}
