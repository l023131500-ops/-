# bkalot-studio (37, bkalot-clone) — auth-button.js was missing, DESIGN_STANDARD §9 + priority §7 gap

## Why this surfaced

Round-4 (functional) and the earlier brand-audit (`scripts/qa/brand-audit.mjs`,
last full run in `QA/platform/brand-audit-recheck-0817/`) both reported 0
offenders across "all mounts" — but that script builds its mount list from
`portal/vercel.dist.json`'s `:path*` wildcard rewrites, and `/bkalot-studio`
uses exact-match rewrites (`stage-portal.ps1` copies it straight into
`portal/dist/bkalot-studio/`, no wildcard). It was never actually in the
26-mount list the audit walked, so it was never checked.

## What was found (live, before fix)

`Invoke-WebRequest https://more30.com/bkalot-studio/` — 200, raw HTML had:
- no `auth-button.js` reference at all (DESIGN_STANDARD §9: every system must
  carry the shared nav auth button script)
- footer was a static `<footer>חלק מ־<a href="https://more30.com">more30</a></footer>`
  with no "פותח ע״י עולם הסטארטאפים" credit link (more30-priority.md §7 —
  the credit is injected by auth-button.js itself, so this is the same root cause)

No old-brand string ("מור מערכות תוכנה") was present — that part was already clean.

## Fix

`apps/37-bkalot-clone/index.html` and `apps/37-bkalot-clone/admin.html` — added
`<script src="https://more30.com/auth-button.js" defer></script>` before
`</body>`, same pattern as `apps/10-bkalot-rights/index.html`. No other change.

## Deploy

`/bkalot-studio` is not a separate Vercel project — it's copied into the
`more30-portal` project's `dist/` by `scripts/stage-portal.ps1` (see the
script's own comment on this). Ran the script (no portal rebuild needed, only
`apps/37-bkalot-clone/*.html` changed) then
`vercel deploy --prod --yes --scope l023131500-ops-projects` from `portal/dist`
— `dpl_GSdk4wQajrwZiTNMDnNwMGqJNxog`, target=production, READY, aliased to
more30.com.

## Verified live (Playwright, cache-busted, after deploy)

- `https://more30.com/bkalot-studio/` — 200, `document.querySelector('.more30-credit')`
  → text "פותח ע״י עולם הסטארטאפים", href `https://more30.com/showcase`;
  `document.querySelector('more30-auth')` present.
- `https://more30.com/bkalot-studio/admin` — 200, same credit + auth element present.

Screenshot: `bkalot-studio-index.png` (desktop, shows the login pill top-left
and the footer credit).

No protected system touched, no schema/data change — two static HTML files in
`apps/37-bkalot-clone` plus a portal redeploy.
