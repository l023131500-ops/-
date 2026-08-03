# מאגר בקלות — Internal Bkalut Database

Hebrew RTL internal web app for the בקלות team to search rights/benefits and
nonprofit/organization data sourced from `bklot_rights_master_current.xlsx`.

## What it does

- Loads the workbook once on server startup into memory (no DB, no mutation).
- Serves two clearly separated datasets:
  - **זכויות לפי חוק** (369 rows from sheet "מאגר לפי נושאים")
  - **עמותות וארגוני סיוע** (56 rows from sheet "עמותות וארגונים")
- Dashboard with 4 KPI counts (rights, orgs, categories, sensitive/internal-only).
- Full-text search + filters: category, sub-category, treating body, Haredi suitability.
- Detail pages with all long-form fields, including podcast / voice / email scripts.
- Quick copy buttons for client email, voice message, and public-site text.
- RTL throughout, Heebo font, warm/professional palette.
- No localStorage/sessionStorage/cookies — pure React state + API.

## Stack

Express + Vite + React + Tailwind + shadcn/ui · `xlsx` package for parsing.

## How to run

```bash
cd /home/user/workspace/bklot-app

# Dev
npm install
npm run dev                    # http://localhost:5000

# Production
npm run build                  # produces dist/index.cjs + dist/public + dist/data
NODE_ENV=production node dist/index.cjs
```

The build step copies `server/data/bklot.xlsx` into `dist/data/bklot.xlsx`
so the bundled server can locate it.

## Deployment (main agent)

```python
deploy_website(
  project_path="/home/user/workspace/bklot-app/dist/public",
  site_name="bklot-internal",
  entry_point="index.html",
)
```

The Express backend must be running on port 5000 at deploy time so the
`__PORT_5000__` proxy can reach `/api/*` routes. Start with:

```python
start_server(
  command="NODE_ENV=production node dist/index.cjs",
  project_path="/home/user/workspace/bklot-app",
  port=5000,
)
```

## Key files

| Path                                        | Role                                                   |
| ------------------------------------------- | ------------------------------------------------------ |
| `server/data/bklot.xlsx`                    | Source workbook (copied into `dist/data/` on build).   |
| `server/data-loader.ts`                     | Parses xlsx into typed rows + meta on startup.         |
| `server/routes.ts`                          | `/api/meta`, `/api/rights`, `/api/rights/:id`, `/api/orgs`, `/api/orgs/:id`. |
| `shared/schema.ts`                          | `RightRow`, `OrgRow`, `MetaResponse` types.            |
| `client/src/App.tsx`                        | Hash-based router.                                     |
| `client/src/components/shell.tsx`           | Top nav, logo, RTL layout shell.                       |
| `client/src/components/logo.tsx`            | Inline SVG בקלות logo (ב letter + gold dot).           |
| `client/src/pages/dashboard.tsx`            | KPI overview + quick actions + top categories.         |
| `client/src/pages/rights.tsx`               | Search + 4 filters + result cards.                     |
| `client/src/pages/right-detail.tsx`         | Full record + scripts + JSON questionnaires + copy.    |
| `client/src/pages/orgs.tsx`                 | Org search with 3 filters.                             |
| `client/src/pages/org-detail.tsx`           | Org detail + disclaimer banner + phone copy.           |
| `client/src/index.css`                      | Custom warm/teal Bkalut palette.                       |

## Caveats

1. `data.db` is created by the template's Drizzle SQLite default but is unused
   by this app (kept only for template compatibility — schema.ts still defines
   a `users` table but nothing reads/writes it).
2. The clipboard API requires HTTPS or `localhost`; copy buttons silently fail
   in non-secure contexts (toast still shows).
3. The xlsx file is loaded once into memory at startup (~370 + 56 rows, fast).
   To pick up edits to the workbook, restart the server.
4. The `pricing/sensitive` count includes both rights and orgs flagged with
   "רגיש" in the haredi suitability column.
5. xlsx import uses `import XLSX from "xlsx"` (default), not namespace import —
   tsx/Node ESM interop wants the default for CJS modules.

## Data testing checklist (verified)

- [x] `npm run build` succeeds
- [x] Dev server boots, loads 369 rights + 56 orgs + 65 categories
- [x] `/api/meta`, `/api/rights/1`, `/api/orgs/1` return expected payloads
- [x] Dashboard KPIs render correct counts (369 / 56 / 65 / 140)
- [x] Rights search "לידה" filters to 62 results
- [x] Category select narrows results (52 for "ביטוח לאומי")
- [x] Detail page renders gold tip, cost, audience, eligibility, scripts, JSON
- [x] RTL layout correct at 1280×900 and 390×844 (mobile)
- [x] Mobile hamburger menu opens
- [x] Production `node dist/index.cjs` serves `/`, `/assets/*`, `/api/*`

---

## Persistent storage (Supabase or SQLite)

The server transparently picks a backend at boot:

| Condition | Backend used |
|-----------|--------------|
| `SUPABASE_URL` + (`SUPABASE_SERVICE_ROLE_KEY` ‖ `SUPABASE_ANON_KEY` ‖ `SUPABASE_PUBLISHABLE_KEY`) | **Supabase Postgres** (recommended for shared / multi-instance deployment) |
| Otherwise | Local SQLite at `data.db` (single-process fallback) |

The boot log prints the choice, e.g.
```
[storage] Using Supabase backend at https://bieebmnmkffwbqlsfozh.supabase.co
[storage] SUPABASE_URL / key not set — using SQLite at data.db
```

Both backends implement the same `IStorage` interface in
`server/storage-types.ts`. All REST endpoints in `server/routes.ts` work
identically against either backend — no frontend changes are needed when
switching.

### Applying the Supabase schema

1. Open the Supabase project — `https://supabase.com/dashboard/project/bieebmnmkffwbqlsfozh`.
2. SQL editor → New query → paste the contents of
   `deliverables/supabase_bkalut_schema.sql` → Run.
3. Verify in **Table editor** that the full schema is in place. The migration
   covers the core 7 tables (`users`, `clients`, `service_submissions`,
   `app_users`, `delivery_queue`, `automation_configs`, `admin_sessions`) plus
   all the newer feature tables — `user_sessions`, `premium_requests`,
   `webhook_log`, `legal_acceptances`, `inbound_leads`, and the full financial
   suite (`fin_clients`, `fin_categories`, `fin_budgets`, `fin_transactions`,
   `fin_recurring`, `fin_opportunities`, `fin_leads`, `fin_tips`, `fin_debts`,
   `fin_goals`, `fin_alerts`, `fin_plans`, `fin_notes`). A
   `service_submission_rows` view is also created for the admin submissions
   screen. The script is idempotent; re-running it on a migrated project will
   not destroy data.
4. Copy `.env.example` to `.env`, set `SUPABASE_URL` and a key, then run
   `npm run build && node dist/index.cjs`.

### Admin login

Credentials are env-driven (see `.env.example`). Defaults:

| Env var | Default | Notes |
|---------|---------|-------|
| `BKALUT_ADMIN_EMAIL` | `l023131500@gmail.com` | Identity for login |
| `BKALUT_ADMIN_PHONE` | `023131500` | Optional secondary identity |
| `BKALUT_ADMIN_PASSWORD` | `eueu1234` | Preview-only plaintext |
| `BKALUT_ADMIN_PASSWORD_SHA256` | _(empty)_ | **Production**: hex SHA-256 digest; overrides plaintext |

Generate the production hash with:
```bash
node -e "console.log(require('crypto').createHash('sha256').update('YOUR_PASSWORD').digest('hex'))"
```

### Production hardening checklist

1. Set `BKALUT_ADMIN_PASSWORD_SHA256` (not the plaintext) in your hosting provider.
2. Use the **service-role** Supabase key on the server, NOT the publishable / anon
   key. Service-role bypasses RLS and is never exposed to the browser.
3. Restrict the publishable key to read-only routes if you ever expose it client-side.
4. Front the app with TLS — admin tokens travel in `Authorization: Bearer …`.
5. Add a real OTP / MFA layer in `server/auth.ts` before opening the admin UI to
   additional staff. The current implementation supports session creation
   (`storage.createAdminSession`) so you can extend it without schema changes.

### Smoke tests (manual)

After applying the migration and starting the server with Supabase env vars:

```bash
# Successful login (returns a bearer token)
curl -s -X POST http://localhost:5000/api/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"identity":"l023131500@gmail.com","password":"eueu1234"}'

# Failed login (wrong password)
curl -s -X POST http://localhost:5000/api/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"identity":"l023131500@gmail.com","password":"wrong"}'

# Protected endpoint with the bearer token
curl -s http://localhost:5000/api/admin/me \
  -H "Authorization: Bearer $TOKEN"
```

### Inbound webhook for external sites (`POST /api/inbound/leads`)

External marketing sites (rights or financial) can push leads into the system
through this single public endpoint. Each lead is persisted in `inbound_leads`,
also written to the `clients` table when it's a rights lead, and fanned out to
the configured n8n endpoint (NEDARIM3873 by default) via the unified webhook
bus — so the entry shows up in **יומן וובהוקים** with full delivery status.

**Endpoint:** `POST /api/inbound/leads`

**Auth header (recommended in production):**

```
x-bkalut-secret: <value of INBOUND_WEBHOOK_SECRET>
```

If `INBOUND_WEBHOOK_SECRET` is unset, the endpoint accepts requests but tags
them as `unauthenticated` — only safe for local/dev. In production, set the env
var and the matching header on every caller.

**Example curl (rights lead):**

```bash
curl -X POST https://your-server.example.com/api/inbound/leads \
  -H "Content-Type: application/json" \
  -H "x-bkalut-secret: $INBOUND_WEBHOOK_SECRET" \
  -d '{
    "sourceSite": "bkalut-marketing.example",
    "sourcePage": "/rights/maternity",
    "origin": "https://bkalut-marketing.example",
    "leadKind": "rights",
    "category": "ביטוח לאומי",
    "topic": "דמי לידה",
    "requestType": "treatment",
    "selectedPath": "טיפול בפועל במשימה",
    "potentialScore": 78,
    "potentialLevel": "פוטנציאל גבוה",
    "contact": {
      "fullName": "שרה כהן",
      "phone": "0501234567",
      "email": "sara@example.com",
      "idNumber": "123456789"
    },
    "answers": { "isEmployed": true, "monthsWorked": 12 },
    "documents": ["id_copy", "salary_slips"],
    "notes": "מעדיפה שיחה חוזרת בבוקר",
    "legalAccepted": { "terms": "1.0", "privacy": "1.0" },
    "utm": { "source": "google", "medium": "cpc", "campaign": "maternity-2025" },
    "referrer": "https://www.google.com/",
    "externalId": "ext-form-9981"
  }'
```

**Example curl (financial lead):**

```bash
curl -X POST https://your-server.example.com/api/inbound/leads \
  -H "Content-Type: application/json" \
  -H "x-bkalut-secret: $INBOUND_WEBHOOK_SECRET" \
  -d '{
    "leadKind": "financial",
    "sourceSite": "fin-marketing.example",
    "sourcePage": "/contact",
    "topic": "ניהול תקציב משפחתי",
    "requestType": "consultation",
    "contact": { "fullName": "אבי לוי", "phone": "0529876543", "email": "avi@example.com" },
    "notes": "5 ילדים, רוצה תוכנית מסודרת"
  }'
```

**Response (200 OK):**

```json
{
  "ok": true,
  "leadId": 42,
  "submissionId": 42,
  "status": "delivered",
  "authStatus": "authenticated",
  "webhook": {
    "ok": true,
    "status": 200,
    "endpointUrl": "https://n8n.l023131500.work/webhook/NEDARIM3873",
    "logId": 17
  },
  "crm": { "kind": "client", "id": 28 }
}
```

| Field | Meaning |
|-------|---------|
| `leadId` / `submissionId` | id in the `inbound_leads` table |
| `status` | `delivered` if NEDARIM3873 returned 2xx, `stored` if persisted but fan-out failed |
| `authStatus` | `authenticated` \| `unauthenticated` \| `rejected` |
| `webhook.logId` | id in `webhook_log` — view via **יומן וובהוקים** |
| `crm` | derived CRM row (e.g. `clients` for a rights lead) |

**Configuring another site to send leads:**

1. Set the same `INBOUND_WEBHOOK_SECRET` value on the originating site (env var
   or backend secret store).
2. POST JSON to `https://<your-server>/api/inbound/leads` with the header
   `x-bkalut-secret: <secret>` and `Content-Type: application/json`.
3. At minimum include `contact.fullName` + (`contact.phone` or `contact.email`)
   and `leadKind` (`rights` or `financial`). All other fields are optional but
   improve downstream automation.
4. Verify the delivery in the admin UI: **יומן וובהוקים** → look for
   `inbound_rights_lead` / `inbound_financial_lead`.

The endpoint accepts a few aliases for convenience (e.g. `body.fullName`,
`body.phone`, `body.email` at the top level if you don't want to nest under
`contact`). UTM fields can be nested (`utm: { source, medium, campaign }`) or
flat (`utmSource`, etc.).

### Admin DB status check (`/#/db-status`)

The admin sidebar exposes a **סטטוס מסד** page that shows:

- Which backend is active right now (SQLite vs Supabase) and the configured key kind.
- Probe results for every expected table (including all the new ones — `app_users`,
  `premium_requests`, `webhook_log`, `inbound_leads`, fin_*, legal_acceptances, …).
- Warnings about missing env vars (`SUPABASE_URL`, `INBOUND_WEBHOOK_SECRET`,
  `BKALUT_ADMIN_PASSWORD_SHA256`).
- Direct pointer to `deliverables/supabase_bkalut_schema.sql` when running on SQLite.

The same data is available programmatically at `GET /api/admin/db-status`
(requires admin bearer token).

### GitHub / Supabase connection notes

- Source archive: `client/public/exports/bklot-app-source.zip`. Push to a GitHub
  repo; the Supabase connector in the admin UI (`/#/automations`) holds the
  project ref `bieebmnmkffwbqlsfozh` so other tools can discover it.
- Migrations are kept in `deliverables/supabase_bkalut_schema.sql`. Add new
  files under `deliverables/` and apply them via the Supabase SQL editor or
  `supabase db push` once the CLI is configured.

## השוואת מחירים — Live price-comparison site

A self-contained price-comparison module lives under `server/price-comparison.ts`
(query layer), `/api/pc/*` (routes) and the `pc_*` SQLite tables. All consumer
search and automation reads come from **our own SQLite mirror** — the site never
calls a chain feed live. Data is mirrored daily from Supabase by
`script/pc-mirror-to-sqlite.ts`.

### Barcode is the cross-chain matching key

Products are matched across chains by **barcode**; name/brand/unit are
supplementary. Two consumer surfaces:

- **Search** (`/#/price-comparison`) — search by name or barcode. Each result
  shows the number of distinct chains carrying the product, the cheapest price +
  chain, and the price spread %. Filters: category, minimum number of chains, and
  chain track (regulatory vs voluntary). Backed by `GET /api/pc/public/catalog`.
- **Comparison** (`/#/compare/:barcode`) — every chain carrying that barcode,
  sorted cheapest→dearest with the cheapest highlighted, spread %, a price-history
  sparkline, and a **regulatory vs voluntary** split. Backed by
  `GET /api/pc/public/compare/:barcode`.

### Regulatory vs voluntary chains

`pc_feed_sources.source_kind` (`regulatory` | `voluntary`) keeps the two chain
tracks as distinct search/grouping paths. Pre-existing chains default to
`regulatory`. Admins set the kind per feed in the price-comparison admin page.

### Admin data-health dashboard

The price-comparison admin page (`/#/price-comparison-admin`, admin only) shows a
coverage dashboard via `GET /api/pc/admin/data-health`: total products, products
with a barcode, unique barcodes, categorized/uncategorized, products with an
image, and products carried by 2+/3+/4+ chains, plus the regulatory/voluntary
chain counts.

### Google admin login — single-user gate

Admin Google OAuth is configuration-driven (`server/google-auth.ts`). Set
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_CALLBACK_URL` in the
environment — **never hard-code secrets**; if any is missing the routes return
`503 config_missing` and the build still compiles. Sign-in is restricted to the
allow-list in `GOOGLE_ALLOWED_ADMIN_EMAILS` (comma-separated, case-insensitive),
which defaults to `l023131500@gmail.com`. The callback verifies the Google
`id_token` (audience + `email_verified`) and rejects any email not on the
allow-list with `403`.
