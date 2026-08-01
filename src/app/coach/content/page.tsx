import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getContentOverrides, getImageOverrides } from "@/lib/content/data";
import { copyKeys, copySection, defaultCopy } from "@/lib/content/copy";
import { ContentEditor, type ContentField } from "@/components/content/ContentEditor";
import { ImageEditor } from "@/components/content/ImageEditor";

export const dynamic = "force-dynamic";

/** Humanize a copy key's last segment into a field label. */
function labelFor(key: string): string {
  const seg = key.slice(key.lastIndexOf(".") + 1);
  return seg
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

/** Owner-only CMS: edit every word in the app (§4 full CMS). */
export default async function CoachContentPage() {
  if (!hasSupabaseConfig()) redirect("/");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  // The CMS is owner-scoped in v1 (§4 "the coach" = the owner here).
  if (user.role !== "owner") redirect("/coach");

  const [overrides, imageOverrides] = await Promise.all([getContentOverrides(), getImageOverrides()]);

  const fields: ContentField[] = copyKeys.map((key) => ({
    key,
    section: copySection(key),
    label: labelFor(key),
    default: defaultCopy[key],
    value: overrides[key] ?? "",
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="font-label text-xs uppercase tracking-wide text-ink/50">Full CMS</p>
          <h1 className="mt-1 text-4xl text-ink">Edit app copy</h1>
        </div>
        <Link
          href="/coach"
          className="min-h-tap font-label text-xs uppercase tracking-wide text-ink/60 underline underline-offset-4 hover:text-red"
        >
          Dashboard
        </Link>
      </div>
      <p className="font-body text-sm text-ink/60">
        Every word in the app, yours to change. Type over any line to make it your own; clear a field to
        return it to the default. Nothing is ever hard-coded.
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl text-ink">Images</h2>
        <p className="font-body text-sm text-ink/60">
          Swap the app&apos;s branding for your own. Upload to replace; reset to return to the default.
        </p>
        <ImageEditor overrides={imageOverrides} />
      </section>

      <ContentEditor fields={fields} />
    </div>
  );
}
