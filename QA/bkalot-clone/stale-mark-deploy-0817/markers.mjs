// markers.mjs — הסימנים שמכריעים אם ה-index.html שנפרס הוא הקובץ שבמקור.
//
// אותה שיטה של invalid-visible-deploy-0817, על אותו קובץ, ולפעימה שאחריה: שם
// נפרס הכלל שנותן לשדה שנפסל צבע (CSS), כאן נפרסת ההסרה שמורידה את הצבע הזה
// כשהנפילה הבאה אינה עליו. כל סימן נספר כמחרוזת גולמית, בלי regex ובלי
// נורמליזציה, כדי שספירה בקובץ מקומי וספירה בגוף HTTP יהיו אותה פעולה בדיוק.
//
// ⚠️ הפעימה הזאת היא **חילוץ** ולא תוספת, ולכן יש בה שלוש משפחות ולא שתיים,
// ושלושתן נדרשות כדי שהפריסה תוכיח את עצמה:
//   NEW      — clearInvalid והקריאות אליה
//   REMOVED  — הלולאה בגרסת `other` שהייתה בתוך markInvalid ואיננה עוד
//   CONTROL  — ctl_el_loop: הלולאה בגרסת `el` נשארת **אחת** לפני ואחרי. היא
//              עברה מ-focusDropped אל תוך clearInvalid, ולכן ספירה של 1 בשני
//              הקבצים היא בדיוק הטענה «חולצה ולא שוכפלה». אילו התיקון היה
//              מוסיף לולאה שלישית הסימן הזה היה 2 וה-verify היה נופל.
//
// ⚠️ הקבוצות כאן הן תיאור ולא הכרעה: _verify.mjs קורא את הסיווג מ-classify.json
// (שנמדד משני הקבצים) ואינו נשען על השם שניתן לסימן כאן.

export const MARKERS = [
  // ── מה שנוסף ב-76bbac4 ────────────────────────────────────────────────────
  { key: "fn_clear_invalid",   s: "function clearInvalid() {" },
  // הקריאה נספרת בכמות ולא בקיום: שלוש — fail, markInvalid, focusDropped.
  { key: "call_clear_invalid", s: "clearInvalid();" },
  // ⚠️ הסימן המכריע: לא «clearInvalid קיימת» אלא «fail קוראת לה, ובשורה
  // הראשונה». מחרוזת אחת שחוצה שתי שורות — כך פריסה שתכניס את הפונקציה בלי
  // לחבר אותה ל-fail לא תוכל לעבור כאן.
  { key: "fail_calls_clear",   s: "function fail(code, extra) {\n    clearInvalid();" },
  { key: "mark_calls_clear",   s: "function markInvalid(el) {\n    clearInvalid();" },
  { key: "drop_calls_clear",   s: "function focusDropped(dropped, sent, sentKind) {\n    clearInvalid();" },

  // ── בלוק ההערה שנוסף ──────────────────────────────────────────────────────
  { key: "cmt_head",        s: "── ונפילה חדשה מוחקת את הסימן של הקודמת ─" },
  { key: "cmt_no_field",    s: "מה שלא כוסה הוא נפילה **בלי** שדה" },
  { key: "cmt_red_not_bug", s: "לעין ולא רק לקורא מסך — שדה אדום שאינו הבעיה." },
  { key: "cmt_single_point", s: "נפילה עוברת בה, והסימון החדש — היכן שיש כזה — נקבע תמיד **אחריה**." },

  // ── ומה שנמחק: הלולאה בגרסת other שהייתה בתוך markInvalid ─────────────────
  // ⚠️ זה ה-REMOVED היחיד, והוא הראיה שהפריסה החליפה ולא רק הוסיפה. בלעדיו
  // פריסה שמשאירה את הקוד הישן במקומו ומוסיפה לידו את clearInvalid הייתה
  // נראית כאן כהצלחה מלאה.
  { key: "rm_other_loop", s: 'for (const other of form.querySelectorAll("[aria-invalid]")) other.removeAttribute("aria-invalid");' },

  // ── ובקרה שהיא הכרעה: הלולאה עצמה נשארת אחת ───────────────────────────────
  { key: "ctl_el_loop", s: 'for (const el of form.querySelectorAll("[aria-invalid]")) el.removeAttribute("aria-invalid");' },

  // ── בקרות: החתימות עצמן לא זזו ────────────────────────────────────────────
  { key: "ctl_fn_fail",          s: "function fail(code, extra) {" },
  { key: "ctl_fn_mark_invalid",  s: "function markInvalid(el) {" },
  { key: "ctl_fn_focus_dropped", s: "function focusDropped(dropped, sent, sentKind) {" },
  { key: "ctl_set_attr",         s: 'el.setAttribute("aria-invalid", "true");' },
  { key: "ctl_stop_mark",        s: "markInvalid(stop.el);" },
  { key: "ctl_msg_fallback",     s: 'const text = MESSAGES[code] || "אירעה תקלה. נסו שוב בעוד רגע.";' },

  // ── ובקרות מן הפעימות שלפני: מה ש-3cff166 ו-56bac47 פרסו חייב להיות שם ────
  // בלי אלה, פריסה שמגלגלת את הקובץ אחורה אל גרסה ישנה יותר ומוסיפה רק את
  // clearInvalid הייתה נראית כאן כהצלחה.
  { key: "ctl_sel_invalid_base",  s: 'input[aria-invalid="true"],select[aria-invalid="true"],textarea[aria-invalid="true"]{' },
  { key: "ctl_body_invalid_base", s: "border-color:var(--danger); background:var(--danger-soft);" },
  { key: "ctl_sel_invalid_focus", s: 'input[aria-invalid="true"]:focus,select[aria-invalid="true"]:focus,textarea[aria-invalid="true"]:focus{' },
  { key: "ctl_tok_danger_ring",   s: "--danger-ring:0 0 0 3px rgba(155,28,28,.28);" },
  { key: "ctl_code_field_open",   s: "const CODE_FIELD = {" },
  { key: "ctl_bad_const",         s: "const bad = CODE_FIELD[code] ? $(CODE_FIELD[code]) : null;" },
  { key: "ctl_bad_guard",         s: "if (bad && bad.offsetParent !== null) markInvalid(bad);" },
  { key: "ctl_focus_rule",        s: "input:focus,select:focus,textarea:focus{outline:none; border-color:var(--brand); box-shadow:var(--ring)}" },
  { key: "ctl_msg_phone",         s: "מספר הטלפון אינו תקין. הטלפון הוא מפתח הזהות שלכם אצלנו" },
  { key: "ctl_endpoint",          s: 'const ENDPOINT = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";' },
  { key: "ctl_select_situation",  s: '<select id="situation" name="situation">' },
  { key: "ctl_title",             s: "<title>בקלות — פתיחת פנייה</title>" },
];

export function count(hay, needle) {
  let n = 0, i = 0;
  for (;;) {
    const j = hay.indexOf(needle, i);
    if (j === -1) return n;
    n++; i = j + needle.length;
  }
}

export function tally(text) {
  const out = {};
  for (const m of MARKERS) out[m.key] = count(text, m.s);
  return out;
}
