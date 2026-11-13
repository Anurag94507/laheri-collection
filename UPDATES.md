# Laheri Collection — Update Log

## 1. Branding & logo
- New original logo: `client/public/logo.svg` — gold "LC" monogram in a navy roundel with double gold rings.
- Used in the navbar, storefront footer, admin sidebar, admin login and as the favicon (`client/public/favicon.svg`).
- Removed every remaining "Raja Menswear" string (UI copy, `<title>`, meta description, chatbot persona, cookie/storage keys, health-check name). Store address/city now read Sultanpur throughout.

## 2. Real product photography
- Downloaded 13 real menswear photos into `client/public/images/photos/` (`cloth-1.jpg` … `cloth-16.jpg`, three unsuitable frames removed).
- Every product maps to a garment photo via `PHOTO_BY_SLUG` in `server/src/seed.js`; Dhoti keeps its generated SVG because no matching photo was available.
- Category tiles on the home page now use photos too.
- Photos are served locally — the storefront still works fully offline.

## 3. Search & category filtering
- `Collections` page: category chips in the hero (instant filter), plus the existing search, size, fabric, colour, price and sort filters.
- Category names now come from the admin-managed `categories` collection.

## 4. Customer accounts (OTP login)
- New `server/src/routes/account.js`, mounted at `/api/account`.
- Login with **mobile OTP via WhatsApp or SMS**, or **email OTP**; optional **email + password** login.
- Forgot password: `purpose: "reset"` OTP → set a new password.
- 6-digit codes: 5-minute expiry, 5 attempts, 30-second resend cooldown.
- Delivery uses Twilio / MSG91 / SMTP when configured. Without credentials the send is simulated and the code is returned as `devCode` (development only) and shown on screen.
- Customer JWT lives in an httpOnly cookie (`laheri_customer`, 30 days) separate from the shopkeeper cookie.
- `client/src/pages/AccountLogin.jsx` — OTP tab, password tab, forgot-password flow, resend, demo-code hint.
- `client/src/pages/MyAccount.jsx` — **My bag**, **My orders** (+ in-store bills), **Profile** (name/email, set password, sign out).

## 5. Bag & order access control
- Browsing, product pages, offers, spin wheel, puzzle, quiz and chatbot stay **public**.
- `/cart`, `/checkout` and `/account` require a customer login (`RequireCustomer`); they redirect to `/login` and return afterwards.
- The bag is saved against the account (`bags` collection, `GET/PUT /api/account/bag`) and auto-synced 800 ms after any cart change.
- Orders are linked to the account at checkout (`accountId`) and also matched by mobile/email, so "My orders" shows both new and historical purchases.
- Checkout prefills name/mobile/email from the signed-in account.

## 6. Admin console
| Area | Change |
| --- | --- |
| Offline billing | Fully implemented (`Billing.jsx`): multi-line bill, size, qty, price, extra discount, GST, payment mode, CRM capture, WhatsApp receipt, searchable bill history. Bills persist as `billType: "offline"`. |
| Products | Fully implemented (`AdminProducts.jsx`): add/edit/delete, price, offer price, stock, sizes, colours, fabric, images, featured/new flags. |
| Categories | New page + API: create, rename (products are re-tagged), image, blurb, show/hide, delete (blocked while products use it). |
| Customers / CRM | New `Customers.jsx`: segment filters, search, CSV export, plus **Saved bags** and **Logins** tabs aggregating every customer account (orders, spend, bag items, login type). |
| Chatbot chats | New `ChatLogs.jsx` at `/admin/chat-logs`: message + reply, session, source, search and pagination. |
| Bulk messaging | Rebuilt as **WhatsApp-only**: audience picker, merge tags, live preview, send, and a **one-click "WhatsApp to all"** that prepares a `wa.me` chat for every customer and logs the campaign. |
| Games & offers | New controls: enable/disable spin, puzzle and quiz; set puzzle/quiz discount %, coupon validity hours and spin cooldown. Server reads these live when issuing coupons. |

New APIs: `/api/categories` (public + admin), `/api/chatbot/logs`, `/api/admin/bags`, `/api/admin/accounts`, `/api/bulk/send-all`, `/api/games/config`.

## 7. Seed data
- Seeds `categories` (6), `accounts` (18 — one per customer), `bags` (1 demo), `otps`.
- Demo customer login: mobile `9876501234` or `aditya.sharma@example.com`, password `laheri123` (OTP works for any seeded mobile).
- Orders are linked to their account.

## 8. Verified
- `node --check` on all changed/new server files.
- `GET /api/settings`, `/api/categories`, `/api/account/request-otp|verify-otp|me|orders|bag`, `/api/account/login-password`, `/api/account/reset-password`.
- Admin: login, stats, bags, accounts, chat logs, game config, bulk preview, bill create/list, category create, product create, WhatsApp send-all (18 links).
- `npm --prefix client run build` succeeds (499 modules).

## Notes / limits
- WhatsApp/SMS/email are simulated until Twilio / MSG91 / SMTP credentials are set in `server/.env`.
- Login codes are shown on screen only while `NODE_ENV !== "production"`.

## 9. Deployment (Freebuff Sites / Cloudflare Workers)
- Express backend ported to a single Cloudflare Worker: `worker/index.js` (+ `worker/seed-data.js`).
- Storage: D1 database bound as `DB`, one generic `docs(collection, id, json)` table; data auto-seeds on first request.
- Static build served by `env.ASSETS` with SPA fallback; `deploy.json` is the Worker deploy manifest (`client/dist` assets).
- Live: https://site-e164a0910a5e41729cd089cf6b464256.freebuff.page
- Source: https://github.com/Anurag94507/laheri-collection
- Verified live: home page + assets, `/api/health`, settings, products (22), categories (6),
  OTP request/verify + session, bag save, order placement (`ORD-2026-1604`), spin coupon, chatbot,
  admin login/stats/bags/accounts/chat logs/game config/bulk preview/bill create.
- OTP delivery is still simulated: the Worker returns `devCode` so the code is shown on screen.
  Set a Worker variable `HIDE_OTP=true` (plus real Twilio/MSG91/SMTP keys) once a sender is wired.

## 10. Installable app (PWA) — storefront + shopkeeper console
- `client/public/manifest.webmanifest`: standalone app named "Laheri Collection", navy theme, app shortcuts
  (Shop, Bag, Track order, Shopkeeper console), 3 icons. Orientation left unlocked so the admin console works in landscape.
- Icons generated from code with no image dependencies: `node scripts/make-icons.cjs` writes
  `icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (navy field, gold ring + "L" monogram).
- `client/public/sw.js` service worker: precaches the app shell, network-first navigations with a cached shell offline,
  cache-first for same-origin assets, and never caches `/api/*` so stock, orders and bills stay live. Registered in
  `client/src/main.jsx` for production builds only.
- `client/src/components/InstallApp.jsx`: real `beforeinstallprompt` install button (captured early in `index.html` so it
  is never missed), iOS Share -> Add to Home Screen instructions, hidden once installed or dismissed.
  Shown in the navbar (desktop icon + mobile menu row) and in the shopkeeper sidebar.
- iOS meta tags + `apple-touch-icon` added to `client/index.html`.
- Verified live: manifest serves as `application/manifest+json`, service worker as `text/javascript` and controls the
  page, all 4 icons 200, shell cache filled; install button renders and invokes the prompt.
- Not covered: a native APK (this is an installable web app), and offline verification was done by cache inspection
  rather than a real network-off test.

## 11. PWA review, cache fixes, and production launch
Simplified after a second pass:
- One install control instead of three variants: `<InstallApp label />`, styling passed via `className`.
- Dropped the dismissed-hint localStorage flag, the unused SW `message` listener, the duplicate `/` precache entry,
  and unused manifest fields (`display_override`, `dir`, `lang`, `categories`, per-shortcut icons, `prefer_related_applications`).
- Removed the needless `nodejs_compat` flag from the deploy manifest (the Worker uses only Web Crypto/text encoders).

Stale-cache fixes:
- Precache now uses `cache: 'reload'` so a fresh install never picks up HTML from the HTTP cache.
- `/assets/*` is treated as immutable (hashed by the build); everything else is stale-while-revalidate, so a replaced
  logo or product photo shows on the next view instead of staying stale under the same URL.
- `/api` (exact) as well as `/api/*` bypasses the worker; sign-in, stock, orders and bills are never served from cache.
- The worker is registered with `updateViaCache: 'none'` and explicitly checked for updates; a new deploy reloads the
  page once on `controllerchange` (guarded so the first install does not reload), so old and new bundles never mix.
- Precaching each shell file independently means one failed fetch cannot leave the shell empty.

Production environment:
- Own D1 database bound as `DB` (separate from preview), fresh seed on first request.
- Live: https://site-ac9250f405614c4fb38fb9ad6a70c64a.freebuff.page (published).
- Verified there: health, 22 seeded products, OTP sign-in + session, order `ORD-2026-1269` (₹10,498.95),
  admin login with stats reflecting the order, manifest/service-worker/icons served with correct types,
  service worker active and controlling the page, shell + static caches populated, install button wired.

## 12. OTP no longer public, admin password replaced
- `POST /api/account/request-otp` never returns the code from a deployed build. Only a local Worker with
  `OTP_DEBUG=true` echoes it back. The response no longer even has a `devCode` key.
- Codes are delivered out of band: staff open **Dashboard → Login codes** (`GET /api/admin/otp-codes`, admin only)
  and send the code to the customer on WhatsApp. Only unused, unexpired codes are listed, newest first.
- The admin login no longer has a built-in `admin` / `shop12345` fallback. It now fails closed (503) unless
  `ADMIN_PASSWORD` (12+ characters) is configured; username stays configurable via `ADMIN_USERNAME` (default `admin`).
- Demo-credential card removed from the admin login page; the deployed bundle contains no hardcoded password.
- `ADMIN_PASSWORD` set as a Worker secret on production and preview; the generated value is kept locally in
  `.secrets/admin-password.txt` (gitignored) and can be rotated in Sites → Secrets.
- Verified on production: old password 401, wrong username 401, new password 200; OTP response has no code;
  `/api/admin/otp-codes` 401 without a session and returns the pending code to the admin; that code signs the
  customer in; order placed. Preview re-checked with the same results.

## 13. Real OTP delivery, auto-hidden relay panel, admin login throttle
- `worker/notify.js` adds direct delivery adapters, selected by which secrets exist:
  `MSG91_AUTH_KEY` + `MSG91_TEMPLATE_ID` (SMS, India), `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` +
  `TWILIO_FROM` (SMS) and/or `TWILIO_WHATSAPP_FROM` (WhatsApp), `RESEND_API_KEY` + `MAIL_FROM` (email).
  Each request has an 8s timeout and provider errors are surfaced without leaking secrets.
- MSG91 answers HTTP 200 even when it refuses a send, so the response body is checked, not just the status.
- `request-otp` now reports honestly: `senderConfigured` and `delivered`. With no sender it says the code is ready
  and the customer messages the shop on WhatsApp; a provider failure returns 502 instead of a silent "sent".
- `GET /api/admin/otp-codes` returns `senderConfigured: true` and an empty list once any sender is configured,
  and the Dashboard "Login codes" panel hides itself on that flag.
- Admin login is throttled per client IP in D1 (`loginAttempts`): 5 wrong passwords in a 10 minute window returns
  429 with `Retry-After` for the rest of the window; a successful login clears the counter.
- Verified: adapter URL/body/auth assertions and error paths via `scripts/verify-notify.mjs`; production still in
  relay mode (`senderConfigured:false`, `delivered:false`, no code leaked, relay sign-in works); preview locked out
  after the 5th wrong password (6th → 429, `Retry-After: 597`, correct password also 429 while locked) while
  production admin login stayed 200 — the counters live in each environment's own database.
- Not yet exercised live: delivery to a real phone/email, and the panel hiding, both need provider keys in
  Sites → Secrets. Preview admin login from this machine stays locked until the 10 minute window expires.
