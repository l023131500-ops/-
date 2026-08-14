// בודק את המסומנים של 073f08b מול קובץ מקומי. הטעם: מסומן שהיה true גם לפני
// הפריסה אינו מעיד על הפעימה — ב-530fb44 «נוסח נפילה» היה כזה, ונתפס רק מפני
// שנמדד מול הגרסה הקודמת ולא הונח.
//
// המסומנים כאן נבחרו להיות ייחודיים ל-073f08b בלבד: «מי הכריע אינו ידוע»
// ו«החשבון אינו קיים עוד» יושבים גם ב-fillDecidedLine מאז 1abad72, ולכן הם
// חסרי ערך כראיה לפעימה הזו והועברו לרשימת ה-OLD.
//
// גם ``מנהל #${c.decided_by} · החשבון אינו קיים עוד`` — שנראה ייחודי לרשימה —
// נמדד true על 073f08b^ ועבר ל-OLD: 073f08b העתיקה אותו מילה במילה
// מ-fillDecidedLine. זו בדיוק התקלה של 530fb44, והיא נתפסה רק מפני שהמסומנים
// נמדדו על הגרסה הקודמת לפני שהונחו.
import { readFileSync } from "node:fs";
const NEW = [
  "decidedBit",
  "const decided = decidedBit(c)",
  'Object.hasOwn(c, "decided_at")',
  "לא הוכרע מהמסך",
  "הטריגר קידם אותה בהפקת מסמך",
];
const OLD = [
  "fillDecidedLine",
  "לא נרשמה הכרעה ידנית מהמסך",
  "מי הכריע אינו ידוע",
  "החשבון אינו קיים עוד",
  "מנהל #${c.decided_by} · החשבון אינו קיים עוד",
  "<th>מכתב</th>",
  "fillTemplateCell",
  "tmpl-sel",
  "שינוי סטטוס",
  "עבד עכשיו",
  "הכנס לתור",
];
const t = readFileSync(process.argv[2], "utf8");
console.log(process.argv[2], t.length, "chars");
console.log("new:", NEW.map((m) => m + "=" + t.includes(m)).join(" | "));
console.log("old:", OLD.map((m) => m + "=" + t.includes(m)).join(" | "));
