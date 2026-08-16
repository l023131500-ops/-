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
  "מה התיבה הזו מחפשת",
  "מספר פנייה או נימוק ביומן ההכרעות",
  "החיפוש רץ גם על טקסט הנימוקים שנכתבו ביומן ההכרעות",
  "אינו רץ על גוף הפנייה עצמה ולא על שמות המכריעים",
  "והנימוק עצמו נקרא בתוך הפנייה",
  "התווית מנתה ארבעה שדות מאז שהתיבה נבנתה",
  "מי שזוכר מילה מנימוק ולא את שם הפונה אינו מנסה כלל",
  "ותווית רחבה הייתה שקר בכיוון השני",
  "הריחוף הטבעי הוא מעל התיבה שאל",
  "התווית היא המקום היחיד שעונה על כך לפני ההקלדה",
  "רשימה שחסר בה אחד היא טענה שגויה",
  // מועמד REMOVED — הטענה השגויה שיוצאת
  "או מספר פנייה",
  "דוא״ל או מספר",
  // מועמדי DIFF / בקרה
  "חיפוש — שם, טלפון, דוא״ל",
  "נימוק",
  "נמצאה לפי הנימוק",
  "0096",
  "cases.note",
  "יומן ההכרעות",
  'id="f-q"',
  'for="f-q"',
  "autocomplete=\"off\"",
  "מיון",
  "רצף ההכרעות",
  "bkalot_clone_admin_cases",
  "פנייה #",
  "countHe",
  "matched_in_note",
  "note_matched",
  "<th>למה</th>",
  "מי הכריע",
  "איש הקשר נמחק",
];

const rows = CANDIDATES.map((m) => ({ marker: m, src: count(src, m), dist: count(dist, m) }));
console.log(JSON.stringify(rows, null, 2));
