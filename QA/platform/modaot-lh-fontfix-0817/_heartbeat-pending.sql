-- Pending heartbeat row — Supabase MCP was not connected this session.
-- Apply this insert (in commit order, after any earlier still-pending
-- _heartbeat-pending.sql / _heartbeat.sql files in the queue) once the MCP
-- is available again.
--
-- Work commit: this commit — "03 מודעות איגוד: תוקן שורש הפרפורמנס - Google
-- Fonts render-blocking -> next/font/google (perf 86->91)"

insert into core.run_progress (phase, task, status, note)
values (
  'anti-drift',
  'modaot-fontfix-0817',
  'done',
  'Round-2 (performance) sweep, continuing in system order after torah(01) and tamlul(02): 03 igud-ads (/modaot). modaot-lh-0817 (earlier today) measured performance=86 with render-blocking-insight flagging an estimated 880ms savings, not yet investigated. Root cause found by reading apps/03-igud-ads/app/layout.tsx directly: same failure family as 01/02/32 - a <link rel="stylesheet" href="fonts.googleapis.com/css2?family=Noto+Serif+Hebrew...&family=Rubik...&display=swap"> loaded directly in <head> (with preconnect hints, still render-blocking). Fixed by switching to next/font/google (Noto_Serif_Hebrew + Rubik, hebrew subset, display swap) in apps/03-igud-ads/app/layout.tsx, exposing --font-noto-serif-hebrew/--font-rubik CSS variables consumed by app/globals.css and tailwind.config.ts fontFamily (previously literal font-name strings in both). next build run locally first and verified: zero fonts.googleapis.com/css2 references anywhere under .next/, real woff2 files present under .next/static/media. Deployed vercel deploy --prod --yes --scope l023131500-ops-projects from apps/03-igud-ads (modaot-more30, dpl_6cEhpRGFgvXCrV1xzoqNjZphUjz7), READY. Verified live on more30.com/modaot with a cache-buster query param: no fonts.googleapis.com in the served HTML, .woff2 present (self-hosted preload). Re-ran scripts/qa/lighthouse-run.mjs against the live URL: performance 86->91 (crossed the DESIGN_STANDARD >=90 threshold), FCP 2.4s->2.1s, LCP 2.4s->2.1s, TBT 330ms->170ms; accessibility 100/SEO 100/bestPractices 77 unchanged (BP dominated by the already-documented NetFree card-injection.js pattern present on this filtered network, not a code issue). Updated SYSTEMS_STATUS.md (new dated entry + the 03 row in the systems table). Next in round-2 order: 04 imud-torani (perf 64, not yet investigated per SYSTEMS_STATUS.md row for system 04). Evidence: QA/platform/modaot-lh-0817/_lighthouse.json (before, perf 86), QA/platform/modaot-lh-fontfix-0817/_lighthouse.json (after, perf 91).'
);
