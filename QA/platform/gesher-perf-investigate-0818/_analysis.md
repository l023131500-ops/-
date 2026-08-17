# gesher (31) — round-2 perf investigation, 18/08/2026

Continuing round-2 perf sweep (ROUTES order in `scripts/qa/lighthouse-run.mjs`) after crm(29): gesher(31).

Baseline: `node scripts/qa/lighthouse-run.mjs QA/platform/gesher-perf-investigate-0818 gesher`
-> perf 84, a11y 100, bp 77, seo 100 (a11y/bp/seo unchanged from earlier gesher-lh-a11yfix-0817).

Leading failedAudits: `redirects` (score 0, est savings 1,220ms), `mainthread-work-breakdown`
(2.2s), `third-party-cookies` (NetFree, not our code), `render-blocking-insight` (only 170ms —
the Google Fonts loadCSS fix already applied here, nothing left to fix), `unused-javascript`
(105 KiB).

Root cause of the redirect audit, read directly in `apps/31-hebrew-bridge-crm/src/routes/index.tsx`:
**same pattern as crm (29), confirmed by the code comment already in the file.** `beforeLoad`
calls `supabase.auth.getSession()` (a real network round-trip) before redirecting to
`/auth`/`/admin`/`/partner`/`/client` by role — added deliberately after a prior bug where the
redirect fired nowhere without the guard (SSR resolved the route before the client-side redirect
could run). Not fixed this step: touches core auth-gating shared by every gesher visitor, same
risk class as the crm finding, bigger than a ~20min step.

`mainThreadBreakdown` has no single dominant script (own bundle
`index-Br5YhkKt.js` 564ms total/498ms scripting — moderate, not a one-file code-splitting case
like egod). No code or deploy change this step — measurement/investigation only.

Next in round-2 (ROUTES order): nadlan.
