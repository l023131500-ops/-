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
'anti-drift sweep — SYSTEMS_STATUS.md "מה נשאר לתקן": 30 CRM + 31 גשר "מסלול index ריק" נבדק מחדש (רישום)',
$$index-route-recheck-0817 — אין שינוי קוד. Playwright 1280x900, cache-buster,
שני מסלולים לכל מערכת (עם/בלי לוכסן): /crm ו-/crm/ מפנים ל-/crm/auth (כניסה
למערכת | זכויות פרו, body 7,862B, 0 שגיאות קונסולה), /gesher ו-/gesher/ מפנים
ל-/gesher/auth (התחברות — מערכת CRM שותפים, body 8,353B, 0 שגיאות קונסולה).
שתי הרשומות בטבלת "מה נשאר לתקן" (30 CRM זכויות | מסלול index ריק + React
#418 hydration mismatch ב-dashboard | בינוני; 31 גשר עברית | מסלול index ריק |
בינוני, שתיהן בלי תאריך מדידה) אינן פער פעיל כרגע במסלול שנמדד. לא נבדק: מסך
ה-dashboard אחרי כניסה אמיתית — טענת React #418 הייתה ספציפית לשם, לא למסלול
index/auth. עודכן SYSTEMS_STATUS.md: רשומה חדשה בראש הקובץ + קו חוצה על שתי
שורות הטבלה. זה הפער הרביעי והחמישי מסוג הזה שנמצאים מיושנים ב-17/08 (אחרי
מתג מצב כהה, מכסת Vercel, ו-03 מודעות).

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. אפס שורות
נכתבו בפועל בריצה הזו — אין גישת DB בכלל.

ראיות: QA/platform/index-route-recheck-0817/_results.md,
QA/platform/index-route-recheck-0817/crm-auth.png,
QA/platform/index-route-recheck-0817/gesher-auth.png.$$,
'blocked',
$$commit on fix/nadlan-a11y, pushed. Anti-drift sweep item: re-measured two
stale "index route empty" claims (30 CRM, 31 gesher) in SYSTEMS_STATUS.md's
remaining-work table against current production. Both /crm and /gesher (with
and without trailing slash) redirect to a full /auth login screen with zero
console errors — the gap is not currently active in the route measured. Not
checked: the post-login dashboard, where the original React #418 hydration
claim was specifically located. No code change; SYSTEMS_STATUS.md corrected
(new dated entry + two struck-through table rows). Joins the pending-heartbeat
queue; run in commit order.$$
);
