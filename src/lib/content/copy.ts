/**
 * CMS-ready copy (CLAUDE.md §4, §16).
 *
 * Every user-facing string ships here with a house-style default already filled
 * in — so nothing is hard-coded in components, everything looks right out of the
 * box, and the Phase 6 CMS can override any entry per-coach without a code change.
 *
 * Voice: warm, human, behavior-science-driven. Encouraging on wins, forgiving
 * after a miss — never shaming.
 */

export type CopyKey = keyof typeof defaultCopy;

export const defaultCopy = {
  "brand.name": "Total Form Fitness",
  "brand.tagline": "Habits first. Health follows.",

  "auth.login.title": "Welcome back",
  "auth.login.subtitle": "Let's pick up where you left off.",
  "auth.login.emailLabel": "Email",
  "auth.login.passwordLabel": "Password",
  "auth.login.submit": "Sign in",
  "auth.login.toSignup": "New here? Create your account",

  "auth.signup.title": "Start today",
  "auth.signup.subtitle": "One small habit is all it takes to begin.",
  "auth.signup.nameLabel": "Your name",
  "auth.signup.emailLabel": "Email",
  "auth.signup.passwordLabel": "Password",
  "auth.signup.coachCodeLabel": "Coach code (optional)",
  "auth.signup.coachCodeHint": "Got a code from your coach? Enter it. No code? You're still welcome.",
  "auth.signup.consentLabel":
    "I agree to let my coach view my health data to guide my progress.",
  "auth.signup.submit": "Create account",
  "auth.signup.toLogin": "Already have an account? Sign in",
  "auth.signup.checkEmail": "Check your email to confirm your account, then sign in.",

  "auth.error.generic": "Something went wrong. Give it another try.",
  "auth.error.consentRequired":
    "We need your consent so your coach can support you. It's the whole point.",
  "auth.error.invalidCredentials": "That email and password don't match. Try again.",

  "client.today.title": "Today",
  "client.today.greeting": "Good to see you.",
  "client.today.empty": "Your habits will live here. Let's build the first one soon.",
  "client.nav.today": "Today",
  "client.nav.habits": "Habits",
  "client.nav.food": "Food",
  "client.nav.body": "Body",
  "client.nav.you": "You",

  "coach.dashboard.title": "Command center",
  "coach.dashboard.needsAttention": "Needs attention",
  "coach.dashboard.empty": "No clients yet. Share your coach code to bring your first one in.",
  "coach.dashboard.yourCode": "Your coach code",
  "coach.nav.roster": "Roster",
  "coach.nav.attention": "Attention",
  "coach.nav.messages": "Messages",
  "coach.nav.you": "You",

  "common.signout": "Sign out",
  "common.loading": "One sec…",
} as const;

/**
 * Resolve a copy key. `overrides` is where CMS-stored, coach-edited copy will be
 * injected later; today it's empty and the house-style defaults win.
 */
export function getCopy(
  key: CopyKey,
  overrides: Partial<Record<CopyKey, string>> = {},
): string {
  return overrides[key] ?? defaultCopy[key];
}
