const ENDPOINT = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw";

const people = [
  { full_name: "QA הצג ראשונה", phone: "0503330011", email: "qa-apply-1@more30.test" },
  { full_name: "QA הצג שנייה", phone: "0503330022", email: "qa-apply-2@more30.test" },
  { full_name: "QA הצג שלישית", phone: "0503330033", email: "qa-apply-3@more30.test" },
];

(async () => {
  for (const p of people) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: ANON, authorization: "Bearer " + ANON },
      body: JSON.stringify({ kind: "info", source: "form", note: "QA כפתור הצג 14/08", consent: "true", ...p }),
    });
    const body = await res.json();
    console.log(res.status, JSON.stringify(body));
    await new Promise((r) => setTimeout(r, 1200));
  }
})();
