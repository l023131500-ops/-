# cases-filter-validation-0817 — bkalot_clone_admin_cases, the four filter-validation branches, over live HTTP

מדידה בלבד. אין שינוי קוד, אין מיגרציה, אין פריסה.

## מה היה
`bkalot_clone_admin_cases` דוחה ערך לא-מוכר בכל אחד מארבעת שדות הסינון
(`kind`/`status`/`decided`/`sort`) עם קוד שגיאה מפורש (`kind_unknown`,
`status_unknown`, `decided_unknown`, `sort_unknown`) — נבנה במיגרציות 0060/0081/0082
ונבדק במסד. אבל עד עכשיו הבדיקה היחידה שלהם הייתה קריאה ישירה ל-SQL
(`QA/bkalot-clone/queue-total-0816`, לא committed — פיגום, לא הטענה) או קריאה
ל-`bkalot-clone-admin` בלי סינון בכלל (`admin-http-0813`). אף אחד מארבעת הענפים
לא נמדד דרך הכתובת שדפדפן באמת פונה אליה, עם סשן ניהול אמיתי.

## מה נמדד
כניסה אמיתית ל-`https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-admin`
עם `l023131500@gmail.com` + `STD_ADMIN_PASSWORD`, ואז ארבע קריאות `/cases`:

| סינון | HTTP | error | allowed |
|---|---|---|---|
| `kind:"bogus"` | 200 | `kind_unknown` | info/reminder/treatment |
| `status:"bogus"` | 200 | `status_unknown` | new/in_progress/sent/closed/rejected |
| `decided:"bogus"` | 200 | `decided_unknown` | yes/no |
| `sort:"bogus"` | 200 | `sort_unknown` | created_at/decided_at |

כל ארבעתן זהות מילה-במילה למה שהמסד מחזיר, וכולן HTTP 200 עם `error` בגוף —
עקבי עם שאר הענפים בקובץ הזה (דחיית קלט אינה כשל HTTP).

## בקרות
ארבעת הערכים התקינים (`kind:info`, `status:new`, `decided:no`,
`sort:decided_at`) עברו כולם `ok:true` באותה בקשה. `queue_total` תואם ל-0099:
`null` כשאין סינון, `null` כש-`sort` הוא הסינון היחיד (0082 הכרעה 4 — מיון אינו
סינון), ו-`0` כש-`kind`/`status`/`decided` מסננים (המסד ריק ברגע המדידה, ולכן
`total=0` ו-`queue_total=0` — לא נבדק על תור לא-ריק בסבב הזה).

## מצב טסט
כל 11 הבקשות קוראות בלבד (`cases`/`login`/`logout`). אין `outbound_queue`, אין
`delivery_log`, אין כתיבה לשום ערוץ שליחה. `logout` בסוף לא משאיר סשן פתוח.

## מוגן
אין נגיעה בקוד, במיגרציה או בפריסה — מדידה בלבד מול הפרוס הקיים.
`apps/08-bkalut-app`, `apps/09-bkalot-admin`, `zr_*`, `NEDARIM3873` לא נגעו.

ראיות: `probe.ps1`, `probe-out.txt`.
