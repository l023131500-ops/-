# login / me / subscribe — round-3 dark-mode contrast recheck

`node scripts/qa/contrast-probe.mjs https://more30.com/<route> <width> <scheme>`
run against all four combinations (dark/light x 1440/390) for each of the
three remaining portal-level routes that only had Lighthouse sweeps before
this step:

## login (https://more30.com/login)
- dark / 1440 — no contrast failures
- dark / 390 — no contrast failures
- light / 1440 — no contrast failures
- light / 390 — no contrast failures

## me (https://more30.com/me)
- dark / 1440 — no contrast failures
- dark / 390 — no contrast failures
- light / 1440 — no contrast failures
- light / 390 — no contrast failures

Note: `/me` requires an authenticated session; unauthenticated, it renders
whatever the app does for a logged-out visitor (redirect/gate). 0 failures
either way, so not investigated further this step.

## subscribe (https://more30.com/subscribe)
- dark / 1440 — no contrast failures
- dark / 390 — no contrast failures
- light / 1440 — no contrast failures
- light / 390 — no contrast failures

0 failures in all 12 combinations across the three routes. No code change,
no deploy needed.

Round-3 ROUTES queue (per scripts/qa/platform-audit.mjs ROUTES list) is now
fully covered: all 26 per-system routes (torah through kiosk), plus tivuch,
home, login, me, and subscribe have all been dark-mode contrast-rechecked
this round.
