# 36 tivuch (nadlan-pro, ניהול למתווכים) — round-3 dark-mode contrast recheck

`node scripts/qa/contrast-probe.mjs https://more30.com/tivuch <width> <scheme>`
run against all four combinations:

- dark / 1440 — no contrast failures
- dark / 390 — no contrast failures
- light / 1440 — no contrast failures
- light / 390 — no contrast failures

0 failures in every combination. No code change, no deploy needed.

Round-3 ROUTES queue (per scripts/qa/platform-audit.mjs ROUTES list) status
after this step: home, login, me, subscribe remain unchecked for a
dedicated dark-mode contrast recheck (only Lighthouse sweeps exist for
those so far). All 26 individual-system routes (torah through kiosk) plus
tivuch are now done.
