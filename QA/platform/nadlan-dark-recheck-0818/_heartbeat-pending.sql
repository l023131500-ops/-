-- Pending heartbeat row — Supabase MCP was not connected this session.
-- Apply this insert (in commit order, after any earlier still-pending
-- _heartbeat-pending.sql / _heartbeat.sql files in the queue) once the MCP
-- is available again.
--
-- Work commit: 1f0554c — "32 nadlan: round-3 dark-mode recheck - fix
-- invisible wizard-card headings"

insert into core.run_progress (phase, task, status, note)
values (
  'a11y-round-3',
  'nadlan-dark-recheck-0818',
  'done',
  'Continuing the round-3 dark-mode contrast recheck after gesher (31, b10a330).
contrast-probe.mjs against https://more30.com/nadlan in dark mode found ~63
failures, ~1.0-1.2:1, concentrated inside the bg-white/95 request-form wizard
card ("מה בודקים"/"איזה דוח"/"אילו נתונים לכלול"/"פרטי הנכס"/"או חיפוש חופשי").
Two findings separated: the hero h1 white-on-light reading is a false positive
(identical in light and dark scheme; the h1 actually sits on .hero-gradient, a
fixed dark-navy background-image the probe cannot see - same class as
galil/smel/tamlul/modaot). The wizard-card headings are a real bug: the card is
intentionally a fixed-white surface (floats on the always-dark hero), but its
text used the text-navy/text-ink/text-muted tokens, which correctly flip to
near-white under .dark for the rest of the page - so dark-mode near-white text
landed on a card background that never inverted. Fix: apps/32-nadlan-berega/
app/globals.css adds .card-on-hero, pinning --c-navy/--c-ink/--c-muted/
--c-line/--c-bgsoft/--c-surface to their :root values inside this one card;
app/page.tsx applies the class to the wrapping div around <ReportRequestForm />.
Deployed via vercel deploy --prod (source deploy, not --prebuilt) from
apps/32-nadlan-berega. Verified live with a cache-buster: dark/1440 and
dark/390 both down from ~63 failures to 6 (all pre-existing, unrelated to this
card - a "|" divider and teal/gold brand-accent text further down the page,
1.5-3.5:1, not investigated this step); light/1440 unchanged (7 hero
false-positive lines, confirming the fix is dark-mode-scoped). Playwright
screenshot confirms headings now render dark-navy-on-white legibly;
getComputedStyle: heading color rgb(13,27,62), card backgroundColor
rgba(255,255,255,0.95). Evidence: QA/platform/nadlan-dark-recheck-0818/
(before/after screenshots + _results.md). Protected systems untouched. Round-3
ROUTES queue continues with kesef next.'
);
