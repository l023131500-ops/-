// markers.mjs — הסימנים שמכריעים אם הקוד שנפרס הוא הקוד שבמקור.
//
// הסיווג נקבע מהשוואת שני קבצים מקומיים (src מול dist) לפני שהכתובת החיה
// נפגשת ולו פעם אחת — 0087. כל סימן נספר כמחרוזת גולמית, בלי regex ובלי
// נורמליזציה, כדי שספירה בקובץ מקומי וספירה בגוף HTTP יהיו אותה פעולה בדיוק.

export const MARKERS = [
  // ── מה שנוסף ב-847ae58 ────────────────────────────────────────────────
  { key: "noneText_decl",   s: 'const noneText = filtered ?' },
  { key: "noneText_all",    s: 'noneText' },
  { key: "emptyBox_decl",   s: 'const emptyBox = $("empty");' },
  { key: "emptyBox_hidden", s: 'emptyBox.hidden = cases.length > 0;' },
  { key: "emptyBox_text",   s: 'emptyBox.textContent = total === 0' },
  { key: "emptyBox_all",    s: 'emptyBox' },
  { key: "page_empty_str",  s: 'בעמוד הזה לא נשארו פניות.' },
  { key: "comment_head",    s: 'התיבה הריקה אומרת «תואמות את הסינון» גם כשאין סינון' },
  { key: "comment_clean",   s: 'מחפש סינון לנקות שאינו קיים' },
  { key: "comment_single",  s: 'noneText הוא המקור היחיד לשני המשפטים' },
  { key: "comment_echo",    s: 'הד נראה' },

  // ── מה ש-847ae58 החליף ולכן חייב להיעלם מהייצור ──────────────────────
  { key: "old_empty_line",  s: '$("empty").hidden = cases.length > 0;' },
  { key: "old_ternary",     s: '? (filtered ? "אין פניות שתואמות את הסינון" : "אין פניות")' },

  // ── בקרות: אמורות להיות זהות לפני ואחרי ──────────────────────────────
  { key: "ctl_box_literal", s: '<div class="empty" id="empty" hidden>אין פניות שתואמות את הסינון.</div>' },
  { key: "ctl_count_title", s: 'המספר הוא של הפניות שעונות על הסינון ולא של התור כולו' },
  { key: "ctl_noteTally",   s: 'noteTallyBit' },
  { key: "ctl_clamp_note",  s: 'id="clamp-note"' },
  { key: "ctl_filtered",    s: 'const filtered = !!(lastFilters.status' },

  // ── שניים שנשקלו כבקרות ונמדדו כ-DIFF, ונרשמים כפי שנמדדו ולא כפי
  //    שתוכננו: ההערה החדשה מצטטת את שני הנוסחים, ולכן הספירה עולה בלי
  //    שהתנהגות המסך תשתנה. הם עדיין מכריעים — 5→7 ו-2→3.
  { key: "phr_none_phrase", s: 'אין פניות שתואמות את הסינון' },
  { key: "phr_moatzot",     s: '· מוצגות ' },
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
