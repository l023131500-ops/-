-- ⚠️ heartbeat שישי שלא נכתב, ומאותה סיבה בדיוק של הרביעי והחמישי.
--
--    ה-MCP של Supabase **אינו מחובר לסשן הזה כלל** — חיפוש כלים מפורש החזיר
--    "No matching deferred tools found", וההארנס מדווח שמחבר claude.ai Supabase
--    דורש הרשאה מחדש. הסשן אינו אינטראקטיבי ולכן אי אפשר להריץ ממנו OAuth.
--    זו הרשאה חסרה ולא תקלת שער חולפת — היא לא תתבהר מעצמה.
--
--    core.run_progress אינה נגישה מכאן בשום מסלול אחר: המפתח שעל הדיסק הוא anon
--    ומקבל 406 על core, וה-PAT יושב ב-core.secrets עצמה ולא בקובץ.
--
-- ⚠️ סדר ההרצה, והוא לא שרירותי — שישה קבצים, לפי סדר הקומיטים:
--    1. QA/bkalot-clone/case-hit-row-deploy-0817/_heartbeat-pending.sql   (הפריסה של 531ba5a)
--    2. QA/platform/allowlist-recheck-0817/_heartbeat-pending.sql         (המדידה החוזרת, 93ad034)
--    3. QA/bkalot-clone/which-field-0817/_heartbeat-pending.sql           (פעימת ה-UI, 309c995)
--    4. QA/bkalot-clone/which-field-deploy-0817/_heartbeat-pending.sql    (הפריסה, 3cff166)
--    5. QA/bkalot-clone/invalid-visible-0817/_heartbeat-pending.sql       (פעימת ה-UI, 8ef394c)
--    6. הקובץ הזה                                                         (הפריסה שלה)
--    core.run_progress נקראת לפי id. הרצה בסדר אחר תרשום את הפריסה כמוקדמת
--    לפעימה שהיא פורסת. מחק כל קובץ אחרי שהשורה שלו נכנסה.
--
-- ⚠️ הריצה עצמה הושלמה ואינה תלויה בשורה הזאת: הקובץ נפרס לייצור, נמדד משתי
--    כתובות חיות ב-33 סימנים, ונקרא מדפדפן בשתי סכמות צבע ובשלושה מקרים.
--    מה שחסר הוא הרישום בלבד.

insert into core.run_progress (phase, task, status, note) values (
'priority §5ב — שכפול בקלות שכבה 1 (טופס הפנייה): הצבע של השדה שנפסל נמדד מדפדפן ולא היה בייצור',
$$invalid-visible-deploy-0817 — 8ef394c סגר את הפער «הסימן הגיע ל-aria ולא לעין» ורשם במפורש שזו פעימת UI בלבד ושהייצור מגיש עדיין את גרסת HEAD. זו הפריסה. פריסה בלבד: אין שינוי קוד, אין מיגרציה, אין פריסת edge function ואין נגיעה במסד; מה שנכנס ל-commit הוא ראיות בלבד.

הקובץ שנפרס הוא הקובץ שבמקור ולא עותק שלו: 36,127 בייט ו-MD5 30B03F39 במקור, ואותו MD5 בדיוק ב-portal/dist אחרי stage-portal.ps1. לפני ה-staging ישב שם 34,622 (183921EE) — בדיוק הקובץ ש-3cff166 רשם כקובץ שנפרס. 38 קבצים, מ-portal/dist ובלי --prebuilt (prebuilt-deploy-drops-vercel-json), ו-vercel.json (9,254 · 2CDA4F21) ו-.vercel/project.json (118 · EE7AFD40) נמדדו כנוכחים אחרי ה-staging. target=production, READY, ו-Aliased ל-more30.com (dpl_7iy7vLhgpNN2PCFP1FUNqXjokkjs).

⚠️ הפעימה נוגעת ב-index.html ולא ב-admin.html, ונמדד ולא הונח: admin.html עמד על 197,514 ו-0343B025 גם במקור וגם ב-dist לפני ה-staging וגם אחריו — stage-portal מעתיק את שניהם בכל ריצה, ולכן «לא נגעתי» אינו מספיק והמספר הוא הראיה.

⚠️ הסיווג נקבע כולו מהשוואת שני קבצים מקומיים (classify.mjs: src מול dist), בלי שהכתובת החיה נפגשה ולו פעם אחת, ו-classify.mjs רץ לפני ה-staging ולא אחריו — classify-self-destructs-after-staging. 33 סימנים, DEAD ריק.

⚠️ הפעימה הזו היא תוספת טהורה ואין בה שורה שנמחקה, ולכן קבוצת REMOVED ריקה — ואין כאן את הסימן שהכריע ב-3cff166 בין «נוסף» ל«הוחלף». מה שמחליף אותו כראיה הוא ctl_focus_rule: הכלל input:focus,select:focus,textarea:focus{...box-shadow:var(--ring)} עמד 1 לפני ו-1 אחרי. אילו הכלל החדש היה מחליף אותו במקום לשבת מתחתיו, הסימן היה יורד ל-0 וה-verify היה נופל. וכך גם ctl_ring_light/ctl_ring_dark ושני קווי ה---danger המקוריים.

⚠️ הבקרה האמיתית של השרשרת היא dist_equals_live: לפני הפריסה כל 33 הסימנים החזירו מהכתובת החיה בדיוק את ספירת ה-dist שנפרס בפעם הקודמת — אפס אי-התאמות, בשתי הכתובות. _verify.mjs מכריע משלוש ראיות ולא מאחת — dist_equals_live לפני, src_equals_live אחרי, ובקרות שלא זזו — ו-PASS על 33 סימנים בשתי הכתובות, עם לוכסן ובלעדיו, אפס fails.

12 מסומני NEW החזירו 0 בייצור לפני ו-≥1 במקור, והתהפכו אל שוויון אחרי: שני טוקני --danger-ring (בהיר וכהה), ארבעת חלקי שני הכללים (בורר וגוף בנפרד לכל אחד — בורר בלי גוף הוא כלל ריק, וגוף בלי בורר נדבק למשהו אחר), ארבע שורות ההערה, ובנוסף aria-invalid="true" 0→6 ו---danger-ring 0→3. 2 מסומני DIFF הגיעו בדיוק לספירת המקור: aria-invalid 9→16 ו---danger-soft 3→5. 19 מסומני CONTROL לא זזו, ובהם כל מה ש-3cff166 פרס — CODE_FIELD, bad_const, bad_guard, markInvalid, ENDPOINT — כלומר הפריסה לא גלגלה את הקובץ אחורה ואז הוסיפה רק CSS.

live 34,858 בייט לפני ו-36,363 אחרי, בשתי הכתובות ובאותו MD5 (1473D798 → 76D43A6F) — 236 בייט מעל הקובץ שנפרס בשתי המדידות, הפרש קבוע של הזרקה ולא של תוכן, ואותם 236 שנמדדו ב-680, 683, 685, 687 ובפריסה הקודמת. אפס תווי החלפה ואפס «×» — deployed-html-double-encoded-cp1255.

⚠️ ספירת מחרוזת ב-HTML אומרת שה-CSS נשלח, לא שהוא צויר, ולכן הצבעים נקראו מ-getComputedStyle על השדה שנמדד באמת בכתובת החיה. שלושה מקרים בשתי סכמות: phone_invalid (שדה טקסט, נתיב שרת), situation_required_for_treatment (בורר), ו-topic_no דרך החסימה המוקדמת (נתיב לקוח שאינו יוצא לרשת). שישה מתוך שישה: הגבול בייצור rgb(155,28,28) בבהיר ו-rgb(240,138,138) בכהה, המילוי והטבעת בהתאמה — בדיוק הערכים שנמדדו מהקובץ ב-8ef394c (live_equals_local_after אמת בשישה מתוך שישה), ובדיוק לא הערכים שהייצור צבע לפני (rgb(15,95,76) ו-rgb(75,191,159) — --brand, הירוק של שדה תקין). ניגודיות מחושבת מהערכים שנמדדו: בהיר 8.15 מול הכרטיס ו-7.01 מול המילוי, כהה 7.12 ו-6.73 — כולן מעל סף 3:1 של WCAG 1.4.11.

⚠️ בקרה שלא זזה: marks_same_field ו-same_message אמת בשישה מתוך שישה — אותו שדה מסומן, אותו שדה ממוקד, ואותה הודעה מילה במילה כמו שנמדדה מהקובץ. הפריסה הביאה את הצבע ולא שינתה את ההתנהגות. אפס הודעות קונסולה ואפס שגיאות בשתי הריצות, וכל טעינה עם cachebust — gannenet-dev-served-by-stale-sw. וההמתנה היא עד שהערך מפסיק לזוז ולא זמן קבוע — computed-style-measures-a-transition.

⚠️ 390x844 נמדד ולא רק צולם: השדה מסומן וממוקד, אותו גבול ואותה ניגודיות, ואפס גלישה אופקית — וכך גם ב-1280x901, ובשני הרוחבים נמדד scrollWidth מול clientWidth ולא הונח.

⚠️ מצב טסט נמדד ולא הוצהר. אף פנייה לא נוצרה, ולא מזהירות אלא מפני ששני הקודים שיוצאים לרשת הם return שיושב מעל יצירת ה-contact ומעל יצירת ה-case ב-0058, והשלישי נעצר בחסימה המוקדמת ואינו נשלח. 6 תשובות נקלטו: any_ok=false, any_case_id=false, כולן 200, ושני קודים בדיוק כמצופה. אפס שורות, אפס הודעות יוצאות, אין זריעה, אין גלגול-אחורה ואין מיגרציה.

שלושה צילומים בשלושה MD5 (555E84E4, B0B3EBC6, B2359BD1) — screenshot-evidence-below-the-fold; החלון שונה פעם אחת לפני הכל, playwright-blank-screenshot-until-resize; והגלילה כוונה אל השדה המסומן ולא אל תיבת התוצאה.

⚠️ השורה הזאת נכתבה מקובץ ובאיחור, וה-at שלה אינו זמן הריצה — כדי שקורא עתידי לא יסיק מהחותמת סדר שלא היה.

מוגן: git status ריק על apps/08-bkalut-app, apps/09-bkalot-admin, apps/37-bkalot-clone ו-supabase. ראיות: QA/bkalot-clone/invalid-visible-deploy-0817/ (markers.mjs, classify.mjs + classify.json, probe-live.mjs + live-before.json/live-after.json, _verify.mjs + _results.json, measure-live.mjs + _measured-live.json, _context.json, ושלושה צילומים).$$,
'done',
$$commit על fix/nadlan-a11y, pushed. §5ב שכבה 1 — הפריסה של 8ef394c. dpl_7iy7vLhgpNN2PCFP1FUNqXjokkjs, READY, Aliased ל-more30.com. _verify PASS על 33 סימנים בשתי כתובות, 0 fails; 12 NEW, 2 DIFF, 19 CONTROL, 0 REMOVED, 0 DEAD. הצבע נקרא מדפדפן בייצור: 6/6 מקרים שווים למדידה מהקובץ ושונים מהירוק שהיה בייצור, ניגודיות 8.15/7.01 בבהיר ו-7.12/6.73 בכהה. אין מיגרציה, אין זריעה, אפס שורות במסד. ⚠️ שישי בתור — להריץ אחרי חמשת הקבצים שלפניו, בסדר הקומיטים.$$
);
