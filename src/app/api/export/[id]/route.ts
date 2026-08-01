import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { coachHasClient } from "@/lib/coach/data";
import { gatherClientExport } from "@/lib/coach/export";

export const dynamic = "force-dynamic";

/**
 * Download a client's full data as a JSON file (§13 export). Authorized to the
 * client themselves, their coach, or the owner — nobody else. RLS is the second
 * line of defense (the gather query only returns rows the caller can read).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const allowed = user.id === id || user.role === "owner" || (await coachHasClient(user.id, id));
  if (!allowed) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const data = await gatherClientExport(id);
  const name = (data.profile?.display_name ?? "client").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);
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
