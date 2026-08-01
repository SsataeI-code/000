/**
 * Minimal, dependency-free CSV serializer for data export (§13). RFC-4180-ish:
 * fields containing a comma, quote, or newline are wrapped in double quotes with
 * embedded quotes doubled; objects/arrays are JSON-stringified; null/undefined
 * become empty. The column set is the union of all rows' keys (stable order:
 * first-seen), so rows with missing fields still line up.
 */
export function toCsv(rows: ReadonlyArray<Record<string, unknown>>): string {
  if (rows.length === 0) return "";

  const cols: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!seen.has(k)) {
        seen.add(k);
        cols.push(k);
      }
    }
  }

  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = cols.map(esc).join(",");
  const body = rows.map((row) => cols.map((c) => esc(row[c])).join(","));
  return [header, ...body].join("\r\n");
}
