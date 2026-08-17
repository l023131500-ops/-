-- PENDING HEARTBEAT — Supabase MCP was not connected in this session (17/08/2026).
-- Insert this BEFORE inferring what is already done from core.run_progress —
-- otherwise the last row still in the table reads as the latest state and this
-- step reads as not-yet-started. `at` below is NOT the run time, it is a
-- placeholder — this was written from a file, not live.
-- Find the full queue with: git ls-files -- "*_heartbeat-pending.sql"
-- Run order = git log --oneline --reverse -- "*_heartbeat-pending.sql" (oldest commit first).

insert into core.run_progress (phase, task, status, note, at)
values (
  'repo-hygiene',
  '40 gannenet — track 16 orphan source files never git add -f''d, incl. app/page.tsx',
  'done',
  'RUN_INSTRUCTIONS smallest-next-step pass on fix/nadlan-a11y (17/08 late evening, following 3b9656b). Ran scripts/qa/untracked-imports.mjs (the repo''s own detector for the apps/** git-add-f trap) across all roots: found 4 imported-but-not-tracked hits and 51 orphan-source hits across two apps (35-kioskfleet, 40-gannenet). 35-kioskfleet is out of scope — per memory kiosk-deploys-from-a-different-repo, it builds from l023131500-ops/zol via Railway, not from this monorepo, so its tracking gap does not affect what actually deploys. 40-gannenet does deploy from this repo and was the real gap: app/page.tsx (the home route itself), app/globals.css (imported by the already-tracked layout.tsx), components/PdfViewer.tsx, components/RegisterSW.tsx, 7 lib/*.ts files, and 4 build-config files (next.config.js, tailwind.config.ts, postcss.config.js, next-env.d.ts) existed on disk and were imported by already-tracked source, but were never force-added past the apps/** .gitignore rule — whoever committed layout.tsx/generator/page.tsx/the API routes stopped there. A clean clone of this repo would have a gannenet app whose home page does not exist; next build would fail. Verified via git check-ignore -v that all 16 files matched only the blanket /apps/** rule (not a deliberate per-file exclusion), grepped them for hardcoded secrets (SUPABASE_SERVICE_ROLE_KEY / service_role / API_KEY literals — none found, only process.env.* reads, consistent with the rest of the tracked tree), git add -f''d all 16, and re-ran the scanner scoped to 40-gannenet: 0 untracked / 0 orphan / 0 missing (was 1/15/0 before). No code changed — pure git-tracking fix, consistent with the existing convention that apps/** source is force-added file-by-file (2486 files already tracked that way before this commit). Committed 9ad27a0, pushed to origin/fix/nadlan-a11y.',
  now()
);
