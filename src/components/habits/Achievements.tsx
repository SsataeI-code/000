import type { Achievement } from "@/lib/habits/game";
import { IconMedal, IconLock } from "@/components/icons";

/**
 * Achievement badges (§4 celebrate wins, warmly). Earned badges glow red;
 * locked ones stay quiet with a hint of what unlocks them — a goal, never a
 * scold. Server-rendered; the reveal is a light stagger, reduced-motion safe.
 */
export function Achievements({ achievements }: { achievements: Achievement[] }) {
  const earned = achievements.filter((a) => a.earned).length;

  return (
    <section aria-label="Achievements" className="border border-hairline bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <p className="font-label text-xs uppercase tracking-wide text-ink/50">Badges</p>
        <p className="font-body text-xs text-ink/60">{earned} of {achievements.length} earned</p>
      </div>

      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-3">
        {achievements.map((a, i) => (
          <li
            key={a.id}
            title={a.description}
            className={`animate-stagger-in flex flex-col items-center gap-1.5 border p-3 text-center ${
              a.earned ? "border-red bg-surface" : "border-hairline bg-surface-muted"
            }`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className={`h-7 w-7 ${a.earned ? "text-red" : "text-ink/30"}`}>
              {a.earned ? <IconMedal /> : <IconLock />}
            </span>
            <span className={`font-label text-[10px] uppercase tracking-wide ${a.earned ? "text-ink" : "text-ink/40"}`}>
              {a.label}
            </span>
            <span className="font-body text-[10px] leading-tight text-ink/50">{a.description}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
