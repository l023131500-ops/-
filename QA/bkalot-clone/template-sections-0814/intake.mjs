// קליטה דרך הנתיב האמיתי ולא הזרקה למסד — אותו endpoint ואותו מפתח שהטופס
// הציבורי משתמש בהם (apps/37-bkalot-clone/index.html:226-227, 371-379).
//
// שימוש: node intake.mjs <case>
//   with-note     — treatment + disability + הערה   → מצב והערה, שניהם מודפסים
//   without-note  — treatment + disability בלי הערה → מצב מודפס, ההערה נעלמת
//   info          — info בלי situation ובלי הערה    → שניהם נעלמים
const ENDPOINT = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw";

const arg = process.argv[2] || "with-note";
const payload = {
  kind: arg === "info" ? "info" : "treatment",
  source: "form",
  full_name: "בודק מקטע מותנה",
  phone: "0500000066",
  email: "test@more30.com",
  consent: "true",
};
if (arg !== "info") payload.situation = "disability";
// הטופס אינו שולח note ריק — שדה שלא מולא פשוט אינו נשלח (index.html).
if (arg === "with-note") payload.note = "יש לי גם ילד עם צרכים מיוחדים";

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
console.log(arg, res.status, JSON.stringify(body));
