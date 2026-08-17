-- heartbeat: Supabase MCP is not connected in this session (ToolSearch for
-- mcp__supabase__* returned no matches), so core.run_progress is not
-- reachable from here by any route (heartbeat-needs-mcp-anon-key-cannot).
--
-- Joins the existing queue (see QA/*/*-0817/_heartbeat-pending.sql for the
-- full list) — run all pending files in git-log commit order, not folder-name
-- order. Delete each file once its row lands.

insert into core.run_progress (phase, task, status, note) values (
'POLISH_BACKLOG.md — 10 bkalot-rights: manual dark-mode toggle added',
$$POLISH_BACKLOG.md flagged 5 systems (02/03/06/10/35) that follow
prefers-color-scheme but have no visible manual toggle. 10-bkalot-rights is
the only one of the five that is a plain static site (index.html/app.js/
style.css, no build step) so it was the smallest item to close first.

Added: head script in index.html now checks localStorage['bkalot-theme']
before falling back to matchMedia (applied pre-paint, no flash); a
#themeToggle button (moon/sun) next to #adminLink in the nav; a click
handler in app.js that flips the .dark class and persists the choice;
.theme-toggle styling in style.css matching existing --border/--teal tokens.

Verified with Playwright, both locally (static server on the /bkalot/ base
path so the existing <base href="/bkalot/"> resolves assets) and against
production: first load light (isDark:false, localStorage:null) -> click ->
isDark:true, localStorage:'dark', body background rgb(18,19,15) -> reload
keeps dark (no white flash) -> click again returns to light and
localStorage:'light'. Same sequence reproduced live at
https://more30.com/bkalot/?cachebust=0817b. Screenshots:
QA/platform/theme-toggle-bkalot-0817/{before-toggle,after-toggle,
live-after-toggle}.png.

Deploy: compared apps/10-bkalot-rights/{index.html,app.js,style.css} against
_deploy/bkalot-more30/bkalot/* before copying — only diff was a BOM, no
content drift, so the copy was safe. Copied the three files and ran
vercel deploy --prod --scope l023131500-ops-projects from _deploy/bkalot-more30
(dpl_AXcBDcJmUAG3ya6b635B5wqPkhK9).

Protected: did not touch 08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873.
No DB writes, no leads, no send channel touched — display-only change to
system 10 (bkalot-rights, not protected — distinct from 08/09).

Remaining in POLISH_BACKLOG for this item: 02 (igud-transcribe), 03
(igud-ads), 06 (kupot-holim), 35 (kioskfleet) are Next.js/Vite apps and need
a build step each — left for a future step, one system per step per the
anti-drift step-cap rule.$$,
'done',
$$Deployed and verified live 17/08/2026. Commit on fix/nadlan-a11y, pushed.
Joins the pending-heartbeat queue; run in commit order with the others.$$
);
