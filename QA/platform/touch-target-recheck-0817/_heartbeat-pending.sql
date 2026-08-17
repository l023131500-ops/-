-- heartbeat: Supabase MCP is not connected in this session (ToolSearch for
-- mcp__supabase__* returned no matches), and no SUPABASE_ACCESS_TOKEN/SB_PAT
-- is set in process, user or machine scope, so the Management API bootstrap
-- is out too (heartbeat-needs-mcp-anon-key-cannot). core.run_progress is not
-- reachable from here by any route.
--
-- Joins the existing queue (see QA/*/*-0817/_heartbeat-pending.sql for the
-- full list and run order) — run all pending files in git-log commit order,
-- not folder-name order. Delete each file once its row lands.

insert into core.run_progress (phase, task, status, note) values (
'anti-drift sweep — SYSTEMS_STATUS.md "מה נשאר לתקן": 03 מודעות "3 יעדי מגע קטנים" נבדק מחדש (רישום)',
$$touch-target-recheck-0817 — אין שינוי קוד. הרצת scripts/qa/platform-audit.mjs
נגד /modaot בלבד (desktop + mobile 390x844 + dark) הראתה smallTargets: [] בכל
שלושת המצבים, interactiveCount: 8, unnamedControls: [], imgsNoAlt: []. הפער
שהיה רשום בטבלת "מה נשאר לתקן" (03 מודעות | 3 יעדי מגע קטנים | קטן, בלי
תאריך מדידה) אינו פעיל כרגע — לא נחקר מתי נסגר, רק שהוא סגור עכשיו. עודכן
SYSTEMS_STATUS.md: רשומה חדשה בראש הקובץ + קו חוצה על שורת הטבלה. זה הפער
השלישי מסוג הזה שנמצא מיושן ב-17/08 (אחרי מתג מצב כהה ומכסת Vercel).

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. אפס שורות
נכתבו בפועל בריצה הזו — אין גישת DB בכלל.

ראיות: QA/platform/touch-target-recheck-0817/_results.json,
QA/platform/touch-target-recheck-0817/modaot-desktop.png,
QA/platform/touch-target-recheck-0817/modaot-mobile.png,
QA/platform/touch-target-recheck-0817/modaot-dark.png.$$,
'blocked',
$$commit on fix/nadlan-a11y, pushed. Anti-drift sweep item: re-measured a
stale "03 modaot — 3 small touch targets" claim in SYSTEMS_STATUS.md's
remaining-work table against current production. scripts/qa/platform-audit.mjs
against /modaot (desktop+mobile+dark) found zero small targets, zero unnamed
controls, zero images without alt — the gap is not currently active. No code
change; SYSTEMS_STATUS.md corrected (new dated entry + struck-through table
row). Joins the pending-heartbeat queue; run in commit order.$$
);
