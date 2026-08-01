import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { coachHasClient } from "@/lib/coach/data";
import { gatherClientExport } from "@/lib/coach/export";
import { toCsv } from "@/lib/coach/csv";

export const dynamic = "force-dynamic";

/** CSV-exportable tables → the export field that holds their rows. */
const CSV_TABLES = {
  food_logs: "foodLogs",
  habit_logs: "habitLogs",
  water_logs: "waterLogs",
  body_measurements: "bodyMeasurements",
  nutrition_targets: "nutritionTargets",
  habits: "habits",
  meals: "meals",
} as const;
type CsvTable = keyof typeof CSV_TABLES;
const isCsvTable = (v: string | null): v is CsvTable => v !== null && v in CSV_TABLES;

const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

/**
 * Download a client's data (§13 export). Default: the full history as JSON.
 * `?format=csv&table=<name>` returns one whitelisted table as a spreadsheet-
 * friendly CSV. Authorized to the client themselves, their coach, or the owner —
 * nobody else. RLS is the second line (the gather only returns readable rows).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const allowed = user.id === id || user.role === "owner" || (await coachHasClient(user.id, id));
  if (!allowed) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format");
  const table = url.searchParams.get("table");

  const data = await gatherClientExport(id);
  const name = slug(data.profile?.display_name ?? "client");
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    if (!isCsvTable(table)) {
      return NextResponse.json({ error: "Unknown or missing table for CSV export." }, { status: 400 });
    }
    const rows = data[CSV_TABLES[table]] as ReadonlyArray<Record<string, unknown>>;
    const csv = toCsv(rows);
    const filename = `totalform-${name}-${table}-${stamp}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const filename = `totalform-export-${name}-${stamp}.json`;
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
