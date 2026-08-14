// זריעה לפעימת הפריסה של «מי הכריע ומתי».
//
// שתי פניות, שתיהן דרך נתיב הקליטה הציבורי מעל HTTP (bkalot-clone-intake, מפתח
// anon כמו מהטופס) ולא בהזרקה ל-cases: מה שנמדד אחר כך על הכתובת החיה הוא מה
// שהמסך מקבל על שורה שנוצרה כמו שנוצרת שורה אמיתית.
//
// נכתב ב-node ולא ב-PowerShell בכוונה: קובץ .ps1 בלי BOM נקרא כ-cp1255 והעברית
// שבתוכו נהרסת בזמן הפירוק.
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw";
const INTAKE = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";

async function intake(body) {
  const res = await fetch(INTAKE, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON },
    body: JSON.stringify(body),
  });
  const out = await res.json().catch(() => null);
  return { status: res.status, case_id: out?.case_id ?? out?.case?.id, body: out };
}

const a = await intake({
  kind: "treatment",
  source: "form",
  situation: "single_parent",
  full_name: "בדיקה 0078 פריסה",
  phone: "0501230092",
  email: "test@more30.com",
  note: "מדידת פריסה — מי הכריע ומתי, על הכתובת החיה",
  consent: "true",
});
// הבקרה: נוצרת באותה ריצה ולא נוגעים בה כלל, ולכן היא אמורה לומר «לא נרשמה
// הכרעה» מתחילת המדידה ועד סופה.
const b = await intake({
  kind: "info",
  source: "form",
  full_name: "בדיקה 0078 פריסה (בקרה)",
  phone: "0501230093",
  email: "test@more30.com",
  note: "בקרה — לא נוגעים בה",
  consent: "true",
});

console.log(JSON.stringify({ a, b }, null, 2));
