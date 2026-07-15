import { getCopy } from "@/lib/content/copy";

/** Sign-out as a POST form — no client JS required, mutation isn't GET-able. */
export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/70 underline underline-offset-4 hover:text-red"
      >
        {getCopy("common.signout")}
      </button>
    </form>
  );
}
