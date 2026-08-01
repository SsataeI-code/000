"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { providerDef } from "@/lib/wearables/providers";

/** Disconnect a tracker — removes the client's own connection + tokens (§7). */
export async function disconnectWearableAction(provider: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const def = providerDef(provider);
  if (!def) return;
  const supabase = await createClient();
  await supabase.from("wearable_connections").delete().eq("client_id", user.id).eq("provider", def.id);
  revalidatePath("/client/connect");
}
