# orech round-3 dark-mode contrast recheck — 0818

`contrast-probe.mjs` against `https://more30.com/orech`, both color schemes
(light/dark), both widths (1440/390): **0 failures** in all four combinations.

orech follows `prefers-color-scheme` on its own (no manual toggle) — see
SYSTEMS_STATUS.md 06/08 entry: the earlier `wont_fix` closure of "orech has no
dark mode at all" was itself wrong (it checked for a `.dark` class, not what a
visitor with a dark OS actually sees). Today's live check confirms the OS-dark
path renders correctly with no contrast defects.

No code change, no deploy required.

Command:
```
node scripts/qa/contrast-probe.mjs https://more30.com/orech 1440 dark
node scripts/qa/contrast-probe.mjs https://more30.com/orech 390 dark
node scripts/qa/contrast-probe.mjs https://more30.com/orech 1440 light
node scripts/qa/contrast-probe.mjs https://more30.com/orech 390 light
```
All four: `no contrast failures`.
