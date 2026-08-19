# 27 mechiron — round-3 dark-mode contrast recheck (2026-08-18)

## Finding
`contrast-probe.mjs` against `https://more30.com/mechiron`, dark scheme, both widths (1440/390):
21 failing headings (h1/h2/h3), all `rgb(27,71,77)` (`#1B474D`) on near-black backgrounds
(`rgb(18,25,28)`–`rgb(26,34,38)`), ratios 1.27:1–1.74:1 (need 3–4.5:1). Identical at both widths.

## Root cause
`apps/27-bkalut-price/client/index.html` loads a shared brand stylesheet from Supabase
Storage (`bkalot-theme.css`, additive, loads before app CSS by design). That shared file sets
`h1,h2,h3,h4{color:var(--teal-d)}` and keys its dark palette off the **`[data-theme="dark"]`**
attribute selector. This app's own dark-mode bootstrap script (inline, in `<head>`) only ever
toggled the **`.dark`** class on `<html>` — it never set `data-theme`, so the shared file's
dark override for `--teal-d` (`#1B474D` → `#8fd6df`) never applied. Headings stayed pinned to
the light-mode teal against the dark background. Confirmed by hex match: `27,71,77` = `#1B474D`
exactly, the shared file's light-mode `--teal-d`.

Local `index.css` in this app never sets its own heading color (only `letter-spacing`), so
there was nothing here to fix locally in CSS — the gap was in which attribute the app sets,
not a color value.

## Fix
`apps/27-bkalut-price/client/index.html`: the existing bootstrap script now also sets
`data-theme="dark"|"light"` on `<html>` alongside the `.dark` class toggle it already did.
One line. Does not touch the shared `bkalot-theme.css` file (external, shared by the bkalut
family of sites) or any protected system (08/09/bkalut-app/bkalot-admin).

## Verify
- `vite build` clean (2409 modules).
- `robocopy dist/public -> _deploy/mechiron-more30/public/mechiron` (mirror).
- `vercel deploy --prod --yes --scope l023131500-ops-projects` from `_deploy/mechiron-more30`
  → `dpl_A41odZYmD2vsxQ8voPmkpw2CYXRB`, READY, aliased `mechiron-more30.vercel.app`.
- Live re-check with a cache-buster (`?cb=0818b`), dark, both widths: 21 heading findings → 0.
- Light mode re-check (regression guard): unchanged from before the fix (only the two
  pre-existing non-heading items below), so light mode is untouched.

## Left open (not this defect, not fixed this step)
- Decorative "1/2/3/4/5" step-number watermark (`text-3xl font-bold text-primary/15`,
  1.25–1.27:1 both themes) — same accepted "large decorative number redundant with the step
  heading text" exception already applied on smel's round-3 pass.
- `span.text-destructive` required-field asterisk, dark mode only, 3.31:1 (needs 4.5) — small
  pre-existing near-miss, unrelated `--destructive` token gap, flagged for a future recheck
  same as other documented near-misses this round (briut CTA, footer, etc).
