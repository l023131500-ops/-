// markers.mjs — הסימנים שמכריעים אם ה-index.html שנפרס הוא הקובץ שבמקור.
//
// אותה שיטה של which-field-deploy-0817, על אותו קובץ, ולפעימה שאחריה: שם
// נפרסה המפה «איזה שדה נפסל» (JS), כאן נפרס הכלל שנותן לשדה הזה צבע (CSS).
// כל סימן נספר כמחרוזת גולמית, בלי regex ובלי נורמליזציה, כדי שספירה בקובץ
// מקומי וספירה בגוף HTTP יהיו אותה פעולה בדיוק.
//
// ⚠️ הפעימה הזו היא תוספת טהורה — אין בה שורה שנמחקה, ולכן אין כאן סימן
// REMOVED כמו «return fail(code, extra);» שהכריע ב-3cff166. מה שמחליף אותו
// כראיה ל«נוסף ולא הוחלף» הוא ctl_focus_rule: כלל המיקוד הירוק שמעל חייב
// להישאר 1 לפני ו-1 אחרי. אילו הפעימה הייתה מחליפה אותו במקום להוסיף מתחתיו,
// הסימן הזה היה יורד ל-0 וה-verify היה נופל.
//
// ⚠️ הקבוצות כאן הן תיאור ולא הכרעה: _verify.mjs קורא את הסיווג מ-classify.json
// (שנמדד משני הקבצים) ואינו נשען על השם שניתן לסימן כאן.

export const MARKERS = [
  // ── מה שנוסף ב-8ef394c: שני הטוקנים ───────────────────────────────────────
  { key: "tok_danger_ring_light", s: "--danger-ring:0 0 0 3px rgba(155,28,28,.28);" },
  { key: "tok_danger_ring_dark",  s: "--danger-ring:0 0 0 3px rgba(240,138,138,.32);" },

  // ── ושני הכללים עצמם: הבורר והגוף, כל אחד בנפרד ───────────────────────────
  // הבורר בלי הגוף פירושו כלל ריק, והגוף בלי הבורר פירושו שהוא נדבק למשהו אחר;
  // ולכן ארבעה סימנים ולא שניים.
  { key: "sel_invalid_base",  s: 'input[aria-invalid="true"],select[aria-invalid="true"],textarea[aria-invalid="true"]{' },
  { key: "body_invalid_base", s: "border-color:var(--danger); background:var(--danger-soft);" },
  { key: "sel_invalid_focus", s: 'input[aria-invalid="true"]:focus,select[aria-invalid="true"]:focus,textarea[aria-invalid="true"]:focus{' },
  { key: "body_invalid_focus", s: "border-color:var(--danger); box-shadow:var(--danger-ring);" },

  // ── בלוק ההערה שנוסף ──────────────────────────────────────────────────────
  { key: "cmt_head",      s: "── השדה שנפסל, לעין ולא רק ל-aria ─" },
  { key: "cmt_aria_only", s: "קיבל את הסימן ומי שמסתכל לא." },
  { key: "cmt_specificity", s: "input:focus ‏(0,1,1) — ולכן אין כאן !important ואין כפילות של הכלל שמעל." },
  { key: "cmt_same_reds", s: "השדה והשורה שמסבירה אותו נקראים כמערכת אחת ולא כשני אדומים שונים. */" },

  // ── משתנים בכמות ולא בקיום ────────────────────────────────────────────────
  // aria-invalid כתכונה כבר היה בקובץ (setAttribute), ולכן הוא DIFF ולא NEW;
  // הצורה `aria-invalid="true"` כמחרוזת בבורר לא הייתה בו כלל.
  { key: "phr_aria_invalid",      s: "aria-invalid" },
  { key: "phr_aria_invalid_true", s: 'aria-invalid="true"' },
  { key: "phr_danger_ring",       s: "--danger-ring" },
  { key: "phr_danger_soft",       s: "--danger-soft" },

  // ── בקרות: אמורות להיות זהות לפני ואחרי ───────────────────────────────────
  // הראשונה היא ההכרעה: הכלל הירוק שמעל נשאר במקומו ובמניין שלו.
  { key: "ctl_focus_rule",   s: "input:focus,select:focus,textarea:focus{outline:none; border-color:var(--brand); box-shadow:var(--ring)}" },
  { key: "ctl_ring_light",   s: "--ring:0 0 0 3px rgba(15,95,76,.28);" },
  { key: "ctl_ring_dark",    s: "--ring:0 0 0 3px rgba(75,191,159,.32);" },
  { key: "ctl_danger_light", s: "--accent:#a8631f; --danger:#9b1c1c; --danger-soft:#fbeaea;" },
  { key: "ctl_danger_dark",  s: "--accent:#d69850; --danger:#f08a8a; --danger-soft:#33191a;" },
  { key: "ctl_input_rule",   s: "input[type=text],input[type=tel],input[type=email],input[type=number],select,textarea{" },
  { key: "ctl_transition",   s: "padding:11px 13px; transition:border-color .18s, box-shadow .18s;" },

  // ── ובקרות מן הפעימה הקודמת: מה ש-3cff166 פרס חייב להיות עדיין שם ─────────
  // בלי אלה, פריסה שמגלגלת אחורה את הקובץ אל גרסה ישנה יותר ומוסיפה רק את
  // ה-CSS הייתה נראית כאן כהצלחה מלאה.
  { key: "ctl_code_field_open", s: "const CODE_FIELD = {" },
  { key: "ctl_bad_const",       s: "const bad = CODE_FIELD[code] ? $(CODE_FIELD[code]) : null;" },
  { key: "ctl_bad_guard",       s: "if (bad && bad.offsetParent !== null) markInvalid(bad);" },
  { key: "ctl_fn_markInvalid",  s: "function markInvalid(el) {" },
  { key: "ctl_set_attr",        s: 'el.setAttribute("aria-invalid", "true");' },
  { key: "ctl_stop_mark",       s: "markInvalid(stop.el);" },
  { key: "ctl_fn_fail",         s: "function fail(code, extra) {" },
  { key: "ctl_msg_phone",       s: "מספר הטלפון אינו תקין. הטלפון הוא מפתח הזהות שלכם אצלנו" },
  { key: "ctl_msg_situation",   s: 'situation_required_for_treatment:"בחרו מצב, כדי שנוכל להתאים את רשימת הזכויות.",' },
  { key: "ctl_endpoint",        s: 'const ENDPOINT = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";' },
  { key: "ctl_select_situation", s: '<select id="situation" name="situation">' },
  { key: "ctl_title",           s: "<title>בקלות — פתיחת פנייה</title>" },
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
