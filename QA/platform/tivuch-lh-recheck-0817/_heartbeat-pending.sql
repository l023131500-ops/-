-- heartbeat: Supabase MCP is not connected in this session (ToolSearch for
-- mcp__supabase__* returned no matches), so core.run_progress is not
-- reachable from here. Joins the existing queue (see QA/*/*-0817/
-- _heartbeat-pending.sql for the full list) — run all pending files in
-- git-log commit order, not folder-name order. Delete each file once its
-- row lands.

insert into core.run_progress (phase, task, status, note) values (
'36 tivuch (nadlan-pro) — SYSTEMS_STATUS.md Lighthouse figure synced to reality',
$$tivuch-lh-recheck-0817 — SYSTEMS_STATUS.md line ~3578 read "חדשה. Lighthouse
95/100/100 (נמדד 07/08)" for system 36 (נדל"ן פרו, more30.com/tivuch). That was
stale: NIGHT_PROGRESS.md (03/08 night-log entries) records the a11y fix that
took it from 95 to 100 that same night, and the score since then is
perf 98 · a11y 100 · SEO 100 · BP 77, not a flat 95/100/100.

Verified against the raw Lighthouse audit JSON at QA/shots/lh-tivuch.json:
the only two failing audits (score 0) are "third-party-cookies" and
"inspector-issues", both weighted into Best Practices. Both are caused by
NetFree (the Israeli content-filter proxy this machine sits behind)
injecting its own cookies/resources into every request platform-wide — not
a tivuch-specific defect, and not fixable from this app's source. There is
no accessibility gap left to fix; a11y is already 100.

Corrected SYSTEMS_STATUS.md's table row to: "Lighthouse perf 98 · a11y 100 ·
SEO 100 · BP 77 (חסימת NetFree, לא ניתן לתיקון בקוד)". No app code changed,
no deploy performed — this was a documentation-accuracy fix only, found via
an Explore-agent sweep for the smallest safe next step (most open
NEEDS_USER.md items this session either need the Supabase Management API,
which is unreachable without the MCP, or a user decision).$$,
'done',
$$commit on fix/nadlan-a11y (3c92398), pushed. Docs-only change, real data
(cited against the actual QA/shots/lh-tivuch.json Lighthouse run). No
protected system touched (08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873).
Joins the pending-heartbeat queue; run in commit order with the others.$$
);
