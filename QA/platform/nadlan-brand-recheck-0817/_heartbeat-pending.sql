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
'anti-drift sweep — SYSTEMS_STATUS.md §7 מיתוג: "32 נדל"ן PropertyIdCard תוקן במקור, טרם נפרס" נבדק מחדש (רישום)',
$$nadlan-brand-recheck-0817 — אין שינוי קוד. הרשומה מ-06/08 (§7 המיתוג) קבעה
ש-components/PropertyIdCard.tsx תוקן במקור (השם הישן "מור מערכות תוכנה" ->
"עולם הסטארטאפים") אבל טרם נפרס, כי אז הפריסה הייתה חסומה על הכרעת
איחוד-ריפו פתוחה (NEEDS_USER §0א). מאז, nadlan עברה כמה פריסות בפועל
(נגישות 95->100 ב-11/08, רה-בדיקות מצב-כהה וחפיפת-כפתור-כניסה ב-17/08) —
ההערה עצמה פשוט לא עודכנה אחריהן. git log על הקובץ מראה את קומיט התיקון
(67982db, 06/08) בהיסטוריה הרגילה, לא בענף נפרד; grep מלא של
apps/32-nadlan-berega ו-_deploy אחרי "מור מערכות תוכנה" -> 0 תוצאות.
permalink אמיתי מ-QA/nadlan-v3/_results.json
(https://more30.com/nadlan/p/30240-88-vwAplUCBVx) נמשך חי: שורת הפוטר של
תעודת הזהות לנכס היא "נדל\"ן ברגע · מבית עולם הסטארטאפים" — אין הופעה של
השם הישן. עודכן SYSTEMS_STATUS.md: רשומה חדשה בראש הקובץ + הפסקה תחת §7
תוקנה. זה הפער השמיני מסוג הזה שנמצא מיושן ב-17/08.

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. אפס
שורות נכתבו בפועל בריצה הזו — אין גישת DB בכלל.

ראיות: QA/platform/nadlan-brand-recheck-0817/results.txt.$$,
'blocked',
$$commit on fix/nadlan-a11y, pushed. Anti-drift sweep item: re-measured a
stale "32 nadlan — PropertyIdCard brand fixed in source, not yet deployed"
note in SYSTEMS_STATUS.md's §7 branding section against current
production. git log showed the fix committed 2026-08-06 (67982db) in normal
history; nadlan has deployed multiple times since (a11y fix 08-11,
dark-mode/auth-button rechecks 08-17), so the note was simply stale. A live
fetch of a real property permalink
(https://more30.com/nadlan/p/30240-88-vwAplUCBVx) confirmed the footer
already reads the new brand name, no old-brand string anywhere on the page.
No code change; SYSTEMS_STATUS.md corrected (new dated entry + the §7 note
rewritten). Joins the pending-heartbeat queue; run in commit order.$$
);
