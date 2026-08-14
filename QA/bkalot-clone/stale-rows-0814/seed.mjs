// זריעה לפעימת «רענון שנכשל משאיר את השורות הישנות על המסך».
//
// שתי פניות דרך נתיב הקליטה הציבורי מעל HTTP (bkalot-clone-intake, מפתח anon
// כמו מהטופס) ולא בהזרקה ל-cases. שתיהן נוצרות באותה ריצה ובאותה צורה בדיוק,
// ונבדלות רק בסוג: אחת treatment ואחת info. ההבדל בסוג הוא מה שהופך את הסינון
// שנכשל למדיד — «סוג: מידע» הוא סינון שהתשובה עליו שונה מזו שעל המסך.
//
// «eligibility» אינו סוג קיים: הקליטה החזירה 200 עם {ok:false,
// error:"kind_invalid", allowed:["info","reminder","treatment"]}, כלומר סטטוס
// HTTP תקין על פנייה שלא נוצרה. הזריקה על case_id ריק היא מה שתפס את זה, ולא
// המשך שקט על פנייה שאינה קיימת.
//
// הסקריפט אינו מפיק מסמך ואינו מכריע דבר: שתיהן נשארות status=new.
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
const mk = async (kind, name, note, phone) => {
  const res = await fetch(INTAKE, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON },
    body: JSON.stringify({
      kind, source: "form", situation: "single_parent",
      full_name: name, phone, email: "test@more30.com", note, consent: "true",
    }),
  });
  const body = await res.json().catch(() => null);
  const id = body?.case_id ?? body?.case?.id ?? null;
  if (id === null) throw new Error("intake לא החזירה case_id: " + JSON.stringify({ status: res.status, body }));
  return id;
};

const caseA = await mk("treatment", "בדיקה 0085 טיפול", "מדידת רענון שנכשל — השורה שנשארת על המסך", "0501230101");
const caseB = await mk("info", "בדיקה 0085 מידע", "מדידת רענון שנכשל — הסינון שהתשובה עליו שונה", "0501230102");

const out = { case_treatment: caseA, case_info: caseB };
writeFileSync(new URL("./seed.json", import.meta.url), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
