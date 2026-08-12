# 31 gesher — /partner/clients: the "coming soon" screen that was the partner area's own landing page

**12/08/2026 · priority §1ג ("מי שנכנס נכנס כלקוח מלא — כל פעולות השימוש") · gesher-more30**

## The item

Open line (1) from the previous heartbeat, verbatim:

> `/partner/clients` — מסך "בקרוב" על מערכת חיה, ויעד ההפניה של אזור השותפים; כשייבנה, יבנה מעל `partner-visibility.ts`.

`src/routes/_authenticated/partner/index.tsx` redirects to `/partner/clients`, so this was
the first screen any partner saw after logging in — and it was a six-line `PlaceholderPage`
on a live system. It is also the first place `partner-visibility.ts` matters outside the
tasks board: a clients list is, by definition, a list of client details shown to a partner.

## What was built

**`src/lib/partner.functions.ts`** (new)

- `listMyClients()` — reads `partner_assignments` as the caller (RLS policy *Partners read
  own assignments* scopes it), then assembles each card as `service_role`, because
  `client_profiles` has **no partner policy at all** — a partner reading it directly gets
  nothing back. That is exactly why the consent check has to be in code, not in RLS.
  It reads `profiles` / `client_profiles` **only** when the partner's category is allowed
  at least one field from that table; a partner with no allowed fields issues no read.
- `updateTreatmentStatus()` — the partner moves the assignment between
  `sent` / `in_progress` / `completed`. The RLS UPDATE policy on `partner_assignments`
  is `USING`-only with **no `WITH CHECK`**, so it would also permit a partner to rewrite
  `partner_id` on their own row; the handler therefore verifies ownership itself and
  updates the single column.

**`src/lib/partner-visibility.ts`** — two pure helpers lifted out so the card-building rule
lives with the rest of the consent logic and stays testable:
`visibleFieldsFor()` (allowed ∩ consented, in the admin's configured order) and
`partnerFacingName()` (real name, or `CONSENT_WITHHELD_NAME`).

**`src/routes/_authenticated/partner/clients.tsx`** — the screen. One card per assignment:
heading, assignment date, treatment-status badge, the permitted fields as a definition list,
and the status selector. A client who has not consented gets a lock row saying so, and the
card carries no identifying value at all.

### What a partner is deliberately NOT handed

`uploaded_documents` is one of the eight keys the admin's visibility grid offers, and it is
**not** sourced by `listMyClients`. Documents live in their own table behind their own RLS
(the 11:21 fix), and handing them out from a `service_role` read here would route around it.
Ticking that box in the admin grid therefore has no effect on this screen — recorded, not
silently dropped.

## Verification

### 1. The consent rule, against the real module

`verify-partner-clients.mjs` imports the **actual** `src/lib/partner-visibility.ts` (bundled
by esbuild — not a copy) and drives it with a stand-in shaped like the live tables.

```
cd apps/31-hebrew-bridge-crm
npx esbuild src/lib/partner-visibility.ts --bundle --format=esm --platform=node \
  --outfile=../../QA/gesher/partner-clients-0812/_bundle.mjs
node ../../QA/gesher/partner-clients-0812/verify-partner-clients.mjs <abs-path-to>/_bundle.mjs
```

**13/13 passed.** Covered: consenting client shows exactly the configured fields in the
configured order with `full_name` lifted into the heading; `email` and
`internal_admin_notes` absent because the rule never listed them; `is_granted=false` and
"no consent row at all" both collapse to the withheld label with zero fields; the seeded
`סוכני_פנסיה` category (`allowed_schema_fields = []`) shows nothing **even though the client
consented**; a partner with no `specialization_category` sees nothing; a missing value stays
`null` (the screen prints "לא זמין") instead of inventing a placeholder or borrowing another
client's row.

**Regression:** the previous step's `../consent-enforcement-0812/verify-visibility.mjs` was
re-run against this same refactored bundle — **12/12 passed**, so lifting the helpers out
did not move the rule.

### 2. Build

`npx tsc --noEmit` → exit 0. `npm run build` → exit 0, built in 29.24s.

### 3. Production

Deployed: `gesher-more30`, `dpl_5DUcSzPq3a7n3qibF1SsDL3k9LRs`, target production, **READY**,
from source (not `--prebuilt`, so `vercel.json` and its `/gesher/assets/*` rewrite ship).

The route chunk was then fetched from `more30.com` itself. Four `clients-*.js` chunks are
referenced by the deployed entry bundle; the partner one is
`https://more30.com/gesher/assets/clients-BeMnH9jR.js` (200, 3946 bytes) and it contains
`הלקוחות ששויכו אליך`, `טרם אישר שיתוף` and `עדכון סטטוס הטיפול`, and contains **no**
`PlaceholderPage` and no `בקרוב`. The placeholder is gone in production, not just on disk.

Browser, as the official §1ב test user (`test@more30.com`): `/gesher/client/status` loads
normally after the deploy — no regression on the surface a client actually has — and
requesting `/gesher/partner/clients` as that client redirects to `/gesher/client`, so the
role guard still holds over the new route. Screenshot: `01-role-guard-client-redirected.png`.

## Not measured, and recorded as such

**The partner's own view of this screen was not walked in a browser.** There is no partner
account reachable from here: creating one needs the admin panel (Google of
`l023131500@gmail.com`) or the `service_role` key of gesher's Supabase project
(`ygaqqnuyfnumezxxmtbh`), which is not exposed in MCP. This is the same blocker recorded at
11:49. The rule the screen renders is covered by the 13 tests above; what a partner sees
on screen is not photographed.

It is also still unknown whether `partner_assignments` has any rows in production at all —
same blocker. If it is empty, a partner would land on the new empty state
("עדיין לא שויכו אליך לקוחות").

## Test mode

No user created, no message sent, no charge made. Protected systems (08, 09, `bkalut-app`,
`bkalot-admin`, `zr_*`, `NEDARIM3873`) untouched; the `csj` / `csj_src` / `igud` schemas
were not used.
