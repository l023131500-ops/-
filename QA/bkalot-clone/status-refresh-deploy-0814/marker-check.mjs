// בודק אילו סימנים יושבים בכל גרסה של admin.html, וסופר מופעים ולא רק includes.
// מסומן שמופיע פעמיים היה מחזיר true על הגרסה שבייצור בזכות המופע האחר —
// המלכודת של 530fb44, 29d6ac6 ו-e12acf9.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// כל אחד נספר בשתי הגרסאות לפני שנקבע (verify-markers.mjs), ורק מי שהחזיר
// 0 בייצור ו-≥1 במקור נשאר כאן. אלה שורות ההערה שנוספו ב-643ccf2.
const NEW = [
  "// ── הרשימה מתרעננת בחזרה ולא כאן",
  "// כאן ישבה עד עכשיו load() נוספת. היא פונה לשרת בזמן שהרשימה מוסתרת,",
  "// שגיאה של בקשה שהוא לא ביקש, על פעולה שהצליחה.",
  "// openCase נשארת: היא בונה את המסך שכן עומד מול העיניים.",
];

// כאן REMOVED הוא מחרוזת שנעלמה ולא סמיכות, ההפך מ-67555e3: 643ccf2 מחקה שורה
// ממש. «await load();» לבדו נפסל כמסומן — הוא מופיע בקובץ גם במקומות אחרים
// (התחברות, ניתוק, סינון) והיה מחזיר true על שתי הגרסאות; מה שנספר הוא
// הסמיכות המדויקת שנמחקה, openCase ואחריה load באותו מטפל.
const REMOVED = ["await openCase(c.id, undefined, msg);\n        await load();"];

// קיימים בשני הצדדים — מראים שזה אותו קובץ ולא קובץ אחר לגמרי.
// «await load();» כאן הוא ספירה ולא נוכחות: הוא יורד באחד בדיוק.
const OLD = [
  "await openCase(c.id, undefined, msg);",
  "await load();",
  "bkalot-clone-admin",
  "הסטטוס שונה מ«",
  "לא נשלחה שום הודעה",
  "הפנייה כבר הייתה ב«",
  "async function load()",
  "חזרה לרשימה",
];

function count(hay, needle) {
  let n = 0,
    i = 0;
  for (;;) {
    const at = hay.indexOf(needle, i);
    if (at === -1) return n;
    n++;
    i = at + needle.length;
  }
}

export function inspect(label, text) {
  return {
    label,
    bytes: Buffer.byteLength(text),
    new: Object.fromEntries(NEW.map((m) => [m, count(text, m)])),
    removed: Object.fromEntries(REMOVED.map((m) => [m, count(text, m)])),
    old: Object.fromEntries(OLD.map((m) => [m, count(text, m)])),
  };
}

// רק כשהקובץ מורץ ישירות — http-check.mjs מייבא אותו ומעביר argv משלו.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain && process.argv[2]) {
  const out = process.argv.slice(2).map((p) => inspect(p, readFileSync(p, "utf8")));
  console.log(JSON.stringify(out, null, 2));
}
