# round-3 a11y recheck — chatzor-app, chizukim, chizukim-app (18/08/2026)

Continuing the round-3 dark-mode contrast recheck (`contrast-probe.mjs`) in
`ROUTES` order from `scripts/qa/lighthouse-run.mjs`, right after chatzor (16).

Ran `node scripts/qa/contrast-probe.mjs <url> <width> <scheme>` against each
route, both widths (1440/390) and both color schemes (dark/light):

| route | url | 1440 dark | 390 dark | 1440 light | 390 light |
|---|---|---|---|---|---|
| chatzor-app | https://more30.com/chatzor/ | clean | clean | clean | clean |
| chizukim | https://more30.com/chizukim | clean | clean | clean | clean |
| chizukim-app | https://more30.com/chizukim/ | clean | clean | clean | clean |

Zero failures in all twelve combinations. No code change, no deploy required.

Next in `ROUTES` order after chizukim-app: orech, mthbram, zchuyot, galil
(already fixed earlier this round, `galil-hero-dark-mode-contrast`), studio,
mechiron, kupot, crm, gesher, nadlan, kesef, kiosk (already fixed earlier
this round, `kiosk-dark-contrast-0818`, ships from a different repo).
