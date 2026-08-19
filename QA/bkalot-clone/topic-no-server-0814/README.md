# מספר נושא שאינו מספר — הרשת הייתה רק במסך (0079)

**מה נמדד לפני המיגרציה.** POST ישיר אל
`/functions/v1/bkalot-clone-intake` (PowerShell, לא דפדפן — כלומר בלי אף אחת
מארבע השכבות שנבנו ב-a6eb793..4746bf3), עם `kind=treatment`,
`situation=young_single`, `topic_no="שבע"`:

```
200 {"ok": true, "case_id": 154, "dropped": ["topic_no"], "rights_linked": 36, ...}
```

והשורה במסד: `topic_no = null`, הערך שנמסר יושב רק ב-`raw`, 36 זכויות מחוברות.
פנייה חיה במצב `new` בלי מספר הנושא שהיא אמורה להיות מנותבת לפיו, והקורא קיבל
`ok:true`.

**מה נמדד אחרי.** אותה בקשה בדיוק:

```
200 {"ok": false, "error": "topic_no_invalid",
     "detail": "מספר הנושא הוא מספר שלם — הפנייה מנותבת לפיו"}
```

ואפס פניות נוצרו (`max(id)` נשאר על מה שיצרו הבדיקות האחרות בלבד).

**שלוש בקרות שלא זזו** — כי מיגרציה שמתקנת נתיב אחד ומזיזה אחר אינה תיקון:

| | בקשה | תשובה |
|---|---|---|
| B | `treatment` + `topic_no="7"` | `ok:true`, `dropped []`, 36 זכויות |
| C | `info` + `topic_no` + `situation` | `ok:true`, `dropped ["situation","topic_no"]` |
| D | `treatment` + `topic_no=" 12 "` | `ok:true`, `dropped []` — btrim כמו קודם |

C היא הבקרה החשובה: בסוגים שאינם טיפול מלא השדה ממשיך ליפול אל `dropped[]`
בדיוק כשהיה. שם הסוג אינו שואל את השדה כלל, והטופס אף אינו מציג אותו — פסילה
שם הייתה עוצרת פנייה תקינה על שדה שלא נשאל.

**הרשאות לא זזו:** `anon` false, `authenticated` false, `service_role` true —
לפני ואחרי. `create or replace` שומר grants, ונמדד ולא הונח.

**מצב טסט:** `documents` 0, `outbound_queue` 8, אפס `sent_at`, `delivery_log` 3,
`rights.catalog` 888 — כל החמישה זהים למה ש-heartbeat 594 רשם.

**התגלגל אחורה** בשלוש פקודות נפרדות לפי id (case_rights → cases → contacts),
לא ב-CTE אחד: ב-CTE יחיד כל ה-branch קורא את הצילום שלפני הפקודה, ומחיקת ההורה
מדווחת הצלחה בעוד שורות הבן נשארות. אחרי: `bkalot_clone.cases` = 0, אפס
`case_rights` יתומות, `bkalot_auto.contacts` = 4. בדיוק מצב הבסיס.

**מה שלא כוסה כאן:** `'^[0-9]+$'` מקבל מחרוזת ארוכה מכפי שנכנסת ל-integer
(`'9'` כפול 12); ה-cast זורק אז 22003 שאיש אינו תופס, והקורא מקבל `rpc_failed`
502 במקום שגיאת שדה. קו נפרד.
