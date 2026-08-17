-- PENDING HEARTBEAT — Supabase MCP was not connected in this session (17/08/2026).
-- Insert this BEFORE inferring what is already done from core.run_progress —
-- otherwise the last row still in the table reads as the latest state and this
-- step reads as not-yet-started. `at` below is NOT the run time, it is a
-- placeholder — this was written from a file, not live.
-- Find the full queue with: git ls-files -- "*_heartbeat-pending.sql"
-- Run order = git log --oneline --reverse -- "*_heartbeat-pending.sql" (oldest commit first).

insert into core.run_progress (phase, task, status, note, at)
values (
  'anti-drift-sweep',
  'repo hygiene — remove verified-unused image assets from 3 live systems',
  'done',
  'RUN_INSTRUCTIONS smallest-next-step pass: the 17/08 late-afternoon full scan (NEEDS_USER.md) already concluded no new unblocked functional work exists — everything open is either a user decision or blocked on the Supabase MCP (still not connected this session, reconfirmed via ToolSearch). Independently reconfirmed the same: gannenet-incoming/ has no new ZIPs, the favicon queue is down to bkalot (protected) and kesef (source not vendored here), the dark-toggle backlog is 5/5 closed, and the RUN_INSTRUCTIONS-critical spec docs (more30-priority.md, more30-fixes-and-features.txt, BKALOT_CLONE/AUTOMATION_BUILD.md, MAATEFET_BUILD.md) are all already tracked in git. Found one small unblocked and verified item instead of inventing busywork: apps/21-mthbram/src/assets/agud-logo.png (1,356,654 bytes), apps/21-mthbram/src/assets/logo-igud.png (1,199,848 bytes), apps/01-torah-platform/src/assets/logo-igud.png (1,199,848 bytes), and apps/24-galilee-connect-hub/src/assets/logo-hazor.png (1,537,729 bytes) were all git-tracked but grep found zero references to any of the four filenames anywhere else in their respective app trees (src, public, config) — genuinely dead, never bundled. Removed all four via git rm, ~5.29MB off the working tree. No production code path touched, no deploy needed or performed — these were unreachable by any build. Evidence: this file records the verification method (grep across each apps/<n> tree returned 0 hits before deletion).',
  now()
);
