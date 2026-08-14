// בודק את ששת המסומנים החדשים מול קובץ מקומי. הטעם: מסומן שהיה true גם לפני
// הפריסה אינו מעיד על הפעימה — בפעימה הקודמת (530fb44) «נוסח נפילה» היה כזה,
// והוא נתפס רק מפני שנמדד מול הגרסה הקודמת ולא הונח.
import { readFileSync } from "node:fs";
const NEW = [
  "fillDecidedLine",
  "לא נרשמה הכרעה ידנית מהמסך",
  "מי הכריע אינו ידוע",
  "החשבון אינו קיים עוד",
  "הוכרעה ${fmtDate",
  "מזהה מנהל $",
];
const t = readFileSync(process.argv[2], "utf8");
console.log(process.argv[2], t.length, "chars");
console.log(NEW.map((m) => m + "=" + t.includes(m)).join(" | "));
