import { describe, it, expect } from "vitest";
import { summarizeExercise, trainingOverview, metricFor, type SetPoint } from "@/lib/training/progress";

describe("summarizeExercise", () => {
  const sets: SetPoint[] = [
    { date: "2026-01-05", weight: 135, reps: 5, timeSec: null, distance: null },
    { date: "2026-01-05", weight: 155, reps: 3, timeSec: null, distance: null },
    { date: "2026-01-12", weight: 145, reps: 5, timeSec: null, distance: null },
    { date: "2026-01-12", weight: 165, reps: 2, timeSec: null, distance: null },
  ];

  it("computes bests, volume and an e1RM series for a weight×reps lift", () => {
    const s = summarizeExercise(sets, "weight_reps");
    expect(s.topWeight).toBe(165);
    expect(s.topWeightReps).toBe(2);
    expect(s.setCount).toBe(4);
    expect(s.sessionCount).toBe(2);
    // volume = 135*5 + 155*3 + 145*5 + 165*2 = 675+465+725+330 = 2195
    expect(s.totalVolume).toBe(2195);
    expect(s.metric).toBe("e1rm");
    expect(s.series).toHaveLength(2); // one point per day
    // e1RM should trend up as load climbs
    expect(s.series[1].value!).toBeGreaterThan(s.series[0].value!);
    expect(s.bestE1rm!).toBeGreaterThan(165);
  });

  it("charts reps for bodyweight work", () => {
    const bw: SetPoint[] = [
      { date: "2026-02-01", weight: null, reps: 8, timeSec: null, distance: null },
      { date: "2026-02-08", weight: null, reps: 12, timeSec: null, distance: null },
    ];
    const s = summarizeExercise(bw, "bodyweight_reps");
    expect(metricFor("bodyweight_reps").metric).toBe("reps");
    expect(s.bestReps).toBe(12);
    expect(s.series.map((p) => p.value)).toEqual([8, 12]);
  });

  it("charts time for holds", () => {
    const holds: SetPoint[] = [
      { date: "2026-03-01", weight: null, reps: null, timeSec: 45, distance: null },
      { date: "2026-03-01", weight: null, reps: null, timeSec: 60, distance: null },
    ];
    const s = summarizeExercise(holds, "time");
    expect(s.bestTimeSec).toBe(60);
    expect(s.series).toEqual([{ date: "2026-03-01", value: 60 }]); // day's best
  });
});

describe("trainingOverview", () => {
  it("counts sessions and the current-week total", () => {
    const o = trainingOverview(["2026-01-05", "2026-01-07", "2026-01-12"], "2026-01-12");
    expect(o.totalSessions).toBe(3);
    // week of 2026-01-12 is a Monday → one session this week
    expect(o.sessionsThisWeek).toBe(1);
    expect(o.lastSessionDate).toBe("2026-01-12");
  });

  it("tracks a consecutive-week streak", () => {
    // Mondays 1/05, 1/12, 1/19 each have a session → streak 3 on 1/19
    const o = trainingOverview(["2026-01-05", "2026-01-12", "2026-01-19"], "2026-01-19");
    expect(o.activeWeekStreak).toBe(3);
  });

  it("is empty-safe", () => {
    const o = trainingOverview([], "2026-01-01");
    expect(o.totalSessions).toBe(0);
    expect(o.activeWeekStreak).toBe(0);
    expect(o.lastSessionDate).toBeNull();
  });
});
