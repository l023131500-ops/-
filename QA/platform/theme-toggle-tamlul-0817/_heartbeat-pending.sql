-- heartbeat: Supabase MCP is not connected in this session (ToolSearch for
-- mcp__supabase__* returned no matches), so core.run_progress is not
-- reachable from here by any route (heartbeat-needs-mcp-anon-key-cannot).
--
-- Joins the existing queue (see QA/*/*-0817/_heartbeat-pending.sql for the
-- full list) — run all pending files in git-log commit order, not folder-name
-- order. Delete each file once its row lands.

insert into core.run_progress (phase, task, status, note) values (
'POLISH_BACKLOG.md — 02 tamlul (igud-transcribe): manual dark-mode toggle added',
$$Continues the theme-toggle-bkalot-0817 item: POLISH_BACKLOG.md flagged 02
(tamlul), 03 (modaot), 06 (briut), 35 (kiosk) as needing a build step each
after 10-bkalot-rights (the only static, no-build one) closed first. 02 was
picked next since it was already open in context.

Added: components/ThemeToggle.tsx, a client component rendering a moon/sun
button that toggles the .dark class on <html> and persists to
localStorage['tamlul-theme'], wired into components/SiteHeader.tsx's nav.
app/layout.tsx's pre-paint THEME_BOOT script now reads localStorage before
falling back to matchMedia(prefers-color-scheme: dark) — same pattern as
/bkalot. tailwind.config.ts already had darkMode:"class", so no Tailwind
config change was needed.

Verified: `next build` (apps/02-igud-transcribe) succeeded; `next start` on
a local port with basePath /tamlul, then Playwright: first load follows
localStorage/OS as before -> click toggle -> classList.contains('dark')
true, localStorage='dark', body background rgb(20,22,28) -> reload keeps
dark, no flash -> click again -> back to light, localStorage='light', label
reverts to the moon icon. Same click-and-verify sequence reproduced live at
https://more30.com/tamlul/?cachebust=0817tamlul. Screenshot:
QA/platform/theme-toggle-tamlul-0817/live-dark.png.

Deploy: apps/02-igud-transcribe carries its own Vercel project link
(.vercel/project.json -> tamlul-more30, prj_i8KRFIs4jtqPuEf4mt5b11RHjRQN),
so `vercel deploy --prod --scope l023131500-ops-projects` was run directly
from that app directory (not through _deploy/) — dpl_yWB9XZBxQn5JKW8kyWWTZEg4fboE.

Protected: did not touch 08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. No
DB writes, no leads, no send channel touched — display-only change to
system 02 (igud-transcribe, not protected).

Remaining in POLISH_BACKLOG for this item: 03 (igud-ads), 06 (kupot-holim)
are Next.js and 35 (kioskfleet) is Vite — same shape of change, left for
future steps, one system per step per the anti-drift step-cap rule.$$,
'done',
$$Deployed and verified live 17/08/2026. Commit on fix/nadlan-a11y, pushed.
Joins the pending-heartbeat queue; run in commit order with the others.$$
);
