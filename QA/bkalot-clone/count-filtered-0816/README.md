# המונה מדבר על התור בזמן שהוא סופר את הסינון

**מה נמדד:** `#count` — השורה שמעל רשימת הפניות, `role="status"`, זו שמוקראת בקול
אחרי «הצג».

`total` חוזר מהשרת **אחרי** הסינון (0081 סופרת את מה שעונה על התנאים), והשורה
ציירה אותו כמשפט על התור. שני מצבים שונים לגמרי נראו על המסך אות באות אותו הדבר,
ומצב שלישי אמר «אין פניות» על תור שיש בו פנייה.

## איך להריץ מחדש

```powershell
# בייטי HEAD (מה שבייצור) לתיקייה נפרדת — cmd ולא PowerShell, כדי שהבייטים יהיו מדויקים
cmd /c "git show HEAD:apps/37-bkalot-clone/admin.html > QA\bkalot-clone\count-filtered-0816\head\admin.html"
node QA\bkalot-clone\count-filtered-0816\serve.mjs apps\37-bkalot-clone 8137
node QA\bkalot-clone\count-filtered-0816\serve.mjs QA\bkalot-clone\count-filtered-0816\head 8138
node QA\bkalot-clone\count-filtered-0816\seed.mjs      # פנייה אחת דרך נתיב הציבור
node QA\bkalot-clone\count-filtered-0816\measure.mjs   # שתי ריצות, שלושה מצבים, ארבעה צילומים
```

`head/` אינה ב-commit: היא עותק בייט-בבייט של הקובץ שכבר יושב ב-HEAD, ואפשר
לייצר אותה מחדש בפקודה שלמעלה. בריצה הזו היא נמדדה כ-160,897 בייט ו-MD5
`3CEDD39D` — בדיוק הבייטים שנפרסו לייצור ב-8851cb5.

## מה חזר (dom.json)

| מצב | סינון | HEAD (8138) | עץ העבודה (8137) | שורות |
|---|---|---|---|---|
| queue | — | «פנייה אחת» | «פנייה אחת» | 1 |
| match | סטטוס=חדשה | «פנייה אחת» | «פנייה אחת תואמת את הסינון» | 1 |
| nomatch | סטטוס=נשלחה | «אין פניות» | «אין פניות שתואמות את הסינון» | 0 |
| back | סטטוס=חדשה | «פנייה אחת» | «פנייה אחת תואמת את הסינון» | 1 |

- **queue היא הבקרה:** המצב בלי סינון לא זז בין הגרסאות, ו-`title` נשאר null
  בשתיהן. מה שהשתנה הוא רק המסלול שבו יש סינון.
- **`rows` היא הבקרה השנייה:** המונה נקרא מאותה טעינה שציירה את השורות, ולא
  מטעינה קודמת — 1/1/0/1 בשתי הגרסאות בדיוק.
- **back** אומרת שהמצב מתהפך חזרה ואינו נדבק: nomatch → match מחזיר את המשפט
  של match.
- קונסולה: אפס הודעות. אפס תגובות שאינן 2xx/3xx.
- ארבעה צילומים בארבעה MD5 שונים (5D54BBEA, 95B95151, 8707161F, D880C3A5) —
  תקלת screenshot-evidence-below-the-fold; הגלילה אל הטופס ולא אל ראש הדף.

## מצב טסט

`queued=false` בקליטה, documents 0, `outbound_queue` נשאר 8, אפס שורות `sent_at`,
`delivery_log` נשאר 3, אפס קריאות יוצאות. `kind=info` ולא treatment, ולכן
`case_rights` 0 לאורך כל הריצה.

## גלגול אחורה

בפקודות נפרדות לפי טבלה — תקלת `cte-delete-sees-prestatement-snapshot`; ואיש
הקשר לפי id ולא לפי טלפון מנורמל. ⚠️ `contacts` יושבת ב-`bkalot_auto` ולא
ב-`bkalot_clone`. נמחקו: cases 1 (386), contacts 1 (393), admin_sessions של 121,
admin_users 1 (121); `case_status_log` החזירה 0 — לא נעשה ולו מעבר סטטוס אחד
בריצה הזו. אחרי: cases 0, case_status_log 0, case_rights 0, documents 0,
admin_users 1, admin_sessions 5, templates 2, contacts 4, outbound_queue 8,
delivery_log 3, rights_catalog 888 — בסיס בדיוק.

## מה לא נבנה כאן

אין «מתוך N בסך הכול»: השרת מחזיר total אחד — של הסינון — ואין למסך מאין לדעת
כמה פניות יש בתור כולו. מספר כזה היה מומצא. המיון אינו נספר כסינון, מפני שאינו
מוציא ולו שורה אחת. וזו מדידה של הקוד שבמקור בלבד — **הפריסה היא פעולה נפרדת**,
ובייצור המונה עדיין אומר «אין פניות» על תור מלא.
