# 26 modaot-studio — optional login/ownership scoping (studio_projects/studio_brands)

Built exactly the additive fix scoped in NEEDS_USER.md (19/08, "26 modaot-studio")
after the prior session deliberately deferred it (spans two divergent server
copies on a live paid system — did not want to attempt it half-verified).

## What changed (additive only, no existing route/screen/button removed)

1. **Migration** (`uhnrgujbdxhhmoxcjria`, `public` schema): nullable
   `user_id uuid references auth.users(id) on delete set null` added to
   `studio_projects` and `studio_brands`, plus an index on each. 0 rows in
   both tables before and after — zero data risk.
2. **Client** (`apps/26-modaot-studio/client/src/lib/queryClient.ts`): reads
   `localStorage['more30-auth']` (same key `auth-button.js` writes) and, only
   when a non-expired session exists, attaches `Authorization: Bearer <jwt>`
   to `apiRequest`/`getQueryFn`. No session → no header, identical to before.
3. **Server, deployed copy** (`_deploy/studio-more30/api/_lib/server/{storage,routes}.ts`,
   the tree that actually serves `more30.com/studio`): added
   `getUserIdFromToken()` (verifies the JWT against Supabase auth, returns
   `undefined` on any missing/invalid token — never throws). `GET/POST
   /api/projects` and `GET/POST /api/brands` now thread an optional `userId`:
   listing filters by `user_id` only when present; creating tags the new row's
   `user_id` only when present. No `userId` → old behavior exactly (all rows,
   untagged).
4. **Server, source/dev copy** (`apps/26-modaot-studio/server/{storage,routes}.ts`):
   mirrored the same optional-`userId` signatures into the SQLite/drizzle
   storage for parity (dev has no Supabase auth wired, so `userId` is always
   `undefined` there in practice — routes.ts in dev is untouched).
5. **Shared schema** (`apps/26-modaot-studio/shared/schema.ts` +
   `_deploy/studio-more30/api/_lib/shared/schema.ts`, kept byte-identical):
   added nullable `userId` column to the `projects`/`brands` drizzle tables,
   explicitly omitted from `insertProjectSchema`/`insertBrandSchema` so a
   client can never set it directly — only the server stamps it from a
   verified JWT.

## Verification (production, `more30.com/studio`, real test account)

- `tsc --noEmit` in `apps/26-modaot-studio`: clean.
- `vite build`: clean, 2162 modules, output mirrored byte-for-byte into
  `_deploy/studio-more30/public/studio` (robocopy /MIR, 24 asset files,
  `index.html` references the new `index-CalWb3e5.js`/`index-Cc6JehBS.css`).
- Deployed `_deploy/studio-more30` → `vercel deploy --prod`,
  `dpl_2nmcW6fCRVCrkmA1XeiPWECQmKgF` READY, aliased.
- `GET https://more30.com/studio/api/health` → `{"ok":true}`.
- **Anonymous flow unbroken**: Playwright, no session — home page renders
  (templates, nav, gallery), `GET /api/projects` → 200, `GET /api/brands` →
  200 `[]`. Zero console errors across the whole session.
- **Authenticated flow, real request**: logged in as `test@more30.com`
  (existing shared session in browser storage). Confirmed via
  `browser_network_request` that `GET /api/projects` from the app itself
  carries a real `Authorization: Bearer <jwt>` header once logged in.
- **Tagging + scoping, exact `apiRequest` request shape**: `POST
  /api/projects` with the JWT → row created with
  `userId: "78600fbc-3fd3-4f02-8552-e93ab6559649"` (the real test user's
  `auth.users.id`). `POST /api/projects` without the header → row created
  with `userId: null`. `GET /api/projects` with the JWT → returns only the
  tagged row. `GET /api/projects` without the header → returns both rows
  (anonymous still sees everything, exactly like before the change — the
  "zero regression" requirement from NEEDS_USER's own spec).
- Cleaned up both QA rows after verification; `studio_projects` back to 0
  real rows (real-data-only rule).

## Not done in this step (out of scope, not needed for the audit_gaps claim)

- No ownership check on `PATCH`/`DELETE`/`GET :id` — NEEDS_USER's own spec
  for this step was "tag on save + filter the list", not full per-row access
  control. Left as a future hardening item, not a regression: today anyone
  can still edit/delete any project by ID (same as before this change).
- `studio_users`/`passport`/`express-session` dead dependencies not removed
  — out of scope for an additive fix, no functional impact.

Commit: see git log for this session's commit touching
`apps/26-modaot-studio` + `_deploy/studio-more30`.
