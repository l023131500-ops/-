// _verify.mjs — שתי בקרות שאי אפשר לקרוא בעין מהסיכום:
// (1) הפיצול לשלושה צמתים אינו מוסיף ואינו גורע ולו תו אחד — td.textContent
//     שווה לנימוק השמור בכל 12 התאים שנקראו;
// (2) mark שנמצא נושא את ה-title שנכתב, וה-mark עצמו שווה ל-substr שהמסד החזיר.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const j = JSON.parse(readFileSync(new URL("./live-dom.json", import.meta.url)));
const STORED = [
  "המסמכים שצורפו שייכים לשנת המס הקודמת",
  "Email נשלח לפונה, ואחריו EMAIL נוסף בטעות",
  "הטופס נשלח בדואר רשום על ידי הפונה",
];
// מה שהמסד החזיר ב-substr(note, pos, len) לפני שהמסך נקרא.
const DB_SUBSTR = { term1_end: "המס הקודמת", term2_start: "Email", term3_mid: "בדואר רשום" };
const TITLE = "כאן נמצא מה שהוקלד בחיפוש — המיקום מגיע מהמסד ולא נמדד שוב במסך. אם המונח חוזר בטקסט הזה, מסומנת ההופעה הראשונה בלבד";

let cells = 0, textOk = 0, bad = [];
for (const [k, s] of Object.entries(j.states)) {
  if (!s.cells) continue;
  s.cells.forEach((c, i) => {
    cells++;
    // ה-td כולל את «זה הנימוק שהתאים» בתוך span, ולכן נספר רק צמתי הטקסט
    // שלפני ה-BR — הם הנימוק עצמו.
    const upToBr = [];
    for (const n of c.nodes) { if (n === "BR") break; upToBr.push(n); }
    const drawn = c.nodes.filter((n) => n.startsWith("T:")).map((n) => n.slice(2)).join("")
      + (c.mark ? "" : "");
    // הרכבה מדויקת: צמתי טקסט + תוכן ה-mark, לפי הסדר, עד ה-BR.
    let assembled = "", mi = 0;
    for (const n of upToBr) assembled += n === "MARK" ? c.mark : n.slice(2);
    if (assembled === STORED[i]) textOk++; else bad.push({ state: k, cell: i, assembled });
  });
  for (const c of s.cells) {
    if (!c.mark) continue;
    if (c.mark !== DB_SUBSTR[k]) bad.push({ state: k, why: "mark != db substr", mark: c.mark });
    if (c.mark_title !== TITLE) bad.push({ state: k, why: "mark title differs", got: c.mark_title });
    if (c.mark_cls !== "hit") bad.push({ state: k, why: "class", got: c.mark_cls });
  }
}
console.log(`cells_read=${cells} text_reassembles_to_stored_note=${textOk} mismatches=${JSON.stringify(bad)}`);

for (const f of ["live-term1-end.png", "live-term2-start-first-only.png", "live-term3-mid.png", "live-ctl-no-term.png"]) {
  const b = readFileSync(new URL(`./${f}`, import.meta.url));
  console.log(`${f} bytes=${b.length} md5=${createHash("md5").update(b).digest("hex").toUpperCase().slice(0, 8)}`);
}
