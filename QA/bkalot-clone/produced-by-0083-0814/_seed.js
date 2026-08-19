// זריעה דרך הנתיב של המוצר ולא ב-insert: הטופס הציבורי קורא ל-bkalot-clone-intake
// מעל HTTP עם מפתח anon, וזו הדרך היחידה שבה פנייה נולדת בייצור.
const ENDPOINT = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw";

(async () => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON },
    body: JSON.stringify({
      kind: "info",
      source: "form",
      note: "QA מי הפיק 14/08",
      consent: "true",
      full_name: "QA מי הפיק",
      phone: "0503334412",
      email: "qa-produced-by@more30.test",
    }),
  });
  console.log(res.status, JSON.stringify(await res.json()));
})();
