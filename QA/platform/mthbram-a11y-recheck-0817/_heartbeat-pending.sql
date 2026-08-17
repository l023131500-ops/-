-- heartbeat: Supabase MCP is not connected in this session (ToolSearch for
-- mcp__supabase__* returned no matches), so core.run_progress is not
-- reachable from here this run.
--
-- Joins the existing queue (see QA/*/*-0817/_heartbeat-pending.sql for the
-- full list and run order) — run all pending files in git-log commit order,
-- not folder-name order. Delete each file once its row lands.

insert into core.run_progress (phase, task, status, note) values (
'anti-drift — SYSTEMS_STATUS.md: 21 mthbram dark-mode row re-measured, already live',
$$mthbram-a11y-recheck-0817 — smallest-next-step pass per RUN_INSTRUCTIONS.md.
Supabase MCP unavailable this session (no mcp__supabase__* tool, confirmed
via ToolSearch), so picked a doc-accuracy task that needs no DB access,
continuing the same anti-drift sweep the last four commits on this branch
were doing (04/27, 15/24, 30/31, 32 nadlan — all found already deployed).

SYSTEMS_STATUS.md's "מצב כהה" table still had one open row: "21 mthbram | ...
| ⏳ ממתין לפריסה". Unlike the other four, mthbram was never missing a dark
theme — its :root IS a dark theme built from the logo. The row covers two
different fixes bundled in commit 98faa28 (apps/21-mthbram/index.html):
(1) declaring `color-scheme: dark` so browser-native controls (inputs,
selects, scrollbars) stop rendering light-mode on a dark page, and (2) adding
the shared login button, since mthbram (with /modaot) was the only system
missing it.

Checked both directly against production:
  GET https://more30.com/mthbram/assets/index-Y-yk4Tud.css
    -> 200, body contains "color-scheme:dark"
  GET https://more30.com/mthbram/
    -> 200, body contains <script src="https://more30.com/auth-button.js" defer>

Both parts are live. Updated the table row (strikethrough + re-checked note,
same convention as the four prior rechecks) and added a dated entry at the
top of SYSTEMS_STATUS.md. No code change, no deploy, no protected system
touched — docs + one new QA folder only.

Evidence: QA/platform/mthbram-a11y-recheck-0817/_results.json$$,
'ok',
$$commit on fix/nadlan-a11y, pushed. Docs-only step: closed the last open row
in SYSTEMS_STATUS.md's dark-mode table (21 mthbram) — re-measured live
against production, both the color-scheme:dark declaration and the login
button it was waiting on are already deployed (commit 98faa28). No DB access
this session (no Supabase MCP) — joins the pending-heartbeat queue, run in
commit order.$$
);
