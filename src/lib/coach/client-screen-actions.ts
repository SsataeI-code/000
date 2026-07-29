"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { reconcileClientLayout } from "@/lib/coach/client-screen";
import { coachHasClient } from "@/lib/coach/data";

export interface ClientScreenState {
  error?: string;
  ok?: boolean;
  reset?: boolean;
}

/** Coach/owner may edit this client's screen? (owner sees everyone.) */
async function authzForClient(clientId: string) {
  const user = await getSessionUser();
  if (!user || (user.role !== "coach" && user.role !== "owner")) return null;
  if (user.role !== "owner" && !(await coachHasClient(user.id, clientId))) return null;
  return user;
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

/**
 * Set (or update) a per-client override of the Today screen (§4 at the
 * individual-client grain). Authorized to the client's own coach (owner sees
 * everyone). The client's next Today load picks it up ahead of the roster default.
 */
export async function saveClientScreenOverrideAction(
  _prev: ClientScreenState,
  formData: FormData,
): Promise<ClientScreenState> {
  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) return { error: "Missing client." };
  const user = await authzForClient(clientId);
  if (!user) return { error: "Not allowed." };

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(String(formData.get("layout") ?? "[]"));
  } catch {
    return { error: "Couldn't read the layout — try again." };
  }
  const layout = reconcileClientLayout(parsed);

  const supabase = await createClient();
  const { error } = await supabase
    .from("client_screen_overrides")
    .upsert({ client_id: clientId, layout }, { onConflict: "client_id" });
  if (error) return { error: "Couldn't save this client's screen — try again." };

  revalidatePath("/client");
  revalidatePath(`/coach/clients/${clientId}/screen`);
  return { ok: true };
}

/** Clear a client's override so they follow the roster-wide default again. */
export async function resetClientScreenOverrideAction(
  _prev: ClientScreenState,
  formData: FormData,
): Promise<ClientScreenState> {
  const clientId = String(formData.get("clientId") ?? "");
  if (!clientId) return { error: "Missing client." };
  const user = await authzForClient(clientId);
  if (!user) return { error: "Not allowed." };

  const supabase = await createClient();
  const { error } = await supabase.from("client_screen_overrides").delete().eq("client_id", clientId);
  if (error) return { error: "Couldn't reset this client's screen — try again." };

  revalidatePath("/client");
  revalidatePath(`/coach/clients/${clientId}/screen`);
  return { ok: true, reset: true };
}
