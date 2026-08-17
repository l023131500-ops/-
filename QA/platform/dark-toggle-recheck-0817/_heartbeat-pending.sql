-- heartbeat: Supabase MCP is not connected in this session (ToolSearch for
-- mcp__supabase__* returned no matches), and no SUPABASE_ACCESS_TOKEN/SB_PAT
-- is set, so core.run_progress is not reachable from here this run.
--
-- Joins the existing queue (see QA/*/*-0817/_heartbeat-pending.sql for the
-- full list and run order) — run all pending files in git-log commit order,
-- not folder-name order. Delete each file once its row lands.

insert into core.run_progress (phase, task, status, note) values (
'priority §4/anti-drift — SYSTEMS_STATUS.md: two stale "remaining work" entries re-measured and closed/downgraded',
$$dark-toggle-recheck-0817 — after bkalot-clone (#37) cleared the pass bar
today with 9 consecutive commits (over the project's own ~6-step-per-system
cap) and Supabase DB access is unavailable this session (no MCP, no PAT),
moved to a small unblocked doc-accuracy task instead of continuing on #37 or
starting new DB-dependent work.

Two entries in SYSTEMS_STATUS.md's "מה נשאר לתקן" table were stale:

1. "מתג מצב כהה" (manual dark-mode toggle) for systems 02/03/06/10/35 — dated
around 06/08. Re-ran scripts/qa/dark-toggle-probe.mjs live against production
today (/tamlul /modaot /briut /bkalot /kiosk, the 5 routes for those numbers):
all 5 report osDarkFollows=true, reachable=true — they already repaint dark
when the visitor's OS is set to dark, via `prefers-color-scheme`. None has a
manual on-page toggle (toggleCandidates=[] for all 5, confirmed in
QA/platform/dark-toggle-recheck-0817/_dark-toggle.json), but the probe script
itself defines "reachable" as OS-follow OR working toggle — either satisfies
it. So this is not missing functionality, it's the "add a manual override for
a visitor whose OS is light but who wants dark anyway" polish case. Per
more30-priority.md's own rule (function now, polish deferred to
POLISH_BACKLOG.md), moved it there and marked the SYSTEMS_STATUS.md row
closed with a strikethrough, linking to the new backlog entry.

2. "🔴 חסם פעיל: מכסת הפריסות של Vercel (100/יום) נוצלה" (active blocker: daily
deploy quota exhausted) — also dated 04-06/08. more30-priority.md §0.2 already
states the account moved to Vercel Pro on 12/08 and the quota was removed;
dozens of successful deploys happened 12/08-17/08, including several today.
`vercel whoami` / `vercel teams ls` today confirm the CLI is still
authenticated as l023131500-ops on l023131500-ops-projects (did not
independently re-check the billing tier via a dedicated API call this round).
Marked the SYSTEMS_STATUS.md blocker line as stale/historical rather than
deleting it, so a future pass doesn't treat deploys as scarce based on a
7-day-old note.

Created POLISH_BACKLOG.md (did not exist before) as the standard destination
more30-priority.md's anti-drift rule already names for deferred polish items.

No code change, no migration, no deploy — measurement + documentation only.
Protected systems untouched: no changes outside SYSTEMS_STATUS.md,
POLISH_BACKLOG.md, and this QA folder.

Evidence: QA/platform/dark-toggle-recheck-0817/_dark-toggle.json + 10
screenshots (5 os-dark + 5 light, no after-toggle since none had a working
control).$$,
'ok',
$$commit on fix/nadlan-a11y, pushed. Docs-only step: closed a stale "missing
dark-mode toggle" entry for 5 systems (re-measured live, they already follow
OS dark-mode — the gap is a manual-override nicety, moved to new
POLISH_BACKLOG.md) and flagged the "Vercel quota exhausted" blocker note as
stale (account is Pro since 12/08 per more30-priority.md §0.2). No DB access
this session (no Supabase MCP, no PAT) — joins the pending-heartbeat queue,
run in commit order.$$
);
