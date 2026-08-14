// בודק אילו סימנים יושבים בכל גרסה, וסופר מופעים ולא רק includes.
// מסומן שמופיע פעמיים היה מחזיר true על הגרסה שבייצור בזכות המופע האחר —
// המלכודת של 530fb44, 29d6ac6 ו-e12acf9.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// כל אחד נספר בשתי הגרסאות לפני שנקבע. «הפנייה לא נשלחה» נבדק כאן ונפסל
// כמסומן NEW: הוא כבר יושב בייצור בשורה 368 (נתיב השגיאה הקיים של show("bad"))
// והיה מחזיר true על הגרסה שבייצור. הוא ירד ל-OLD, ושינוי הספירה שלו נמדד בנפרד.
const NEW = [
  'function preflight(kind) {',
  'const stop = preflight(kind);',
  'if (kind !== "treatment") return null;',
  'תקנו ושלחו שוב.',
];

// ac6e523 היא תוספת טהורה — 32 שורות נוספו ואפס נמחקו — ולכן אין מחרוזת
// שנעלמה. REMOVED נמדד כסמיכות: לפני התוספת השורה שאחרי
// const kind = form.elements.kind.value; הייתה השורה הריקה ואז const payload = {.
const ADJACENCY = {
  after: 'const kind = form.elements.kind.value;',
  before: 'const payload = {',
};

// קיימים בשני הצדדים — מראים שזה אותו קובץ ולא קובץ אחר לגמרי.
const OLD = [
  'שדות שלא נשמרו: ',
  'צריך מספר שלם',            // מ-193da4a — קיים בשתי הגרסאות, ולכן אינו NEW
  'הפנייה לא נשלחה',          // נתיב השגיאה הקיים בשורה 368 — קיים בייצור
  'function whyDropped(',
  'function focusDropped(',
  'const DROPPED = {',
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

// כמה שורות מפרידות בין שתי השורות של הסמיכות.
// העוגן מופיע פעמיים בקובץ (שורה 328 ושוב בתוך מטפל ה-submit), ולכן נלקח
// המופע האחרון ולא הראשון — הראשון החזיר מרחק של 74 שורות, שאינו הסמיכות
// שנמדדת כאן אלא מרחק בין שני מקומות שאין ביניהם דבר.
function gap(text) {
  const lines = text.split(/\r?\n/);
  const a = lines.map((l, i) => (l.includes(ADJACENCY.after) ? i : -1)).filter((i) => i >= 0).pop();
  if (a === undefined) return null;
  const b = lines.findIndex((l, i) => i > a && l.includes(ADJACENCY.before));
  if (b === -1) return null;
  return { anchor_line: a + 1, payload_line: b + 1, between: b - a - 1 };
}

export function inspect(label, text) {
  return {
    label,
    bytes: Buffer.byteLength(text),
    new: Object.fromEntries(NEW.map((m) => [m, count(text, m)])),
    old: Object.fromEntries(OLD.map((m) => [m, count(text, m)])),
    gap_lines: gap(text),
  };
}

// רק כשהקובץ מורץ ישירות — http-check.mjs מייבא אותו ומעביר argv משלו.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain && process.argv[2]) {
  const out = process.argv.slice(2).map((p) => inspect(p, readFileSync(p, "utf8")));
  console.log(JSON.stringify(out, null, 2));
}
