// candidates.mjs — שלב הסיווג, ורק הוא. הוא נוגע בשני קבצים מקומיים בלבד:
//   src  — apps/37-bkalot-clone/admin.html         (מה שאמור להיפרס)
//   dist — portal/dist/bkalot-studio/admin.html    (הבייטים שנפרסו בפעם הקודמת)
//
// הסיווג נקבע מהשוואת השניים ולא מהכתובת החיה, ולכן אי-אפשר «לתקן» אותו אחרי
// שרואים את התוצאה — תקלת 0087. הכתובת החיה נפגשת לראשונה ב-probe.mjs, שנכתב
// אחרי שהקובץ הזה רץ ו-classify.mjs נחתם.
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
  // מועמדי NEW — הטקסט שהפעימה הוסיפה
  "אין פניות שתואמות את הסינון",
  "המונה מדבר על התור כולו בזמן שהוא סופר את הסינון",
  "המספר הוא של הפניות שעונות על הסינון ולא של התור כולו",
  "המיון אינו סינון ואינו נספר כאן",
  "const filtered = !!(lastFilters.status",
  "const head = total === 0",
  'removeAttribute("title")',
  "השרת מחזיר את המניין שאחרי הסינון",
  "המיון אינו מוציא שורות ואינו משפיע על המספר",
  "היה מייחס למספר",
  "היה מספר מומצא",
  "ותיבת ה-empty אינה אזור סטטוס ואינה מוקראת כלל",
  "הוא מתאר את חיתוך העמוד",
  "את הסינון",
  // מועמדי REMOVED — הקוד שיוצא
  '$("count").textContent = total === 0',
  "(total === cases.length ? many(total)",
  // מועמדי DIFF / בקרה
  "אין פניות",
  "פנייה אחת",
  "מוצגות ",
  "lastFilters",
  "countHe",
  'id="count"',
  'role="status"',
  'id="empty"',
  "a795108",
  "0081",
  "bkalot_clone_admin_cases",
  "פנייה #",
  "matched_in_note",
  "איש הקשר נמחק",
  "מספר פנייה או נימוק ביומן ההכרעות",
  "רצף ההכרעות",
  "<th>למה</th>",
  "מי הכריע",
  "מיון",
];

const rows = CANDIDATES.map((m) => ({ marker: m, src: count(src, m), dist: count(dist, m) }));
console.log(JSON.stringify(rows, null, 2));
