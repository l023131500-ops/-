// זריעה דרך הנתיב האמיתי: bkalot-clone-intake מעל HTTP עם מפתח anon, כמו מהטופס.
// ארבע פניות ברצף, כל אחת עם טלפון אחר בכוונה (הקליטה מאתרת איש קשר לפי טלפון).
const URL = 'https://uhnrgujbdxhhmoxcjria.supabase.co/functions/v1/bkalot-clone-intake';
const ANON = process.env.ANON;

const rows = [
  { full_name: 'QA מיון א', phone: '0501110001', kind: 'info',      situation: 'other', note: 'A' },
  { full_name: 'QA מיון ב', phone: '0501110002', kind: 'info',      situation: 'other', note: 'B' },
  { full_name: 'QA מיון ג', phone: '0501110003', kind: 'reminder',  situation: 'other', note: 'C' },
  { full_name: 'QA מיון ד', phone: '0501110004', kind: 'info',      situation: 'other', note: 'D' },
];

const out = [];
for (const r of rows) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { apikey: ANON, authorization: `Bearer ${ANON}`, 'content-type': 'application/json' },
    body: JSON.stringify(r),
  });
  const j = await res.json();
  out.push({ note: r.note, http: res.status, body: j });
  await new Promise((s) => setTimeout(s, 250));
}
console.log(JSON.stringify(out, null, 1));
