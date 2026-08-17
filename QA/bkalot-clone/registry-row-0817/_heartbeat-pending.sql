-- heartbeat: Supabase MCP is not connected in this session (ToolSearch for
-- mcp__supabase__* returned no matches), and no SUPABASE_ACCESS_TOKEN/SB_PAT
-- is set in process, user or machine scope, so the Management API bootstrap
-- is out too (heartbeat-needs-mcp-anon-key-cannot). core.run_progress is not
-- reachable from here by any route.
--
-- Joins the existing queue (see QA/*/*-0817/_heartbeat-pending.sql for the
-- full list and run order) — run all pending files in git-log commit order,
-- not folder-name order. Delete each file once its row lands.
--
-- This step also leaves a real DB change queued and NOT applied:
-- QA/bkalot-clone/registry-row-0817/_project-flip-live.sql (core.projects #37
-- -> live). Run that file BEFORE this insert once access is back, so the
-- heartbeat note and the actual state agree.

insert into core.run_progress (phase, task, status, note) values (
'priority §5ב — שכפול בקלות: core.projects #37 נשאר live=false אחרי שהמערכת כבר עלתה וחיה (רישום)',
$$registry-row-0817 — אין שינוי קוד פונקציונלי, אין מיגרציה. שני קבצים בלבד
עודכנו: apps/37-bkalot-clone/app.json (היה live=false/isDeployed=false מאז
7a7e377 ב-13/08, למרות שהמערכת פרוסה וחיה מאז ונמדדה עשרות פעמים עד 17/08) —
תוקן לשקף מציאות; ו-core.projects עדיין לא תוקנה — אין גישת Supabase בסשן הזה.

מה נמדד: more30.com/bkalot-studio ו-/admin שניהם 200 בדפדפן (Playwright,
cachebust, 1280x900, screenshots ב-QA/bkalot-clone/registry-row-0817). דף
הבית (more30.com, cachebust) לא מציג אף כרטיס עם "bkalot" — לא ב-Playwright
find ולא בגוף ה-HTTP הגולמי; הכרטיס "בקלות" היחיד שם הוא מערכת #10
(rights.catalog), מערכת אחרת. portal/src/App.tsx מאשר שרשימת המערכות נקראת
חיה מ-public.more30_public_systems (אין רשימה מקובעת בקוד) ותלויה ב-
live/public_visible/is_protected — כלומר זו עובדה על core.projects ולא באג
בפורטל.

grep על migrations 0001-0102 ל-"'37'" ול-"bkalot-studio": 0057 (13/08) מציינת
בפירוש שהשורה כבר הייתה קיימת לפני שהיא רצה (stage=idea אז) ומעדכנת רק
supabase_schema+stage->wip. אף מיגרציה מאוחרת יותר לא הזיזה live/is_deployed/
public_visible/live_url/admin_url. כלומר הרישום פיגר אחרי המציאות מ-13/08 עד
עכשיו — לא חוסר תשתית, פשוט לא נעשה.

ה-UPDATE המוכן (5 עמודות בלבד, שורה אחת לפי slug, ללא מיגרציה/סכמה) יושב
ב-QA/bkalot-clone/registry-row-0817/_project-flip-live.sql וממתין להרצה.

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873, לא בסכמות
csj/csj_src/igud. אפס שורות נכתבו בפועל בריצה הזו — אין גישת DB בכלל.

ראיות: QA/bkalot-clone/registry-row-0817/probe.txt,
QA/bkalot-clone/registry-row-0817/intake-live.png,
QA/bkalot-clone/registry-row-0817/admin-live.png.$$,
'blocked',
$$commit on fix/nadlan-a11y, pushed. §5ב — bkalot-clone (#37) is deployed and
its own build checklist is closed, but core.projects was never flipped to
live/public_visible after go-live (13/08), so it has no home-page card.
app.json corrected to match reality; the exact core.projects UPDATE is staged
in _project-flip-live.sql, not yet run — no Supabase access this session
(no MCP, no SB_PAT). Joins the pending-heartbeat queue; run in commit order.$$
);
