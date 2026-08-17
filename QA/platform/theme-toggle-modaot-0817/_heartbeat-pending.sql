-- heartbeat: Supabase MCP is not connected in this session (ToolSearch for
-- mcp__supabase__* returned no matches), so core.run_progress is not
-- reachable from here by any route (heartbeat-needs-mcp-anon-key-cannot).
--
-- Joins the existing queue (see QA/*/*-0817/_heartbeat-pending.sql for the
-- full list) -- run all pending files in git-log commit order, not folder-name
-- order. Delete each file once its row lands.

insert into core.run_progress (phase, task, status, note) values (
'POLISH_BACKLOG.md — 03 modaot (igud-ads): manual dark-mode toggle added',
$$Continues the theme-toggle-tamlul-0817 item: 02 (tamlul) closed first
since it was already open in context; 03 (modaot) picked next, same repo
family (Next.js, igud-shiurim group).

Added: components/ThemeToggle.tsx, a client component rendering a moon/sun
button that toggles the .dark class on <html> and persists to
localStorage['modaot-theme']. Unlike 02, 03's home page
(app/(public)/page.tsx) does not use the shared components/SiteHeader.tsx --
it has its own inline header with a dark gradient background -- so
ThemeToggle was updated to accept a className prop (default btn-outline,
which would have been unreadable on that gradient) and wired into both
SiteHeader.tsx (used by /transcribe/upload and /transcribe/success) and
directly into the home page nav with a style matching its existing white/gold
link treatment. app/layout.tsx's pre-paint THEME_BOOT script now reads
localStorage before falling back to matchMedia(prefers-color-scheme: dark)
-- same pattern as 02/10.

Verified: `next build` (apps/03-igud-ads) succeeded; `next start` on a local
port with basePath /modaot, then Playwright on both the home page and
/transcribe/upload: first load follows localStorage/OS as before -> click
toggle -> classList.contains('dark') true, localStorage='dark', body
background rgb(15,18,24) -> reload keeps dark, no flash -> click again ->
back to light, localStorage='light', label reverts to the moon icon. Same
click-and-verify sequence reproduced live at
https://more30.com/modaot/?cachebust=0817modaot. Screenshots (light vs dark,
hashes differ): QA/platform/theme-toggle-modaot-0817/{light,dark}.png.

Deploy: apps/03-igud-ads carries its own Vercel project link
(.vercel/project.json -> modaot-more30, prj_3i1BSUVSNU9oSOrpzr4usx2Bgcxq), so
`vercel deploy --prod --scope l023131500-ops-projects` was run directly from
that app directory -- dpl_7kpTybzinumhjbwUeGDaErsk2D5f.

Protected: did not touch 08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. No
DB writes, no leads, no send channel touched -- display-only change to
system 03 (igud-ads, not protected).

Remaining in POLISH_BACKLOG for this item: 06 (kupot-holim) is Next.js and 35
(kioskfleet) is Vite -- same shape of change, left for future steps, one
system per step per the anti-drift step-cap rule.$$,
'done',
$$Deployed and verified live 17/08/2026. Commit on fix/nadlan-a11y, pushed.
Joins the pending-heartbeat queue; run in commit order with the others.$$
);
