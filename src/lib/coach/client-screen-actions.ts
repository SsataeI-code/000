"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { reconcileClientLayout } from "@/lib/coach/client-screen";

export interface ClientScreenState {
  error?: string;
  ok?: boolean;
}

/**
 * Persist the coach's client "Today" screen layout (§4). The editor submits the
 * whole ordered layout as JSON; we reconcile it against the registry (never
 * trust raw JSON) and upsert only the client_today column — the dashboard layout
 * on the same row is left untouched. Coaches/owner only.
 */
export async function saveClientScreenLayoutAction(
  _prev: ClientScreenState,
  formData: FormData,
): Promise<ClientScreenState> {
  const user = await getSessionUser();
  if (!user || (user.role !== "coach" && user.role !== "owner")) return { error: "Not allowed." };

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(String(formData.get("layout") ?? "[]"));
  } catch {
    return { error: "Couldn't read the layout — try again." };
  }
  const client_today = reconcileClientLayout(parsed);

  const supabase = await createClient();
  const { error } = await supabase
    .from("coach_prefs")
    .upsert({ coach_id: user.id, client_today }, { onConflict: "coach_id" });
  if (error) return { error: "Couldn't save your layout — try again." };

  revalidatePath("/client");
  revalidatePath("/coach/client-screen");
  return { ok: true };
}
