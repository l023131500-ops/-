// markers.mjs — הסימנים שמכריעים אם הקוד שנפרס הוא הקוד שבמקור.
//
// הסיווג נקבע מהשוואת שני קבצים מקומיים (src מול dist) לפני שהכתובת החיה
// נפגשת ולו פעם אחת — 0087. כל סימן נספר כמחרוזת גולמית, בלי regex ובלי
// נורמליזציה, כדי שספירה בקובץ מקומי וספירה בגוף HTTP יהיו אותה פעולה בדיוק.
//
// ⚠️ הקבוצות כאן הן תיאור ולא הכרעה: _verify.mjs קורא את הסיווג מ-classify.json
// (שנמדד משני הקבצים) ואינו נשען על השם שניתן לסימן כאן. סימן שנשקל כ-NEW
// ונמדד כ-CONTROL נרשם כפי שנמדד.

export const MARKERS = [
  // ── מה שנוסף ב-6aefa6a ────────────────────────────────────────────────
  { key: "total_read",        s: 'const total = Object.hasOwn(c, "note_hit_total") ? c.note_hit_total : null;' },
  { key: "hits_expr",         s: 'const hits = Number.isInteger(total) && total >= hit ? ` · ${countHe(total, "פעם אחת", "פעמים")}` : "";' },
  { key: "guard_total_ge_hit", s: "Number.isInteger(total) && total >= hit" },
  { key: "countHe_total",     s: 'countHe(total, "פעם אחת", "פעמים")' },
  { key: "text_paren_open",   s: "s.textContent = (notes === 1 ?" },
  { key: "text_plus_hits",    s: "הנימוקים`) + hits;" },
  { key: "title_new_clause",  s: "ואחרי הנקודה — כמה פעמים המונח נכתב בתוכם בסך הכול" },
  { key: "title_plural",      s: "המספרים נספרו ביומן עצמו ולא נגזרו, ולכן הם נדלקים" },
  { key: "cmt_head",          s: "── «וכמה פעמים בתוכם» — 0102 ─" },
  { key: "cmt_gap",           s: "מהמספר הראשון לבדו אי אפשר לדעת לתוך מה נכנסים." },
  { key: "cmt_four_more",     s: "ארבע הכרעות נוספות:" },
  { key: "cmt_d6",            s: "(6) לצד «בכמה מהם» ולא במקומו" },
  { key: "cmt_d7",            s: "(7) המפתח אינו קיים — שרת מלפני 0102" },
  { key: "cmt_d8",            s: "(8) ⚠️ שמירה מפני מחלוקת ולא אמון: total ≥ hit נבדק כאן שוב" },
  { key: "cmt_d9",            s: "(9) ⚠️ נדלק גם כששני המספרים שווים" },

  // ── מה ש-6aefa6a החליף ולכן חייב להיעלם מהייצור ──────────────────────
  // אלה הראיה שהקוד הישן לא נשאר לצד החדש; בלעדיהן «נוסף» ו«הוחלף» נראים זהים.
  { key: "old_textContent",   s: 's.textContent = notes === 1 ? "המונח בנימוק היחיד" : `המונח ב-${hit} מתוך ${notes} הנימוקים`;' },
  { key: "old_title_clause",  s: "נושאים את מונח החיפוש. המספר נספר ביומן עצמו ולא נגזר" },
  { key: "old_title_single",  s: "ולכן הוא נדלק גם על שורה שנמצאה לפי השם או הטלפון" },

  // ── בקרות: אמורות להיות זהות לפני ואחרי ──────────────────────────────
  // הראשונות הן הפונקציה עצמה סביב השורה שהשתנתה; השאר הן הפריסה הקודמת
  // (f41628b) ושכנים במסך שלא נגעו.
  { key: "ctl_fn_decl",       s: "function noteTallyBit(c) {" },
  { key: "ctl_hasown_guard",  s: 'if (!Object.hasOwn(c, "note_match_count") || !Object.hasOwn(c, "notes_count")) return null;' },
  { key: "ctl_hit_read",      s: "const hit = c.note_match_count;" },
  { key: "ctl_notes_read",    s: "const notes = c.notes_count;" },
  { key: "ctl_null_guard",    s: "if (hit == null || notes == null) return null;" },
  { key: "ctl_zero_hit",      s: "if (hit === 0) return null;" },
  { key: "ctl_stale_cls",     s: 's.className = "stale";' },
  { key: "ctl_single_note",   s: "המונח בנימוק היחיד" },
  { key: "ctl_denominator",   s: "המכנה הוא הנימוקים שנכתבו ולא המעברים" },
  { key: "ctl_open_case",     s: "הנימוקים עצמם אינם מוצגים ברשימה; פתחו את הפנייה כדי לקרוא אותם" },
  { key: "ctl_matched_bit",   s: "נמצאה לפי הנימוק" },
  { key: "ctl_fillNoteText",  s: "function fillNoteText(td, r) {" },
  { key: "ctl_title_many",    s: "הופעות בטקסט הזה, וכולן מסומנות" },
  { key: "ctl_mark_hit_css",  s: "mark.hit{" },
  { key: "ctl_queue_phrase",  s: "· בתור ${many(queueTotal)}" },
  { key: "ctl_clamp_note",    s: 'id="clamp-note"' },
  { key: "ctl_empty_box",     s: '<div class="empty" id="empty" hidden>אין פניות שתואמות את הסינון.</div>' },
  { key: "ctl_stale_span",    s: "זה הנימוק שהתאים" },

  // ── נמדדים ולא מוכרזים מראש: משתנים בכמות ולא בקיום, והסיווג שלהם נקרא
  //    מ-classify.json ולא נכתב כאן.
  { key: "phr_note_hit_total", s: "note_hit_total" },
  { key: "phr_countHe",        s: "countHe(" },
  { key: "phr_note_match_count", s: "note_match_count" },
  { key: "phr_noteTallyBit",   s: "noteTallyBit" },
  { key: "phr_hasOwn",         s: "Object.hasOwn" },
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
