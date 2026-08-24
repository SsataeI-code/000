"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { homePathForRole } from "@/lib/auth/roles";
import { normalizeCoachCode } from "@/lib/auth/coach-code";
import { normalizeReferralCode, isValidReferralCode } from "@/lib/referrals/code";
import { getContentOverrides } from "@/lib/content/data";
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
    const overrides = await getContentOverrides();
    return { error: getCopy("auth.error.invalidCredentials", overrides) };
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
  const rawRef = String(formData.get("referral_code") ?? "");
  const referralCode = rawRef && isValidReferralCode(rawRef) ? normalizeReferralCode(rawRef) : "";

  const overrides = await getContentOverrides();
  if (!consent) {
    return { error: getCopy("auth.error.consentRequired", overrides) };
  }

  // Carry the coach + referral codes through the email round-trip so they
  // survive to the callback (the confirmation link is a fresh request with no
  // form state).
  const callbackUrl = new URL(`${siteUrl()}/auth/callback`);
  if (coachCode) callbackUrl.searchParams.set("coach", coachCode);
  if (referralCode) callbackUrl.searchParams.set("ref", referralCode);

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
    return { error: error.message || getCopy("auth.error.generic", overrides) };
  }

  // When email confirmation is on, there is no session yet — we can only link
  // after the user confirms and signs in. Surface a clear "check your email".
  if (!data.session) {
    return { notice: getCopy("auth.signup.checkEmail", overrides) };
  }

  // We have a live session: link the client to a coach now.
  const { error: linkError } = await supabase.rpc("resolve_signup", {
    p_coach_code: coachCode || null,
    p_consent: consent,
    p_referral_code: referralCode || null,
  });

  if (linkError) {
    // The account exists; linking can be retried, but tell the truth.
    return { error: linkError.message || getCopy("auth.error.generic", overrides) };
  }

  redirect("/client");
}

/**
 * Send a password-reset email (§ auth). The link returns through /auth/callback
 * (which establishes a short-lived recovery session) and lands on /reset-password.
 * We always return the same neutral notice so the form never reveals whether an
 * email has an account.
 */
export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const overrides = await getContentOverrides();
  const notice = getCopy("auth.forgot.sent", overrides);
  if (!email) return { notice };

  const redirectTo = `${siteUrl()}/auth/callback?next=/reset-password`;
  try {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  } catch {
    // Swallow — never reveal whether the address exists.
  }
  return { notice };
}

/**
 * Set a new password for the user in the recovery session created by the reset
 * link. Requires a live session (from /auth/callback); if it's missing or the
 * link expired, we say so plainly.
 */
export async function updatePasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  const overrides = await getContentOverrides();
  if (password.length < 8) return { error: getCopy("auth.reset.tooShort", overrides) };

  const supabase = await createClient();
  const { data: { user: current } } = await supabase.auth.getUser();
  if (!current) return { error: getCopy("auth.reset.expired", overrides) };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message || getCopy("auth.error.generic", overrides) };

  const user = await getSessionUser();
  redirect(user ? homePathForRole(user.role) : "/client");
}

/** Sign out and return to the landing screen. */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
