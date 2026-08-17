-- Pending heartbeat row — Supabase MCP was not connected this session.
-- Apply this insert (in commit order, after any earlier still-pending
-- _heartbeat-pending.sql / _heartbeat.sql files in the queue) once the MCP
-- is available again.
--
-- Work commit: this commit — "02 תמלול איגוד: תוקן שורש הפרפורמנס - Google
-- Fonts render-blocking -> next/font/google (perf 64->95)"

insert into core.run_progress (phase, task, status, note)
values (
  'anti-drift',
  'tamlul-fontfix-0817',
  'done',
  'Round-2 (performance) sweep, continuing in system order after torah(01): 02 igud-transcribe (/tamlul). tamlul-lh-0817 (earlier today) measured performance=64 and flagged it not-yet-investigated. Root cause found by reading the live HTML head (app sources are gitignored so grep misses them - read apps/02-igud-transcribe/app/layout.tsx directly): a <link rel="stylesheet" href="fonts.googleapis.com/css2?family=Noto+Serif+Hebrew...&family=Rubik...&display=swap"> loaded directly in <head>, same failure family as the already-fixed 32-nadlan case (there it was a CSS @import; here a <link> tag) - render-blocking-insight measured 1,510ms estimated savings. Fixed by switching to next/font/google (Noto_Serif_Hebrew + Rubik, hebrew subset, display swap) in apps/02-igud-transcribe/app/layout.tsx, exposing --font-noto-serif-hebrew/--font-rubik CSS variables consumed by tailwind.config.ts fontFamily (previously literal font-name strings). next build run locally first to catch any next/font/google export-name mismatch before deploying; verified zero fonts.googleapis.com references in the prerendered .next/server/app/index.html and real woff2 files present under .next/static/media. Deployed vercel deploy --prod from apps/02-igud-transcribe (tamlul-more30, dpl_Dt7kPw5DwwGkgSW6YGVtkQT7oV5m), READY. Verified live on more30.com/tamlul with a cache-buster (following the 308 redirect manually, since HttpWebRequest does not auto-follow 308): head now has <link rel=preload as=font> pointing at self-hosted woff2, no fonts.googleapis.com anywhere in the page. Re-ran scripts/qa/lighthouse-run.mjs against the live URL: performance 64->95 (crossed the DESIGN_STANDARD >=90 threshold), accessibility 98->100 (includes the heading-order fix from earlier today), FCP 4.0s->1.7s, LCP 4.0s->2.2s, SI 8.3s->3.2s, render-blocking-insight savings 1,510ms->220ms. Remaining below-threshold audits (mainthread-work-breakdown 2.3s, third-party-cookies, unused-javascript) not investigated in this step - deferred to a future round per the anti-drift step cap. Updated SYSTEMS_STATUS.md + NEEDS_USER.md. Evidence: QA/platform/tamlul-lh-fontfix-0817/_lighthouse.json.'
);
