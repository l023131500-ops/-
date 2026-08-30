# System 14 — Bsmachot Plus (בשמחות פלוס) — Live Site Scan & Rebuild Spec

**Scanned:** 2026-08-30, by loop A, per owner P0 directive (core.projects.note #33,
2026-08-26): scan and document `https://beshmachot-plus.co.il` end-to-end as the
basis for a future clean rebuild. **This round did NOT modify the live site or
rebuild anything** — documentation only, per the directive.

Login used (owner-supplied): `0533116358A@gmail.com` via the **event-owner**
portal (`/login/event`) — this account is actually a **super-admin**, not a
single event owner (see §3).

## ⚠️ Privacy note on this scan (read before using the artifacts below)

This monorepo is **public** (root `README.md`: "this repo is public and the
source systems are private"). The live admin panel exposes real, current
customer/event-owner PII (full names, phone numbers, emails, addresses) and
partial API-key material. **None of that was committed.** What's committed vs.
local-only:

- **Committed** (`scan/screenshots/`, `scan/*.html`, `scan/*.json`, this file):
  the 12 public marketing pages, the 4 access-hub click-throughs, both login
  screens (pre-fill/post-submit), nav link lists, and the full **Partner API
  doc** (`partner-api-doc.txt`/`.html` — vendor-authored, contains no PII).
- **Local-only, gitignored** (`scan/screenshots/admin-local/`,
  `scan/network-local/`): all 13 admin-panel section screenshots + sub-tab
  screenshots + captured XHR/fetch bodies. These contain real customer names,
  phones, emails, partial API-key suffixes, and a full internal-user directory.
  They still exist on disk at
  `/home/m30/more30/apps/14-bsmachot-plus/scan/{screenshots/admin-local,network-local}/`
  for the owner to inspect directly on this box; they were deliberately kept
  out of git history. This document describes their **structure and fields**
  without reproducing the actual customer data.

No data was created, edited, or deleted anywhere in the live system. No charge
or send action was triggered (billing "charge" buttons in the admin were
photographed in their list view only, never clicked).

---

## 1. Public site (`beshmachot-plus.co.il`, unauthenticated)

12 pages, all screenshotted (`scan/screenshots/pub-*.png`):

| Path | Purpose |
|---|---|
| `/` | Home — hero, "how it works" teaser, "why us" teaser, pricing teaser (₪199/event flat), CTA "פתחו אירוע עכשיו" |
| `/how-it-works` | 3-step explainer (open event page → share with guests → receive gifts directly) |
| `/why-us` | Value props: fixed price, personal onboarding, full transparency, guest-friendly UI |
| `/pricing` | ₪199/event flat fee, "no subscription, no hidden fees" |
| `/faq` | FAQ |
| `/about` | About |
| `/contact` | Contact form + phone `02-3131700` + email `g023131700@gmail.com` + WhatsApp |
| `/access` | **Access hub** — 4 role-based entry cards (§2) |
| `/signup` | New-event signup wizard: pick add-ons (מתנות באשראי ₪199, הזמנות+RSVP ₪199, השכרת עמדה ₪99/מומלץ) → "הפעל" → "המשך לפרטים אישיים" |
| `/accessibility` | Accessibility statement |
| `/terms` | Terms of service |
| `/privacy` | Privacy policy |

## 2. `/access` — role hub (4 cards, `scan/screenshots/access-click-*.png`)

| Card | Hebrew | Routes to |
|---|---|---|
| Want to join | רוצים להצטרף? | `/signup` |
| Want to send a gift | רוצים להעביר מתנה? | `/gift-search` (find an event, send a gift — not explored further this round) |
| Venue owners | בעלי אולמות | `/login/venue` |
| Event owners | בעלי אירועים | `/login/event` |

## 3. Login — two portals, one anomaly worth flagging to the owner

Both `/login/venue` and `/login/event` are plain email+password forms
("your@email.com" / dot-masked password field, "כניסה" submit, "שכחתי סיסמה"
link). Screenshots: `login-{venue,event}-{filled,result}.png`.

Tested with the owner-supplied credentials (`0533116358A@gmail.com` /
`0533116358`) against **both** portals:

- **`/login/venue`** → redirects to `/admin` but renders **"אין הרשאה" (no
  permission)** — same sidebar shell loads behind the error, meaning the
  account authenticates but this specific role-gate rejects it via the venue
  channel.
- **`/login/event`** → redirects to `/admin` and loads the **full dashboard**
  with every admin sidebar item (not just a single event owner's data).

**Open question for the owner:** this account behaves like a **platform
super-admin** logged in through the "event owner" door, not like an individual
event owner. Is `0533116358A` intentionally the platform-admin account, or is
this a role-check bug in the live site (an event-owner login granting
full-tenant admin access)? Either way, a rebuild should treat "platform admin"
and "single event owner self-service" as two distinct roles/screens — the
current site does not appear to expose a distinct **single-event-owner**
self-service view at all (the only working `/login/event` outcome observed was
the admin panel).

## 4. Admin panel (`/admin/*`) — 13 sections

Sidebar (Hebrew → path): דשבורד `/admin` · לקוחות `/admin/customers` · עסקאות
`/admin/transactions` · ארנקים `/admin/wallets` · בעלי אירועים
`/admin/event-owners` · לידים `/admin/leads` · הגדרות `/admin/settings` ·
אולמות ומכשירים `/admin/halls-devices` · דוחות `/admin/reports` · חיוב לקוחות
`/admin/billing` · קופונים `/admin/coupons` · פניות ותקלות `/admin/support` ·
רשימת תפוצה `/admin/newsletter`.

Live counts at scan time: 18 עסקאות (transactions), 23 בעלי אירועים (event
owners/events), 6 אולמות אירועים (venues), 5 לידים (leads), 1 משימה פתוחה
(open task).

### 4.1 Dashboard (`/admin`)
5 KPI tiles (open tasks, transactions, event owners, venues, leads) + "recent
inquiries" table + "recent issues" table (with טופל/מענה actions) + "tasks to
handle today" list.

### 4.2 לקוחות / Customers (`/admin/customers`)
Two tabs: **בעלי אולמות** (venue owners) / **בעלי אירועים** (event owners).
Table columns: name, phone, address, count of halls/devices owned, total
transaction volume. Row actions: view (eye), edit (pencil), delete (trash),
"enter as" (arrow-in icon — impersonation/login-as, not tested).

### 4.3 עסקאות / Transactions (`/admin/transactions`)
Per-event rollup: date, event owner, venue, gift-transaction count, gift total
(₪). Actions: "צפייה בעסקאות" (view a single event's transaction list),
"ייצוא לאקסל" (export to Excel). Paginated (23 events, 2 pages).

### 4.4 ארנקים / Wallets (`/admin/wallets`) — **money-flow / payout module**
Dashboard tiles: שולם לזוגות (paid out to couples, ₪), מתנות שניתנו (total
gifts given, ₪1,446.20 at scan time), **זמין לסחיסה** (available to withdraw),
**הועברו ל-בשמחות פלוס בשותפות פלוס** (transferred to the platform's own
commission wallet — labelled "בשמחות פלוס" in the UI, i.e. wallet-to-wallet to
the platform's own account), עמלות שנגבו (commissions collected). Tabs: **לפי
אירוע** (per-event ledger with a manual "העבר" transfer-out action per row),
**העברות לעמלה** (0 at scan time — log of commission transfers), **משיכות
לבנק** (0 — bank withdrawal log, empty state "עדיין לא בוצעו משיכות לבנק"),
**שותפים** (2 — revenue-share partners). This is the **event-owner payout leg**
referenced in the owner's directive as "wallet-to-wallet transfer at Paymey" —
UI text and structure (per-event wallet balance → commission skim → bank
withdrawal) match a Paymey-style wallet model, though the string "Paymey" was
not found verbatim anywhere in the captured HTML/network traffic; "בשמחות פלוס"
appears to be the display name of the platform's own internal wallet.

### 4.5 בעלי אירועים / Event owners (`/admin/event-owners`)
List of the 23 live events with: date, event owner, venue, phone, total
transaction sum, payment-account status chip (**פעיל** active / **ממתין**
pending, with approve✓/reject✗ icons / dash = not submitted), "copy email"
button, "view" (invoice icon) and "eye" (detail) actions. The pending/approved
status chips here are the visible admin side of the Partner-API KYC onboarding
flow documented in §6.

### 4.6 לידים / Leads (`/admin/leads`)
Two tabs (בעלי אולמות / בעלי אירועים), each a simple table: lead name, phone,
email, venue name, comment count, task count. Edit (pencil) / delete (trash) /
view (eye) row actions, "+" to add a lead manually, filter + free-text search.

### 4.7 הגדרות / Settings (`/admin/settings`) — 4 tabs
- **כלליות (General):** admin email, admin password (masked), platform logo
  upload, "מסמכי חובה" (required documents) config split by בעלי אירועים /
  בעלי אולמות (both empty at scan time).
- **שותפים (Partners) — external Partner-API management:** create/list
  partners, each with name, contact email, active/inactive status, allowed
  `webhook_events` (multi-select from the 5 event types in §6), a
  `Webhook URL` field, and inline docs links to `/docs/partner-api/` and
  `/docs/partner-api-explorer/` (Swagger). Confirms HMAC-SHA256-signed webhook
  delivery is a first-class, already-built feature, not aspirational.
- **API:** a separate list of **named internal API keys** (not partner keys —
  these look like the platform's own integration keys, e.g. for its own
  production frontend, an n8n automation, and a Nedarim-labelled key). Keys
  are UI-masked (only a trailing hex suffix shown); full values were never
  requested or displayed by this scan.
- **משתמשים (Users):** full internal user/account directory — every venue
  owner and event-owner account with role, email, phone. This is effectively
  the union of §4.3/§4.5's contact data in one flat admin-only table.

### 4.8 אולמות ומכשירים / Halls & devices (`/admin/halls-devices`)
Two tabs: **אולמות** (9 venues — name + which event-owner-group/hall-chain it
belongs to, e.g. "ארוע ברגע", "ארמונות חן", "בשמחות פלוס" (house demo venue),
"נדרים פלוס", "שיווק צפון") and **מכשירים** (5 kiosk devices, linked to a venue,
with active/inactive status and a "copy" action — likely copies a
pairing/enrollment code). "אולם חדש" (+) to add a venue.

### 4.9 דוחות / Reports (`/admin/reports`)
4 report tabs (אולמות / לידים / אירועים / **הכנסות** shown by default) with a
date-range filter and CSV export. Revenue tab shows: ממוצע מתנה (avg gift ₪),
הכנסות מחיובים (billing-fee revenue), מתנות שהושלמו (completed gifts, ₪ +
count), סה"כ מתנות (total gifts ₪), plus a monthly revenue bar chart broken
down per numbered deal/contract.

### 4.10 חיוב לקוחות / Customer billing (`/admin/billing`) — **event-owner fee
leg** (separate from §4.4's gift/payout leg)
Two tabs: **חיוב לקוחות** (list of the flat per-event fee, status "לא שולם"
unpaid / "שולם" paid, per-event "חייב לקוח"/"חייב שוב" charge/recharge button)
and **היסטוריית חיובים** (a modal per event owner showing charge history —
plan name e.g. "₪1 - טסט" (a ₪1 **test plan**, confirming a sandbox billing tier
already exists), amount, status, timestamp). The underlying `billing_charges`
table (see §5) stores a `nedarim_transaction_id` per charge — **this confirms
the customer-facing fee (₪199/event) is charged through Nedarim Plus**, per
the owner's directive.

### 4.11 קופונים / Coupons (`/admin/coupons`)
Create-coupon form (code, ₪ discount amount, description, max-uses-per-user)
+ list (8 live coupons at scan time) with usage counts (e.g. "3/24") and
active/delete actions. No PII here — safe fields only.

### 4.12 פניות ותקלות / Support (`/admin/support`)
Two tabs: **פניות** (inquiries) and **תקלות** (issues/tickets), each: contact
name, email, phone, subject, view action; issues additionally have
close/respond (סגור/מענה) buttons.

### 4.13 רשימת תפוצה / Newsletter (`/admin/newsletter`)
Simple signup list (name, email, signup timestamp) + CSV export. 1 row at scan
time.

## 5. Database surface (observed via captured PostgREST calls)

The admin frontend talks **directly to Supabase's PostgREST** (not only
through the Partner API in §6). Project ref observed:
**`xadihaigjkbvphzphxxk`** (`https://xadihaigjkbvphzphxxk.supabase.co`) — this
is a **different project** from every ref already catalogued in this
monorepo's `CONNECTIONS.md`; it is not currently listed there and is not one
of this monorepo's numbered apps' known Supabase projects. Tables observed
being queried from `/rest/v1/…`: `api_keys`, `billing_charges`, `coupons`,
`devices`, `events`, `guests`, `halls`, `leads`, `newsletter_subscribers`,
`partners`, `payouts`, `platform_commission_transfers`, `profiles`,
`required_documents`, `support_tickets`, `system_settings`, `tasks`,
`transactions`, `user_roles`, `venues`. (Raw request/response bodies with real
data are in the gitignored `network-local/` — not reproduced here.)

## 6. Partner API — fully documented by the vendor at `/docs/partner-api/`

The live site publishes its **own complete API reference** in-app
(`https://beshmachot-plus.co.il/docs/partner-api/`, downloadable as `.md`, plus
an interactive Swagger explorer at `/docs/partner-api-explorer/`). Captured
verbatim to `scan/partner-api-doc.{txt,html}` (no PII — safe, committed).
Summary:

- **Base URL:** `https://xadihaigjkbvphzphxxk.supabase.co/functions/v1/public-api`
  (single endpoint, action selected via `?action=` query param, JSON body).
- **Auth:** `x-api-key` header, per-partner, all reads/writes auto-scoped to
  that partner's own data (cross-partner access → 403/404).
- **Actions:** user mgmt (`CreateEventOwner`, `CreateVenueOwner`,
  `ListProfiles`, `GetProfile`, `UpdateProfile`, `ListUsers`), event mgmt
  (`CreateEvent`, `GetEvent`, `ListEvents`, `UpdateEvent`, `GetEventStats`),
  guests/RSVP (`AddGuest`, `BulkAddGuests`, `ListGuests`, `UpdateGuest`,
  `UpdateRSVP`, `BulkUpdateRSVP`, `DeleteGuest`), payments
  (`GetTransactions`, `GetTransaction`, `CreateTransaction`), venues/devices
  (`CreateVenue`, `UpdateVenue`, `CreateDevice`, `IdentifyDevice`), plus
  standard CRUD for leads/tickets/invoices/documents/notes/tasks/settings.
- **Payment-account (KYC) onboarding**, §5 of the vendor doc — this is the
  full flow behind the "פעיל/ממתין" status chips seen in §4.5: create
  event-owner → create event → upload 2 KYC docs (ID + bank-account proof,
  base64) → `SubmitPaymentAccount` (personal + bank + business-registration
  fields, Israeli bank-code table included) → status `pending_review` →
  **manual review by Bsmachot Plus staff (up to 24 business hours)** → webhook
  `payment-account-approved`. A `sandbox` partner flag exists that skips KYC
  entirely for testing, plus a `GIFTKAL-TEST` coupon that simulates a full
  payment — **this is the sanctioned test-mode path** for anyone integrating
  or rebuilding against this system.
- **Webhooks:** `payment-account-approved`, `sale-paid`, `sale-failure`,
  `refund`, `withdrawal-complete` — HMAC-SHA256 signed
  (`X-Giftkal-Signature` header — note the internal codename **"Giftkal"**
  appears in the signature header name, the webhook secret env-var name
  example, and the example webhook path `/api/webhooks/giftkal`, suggesting
  that's the product's internal/engineering codename regardless of the
  public "Bsmachot Plus" branding).

## 7. Billing flows — confirmed, matching the owner's directive

1. **Customers (event owners) pay Bsmachot Plus** for the event package
   (₪199 flat, or a ₪1 test plan) via **Nedarim Plus** — confirmed by the
   `billing_charges.nedarim_transaction_id` field and the `/admin/billing`
   charge/recharge UI (§4.10).
2. **Bsmachot Plus pays event owners** their collected gift money via an
   internal **wallet system** (§4.4: `payouts` /
   `platform_commission_transfers` tables, "לפי אירוע" per-event wallet →
   manual "העבר" transfer → commission skim → bank withdrawal). UI/structure
   matches a Paymey-style wallet-to-wallet model; the literal string "Paymey"
   was not observed in any captured page/response this round — worth a direct
   confirmation from the owner or from the (masked) API-key list in §4.7.

## 8. Open questions for the owner

1. Is `0533116358A@gmail.com` meant to be the platform super-admin, and is it
   expected that it grants full admin access via the **event-owner** login
   door specifically (while the **venue** login door rejects the same
   credentials with "אין הרשאה")? See §3.
2. Is "Paymey" definitely the wallet-payout rail, or is that inferred? The
   admin UI never names a payout processor explicitly in what this scan
   reached (§4.4, §6).
3. Is "Giftkal" the product's internal/engineering codename (seen in webhook
   header/secret naming, §6)? Relevant if the rebuild should keep or drop that
   naming.
4. No dedicated **single event-owner self-service** screen was found separate
   from the full admin panel — does one exist at a URL this scan didn't reach,
   or does every `/login/event` account currently land in the same
   full-admin view regardless of role?
5. The `xadihaigjkbvphzphxxk` Supabase project (§5) is not in this monorepo's
   `CONNECTIONS.md` — should it be added as System 14's project ref once a
   rebuild is scoped?

## 9. What's required to run/rebuild a system like this

- Supabase project (Postgres + Auth + Edge Functions for the Partner API) with
  the ~19 tables in §5, RLS scoped per role (venue owner / event owner /
  partner / platform admin).
- Nedarim Plus merchant credentials for the customer-fee billing leg (§7.1).
- A wallet/payout rail (Paymey per the owner's directive, unconfirmed in-product)
  for the event-owner gift-money leg (§7.2), including commission-skim and
  bank-withdrawal logic.
- KYC document storage + a manual-review queue (§6) for approving event
  owners' payment accounts before they can receive gift payments.
- A kiosk/device pairing mechanism (`IdentifyDevice`, halls/devices tables,
  §4.8) for the in-venue touch-screen gift stations.
- HMAC-signed outbound webhook infra for partner integrations (§6), with a
  delivery/retry log (vendor doc: "no automatic retries yet, admin can
  re-send failed deliveries").

## 10. Screenshot/artifact index

Committed (`scan/`): `screenshots/pub-*.png` (12), `screenshots/access-click-*.png`
(4), `screenshots/login-{venue,event}-{filled,result}.png` (4),
`screenshots/partner-api-doc.png`, `screenshots/partner-api-explorer.png`,
`partner-api-doc.{txt,html}`, `partner-api-explorer.html`, `public-pages.json`,
`recon.json`, `admin-nav-links.json`, `login-attempts.json`, `00-home.html`,
`access-click-{0..3}.html`.

Local-only, gitignored, PII (`scan/screenshots/admin-local/`,
`scan/network-local/`): 13 admin section screenshots + ~15 sub-tab screenshots
+ `admin-sections.json` + 5 network-capture `.jsonl` files (all XHR/fetch
bodies from the logged-in crawl).
