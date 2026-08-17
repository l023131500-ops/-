-- heartbeat: Supabase MCP is not connected in this session (ToolSearch for
-- mcp__supabase__* and for execute_sql/postgres tools both returned no
-- matches), and no SUPABASE_ACCESS_TOKEN is available on disk (it lives in
-- core.secrets, behind the same MCP that is down). core.run_progress is not
-- reachable from here by any route this session.
--
-- Joins the existing queue (see QA/*/*-0817/_heartbeat-pending.sql and the
-- root _heartbeat-pending.sql for the full list) — run all pending files in
-- git-log commit order, not folder-name order. Delete each file once its row
-- lands.

insert into core.run_progress (phase, task, status, note) values (
'anti-drift sweep — NEEDS_USER.md §0ט tivuch/kesef footer touch-target fix re-checked, stale block corrected',
$$nadlan-kesef-footer-recheck-0817 — NEEDS_USER.md §0ט ("מכסת הפריסות של
Vercel — mthbram ירד, הפורטל נכנס לתור", 07/08/2026) still carried, inside
its own body, an unstruck claim that two fixes (sites/36-nadlan-pro/tivuch
footer touch-target padding, sites/34-kesef/kesef same) were "written in
code and waiting on the Vercel deploy quota to reset" — worded as blocking,
with an explicit "what I need from you: wait for the quota reset, or
upgrade the plan" ask. This is a second, separate copy of the same stale
claim the immediately preceding commit (9df44ca) already closed at §0ג —
that commit fixed the general quota-exhausted header but did not touch this
literal table further down the file.

Re-measured live this session: node scripts/qa/platform-audit.mjs against
https://more30.com/tivuch and https://more30.com/kesef, desktop+mobile+dark
(6 checks total) — smallTargets: 0 in all six, and the served HTML for both
routes contains .footer a{text-decoration:underline;display:inline-block;
padding:3px 0}, byte-identical to the source in sites/36-nadlan-pro/tivuch/
index.html and sites/34-kesef/kesef/index.html. Both fixes are already
deployed; nothing is waiting on a Vercel quota that itself stopped existing
on 12/08. Struck the stale "waiting on deploy" text and the "what I need
from you" ask, added a dated 17/08 confirmation. No code change, no
deploy — documentation correction only, second NEEDS_USER-side stale
blocker found today.

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. אפס שורות
נכתבו בפועל בריצה הזו — אין גישת DB בכלל.

ראיות: QA/platform/nadlan-kesef-footer-recheck-0817/_results.json (+ 6
screenshots).$$,
'done',
$$commit on fix/nadlan-a11y, pushed. Anti-drift sweep: found and corrected a
second, independent stale "waiting on Vercel deploy quota" claim in
NEEDS_USER.md §0ט (the first, at §0ג, was already closed by the prior
commit 9df44ca this same session/branch). Live re-measurement confirms both
referenced fixes (tivuch, kesef footer touch targets) are deployed and
correct: platform-audit.mjs desktop+mobile+dark against both routes returns
smallTargets:0 across all six checks, matching the on-disk source exactly.
Doc-only change — struck the stale text, added a dated resolution note.
Joins the pending-heartbeat queue; run in commit order.$$
);
