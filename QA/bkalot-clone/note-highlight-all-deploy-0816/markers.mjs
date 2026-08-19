// markers.mjs — הסימנים שמכריעים אם הקוד שנפרס הוא הקוד שבמקור.
//
// הסיווג נקבע מהשוואת שני קבצים מקומיים (src מול dist) לפני שהכתובת החיה
// נפגשת ולו פעם אחת — 0087. כל סימן נספר כמחרוזת גולמית, בלי regex ובלי
// נורמליזציה, כדי שספירה בקובץ מקומי וספירה בגוף HTTP יהיו אותה פעולה בדיוק.

export const MARKERS = [
  // ── מה שנוסף ב-f3304ec ────────────────────────────────────────────────
  { key: "len_read",          s: "const len = r.note_match_len;" },
  { key: "pos_all_field",     s: "note_match_pos_all" },
  { key: "pos_all_read",      s: "const all = r.note_match_pos_all;" },
  { key: "lenOk",             s: 'const lenOk = typeof len === "number" && Number.isInteger(len) && len >= 1;' },
  { key: "inside_fn",         s: "const inside = (p) =>" },
  { key: "spots_decl",        s: "let spots = null, complete = false;" },
  { key: "ascending_guard",   s: "all.every((p, k) => inside(p) && (k === 0 || p >= all[k - 1] + len))" },
  { key: "spots_all",         s: "spots = all; complete = true;" },
  { key: "spots_fallback",    s: "spots = [r.note_match_pos];" },
  { key: "no_spots",          s: "if (!spots) { td.append(document.createTextNode(text)); return; }" },
  { key: "title_branch",      s: "const title = !complete" },
  { key: "title_one",         s: "הופעה אחת בטקסט הזה, והיא מסומנת" },
  { key: "title_many",        s: "הופעות בטקסט הזה, וכולן מסומנות" },
  { key: "loop",              s: "for (const p of spots) {" },
  { key: "cursor_advance",    s: "cur = i + len;" },
  { key: "tail_append",       s: "td.append(document.createTextNode(text.slice(cur)));" },
  { key: "title_shared",      s: "m.title = title;" },
  { key: "cmt_d8",            s: "מערך אחד ואורך אחד, ולא זוג לכל הופעה" },
  { key: "cmt_d9",            s: "נפילה חזרה אל note_match_pos, ולא ויתור על הסימון" },
  { key: "cmt_d10",           s: "שמירה על הגבולות של המערך כולו" },
  { key: "cmt_d11",           s: "ה-title אומר כמה, ואינו אומר «כולן» סתם" },
  { key: "cmt_refuted6",      s: "ההכרעה הזו נכתבה כמגבלה ואינה עומדת עוד" },
  { key: "cmt_many_nodes",    s: "להתפצל לצמתים רבים" },
  { key: "cmt_only_measured", s: "רק הקטעים שהמסד מדד נעטפים, וכל השאר טקסט חשוף" },

  // ── מה ש-f3304ec החליף ולכן חייב להיעלם מהייצור ──────────────────────
  // הענף הישן צייר mark אחד; אף לא אחת מהשורות האלה קיימת עוד בקוד החדש.
  { key: "old_pos_read",      s: "const pos = r.note_match_pos, len = r.note_match_len;" },
  { key: "old_fits_decl",     s: "const fits =" },
  { key: "old_fits_guard",    s: "pos >= 1 && len >= 1 && pos - 1 + len <= text.length" },
  { key: "old_fits_branch",   s: "if (!fits) { td.append(document.createTextNode(text)); return; }" },
  { key: "old_i_from_pos",    s: "const i = pos - 1;" },
  { key: "old_three_append",  s: "td.append(document.createTextNode(text.slice(0, i)), m, document.createTextNode(text.slice(i + len)));" },
  { key: "old_three_nodes",   s: "להתפצל לשלושה צמתים" },
  { key: "old_middle_node",   s: "הצומת האמצעי הוא היחיד שנעטף" },
  { key: "old_cmt2_three",    s: "(2) ⚠️ שלושה צמתי טקסט ולא innerHTML" },
  { key: "old_cmt6_first",    s: "(6) ⚠️ ההתאמה הראשונה בלבד, ונאמר ואינו נבלע" },

  // ── בקרות: אמורות להיות זהות לפני ואחרי ──────────────────────────────
  // הראשונות הן מה שהפונקציה מצייר סביב הטקסט ולא נגעו; השאר הן הפריסה
  // הקודמת (6412e7f) ושכנים במסך שלא נגעו.
  { key: "ctl_fn_decl",       s: "function fillNoteText(td, r) {" },
  { key: "ctl_fn_call",       s: "fillNoteText(td, r);" },
  { key: "ctl_mark_el",       s: 'const m = document.createElement("mark");' },
  { key: "ctl_mark_cls",      s: 'm.className = "hit";' },
  { key: "ctl_css_mark_hit",  s: "mark.hit{" },
  { key: "ctl_box_shadow",    s: "box-shadow:inset 0 -2px 0 var(--brand);" },
  { key: "ctl_stale_span",    s: "זה הנימוק שהתאים" },
  { key: "ctl_td_title",      s: " תווים, כפי שנשמרו" },
  { key: "ctl_no_note",       s: "לא נכתב נימוק על המעבר הזה" },
  { key: "ctl_queue_phrase",  s: "· בתור ${many(queueTotal)}" },
  { key: "ctl_noteTally",     s: "noteTallyBit" },
  { key: "ctl_clamp_note",    s: 'id="clamp-note"' },
  { key: "ctl_empty_box",     s: '<div class="empty" id="empty" hidden>אין פניות שתואמות את הסינון.</div>' },
  { key: "ctl_fillHistory",   s: "fillHistoryNoteCell" },

  // ⚠️ נשקל כ-REMOVED ונמדד כ-CONTROL, ונרשם כפי שנמדד ולא כפי שתוכנן:
  //    «מסומנת ההופעה הראשונה בלבד» אינו נעלם. הכרעה (9) משאירה אותו בדיוק
  //    כפי שהיה — כ-title של מסלול הנפילה חזרה, כששרת מלפני 0101 אינו מחזיר
  //    את המערך. 1 לפני ו-1 אחרי הוא הסיווג הנכון, ולא סימן שהפריסה נכשלה.
  { key: "kept_first_only",   s: "מסומנת ההופעה הראשונה בלבד" },

  // ── נמדדים ולא מוכרזים מראש: שלושה אלה משתנים בכמות ולא בקיום, והסיווג
  //    שלהם נקרא מ-classify.json ולא נכתב כאן.
  { key: "phr_title_lead",    s: "כאן נמצא מה שהוקלד בחיפוש" },
  { key: "phr_createTextNode", s: "document.createTextNode" },
  { key: "phr_note_match_pos", s: "note_match_pos" },
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
