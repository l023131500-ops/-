# theme-toggle-bkalot-0817 — 10 בקלות-תצוגה: הוספת פקד מצב-כהה ידני

מ-`POLISH_BACKLOG.md` §"מצב כהה — פקד ידני חסר (5 מערכות)": `/bkalot` היה
עוקב אחרי `prefers-color-scheme` בלבד, בלי פקד גלוי בעמוד. זה סטטי
(`apps/10-bkalot-rights/index.html` + `app.js` + `style.css`, בלי build) —
היחיד מבין החמש (02/03/06/10/35) שאינו דורש build של Next.js/Vite, ולכן
הפריט הקטן ביותר מתוך הרשימה.

## מה השתנה
- `index.html`: סקריפט ה-`<head>` (רץ לפני הציור הראשון) קורא קודם
  `localStorage.getItem('bkalot-theme')`; אם המשתמש בחר ידנית — זה מנצח.
  אחרת ממשיך לעקוב אחרי ה-OS (`matchMedia` + `change` listener), בדיוק כמו
  קודם. כפתור `#themeToggle` (🌙/☀️) נוסף לניווט, ליד `#adminLink`.
- `app.js`: מאזין קליק על הכפתור — הופך `.dark` על `<html>`, שומר
  ל-`localStorage['bkalot-theme']`, מחליף אייקון.
- `style.css`: `.theme-toggle` — עיגול 36px תואם ל-`--border`/`--teal` הקיימים.

## מה נמדד
מקומית (שרת סטטי על 8934, `/bkalot/` prefix כדי ש-`<base href="/bkalot/">`
יפתור נכון) ואז נגד הפרוס בייצור, עם Playwright:

| מצב | isDark | localStorage | רקע (body) |
|---|---|---|---|
| טעינה ראשונה (OS בהיר) | false | null | — |
| אחרי קליק | true | `dark` | `rgb(18,19,15)` |
| רענון עמוד אחרי קליק | true | `dark` | (ללא הבזק לבן — מוחל לפני הציור) |
| קליק נוסף (חזרה) | false | `light` | — |

נבדק גם מול הייצור (`https://more30.com/bkalot/?cachebust=0817b`): קליק
הפך את הרקע ל-`rgb(18,19,15)` בפועל. ראיות: `before-toggle.png`,
`after-toggle.png`, `live-after-toggle.png`.

## מצב טסט / מוגן
שינוי תצוגה בלבד ב-`apps/10-bkalot-rights` (מערכת 10, לא מוגנת — ראה
ההבחנה מ-08/09 ב-`app.js` השורות סביב `ADMIN_URL`). אין נגיעה במסד, בלידים,
או בכל ערוץ שליחה. `_deploy/bkalot-more30/bkalot/{index.html,app.js,style.css}`
עודכנו מהמקור אחרי שאומת שהעותק הפרוס זהה למקור המחויב (BOM בלבד, אין סחף)
ונפרס `vercel deploy --prod` (dpl_AXcBDcJmUAG3ya6b635B5wqPkhK9).

⚠️ ה-MCP של Supabase אינו מחובר לסשן הזה — heartbeat נכתב כקובץ
`_heartbeat-pending.sql` (מצטרף לתור הקיים; הרץ לפי סדר הקומיטים ב-git log).
