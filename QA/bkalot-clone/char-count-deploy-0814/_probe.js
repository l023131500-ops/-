// probe HTTP: מודד את מסך הניהול שבייצור מול המקור, לפני הפריסה ואחריה.
// node ולא PowerShell בכוונה — PowerShell מזריק BOM ומפרש עברית ב-cp1255.
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..', '..', 'apps', '37-bkalot-clone', 'admin.html');
const PREV = path.join(__dirname, '_prev-admin.html');

const URLS = [
  ['admin_slash', 'https://more30.com/bkalot-studio/admin/'],
  ['admin_noslash', 'https://more30.com/bkalot-studio/admin'],
  ['form', 'https://more30.com/bkalot-studio/'],
  ['home', 'https://more30.com/'],
];

// NEW — חייב 0 בייצור ו-1 במקור. מסומן שמחזיר true על שתי הגרסאות אינו מודד
// דבר (המלכודת של 530fb44, 29d6ac6, e12acf9), ולכן כל אחד נפסל כאן מול הקובץ
// שבייצור לפני שנקבע.
const NEW = [
  'countHe(out.text_chars, "תו טקסט אחד", "תווי טקסט")',
  'countHe(d.text_chars ?? 0, "תו טקסט אחד", "תווי טקסט")',
  'countHe(d.html_chars ?? 0, "תו HTML אחד", "תווי HTML")',
  'אלא נוסח תבנית קצר שעבר את השער של 0074',
  'מכתב טקסט בלבד מגיע',
];

// REMOVED — שלוש השורות שנמחקו ממש. חייב 1 בייצור ו-0 במקור.
const REMOVED = [
  '`${out.text_chars} תווי טקסט`',
  '`${d.text_chars ?? 0} תווי טקסט`',
  '`${d.html_chars ?? 0} תווי HTML`',
];

// OLD — נוכח בשתי הגרסאות. נספר ולא נבדק לנוכחות: רגרסיה ולא רק תוספת.
const OLD = [
  'לא נשלח — מצב טסט',
  'queue_status',
  'countHe(',
  'זכות אחת',
  'תווי טקסט',
  'תווי HTML',
];

function count(hay, needle) {
  let n = 0, i = 0;
  for (;;) { const j = hay.indexOf(needle, i); if (j < 0) break; n++; i = j + needle.length; }
  return n;
}

function markers(html) {
  const o = { NEW: {}, REMOVED: {}, OLD: {} };
  for (const m of NEW) o.NEW[m.slice(0, 46)] = count(html, m);
  for (const m of REMOVED) o.REMOVED[m.slice(0, 46)] = count(html, m);
  for (const m of OLD) o.OLD[m.slice(0, 46)] = count(html, m);
  return o;
}

async function grab(url) {
  const bust = url + (url.includes('?') ? '&' : '?') + 'cb=' + process.argv[3];
  const r = await fetch(bust, { headers: { 'cache-control': 'no-cache' } });
  const html = await r.text();
  return {
    url, status: r.status, bytes: Buffer.byteLength(html, 'utf8'),
    replacement_chars: count(html, '�'),
    // כפל-קידוד cp1255: גרש עברי שנקרא כשני תווים
    double_encoded_geresh: count(html, '×‘'),
    markers: markers(html),
  };
}

(async () => {
  const phase = process.argv[2];
  const out = { phase, at: new Date().toISOString(), urls: {} };
  for (const [k, u] of URLS) out.urls[k] = await grab(u);

  const src = fs.readFileSync(SRC, 'utf8');
  out.source = { bytes: Buffer.byteLength(src, 'utf8'), markers: markers(src) };
  if (fs.existsSync(PREV)) {
    const p = fs.readFileSync(PREV, 'utf8');
    out.prev_dist = { bytes: Buffer.byteLength(p, 'utf8'), markers: markers(p) };
  }
  fs.writeFileSync(path.join(__dirname, `_http-${phase}.json`), JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify(out, null, 2));
})();
