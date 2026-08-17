-- heartbeat: ה-MCP של Supabase אינו מחובר לסשן הזה (חיפוש כלים החזיר אפס
-- התאמות), ו-core.run_progress אינה נגישה מכאן בשום מסלול אחר.
--
-- מצטרף לתור הקיים (ראו QA/*/*-0817/_heartbeat-pending.sql לרשימה המלאה
-- ולסדר ההרצה לפי קומיטים) — הרץ את כל הקבצים לפי סדר הקומיטים ב-git log,
-- לא לפי שם התיקייה. מחק כל קובץ אחרי שהשורה שלו נכנסה. זהו האחרון בתור נכון
-- לקומיט הזה.

insert into core.run_progress (phase, task, status, note) values (
'priority §5ב — שכפול בקלות: which-field + stale-mark נמדדו במובייל 390x844 בייצור',
$$which-field-mobile-390-0817 — מדידה בלבד, אין שינוי קוד, אין מיגרציה, אין פריסה.

שתי פעימות קודמות (3cff166 which-field-deploy, 9699a3d case-hit-row) רשמו
במפורש שהתכונה "איזה שדה נפסל" לא נמדדה ב-390x844. invalid-visible-deploy-0817
מדדה מובייל לכלל הצבע בלבד, לא יחד עם ניקוי הסימן הישן (stale-mark-0817/
stale-mark-deploy-0817). זה השילוב שלא נמדד.

Playwright, 390x844 לפני כל ניווט, מול https://more30.com/bkalot-studio/ עם
cachebust טרי. תרחיש A: phone="123" → phone_invalid, aria-invalid=true,
border rgb(155,28,28), ממוקד, גלוי, אפס גלישה אופקית (375/375). תרחיש B:
phone תוקן ל-0500000000, full_name רוקן → phone חוזר ל-aria-invalid=null
ו-rgb(220,218,209) (הסימן הישן לא שרד), full_name מסומן אדום וממוקד. אפס
הודעות קונסולה בשתי הריצות.

שני הקודים (phone_invalid, full_name_required) הם return מעל ה-insert ב-0058
— אפס שורות נכתבו, אין נגיעה ב-bkalot-clone-admin.

מוגן: git status ריק על apps/08-bkalut-app, apps/09-bkalot-admin, supabase/.
לא נגעתי ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873.

ראיות: QA/bkalot-clone/which-field-mobile-390-0817/_results.md,
mobile-phone-invalid-marked-390.png, mobile-fullname-marked-phone-cleared-390.png.$$,
'done',
$$commit על fix/nadlan-a11y, pushed. §5ב — סגר את הפער המפורש "לא נמדד ב-390x844"
לתכונת "איזה שדה נפסל" + ניקוי סימן ישן, ביחד, בייצור. אין שינוי קוד. מצטרף
לתור ה-heartbeat הממתין ל-MCP; הרץ לפי סדר הקומיטים, לא לפי שם התיקייה.$$
);
