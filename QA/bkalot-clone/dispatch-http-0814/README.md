# dispatch מעל HTTP — bkalot-clone-admin v5 (§5ב, #234 סעיף 2)

הקו הפתוח שהפעימה הקודמת (3e8b1fd) הותירה נוסח בה עצמה: «אין נתיב HTTP ואין
כפתור «עבד עכשיו» — הלבנה הבאה, ואחריה פריסת פורטל». נלקח החצי הראשון בלבד:
נתיב ה-HTTP. אין מיגרציה, אין שינוי ב-`apps/37-bkalot-clone/admin.html`, ואין
פריסת פורטל.

## מה היה

0070 בנתה את `public.bkalot_clone_dispatch(jsonb)` ומדדה אותה במסד — מסלול מלא,
עיבוד שני, שורה חסומה, `mode=live`, יעד שהוסר מהרשימה, וקלט פגום. ה-EXECUTE שלה
`service_role` בלבד, כלומר לשכפול יש מעבד ואין ולו כתובת אחת שדפדפן יכול לפנות
אליה. אותו דפוס בדיוק שממנו נולדו #224, #233 ו-#234 סעיף 1.

## מה נבנה

נתיב `dispatch` ב-`supabase/functions/bkalot-clone-admin/index.ts`, מאחורי אותו
שער בדיוק כמו `render` ו-`queue`. נפרס כ-v5, `verify_jwt=true`, 17,933 בתים.

הנתיב מעביר את הגוף כפי שהוא ואינו מכיל ולו ארגומנט אחד שנוגע ב-`mode`,
ב-`status` או ב-`to_address`. שלושת השומרים של 0070 — `app_key='bkalot-clone'`,
`mode='test'`, והיעד ברשימת הבדיקה **ברגע העיבוד** — יושבים במסד בלבד. עותק שני
שלהם כאן היה כלל בטיחות שיכול להסתעף בשקט.

## מה נמדד (הכל מעל HTTP, `probe.mjs` → `probe-out.txt`)

הפניות נוצרו דרך נתיב הקליטה הציבורי (`bkalot-clone-intake`, מפתח anon מהטופס)
ולא בהזרקה למסד. A — יעד ברשימת הבדיקה; B — יעד שאינו בה.

| # | מה נבדק | תוצאה |
|---|---|---|
| 00 | `OPTIONS /dispatch` | 204, `x-admin-token` מוכרז |
| 01 | `dispatch` בלי טוקן | **401** `token_required` |
| 02 | `dispatch` עם טוקן פגום | **401** `invalid_session` |
| 03 | המסלול המלא (שורה 30) | `ok:true`, `status=skipped`, `outcome=dry_run`, `content_bytes=7609`, `body_matches_document=true`, `sent_for_real=0` |
| 04 | עיבוד שני של אותה שורה | `not_queued`, `already_processed=true` |
| 05 | שורה שנכנסה חסומה (31) | `not_queued`, `status=blocked` |
| 06 | **שורת המערכת החיה (#6)** | `not_a_clone_row`, `app_key=bkalot` |
| 07 | `{}` · `"27abc"` | `queue_id_required` |
| 07 | 25 ספרות · מזהה שאינו קיים | `queue_row_not_found` (ולא נפילת bigint) |
| 07 | הכינוי `id` | עובד — הגיע ל-0070 ונענה לגופו |
| 08 | נתיב שאינו קיים | 404, `dispatch` ברשימת המותרים |

שורה 06 היא המדידה שהצעד הזה קנה יותר מכל: הכתובת החדשה פתוחה לכל מי שיש לו
סשן ניהול של השכפול, והיא חולקת את `outbound_queue` עם המערכת החיה. מזהה של
שורת מקור חזר בסירוב **בלי ולו כתיבה אחת**.

## מצב טסט — נמדד ולא הוצהר

`sent_at is not null` = 0 · `mode='live'` = 0 · `sent_for_real=0` בתשובה.
אין מייל, אין הודעה ואין מסמך שיצא החוצה.

`delivery_log` עלה מ-3 ל-4 — שורה אחת בדיוק, על שורת התור 30 בלבד. העיבוד השני
(04) והשורה החסומה (05) לא כתבו ולו שורה אחת.

## בידוד מהמערכת החיה

8 שורות `app_key='bkalot'` נשארו 8, טביעת אצבע `da28ec6315535ec0bfbebad4d57752a7`
זהה לפני ואחרי. `max_attempts=0` בשתי שורות השכפול, והפרדיקט המדויק של המעבד
של המקור (`status='queued' and attempts < max_attempts`) מחזיר `[6]` בלבד ולא את
30 ואת 31. המעבד של המקור לא הורץ בכוונה.

## הבדיקה התגלגלה אחורה במלואה

בסדר הנכון — יומן, מסמכים (`documents.queue_id` הוא FK), שורות תור, `case_rights`,
פניות (`cases_contact_id_fkey` הוא `ON DELETE SET NULL`), אנשי קשר, סשן, משתמש
ניהול. אחרי: `cases=0 · case_rights=0 · documents=0 · contacts=4 · admin_users=1 ·
admin_sessions=5 · templates=2 · catalog=888 · outbound_queue=8 · delivery_log=3`
— זהה בדיוק לבסיס שנמדד לפני.

## מה שנשאר פתוח ולא נבלע

- **אין כפתור «עבד עכשיו»** — `admin.html` אינה קוראת ל-`dispatch` כלל, ולכן אין
  בצעד הזה צילום מסך: אין מסך שהשינוי משנה בו משהו. זו הלבנה הבאה, ואחריה
  פריסת פורטל.
- `cases.status` נשאר `new` גם אחרי עיבוד מוצלח.
- `body_matches_document` נמדד ואינו חוסם (`render` עושה upsert על
  `case_id+kind`).
- `pdf`/`audio` → `channel_unsupported`; בחירת תבנית — `render` מקבל
  `template_key` והמסך אינו שולח אותו.
- `public_visible` ו-`show_in_showcase` של #37 נשארים false.

אין נגיעה בשום נתיב מוגן: `git status` על `apps/08-bkalut-app` ו-`apps/09-bkalot-admin`
ריק, ואין נגיעה ב-`bkalut-app`/`bkalot-admin`/`zr_*`/`NEDARIM3873` ולא בסכמות
`csj`/`csj_src`/`igud`. שום פונקציה של `bkalot_auto` לא שונתה.
