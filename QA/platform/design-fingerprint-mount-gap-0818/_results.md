# design-fingerprint.mjs mount-gap fix (0818)

Round-4 (functional) is fully closed and no unblocked core.issues remain
(#239/#240/#215/#156/#138 all need a user decision — see NEEDS_USER.md).
Per more30-priority.md §6 ("all sites look like generic AI"), the next open
work is round-5 (design uniqueness), measured by `scripts/qa/design-fingerprint.mjs`.

Same class of gap as last session's `brand-audit.mjs` fix (commit 2701108):
`design-fingerprint.mjs`'s `ROUTES` list was built before bkalot-clone (37,
`/bkalot-studio`) and gannenet (40, `/gannenet`) went live, so neither was ever
fingerprinted — `QA/platform/_design.json` held 25 systems, not the current 27
live mounts.

## Fix
Added `'bkalot-clone': '/bkalot-studio'` and `gannenet: '/gannenet'` to
`ROUTES` in `scripts/qa/design-fingerprint.mjs`. Ran filtered
(`node scripts/qa/design-fingerprint.mjs /bkalot-clone /gannenet`) so the
merge-not-replace path in the script updated only these 2 new keys in
`QA/platform/_design.json` (27 systems total now, up from 25) — verified the
other 25 entries are byte-identical to before.

## What the new measurements show
- **bkalot-clone**: Frank Ruhl Libre / Assistant, no shadcn/lucide/rounded-xl
  kit markers — a plain static HTML page (matches its known shape, no SPA
  framework), own font pairing, not a template match to any other system.
  `accent`/`btnRadius`/`surfaceRadius` came back `null` — the fingerprint
  heuristic (primary coloured button + rounded card above the fold) found no
  matching element on this page's markup, not a real gap; not investigated
  further this step (tool-limitation, not a design-uniqueness finding).
- **gannenet**: Heebo/Heebo, own accent (`rgb(43, 74, 139)`, a distinct blue
  not seen elsewhere in `_design.json`) — but flagged with **4 distinct
  icon-chip hues**, the same "rainbow nobody chose" signal fixed on galil
  (commit 8b43d36) and zchuyot (commit 3043589) earlier in this design pass.
  Not fixed this step (scoped to the enumeration gap only, per RUN_INSTRUCTIONS
  one-step-per-session rule) — flagged as the concrete next round-5 target.

No app code changed, no protected system touched (08/09/bkalut-app/
bkalot-admin/zr_*/NEDARIM3873 untouched), no deploy (audit script + its own
data file only).

## Next
Fix gannenet's icon-chip rainbow (4 hues → the site's own palette), the same
shape of fix as galil/zchuyot. That is the concrete, measurable next round-5
step.
