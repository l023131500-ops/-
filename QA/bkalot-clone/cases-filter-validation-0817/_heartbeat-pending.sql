-- heartbeat: ה-MCP של Supabase אינו מחובר לסשן הזה (חיפוש כלים החזיר אפס
-- התאמות), ו-core.run_progress אינה נגישה מכאן בשום מסלול אחר.
--
-- מצטרף לתור הקיים (ראו QA/*/​*-0817/_heartbeat-pending.sql לרשימה המלאה
-- ולסדר ההרצה לפי קומיטים) — הרץ את כל הקבצים לפי סדר הקומיטים ב-git log,
-- לא לפי שם התיקייה. מחק כל קובץ אחרי שהשורה שלו נכנסה.

insert into core.run_progress (phase, task, status, note) values (
'priority §5ב — שכפול בקלות: ארבעת ענפי הוולידציה של סינון /cases נמדדו בייצור',
$$cases-filter-validation-0817 — מדידה בלבד, אין שינוי קוד, אין מיגרציה, אין פריסה.

bkalot_clone_admin_cases דוחה ערך לא-מוכר בכל אחד מארבעת שדות הסינון
(kind/status/decided/sort) עם קוד שגיאה מפורש — נבנה במיגרציות 0060/0081/0082
ונבדק במסד. עד עכשיו הבדיקה היחידה שלהם הייתה קריאת SQL ישירה
(QA/bkalot-clone/queue-total-0816, לא committed — פיגום) או קריאת /cases בלי
סינון בכלל (admin-http-0813). אף ענף לא נמדד דרך הכתובת שדפדפן פונה אליה, עם
סשן ניהול אמיתי.

כניסה אמיתית ל-bkalot-clone-admin עם l023131500@gmail.com + STD_ADMIN_PASSWORD,
ואז ארבע קריאות /cases: kind:"bogus" → HTTP 200 kind_unknown (allowed:
info/reminder/treatment); status:"bogus" → status_unknown (allowed: new/
in_progress/sent/closed/rejected); decided:"bogus" → decided_unknown (allowed:
yes/no); sort:"bogus" → sort_unknown (allowed: created_at/decided_at). כל
ארבעתן זהות מילה-במילה למה שהמסד מחזיר. ארבעת הערכים התקינים המקבילים עברו
ok:true באותה בקשה — בקרה. queue_total תואם ל-0099: null כשאין סינון או
כש-sort הוא היחיד, 0 כשקיים סינון על מסד ריק.

מוגן: לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873. מצב טסט —
11 בקשות, כולן login/cases/logout, קריאה בלבד, אפס כתיבה, logout בסוף.

ראיות: QA/bkalot-clone/cases-filter-validation-0817/probe-out.txt,
QA/bkalot-clone/cases-filter-validation-0817/_results.md.$$,
'done',
$$commit על fix/nadlan-a11y, pushed. §5ב — ארבעת ענפי הוולידציה של /cases
(kind_unknown/status_unknown/decided_unknown/sort_unknown) נמדדו לראשונה מול
הייצור עם סשן אמיתי, כולם תואמים למסד. אין שינוי קוד. מצטרף לתור ה-heartbeat
הממתין ל-MCP; הרץ לפי סדר הקומיטים, לא לפי שם התיקייה.$$
);
