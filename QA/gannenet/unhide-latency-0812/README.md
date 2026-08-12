# #184 — ביטול הסתרה לא חזר (40 גן-קליק), 12/08

## מה היה

הפעימה הקודמת (13:44, commit `c39413c`) סגרה את #183 ורשמה קו פתוח: הסתרה תופסת
מיד, **ביטול הסתרה לא חוזר**. הכתיבה נחתה — `/api/admin/override` החזיר
`{"ok":true,"override":{}}` ואובייקט האחסון נקרא `{}` מיד אחר כך — ובכל זאת המדף
הציבורי לא החזיר את הפריט ו"החומרים שלי" עדיין סימן `hidden=true`. בדיקה חוזרת
כמה דקות אחר כך מצאה אותו חזר. **אורך החלון לא נמדד**, ומסך הניהול מבטיח לאורכו
שההסתרה הפיכה ומדווח "נשמר".

## הסיבה

`lib/overrides.ts` — `readOverrides()` קרא את אובייקטי ה-override **בלי**
ה-cache-buster ש-`setOverride()` ו-`isHiddenFile()` כן משתמשים בהם. ה-CDN של
Supabase יושב מול האובייקט ונצפה מגיש `x-cache: HIT` עם גוף מיושן; `cache:
"no-store"` הוא המטמון של Next ואינו אומר לו דבר, וכותרת `Cache-Control:
no-cache` בבקשה לא הזיזה אותו — רק URL שונה.

זה מסביר גם את חוסר הסימטריה: **הסתרה** כותבת אובייקט שלא היה, ולכן אין מה
להגיש מיושן; **ביטול הסתרה** כותב `{}` מעל גוף שה-CDN כבר מחזיק, ולכן הוא נבלע.

## התיקון

כל קריאה של אובייקט override פר-קובץ עוברת ב-`fresh`. המפה הישנה (`overrides.json`)
נשארת ניתנת למטמון — שום נתיב קוד לא כותב אליה יותר, ולכן גוף מטמון שלה לא יכול
להיות מיושן.

העלות שנמדדה, ולא הונחה: ה-LIST מוגבל לקידומת `overrides/`, כלומר קריאה לא-ממוטמחת
אחת לכל קובץ ש**אדמין פעל עליו אי פעם** — שלושה בייצור בזמן המדידה — ולא לכל אחד
מ-258 חומרי ה-seed.

## המדידה

`unhide-latency.mjs` מריץ מחזור curation שלם מול הייצור ומתזמן את שני הכיוונים
בעזרת polling של המדף הציבורי (גבול 120 שניות לכל כיוון; "לא התכנס" הוא תוצאה,
לא קריסה):

```
GN_ADMIN_KEY=<core.secrets ADMIN_PASSWORD> node QA/gannenet/unhide-latency-0812/unhide-latency.mjs
```

התוצאה אחרי הפריסה (`_results.txt`):

```
ok    public shelf drops it — converged after 3169ms (1 reads)
ok    mine while hidden — has-it=true hidden-flag=true
200   override hidden=false — {"ok":true,"override":{}}
200   storage object after unhide — {}
ok    public shelf returns it — converged after 1563ms (1 reads)
ok    mine after unhide — has-it=true hidden-flag=undefined
PASS  RESULT — hide=3169ms unhide=1563ms
```

`1 reads` בשני הכיוונים — הקריאה הראשונה כבר צדקה, כלומר הזמן שנמדד הוא הלטנציה
של הבקשה עצמה ולא המתנה. הכיוון שלא התכנס כלל קודם, מתכנס עכשיו מיד.

## מצב טסט

לא נוצר משתמש, לא נשלחה הודעה, לא בוצע חיוב. החומר שהועלה הוסתר, בוטלה הסתרתו
ונמחק באותה ריצה; המדף הציבורי חזר ל-`has-it=false` ו-258 קבצי ה-seed לא נגעו.
אובייקט ה-override של אותו מזהה שורד את החומר שהוא curated — מפתח ה-anon רשאי
ליצור ולדרוס אך לא למחוק — וזה תועד כבר ב-`hide-roundtrip-0812/`.
