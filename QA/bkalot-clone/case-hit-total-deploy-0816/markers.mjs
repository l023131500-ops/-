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
  // ── מה שנוסף ב-d99e2d3: החילוץ ─────────────────────────────────────────
  { key: "fn_noteSpots_decl",  s: "function noteSpots(r) {" },
  { key: "spots_destructure",  s: "const { spots, complete } = noteSpots(r);" },
  { key: "ret_all_complete",   s: "return { spots: all, complete: true };" },
  { key: "ret_first_only",     s: "if (lenOk && inside(r.note_match_pos)) return { spots: [r.note_match_pos], complete: false };" },
  { key: "ret_null",           s: "return { spots: null, complete: false };" },
  { key: "lenOk_text_guard",   s: 'const lenOk = typeof text === "string" &&' },

  // ── מה שנוסף ב-d99e2d3: הספירה ─────────────────────────────────────────
  { key: "matched_extract",    s: "const matched = notes.filter((r) => r.note_matched === true);" },
  { key: "hit_from_matched",   s: "const hit = matched.length;" },
  { key: "loop_matched",       s: "for (const r of matched) {" },
  { key: "all_or_nothing",     s: "if (!complete) { total = null; break; }" },
  { key: "total_add_spots",    s: "total += spots.length;" },
  { key: "hits_guard",         s: "const hits = hit > 0 && Number.isInteger(total) && total >= hit" },
  { key: "hits_expr",          s: '? ` — ${countHe(total, "פעם אחת", "פעמים")} בסך הכול`' },
  { key: "sentence_single",    s: "נמצא בנימוק היחיד שנכתב כאן${hits}." },
  { key: "sentence_many",      s: "הנימוקים שנכתבו כאן${hits}." },
  { key: "title_new_clause",   s: "ואחרי הקו — כמה פעמים המונח נכתב בתוכם בסך הכול, אותן הופעות שמסומנות בטבלה שמתחת" },

  // ── בלוקי ההערות שנוספו ────────────────────────────────────────────────
  { key: "cmt_extract_why",    s: "⚠️ ההכרעות (4), (8), (9) ו-(10) יושבות כאן ולא בתוך fillNoteText" },
  { key: "cmt_complete_kept",  s: "complete נמסר ואינו נבלע" },
  { key: "cmt_head",           s: "── «וכמה פעמים בתוכם» גם כאן ─" },
  { key: "cmt_four_more",      s: "ארבע הכרעות נוספות:" },
  { key: "cmt_d6",             s: "(6) לצד «בכמה מהם» ולא במקומו — 0102 הכרעה (6) מילה במילה" },
  { key: "cmt_d7",             s: "(7) ⚠️ נספר מ-noteSpots ולא מ-note_hit_total" },
  { key: "cmt_d8",             s: "(8) ⚠️ הכול או כלום, וזו הכרעה (5) על המערך במקום על ה-boolean" },
  { key: "cmt_d9",             s: "(9) ⚠️ נדלק גם כששני המספרים שווים («2 מתוך 3 — פעמיים»)" },
  { key: "cmt_note_fixed",     s: "⚠️ ומשפט שני כאן תוקן ולא נמחק" },

  // ── מה ש-d99e2d3 החליף ולכן חייב להיעלם מהייצור ────────────────────────
  // אלה הראיה שהקוד הישן לא נשאר לצד החדש; בלעדיהן «נוסף» ו«הוחלף» נראים זהים.
  { key: "old_lenOk",          s: 'const lenOk = typeof len === "number" && Number.isInteger(len) && len >= 1;' },
  { key: "old_let_spots",      s: "let spots = null, complete = false;" },
  { key: "old_every_brace",    s: "p >= all[k - 1] + len))) {" },
  { key: "old_assign_all",     s: "spots = all; complete = true;" },
  { key: "old_else_if",        s: "} else if (lenOk && inside(r.note_match_pos)) {" },
  { key: "old_assign_first",   s: "spots = [r.note_match_pos];" },
  { key: "old_hit_inline",     s: "const hit = notes.filter((r) => r.note_matched === true).length;" },
  { key: "old_title_end",      s: "«זה הנימוק שהתאים» בתא «למה»\";" },
  { key: "old_sentence_single", s: "נמצא בנימוק היחיד שנכתב כאן.`)" },
  { key: "old_sentence_many",  s: "הנימוקים שנכתבו כאן.`;" },

  // ── בקרות: אמורות להיות זהות לפני ואחרי ────────────────────────────────
  // הראשונות הן שתי הפונקציות עצמן סביב מה שהשתנה; השאר הן הפריסה הקודמת
  // (6348c24) ושכנים במסך שלא נגעו.
  { key: "ctl_fillNoteText",   s: "function fillNoteText(td, r) {" },
  { key: "ctl_no_spots",       s: "if (!spots) { td.append(document.createTextNode(text)); return; }" },
  { key: "ctl_cmt_d11",        s: "// הכרעה (11): כמה, ובעברית." },
  { key: "ctl_title_many",     s: "הופעות בטקסט הזה, וכולן מסומנות" },
  { key: "ctl_title_first",    s: "מסומנת ההופעה הראשונה בלבד" },
  { key: "ctl_fn_tally",       s: "function noteMatchTally(hist, q) {" },
  { key: "ctl_notes_filter",   s: "const notes = hist.filter((r) => r.note != null);" },
  { key: "ctl_hasown_guard",   s: 'if (!hist.every((r) => Object.hasOwn(r, "note") && Object.hasOwn(r, "note_matched"))) return null;' },
  { key: "ctl_zero_sentence",  s: "אינו נמצא באף אחד מ-${notes.length} הנימוקים שנכתבו כאן." },
  { key: "ctl_no_notes",       s: "לא נכתב ולו נימוק אחד ברצף הזה, ואין בו מה לחפש." },
  { key: "ctl_single_zero",    s: "אינו בנימוק היחיד שנכתב כאן." },
  { key: "ctl_p_class",        s: 'p.className = "note";' },
  { key: "ctl_title_head",     s: "הספירה היא של מה שהמסד סימן על כל שורה, ולא של חיפוש נוסף במסך" },
  { key: "ctl_denominator",    s: "המכנה הוא הנימוקים שנכתבו ולא המעברים" },
  { key: "ctl_stale_span",     s: "זה הנימוק שהתאים" },
  { key: "ctl_mark_hit_css",   s: "mark.hit{" },
  { key: "ctl_noteTallyBit",   s: "function noteTallyBit(c) {" },
  { key: "ctl_list_hits",      s: 'const hits = Number.isInteger(total) && total >= hit ? ` · ${countHe(total, "פעם אחת", "פעמים")}` : "";' },
  { key: "ctl_empty_box",      s: '<div class="empty" id="empty" hidden>אין פניות שתואמות את הסינון.</div>' },
  { key: "ctl_clamp_note",     s: 'id="clamp-note"' },

  // ── נמדדים ולא מוכרזים מראש: משתנים בכמות ולא בקיום, והסיווג שלהם נקרא
  //    מ-classify.json ולא נכתב כאן.
  { key: "phr_noteSpots",        s: "noteSpots" },
  { key: "phr_complete",         s: "complete" },
  { key: "phr_countHe",          s: "countHe(" },
  { key: "phr_note_hit_total",   s: "note_hit_total" },
  { key: "phr_note_match_pos_all", s: "note_match_pos_all" },
  { key: "phr_createTextNode",   s: "document.createTextNode" },
  { key: "phr_hasOwn",           s: "Object.hasOwn" },
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
