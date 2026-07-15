# Total Form Fitness

A habits-first healthy-lifestyle app for a personal trainer's clients. See
[`CLAUDE.md`](./CLAUDE.md) — the single source of truth for scope, design, and
the phase-by-phase build plan.

**Current phase:** 0 — Foundation (Next.js + Supabase + Vercel, auth, multi-coach
role model). Code complete; going live needs your Supabase + Vercel accounts
(steps below).

---

## Stack

- **Next.js 15** (App Router) · **React 19** · **TypeScript** · **Tailwind CSS 3**
- **Supabase** (Postgres, Auth, RLS) via `@supabase/ssr`
- **Vitest** for tests · deploys to **Vercel**

## What Phase 0 ships

- Open public sign-up **and** coach-code / coach-link sign-up, sign-in, sign-out.
- Consent to coach access captured at sign-up (required).
- A multi-coach-ready role model — `owner` / `coach` / `client` — with RLS so a
  client sees only itself, a coach sees only its clients, and the owner sees all.
- Role-based routing: a low-friction `/client` "Today" shell and a `/coach`
  command-center shell, each gated in middleware **and** on the server.
- The house style (fonts, palette, no gradients, 44px targets, visible focus,
  reduced-motion) and a CMS-ready copy layer with house-style defaults.

---

## Local development

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase values
npm run dev                    # http://localhost:3000
```

Without Supabase values the app still boots and shows a **Setup needed** screen —
no crash, no silent failure.

### Scripts

| Command             | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Dev server                                     |
| `npm run build`     | Production build                               |
| `npm run test`      | Vitest unit/component tests                    |
| `npm run typecheck` | `tsc --noEmit`                                 |
| `npm run lint`      | ESLint (`next lint`)                           |
| `npm run check`     | lint + typecheck + test + build (the DoD gate) |

---

## Going live (owner-only — can't be done from the build sandbox)

1. **Create a Supabase project** (free tier is fine).
2. **Apply the schema.** In the Supabase SQL editor (or `supabase db push`),
   run in order:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_functions_rls.sql`
   - `supabase/seed.sql`
3. **Create the owner.** Sign up your own email (via the app's `/signup` or the
   Supabase dashboard), then in SQL run:
   ```sql
   select public.promote_to_owner('you@example.com');
   ```
   The returned value is your coach code. Open public sign-ups will land under
   this owner. Add more coaches any time with
   `select public.provision_coach('coach@example.com');`.
4. **Set env vars** in `.env.local` (local) and in Vercel (Project → Settings →
   Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
   - `NEXT_PUBLIC_SITE_URL` (your deployed origin; used for auth email links)
5. **Auth redirect URLs.** In Supabase → Authentication → URL Configuration, add
   `<your-site>/auth/callback` to the allowed redirect URLs.
6. **Deploy to Vercel** (`vercel.json` is present; import the repo and deploy).
7. **Definition-of-Done device pass** — verify on a real iPhone. The
   iOS-critical trap (the WASM barcode scanner) arrives in Phase 1, but the
   PWA install, auth, and role routing should be checked on-device now.

---

## Project structure

```
src/
  app/
    page.tsx              landing / role redirect
    login, signup         auth screens (setup-aware)
    auth/callback         email-confirmation + client↔coach linking
    auth/signout          POST sign-out
    client/               low-friction "Today" shell (+ bottom tab bar)
    coach/                command-center shell (+ desktop rail)
  components/             house-style UI, nav, icons
  lib/
    auth/                 roles, coach-code, session, server actions
    supabase/             browser / server / middleware / admin clients
    content/copy.ts       CMS-ready copy with house-style defaults
    types/db.ts           DB types (regenerate with `supabase gen types`)
  middleware.ts           session refresh + role-based route gating
supabase/
  migrations/             schema + functions + RLS
  seed.sql                owner / coach bootstrap helpers
```
