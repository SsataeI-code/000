import { getCopyServer } from "@/lib/content/data";

/** Sign-out as a POST form — no client JS required, mutation isn't GET-able. */
export async function SignOutButton() {
  const t = await getCopyServer();
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/70 underline underline-offset-4 hover:text-red"
      >
        {t("common.signout")}
      </button>
    </form>
  );
}
