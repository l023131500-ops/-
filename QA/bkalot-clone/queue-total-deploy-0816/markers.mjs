// markers.mjs — הסימנים שמכריעים אם הקוד שנפרס הוא הקוד שבמקור.
//
// הסיווג נקבע מהשוואת שני קבצים מקומיים (src מול dist) לפני שהכתובת החיה
// נפגשת ולו פעם אחת — 0087. כל סימן נספר כמחרוזת גולמית, בלי regex ובלי
// נורמליזציה, כדי שספירה בקובץ מקומי וספירה בגוף HTTP יהיו אותה פעולה בדיוק.

export const MARKERS = [
  // ── מה שנוסף ב-f9df2e2 ────────────────────────────────────────────────
  { key: "queueTotal_decl",  s: "let queueTotal;" },
  { key: "queueTotal_read",  s: 'queueTotal = Object.hasOwn(data, "queue_total")' },
  { key: "queueTotal_all",   s: "queueTotal" },
  { key: "queue_total_all",  s: "queue_total" },
  { key: "queueBit_decl",    s: 'const queueBit = typeof queueTotal === "number"' },
  { key: "queueBit_all",     s: "queueBit" },
  { key: "queue_phrase",     s: "· בתור ${many(queueTotal)}" },
  { key: "title_new",        s: "המספר הראשון הוא של הפניות שעונות על הסינון" },
  { key: "title_branch",     s: 'if (queueBit) $("count").title' },
  { key: "comment_two_msgs", s: "«2 מתוך 4» הן שתי הודעות שונות" },
  { key: "comment_stale",    s: "ההכרעה הזו נכתבה כשהיא הייתה נכונה ואינה נכונה עוד" },
  { key: "comment_betor",    s: "«בתור» ולא «מתוך»" },

  // ── מה ש-f9df2e2 החליף ולכן חייב להיעלם מהייצור ──────────────────────
  { key: "old_count_line",   s: '$("count").textContent = total === cases.length' },
  { key: "old_title_if",     s: '  if (filtered) $("count").title' },

  // ── בקרות: אמורות להיות זהות לפני ואחרי ──────────────────────────────
  { key: "ctl_filtered",     s: "const filtered = !!(lastFilters.status" },
  { key: "ctl_noneText",     s: "const noneText = filtered ?" },
  { key: "ctl_emptyBox",     s: "emptyBox.textContent = total === 0" },
  { key: "ctl_noteTally",    s: "noteTallyBit" },
  { key: "ctl_clamp_note",   s: 'id="clamp-note"' },
  { key: "ctl_qPhone",       s: "let qPhone = null;" },
  { key: "ctl_box_literal",  s: '<div class="empty" id="empty" hidden>אין פניות שתואמות את הסינון.</div>' },

  // ── שניים שנשקלו כבקרות ונמדדו כ-DIFF, ונרשמים כפי שנמדדו ולא כפי
  //    שתוכננו: הענף השני של ה-title והציטוט שבהערה מוסיפים מופע לכל אחד
  //    מהשניים, בלי שהתנהגות המסך תשתנה במקום אחר.
  { key: "phr_count_title",  s: '$("count").title' },
  { key: "phr_sort_clause",  s: "המיון אינו מוציא שורות" },
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
