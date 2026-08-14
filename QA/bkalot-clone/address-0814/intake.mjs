// קליטה דרך הנתיב האמיתי ולא הזרקה למסד — אותו endpoint ואותו מפתח שהטופס
// הציבורי משתמש בהם (apps/37-bkalot-clone/index.html:226-227, 371-379).
const ENDPOINT = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw";

// node intake.mjs <phone> <email> <consent> <label>
const [phone, email, consent, label] = process.argv.slice(2);

const payload = {
  kind: "treatment",
  source: "form",
  full_name: label || "בודק כתובת",
  phone,
  email,
  situation: "disability",
  note: "בדיקת 0068 — הכתובת של הפנייה מול הכתובת של איש הקשר (#235)",
  consent,
};

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
