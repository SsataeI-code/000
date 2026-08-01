import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getWearableStatuses } from "@/lib/wearables/data";
import { WEARABLE_PROVIDERS, providerConfigured, providerDef } from "@/lib/wearables/providers";
import { disconnectWearableAction } from "@/lib/wearables/actions";

export const dynamic = "force-dynamic";

/** "Connect your tracker" (§7) — honest about which providers auto-sync today. */
export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  const statuses = await getWearableStatuses(user.id);
  const statusByProvider = new Map(statuses.map((s) => [s.provider, s]));

  const connectedLabel = sp.connected ? providerDef(sp.connected)?.label ?? null : null;
  const errorMsg = sp.error
    ? sp.error === "not_available"
      ? "That tracker isn't set up yet. Ask your coach to enable it."
      : sp.error === "state"
        ? "That connection attempt expired — please try again."
        : "Couldn't finish connecting — please try again."
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Wearables</p>
          <h1 className="mt-1 text-4xl text-ink">Connect a tracker</h1>
        </div>
        <Link href="/client/you" className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red">
          Done
        </Link>
      </div>

      {connectedLabel ? (
        <p role="status" className="border border-success bg-surface px-3 py-2 text-sm text-success">
          {connectedLabel} connected. Your steps and sleep will start syncing.
        </p>
      ) : null}
      {errorMsg ? (
        <p role="alert" className="border border-red bg-surface px-3 py-2 text-sm text-red-ink">{errorMsg}</p>
      ) : null}

      <ul className="flex flex-col divide-y divide-hairline border border-hairline bg-surface">
        {WEARABLE_PROVIDERS.map((p) => {
          const configured = providerConfigured(p, process.env);
          const st = statusByProvider.get(p.id);
          const connected = st?.status === "connected";
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-body text-base text-ink">{p.label}</p>
                <p className="font-body text-xs text-ink/50">{p.pulls}</p>
              </div>
              {connected ? (
                <form action={disconnectWearableAction.bind(null, p.id)} className="flex items-center gap-3">
                  <span className="font-label text-[10px] uppercase tracking-wide text-success">Connected</span>
                  <button
                    type="submit"
                    className="min-h-tap font-label text-[10px] uppercase tracking-wide text-ink/50 underline underline-offset-4 hover:text-red"
                  >
                    Disconnect
                  </button>
                </form>
              ) : configured ? (
                <a
                  href={`/api/wearables/${p.id}/connect`}
                  className="min-h-tap inline-flex items-center border border-hairline bg-surface px-4 py-2 font-label text-xs uppercase tracking-wide text-ink hover:border-red hover:text-red"
                >
                  Connect
                </a>
              ) : (
                <span className="font-label text-[10px] uppercase tracking-wide text-ink/40">Not available yet</span>
              )}
            </li>
          );
        })}
      </ul>

      <section className="border border-hairline bg-surface p-5">
        <h2 className="text-2xl text-ink">Apple Watch or your phone?</h2>
        <p className="mt-1 font-body text-sm text-ink/60">
          Apple Health and phone pedometers can&apos;t sync to a web app — that&apos;s a real limitation, not a bug. Log
          your steps by hand on your habits and everything else works the same.
        </p>
        <Link
          href="/client/habits"
          className="mt-3 inline-flex min-h-tap items-center font-label text-xs uppercase tracking-wide text-red underline underline-offset-4"
        >
          Log steps by hand →
        </Link>
      </section>
    </div>
  );
}
