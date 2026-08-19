# 30 CRM זכויות — round-2 perf sweep (ROUTES order, after kupot(28))

Baseline for `/crm` was already measured once in `crm-lh-0817` (perf 89 after the
`landmark-one-main` a11y fix, but that run did not save a raw `_lighthouse.json`,
only a summary). Re-measured fresh this step:
`node scripts/qa/lighthouse-run.mjs QA/platform/crm-perf-investigate-0818 crm`
→ perf **65** · a11y 100 · bp 77 · seo 100 (perf swing 89→65 matches the
already-documented measurement-noise pattern seen on bkalot 82→69 and mechiron
55→53 — not treated as a real regression).

**Leading failedAudits, in order:**
1. `redirects` (score 0, est. savings 1,260ms) — `/crm` always 307-redirects to
   `/crm/auth` or `/dashboard`.
2. `mainthread-work-breakdown` (score 0, 3.6s) — Other 1289ms / Script Eval
   1030ms / Style&Layout 941ms.
3. `render-blocking-insight` (610ms) and `unused-javascript` (106 KiB est.
   savings) — own bundle, no font-loading issue on this route at all
   (`apps/30-zchuyotpro-crm` has zero `fonts.googleapis`/`@font-face` matches,
   so the loadCSS pattern used on 01-12/32 does not apply here — different
   root cause).

**Root cause of the redirect, read directly in
`apps/30-zchuyotpro-crm/src/routes/index.tsx`:** intentional, by design (see
the comment already in that file, added to fix a real SSR-hydration bug where
the redirect fired nowhere). `beforeLoad` on the `/` route calls
`supabase.auth.getSession()` — a real network round-trip to Supabase auth —
*before* the server can respond, then throws a `redirect()` to `/auth` or
`/dashboard`. That network wait, not an extra HTTP hop, is where the 1,260ms
comes from (confirmed above: only one 307 hop, `/crm` → `/crm/auth`, via a
direct `AllowAutoRedirect=false` request — the "multiple" in the audit title
does not mean multiple hops here).

**Not fixed this step.** Removing or restructuring this redirect touches the
core auth-gating flow shared by every CRM visitor (unauthenticated → `/auth`,
authenticated → `/dashboard`) and is exactly what a prior session deliberately
fixed after a real outage-shaped bug (blank page, no redirect at all). Swapping
`getSession()` for a cheaper local check (e.g. reading the Supabase JWT cookie
without a network call) is a genuine option but is auth-behavior-changing code,
not a one-file swap — bigger than this step's budget and higher-risk than the
font/CLS fixes applied elsewhere in this sweep. Deferred, same category as
egod/chatzor/chizukim (code-splitting) and kupot (no fix available this round).

No code or deploy change this step — measurement/investigation only.
Next in round-2 (ROUTES order): gesher.
