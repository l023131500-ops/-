// markers.mjs — הסימנים שמכריעים אם הקוד שנפרס הוא הקוד שבמקור.
//
// הסיווג נקבע מהשוואת שני קבצים מקומיים (src מול dist) לפני שהכתובת החיה
// נפגשת ולו פעם אחת — 0087. כל סימן נספר כמחרוזת גולמית, בלי regex ובלי
// נורמליזציה, כדי שספירה בקובץ מקומי וספירה בגוף HTTP יהיו אותה פעולה בדיוק.
//
// ⚠️ הקבוצות כאן הן תיאור ולא הכרעה: _verify.mjs קורא את הסיווג מ-classify.json
// (שנמדד משני הקבצים) ואינו נשען על השם שניתן לסימן כאן. סימן שנשקל כ-NEW
// ונמדד כ-DIFF נרשם כפי שנמדד — וכאן זה צפוי דווקא: המחרוזת
// «const { spots, complete } = noteSpots(r);» כבר יושבת ב-fillNoteText מאז
// d99e2d3 שנפרסה, ולכן היא 1→2 ולא 0→1.

export const MARKERS = [
  // ── מה שנוסף ב-9699a3d: הקוד ───────────────────────────────────────────
  { key: "here_const",        s: 'const here = complete ? ` — ${countHe(spots.length, "הופעה אחת", "הופעות")}` : "";' },
  { key: "textcontent_plus",  s: 's.textContent = "זה הנימוק שהתאים" + here;' },
  { key: "title_new_clause",  s: "אחרי הקו — כמה פעמים המונח נכתב בשורה הזו, אותן הופעות שמסומנות בטקסט שמעל; סכום השורות הוא המספר שבמשפט שמעל הטבלה" },
  { key: "cmt_inline_567",    s: "// הכרעות (5)–(7): אותה מסננת של הסימנים בתא, וכולן או שתיקה." },

  // ── בלוקי ההערות שנוספו ────────────────────────────────────────────────
  { key: "cmt_head",          s: "── «וכמה פעמים בשורה הזו» ─" },
  { key: "cmt_gap_measured",  s: "הפער נמדד ולא הונח: על «נשלח» נדלקות שתי שורות" },
  { key: "cmt_title_hover",   s: "⚠️ ה-title של ה-mark כבר אומר" },
  { key: "cmt_d5",            s: "(5) ⚠️ נספר מ-noteSpots ולא ממקור שני, ומאותה קריאה שממנה מצוירים הסימנים" },
  { key: "cmt_d6",            s: "(6) ⚠️ הכול או כלום, ושתיקה אינה «0»: כשאין complete מסומנת ההופעה" },
  { key: "cmt_d7",            s: "(7) ⚠️ נאמר גם על אחת. «זה הנימוק שהתאים» בלי מספר על שורה בת הופעה אחת," },
  { key: "cmt_d8",            s: "(8) ⚠️ סכום השורות שווה למספר שבמשפט שמעל, מפני ששניהם נספרים מאותה" },

  // ── מה ש-9699a3d החליף ולכן חייב להיעלם מהייצור ────────────────────────
  // אלה הראיה שהקוד הישן לא נשאר לצד החדש; בלעדיהן «נוסף» ו«הוחלף» נראים זהים.
  { key: "old_textcontent",   s: 's.textContent = "זה הנימוק שהתאים";' },
  { key: "old_title_end",     s: "יותר משורה אחת יכולה לשאת אותו\";" },

  // ── משתנים בכמות ולא בקיום ─────────────────────────────────────────────
  // ⚠️ שלושת אלה כבר קיימים ב-dist, ולכן הראיה שלהם היא ההפרש ולא הקיום.
  { key: "phr_spots_destructure", s: "const { spots, complete } = noteSpots(r);" },
  { key: "phr_countHe",           s: "countHe(" },
  { key: "phr_four_more",         s: "ארבע הכרעות נוספות:" },
  { key: "phr_stale_text",        s: "זה הנימוק שהתאים" },
  { key: "phr_noteSpots",         s: "noteSpots" },
  { key: "phr_complete",          s: "complete" },
  { key: "phr_hasOwn",            s: "Object.hasOwn" },
  { key: "phr_note_match_pos_all", s: "note_match_pos_all" },

  // ── בקרות: אמורות להיות זהות לפני ואחרי ────────────────────────────────
  // הראשונות הן הפונקציה שנחלצה ב-d99e2d3 והשכנה שקוראת לה; השאר הן הפריסה
  // הקודמת (063501a) ושכנים במסך שלא נגעו.
  { key: "ctl_fn_noteSpots",   s: "function noteSpots(r) {" },
  { key: "ctl_fillNoteText",   s: "function fillNoteText(td, r) {" },
  { key: "ctl_fn_hist_cell",   s: "function fillHistoryNoteCell(td, r) {" },
  { key: "ctl_no_spots",       s: "if (!spots) { td.append(document.createTextNode(text)); return; }" },
  { key: "ctl_ret_all",        s: "return { spots: all, complete: true };" },
  { key: "ctl_ret_null",       s: "return { spots: null, complete: false };" },
  { key: "ctl_title_many",     s: "הופעות בטקסט הזה, וכולן מסומנות" },
  { key: "ctl_title_first",    s: "מסומנת ההופעה הראשונה בלבד" },
  { key: "ctl_fn_tally",       s: "function noteMatchTally(hist, q) {" },
  { key: "ctl_hits_guard",     s: "const hits = hit > 0 && Number.isInteger(total) && total >= hit" },
  { key: "ctl_hits_expr",      s: '? ` — ${countHe(total, "פעם אחת", "פעמים")} בסך הכול`' },
  { key: "ctl_sentence_many",  s: "הנימוקים שנכתבו כאן${hits}." },
  { key: "ctl_zero_sentence",  s: "אינו נמצא באף אחד מ-${notes.length} הנימוקים שנכתבו כאן." },
  { key: "ctl_all_or_nothing", s: "if (!complete) { total = null; break; }" },
  { key: "ctl_stale_class",    s: 's.className = "stale";' },
  { key: "ctl_mark_hit_css",   s: "mark.hit{" },
  { key: "ctl_noteTallyBit",   s: "function noteTallyBit(c) {" },
  { key: "ctl_list_hits",      s: 'const hits = Number.isInteger(total) && total >= hit ? ` · ${countHe(total, "פעם אחת", "פעמים")}` : "";' },
  { key: "ctl_denominator",    s: "המכנה הוא הנימוקים שנכתבו ולא המעברים" },
  { key: "ctl_empty_box",      s: '<div class="empty" id="empty" hidden>אין פניות שתואמות את הסינון.</div>' },
  { key: "ctl_clamp_note",     s: 'id="clamp-note"' },
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
