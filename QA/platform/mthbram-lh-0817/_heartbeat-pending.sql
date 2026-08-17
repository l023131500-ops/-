-- PENDING heartbeat row — written 2026-08-17 because the Supabase MCP was not
-- connected this session (no route to core.secrets / SUPABASE_ACCESS_TOKEN).
-- Insert this BEFORE inferring what is already done from later heartbeat rows —
-- `at` below is the commit time, not the time this row is actually inserted.
insert into core.run_progress (phase, task, status, note, at)
values (
  'lighthouse-sweep-0817',
  'mthbram-lh-0817',
  'done',
  'System 21 (mthbram): first-ever Lighthouse measurement vs https://more30.com/mthbram — perf 45, a11y 90->100 (2 real defects fixed and redeployed): (1) tailwind.config.ts was missing the gold-cream color entirely, so every text-gold-cream* class in Footer.tsx silently no-opped and rendered footer text the same colour as its own background (contrast ratio 1.08) -- added cream to the gold color group; (2) Index.tsx had no <main> landmark -- wrapped the body content. Also fixed a pre-existing build-breaking bug unrelated to a11y: 3 pages (StudyDayUpload.tsx, BulkUpload.tsx, SynagoguePortal.tsx) imported a src/assets/agud-logo.png that does not exist on disk, which failed `vite build` outright -- repointed all three to the already-vendored agud-logo-mark.jpg (same file BrandLogo.tsx already uses). Rebuilt, robocopy mirrored into _deploy/mthbram-more30/mthbram, deployed to production via vercel CLI, verified new JS/CSS bundle hashes live on a cache-busted fetch, and re-ran Lighthouse to confirm a11y 100. Performance (45) is below the 90 threshold and not investigated this step. SYSTEMS_STATUS.md row 21 updated. Commits on fix/nadlan-a11y (see git log for hashes). Continues the 17/08 lighthouse-sweep after 02/04/06/10/12/14/15/16/17/18/22/26/28/32/34.',
  '2026-08-17T14:10:00.000Z'
);
