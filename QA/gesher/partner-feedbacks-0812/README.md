# 31 gesher — /partner/feedbacks: the last "coming soon" screen in the partner area

**12/08/2026 · priority §1ג · commit on `fix/nadlan-a11y`**

## What this was

Open line (2) from the 12:23 heartbeat, verbatim: *"/partner/feedbacks — מסך 'בקרוב' אחרון באזור השותפים, הקו שממנו התחלנו ולא הגענו אליו."*

The route was six lines:

```tsx
component: () => <PlaceholderPage title="משובים ועדכונים" description="עדכוני סטטוס טיפול ומשוב לכל לקוח." />
```

It is the third of three items in the partner navigation (`route.tsx`), on a live system, so a
partner who signed in met a placeholder on one of the three screens he has. §1ג requires that
whoever signs in gets the product's real actions, not a thank-you screen.

## Why this screen could be built now, with #180 open

`#180` (SUPABASE_SERVICE_ROLE_KEY absent from gesher's Vercel environment) kills every
`supabaseAdmin` path in production. This screen's write does not use one.

Migration `20260605003212` did `REVOKE UPDATE ON public.partner_assignments FROM authenticated`
and granted back **exactly one column**:

```sql
GRANT UPDATE (partner_feedback_notes) ON public.partner_assignments TO authenticated;
```

and `20260605003749` kept that column readable:

```sql
GRANT SELECT (id, client_id, partner_id, treatment_status, partner_feedback_notes, created_at, updated_at)
```

So `partner_feedback_notes` is the one column the grant was written *for* the partner to write.
`savePartnerFeedback` therefore writes through the caller's own client — no `supabaseAdmin`
import at all — while `updateTreatmentStatus` (fixed at 12:23, issue #179) must go through
service_role because its column was deliberately revoked. Confirmed in the built server chunk:
the `savePartnerFeedback` handler contains no `client.server` import.

## What was built

- `src/lib/partner.functions.ts`
  - `PartnerClientRow` gains `feedback_notes`; `listMyClients` selects `partner_feedback_notes`.
  - New `savePartnerFeedback` (POST, zod-validated, ≤4000 chars). Same ownership gate as
    `updateTreatmentStatus`: read the row as the caller — `"Partners read own assignments"` is
    `USING (auth.uid() = partner_id)`, so a foreign **and** a missing id both come back empty and
    both answer `Forbidden`. Empty text is stored as `NULL`, not `''`.
- `src/routes/_authenticated/partner/feedbacks.tsx` — the real screen. One card per assigned
  client: the consent-enforced `display_name` (same `partner-visibility.ts` path as
  `/partner/clients`, so a client who withheld consent is still not named here), the treatment
  status badge, a labelled textarea, character counter, and save/cancel that are disabled until
  the text actually differs from what is stored.

It reuses the `["partner", "clients"]` query — one server call, one cache entry, and saving a note
invalidates both screens at once.

## Verification

- `npx tsc --noEmit` → exit 0, and it really inspected these files: `--listFiles` = 1175 files
  including `partner.functions.ts` and `feedbacks.tsx`. (The repo-root tsconfig has `"files": []`
  and checks nothing — this is the app's own tsconfig.)
- `npm run build` → exit 0 (20.54s).
- Deployed from source (**not** `--prebuilt`, so `vercel.json`'s `/gesher/assets/*` rewrite ships):
  `gesher-more30`, `dpl_BPTa33n3X4CB6TeGSSfPV85Dp258`, target production, READY.
- `verify-production.mjs` against **more30.com** (re-runnable):
  - `GET /gesher/partner/feedbacks` → HTTP 200; the served route chunk
    (`feedbacks-Cy_5yqt2.js`) carries `המשוב שלי על הטיפול` and `שמור משוב`; the placeholder
    string `עדכוני סטטוס טיפול ומשוב לכל לקוח` is **gone** from the served bundle.
  - `POST /gesher/_serverFn/c98ad0e8…` as `test@more30.com` with an assignment id that belongs to
    nobody → **HTTP 200, `Forbidden`**. No `42501`, and no `Missing Supabase environment` — i.e.
    the handler runs in production and does not depend on the missing service key.
  - The RPC body is seroval-encoded, not plain JSON (a plain object answers
    `Seroval Error (step: 3)`); the script uses the serializer the app itself ships with.

## Not verified, and recorded as such

The partner-facing render was **not** photographed. There is no partner account on this system and
one cannot be created from here — `partner_assignments` has no INSERT policy other than
`"Admins manage assignments"`. This is the same blocker recorded at 11:49, 12:04 and 12:23.
`prod-partner-feedbacks-anon-redirect.png` shows only what an unauthenticated visitor gets.

The write itself was never executed against a real row, for the same reason. The probe used
`00000000-0000-0000-0000-000000000000`, so **no row of 31 was written**.

## Test mode

No user created, no message sent, no charge. Protected systems (08, 09, `bkalut-app`,
`bkalot-admin`, `zr_*`, `NEDARIM3873`) untouched; `csj`/`csj_src`/`igud` unused.
