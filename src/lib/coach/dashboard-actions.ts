"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { reconcileLayout } from "@/lib/coach/dashboard";

export interface DashboardState {
  error?: string;
  ok?: boolean;
}

/**
 * Persist the coach's dashboard layout (§9). The client editor submits the whole
 * ordered layout as JSON; we reconcile it against the registry (never trust raw
 * JSON) and upsert the coach's own prefs row. Coaches/owner only.
 */
export async function saveDashboardLayoutAction(_prev: DashboardState, formData: FormData): Promise<DashboardState> {
  const user = await getSessionUser();
  if (!user || (user.role !== "coach" && user.role !== "owner")) return { error: "Not allowed." };

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(String(formData.get("layout") ?? "[]"));
  } catch {
    return { error: "Couldn't read the layout — try again." };
  }
  const dashboard = reconcileLayout(parsed);

  const supabase = await createClient();
  const { error } = await supabase
    .from("coach_prefs")
    .upsert({ coach_id: user.id, dashboard }, { onConflict: "coach_id" });
  if (error) return { error: "Couldn't save your layout — try again." };

  revalidatePath("/coach");
  revalidatePath("/coach/dashboard");
  return { ok: true };
}
