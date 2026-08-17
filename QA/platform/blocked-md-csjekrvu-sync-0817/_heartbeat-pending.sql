-- PENDING HEARTBEAT — insert this BEFORE inferring what's already done from
-- core.run_progress. The Supabase MCP was not connected in this session
-- (only playwright was), so this row could not be written live. `at` below
-- is NOT the run time — it is written late, from this file, whenever the
-- next session with MCP access picks it up. Insert in git-commit order
-- alongside any other _heartbeat-pending.sql files still queued.

insert into core.run_progress (phase, task, status, note, at)
values (
  'docs',
  'BLOCKED.md sec 0/4 csjekrvu stale premise sync',
  'done',
  'BLOCKED.md sections 0 and 4 still said "csjekrvu is a different Supabase account, we have no access to it" — a premise NEEDS_USER.md #2 already corrected on 17/08 (commit f78b292): the global SUPABASE_ACCESS_TOKEN in core.secrets does reach csjekrvukbdznetsrodj via the Management API (verified 12/08 against this exact ref: mailer_autoconfirm flip + geo.ts deploy, both confirmed working). That fix landed in NEEDS_USER.md but BLOCKED.md was never updated to match, so a session reading only BLOCKED.md would still conclude "different account, needs a new PAT from the user" and waste a step re-deriving what was already known. Rewrote sec 0 to say the real, narrower blocker is this session not having the Supabase MCP connected (needed to read the PAT out of core.secrets before it can be used), not a missing/foreign account, and that step 1 of db/apps/17-chizukim-transcribe/0001_close_public_write_on_recordings.sql needs nothing further from the user. Also rewrote sec 4, which repeated the same stale composite claim for a different sub-feature (per-user recording history): that one genuinely still needs the user, but to create an app-level secret key for server/routes.ts, not the same thing as the global management PAT — the old wording conflated the two. Doc-only change, no code, no deploy, no protected system touched. Evidence: QA/platform/blocked-md-csjekrvu-sync-0817/.',
  now()
);
