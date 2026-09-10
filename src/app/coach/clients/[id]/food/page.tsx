import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { coachHasClient } from "@/lib/coach/data";
import { getFoodLogsSince } from "@/lib/nutrition/data";
import { resolveRange } from "@/lib/charts/range";
import { RangeToggle } from "@/components/charts/RangeToggle";
import { FoodLogDetail } from "@/components/coach/FoodLogDetail";

export const dynamic = "force-dynamic";

type SortKey = "log_date" | "calories" | "protein_g" | "carbs_g" | "fat_g";
const SORTS: SortKey[] = ["log_date", "calories", "protein_g", "carbs_g", "fat_g"];

/** Coach view: every food a client logged, sortable by any macro (§9 deep-dive). */
export default async function ClientFoodLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string; sort?: string }>;
}) {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "client") redirect("/client");
  const { id } = await params;
  if (user.role !== "owner" && !(await coachHasClient(user.id, id))) notFound();

  const sp = await searchParams;
  const range = await resolveRange(sp.range);
  const sort: SortKey = SORTS.includes(sp.sort as SortKey) ? (sp.sort as SortKey) : "log_date";

  const supabase = await createClient();
  const { data: nameRow } = await supabase.from("profiles").select("display_name").eq("id", id).maybeSingle();
  const name = nameRow?.display_name ?? "This client";

  const logs = await getFoodLogsSince(id, range);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-label text-sm uppercase tracking-wide text-ink/50">Food log · {name}</p>
          <h1 className="mt-1 text-4xl text-ink">Everything logged</h1>
        </div>
        <div className="flex items-center gap-4">
          <RangeToggle current={range} />
          <Link href={`/coach/clients/${id}`} className="min-h-tap font-label text-sm uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
            Back
          </Link>
        </div>
      </div>

      <p className="font-body text-sm text-ink/55">
        Every item {name} logged in the last {range} days. Tap a macro to sort by it and see each input&apos;s values.
      </p>

      <FoodLogDetail logs={logs} initialSort={sort} />
    </div>
  );
}
