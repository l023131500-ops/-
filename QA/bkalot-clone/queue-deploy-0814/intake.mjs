// שתי פניות דרך נתיב הקליטה האמיתי מעל HTTP — לא הזרקה למסד.
// טלפונים שונים בכוונה: bkalot_clone_intake מאתר איש קשר לפי טלפון (#235),
// ושני מיילים על אותו טלפון היו נותנים איש קשר אחד ומדידה אחת.
const ENDPOINT = "https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake";
const ANON = process.env.ANON_KEY;

const cases = [
  {
    tag: "allowed",
    kind: "treatment",
    full_name: "בדיקת פריסה — תור מאושר",
    phone: "0500000391",
    email: "qa.bkalot@more30.com",
    situation: "disability",
    note: "בדיקת «הכנס לתור» על הכתובת החיה — יעד ברשימת יעדי הבדיקה.",
    consent: "true",
    source: "admin",
  },
  {
    tag: "not-allowed",
    kind: "treatment",
    full_name: "בדיקת פריסה — תור חסום",
    phone: "0500000392",
    email: "qa.blocked.0814@more30.com",
    situation: "disability",
    note: "בדיקת «הכנס לתור» על הכתובת החיה — יעד שאינו ברשימה.",
    consent: "true",
    source: "admin",
  },
];

for (const c of cases) {
  const { tag, ...body } = c;
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON, authorization: `Bearer ${ANON}` },
    body: JSON.stringify(body),
  });
  console.log(tag, res.status, JSON.stringify(await res.json()));
}
