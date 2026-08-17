-- heartbeat: Supabase MCP is not connected in this session (ToolSearch for
-- mcp__supabase__* returned no matches), so core.run_progress is not
-- reachable from here. Joins the existing queue (see QA/*/*-0817/
-- _heartbeat-pending.sql for the full list) — run all pending files in
-- git-log commit order, not folder-name order. Delete each file once its
-- row lands.

insert into core.run_progress (phase, task, status, note) values (
'26 modaot-studio — favicon fixed and deployed (NEEDS_USER §0פ)',
$$studio-favicon-0817 — apps/26-modaot-studio/client/index.html declared
<link rel="icon" href="/favicon.png">, and no file by that name ever
existed anywhere in the tree (same pattern already found and fixed on
torah). Checked whether the navbar draws a live graphic mark before
asking the user for a file (NEEDS_USER §0פ methodology, same as
torah/imud/chizukim/egod/orech/zchuyot): Logo.tsx exists in the source
but is never imported/rendered anywhere (grep across client/src, 0
matches). The mark that actually renders is a lucide "Crown" icon in
gold #C9A227 on navy #0B1220 (Home.tsx:130), matching the site's own
accent pair; contrast measured at 7.74:1.

Fixed: wrote apps/26-modaot-studio/client/public/favicon.svg (a faithful
copy of lucide's Crown SVG paths, gold on a rounded navy square), fixed
the <link> tag to an absolute mount-prefixed path
(/studio/favicon.svg, not root — the exact bug already found and fixed
on 5 other mounts), copied the same file into
_deploy/studio-more30/public/studio/favicon.svg and fixed that
index.html's tag too, then deployed:
`vercel deploy --prod --yes --scope l023131500-ops-projects` from
_deploy/studio-more30 -> READY, dpl_8ZLdru79o9pVHfmThHd7JjnEhX95.

Verified: the live more30.com/studio/ HTML (cache-busted) now serves the
corrected <link> tag verbatim. A direct GET of
more30.com/studio/favicon.svg returned 200 but with an unrelated
image/webp+EXIF body instead of the SVG -- confirmed via the Vercel
Deployments API (GET /v13/deployments/{id}/files, which does not route
through the machine's NetFree content filter) that favicon.svg is
genuinely present at the correct path in the uploaded deployment tree,
so the HTTP mismatch is NetFree substituting its own icon locally, not a
production defect.

NEEDS_USER.md §0פ and SYSTEMS_STATUS.md updated: the "six remaining"
list is now five (bkalot, smachot, crm, gesher, kesef). apps/** and
_deploy/** are gitignored, so the code/asset changes themselves are not
in this commit -- only the QA evidence and doc updates are.$$,
'done',
$$commit on fix/nadlan-a11y, pushed. Real production deploy performed
(vercel deploy --prod, studio-more30 project) -- not test-mode-only,
but this is a static favicon asset with no data/billing/messaging
side effects. Protected systems
(08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873) not touched. Joins the
pending-heartbeat queue; run in commit order with the others.$$
);
