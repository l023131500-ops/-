// בודק אילו סימנים יושבים בכל גרסה, וסופר מופעים ולא רק includes.
// מסומן שמופיע פעמיים היה מחזיר true על הגרסה שבייצור בזכות המופע האחר —
// המלכודת של 530fb44, 29d6ac6 ו-e12acf9.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// כל אחד נספר בשתי הגרסאות לפני שנקבע (verify-markers.mjs), ורק מי שהחזיר
// 0 בייצור ו-≥1 במקור נשאר כאן.
// «צריך מספר שלם» נפסל כמסומן NEW: הוא כבר יושב בייצור מ-193da4a ומ-124cfc2,
// והיה מחזיר true על הגרסה שבייצור. הוא ירד ל-OLD ונמדד כספירה (4 → 5).
const NEW = [
  'function whyTopicNoInvalid(sent) {',
  'const TOPIC_NO_MAX = 2147483647;',
  'function markInvalid(el) {',
  'if (code === "topic_no_invalid" && "topic_no" in payload) {',
  'מספר הנושא גדול מכל מספר נושא שקיים במערכת.',
  'מספר הנושא אינו תקין. תקנו ושלחו שוב.',
];

// 1bd2ff5 אינה תוספת טהורה — שלוש שורות נמחקו מהחסימה המוקדמת כשרוכזו
// ל-markInvalid — ולכן REMOVED נמדד ישירות ולא כסמיכות.
const REMOVED = [
  'stop.el.setAttribute("aria-invalid", "true");',
  'stop.el.focus();',
];

// קיימים בשני הצדדים — מראים שזה אותו קובץ ולא קובץ אחר לגמרי.
const OLD = [
  'function preflight(kind) {',
  'const stop = preflight(kind);',
  'function whyDropped(',
  'function focusDropped(',
  'bkalot-clone-intake',
  'הפנייה לא נשלחה',
  'שדות שלא נשמרו: ',
  'topic_no:  "מספר נושא"',
  'validity.badInput',
  'צריך מספר שלם',                    // 2 בייצור, 3 במתוקן — ספירה ולא נוכחות
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
