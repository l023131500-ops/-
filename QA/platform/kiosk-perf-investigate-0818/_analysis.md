# kiosk (35) — round-2 perf sweep

Continuing round-2 perf sweep (ROUTES order in scripts/qa/lighthouse-run.mjs) after
kesef(33 — measured 17/08, perf 97, no fix needed): kiosk(35, /kiosk/).

`node scripts/qa/lighthouse-run.mjs QA/platform/kiosk-perf-investigate-0818 kiosk`
-> performance 93, accessibility 100, best-practices 77, seo 100.

Already above the 90 performance threshold (prior baseline from 02/08 was 95,
93 now — same measurement-noise band seen repeatedly this round, e.g. bkalot
82->69, mechiron 55->53). No fix needed this step.

`mainThreadBreakdown`: Style & Layout 1732ms dominates (not a single heavy
script) — Script Evaluation only 220ms, own bundle bootup 1755ms total but
scripting only 49ms of that. Same rendering/layout-dominated pattern as
zchuyot/chatzor, not a bundle-JS problem. `bootupTime` shows
`netfree.link/card/card-injection.js` injected into the trace again — the same
local NetFree proxy artifact documented on nadlan/mthbram/zchuyot, not a
server or code issue.

No code or deploy change. Evidence: `_lighthouse.json` in this folder.

Next in ROUTES (last route in the list): none — kiosk is the final entry.
Round-2 perf sweep (ROUTES order) is now complete for all routes with a
performance score below the 90 threshold that could be fixed with a
same-pattern fix (fonts/mainthread); the remaining sub-90 systems documented
across this round require larger, separate code work (framer-motion
lazy-loading on zchuyot/chatzor, code-splitting on mthbram) and were logged,
not fixed, per the "smallest step" rule.
