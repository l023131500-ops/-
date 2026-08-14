// זריעה לפעימת «1 זכויות» בשורת אישור הפקת המסמך.
//
// שתי פניות דרך נתיב הקליטה הציבורי מעל HTTP (bkalot-clone-intake, מפתח anon
// כמו מהטופס) ולא בהזרקה ל-cases. שתיהן נוצרות באותה ריצה ובאותה צורה בדיוק:
// אחת תרד לזכות אחת, והשנייה תישאר עם כל 42 הזכויות ותשמש גם לבקרה וגם למצב
// chosen — אחרת ההבדל שנמדד יכול להיות הבדל בין שתי פניות ולא בין שני נוסחים.
//
// הסקריפט אינו מפיק מסמך ואינו מכריע דבר: שתיהן נשארות status=new, וכל מסמך
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

const caseOne = await mk("בדיקה 0083 זכות אחת", "מדידת «זכות אחת» בשורת אישור ההפקה — תרד לזכות אחת", "0501230097");
const caseMany = await mk("בדיקה 0083 כל הרשימה", "מדידת «זכות אחת» בשורת אישור ההפקה — בקרה ומצב chosen", "0501230098");

const out = { case_one: caseOne, case_many: caseMany };
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
