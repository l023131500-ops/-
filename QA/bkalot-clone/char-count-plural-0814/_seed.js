const ENDPOINT = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw";

// פנייה אחת בלבד: מה שנמדד כאן הוא ניסוח שורת ההפקה, ולא הרשימה ולא הסינון.
(async () => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON },
    body: JSON.stringify({
      kind: "info",
      source: "form",
      note: "QA ספירת תווים 14/08",
      consent: "true",
      full_name: "QA תו אחד",
      phone: "0503334411",
      email: "qa-chars-1@more30.test",
    }),
  });
  console.log(res.status, JSON.stringify(await res.json()));
})();
