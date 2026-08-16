// markers.mjs — הסימנים שמכריעים אם הקוד שנפרס הוא הקוד שבמקור.
//
// הסיווג נקבע מהשוואת שני קבצים מקומיים (src מול dist) לפני שהכתובת החיה
// נפגשת ולו פעם אחת — 0087. כל סימן נספר כמחרוזת גולמית, בלי regex ובלי
// נורמליזציה, כדי שספירה בקובץ מקומי וספירה בגוף HTTP יהיו אותה פעולה בדיוק.

export const MARKERS = [
  // ── מה שנוסף ב-c1598aa ────────────────────────────────────────────────
  { key: "css_mark_hit",      s: "mark.hit{" },
  { key: "css_box_shadow",    s: "box-shadow:inset 0 -2px 0 var(--brand);" },
  { key: "fn_decl",           s: "function fillNoteText(td, r) {" },
  { key: "fn_all",            s: "fillNoteText" },
  { key: "fn_call",           s: "fillNoteText(td, r);" },
  { key: "pos_read",          s: "const pos = r.note_match_pos, len = r.note_match_len;" },
  { key: "note_match_pos",    s: "note_match_pos" },
  { key: "note_match_len",    s: "note_match_len" },
  { key: "guard_fits",        s: "pos >= 1 && len >= 1 && pos - 1 + len <= text.length" },
  { key: "mark_el",           s: 'const m = document.createElement("mark");' },
  { key: "mark_cls",          s: 'm.className = "hit";' },
  { key: "createTextNode",    s: "document.createTextNode" },
  { key: "mark_title",        s: "כאן נמצא מה שהוקלד בחיפוש — המיקום מגיע מהמסד ולא נמדד שוב במסך" },
  { key: "comment_3nodes",    s: "שלושה צמתי טקסט ולא innerHTML" },
  { key: "comment_1to0",      s: "המרה אחת מ-1 ל-0" },
  { key: "comment_refuted",   s: "ההכרעה הזו נכתבה כסירוב ואינה עומדת עוד" },
  { key: "comment_not_true",  s: "אינו נכון עוד: 0100 נתנה מיקום, ו-fillNoteText מדגישה" },

  // ── מה ש-c1598aa החליף ולכן חייב להיעלם מהייצור ──────────────────────
  // שתי שורות שנמחקו, ואף לא אחת מהן קיימת עוד בקוד החדש בצורתה הרצופה.
  { key: "old_text_content",  s: "td.textContent = r.note;" },
  { key: "old_as_textcontent", s: "הטקסט נכנס כ-textContent ולא כ-HTML" },
  { key: "old_no_highlight",  s: "אין הדגשה של המילה בתוך הנימוק ואין ציטוט של הקטע שהתאים" },

  // ── בקרות: אמורות להיות זהות לפני ואחרי ──────────────────────────────
  // שתיים ראשונות הן מה שהתא מצייר סביב הטקסט; השאר הן הפריסה הקודמת
  // (queue_total, 06a5707) ושכנים במסך שלא נגעו.
  { key: "ctl_stale_span",    s: "זה הנימוק שהתאים" },
  { key: "ctl_td_title",      s: " תווים, כפי שנשמרו" },
  { key: "ctl_no_note",       s: "לא נכתב נימוק על המעבר הזה" },
  { key: "ctl_queue_phrase",  s: "· בתור ${many(queueTotal)}" },
  { key: "ctl_queueTotal",    s: "queueTotal" },
  { key: "ctl_noteTally",     s: "noteTallyBit" },
  { key: "ctl_clamp_note",    s: 'id="clamp-note"' },
  { key: "ctl_filtered",      s: "const filtered = !!(lastFilters.status" },
  { key: "ctl_box_literal",   s: '<div class="empty" id="empty" hidden>אין פניות שתואמות את הסינון.</div>' },

  // ── נשקל כבקרה ונמדד כ-DIFF, ונרשם כפי שנמדד ולא כפי שתוכנן: שם
  //    הפונקציה הישנה מצוטט בהערות החדשות ולכן מופיע יותר פעמים, בלי
  //    שהתנהגות המסך תשתנה במקום אחר.
  { key: "phr_fillHistory",   s: "fillHistoryNoteCell" },
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
