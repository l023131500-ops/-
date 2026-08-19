// זריעה לפעימת «חזרה לרשימה אינה מרעננת את הרשימה».
//
// שתי פניות דרך נתיב הקליטה הציבורי מעל HTTP (bkalot-clone-intake, מפתח anon
// כמו מהטופס) ולא בהזרקה ל-cases. אחת נמדדת על הגרסה שבייצור (prev) והשנייה
// על הקובץ המתוקן, ושתיהן נוצרות באותה ריצה ובאותה צורה בדיוק — אחרת ההבדל
// שנמדד אחר כך יכול להיות הבדל בין שתי פניות ולא בין שתי גרסאות של המסך.
//
// הסקריפט אינו מכריע דבר ואינו מפיק דבר: שתיהן נשארות status=new, וכל שינוי
// שייראה אחר כך הוא תוצאת לחיצה בדפדפן.
//
// נכתב ב-node ולא ב-PowerShell בכוונה: קובץ .ps1 בלי BOM נקרא כ-cp1255 והעברית
// שבתוכו נהרסת בזמן הפירוק.
import { writeFileSync } from "node:fs";

const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw";
const INTAKE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";

// הטלפון הוא בדיוק עשר ספרות. ב-0078 הוא נבנה מאורך מערך והפיק אחת-עשרה,
// הקליטה דחתה, case_id חזר null, וכל המדידה שאחריה רצה על פניות שאינן קיימות
// והציגה אפס כאילו זו תשובה. לכן זריקה על case_id ריק, ולא המשך שקט.
const mk = async (name, note, phone) => {
  const res = await fetch(INTAKE, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON },
    body: JSON.stringify({
      kind: "treatment", source: "form", situation: "single_parent",
      full_name: name, phone, email: "test@more30.com", note, consent: "true",
    }),
  });
  const body = await res.json().catch(() => null);
  const id = body?.case_id ?? body?.case?.id ?? null;
  if (id === null) throw new Error("intake לא החזירה case_id: " + JSON.stringify({ status: res.status, body }));
  return id;
};

const casePrev = await mk("בדיקה 0081 לפני", "מדידת חזרה לרשימה — הגרסה שבייצור", "0501230093");
const caseNext = await mk("בדיקה 0081 אחרי", "מדידת חזרה לרשימה — הקובץ המתוקן", "0501230094");

const out = { case_prev: casePrev, case_next: caseNext };
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
