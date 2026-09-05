import { createClient } from "@/lib/supabase/server";
import type { JournalEntry } from "@/lib/types/db";

export interface JournalEntryView extends JournalEntry {
  url: string | null; // short-lived signed URL for the photo, if any
}

/**
 * A client's journal / food-diary entries, newest first, each photo resolved to
 * a short-lived signed URL (private bucket). RLS scopes rows to the client /
 * their coach / the owner; a missing or expired photo just renders without a URL.
 */
export async function getJournalEntries(clientId: string, limit = 60): Promise<JournalEntryView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("client_id", clientId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data as JournalEntry[] | null) ?? [];
  const out: JournalEntryView[] = [];
  for (const row of rows) {
    let url: string | null = null;
    if (row.storage_path) {
      try {
        const signed = await supabase.storage.from("journal-photos").createSignedUrl(row.storage_path, 3600);
        url = signed.data?.signedUrl ?? null;
      } catch {
        url = null;
      }
    }
    out.push({ ...row, url });
  }
  return out;
}
