import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { AddFood } from "@/components/food/AddFood";

export const dynamic = "force-dynamic";

/** Add-food screen: scan a barcode (WASM) or enter it manually (§5, §6). */
export default async function AddFoodPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl text-ink">Add food</h1>
        <Link
          href="/client"
          className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red"
        >
          Done
        </Link>
      </div>
      <AddFood userId={user.id} />
    </div>
  );
}
