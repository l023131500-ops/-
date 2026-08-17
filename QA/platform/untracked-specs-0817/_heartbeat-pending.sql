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
  'repo hygiene — track more30-feature-expansion.md, referenced by more30-priority.md §9 but missing from git',
  'done',
  'RUN_INSTRUCTIONS smallest-next-step pass on fix/nadlan-a11y (17/08 late evening). The previous commit (8faffb5) already reconfirmed no new unblocked functional work exists this round: gannenet-incoming/ has no new ZIPs, POLISH_BACKLOG.md is 5/5 closed, the branch itself has 0 functional diff. Following up on f3069fd''s open note (~150 untracked root files need review before a blanket commit), cross-checked every file RUN_INSTRUCTIONS.md and more30-priority.md reference by exact filename against `git ls-files`: more30-priority.md, more30-fixes-and-features.txt, BKALOT_CLONE_BUILD.md, BKALOT_AUTOMATION_BUILD.md, MAATEFET_BUILD.md, MORE30_MASTER_BUILD.md were all already tracked. Found one real gap: more30-feature-expansion.md, named explicitly in more30-priority.md §9 ("read more30-feature-expansion.md and add the recommended features") as the required spec for the post-§1-8 feature-expansion phase, existed only on disk (3,243 bytes, last modified 05/08) — never committed. Same failure mode as BKALOT_CLONE_BUILD.md/BKALOT_AUTOMATION_BUILD.md before 9fc90aa fixed it: if the working tree were restored from a clean clone, this spec would silently vanish. Checked for secrets (grep eyJ/Bearer/service_role/password/api_key/sbp_/sk-/AIza — no matches) and committed it as-is (commit 06ec1b3), pushed to origin/fix/nadlan-a11y. The rest of the ~150 untracked root files (old docx/md planning drafts, run-loop .cmd scripts, historical QA screenshots) are not referenced by name anywhere in RUN_INSTRUCTIONS.md or more30-priority.md, so they are out of scope for this pass — left untouched, as before.',
  now()
);
