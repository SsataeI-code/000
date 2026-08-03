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
- **Palette (dark theme — inverted):** `#f4f4f2` ink (near-white text) · `#e10600` red (primary, `#ff5b4e` on dark for error text) · `#34c759` success · `#17171b` card / `#0c0c0d` page surfaces · `#26262c` elevated (banners/bubbles) · `#2c2c31` hairline. High-contrast black background, white lettering.
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

## 11. AI assistant (powered by the Claude API, in-app) — **OPTIONAL (owner decision)**

> **Owner decision (2026):** the app **does not require AI.** The **rule-based answer helper** handles clients' basic requests (what's left today, water, habits due, next-habit and meal suggestions, how-to FAQ) and the **automated nudge/engagement sweep** handles slips — all with **no API key**. Anything deeper, or any plan change, becomes a **real message to the owner/coach**. The Claude API pieces below are a **drop-in upgrade** that light up only if an `ANTHROPIC_API_KEY` is set; the product is complete and shippable without them. Do not treat AI as required, and never show clients an "AI" affordance when no key is configured.

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
- **Built-in generic foods** (`generic-foods.ts`): **535** foods, no duplicates (test-enforced), fuzzy + case-insensitive matcher (bounded Levenshtein), core + vitamin micros on ~77 foods (standard reference values, never invented). `searchFoodsAction` blends generics → shared cache → OFF, de-duped. **Realistic suggestions:** game/organ meats (rabbit, venison, liver, tongue, goose…) stay fully **searchable/loggable** but are filtered out of *recommendations* via `recommendableFoods()`/`isRecommendableFood` (kept everyday foods like kidney beans); both the fill-your-rings recommender and the meal suggester use the filtered set (test-enforced — no rabbit suggested, still searchable).
- **Hand-portion guidance** (§B "optional hand-portion guidance for clients who don't want to count grams"; `hand-portions.ts` pure/tested): PN method — `handPortions(targets)` turns the client's own gram targets into a daily count of **palms** (protein) / **cupped hands** (carbs) / **thumbs** (fats), plus veggie fists; never invents numbers (uses only their targets). `HandPortions` card on `/client/food`.
- **Portions** (`portions.ts`): log by servings/oz/cups/tbsp/tsp/pieces/handful/grams (most clients can't eyeball grams).
- **Micros** (`micros.ts`): full nutriment map stored per log (scaled), essential vitamin/mineral **goals** (FDA 2000-cal DVs; vitamins fixed even at low cal, fiber/sat-fat/sugar caps scale, iron by sex), daily tracker + "fill your rings" recommender + meal-combo suggestions (`recommend.ts`, `meals.ts`).
- **Food logging:** barcode (WASM ZBar), search, manual; optional **food photo** (private Storage bucket, signed URLs); one-tap **saved meals** (`meals` table) and built-in meal ideas (customizable inline).

**Schema:** migrations `0003_nutrition` (client_profiles, nutrition_targets, food_products cache, food_logs), `0004_meals`, `0007_food_photos`.

**Today screen (`/client`):** habits (top) → macro rings + water → food log (+ photos) → meal ideas → micro tracker. Onboarding (`/client/onboarding`) generates targets + starter habits and **requires the client to pick one habit of their own**.

### Phase 2 — Habits + Body ✅ (live)

- **Habits** (`src/lib/habits`, migration `0005_habits`): builder (name/category/type/cadence daily|weekly-count|specific-days/target/unit/reminder/why/anchor-stacking), one-tap check-off + **counter/step value entry** (manual — web can't read a phone health app; cloud-tracker OAuth is a later phase), streaks/consistency/heatmap (pure `streaks.ts`, tested), **tailored starter habits** from goal+activity (`starter.ts`, always incl. steps + activity) with a seed button for existing clients, habit **ideas** (`ideas.ts`).
- **Hydration** (dedicated, migration `0006`): `water_logs` + `water_goal_ml`; Today ring with one-tap **+1 bottle (16.9 oz)** / +1 cup, oz display.
- **Body** (`src/lib/body`, migration `0006`): `body_measurements`; `/client/body` logs weight (lb/kg) + optional bf%/waist/hips; moving-average trend + sparkline (`trend.ts`, tested).
- **Progress photos** (§C opt-in, private & encrypted; migration `0018_body_photos`, mirrored `supabase/phase2_body_photos.sql`): a private `body-photos` Storage bucket + `body_photos` table. The client uploads photos client-side to their own folder (`<uid>/…`) and `addBodyPhotoAction` saves the path (path must start with the caller's uid — defense beside RLS); `deleteBodyPhotoAction` removes row + object. `getBodyPhotos` returns rows with short-lived signed URLs (private bucket, never public). RLS: the client manages their own; their coach (`is_coach_of`) + owner may view (consent captured at sign-up). `BodyPhotos` component (opt-in upload + gallery on `/client/body`; read-only gallery on the coach deep-dive). Included in data export with a signed URL per photo. Verified on Postgres 16 (client owns, forge blocked by WITH CHECK, coach/owner read, unrelated client blocked). Storage policies mirror the proven food-photos pattern (0007).
- **Review nudges:** weekly habit review + monthly targets-recalc banners on Today.
- **Gamification (habits as the star; §4 celebrate wins):** `src/lib/habits/game.ts` (pure/tested) — XP (10/completion + streak-milestone bonuses), warm level ladder (Spark→Legend), achievement badges (first step, perfect day/week, week/month/centurion streaks, comeback, builder, 50-club), `perfectDayCount`/`comebackCount`. `HabitGame` banner (level + animated XP bar, streak flame, today's fill + one warm line, on-brand red "Perfect day" stamp — never confetti), `Achievements` badge grid, and per-check-off micro-celebration (red-pulse + "+10 XP" + flame streak with milestone highlight) on `TodayHabits`. Time-aware `Greeting` (morning/afternoon/evening on the client's own clock). On `/client` and `/client/habits`.
- **Streak freeze (§5A forgiving miss-recovery):** `currentStreak(..., freezes)` + `isStreakFrozen` + `FREEZE_BUDGET=1` (pure/tested) — one missed scheduled day is forgiven so a long chain survives a slip; a second consecutive miss still breaks it. Applied everywhere current streaks show (Today, habits, deep-dive, roster); a shield "saved" indicator appears on a protected habit row. Never shaming.
- **Owner sees everyone:** `getRoster`/`getRosterSeries` take a `{ owner }` scope — the owner's roster spans *all* clients (RLS `is_owner()` permits it), not just those linked to one coach (§1 owner oversight). Each roster row/card now shows the client's **habit level + name + current streak** (computed in `getRoster` from their logs) so progress is visible at a glance without opening a deep-dive.

### Phase 3 — Coach dashboard 🔨 (in progress; slices 1–3 live)

- **Needs-Attention scoring** (`src/lib/coach/attention.ts`, pure/tested): flags quiet / no-food / missed-habits / weight-off-track, most urgent first.
- **Coach data** (`coach/data.ts`): batched roster + per-client metrics (RLS scopes to the coach's clients); `coachHasClient` authz; roster now carries sex/age/activity/bodyFatPct; `getRosterSeries` for roster-wide daily trends.
- **Plan assignment** (`coach/actions.ts`): coach edits a client's calorie/macro targets (new `nutrition_targets` row, method="coach"), assigns a daily habit, or vetoes (archives) one — all authorized server-side to the coach's own client. UI: `ClientPlanTools` on the deep-dive.
- **Cohort slicing** (`coach/cohorts.ts`, pure/tested): segment the roster by goal / gender / age band / activity / body-fat band with per-segment count, active-today, flagged, avg weight, avg body-fat. UI: `RosterCohorts` (client-side dimension picker).
- **Graphs & stats** (`src/lib/charts/series.ts` pure/tested; `src/components/charts/*` flat SVG, no libs): a **7/30/90-day range toggle** (URL-driven via `?range=`, server refetch, `RangeToggle`) on every graph surface. Per-client `IndividualProgress` (coach deep-dive **and** the client's own `/client/body` "Progress" tab, same numbers both sides): key-stats strip (weight, weekly rate, avg cals, avg protein vs target, days-logged, best streak), weight (line + moving-avg), body-fat trend (when logged), calories-vs-target (bars), protein-vs-target (bars), habit-consistency (bars). Roster-wide `RosterTrends`: avg logging/cals/protein/consistency stats, weight-direction split (losing/holding/gaining), and daily line/bar charts.
- **Configurable dashboard** (`coach/dashboard.ts` pure/tested; migration `0008_coach_prefs`): the coach arranges/shows/hides dashboard tiles (§9 "open-ended and editable"). Tile registry + `reconcileLayout` (survives new tiles, drops unknown ids, never trusts raw JSON) + `moveTile`/`toggleTile`. `coach_prefs` table (jsonb layout, per-coach, RLS-scoped, owner-sees-all). Editor at `/coach/dashboard` (`DashboardEditor`, up/down + show toggle, one save via `saveDashboardLayoutAction`); `/coach` renders visible tiles in order (snapshot / needs-attention / steady / roster-trends / coach-code), fetching the heavy roster-trends series only when that tile is on. Falls back to sensible defaults before the migration is run.
- **UI:** `/coach` configurable tiles + "Customize" link; `/coach/clients/[id]` deep-dive (rings, water, **habit game — level/XP/streak-flame/badges, same as the client sees, in coach-view copy**, heatmap, **progress graphs**, **plan tools**); `/coach/roster` list + aggregates + **trends + cohorts**; `/coach/dashboard` layout editor; messages/you tabs. Owner sees every client's full deep-dive (role bypass).
- **Remove a client** (§13 departed-client handling; `archiveClientAction` + `deleteClientAction` in `coach/actions.ts`; `RemoveClient` on the deep-dive): **Archive** (any coach, reversible, two-step confirm) flips the client's active `coach_clients` link to `archived` — they drop off every roster/queue/stat immediately (all roster queries filter `status='active'`), but their data is retained per the 1-year rule and they can be re-added later (the one-active-coach unique index is active-only). **Permanent delete** (owner-only, irreversible, type-DELETE confirm) removes the client via the service-role `auth.admin.deleteUser` — every table cascades from `auth.users → profiles → logs/habits/messages`. Both authorized server-side (archive: owner or the client's own coach; delete: owner only, matching the owner-only `coach_clients_delete` RLS); redirect to the roster on success. Verified on Postgres 16 (archive drops from the active roster and re-add succeeds). **Archived-clients view** (`/coach/archived`, `getArchivedClients` + `ArchivedClients`/`restoreClientAction`): lists archived clients with a one-tap **Restore** (flips `archived → active`, guarded against the one-active-coach rule — a clear message if the client already picked up another coach). Linked from an "Archived" header link on the roster; owner sees everyone's archived links.
- **Data export** (§13 "export available — nobody's history is held hostage"; §16 "never skip … export"): `gatherClientExport` (`coach/export.ts`) batches a client's full history (profile, client_profile, all nutrition_targets, food_logs, habits, habit_logs, water_logs, body_measurements, saved meals) and the `GET /api/export/[id]` route streams it as a downloadable JSON file. Authorized to the client themselves, their coach, or the owner (RLS is the second line — the gather only returns rows the caller can read). Surfaced as **"Export all data (JSON)"** on the coach deep-dive (above archive/delete, so nothing's lost before removal) and **"Export my data"** on the client `/client/you` page. **CSV option** (`coach/csv.ts` pure/tested — RFC-4180-ish quoting, key-union across rows): `?format=csv&table=<whitelisted>` streams one table (food_logs / habit_logs / body_measurements / water_logs / nutrition_targets / habits / meals) as a spreadsheet file; the deep-dive exposes Food / Habits / Body / Water CSV links beside the JSON export.
- **Phase 3 essentially complete** — Needs-Attention, deep-dive, roster stats/trends/cohorts, plan assignment, graphs, a configurable dashboard, and client archive/delete all live.

### Phase 4 — Messaging 🔨 (in progress; chat live)

- **Coach ↔ client chat** (migration `0009_messages`; `src/lib/messages/*`): one thread per (coach, client) pair, `messages` table with `kind ∈ {coach, client, nudge}` so real messages vs. app auto-nudges are labeled differently (§10 transparency). RLS scopes a thread to its two participants (owner sees all); insert requires `sender_id = auth.uid()` (no forging). Verified on Postgres 16 — idempotent, participant-only isolation + no-forgery checked end-to-end. Added to `supabase_realtime` publication.
- **Realtime** (`ChatThread`, `src/lib/supabase/client.ts`): seeds from the server, then subscribes to Supabase Realtime INSERTs for the thread — new messages appear without a refresh; `router.refresh()` keeps unread counts current.
- **Data/actions** (`messages/data.ts`, `messages/actions.ts`): `getThread`/`getThreads`/`markThreadRead`/unread counts; `getClientCoachId` (client's active coach, else the owner, so a thread always has a home); `sendCoachMessageAction` (authz to own client) + `sendClientMessageAction`.
- **UI:** coach `/coach/messages` (thread list with unread badges + last-message preview) + `/coach/messages/[id]` (live thread, link to profile); client `/client/messages` ("Coach" tab, new bottom-nav item) live thread with the coach.
- **In-app notifications** (migration `0010_notifications`; `src/lib/notifications/*`): per-recipient inbox (`nudge`/`message`/`system`/`report`). RLS: read only your own (owner all); a coach/owner may create one *for* their client (the nudge path); recipient marks read. Verified on Postgres 16 — idempotent, coach-notifies-own-client-only + private-inbox checked end-to-end. Message sends now notify the other participant. `NotificationsList` inbox on `/client/you` (page newly created — the tab used to 404) and `/coach/you`, with "mark all read". Realtime-published.
- **Auto-nudge / escalate slip response** (§9 hybrid; `src/lib/coach/slip.ts`, pure/tested): `classifySlip(flags, score)` → none / nudge / escalate (one mild slip → same-day nudge; stacked flags, a silent week, or weight-off → escalate to a personal touch). `draftNudge(name, kind)` writes a warm, forgiving, per-slip message in the coach's voice (never shaming; test-guarded against negative words). `sendNudgeAction` posts it as a labeled `kind:"nudge"` message **and** notifies the client — the coach taps send (§11). On `/coach`, each Needs-Attention card shows the decision + a one-tap **Send nudge** (nudge) or **Reach out** link (escalate). Phase 5 swaps the template for an AI draft on the client's real data.
- **Automatic daily engagement sweep** (§9 auto-nudge, §10 coach alert + re-engagement email; migration `0011_engagement`): a **Vercel Cron** (`vercel.json`, daily 13:00 UTC) hits `/api/cron/engagement` (Bearer `CRON_SECRET`-gated). `src/lib/engagement/decide.ts` (pure/tested) decides per client: **auto-nudge** a small slip (2-day cooldown), **alert the coach** once a client is quiet ≥3 days, and **email** the client at **3 / 5 / 7** days (one per stage, resets when they return). `sweep.ts` runs it under the service role (`src/lib/supabase/admin.ts`), defensive per client; `engagement_state` table dedupes so nothing double-fires. Email via Resend (`src/lib/email/*`, warm/forgiving copy, pure content) — gated on `RESEND_API_KEY`; in-app nudges + coach alerts work without it.
- **Re-engagement email** (`src/lib/email/*`): the sweep sends the 3/5/7-day email via Resend (warm/forgiving, escalating copy; pure content). Now **always** pairs with an in-app "we miss you" notification + push, so the ladder works even before an email provider is configured; the email layers on when `RESEND_API_KEY` is set.
- **PWA Web Push** (migration `0012_push_subscriptions`; `src/lib/push/*`, `public/sw.js`): `push_subscriptions` table (per-device, user-managed, RLS-scoped, service-role sends). `PushToggle` on both `/you` pages registers the service worker, asks permission, subscribes with the VAPID public key, and stores it (honest states — iOS needs Add-to-Home-Screen first). `notify()` and the sweep now also `sendPush()` (best-effort, prunes expired subs). Gated on VAPID keys — in-app notifications work without them. Verified on Postgres 16 (idempotent, own-subs-only RLS).
- **Quiet hours** (§10; migration `0015_quiet_hours`, mirrored `supabase/phase4_quiet_hours.sql`; `src/lib/notifications/quiet.ts` pure/tested + `QuietHours` on `/client/you`): the client sets an overnight window (stored as minutes-past-local-midnight + their captured IANA timezone on `client_profiles`). `isQuietNow` evaluates the window in the client's own timezone (wrap-around-aware). `sendPush` now **suppresses the buzz during quiet hours** (defensive lookup — any failure means "not quiet" so a real alert is never wrongly swallowed) while the in-app notification is still recorded, so nothing is missed. Verified idempotent + range-constrained on Postgres 16.

### Phase 6 — Growth ✅ (referrals + full CMS)

- **Referrals** (§8; migration `0013_referrals`, mirrored `supabase/phase6_referrals.sql`; `src/lib/referrals/*`): every profile gets a shareable **referral code** (minted by `handle_new_user` + `ensure_referral_code`, existing rows backfilled). A `referrals` table tracks each referred sign-up with a coach workflow status (`joined` → `rewarded`/`declined`). `resolve_signup` now records the referral atomically with the coach link and **refuses self-referrals**; `process_referral` (SECURITY DEFINER, owning-coach/owner only) sets the reward decision. **The coach controls every reward — 10% is only a default, or waive.** Money stays outside the app; the "reward" is a status the coach tracks. RLS: referrer/coach/owner read, writes only through the RPCs. Verified idempotent + RLS-isolated on Postgres 16 (self-referral ignored, cross-user authz blocked). Pure/tested `code.ts` (normalize/validate, invite link, **privacy-safe counts — a referrer never gets a friend's name**). Signup wiring: `?ref=CODE` carried through the email round-trip → `resolve_signup` (page + hidden field + action + callback). **Client** share/invite flow: `InvitePanel` on `/client/you` (native share → copy fallback, count-only tally). **Coach** queue: `/coach/referrals` (reward/waive with a note) + a pending-count link on the dashboard; **owner sees all**.
- **Full CMS** (§4, §16; migration `0014_content`, mirrored `supabase/phase6_content.sql`): `content_overrides` (key → value) lets the **owner edit every user-facing string** without a code change. RLS: **everyone (incl. anon) reads** — so login/signup copy is editable too — **owner-only writes**. The existing `getCopy(key, overrides)` seam is now fed for real: `getContentOverrides()` (React `cache`, request-deduped, defensive — a missing table or read error falls back to the house-style default so the UI never blanks) + `getCopyServer()` bound resolver. **Every `getCopy` call site is wired**: server components/layouts/pages via the resolver (nav tabs moved inside the component so they're per-request), the auth server action for its error strings, and the three client components (`LoginForm`/`SignupForm`/`InvitePanel`) via an `overrides` prop from their server parent. Owner editor at `/coach/content` (`ContentEditor`): every key grouped by area (Brand / Sign in & sign up / Client / Coach / Common), house-style default as the placeholder, edit to override app-wide, **clear a field to reset to default**; one save (`saveContentAction`, owner-gated + RLS) upserts overrides and deletes resets, then revalidates the whole app. Reached from an owner-only **"Edit copy"** link on the coach dashboard. Verified on Postgres 16 (owner writes, client blocked from writing but reads, anon reads, idempotent).
- v1 CMS is a single global copy set edited by the owner; call sites already pass an overrides map, so per-coach copy can layer on later without reshaping them.
- **Editable images** (§4 "every image editable"; migration `0019_content_images`, mirrored `supabase/phase6_content_images.sql`): a **public** `content-images` Storage bucket (everyone reads branding; owner-only writes via `is_owner()`). Image overrides ride the existing `content_overrides` key/value store under an `image:<key>` row (no new table). Registry `src/lib/content/images.ts` (`brand.logo` today) with a built-in house-style default per image, so an unset image renders the default — never blank. `getImageOverrides()`/`getImageServer()` resolvers (request-cached, defensive). `BrandMark` gained an optional `src`; new server `BrandLogo` resolves the override and is swapped in at all 5 brand-mark sites (both layouts, landing, login, signup). Owner uploads/resets in a new **Images** section on `/coach/content` (`ImageEditor` — client-side upload to the public bucket → `saveImageOverrideAction`/`resetImageOverrideAction`, owner-gated + RLS, revalidates the whole app). Storage policies mirror the proven food-photos pattern.
- **Coach-configurable client "Today" screen** (§4 coach-editable everything; migration `0016_client_screen`, mirrored `supabase/phase6_client_screen.sql`; `src/lib/coach/client-screen.ts` pure/tested): the coach **arranges/shows/hides the sections their clients see** on Today — habits, progress rings, water, the Ask card, food log, fill-your-rings, meal ideas, micros (the greeting + review banners are structural and always render). Same registry + `reconcileLayout`/`moveSection`/`toggleSection` pattern as the coach dashboard (survives new sections, drops unknown ids, never trusts raw JSON). Stored per-coach on a new `coach_prefs.client_today` jsonb column (upsert touches only that column, leaving the dashboard layout intact). A client can't read their coach's prefs row under RLS, so the layout reaches the client through a **`client_screen_layout()` SECURITY DEFINER RPC** that resolves the caller's coach (active coach, else owner) and returns just the layout. Editor at `/coach/client-screen` (`ClientScreenEditor`, up/down + show toggle, one save via `saveClientScreenLayoutAction`, coach/owner-gated + RLS); the client `/client` Today page renders `visibleSections(layout).map(renderSection)`. Owner-only-safe: reached from a **"Client screen"** link on the coach dashboard. Verified on Postgres 16 (RPC returns the client's coach layout, client blocked from reading prefs directly, upsert preserves the dashboard column, idempotent).
- **Per-client screen overrides** (§4 at the individual-client grain; migration `0017_client_screen_overrides`, mirrored `supabase/phase6_client_screen_overrides.sql`): the coach can tailor **one** client's Today screen differently from the roster-wide default. New `client_screen_overrides` table (per `client_id`, RLS: the client's active coach or the owner manages it; the client never reads it directly). The `client_screen_layout()` RPC now **prefers a non-empty per-client override, then falls back to the coach's roster default, then empty** — so an override wins and clearing it (or an empty layout) reverts to the default. `getClientScreenEditState(clientId)` seeds the editor from the override if set, else the client's coach default (with an `overridden` flag). `saveClientScreenOverrideAction` / `resetClientScreenOverrideAction` (both authorized to the client's own coach, owner sees all). Editor `/coach/clients/[id]/screen` (`ClientScreenOverrideEditor` — same move/toggle, plus a "Reset to roster default"); reached from a **"Customize their Today screen"** card on the client deep-dive. Verified on Postgres 16 (override precedence, empty-override fallback, client can't read the table, idempotent).

### Phase 5 — AI assistant ✅ (optional per owner; rule-based path is the shipped default)

> **Owner decision:** AI is **optional** (§11). The **rule-based answer helper** + **automated nudge sweep** handle basic client requests with no API key; anything deeper routes to the owner as a real message. The Claude API pieces are a drop-in upgrade that activate only when `ANTHROPIC_API_KEY` is set. The client-facing "AI assistant" section and coach "Draft with AI" button render **only** when a key is configured — with no key, clients never see an AI affordance.

- **Powered by the Claude API** (`@anthropic-ai/sdk`; `src/lib/ai/*`): server-only `createAiClient` (key never reaches the browser), model = `ANTHROPIC_MODEL` or `claude-opus-5`. Gated on `ANTHROPIC_API_KEY` — everything degrades gracefully to an "ask your coach to enable it" state without it.
- **Grounded + guardrailed** (`context.ts` + `prompts.ts`, pure/tested): every call embeds the client's *real* day (targets, today's totals, what's remaining, water, habits due) and the §11 hard guardrails baked into the system prompt — never medical advice (medical/injury/disordered-eating → steered to coach/professional), never invents nutrition numbers (uses only supplied figures), never changes targets/goal/the coach's plan, warm + never shaming. Safety `stop_reason:"refusal"` → safe fallback reply.
- **Client assistant** (`askAssistantAction`, `/client/assistant`, `Assistant.tsx`): meal ideas, food swaps, and "what should I eat" answers within their targets, grounded in their logged day. Reached from a card on Today. History-aware (last 12 turns).
- **Coach AI draft** (§11 "AI drafts; the coach sends"): `draftCoachMessageAction` writes a short, coach-voiced message from the client's real status; a **Draft with AI** button in the coach's chat composer fills the box for the coach to edit and send — it never sends anything itself. The auto-nudge templates stay as the no-AI fallback.
- **Adaptive habit-recommendation engine** (§5A; `src/lib/habits/recommend.ts`, pure/tested — **no API key needed**): reads the client's real behavior and suggests the **next right habit — one at a time, only after the last one sticks** (`readyForNextHabit`: newest habit ≥10d old and ≥60% consistent, capped at 6 habits, pauses when well-rounded). Goal-weighted category priority; one strong candidate per missing category. `SuggestedHabit` card on `/client/habits`; the client **adopts in one tap** (`adoptSuggestedHabitAction`) and the coach is **notified of every adoption** (can veto from the deep-dive) — §5A satisfied end to end.
- **No-AI answer helper** (`src/lib/help/answer.ts`, pure/tested — **no key, no cost, instant**): a rule-based companion to the coach chat that answers common questions from the client's OWN logged data (calories/protein/carbs/fat left, water, habits due) plus a small how-to FAQ (barcode, photo, streak-freeze, logging), and routes plan changes + anything else to the coach. **Recommends habits and food too:** a "what habit next?" ask surfaces the adaptive engine's next-right habit (or "keep the current ones sticking first"); a "what should I eat?" ask returns concrete meal ideas paired with the client's remaining calories/protein — leading with protein, never inventing their numbers. `AnswerHelper` runs entirely client-side off server-computed context (`buildHelpContext` in `src/lib/help/context.ts`, shared by the Ask page and the launcher); on `/client/assistant` it's always shown, with the AI `Assistant` layered beneath only when a key is set. Every helper session carries a one-tap **"Message your coach →"** link, so anything it can't answer (or any plan change) becomes a real message to the owner (§10). (Separate from the real-time coach↔client chat, which is the human channel.)
- **Always-on helper launcher** (`src/components/help/HelpLauncher.tsx`): a floating **"Ask"** button on **every** client screen (wired in `client/layout.tsx`) opens a bottom-sheet with the answer helper. Loads its context on demand via `getHelpContextAction` (server action, scoped to the signed-in client) — only when opened, refetched each open, so page loads pay nothing. `aria-modal`, Escape-to-close, focus managed, 44px targets, reduced-motion honored.
- **Status:** with the owner's "no AI required" decision, the engagement-sweep nudge stays **rule-based (template) by design** (not a fallback); the AI draft + meal-plan generation remain optional upgrades gated on a key.

### Phase 7 — Weekly reports (§12) ✅ (in-app + scheduled notification)

- **Reports engine** (`src/lib/reports/weekly.ts`, pure/tested, rule-based — no AI required): `clientWeeklyRecap(input)` turns a client's real week (habit consistency, perfect days, food-logging days, current streak, weekly weight change vs. goal) into **wins to celebrate** + **1–3 forgiving things to work on** — always ≥1 of each, capped (4 wins / 3 focus), test-guarded against shaming language (§4 voice). `coachDigest(clients)` summarizes the roster: total, active-this-week, wins to celebrate (streaks + toward-goal weight moves), and a **"needs you Monday"** list ranked by total flag severity with the top flag's reason.
- **Client recap** (`/client/report`): computed live from habits/food/weight (reuses `consistency`, `currentStreak`, `isScheduledOn`, `weightTrend`); wins (success accent) + to-work-on (red accent) + a one-tap "message your coach". Linked from a **"Weekly recap"** card on `/client/you`.
- **Coach digest** (`/coach/report`): maps the roster to the digest (weight kg→lb, habit streak, attention flags); stat tiles + Celebrate + Needs-you-Monday. Linked from a **"Weekly digest"** header link on the dashboard.
- **Scheduled notification** (§12 "in-app + a notification"; migration `0021_weekly_reports` — `engagement_state.last_report_on`, mirrored `supabase/phase7_weekly_reports.sql`): the daily engagement sweep now also fires the weekly recap. `shouldSendWeeklyReport(today, lastReportOn, reportDow=Mon)` (pure/tested) gates it to the report day, at most once per week (≥6-day gap, deduped via `last_report_on`). Each active client gets a **`report`** notification + push → `/client/report`; each coach/owner gets one weekly **digest** notification + push → `/coach/report` (deduped by a recent report-notification lookup, since coaches aren't in `engagement_state`). The notifications link to the live-computed report pages, so no report data is precomputed in the sweep. Sweep report now counts `weeklyRecaps` + `coachDigests`. Runs on the existing daily Vercel Cron — no new schedule.

### Phase 7 — Wearables (§7) 🔨 (connection framework live; live OAuth + data-pull are owner-gated)

- **Connection model** (migration `0020_wearables`, mirrored `supabase/phase7_wearables.sql`): `wearable_connections` (one row per client+provider) holds the OAuth tokens. Tokens are **secrets** — RLS is **client-only** (`client_id = auth.uid()`); coaches/owner never read a client's tokens; the future background sync uses the service role (bypasses RLS). Verified on Postgres 16 (client owns, forge blocked, unrelated read blocked, idempotent).
- **Provider registry** (`src/lib/wearables/providers.ts`, pure/tested): Oura · Fitbit · Whoop (OAuth2) + Garmin (OAuth1.0a, listed but not wired). `providerConfigured(def, env)` is honest — a real **Connect** button appears only for an OAuth2 provider whose `<PREFIX>_CLIENT_ID/SECRET` are set; everything else shows "not available yet" (§7 "be honest in the UI").
- **OAuth flow** (`/api/wearables/[provider]/connect` + `/callback`): standard auth-code handshake with an httpOnly CSRF `state` cookie; the callback exchanges the code and upserts the connection. Defensive throughout — any failure bounces back to `/client/connect?error=…`, never a crash. `disconnectWearableAction` removes the connection + tokens.
- **UI** (`/client/connect`, linked from `/client/you`): lists providers with honest per-provider state (Connected+Disconnect / Connect / not-available), success+error banners, and a clear note that **Apple Health / Apple Watch / phone pedometers can't sync from a web app** → use manual step entry (§7). 
- **Data-pull scaffold** (migration `0022_wearable_daily`, mirrored `supabase/phase7_wearable_daily.sql`): a normalized `wearable_daily` table (one row per client+provider+day: steps/sleep_minutes/resting_hr). RLS: client manages own, coach (`is_coach_of`)+owner read (health data the coach steers); the sync writes under the service role. Verified on Postgres 16 (client owns, coach/owner read, unrelated blocked, idempotent). **Pure parsers** (`src/lib/wearables/parse.ts`, tested): `parseOuraActivity/parseOuraSleep/parseFitbitSteps/parseFitbitSleep` + `mergeMetrics` — defensive (bad shape → [], never throws; Oura sleep seconds→minutes; Fitbit string values coerced). **Sync** (`sync.ts`): `syncConnection` refreshes the OAuth token when expiring, fetches the last ~14 days, upserts daily rows, stamps `last_synced_at`; `syncAllWearables` loops all connected trackers defensively. Wired into the daily engagement cron (best-effort, `wearables` in the response) — a **safe no-op until a tracker is connected**. `/client/connect` shows the latest synced steps/sleep once data lands. Oura & Fitbit steps+sleep are mapped; Whoop/Garmin connect but their pull isn't wired.
- **Owner-gated to finish (can't be verified from the build sandbox):** create developer apps per provider, set `OURA_/FITBIT_/WHOOP_CLIENT_ID` + `_CLIENT_SECRET` in Vercel, register the callback URLs, run `supabase/phase7_wearables.sql` + `supabase/phase7_wearable_daily.sql`, then run a real **connect** + sync verification. **Steps → habit auto-check** (`src/lib/wearables/steps.ts`, pure/tested): `pickStepHabit` finds the client's active steps habit (unit "steps", else a name mentioning steps); `stepCheckoffs` returns the synced days that met the target and aren't already done. `syncConnection` calls `autoCheckSteps` after storing metrics — best-effort, upserts `habit_logs` for the newly-met days (keyed `habit_id,log_date`), never un-ticks or overwrites an existing completion. So a client whose tracker reports a big day gets their steps habit ticked automatically.

### Design — dark theme (§4 house style, inverted)

The whole app runs a **high-contrast dark theme**: black surfaces, near-white lettering (owner request "switch everything from white to black. Any lettering black to white"). Driven entirely from the token layer so components never changed shape — `tailwind.config.ts` colors flipped (`ink` → `#f4f4f2`, `surface` DEFAULT `#17171b` card / muted `#0c0c0d` page, `hairline` `#2c2c31`, `success` `#34c759`, `red.ink` `#ff5b4e`, new `elevated` `#26262c` for former dark-accent blocks), plus `globals.css` (`color-scheme: dark`, `.hairline` border). Former white-on-accent foregrounds became `text-white`; former `bg-ink` accent blocks became `bg-elevated`. Raw-hex leaf visuals (Ring track/stroke, habit heatmap shades, LineChart default, checkbox border, category dots, MacroBar/MicroTracker bars, BrandMark, `global-error`) re-tuned to the dark palette. Re-engagement **email** stays light-on-white (email clients). No gradients, AA contrast, reduced-motion still honored.

**Testing:** 248 Vitest tests (pure logic). Every migration verified on Postgres 16, idempotent (0008/0009/0010 RLS isolation checked end-to-end; 0011 structure verified; **0013 referrals** — self-referral ignored + RLS/authz; **0014 content** — owner-write/all-read + RLS — both checked end-to-end). Migrations are also mirrored as one-file `supabase/phase*.sql` for the owner to paste-run.

**Owner setup done:** Supabase live, migrations 0001–0007 applied, owner = jakekatz8@gmail.com, deployed on Vercel at total-form-fitness.vercel.app.
**Owner action needed:**
1. Run these SQL files once each in Supabase → SQL Editor: `supabase/phase3_coach_prefs.sql` (0008, dashboard layouts), `supabase/phase4_messages.sql` (0009, chat), `supabase/phase4_notifications.sql` (0010, in-app notifications + nudges), `supabase/phase4_engagement.sql` (0011, engagement-sweep state), **`supabase/phase6_referrals.sql` (0013, referrals)**, **`supabase/phase6_content.sql` (0014, CMS copy overrides)**, **`supabase/phase4_quiet_hours.sql` (0015, quiet hours)**, **`supabase/phase6_client_screen.sql` (0016, coach-configurable client Today screen)**, **`supabase/phase6_client_screen_overrides.sql` (0017, per-client Today-screen overrides)**. Until run, those surfaces load but read/write errors (the CMS, referrals, quiet hours, and client-screen layout/overrides degrade gracefully to defaults/empty until then).
2. **Enable the daily automation:** set `CRON_SECRET` (any long random string) in Vercel env — Vercel Cron sends it as a Bearer token so the sweep endpoint is protected. The cron (`/api/cron/engagement`, daily) then auto-nudges slips, alerts the coach after 3 quiet days, and triggers the email ladder. `SUPABASE_SERVICE_ROLE_KEY` must be set server-side (already required).
3. **Enable re-engagement email (3/5/7 days):** create a **Resend** account, verify a sender domain, and set `RESEND_API_KEY` (and optionally `EMAIL_FROM`) in Vercel. Without it, the in-app + push re-engagement touch still fires; only the email is skipped.
4. **Enable PWA push:** run `supabase/phase4_push.sql` (0012), then set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (mailto:) in Vercel. A generated keypair was provided in-session. Clients/coach turn it on from their **You** tab. Without the keys, push is skipped; in-app notifications still work.
5. **Enable the AI assistant (Phase 5):** set `ANTHROPIC_API_KEY` (from console.anthropic.com) in Vercel — optionally `ANTHROPIC_MODEL` (defaults to `claude-opus-5`; set to `claude-sonnet-5` for lower cost). Without it, the client "Ask" screen and the coach "Draft with AI" button show a disabled state; nothing else is affected.
