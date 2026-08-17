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
'anti-drift sweep — SYSTEMS_STATUS.md "נהל מערכת זו" table, mechiron same_render_no_gate row — נבדק מחדש',
$$mechiron-admin-gate-recheck-0817 — אין שינוי קוד, אין פריסה. הרשומה
"admin-entry-resolves.mjs" (סעיף "נהל מערכת זו") מסמנת את mechiron (27) כשורה
היחידה מסוג same_render_no_gate: /mechiron/admin מציג בדיוק אותם בתים כמו
/mechiron/, בלי שום שער כניסה. נבדק שוב היום מול הייצור, אנונימי, עם
cache-buster: /mechiron/ ו-/mechiron/admin שניהם 200, 34,415 בייט, תוכן זהה
בית-לבית, וגוף התשובה של /mechiron/admin אינו מכיל "סיסמה"/"התחברות"/
"password" (אין שער). הממצא עדיין נכון, לא מיושן.

מספר הבייטים השתנה מאז המדידה המקורית (31,585 -> 34,415 היום, בשתי הכתובות
גם יחד) — זה עקבי עם תוספת סקריפט/הערת מצב-כהה שנוספה היום ל-
apps/27-bkalut-price בפעימת "04 imud · 27 mechiron dark mode" (כבר תועדה
בנפרד ב-SYSTEMS_STATUS.md), לא רגרסיה חדשה.

לא נסתה תיקון: apps/27-bkalut-price מצהיר ב-CLAUDE.md שלו שהוא נפרס אל
/var/www/bkalut-app/, שנמצא ברשימת המוגנות. הפער עצמו הוא הכרעת מוצר פתוחה,
כבר רשומה נכון תחת core.issues #94 ו-NEEDS_USER.md §0מ (לבנות את השוואת
המחירים בפועל / לשנות רישום / לפרוש #27). הבדיקה הזו רק מאשרת שהממצא הפתוח
עדיין נכון ומעדכנת את מספר הבייטים — אינה סוגרת כלום ואינה מוסיפה שורת
NEEDS_USER חדשה (§0מ הקיימת כבר מכסה זאת).

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. אפס שורות
נכתבו בפועל בריצה הזו — אין גישת DB בכלל.

ראיות: QA/platform/mechiron-admin-gate-recheck-0817/_results.txt.$$,
'blocked',
$$commit on fix/nadlan-a11y, pushed. Anti-drift sweep item: rechecked the one
still-open "admin-entry-resolves" row (mechiron same_render_no_gate) against
live production with a cache-buster. Finding still accurate (root and admin
byte-identical, no login markers), byte count updated (31,585 -> 34,415,
explained by today's unrelated dark-mode addition, not a regression). No code
change, no NEEDS_USER change needed — core.issues #94 / NEEDS_USER §0מ already
correctly describes this as an open product decision, and apps/27-bkalut-price
deploys to the protected /var/www/bkalut-app/ path so it was not touched.
SYSTEMS_STATUS.md updated with a dated top entry. Joins the pending-heartbeat
queue; run in commit order.$$
);
