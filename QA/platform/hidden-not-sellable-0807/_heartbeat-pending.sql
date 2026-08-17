-- Pending heartbeat row — Supabase MCP was not connected this session.
-- Apply this insert (in commit order, after any earlier still-pending
-- _heartbeat-pending.sql / _heartbeat.sql files in the queue) once the MCP
-- is available again.
--
-- Work commit: (this commit) — "תחזוקה: hidden-not-sellable-0807 — סגירת דיף ישן שלא נשמר (ריצה חוזרת מ-08/08)"

insert into core.run_progress (phase, task, status, note)
values (
  'maintenance',
  'hidden-not-sellable-0807-stale-diff-close',
  'done',
  'Working tree had an uncommitted modification to QA/platform/hidden-not-sellable-0807/_results.json left over from a re-run of scripts/qa/hidden-not-sellable.mjs on 2026-08-08 (measured_at 2026-08-08T20:16:35.531Z, qa_account qa.offer+1786220194204908@more30.com, subscription id 196) that was never committed. Re-checked against the current SYSTEMS_STATUS.md entry (line ~2730, dated 07/08): same result, 83 pass / 0 fail, no behavioral change, no regression - the hidden-not-sellable guard (mechiron/crm and others hidden by 0032 draw no plans and report block=not_offered) still holds. Committed the stale diff to clear working-tree drift; no code change, no deploy.'
);
