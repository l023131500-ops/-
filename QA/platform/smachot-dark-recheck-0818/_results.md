# 14 שמחות פלוס (smachot) — round-3 a11y recheck: dark-mode contrast

Continues the round-3 dark-mode contrast recheck sweep (torah/tamlul/modaot/imud/briut/bkalot/smel/galil/kiosk
done in prior steps). Next unchecked system in `ROUTES` order after `smel`.

## Finding: clean

`contrast-probe.mjs` against `https://more30.com/smachot`, dark mode, both widths (1440 and 390): **0 failures**.

This system (`apps/14-bsmachot-plus/website`) is a hand-written static site, not one of the shared
React/Next apps — it drives its own theme via a `data-theme="dark"` attribute set once on load from
`matchMedia('(prefers-color-scheme: dark)')` (`app.js:369`), not the Tailwind `.dark` class pattern used
elsewhere. Its `:root`/`[data-theme="dark"]` variable pairs (`--bg`, `--surface`, `--text`, `--text-soft`,
`--text-faint`, `--accent`, `--accent-ink`) are each defined for both themes with adequate contrast — dark
mode genuinely passes.

## Also found: light-mode "failures" are tool false positives, not a bug

Running the same probe with `colorScheme: 'light'` reports ~40 failures (sidebar nav items, brand title,
`.view-hero` heading/eyebrow/paragraph, table cells). Read `style.css` to check each one instead of
trusting the raw numbers, and every one traces to a known limitation of `contrast-probe.mjs` itself
(documented in its own source comments after the galil round-3 step), plus one more of the same kind:

- `.sidebar` (`background: linear-gradient(180deg, var(--teal-800), var(--teal-900))`) and `.view-hero`
  (`background: linear-gradient(125deg, ...)`) are **always** dark teal by design, in both themes — the
  pale text colors inside them (`.nav button { color: #cfe2e3 }`, `.brand-text strong { color: #fff }`,
  `.view-hero h2/p/.vh-eyebrow`) are correct against their real backdrop. `contrast-probe.mjs`'s
  `backdrop()` walker only reads `background-color`, so it skips the gradient (computed `background-color`
  is transparent) and keeps walking up to the light `--bg` page background instead — exactly the
  gradient-blindness gap the tool's own comments already call out from the galil finding.
- New (not previously documented): `.topbar` uses `background: color-mix(in srgb, var(--bg) 86%,
  transparent)`. The probe's color parser is a bare regex (`/-?[\d.]+/g`) that grabs the first four numbers
  out of *whatever string* `getComputedStyle` returns — for a `color-mix()` value that isn't `rgb(...)`,
  it misreads the mix percentage as part of the color, producing garbage backdrops like the reported
  `rgb(35, 35, 35)`. Table `td.num`/`td` failures against `rgb(115, 115, 115)` are the same misparse, from
  `tbody tr:nth-child(even) td { background: color-mix(in srgb, var(--surface-2) 55%, transparent) }`.

No production code changed — both are QA-tool limitations (gradient + `color-mix()` parsing), not real
contrast bugs. Not worth extending `contrast-probe.mjs` to handle `color-mix()`/gradients in this step
(bigger than one step, and it already has a known workaround: read the source before trusting a light-mode
result that includes gradient or `color-mix()` backgrounds).

## Verify

`node scripts/qa/contrast-probe.mjs https://more30.com/smachot 1440 dark` → `no contrast failures`
`node scripts/qa/contrast-probe.mjs https://more30.com/smachot 390 dark` → `no contrast failures`

No deploy needed (no code change). Protected systems untouched (08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873).
Supabase MCP not connected this session — heartbeat written as a pending file.
