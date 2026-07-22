# CLAUDE.md — Total Form Fitness

> **This is the living brief for this project.** Claude Code reads it at the start of every session. It is the single source of truth. To evolve the app, edit the relevant section here and re-run — don't let decisions live only in chat. Keep it accurate; keep it tight.
>
> **Status:** v1 spec, pre-build. Building via Claude Code, phase by phase (see *Build Plan*).

---

## 1. What we're building

A **habits-first healthy-lifestyle app** for a personal trainer's clients — nutrition, healthy habits, and body progress in one place, so clients track their health seamlessly and the coach can see and steer all of it.

**This is a behavior-change app, not a calorie counter.** Habit formation is the emotional core. Food logging is a supporting actor.

**Two-sided, built to grow into three:**
- **Client** — the person doing the work.
- **Coach** — the trainer (the owner). Full read-write control of the whole app.
- **(Future) multiple coaches + an Owner/super-admin.** Ship solo, but **architect the role model for multiple coaches from day one** — each coach owns their own clients; the owner oversees all. Never hard-code a single-coach assumption.

**What each side is *for*:**
- **Client screen = ease of use.** Simple, fast, frictionless — get in, check habits / log, get out. Ruthlessly low-friction.
- **Coach screen = command center.** Statistics, helping clients, interacting (messaging), and editing their goals.

**Money lives outside the app.** Clients pay the coach directly for access. **Everything inside the app is unlocked** — no paywalls, tiers, or locked panels anywhere.

---

## 2. Priorities (the tie-breaker when goals collide)

1. **Reliability** — tied #1, never bends. It's a paid daily health tool; a lost log or a broken week loses the client.
2. **UX & polish** — tied #1, never bends. If logging feels clunky, clients stop, and every coach stat goes dark.
3. **Speed to ship** — get verified phases into clients' hands.
4. **Maintainability** — it's one living product that changes constantly.
5. **Scale** — thousands of clients is fine and expected; do **not** slow v1 for millions.

---

## 3. Stack & environment

- **Frontend:** Next.js (React) + TypeScript + Tailwind. **Responsive web app / installable PWA.** Web-only — no native app.
- **Backend:** **Supabase** — Postgres, Auth, Storage, Realtime. This is the whole back end (accounts, roles, chat, image/CMS storage).
- **Hosting:** Vercel.
- **Why this stack:** it's the most stable, best-documented path for AI-built apps — fewest hallucinations, $0 to start, scales without a rewrite.
- **Recommended MCP servers:** **Supabase MCP** (manage schema/auth directly during the build) and **Context7** (version-accurate Next.js/Supabase docs so we never write against stale APIs). Keep the MCP set small.
- **Safety:** deny reading `.env`/secrets; no destructive DB or `git push` without explicit confirmation.

---

## 4. Design — the house style (this is non-negotiable brand identity)

Bold, editorial, flat, high-contrast. Feels alive and personal, never a static form.

- **Type:** Archivo 800/900 **UPPERCASE** headlines · Oswald labels · Spline Sans body.
- **Palette:** `#0c0c0d` ink · `#e10600` red (primary) · `#1f8a4c` success · `#ffffff` / `#f6f6f4` surfaces · `#ececea` hairline.
- **Rules:** **no gradients.** Icons only — **no decorative emoji.** Flat nav + mobile bottom tab bar. 780px breakpoint.
- **Motion with intent:** route transitions, list stagger, progress fills that animate to value, cell-by-cell heatmap fill, micro-celebrations as an on-brand **red pulse/stamp** (never confetti). **Always respect `prefers-reduced-motion`.**
- **Voice:** warm, human, behavior-science-driven. Encouraging on wins, **forgiving after a miss — never shaming.**

### Accessibility (baked in, every screen, part of "done")
AA contrast · 44px+ tap targets · full keyboard access · visible focus rings · reduced-motion honored.

### Full CMS (coach-editable everything)
**Every word and every image in the app is editable by the coach.** Architect all copy and media as content entries with the house-style defaults above already filled in — so nothing is hard-coded, but everything ships looking right and the coach never *has* to touch it.

---

## 5. The three pillars

### A. Habits (the core — the star of the app)
- **Habit builder:** name · category (nutrition · movement · sleep · mindfulness · hydration · recovery) · type (checkbox / counter-with-target / duration / quantity) · cadence (daily / X×week / specific days) · reminder time · optional "why" shown at check-in.
- **Movement lives here** — e.g. "30-min workout," "1-hour bike ride," "8k steps," "hydration." **No workout programming, strength logging, exercise library, or PR tracking.**
- Habit **stacking** (anchor to an existing routine), **streaks / chains / consistency %**, GitHub-style **heatmap** (animated fill), longest-streak & comeback records, forgiving miss-recovery ("streak freeze").
- **Adaptive habit-recommendation engine:** reads each client's real behavior and suggests the **next right habit — one at a time, only after the last one sticks.** **Client can adopt a suggestion themselves; the coach sees every adoption and can veto/remove it.**

### B. Nutrition
- **Food logging via barcode scan + Open Food Facts** (see *Food data*). Calories, macros, and **micros** (any nutrient sliceable).
- **Targets calculator — Precision Nutrition (PN) methodology.** Personalized per goal and per individual, generated right after they create a profile:
  - **Calories** from a validated NIH Body-Weight-Planner-style model that accounts for metabolic adaptation — maintenance for health goals, a deficit for fat loss, a *modest* surplus for muscle gain — from age, sex, height, weight, activity, goal (+ optional timeline).
  - **Protein first**, set on grams-per-pound of bodyweight (~0.65–1.35 g/lb, on a sliding scale by sex, weight, goal, and activity).
  - **Fat or carbs** then set to a % of calories by preference (balanced / low-carb / low-fat); remaining calories fill the other macro (balanced = split evenly).
  - **Recalculate every 4–6 weeks or after a significant weight change.**
  - Optional **hand-portion** guidance for clients who don't want to count grams.
  - *Micros:* the app still tracks micronutrients from logged food, but PN sets macro/calorie targets, not micro targets.
- **Per-client strictness setting** (coach-controlled): precise macros / protein+calories-tight-rest-flexible / flexible ranges / habits-only. Same app, dialed to the person and their goal.
- Goals supported: **lose fat/weight · build muscle/gain · maintain/recomp · habits-only (no weight goal).**

### C. Body
- Weight + trend (with moving average), plus **body-fat %**, **optional** measurements (waist/hips/etc.), and **optional, opt-in progress photos.** Measurements/photos are a secondary add-on — present for those who want them, never front-and-center. **Photos private & encrypted.**

### Hydration (dedicated)
A dedicated daily **water tracker** — adjustable goal, one-tap quick-add, its own ring on Today. A first-class feature, not just a generic habit.

### Client "Today" screen (hierarchy matters)
A *living* screen that shifts morning → midday → evening. Order, top to bottom:
1. **Today's habits to check off** (the star).
2. **Rings / progress at a glance** (the reward filling up).
3. **Food logging** (a scroll down, for when needed).

Every action returns **instant visible progress + one warm line of copy.** Nothing is ever a dead end.

---

## 6. Food data (core daily loop — get this right)

- Source: **Open Food Facts** (free, open, ~3M+ products, crowdsourced, self-updating as clients scan).
- **Barcode scanning must use a WebAssembly scanner (e.g. ZBar-WASM).** Do **not** rely on the browser's native `BarcodeDetector` — it does not work in Safari/iOS and would silently fail on every iPhone.
- **Parse defensively:** an OFF "not found" can return HTTP 200 with `status:0`; missing/odd fields are normal. Treat every scan as **trust-but-verify** — show what's known, let the client confirm or fill missing macros in a tap, save it back (which improves the shared data). A bad response must never corrupt a log.

---

## 7. Wearables & steps

- **Auto-sync via cloud APIs only:** Oura, Fitbit, Garmin, Whoop — OAuth "Connect your tracker" flow. Pull steps/sleep/HR.
- **No Apple Health / Apple Watch / Android on-device sync** — impossible from a web app. For those clients, a clean **manual step-entry** fallback.
- **Be honest in the UI** about which trackers auto-sync, so no one stares at a zero wondering why. No silent failures.

---

## 8. Onboarding & growth

- **Sign-up:** coach code/link **and** open public sign-up. Every new sign-up lands in the coach's dashboard as their client. Consent to the coach viewing their health data is captured at sign-up.
- **First run:** quick intake (age, height, current weight, activity, goal) → app **auto-generates targets** so the client logs on day one → **coach is notified of the new client and can adjust anything.**
- **Referrals:** default reward is **10% off the referrer's next month.** The app tracks who referred whom, confirms the new sign-up, and **surfaces it to the coach — but the coach processes it and controls any discount given** (10% is a default the coach can override or waive). Build a share/invite flow into the client app; prevent self-referrals.

---

## 9. Coach dashboard

> **The dashboard is open-ended and editable** — the coach arranges, adds, and edits the tiles and views it shows. Build it configurable, not a fixed layout.

- **Opens on a "Needs Attention" queue** — anyone who trips **any** of these floats to the top, most urgent first:
  - stopped logging food for a few days
  - missing assigned habits / broke a streak
  - weight trending against their goal
  - gone quiet (hasn't opened the app)
- **Per-client deep-dive:** full picture — adherence, habits, nutrition trends, weight, everything.
- **Roster-wide aggregates & cohorts:** every metric sliceable down to a single micronutrient (weight, weight change, avg calories, any macro/micro) across the whole roster — **and the ability to segment clients into groups by age, gender, weight, body-fat %, goal, etc., and compare per-segment stats.** Plus full individual stats on any client.
- **Slip response (hybrid):** small slips → app **auto-nudges** the client (AI-drafted, in the coach's brand voice). Big slips → **escalate to the coach's queue** for a personal touch.
  - *Default line (coach-adjustable):* **auto-nudge** a one-off miss (a missed habit, one skipped log day, small streak wobble → same-day warm nudge); **escalate** when it persists/stacks (several days no logging, ~a week silent, weight drifting wrong over weeks, or multiple flags at once).

---

## 10. Messaging & notifications

- **Editable app copy** (via CMS) **+ direct coach↔client chat** (per-client threads, realtime).
- **Delivery (simplified — no SMS):** **in-app notifications + PWA push** (free) are the default. **Email is a re-engagement channel only** — triggered after **3 consecutive days of no app use.** Client can set quiet hours.
- **Transparency (default, coach-configurable):** auto-nudges are framed as **the app** (in the coach's brand tone); **personal coach messages are unmistakably from the coach.** Real messages carry weight; no one feels fooled.

---

## 11. AI assistant (powered by the Claude API, in-app)

Available to **both** roles, **grounded in the client's real data** (never generic, never invented).

- **For clients:** meal planning, food swaps, and answers **within their targets** ("30g protein short, 300 cals left — what should I eat?").
- **For the coach:** drafts nudges and messages from a client's real data. **AI drafts; the coach sends** — the coach is always the last tap.
- **Autonomy:** full everyday help, **but any major change — targets, goal, or the coach's assigned plan — routes to the coach for approval first.**
- **Hard guardrails (non-negotiable):** never gives medical advice — anything medical, injury, or a sign of disordered eating is gently steered to the coach or a professional, never diagnosed. Never invents nutrition numbers. Stays in the coach's plan.

---

## 12. Reports

- **Weekly** (default, adjustable), in-app + a notification.
- **Client recap:** celebrate wins + **1–3 realistic things to work on** — constructive, honest, never a lecture. Written in the coach's voice, from the client's real week.
- **Coach digest:** roster status — who moved, who slipped, wins to celebrate, who needs you Monday.

---

## 13. Data & privacy

- Consent to coach access captured at sign-up. Health data handled with care; progress photos private & encrypted.
- **Departed client:** data stays live **1 year**, then archived. **Export available** during that year (nobody's history is held hostage).

---

## 14. Build plan — build everything, one verified phase at a time

We ship the full product, but we never stack a new floor on a cracked one. Each phase is shippable and must pass its *Definition of Done* before the next begins.

0. **Foundation** — repo, Next.js + Supabase + Vercel, auth, client/coach roles (multi-coach-ready), hosted & live.
1. **Core client loop** — barcode + Open Food Facts logging, the "Today" screen, calories/macros. The daily habit.
2. **Habits + Body** — habit engine (builder, stacking, streaks, heatmap), weight/measurements.
3. **Coach dashboard** — Needs Attention queue, deep-dive, roster stats, assign plans.
4. **Messaging** — editable copy + coach↔client chat + multi-channel notifications.
5. **AI assistant** — meal planning, swaps, message drafts, habit recommendations.
6. **Growth** — referrals + full CMS.

---

## 15. Definition of Done (the QA discipline — applies to every phase)

**Check your own work relentlessly. Nothing reaches a client with a known flaw.** Before a phase is called done:

- [ ] Automated tests written and passing.
- [ ] **Verified on a real iPhone** (this is where the barcode trap lives).
- [ ] Accessibility pass: keyboard, AA contrast, visible focus, 44px targets, `prefers-reduced-motion`.
- [ ] All external data (OFF scans, wearable syncs) parsed defensively — a bad response never corrupts state.
- [ ] Zero console errors/warnings.
- [ ] Self-review against this checklist; fix everything found **before** reporting the phase complete.

---

## 16. Guardrails — mistakes to actively prevent

- **No `localStorage`-only or single-file "app."** Real Supabase backend; data syncs across devices, private per user.
- **No native `BarcodeDetector`.** WASM scanner only (works on iOS).
- **Never assume Apple Health/Watch is readable from the web.** It isn't.
- **Never hard-code copy or images.** Everything CMS-editable with house-style defaults.
- **AI never** gives medical advice, invents numbers, or changes a plan without coach approval.
- **Never ship a phase with known glitches.**
- **Don't hard-code a single coach.** Role model supports many + an owner.
- **Never skip consent, export, or the retention rule.**

---

## 17. Open items to refine this week

- Email provider for the 3-day re-engagement email + quiet-hours defaults.
- CMS surface: which screens expose which editable fields first.

---

## Build log — implementation notes (kept current by Claude Code)

### Phase 0 — Foundation ✅ (code complete; live-deploy + device verification gated on owner accounts)

**Stack pinned:** Next.js 15 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 3 · `@supabase/ssr` · Vitest.

**Role model (multi-coach-ready — no single-coach assumption):**
- `profiles` — one row per `auth.users`, `role ∈ {owner, coach, client}`.
- `coaches` — coach-specific record with a unique, shareable `coach_code`.
- `coach_clients` — link table (`coach_id` → `client_id`) with `consent_given_at`, `status`. One active coach per client today, but the schema already supports reassignment and many coaches under one owner.
- RLS: a client sees only itself; a coach sees itself + its clients; the owner sees everything. Enforced with `SECURITY DEFINER` helper functions to avoid recursive policy lookups.
- `handle_new_user` trigger creates the `profiles` row on signup; a `resolve_signup` RPC links the new client to a coach (by coach code) or to the owner for open public signups, recording consent atomically.

**App shell:**
- `/login`, `/signup` (open public **and** `?coach=CODE` prefill), `/auth/callback`, `/auth/signout`.
- `/client` — low-friction "Today" shell with mobile bottom tab bar.
- `/coach` — command-center dashboard shell.
- Middleware refreshes the Supabase session and routes by role; a client can't reach `/coach` and vice-versa.

**House style:** design tokens + fonts (Archivo/Oswald/Spline Sans) wired in Tailwind + `globals.css`; no gradients; `prefers-reduced-motion` honored; 44px tap targets; visible focus rings; 780px breakpoint.

**CMS-ready:** all shell/auth copy lives in `src/lib/content/copy.ts` with house-style defaults — no hard-coded strings in components, ready for the Phase 6 CMS to override.

**Owner-side setup (required to go live — cannot be done from the build sandbox):**
1. Create a Supabase project; run `supabase/migrations/*` (Supabase CLI or SQL editor).
2. Seed the owner account (`supabase/seed.sql`) and set its `role = 'owner'`.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and `SUPABASE_SERVICE_ROLE_KEY` server-side) in `.env.local` and in Vercel.
4. Deploy to Vercel (`vercel.json` present). Then run the Definition-of-Done device pass on a real iPhone.

See `README.md` for the full runbook.

### Phase 1 — Core client loop ✅ (live)

**Nutrition core (`src/lib/nutrition`, `src/lib/food`):**
- **PN targets calculator** (`targets.ts`): Mifflin-St Jeor TDEE × activity, goal deficit/surplus floored at BMR, protein-first g/lb sliding scale, carbs/fat by diet preference. Recalc via `recalcTargetsAction`.
- **Open Food Facts** (`off.ts`): defensive parse (HTTP-200 + `status:0` trap, missing fields, kJ→kcal), barcode lookup, **text search**, shared `normalizeOffProduct`. Never throws.
- **Built-in generic foods** (`generic-foods.ts`): **535** foods, no duplicates (test-enforced), fuzzy + case-insensitive matcher (bounded Levenshtein), core + vitamin micros on ~77 foods (standard reference values, never invented). `searchFoodsAction` blends generics → shared cache → OFF, de-duped.
- **Portions** (`portions.ts`): log by servings/oz/cups/tbsp/tsp/pieces/handful/grams (most clients can't eyeball grams).
- **Micros** (`micros.ts`): full nutriment map stored per log (scaled), essential vitamin/mineral **goals** (FDA 2000-cal DVs; vitamins fixed even at low cal, fiber/sat-fat/sugar caps scale, iron by sex), daily tracker + "fill your rings" recommender + meal-combo suggestions (`recommend.ts`, `meals.ts`).
- **Food logging:** barcode (WASM ZBar), search, manual; optional **food photo** (private Storage bucket, signed URLs); one-tap **saved meals** (`meals` table) and built-in meal ideas (customizable inline).

**Schema:** migrations `0003_nutrition` (client_profiles, nutrition_targets, food_products cache, food_logs), `0004_meals`, `0007_food_photos`.

**Today screen (`/client`):** habits (top) → macro rings + water → food log (+ photos) → meal ideas → micro tracker. Onboarding (`/client/onboarding`) generates targets + starter habits and **requires the client to pick one habit of their own**.

### Phase 2 — Habits + Body ✅ (live)

- **Habits** (`src/lib/habits`, migration `0005_habits`): builder (name/category/type/cadence daily|weekly-count|specific-days/target/unit/reminder/why/anchor-stacking), one-tap check-off + **counter/step value entry** (manual — web can't read a phone health app; cloud-tracker OAuth is a later phase), streaks/consistency/heatmap (pure `streaks.ts`, tested), **tailored starter habits** from goal+activity (`starter.ts`, always incl. steps + activity) with a seed button for existing clients, habit **ideas** (`ideas.ts`).
- **Hydration** (dedicated, migration `0006`): `water_logs` + `water_goal_ml`; Today ring with one-tap **+1 bottle (16.9 oz)** / +1 cup, oz display.
- **Body** (`src/lib/body`, migration `0006`): `body_measurements`; `/client/body` logs weight (lb/kg) + optional bf%/waist/hips; moving-average trend + sparkline (`trend.ts`, tested).
- **Review nudges:** weekly habit review + monthly targets-recalc banners on Today.
- **Gamification (habits as the star; §4 celebrate wins):** `src/lib/habits/game.ts` (pure/tested) — XP (10/completion + streak-milestone bonuses), warm level ladder (Spark→Legend), achievement badges (first step, perfect day/week, week/month/centurion streaks, comeback, builder, 50-club), `perfectDayCount`/`comebackCount`. `HabitGame` banner (level + animated XP bar, streak flame, today's fill + one warm line, on-brand red "Perfect day" stamp — never confetti), `Achievements` badge grid, and per-check-off micro-celebration (red-pulse + "+10 XP" + flame streak with milestone highlight) on `TodayHabits`. Time-aware `Greeting` (morning/afternoon/evening on the client's own clock). On `/client` and `/client/habits`.

### Phase 3 — Coach dashboard 🔨 (in progress; slices 1–3 live)

- **Needs-Attention scoring** (`src/lib/coach/attention.ts`, pure/tested): flags quiet / no-food / missed-habits / weight-off-track, most urgent first.
- **Coach data** (`coach/data.ts`): batched roster + per-client metrics (RLS scopes to the coach's clients); `coachHasClient` authz; roster now carries sex/age/activity/bodyFatPct; `getRosterSeries` for roster-wide daily trends.
- **Plan assignment** (`coach/actions.ts`): coach edits a client's calorie/macro targets (new `nutrition_targets` row, method="coach"), assigns a daily habit, or vetoes (archives) one — all authorized server-side to the coach's own client. UI: `ClientPlanTools` on the deep-dive.
- **Cohort slicing** (`coach/cohorts.ts`, pure/tested): segment the roster by goal / gender / age band / activity / body-fat band with per-segment count, active-today, flagged, avg weight, avg body-fat. UI: `RosterCohorts` (client-side dimension picker).
- **Graphs & stats** (`src/lib/charts/series.ts` pure/tested; `src/components/charts/*` flat SVG, no libs): a **7/30/90-day range toggle** (URL-driven via `?range=`, server refetch, `RangeToggle`) on every graph surface. Per-client `IndividualProgress` (coach deep-dive **and** the client's own `/client/body` "Progress" tab, same numbers both sides): key-stats strip (weight, weekly rate, avg cals, avg protein vs target, days-logged, best streak), weight (line + moving-avg), body-fat trend (when logged), calories-vs-target (bars), protein-vs-target (bars), habit-consistency (bars). Roster-wide `RosterTrends`: avg logging/cals/protein/consistency stats, weight-direction split (losing/holding/gaining), and daily line/bar charts.
- **Configurable dashboard** (`coach/dashboard.ts` pure/tested; migration `0008_coach_prefs`): the coach arranges/shows/hides dashboard tiles (§9 "open-ended and editable"). Tile registry + `reconcileLayout` (survives new tiles, drops unknown ids, never trusts raw JSON) + `moveTile`/`toggleTile`. `coach_prefs` table (jsonb layout, per-coach, RLS-scoped, owner-sees-all). Editor at `/coach/dashboard` (`DashboardEditor`, up/down + show toggle, one save via `saveDashboardLayoutAction`); `/coach` renders visible tiles in order (snapshot / needs-attention / steady / roster-trends / coach-code), fetching the heavy roster-trends series only when that tile is on. Falls back to sensible defaults before the migration is run.
- **UI:** `/coach` configurable tiles + "Customize" link; `/coach/clients/[id]` deep-dive (rings, water, **habit game — level/XP/streak-flame/badges, same as the client sees, in coach-view copy**, heatmap, **progress graphs**, **plan tools**); `/coach/roster` list + aggregates + **trends + cohorts**; `/coach/dashboard` layout editor; messages/you tabs. Owner sees every client's full deep-dive (role bypass).
- **Phase 3 essentially complete** — Needs-Attention, deep-dive, roster stats/trends/cohorts, plan assignment, graphs, and a configurable dashboard all live.

**Testing:** 149 Vitest tests (pure logic). Every migration verified on Postgres 16, idempotent (0008 RLS isolation checked end-to-end: coach sees/writes only own prefs). Migrations are also mirrored as one-file `supabase/phase*.sql` for the owner to paste-run.

**Owner setup done:** Supabase live, migrations 0001–0007 applied, owner = jakekatz8@gmail.com, deployed on Vercel at total-form-fitness.vercel.app.
**Owner action needed:** run `supabase/phase3_coach_prefs.sql` (migration `0008`) once to enable saving dashboard layouts — until then the dashboard shows default tiles and a save will error.
