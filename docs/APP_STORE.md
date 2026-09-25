# Publishing Total Form Fitness to the Apple App Store

The app is a PWA. We wrap it with **PWABuilder** (free, runs in the browser) and
submit through Apple. **Only the very last step needs a Mac** (Xcode "archive &
upload", ~20 min) — everything else you can do from any computer now. Borrow any
Mac for that final step to avoid paying for a cloud-Mac build service.

Live site: https://total-form-fitness.vercel.app

---

## What you need (one-time)

- **Apple Developer Program account** — $99/year. Sign up at
  https://developer.apple.com/programs/ (enrolling as an individual is fine; a
  business/org needs a D-U-N-S number and takes longer).
- Your app icon: the **shield logo as a PNG**, at least **512×512**, square, no
  transparency. PWABuilder generates every required size from this one image.
- ~30–60 minutes for the App Store Connect listing, plus a short wait for Apple
  review (usually 1–3 days).

---

## Step 1 — Confirm the PWA is ready (already done in code)

- ✅ Web manifest at `/manifest.webmanifest` (name, standalone display, colors,
  categories).
- ✅ Service worker at `/sw.js`.
- ✅ iOS web-app meta in `src/app/layout.tsx`.
- ✅ **Privacy Policy** at `/privacy` and **Terms** at `/terms` (Apple requires a
  reachable privacy policy URL — use `https://total-form-fitness.vercel.app/privacy`).

Nothing to do here unless you change the domain.

## Step 2 — Generate the iOS package with PWABuilder (no Mac)

1. Go to **https://www.pwabuilder.com** and enter
   `https://total-form-fitness.vercel.app`, then **Start**.
2. Review the report card (manifest / service worker / security should be green).
3. If prompted, use the **image generator** to upload the shield PNG — it creates
   all icon sizes.
4. Click **Package for stores → iOS → Generate**. Fill in:
   - **Bundle ID**: `com.totalformfitness.app` (any reverse-domain string; must
     match what you create in App Store Connect — write it down).
   - **App name**: Total Form Fitness
   - **URL / scope**: the live site.
5. Download the generated **iOS package** (a zip containing an Xcode project).

## Step 3 — Create the app in App Store Connect (no Mac)

1. At **https://appstoreconnect.apple.com** → **My Apps → +** → **New App**.
2. Platform iOS, name **Total Form Fitness**, primary language English, and pick
   the **Bundle ID** matching Step 2 (create it under
   Certificates, Identifiers & Profiles → Identifiers if it's not listed).
3. Fill the listing:
   - **Description**, keywords, support URL (`/`), **marketing/Privacy Policy URL**
     = `https://total-form-fitness.vercel.app/privacy`.
   - **Screenshots** — required. Easiest: open the site in Chrome, device-emulate
     an iPhone 6.7" (1290×2796), and capture Today, Habits, Food, and the coach
     dashboard. Upload the 6.7" set (Apple can scale others).
   - **App Privacy** questionnaire — declare what we collect: name, email, health
     & fitness data, photos, usage. Mark it **linked to the user's identity** and
     **not used for tracking/ads** (matches our privacy policy).
   - **Age rating** questionnaire (health/fitness → typically 4+ or 12+).

## Step 4 — Build & upload (THIS is the only Mac step, ~20 min)

On any Mac with **Xcode** installed (free from the Mac App Store):

1. Unzip the PWABuilder iOS package and open the `.xcodeproj` / `.xcworkspace`.
2. In **Signing & Capabilities**, select your **Team** (your Apple Developer
   account) — Xcode auto-manages signing.
3. Set the run destination to **Any iOS Device (arm64)**.
4. **Product → Archive**. When it finishes, in the Organizer click
   **Distribute App → App Store Connect → Upload**.
5. Back in App Store Connect, the build appears under the app after a few minutes
   of processing — attach it to the version.

## Step 5 — Submit for review

1. Add **review notes** with a **demo login** (create a test client account and
   paste its email + password). This is the single most important step to avoid
   rejection — reviewers must be able to get past the sign-in wall.
2. Answer the export-compliance question (standard HTTPS → usually "No" to
   proprietary encryption).
3. **Submit for Review.**

---

## Avoiding the common rejection (Guideline 4.2 "just a website")

Apple rejects thin webview wrappers. Ours is a real app — make that obvious to the
reviewer:

- Provide the **demo account** (Step 5) so they can see the full logged-in
  experience, not just a login screen.
- In review notes, list the native-feeling features: **installable habit/nutrition
  tracking, offline shell, push notifications, personal coaching**.
- Keep the app **full-screen standalone** (already set) — no visible browser bar.

Optional hardening if a review pushes back: add **native push notifications**
(APNs) via a Capacitor build instead of the PWABuilder webview. That's a bigger
change — ask and I'll scaffold it.

---

## Costs summary

| Item | Cost |
|------|------|
| Apple Developer Program | $99 / year (required) |
| PWABuilder | Free |
| Xcode | Free (needs a Mac to run) |
| Cloud Mac (only if you have no Mac at all) | ~$0–30 one-off (e.g. Codemagic free tier) |

You said you'll borrow a Mac for Step 4 — so your only real cost is the **$99/yr
Apple account**.
