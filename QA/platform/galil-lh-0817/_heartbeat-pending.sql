-- PENDING heartbeat row — written 2026-08-17 because the Supabase MCP was not
-- connected this session (no route to core.secrets / SUPABASE_ACCESS_TOKEN).
-- Insert this BEFORE inferring what is already done from later heartbeat rows —
-- `at` below is the commit time, not the time this row is actually inserted.
insert into core.run_progress (phase, task, status, note, at)
values (
  'lighthouse-sweep-0817',
  'galil-lh-0817',
  'done',
  'System 24 (galil): Lighthouse measurement vs https://more30.com/galil -- a11y was already-measured at 94, not 100 as SYSTEMS_STATUS.md implied. perf 32->36, a11y 94->100 (2 real defects fixed and redeployed): (1) color-contrast (ratio 4:1 on 3 CTA buttons using bg-primary/text-primary-foreground -- the --primary Tailwind token in index.css was 200 85% 40%, too light for the white foreground text to hit 4.5:1 -- darkened to 35% lightness, a global token change so it fixes every bg-primary button sitewide, new ratio ~5:1); (2) Index.tsx had no <main> landmark -- wrapped the body content. Also fixed a pre-existing build-breaking bug unrelated to a11y: 3 pages (ContactPage.tsx, GabaiPortal.tsx, ReligiousInfoPage.tsx) imported a src/assets/logo-hazor.png that does not exist on disk, which failed `vite build` outright -- repointed all three to the already-vendored logo-mechubarim.png. Rebuilt, robocopy mirrored into _deploy/galil-more30/galil, deployed to production via vercel CLI twice (once per fix), verified new JS bundle hash live on a cache-busted fetch each time, and re-ran Lighthouse to confirm a11y 100. Performance (36) is below the 90 threshold and not investigated this step. SYSTEMS_STATUS.md row 24 updated. Continues the 17/08 lighthouse-sweep after 02/04/06/10/12/14/15/16/17/18/22/26/28/32/34/21.',
  '2026-08-17T14:25:00.000Z'
);
