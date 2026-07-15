/**
 * Shown when Supabase env vars aren't set yet. Honest, actionable — no silent
 * failure (a value we carry from §7's "no silent failures" ethos everywhere).
 */
export function SetupNotice() {
  return (
    <div className="mt-10 border border-hairline bg-surface p-5">
      <p className="font-label text-xs uppercase tracking-wide text-red">
        Setup needed
      </p>
      <p className="mt-2 font-body text-sm text-ink/80">
        Connect Supabase to turn on accounts and roles. Copy{" "}
        <code className="bg-surface-muted px-1">.env.example</code> to{" "}
        <code className="bg-surface-muted px-1">.env.local</code>, add your project
        URL and keys, run the migrations in{" "}
        <code className="bg-surface-muted px-1">supabase/migrations</code>, then
        reload. Full steps are in <code className="bg-surface-muted px-1">README.md</code>.
      </p>
    </div>
  );
}
