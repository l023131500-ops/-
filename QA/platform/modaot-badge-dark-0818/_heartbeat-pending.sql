-- Pending heartbeat row — Supabase MCP was not connected this session.
-- Apply this insert (in commit order, after any earlier still-pending
-- _heartbeat-pending.sql / _heartbeat.sql files in the queue) once the MCP
-- is available again.
--
-- Work commit: (this step) — "03 modaot: fix 1/2/3 step badge invisible
-- in dark mode (round-3 a11y recheck)"

insert into core.run_progress (phase, task, status, note)
values (
  'a11y-round-3',
  'modaot-badge-dark-0818',
  'done',
  'Continuing the round-3 dark-mode contrast recheck after torah (01,
13821b4/712ccdd/1cc051d) - next system in ROUTES order is modaot (03).
contrast-probe.mjs against https://more30.com/modaot in dark mode found 3
failing elements: the "1"/"2"/"3" step-number badges in the "how it works"
section, rgb(200,214,238) light text on rgb(201,168,76) gold, 1.56:1 (needs
3:1). Root cause in apps/03-igud-ads/app/(public)/page.tsx line 66:
text-brand-dark (an ink token that flips value between light/dark mode via
the .dark class in globals.css) on bg-brand-goldsurface (a fixed gold
surface, #C9A84C, does NOT flip). Same trap already documented and fixed for
.btn-gold in the same globals.css (comment at line 98-101: "text-brand-
darksurface not text-brand-dark: the button sits on fixed gold") but the
homepage badge never got the same treatment. Fix: text-brand-dark ->
text-brand-darksurface (a fixed dark-ink surface token) on the three badges.
Side finding, not fixed: re-running the probe in light mode on the same page
returned a long list of "failures" (white text on cream) - this is a false
positive in contrast-probe.mjs, not a real bug. <main> has a real
bg-gradient-to-b from-brand-blue to-brand-dark (verified directly:
getComputedStyle(main).backgroundImage = linear-gradient(rgb(26,46,90),
rgb(14,27,54)), real dark navy), but the probe only reads computed
background-color and skips background-image, so it walks past the gradient
up to <body> (cream) and measures against that instead. No production code
changed for this - a QA tool limitation to remember for any other system
using bg-gradient-* on a wrapper element. Verified: next build clean, vercel
deploy --prod from apps/03-igud-ads (modaot-more30,
dpl_9TPLrFZFFXds5yfS3zcGZTSSD7Gp, READY, aliased). Live re-check with a
cache-buster: contrast-probe.mjs dark mode on /modaot - 3 findings -> 0.
Evidence: QA/platform/modaot-badge-dark-0818/ (_results.md,
modaot-dark-after.png). Protected systems untouched.'
);
