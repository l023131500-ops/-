// קליטה דרך הנתיב האמיתי ולא הזרקה למסד — אותו endpoint ואותו מפתח שהטופס
// הציבורי משתמש בהם (apps/37-bkalot-clone/index.html:226-227, 371-379).
const ENDPOINT = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw";

// arg = מפתח מצב, או "info" לפנייה שאין לה מצב כלל (הטופס אינו שולח situation
// כשהסוג אינו treatment — index.html:358-362).
const arg = process.argv[2] || "disability";
const payload = {
  kind: arg === "info" ? "info" : "treatment",
  source: "form",
  full_name: "בודק שם המצב",
  phone: "0500000232",
  email: "test@more30.com",
  note: "בדיקת 0065 — השם העברי של המצב",
  consent: "true",
};
if (arg !== "info") payload.situation = arg;

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    apikey: ANON_KEY,
    authorization: "Bearer " + ANON_KEY,
  },
  body: JSON.stringify(payload),
});
const body = await res.json();
console.log(res.status, JSON.stringify(body));
