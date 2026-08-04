# Go-live checklist — Total Form Fitness

Everything in the brief is built. This is the punch list to flip it fully live.
All SQL files are **idempotent** — re-running one is safe if you're unsure whether
you already did.

---

## 1. Database — run the SQL (Supabase → SQL Editor → New query → paste → Run)

Foundation (Phases 0–2) was applied during initial setup (`setup.sql`, `seed.sql`,
and `phase1*` / `phase2_habits` / `phase2_hydration_body` / `phase2_food_photos`).
The files below turn on everything built since. Run each file's **full contents**
— never a label or separator line.

| # | File | Turns on |
|---|------|----------|
| 1 | `supabase/phase3_coach_prefs.sql` | Configurable coach dashboard |
| 2 | `supabase/phase4_messages.sql` | Coach ↔ client chat |
| 3 | `supabase/phase4_notifications.sql` | In-app notifications + nudges |
| 4 | `supabase/phase4_engagement.sql` | Daily engagement-sweep state |
| 5 | `supabase/phase4_quiet_hours.sql` | Quiet hours |
| 6 | `supabase/phase4_push.sql` | PWA web push subscriptions |
| 7 | `supabase/phase6_referrals.sql` | Referrals |
| 8 | `supabase/phase6_content.sql` | Editable copy (CMS) |
| 9 | `supabase/phase6_content_images.sql` | Editable images (logo) |
| 10 | `supabase/phase6_client_screen.sql` | Coach-arranged client Today screen |
| 11 | `supabase/phase6_client_screen_overrides.sql` | Per-client Today screen |
| 12 | `supabase/phase2_body_photos.sql` | Progress photos |
| 13 | `supabase/phase7_weekly_reports.sql` | Weekly report notifications |
| 14 | `supabase/phase7_wearables.sql` | Tracker connections |
| 15 | `supabase/phase7_wearable_daily.sql` | Synced steps/sleep storage |
| 16 | `supabase/phase-strictness.sql` | Per-client nutrition strictness |

Each should end with a green **Success**. Until a file is run, its feature
degrades gracefully (loads, but reads/writes fall back to defaults).

---

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)

### Required — the app won't work without these
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; powers the daily sweep, deletes, wearable sync)
- `NEXT_PUBLIC_SITE_URL` (your deployed URL, e.g. `https://total-form-fitness.vercel.app`)

### Daily automation (nudges, re-engagement, weekly reports)
- `CRON_SECRET` — any long random string. Vercel Cron sends it as a Bearer token
  so the sweep endpoint can't be triggered by strangers.

### Re-engagement email (optional — 3/5/7-day ladder)
- `RESEND_API_KEY`, `EMAIL_FROM` — from a [Resend](https://resend.com) account with a
  verified sender domain. Without these, the in-app + push touches still fire; only
  the email is skipped.

### PWA push (optional)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (a `mailto:` URL).
  Without them, in-app notifications still work; only the buzz is skipped.

### AI assistant (optional — Phase 5 upgrade)
- `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com).
  Optional `ANTHROPIC_MODEL` (defaults to `claude-opus-5`; set `claude-sonnet-5` for
  lower cost). Without it, the client "Ask" screen and coach "Draft with AI" show a
  disabled state; the rule-based helper still works.

### Wearables (optional — per provider you want)
Create a developer app at each provider, register the callback
`https://<your-site>/api/wearables/<provider>/callback`, then set:
- Oura: `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET`
- Fitbit: `FITBIT_CLIENT_ID`, `FITBIT_CLIENT_SECRET`
- Whoop: `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`

A provider only shows a real **Connect** button once its keys are set. Oura & Fitbit
map steps + sleep today; Whoop connects but its data-pull isn't wired yet.

---

## 3. Vercel Cron

`vercel.json` already schedules the daily sweep (`/api/cron/engagement`). Just set
`CRON_SECRET` (above). The sweep then auto-nudges slips, alerts you after 3 quiet
days, fires the email ladder, syncs connected wearables, and sends the weekly reports.

---

## 4. Device verification (§15 Definition of Done — do this on a real iPhone)

The one check that can't be done from the build environment:
- [ ] **Scan a real barcode** on an actual iPhone (Safari). This is the historical
      trap — the WASM scanner fix is in, but confirm a live scan end-to-end.
- [ ] Add-to-Home-Screen, then confirm push permission + a test notification.
- [ ] Take a progress photo with the self-timer.
- [ ] Log a food, check a habit, build & log a plate — confirm they persist.

---

## 5. First-run

1. Sign in as the owner. From the coach dashboard, **"Use the app"** opens the client
   side so you can dogfood it as yourself.
2. Share your coach code (on the dashboard) or the public sign-up link to bring in
   your first client — they land in your roster automatically.
