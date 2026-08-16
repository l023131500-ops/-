-- heartbeat שמיני שלא נכתב, מאותה סיבה של השבעה שלפניו: ה-MCP של Supabase אינו
-- מחובר לסשן הזה (חיפוש כלים החזיר אפס התאמות), ו-core.run_progress אינה נגישה
-- מכאן בשום מסלול אחר.
--
-- סדר ההרצה — שמונה קבצים, לפי סדר הקומיטים:
--    1. QA/bkalot-clone/case-hit-row-deploy-0817/_heartbeat-pending.sql
--    2. QA/platform/allowlist-recheck-0817/_heartbeat-pending.sql
--    3. QA/bkalot-clone/which-field-0817/_heartbeat-pending.sql
--    4. QA/bkalot-clone/which-field-deploy-0817/_heartbeat-pending.sql
--    5. QA/bkalot-clone/invalid-visible-0817/_heartbeat-pending.sql
--    6. QA/bkalot-clone/invalid-visible-deploy-0817/_heartbeat-pending.sql
--    7. QA/bkalot-clone/stale-mark-0817/_heartbeat-pending.sql
--    8. הקובץ הזה
--    core.run_progress נקראת לפי id. הרצה בסדר אחר תרשום את התיקון כמוקדם
--    לפריסה שיצרה את הצורך בו. מחק כל קובץ אחרי שהשורה שלו נכנסה.

insert into core.run_progress (phase, task, status, note) values (
'priority §5ב — שכפול בקלות שכבה 1 (טופס הפנייה): פריסת תיקון stale-mark-0817',
$$stale-mark-deploy-0817 — פריסת clearInvalid() (76bbac4) לייצור. פריסה בלבד, אין שינוי קוד נוסף, אין מיגרציה, אין פריסת edge function.

classify.mjs: src (37,591 בייט, BB48BD92) מול dist שלפני ה-staging (36,127 בייט, 30B03F39) — 9 סימני NEW (fn_clear_invalid, שלוש קריאות לה, ותשעה הערות/מזהים), 1 REMOVED (הלולאה הכפולה שהוחלפה), 19 CONTROL, 0 DIFF, 0 DEAD.

stage-portal.ps1 → vercel deploy --prod: deployment dpl_BayiH8Df3RZJwYddHc1cZs4j45TC, target=production, READY.

_verify.mjs הכריע משלוש ראיות: (א) dist_equals_live — לפני הפריסה כל 29 הסימנים חזרו מ-more30.com/bkalot-studio בדיוק כספירת ה-dist הקודם; (ב) NEW/REMOVED התהפכו מספירת ה-dist אל ספירת המקור בשתי הכתובות (עם לוכסן ובלעדיו); (ג) 19 סימני CONTROL לא זזו. PASS, 0 fails. הייצור עבר מ-36,363 בייט (76D43A6F) ל-37,827 בייט (C1ECF0F7) בשתי הכתובות, אותו MD5 בשתיהן.

אימות עצמאי נוסף בדפדפן, ישירות מול https://more30.com/bkalot-studio/ (Playwright, לא צילום מה-QA שהוכן קודם): מולאו שם מלא + טלפון לא-תקין (123) + הסכמה, נשלח → phone מסומן אדום עם ההודעה «מספר הטלפון אינו תקין…» (live-phone-invalid.png). לאחר מכן תוקן הטלפון ל-0500000000 ורוקן שם מלא, נשלח שוב → phone חזר לגבול רגיל (לא אדום) ו-full_name מסומן אדום עם «צריך שם מלא.» (live-name-required-no-stale-mark.png). זו בדיוק תרחיש B מהתיקון המקורי, נמדד חי בייצור ולא בסביבת staging.

מוגן: git status ריק על apps/08-bkalut-app, apps/09-bkalot-admin, apps/37-bkalot-clone ו-supabase, לפני ה-add ואחרי. portal/dist gitignored — לא נכנס לקומיט.

ראיות: QA/bkalot-clone/stale-mark-deploy-0817/ — classify.mjs+classify.json+classify-out.txt, probe-live.mjs, markers.mjs, measure-live.mjs, live-before.json/live-after.json, before-out.txt/after-out.txt, stage-out.txt, deploy-out.txt, _verify.mjs+_results.json, verify-out.txt, ושני צילומים חיים.$$,
'done',
$$commit על fix/nadlan-a11y, pushed. §5ב שכבה 1 — פריסת התיקון מ-76bbac4 (stale-mark-0817) ל-more30.com/bkalot-studio. _verify.mjs: PASS, 0 fails, 29 סימנים. אימות עצמאי נוסף בדפדפן חי אחרי הפריסה: תרחיש B (טלפון מתוקן + שם רוקן) — הטלפון כבר לא נשאר מסומן אדום, רק השדה שבאמת נכשל. שני צילומים. אין מיגרציה, אין זריעה, אפס שורות במסד. ⚠️ שמיני בתור — להריץ אחרי שבעת הקבצים שלפניו, בסדר הקומיטים.$$
);
