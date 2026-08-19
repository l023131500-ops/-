// candidates.mjs — שלב הסיווג, ורק הוא. הוא נוגע בשני קבצים מקומיים בלבד:
//   src  — apps/37-bkalot-clone/admin.html         (מה שאמור להיפרס — 917bc5f)
//   dist — portal/dist/bkalot-studio/admin.html    (הבייטים שנפרסו ב-e58ed10)
//
// הסיווג נקבע מהשוואת השניים ולא מהכתובת החיה, ולכן אי-אפשר «לתקן» אותו אחרי
// שרואים את התוצאה — תקלת 0087. הכתובת החיה נפגשת לראשונה ב-probe.mjs, שנכתב
// אחרי שהקובץ הזה רץ ו-classify.mjs נחתם.
//
// ⚠️ הפעימה הזו מוסיפה בלבד — noteTallyBit נוסף ו-noteMatchBit נשאר במקומו
// מילה במילה (הכרעה (1)). ולכן אין כאן קבוצת REMOVED, ונאמר ולא נבלע: הטענה
// «הקוד הישן הסתלק» אינה נמדדת כאן מפני שאין קוד ישן שיוצא.
import { readFileSync } from "node:fs";

const ROOT = "C:/Users/USER/Downloads/more30";
const src = readFileSync(`${ROOT}/apps/37-bkalot-clone/admin.html`, "utf8");
const dist = readFileSync(`${ROOT}/portal/dist/bkalot-studio/admin.html`, "utf8");

function count(hay, needle) {
  let n = 0, i = 0;
  for (;;) {
    const j = hay.indexOf(needle, i);
    if (j < 0) return n;
    n++;
    i = j + needle.length;
  }
}

const CANDIDATES = [
  // מועמדי NEW — הקוד והטקסט שהפעימה הוסיפה
  "noteTallyBit",
  "const noteTally = noteTallyBit(c);",
  'Object.hasOwn(c, "note_match_count")',
  "המונח בנימוק היחיד",
  "המונח ב-${hit} מתוך ${notes} הנימוקים",
  "כמה מהנימוקים שנכתבו ביומן ההכרעות של הפנייה נושאים את מונח החיפוש",
  "המספר נספר ביומן עצמו ולא נגזר",
  "המכנה הוא הנימוקים שנכתבו ולא המעברים",
  "«כמה מהנימוקים התאימו» ברשימה",
  "ככל שהמונח כללי יותר כך גדל בדיוק המספר שנבלע",
  "אפס שותק כאן, בניגוד להכרעה (4) של noteMatchTally",
  "שני מספרים ולא אחד",
  "מיזוגם היה מוריש את העיוורון לשניהם",
  "notes_count",
  "note_match_count",
  // מועמדי DIFF / בקרה — מה שלא אמור לזוז
  "noteMatchBit",
  "נמצאה לפי הנימוק",
  "matched_in_note",
  "noteMatchTally",
  'id="count"',
  'id="empty"',
  "אין פניות שתואמות את הסינון",
  "פנייה אחת",
  "countHe",
  "bkalot_clone_admin_cases",
  "מספר פנייה או נימוק ביומן ההכרעות",
  "רצף ההכרעות",
  "מי הכריע",
  "איש הקשר נמחק",
  "decidedBit",
  "row-meta",
  "מיון",
];

const rows = CANDIDATES.map((m) => ({ marker: m, src: count(src, m), dist: count(dist, m) }));
console.log(JSON.stringify(rows, null, 2));
