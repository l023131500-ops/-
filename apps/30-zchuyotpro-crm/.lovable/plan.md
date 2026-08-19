# Phase 3 — Partners (שותפים)

Build the full partner ecosystem: admin partner management, referral creation from client profile, a partner-facing portal, an admin referrals dashboard, and webhook endpoints for n8n.

## 1. Schema changes (1 migration)

`partners` already exists. Need to extend `partner_referrals` and add roles for portal access.

- `ALTER TABLE public.partner_referrals` add columns: `partner_notes TEXT`, `rejection_reason TEXT`, `completed_at TIMESTAMPTZ` (if missing — already added in phase 2 ref code; will check & add idempotently).
- Add `partners.auth_user_id UUID REFERENCES auth.users(id)` (nullable) — links a partner row to a portal login.
- New RLS policies on `clients`, `client_financial_profile`, `client_housing_profile`, `client_family_members`, `client_vehicles`, `client_entitlements`, `documents`, `messages`: **add a SELECT policy** allowing access when `EXISTS (SELECT 1 FROM partner_referrals r JOIN partners p ON p.id = r.partner_id WHERE r.client_id = <table>.client_id (or id for clients) AND p.auth_user_id = auth.uid())`. Column-level filtering done in the **server function** (not RLS) using `partners.allowed_client_fields`.
- New SECURITY DEFINER helper `public.is_partner_for_client(_client_id uuid)` to keep policies tidy.
- `partner_referrals` policy: partner can SELECT/UPDATE rows where partner_id matches their `partners.auth_user_id`.
- `messages` INSERT policy for partners on their referred clients.

## 2. /partners — admin management page

Replace placeholder. `src/routes/_authenticated/partners/index.tsx`:
- Table: company_name, contact_name, category badge, email, phone, status, **referrals_count** (subquery via RPC or client-side aggregate from `partner_referrals` count grouped by partner_id).
- Toolbar: search, category filter, status filter, "שותף חדש" → opens Sheet.
- Row click → `/partners/$id` edit page.

`src/routes/_authenticated/partners/$id.tsx`:
- Form: company_name, contact_name, email, phone, category Select, status Select, **allowed_client_fields** (checkbox grid with Hebrew labels per spec).
- Optional `auth_user_id` field (text input — admin pastes the partner's user id after they sign up for portal).
- Section showing list of this partner's referrals.

`ALLOWED_FIELDS` constant in `src/features/partners/constants.ts`:
```ts
{ full_name, id_number, phone, email, birth_date, marital_status, num_children,
  family_members, financial_profile, housing_profile, vehicles, entitlements, documents }
```
PARTNER_CATEGORY already exists.

## 3. Referral flow from client profile

Update `ReferralsTab.tsx` "New referral" Sheet:
- Partner Select grouped by category.
- Notes textarea.
- **Data preview panel**: reads selected partner's `allowed_client_fields` and shows checked list with friendly Hebrew labels — "השותף יקבל גישה ל:".
- On submit: insert into `partner_referrals` (existing logic) **then** `fetch('/api/notify-partner', { ... })` fire-and-forget.

## 4. /partner-portal — partner-facing view

New top-level layout under `_authenticated` (any signed-in user; portal data scoped by RLS to their partners.auth_user_id):
- `src/routes/_authenticated/partner-portal/index.tsx` — list of referred clients (joined through partner_referrals). Shows file_number, name, sent_at, status.
- `src/routes/_authenticated/partner-portal/$referralId.tsx` — detail view:
  - Header: client name + status.
  - **Data sections** rendered conditionally based on `partner.allowed_client_fields` — read from a single `getReferralForPartner(referralId)` server function that:
    1. Validates the caller's `auth.uid()` matches the partner.
    2. Loads only fields in `allowed_client_fields`.
    3. Returns sanitized payload.
  - Status update form: Select (pending/in_progress/completed/rejected), `partner_notes` (required when completed), `rejection_reason` (required when rejected). On save: update + fire `/api/notify-admin`.
  - Message composer: textarea, sends to `messages` with channel='internal', direction='outbound', `sent_by = current profile`. Triggers n8n via existing flow.

Sidebar: add "פורטל שותפים" link visible when user has a `partners` row with their `auth_user_id`. Use a `usePartnerIdentity()` hook.

## 5. /referrals — admin dashboard

`src/routes/_authenticated/referrals.tsx` (replace placeholder):
- Stats bar: counts per status.
- Filters: partner Select, status Select, date range (from/to), client search.
- Table: client name (link), partner name, category, sent_at, status badge (colors per spec — already defined in `constants.ts`, verify).
- Row → opens Sheet with full history (status + timestamps + notes + rejection_reason).
- Status colors confirmed: sent=gray (secondary), pending=yellow, in_progress=blue, completed=green, rejected=red.

## 6. n8n webhook endpoints

Two TanStack server routes under `src/routes/api/public/` (auth happens via shared HMAC secret or simple Supabase service-role call from edge — these endpoints are called BY our app, not external, but spec says they're hooks for n8n):

- `src/routes/api/public/notify-partner.ts` POST: validates body `{ referralId }`, loads referral + partner + client (admin client), POSTs to `process.env.N8N_NOTIFY_PARTNER_URL` if set, otherwise logs & returns ok. Returns 200.
- `src/routes/api/public/notify-admin.ts` POST: same shape with `{ referralId, newStatus, notes }`, POSTs to `process.env.N8N_NOTIFY_ADMIN_URL`.

Both verify a simple shared `x-internal-token` header (`process.env.INTERNAL_WEBHOOK_TOKEN`) to prevent random hits. Frontend sends that header from a tiny server fn wrapper so token never reaches the browser — actually simpler: have frontend call a `createServerFn` `dispatchNotifyPartner` that internally fetches the public route with the token, OR fetch n8n URL directly from the server fn. **Going with the server-fn approach** — `notifyPartner` / `notifyAdmin` server fns that POST to n8n URLs (env). The `/api/public/notify-*` routes remain as the alternate entry point spec asked for.

Add 2 optional secrets: `N8N_NOTIFY_PARTNER_URL`, `N8N_NOTIFY_ADMIN_URL`, `INTERNAL_WEBHOOK_TOKEN`. Don't block the user — if unset, log and skip.

## 7. Files

```
supabase/migrations/<ts>_phase3_partners.sql
src/features/partners/
  constants.ts             # ALLOWED_FIELDS labels
  queries.ts               # partners list/detail, referrals admin, portal queries
  components/
    AllowedFieldsChecklist.tsx
    DataPreviewPanel.tsx
src/lib/notifications.functions.ts   # notifyPartner, notifyAdmin server fns
src/routes/_authenticated/
  partners/index.tsx       # replaces partners.tsx
  partners/$id.tsx
  partners/new.tsx         # or inline Sheet on list
  partner-portal/index.tsx
  partner-portal/$referralId.tsx
  referrals.tsx            # replaces placeholder
src/routes/api/public/notify-partner.ts
src/routes/api/public/notify-admin.ts
```

Delete existing `src/routes/_authenticated/partners.tsx` and `src/routes/_authenticated/referrals.tsx` (placeholders). Hook sidebar to show portal link when applicable.

## Out of scope
- Real n8n workflow design — we only emit the webhook payload.
- Partner self-signup / invite emails — admin pastes auth_user_id manually.
- File-level redaction in documents (allowed_client_fields gates the whole "documents" section, not per-document).
- Bulk referral creation.
