"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { homePathForRole } from "@/lib/auth/roles";
import { normalizeCoachCode } from "@/lib/auth/coach-code";
import { getCopy } from "@/lib/content/copy";

export interface AuthActionState {
  error?: string;
  notice?: string;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Sign in an existing user, then route to their role's home. */
export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: getCopy("auth.error.invalidCredentials") };
  }

  const user = await getSessionUser();
  redirect(user ? homePathForRole(user.role) : "/client");
}

/**
 * Open public sign-up OR coach-code sign-up (CLAUDE.md §8). Consent to coach
 * access is captured here and is required — the whole product depends on it.
 * After the account exists we call the `resolve_signup` RPC, which links the
 * new client to the coach (by code) or to the owner for open sign-ups, and
 * records the consent timestamp atomically under RLS-safe SECURITY DEFINER.
 */
export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const consent = formData.get("consent") === "on";
  const rawCode = String(formData.get("coach_code") ?? "");
  const coachCode = rawCode ? normalizeCoachCode(rawCode) : "";

  if (!consent) {
    return { error: getCopy("auth.error.consentRequired") };
  }

  // Carry the coach code through the email round-trip so it survives to the
  // callback (the confirmation link is a fresh request with no form state).
  const callbackUrl = new URL(`${siteUrl()}/auth/callback`);
  if (coachCode) callbackUrl.searchParams.set("coach", coachCode);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl.toString(),
      data: { display_name: name },
    },
  });

  if (error) {
    return { error: error.message || getCopy("auth.error.generic") };
  }

  // When email confirmation is on, there is no session yet — we can only link
  // after the user confirms and signs in. Surface a clear "check your email".
  if (!data.session) {
    return { notice: getCopy("auth.signup.checkEmail") };
  }

  // We have a live session: link the client to a coach now.
  const { error: linkError } = await supabase.rpc("resolve_signup", {
    p_coach_code: coachCode || null,
    p_consent: consent,
    p_referral_code: null,
  });

  if (linkError) {
    // The account exists; linking can be retried, but tell the truth.
    return { error: linkError.message || getCopy("auth.error.generic") };
  }

  redirect("/client");
}

/** Sign out and return to the landing screen. */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
