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
  "auth.signup.invited": "A friend invited you — welcome. Let's get you started.",

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
  "client.nav.body": "Progress",
  "client.nav.coach": "Coach",
  "client.nav.you": "You",

  "client.invite.title": "Invite a friend",
  "client.invite.body":
    "Share your personal link. When a friend joins, your coach takes care of the thank-you.",
  "client.invite.share": "Share your link",
  "client.invite.copy": "Copy link",
  "client.invite.copied": "Copied",
  "client.invite.joinedLabel": "friends joined",
  "client.invite.rewardedLabel": "rewards given",

  "coach.dashboard.title": "Command center",
  "coach.dashboard.needsAttention": "Needs attention",
  "coach.dashboard.empty": "No clients yet. Share your coach code to bring your first one in.",
  "coach.dashboard.yourCode": "Your coach code",

  "coach.referrals.title": "Referrals",
  "coach.referrals.subtitle": "You control every reward — 10% off is only a default.",
  "coach.referrals.empty":
    "No referrals yet. When a client invites a friend who joins, they'll show up here to reward.",
  "coach.nav.roster": "Roster",
  "coach.nav.attention": "Attention",
  "coach.nav.messages": "Messages",
  "coach.nav.you": "You",

  "common.signout": "Sign out",
  "common.loading": "One sec…",
} as const;

/** A CMS override map, keyed by CopyKey. Empty means "defaults win". */
export type CopyOverrides = Partial<Record<CopyKey, string>>;

/**
 * Resolve a copy key. `overrides` carries CMS-stored, owner-edited copy (loaded
 * from `content_overrides`); an empty/missing entry falls back to the house-style
 * default, so a missing or failed CMS read never blanks the UI (§2 reliability).
 */
export function getCopy(key: CopyKey, overrides: CopyOverrides = {}): string {
  const v = overrides[key];
  return v != null && v !== "" ? v : defaultCopy[key];
}

/** All copy keys (stable order) — used by the CMS editor to list every string. */
export const copyKeys = Object.keys(defaultCopy) as CopyKey[];

/** The section a key belongs to (its prefix before the first dot), for grouping. */
export function copySection(key: CopyKey): string {
  const dot = key.indexOf(".");
  return dot === -1 ? key : key.slice(0, dot);
}
