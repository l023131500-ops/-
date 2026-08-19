# 28 קופות (kupot) — round-3 a11y recheck, 0818

Queue: round-3 dark-mode contrast recheck, ROUTES order — after mechiron(27), before crm.

`node scripts/qa/contrast-probe.mjs https://more30.com/kupot <width> <scheme>`
against production, both color schemes, both widths:

- 1440 dark: no contrast failures
- 390 dark: no contrast failures
- 1440 light: no contrast failures
- 390 light: no contrast failures

0 failures in all four combinations. No code change, no deploy needed.
