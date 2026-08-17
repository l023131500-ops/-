-- Pending heartbeat row — Supabase MCP was not connected this session.
-- Apply this insert (in commit order, after any earlier still-pending
-- _heartbeat-pending.sql / _heartbeat.sql files in the queue) once the MCP
-- is available again.
--
-- Work commit: 13821b4 — "01 torah: fix header/hero/footer/nav all invisible
-- in dark mode (round-3 a11y recheck)"

insert into core.run_progress (phase, task, status, note)
values (
  'a11y-round-3',
  'torah-primary-dark-0818',
  'done',
  'Continuing the round-3 dark-mode contrast recheck after tamlul (02, 93c8032).
contrast-probe.mjs against https://more30.com/torah in dark mode found 21 failing
elements, all rgb(17,30,60) on rgb(26,47,91) (1.2-1.26:1, needs 4.5) - nav avatar
circle, login/signup links, hero h1/subtitle, and every footer heading/link/
copyright line. Root cause in apps/01-torah-platform/src/hooks/useTenant.tsx: the
tenant branding effect writes --primary/--secondary/--accent onto
document.documentElement via root.style.setProperty(), an inline style that
outranks the .dark class selector in index.css, so the background stayed pinned
to the tenant''s light-mode brand navy in both themes while --primary-foreground
was left to the .dark class alone and still flipped to a dark-navy value meant
for a gold background that never materialized. Fix: pin each -foreground token
(via WCAG relative luminance) alongside its brand color, for primary/secondary/
accent. Verified: vite build clean, node scripts/prerender-all.mjs torah re-baked
the tenant-seeded prerender, vercel deploy --prod (dpl_BRQQkRDHYvRTKqVrMGAkJpabG4Fm,
READY, aliased). Live re-check with a cache-buster: contrast-probe.mjs dark 21
findings -> 1 (unrelated pre-existing gold CTA button at 2.31:1, both themes, not
fixed this step). Light mode probe unchanged (same 1 finding) - light mode
untouched. Evidence: QA/platform/torah-primary-dark-0818/ (_shot.mjs,
torah-dark.png, torah-light.png). Protected systems untouched.'
);
