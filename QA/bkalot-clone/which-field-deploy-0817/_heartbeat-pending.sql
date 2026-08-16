-- ⚠️ heartbeat רביעי שלא נכתב, ומאותה סיבה של שלושת הקודמים.
--
--    ה-MCP של Supabase **אינו מחובר לסשן הזה כלל** — חיפוש כלים החזיר אפס
--    התאמות, וההארנס מדווח שמחבר claude.ai Supabase דורש הרשאה מחדש. הסשן
--    אינו אינטראקטיבי ולכן אי אפשר להריץ ממנו OAuth. זו הרשאה חסרה ולא תקלה
--    חולפת — היא לא תתבהר מעצמה.
--
--    core.run_progress אינה נגישה מכאן בשום מסלול אחר: המפתח שעל הדיסק הוא anon
--    ומקבל 406 על core, וה-PAT יושב ב-core.secrets עצמה ולא בקובץ.
--
-- ⚠️ סדר ההרצה, והוא לא שרירותי — ארבעה קבצים, לפי סדר הקומיטים:
--    1. QA/bkalot-clone/case-hit-row-deploy-0817/_heartbeat-pending.sql  (הפריסה של 531ba5a)
--    2. QA/platform/allowlist-recheck-0817/_heartbeat-pending.sql        (המדידה החוזרת, 93ad034)
--    3. QA/bkalot-clone/which-field-0817/_heartbeat-pending.sql          (פעימת ה-UI, 309c995)
--    4. הקובץ הזה                                                        (הפריסה של אותה פעימה)
--    core.run_progress נקראת לפי id. הרצה בסדר אחר תרשום את הפריסה כמוקדמת
--    למדידה שקדמה לה. מחק כל קובץ אחרי שהשורה שלו נכנסה.
--
-- ⚠️ הפריסה עצמה הושלמה ואינה תלויה בשורה הזאת: dpl_HYneK9rFMFat2efa3dSbwQAkpFjq
--    הוא READY, target=production, ו-Aliased ל-more30.com. מה שחסר הוא הרישום בלבד.

insert into core.run_progress (phase, task, status, note) values (
'priority §5ב — שכפול בקלות שכבה 1 (טופס הפנייה): פריסת סימון השדה שנפסל',
$$which-field-deploy-0817 — פריסה בלבד של 309c995, בלי שינוי קוד ובלי נגיעה במסד.

הקובץ שנפרס הוא הקובץ שבמקור: 34,622 בייט ו-MD5 183921EE במקור ואותו MD5 ב-portal/dist אחרי stage-portal.ps1; לפני ה-staging ישב שם 32,322 (E6E39BF0) — בדיוק הקובץ ש-309c995 מדד כ-HEAD. 38 קבצים, בלי --prebuilt, עם vercel.json (2CDA4F21) ו-.vercel/project.json (EE7AFD40). dpl_HYneK9rFMFat2efa3dSbwQAkpFjq · READY · target=production · Aliased ל-more30.com.

⚠️ admin.html לא זז: 197,514 ו-0343B025 במקור וב-dist לפני ה-staging ואחריו. stage-portal מעתיק את שניהם בכל ריצה, ולכן המספר הוא הראיה ולא ההצהרה.

⚠️ 39 סימנים, DEAD ריק, סווגו מהשוואת שני קבצים מקומיים לפני שהכתובת החיה נפגשה (0087). dist_equals_live לפני הפריסה: אפס אי-התאמות ב-39 סימנים ובשתי הכתובות. _verify.mjs: PASS, אפס fails, 39 סימנים, עם לוכסן ובלעדיו. NEW 18 (CODE_FIELD, שבע שורות המפה, הצהרת bad, תנאי offsetParent, שישה בלוקי הערות), REMOVED 1 («return fail(code, extra);» — הראיה שהענף הישן לא נשאר), DIFF 3 (markInvalid( 3→4, aria-invalid 7→9, "situation" 4→6), CONTROL 17 ובהם markInvalid עצמה 1→1.

live 32,558 → 34,858 בייט, בשתי הכתובות ובאותו MD5 (B8FFD83A → 1473D798) — 236 בייט מעל הקובץ שנפרס בשתי המדידות, אותה הזרקה קבועה שנמדדה ב-680/683/685/687. אפס תווי החלפה ואפס «×».

מה-DOM בכתובת החיה, שישה מקרים: מסומן aria-invalid, ממוקד ב-activeElement, והשדה נראה — 6/6, שדה אחד בדיוק בכל מקרה (full_name, phone, email, email, situation, topic_no). ההודעות זהות למה שנמדד ב-309c995. אפס הודעות קונסולה, אפס גלישה ב-1280x901.

⚠️ הבקרה אינה מה שנראתה: topic_no_invalid לא הגיע לשרת כלל (reached_server=false) — החסימה המוקדמת בצד הלקוח תפסה את «1e3» לפני השליחה, וההודעה שנמדדה היא «מספר נושא — צריך מספר שלם» ולא זו שב-MESSAGES. היא מוכיחה שהנתיב הישן לא נשבר, ואינה מוכיחה שענף topic_no_invalid של השרת נבדק בייצור. חמישה מתוך שישה מדדו את הנתיב החדש.

⚠️ מצב טסט נמדד ולא הוצהר: 7 תשובות, כולן 200, any_ok=false, any_case_id=false, חמישה קודים שונים. אפס שורות, אפס הודעות יוצאות, אין זריעה ואין גלגול-אחורה ואין מיגרציה.

⚠️ נמדד ולא תוקן: ל-aria-invalid אין CSS בקובץ, ולכן הסימן לעין הוא טבעת המיקוד בלבד. פער קיים ולא רגרסיה — POLISH.

מוגן: git status ריק על apps/08-bkalut-app, apps/09-bkalot-admin, apps/37-bkalot-clone ו-supabase. ראיות: QA/bkalot-clone/which-field-deploy-0817/.$$,
'done',
$$commit על fix/nadlan-a11y, pushed. §5ב שכבה 1 — הפריסה של 309c995. ⚠️ להריץ אחרי case-hit-row-deploy-0817, allowlist-recheck-0817 ו-which-field-0817 — רביעי בתור. ⚠️ ה-at כאן אינו זמן הריצה; אל תסיק ממנו סדר.$$
);
