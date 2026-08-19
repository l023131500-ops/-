# round-4 functional pass — 18 orech (torah-editor-mvp, עורך תורני)

**Date:** 2026-08-18
**Live URL:** https://more30.com/orech

## Bug found and fixed

`app/documents` and `app/editor` (the core action: create/upload/edit a
document) checked `sb.auth.getUser()` on a Supabase client created with
`createBrowserClient(HUB_URL, HUB_ANON)` (`@supabase/ssr`, no storage
override). The shared platform pill (`auth-button.js`) writes the session to
`localStorage['more30-auth']`; `createBrowserClient`/`createClient` without an
explicit `storageKey` default to a key derived from the project ref instead.
Result: the shared pill read "לקוח" (logged in) while `/orech/documents`
showed "צריך להתחבר" and "מסמך ריק חדש" failed with "צריך להתחבר כדי לשמור
מסמך" — the core action never worked for a signed-in visitor.

Same root cause and same fix already applied elsewhere in this repo (see
`apps/16-chatzor-connect/src/lib/supabase.ts`): pass `storageKey: 'more30-auth'`
in the client's `auth` options so it reads the session the shared pill wrote.

**Fix:** `apps/18-torah-editor-mvp/lib/hub.ts` — switched `getHubClient()`
from `@supabase/ssr`'s `createBrowserClient` to `@supabase/supabase-js`'s
`createClient<any>` with explicit `storageKey: 'more30-auth'` (plus
`persistSession`/`autoRefreshToken`/`detectSessionInUrl`). `<any>` generic
needed explicitly — without it, `createClient`'s 3-arg overload resolved
`Schema` to `never`, breaking `.from('orech_documents').insert(...)` typing.

## Verification (Playwright, live, after deploy)

- `/orech/documents` now reads "מחובר כ־test@more30.com" and lists real
  documents (0, correctly — this account had none) instead of "צריך להתחבר".
- Clicked "מסמך ריק חדש" → real `POST .../rest/v1/orech_documents?select=id`
  → `201 Created` → navigated to `/orech/editor?doc=<real uuid>` → editor
  loaded the doc back via a real `GET` (title "מסמך חדש", 0 מילים, "טיוטה").
- Back on `/orech/documents`, the new doc appeared in the real list (1 טיוטה).
  Deleted it via the UI's own delete button (confirm dialog accepted) to
  leave no QA litter — the row disappeared and the list read empty again.
- All round-trips against `uhnrgujbdxhhmoxcjria` (the shared hub project,
  `public.orech_documents`), the same project `core.run_progress` lives in —
  reached only through this app's own anon-key, RLS-scoped `orech_documents`
  API, no protected schema touched.
- Evidence: `documents-logged-in.png`.

## Build/deploy

`next build` clean (`tsc --noEmit` also clean after the `<any>` fix).
Deployed from source (not `--prebuilt`, so `next.config.js`'s
`basePath: "/orech"` ships) via `vercel deploy --prod --yes --scope
l023131500-ops-projects` from `apps/18-torah-editor-mvp` → READY →
verified live with a `?cachebust=` URL.

## Protected systems

Untouched. `apps/18-torah-editor-mvp`'s own Supabase project
(`bieebmnmkffwbqlsfozh`) was not touched by this fix — only the hub client's
storage key changed. No writes to 08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873.

Next in round-4 ROUTES order: 19 (igud-shiurim-portal) or next per
`core.run_progress`.
