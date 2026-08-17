-- PENDING HEARTBEAT — insert this BEFORE inferring what's already done from
-- core.run_progress. The Supabase MCP was not connected in this session
-- (only playwright was), so this row could not be written live. `at` below
-- is NOT the run time — it is written late, from this file, whenever the
-- next session with MCP access picks it up. Insert in git-commit order
-- alongside any other _heartbeat-pending.sql files still queued.

insert into core.run_progress (phase, task, status, note, at)
values (
  'anti-drift',
  'smel (12) geocode-city fix #158 — NEEDS_USER.md recheck',
  'done',
  'NEEDS_USER.md §0ת described the smel/nadlan geocode-city fix as written-but-blocked (no access to csjekrvukbdznetsrodj). That was stale: it was deployed 12/08 via commit c01cf60 using the global Supabase PAT. Re-ran scripts/qa/smel-prod-geocode-city.mjs read-only against production today: 3/3 passed (Jerusalem/Haifa/Tel Aviv all matched correct locality+code+coords), no regression in 5 days. Updated NEEDS_USER.md to mark it closed instead of still asking the user for an approval that is moot. No code change, no deploy, no protected system touched. Commit 2065d98, pushed to fix/nadlan-a11y. Evidence: QA/smel/geocode-city-recheck-0817/_results.json. Heartbeat written late as this pending file because the Supabase MCP was not connected this session.',
  now()
);
