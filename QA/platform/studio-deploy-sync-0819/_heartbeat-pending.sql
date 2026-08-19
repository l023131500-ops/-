-- Supabase MCP not connected this session. Run this once MCP/access is available.
-- Insert BEFORE inferring what's already done from the latest row -- this run's
-- work (commit 55d787c) is real and already deployed/verified; only the DB
-- write is delayed. `at` is not the run time -- this is written from a file,
-- inserted later.
insert into core.run_progress (phase, task, status, note)
values (
  'design-system-graphics',
  'studio-deploy-dir-git-sync-0819',
  'done',
  '41 design-system checklist item 5 follow-up: the previous session left _deploy/studio-more30/api/ (Cardo font in the serverless FONTS list, 3 new category templates wired through composeTemplate for wedding_chasidic/rosh_hashana/hachnasat_sefer_torah, and the reseed-on-drift fix) modified on disk but never committed, even though its own commit message (103d430) claimed it was verified live. Re-verified live via Playwright with a cache-buster before touching anything: more30.com/studio/api/templates returned all 11 templates (4 original shiurim + the 3 new leading-category ones), 0 console errors -- production already matched the working tree exactly. Committed the already-deployed state as-is (commit 55d787c) so git HEAD matches production; no code or behavior changed, no redeploy needed. Zero regression: only closed a git-tracking gap.'
);
