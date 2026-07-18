/**
 * Central, defensive access to Supabase env vars. Reliability is tied-#1
 * (CLAUDE.md §2): a missing env var should fail loud at the boundary with a
 * clear message, never surface as a confusing runtime null deep in the app.
 */

/**
 * Strip characters that can't live in an HTTP header (any code point > 255) plus
 * surrounding whitespace. Supabase sends the anon key in the `apikey` and
 * `Authorization` headers; if a stray character like "→" (U+2192) is pasted into
 * a key, header construction throws a cryptic ByteString error and every request
 * dies. Cleaning it here means at worst the key is wrong (auth fails gracefully),
 * never a hard crash (§2 reliability).
 */
export function sanitizeHeaderSafe(raw: string | undefined): string {
  if (!raw) return "";
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[^\x00-\xFF]/g, "").trim();
}

/**
 * Normalize a Supabase project URL so the most common copy/paste mistakes don't
 * crash the app: a missing protocol (the classic — pasting just
 * "abc.supabase.co" makes supabase-js `new URL()` throw at construction),
 * surrounding whitespace, stray non-ASCII characters, and a trailing slash.
 * Returns "" for empty input.
 */
export function normalizeSupabaseUrl(raw: string | undefined): string {
  if (!raw) return "";
  let url = sanitizeHeaderSafe(raw);
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/+$/, "");
}

export function getSupabaseUrl(): string {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }
  return url;
}

export function getSupabaseAnonKey(): string {
  const key = sanitizeHeaderSafe(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Copy .env.example to .env.local and fill it in.",
    );
  }
  return key;
}

export function getSupabaseServiceRoleKey(): string {
  const key = sanitizeHeaderSafe(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. It is server-only and never exposed to the browser.",
    );
  }
  return key;
}

/** True when the public Supabase config is present (used to render setup hints). */
export function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
