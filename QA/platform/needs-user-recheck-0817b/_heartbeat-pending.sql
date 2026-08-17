-- PENDING HEARTBEAT — Supabase MCP was not connected in this session (17/08/2026).
-- Insert this BEFORE inferring what is already done from core.run_progress —
-- otherwise the last row still in the table reads as the latest state and this
-- step reads as not-yet-started. `at` below is NOT the run time, it is a
-- placeholder — this was written from a file, not live.
-- Find the full queue with: git ls-files -- "*_heartbeat-pending.sql"
-- Run order = git log --oneline --reverse -- "*_heartbeat-pending.sql" (oldest commit first).

insert into core.run_progress (phase, task, status, note, at)
values (
  'anti-drift',
  'needs-user recheck 17/08 (evening) on fix/nadlan-a11y',
  'done',
  'RUN_INSTRUCTIONS smallest-next-step pass: independently re-verified the late-afternoon full-sweep conclusion (no unblocked functional work). gannenet-incoming/ has only a done/ subfolder (0 new ZIPs, standing §0.3 check). POLISH_BACKLOG.md dark-toggle item is 5/5 closed, nothing else queued. fix/nadlan-a11y branch itself carries no working-tree diff — both checks it was created for (32 nadlan dark-mode, auth-button overlap) were already re-measured as not-active-gaps earlier the same day. Tried one genuinely new angle before falling back to documentation: searched for unused large image assets the way dead-assets-cleanup-0817 found 4 real ones. apps/01-torah-platform/src/assets/hero-microphone.png and apps/21-mthbram/src/assets/hero-microphone.png (322KB each) looked unreferenced via Grep, but apps/** is gitignored so Grep silently skips it (see memory app-sources-are-gitignored) — Select-String confirmed both ARE imported in their respective HeroSection.tsx. Correctly did NOT delete them. No code change, no deploy. Recorded the false lead in NEEDS_USER.md so a future run does not repeat the same Grep mistake or re-run the same sweep. Written as a pending file because the Supabase MCP was not connected this session.',
  now()
);
