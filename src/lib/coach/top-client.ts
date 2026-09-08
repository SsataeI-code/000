/**
 * "#1 client" ranking (owner: the top client by game level should get that as
 * part of their level). Pure and multi-coach-correct: each coach has their own
 * #1, decided by habit/logging level, breaking ties on total XP. A client with
 * no progress (level resolves but zero XP) is never crowned. Kept pure so the
 * daily sweep and any live surface rank identically.
 */

export interface RankEntry {
  clientId: string;
  /** The client's effective coach (active coach, else the owner). Null groups alone. */
  coachId: string | null;
  level: number;
  xp: number;
}

/** The set of client ids who are #1 for their coach (top level, then top XP). */
export function topClientIds(entries: RankEntry[]): Set<string> {
  const bestByCoach = new Map<string, RankEntry>();
  for (const e of entries) {
    if (e.xp <= 0) continue; // no progress → never #1
    const key = e.coachId ?? `__solo__:${e.clientId}`;
    const cur = bestByCoach.get(key);
    if (!cur || e.level > cur.level || (e.level === cur.level && e.xp > cur.xp)) {
      bestByCoach.set(key, e);
    }
  }
  const out = new Set<string>();
  for (const e of bestByCoach.values()) out.add(e.clientId);
  return out;
}
