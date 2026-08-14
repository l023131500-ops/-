// בודק אילו סימנים יושבים בכל גרסה, וסופר מופעים ולא רק includes.
// מסומן שמופיע פעמיים היה מחזיר true על הגרסה שבייצור בזכות המופע האחר —
// המלכודת של 530fb44, 29d6ac6 ו-e12acf9.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// כל אחד נספר בשתי הגרסאות לפני שנקבע.
// «צריך מספר שלם» ו-«הפנייה לא נשלחה» נפסלו כמסומני NEW: שניהם כבר יושבים
// בייצור מ-193da4a ומנתיב השגיאה הקיים, והיו מחזירים true על הגרסה שבייצור.
// הם ירדו ל-OLD. הערה: «צריך מספר שלם» עולה מ-1 ל-2 ב-124cfc2, ולכן היא
// נמדדת כספירה ולא כנוכחות.
const NEW = [
  'if (el.validity && el.validity.badInput) {',
  'const el = $("topic_no");',
  'נתיב שני, ושקט מהראשון',
  'validity.badInput',                       // 2 במתוקן (קוד + הערה), 0 בייצור
];

// 124cfc2 אינה תוספת טהורה — יש שורות שנמחקו, ולכן REMOVED נמדד ישירות
// ולא כסמיכות (בניגוד ל-69ed468).
const REMOVED = [
  'const value = $("topic_no").value;',
  '{ el: $("topic_no"), name: DROPPED.topic_no',
];

// קיימים בשני הצדדים — מראים שזה אותו קובץ ולא קובץ אחר לגמרי.
const OLD = [
  'function preflight(kind) {',
  'const stop = preflight(kind);',
  'if (kind !== "treatment") return null;',
  'צריך מספר שלם',
  'הפנייה לא נשלחה',
  'שדות שלא נשמרו: ',
  'function whyDropped(',
  'function focusDropped(',
  'bkalot-clone-intake',
  'topic_no:  "מספר נושא"',
];

function count(hay, needle) {
  let n = 0, i = 0;
  for (;;) {
    const at = hay.indexOf(needle, i);
    if (at === -1) return n;
    n++; i = at + needle.length;
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
