// מדידת ה-HTTP אחרי הפריסה: האם הגוף שחזר מהכתובת החיה הוא הקובץ החדש.
// נכתב ב-node ולא ב-PowerShell בכוונה — קובץ .ps1 בלי BOM נקרא כ-cp1255,
// והעברית שבתוך התבנית הייתה נהרסת בזמן הפירוק ומדווחת "לא נמצא" על טקסט קיים.
const URL_ADMIN = "https://more30.com/bkalot-studio/admin";

const out = (s) => process.stdout.write(s + "\n");

const r = await fetch(URL_ADMIN, { headers: { "cache-control": "no-cache" } });
const body = await r.text();
out(`status=${r.status} chars=${body.length} bytes=${Buffer.byteLength(body, "utf8")}`);

// המסומנים שנוספו ב-c3338c5 בלבד. אם אחד מהם חסר — נפרסה הגרסה הישנה.
const markers = [
  "fillQueueCell",          // הפונקציה עצמה
  "QUEUE_STATUS",
  "QUEUE_BAD",
  "queue_missing",
  "contact_email_differs",
  "<th>תור</th>",                     // <th>תור</th> — הכותרת של העמודה
  "בתור — טרם נשלח",   // בתור — טרם נשלח
  "חסום — לא יישלח",   // חסום — לא יישלח
  "כתובת המכתב",                 // כתובת המכתב
  "הסכמה בפנייה",           // הסכמה בפנייה
  "שורת התור חסרה",    // שורת התור חסרה
];
for (const m of markers) out(`marker ${JSON.stringify(m)} => ${body.includes(m)}`);

// שפיות קידוד: אל״ף אמיתית נספרת, וסימני כפל-קידוד (cp1255 שנקרא כ-UTF-8)
// חייבים להיות אפס — הם מה שהופך עמוד 200 תקין לג׳יבריש בעין של המבקר.
const alef = (body.match(/א/g) || []).length;
const mojibake = (body.match(/×[-ÿ]/g) || []).length;
const replacement = (body.match(/�/g) || []).length;
out(`alef=${alef} mojibake=${mojibake} replacement=${replacement}`);
