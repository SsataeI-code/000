import { addDays, isoDate } from "@/lib/habits/streaks";

/**
 * GitHub-style habit heatmap (§5A). One cell per day, shaded by how many habits
 * were completed. Static (server-rendered); the cell-by-cell reveal is a light
 * CSS stagger that respects reduced-motion via the global rule.
 */
function shade(v: number, max: number): string {
  if (v <= 0) return "#ececea";
  const t = Math.min(1, v / Math.max(1, max));
  if (t < 0.34) return "#a8d5ba";
  if (t < 0.67) return "#5cae7f";
  return "#1f8a4c";
}

export function HabitHeatmap({
  counts,
  max,
  weeks = 18,
}: {
  counts: Record<string, number>;
  max: number;
  weeks?: number;
}) {
  const today = new Date();
  // Align the last column to this week; start on the Sunday `weeks-1` weeks back.
  const startSunday = addDays(today, -(today.getUTCDay() + (weeks - 1) * 7));

  const columns: { date: string; count: number }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: { date: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(startSunday, w * 7 + d);
      if (date > today) {
        col.push({ date: "", count: -1 }); // future padding
      } else {
        const iso = isoDate(date);
        col.push({ date: iso, count: counts[iso] ?? 0 });
      }
    }
    columns.push(col);
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map((cell, di) =>
              cell.count < 0 ? (
                <span key={di} className="h-3 w-3" />
              ) : (
                <span
                  key={di}
                  title={`${cell.date}: ${cell.count} done`}
                  className="h-3 w-3 animate-stagger-in"
                  style={{ background: shade(cell.count, max), animationDelay: `${(ci * 7 + di) * 4}ms` }}
                />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
