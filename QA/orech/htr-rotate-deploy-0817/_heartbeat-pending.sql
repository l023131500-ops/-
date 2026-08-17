-- PENDING HEARTBEAT — insert this BEFORE inferring what's already done from
-- core.run_progress. The Supabase MCP was not connected in this session
-- (only playwright was), so this row could not be written live. `at` below
-- is NOT the run time — it is written late, from this file, whenever the
-- next session with MCP access picks it up. Insert in git-commit order
-- alongside any other _heartbeat-pending.sql files still queued.

insert into core.run_progress (phase, task, status, note, at)
values (
  'feature-deploy',
  '18 orech (torah-editor-mvp) — HTR rotate/flip/preview deploy',
  'done',
  'more30-fixes-and-features.md asked for a rotate/flip button plus a pre-submit preview on the handwriting-photo upload flow. The feature was already fully implemented in apps/18-torah-editor-mvp/app/htr/page.tsx (bakeTransform() bakes rotation/flip into the actual uploaded PNG via canvas, live CSS-transform preview, buttons for rotate-left/rotate-right/flip-horizontal/reset) by commit 6dca79f (2026-08-05T14:01:38+03:00) but was never deployed: the last production deployment of orech-more30 (dpl_uUVhZzmTCf2e5pEKE4T7m8iMURVz) was created at 2026-08-05T10:58:21Z, three minutes before that commit, and the live JS bundle for /orech/htr contained no rotation/flip strings at all. Ran npm run build (succeeded, 11 pages) and npx vercel deploy --prod --yes --scope l023131500-ops-projects from apps/18-torah-editor-mvp; new deployment dpl_E3ZzrZGmYsfDmx92roqZwEnwGvnk, READY, aliased to orech-more30.vercel.app. Verified against more30.com/orech/htr after deploy: the same-hashed JS chunk grew from 4,070 to 10,753 bytes and now contains the raw UTF-8 Hebrew strings for rotate-left/rotate-right/flip/reset (checked on raw bytes, not NetFree-rendered text); Playwright screenshot at 1280x900 shows the upload form and existing job list rendering cleanly with no regression. Also checked chizukim (17) for an equivalent handwriting/image flow — it does not have one, it is audio-transcription only, so no equivalent fix applies there. No source code change, no protected system touched, no real file uploaded. Evidence: QA/orech/htr-rotate-deploy-0817/_results.md.',
  now()
);
