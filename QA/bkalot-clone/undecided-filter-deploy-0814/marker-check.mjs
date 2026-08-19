// ספירה ולא includes: מסומן שמופיע גם בגרסה שבייצור מחזיר true ומוכיח כלום —
// המלכודת של 530fb44, 29d6ac6 ו-e12acf9. כאן היא קרובה במיוחד, מפני שהמסך כבר
// אומר «לא נרשמה הכרעה ידנית מהמסך» מאז 0077: «לא נרשמה» ו«הכרעה ידנית»
// כמסומנים בפני עצמם מחזירים true גם על הגרסה שבייצור. שניהם נספרים כאן
// במפורש תחת TRAP ואינם משמשים כראיה.
//
// ששת מסומני NEW הם קוד ולא טקסט שיווקי, וכל אחד נספר בשתי הגרסאות לפני
// שנקבע: 0 ב-prev ו-1 במקור.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const NEW = {
  control_html: 'id="f-decided"',
  const_decided: 'const DECIDED = [["no","לא נרשמה"],["yes","נרשמה"]];',
  options_loop: 'for (const [v, t] of DECIDED) $("f-decided").append',
  key_sent: 'decided: $("f-decided").value',
  message: 'decided_unknown:      "מצב ההכרעה שנבחר אינו מוכר. רעננו את הדף."',
  grid: "grid-template-columns:1fr 1fr 1fr 2fr auto",
};

// מחרוזת שנעלמה ממש ולא סמיכות: שורת lastFilters הוחלפה, ולכן הצירוף הישן של
// kind ו-q זה-לצד-זה אינו קיים עוד במתוקן.
const REMOVED = { lastfilters_old: 'kind: $("f-kind").value, q: $("f-q").value.trim()' };

// חייבים להישאר בשני הצדדים — רגרסיה ולא רק תוספת, ומראים שזה אותו קובץ.
const OLD = {
  f_status: 'id="f-status"',
  f_kind: 'id="f-kind"',
  f_q: 'id="f-q"',
  status_unknown: "status_unknown:",
  kind_unknown: "kind_unknown:",
  row_bit: "לא הוכרע מהמסך",
  case_bit: "לא נרשמה הכרעה ידנית מהמסך",
  submit: '$("filters").addEventListener',
  grid_mobile: ".filters .search{grid-column:1/-1}",
  base: "bkalot-clone-admin",
};

const TRAP = { lo_nirshma: "לא נרשמה", hachraa_yadanit: "הכרעה ידנית" };

const count = (h, n) => h.split(n).length - 1;

export function inspect(label, text) {
  return {
    label,
    bytes: Buffer.byteLength(text),
    NEW: Object.fromEntries(Object.entries(NEW).map(([k, v]) => [k, count(text, v)])),
    REMOVED: Object.fromEntries(Object.entries(REMOVED).map(([k, v]) => [k, count(text, v)])),
    OLD: Object.fromEntries(Object.entries(OLD).map(([k, v]) => [k, count(text, v)])),
    TRAP: Object.fromEntries(Object.entries(TRAP).map(([k, v]) => [k, count(text, v)])),
  };
}

// רק כשהקובץ מורץ ישירות — http-check.mjs מייבא אותו ומעביר argv משלו.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain && process.argv[2]) {
  const out = process.argv.slice(2).map((p) => inspect(p, readFileSync(p, "utf8")));
  console.log(JSON.stringify(out, null, 2));
}
