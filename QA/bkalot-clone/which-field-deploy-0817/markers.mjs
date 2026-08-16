// markers.mjs — הסימנים שמכריעים אם ה-index.html שנפרס הוא הקובץ שבמקור.
//
// אותה שיטה של case-hit-row-deploy-0817, ועל הקובץ השני של אותה אפליקציה:
// שם admin.html, כאן index.html — טופס הפנייה. כל סימן נספר כמחרוזת גולמית,
// בלי regex ובלי נורמליזציה, כדי שספירה בקובץ מקומי וספירה בגוף HTTP יהיו
// אותה פעולה בדיוק.
//
// ⚠️ הקבוצות כאן הן תיאור ולא הכרעה: _verify.mjs קורא את הסיווג מ-classify.json
// (שנמדד משני הקבצים) ואינו נשען על השם שניתן לסימן כאן.

export const MARKERS = [
  // ── מה שנוסף ב-309c995: המפה ──────────────────────────────────────────────
  { key: "code_field_open",    s: "const CODE_FIELD = {" },
  { key: "map_full_name",      s: 'full_name_required:               "full_name",' },
  { key: "map_phone",          s: 'phone_invalid:                    "phone",' },
  { key: "map_email",          s: 'email_invalid:                    "email",' },
  { key: "map_email_treat",    s: 'email_required_for_treatment:     "email",' },
  { key: "map_situation",      s: 'situation_required_for_treatment: "situation",' },
  { key: "map_situation_unk",  s: 'situation_unknown:                "situation",' },
  { key: "map_topic_no",       s: 'topic_no_invalid:                 "topic_no",' },

  // ── ומה שנוסף בענף השגיאה הכללי: הקריאה ───────────────────────────────────
  { key: "bad_const",          s: "const bad = CODE_FIELD[code] ? $(CODE_FIELD[code]) : null;" },
  { key: "bad_guard",          s: "if (bad && bad.offsetParent !== null) markInvalid(bad);" },

  // ── בלוקי ההערות שנוספו ───────────────────────────────────────────────────
  { key: "cmt_head",           s: "── ואיזה שדה נפל ─" },
  { key: "cmt_derived",        s: "// המיפוי נגזר מ-0058 שורה-בשורה ואינו נבחר: כל קוד כאן הוא ה-return שיושב" },
  { key: "cmt_kind_source_out", s: "// כאן — הטופס שולח בהם ערך קבוע מתוך רשימה סגורה, ואין להם שדה שמקלידים בו." },
  { key: "cmt_also_rest",      s: "// ואותו סימון גם לשאר הקודים, ולא רק ל-topic_no. מסומן אך ורק שדה שנראה" },
  { key: "cmt_display_none",   s: "// ו-focus() על אלמנט ב-display:none נכשל בשקט ומשאיר aria-invalid על שדה" },
  { key: "cmt_no_screen",      s: "// אינו מבטל אף מקרה אמיתי — הוא רק מונע סימון שאין לו מסך." },

  // ── מה ש-309c995 החליף ולכן חייב להיעלם מהייצור ────────────────────────────
  // בלי זה «נוסף» ו«הוחלף» נראים זהים: הענף הישן היה return-אחד שיצא מיד אחרי
  // ההודעה, ולכן לא נשאר בו מקום לסמן שדה.
  { key: "old_return_fail",    s: "return fail(code, extra);" },

  // ── משתנים בכמות ולא בקיום ────────────────────────────────────────────────
  { key: "phr_markInvalid",    s: "markInvalid(" },
  { key: "phr_CODE_FIELD",     s: "CODE_FIELD" },
  { key: "phr_aria_invalid",   s: "aria-invalid" },
  { key: "phr_situation_str",  s: '"situation"' },
  { key: "phr_offsetParent",   s: "offsetParent" },

  // ── בקרות: אמורות להיות זהות לפני ואחרי ───────────────────────────────────
  // הראשונה היא הפונקציה שכבר הייתה בקובץ מ-1bd2ff5 — הפעימה קראה לה ולא
  // שכפלה אותה; השנייה היא הקוד היחיד שכבר סימן שדה לפני הפעימה, והוא הבקרה
  // שמראה שהפעימה הוסיפה ולא החליפה.
  { key: "ctl_fn_markInvalid", s: "function markInvalid(el) {" },
  { key: "ctl_clear_others",   s: 'for (const other of form.querySelectorAll("[aria-invalid]")) other.removeAttribute("aria-invalid");' },
  { key: "ctl_set_attr",       s: 'el.setAttribute("aria-invalid", "true");' },
  { key: "ctl_topic_branch",   s: 'if (code === "topic_no_invalid" && "topic_no" in payload) {' },
  { key: "ctl_topic_mark",     s: 'markInvalid($("topic_no"));' },
  { key: "ctl_fn_focusDropped", s: "function focusDropped(dropped, sent, sentKind) {" },
  { key: "ctl_fn_fail",        s: "function fail(code, extra) {" },
  { key: "ctl_unknown_code",   s: 'if (!MESSAGES[code]) lines.push("קוד: " + code);' },
  { key: "ctl_show_bad",       s: 'show("bad", "הפנייה לא נשלחה", lines);' },
  { key: "ctl_stop_mark",      s: "markInvalid(stop.el);" },
  { key: "ctl_msg_phone",      s: "מספר הטלפון אינו תקין. הטלפון הוא מפתח הזהות שלכם אצלנו" },
  { key: "ctl_msg_full_name",  s: 'full_name_required:              "צריך שם מלא.",' },
  { key: "ctl_msg_situation",  s: 'situation_required_for_treatment:"בחרו מצב, כדי שנוכל להתאים את רשימת הזכויות.",' },
  { key: "ctl_endpoint",       s: 'const ENDPOINT = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";' },
  { key: "ctl_input_full_name", s: '<input id="full_name" name="full_name" type="text" autocomplete="name" required>' },
  { key: "ctl_select_situation", s: '<select id="situation" name="situation">' },
  { key: "ctl_title",          s: "<title>בקלות — פתיחת פנייה</title>" },
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
