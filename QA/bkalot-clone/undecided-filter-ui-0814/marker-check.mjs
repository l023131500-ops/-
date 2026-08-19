// ספירה ולא includes: מסומן שמופיע גם בגרסה שבייצור מחזיר true ומוכיח כלום.
// זו המלכודת של 530fb44, 29d6ac6 ו-e12acf9, וכאן היא קרובה במיוחד — המסך כבר
// אומר «לא נרשמה הכרעה ידנית מהמסך» במסך הפנייה הבודדת (שורה 1350 בגרסה
// שבייצור), ולכן גם «לא נרשמה» וגם «הכרעה ידנית» כמסומנים בפני עצמם היו
// מחזירים true על הגרסה שבייצור. שניהם נספרים כאן במפורש בתור TRAP ואינם
// משמשים כראיה; מה שמשמש הוא הקוד — id="f-decided", הקבוע DECIDED, המפתח
// שנשלח, והמשפט השלם decided_unknown.
import { readFileSync, writeFileSync } from "node:fs";

const files = {
  prev: new URL("./prev/admin.html", import.meta.url),
  fixed: new URL("file:///C:/Users/USER/Downloads/more30/apps/37-bkalot-clone/admin.html"),
};

const NEW = {
  control_html:  'id="f-decided"',
  const_decided: 'const DECIDED = [["no","לא נרשמה"],["yes","נרשמה"]];',
  options_loop:  'for (const [v, t] of DECIDED) $("f-decided").append',
  key_sent:      'decided: $("f-decided").value',
  message:       'decided_unknown:      "מצב ההכרעה שנבחר אינו מוכר. רעננו את הדף."',
  grid:          "grid-template-columns:1fr 1fr 1fr 2fr auto",
};
// המחרוזת שנעלמה ממש, ולא סמיכות: שורת lastFilters הוחלפה, ולכן הצירוף הישן
// של kind ו-q זה-לצד-זה אינו קיים עוד.
const REMOVED = { lastfilters_old: 'kind: $("f-kind").value, q: $("f-q").value.trim()' };
// חייבים להישאר — רגרסיה ולא רק תוספת.
const OLD = {
  f_status: 'id="f-status"', f_kind: 'id="f-kind"', f_q: 'id="f-q"',
  status_unknown: "status_unknown:", kind_unknown: "kind_unknown:",
  row_bit: "לא הוכרע מהמסך", case_bit: "לא נרשמה הכרעה ידנית מהמסך",
  submit: '$("filters").addEventListener',
  grid_mobile: ".filters .search{grid-column:1/-1}",
};
const TRAP = { lo_nirshma: "לא נרשמה", hachraa_yadanit: "הכרעה ידנית" };

const count = (h, n) => h.split(n).length - 1;
const out = {};
for (const [tag, url] of Object.entries(files)) {
  const html = readFileSync(url, "utf8");
  out[tag] = { bytes: Buffer.byteLength(html) };
  for (const [group, set] of [["NEW", NEW], ["REMOVED", REMOVED], ["OLD", OLD], ["TRAP", TRAP]]) {
    out[tag][group] = Object.fromEntries(Object.entries(set).map(([k, v]) => [k, count(html, v)]));
  }
}
out.verdict = {
  new_all_0_in_prev: Object.values(out.prev.NEW).every((n) => n === 0),
  new_all_1_in_fixed: Object.values(out.fixed.NEW).every((n) => n === 1),
  removed_1_prev_0_fixed: out.prev.REMOVED.lastfilters_old === 1 && out.fixed.REMOVED.lastfilters_old === 0,
  old_all_present_both: Object.keys(OLD).every((k) => out.prev.OLD[k] >= 1 && out.fixed.OLD[k] >= 1),
  traps_present_in_prev: Object.values(out.prev.TRAP).every((n) => n >= 1),
};
writeFileSync(new URL("./marker-check.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
