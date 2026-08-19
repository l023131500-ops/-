// זריעה לפעימת הפריסה של «זכות אחת» בשורת אישור ההפקה.
//
// שתי פניות דרך נתיב הקליטה הציבורי מעל HTTP (bkalot-clone-intake, מפתח anon
// כמו מהטופס) ולא בהזרקה ל-cases. שתיהן נוצרות באותה ריצה ובאותה צורה בדיוק:
// אחת תרד לזכות אחת ותקבל את שורת האישור ביחיד, והשנייה היא הבקרה שנשארת
// ברבים — אחרת ההבדל שנמדד אחר כך יכול להיות הבדל בין שתי פניות ולא בין שני
// מצבי ניסוח.
//
// הסקריפט אינו מכריע דבר ואינו מפיק דבר: שתיהן נשארות status=new, וההפקה
// עצמה נעשית בלחיצה בדפדפן על הכתובת החיה.
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

const caseOne = await mk("בדיקה 0084 יחיד", "פריסת שורת אישור ההפקה — תרד לזכות אחת", "0501230099");
const caseMany = await mk("בדיקה 0084 רבים", "פריסת שורת אישור ההפקה — בקרה שנשארת ברבים", "0501230100");

const out = { case_one: caseOne, case_many: caseMany };
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
