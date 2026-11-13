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
