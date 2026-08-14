// בודק אילו סימנים יושבים בכל גרסה, וסופר מופעים ולא רק includes.
// מסומן שמופיע פעמיים היה מחזיר true על הגרסה שבייצור בזכות המופע האחר —
// המלכודת של 530fb44, 29d6ac6 ו-e12acf9.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// כל אחד נספר בשתי הגרסאות לפני שנקבע (verify-markers.mjs), ורק מי שהחזיר
// 0 בייצור ו-≥1 במקור נשאר כאן.
//
// «גדול מכל מספר נושא שקיים במערכת» לבדו נפסל כמסומן: הוא כבר יושב בייצור
// מ-1bd2ff5 בתוך whyTopicNoInvalid («מספר הנושא גדול מכל...») ו-היה מחזיר true
// על הגרסה שבייצור. מה שנספר הוא הצירוף עם why: — התשובה של preflight ולא של
// נתיב השרת. גם TOPIC_NO_MAX לבדו נפסל: הקבוע כבר בקובץ מאז 1bd2ff5.
const NEW = [
  'if (value && Number(value.trim()) > TOPIC_NO_MAX) {',
  'why: "גדול מכל מספר נושא שקיים במערכת" };',
  '// הגבול השני, ומאותו טעם:',
  '// Number ולא parseInt: parseInt("12ab") מחזיר 12',
];

// 67555e3 היא תוספת טהורה — 12 שורות נוספו ואפס נמחקו — ולכן אין מחרוזת
// שנעלמה, ו-REMOVED נמדד כסמיכות: כמה שורות מפרידות בין החסימה הקודמת לבין
// סוף preflight(). בייצור הן צמודות, במתוקן הבדיקה החדשה ביניהן.
// העוגן נלקח כמופע האחרון ולא הראשון — מלכודת ac6e523, שם עוגן שחוזר בקובץ
// החזיר מרחק שאינו הסמיכות הנמדדת.
const GAP_FROM = 'why: "צריך מספר שלם" };';
const GAP_TO = "    return null;\n  }";

// קיימים בשני הצדדים — מראים שזה אותו קובץ ולא קובץ אחר לגמרי.
const OLD = [
  "function preflight(kind) {",
  "const stop = preflight(kind);",
  "const TOPIC_NO_MAX = 2147483647;",
  "function whyTopicNoInvalid(sent) {",
  "function markInvalid(el) {",
  "bkalot-clone-intake",
  "הפנייה לא נשלחה",
  "צריך מספר שלם",
  "validity.badInput",
  "גדול מכל מספר נושא שקיים במערכת", // 1 בייצור, 2 במתוקן — ספירה ולא נוכחות
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

function gapLines(text) {
  const from = text.lastIndexOf(GAP_FROM);
  if (from === -1) return null;
  const to = text.indexOf(GAP_TO, from);
  if (to === -1) return null;
  return text.slice(from, to).split("\n").length - 1;
}

export function inspect(label, text) {
  return {
    label,
    bytes: Buffer.byteLength(text),
    new: Object.fromEntries(NEW.map((m) => [m, count(text, m)])),
    gap_lines_after_previous_block: gapLines(text),
    old: Object.fromEntries(OLD.map((m) => [m, count(text, m)])),
  };
}

// רק כשהקובץ מורץ ישירות — http-check.mjs מייבא אותו ומעביר argv משלו.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain && process.argv[2]) {
  const out = process.argv.slice(2).map((p) => inspect(p, readFileSync(p, "utf8")));
  console.log(JSON.stringify(out, null, 2));
}
