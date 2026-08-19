// auth-entry-sweep — האם למערכת חיה יש בכלל דרך להתחבר?
//
// §1ג דורש שכל מי שנכנס למערכת יוכל להיכנס אליה כלקוח מלא, ושכפתור
// הכניסה יופיע בעיצוב כל אתר. הכפתור המשותף הוא portal/public/auth-button.js,
// שמגדיר את האלמנט <more30-auth>. בלעדיו אין באתר שום מסלול כניסה —
// לא שבור, פשוט לא קיים, ולכן שום בדיקת "האם הכניסה עובדת" לא רואה אותו.
//
// הבדיקה נעשית על מה שהייצור מגיש בפועל, לא על עץ המקור: ‏fetch לכתובת
// החיה וחיפוש הסקריפט ותג האלמנט ב-HTML שחזר. אפליקציות SPA מזריקות
// הרבה אחרי הטעינה, ולכן היעדר <more30-auth> ב-HTML לבדו אינו ראיה —
// הסקריפט הוא הראיה, כי הוא נטען מה-HTML.
//
// שימוש:  node scripts/qa/auth-entry-sweep.mjs
// פלט:    QA/platform/auth-entry-0812/_results.json

import { writeFileSync, mkdirSync } from 'node:fs';

// הכתובות החיות, כפי ש-core.projects מחזיקה אותן ב-12/08.
// (live=true ו-live_url לא ריק. 08/09 מוגנות ואינן ברשימה.)
const LIVE = [
  ['01', 'torah', 'https://more30.com/torah'],
  ['02', 'tamlul', 'https://more30.com/tamlul'],
  ['03', 'modaot', 'https://more30.com/modaot'],
  ['04', 'imud', 'https://more30.com/imud'],
  ['06', 'briut', 'https://more30.com/briut'],
  ['10', 'bkalot', 'https://more30.com/bkalot'],
  ['12', 'smel', 'https://more30.com/smel'],
  ['14', 'smachot', 'https://more30.com/smachot'],
  ['15', 'egod', 'https://more30.com/egod'],
  ['16', 'chatzor', 'https://more30.com/chatzor'],
  ['17', 'chizukim', 'https://more30.com/chizukim'],
  ['18', 'orech', 'https://more30.com/orech'],
  ['21', 'mthbram', 'https://more30.com/mthbram'],
  ['22', 'zchuyot', 'https://more30.com/zchuyot'],
  ['24', 'galil', 'https://more30.com/galil'],
  ['26', 'studio', 'https://more30.com/studio'],
  ['27', 'mechiron', 'https://more30.com/mechiron'],
  ['28', 'kupot', 'https://more30.com/kupot'],
  ['30', 'crm', 'https://more30.com/crm'],
  ['31', 'gesher', 'https://more30.com/gesher'],
  ['32', 'nadlan', 'https://more30.com/nadlan'],
  ['33', 'more30', 'https://more30.com/'],
  ['34', 'kesef', 'https://more30.com/kesef'],
  ['35', 'kiosk', 'https://more30.com/kiosk'],
  ['36', 'tivuch', 'https://more30.com/tivuch'],
  ['40', 'gannenet', 'https://more30.com/gannenet'],
];

async function probe(number, path, url) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'more30-qa/auth-entry' } });
    const html = await res.text();
    return {
      number,
      path,
      url,
      final_url: res.url,
      status: res.status,
      bytes: html.length,
      // הסקריפט הוא הראיה. התג נרשם בנפרד כי הוא נוח לעין אבל אינו הכרחי.
      has_script: /auth-button\.js/.test(html),
      has_tag: /<more30-auth/i.test(html),
      verdict: null,
    };
  } catch (e) {
    return { number, path, url, final_url: null, status: null, bytes: 0, has_script: false, has_tag: false, error: String(e.message || e), verdict: 'unreachable' };
  }
}

const rows = [];
for (const [number, path, url] of LIVE) {
  const r = await probe(number, path, url);
  if (!r.verdict) r.verdict = r.status !== 200 ? 'not_200' : r.has_script ? 'has_login' : 'no_login_entry';
  rows.push(r);
  console.log(`${r.verdict.padEnd(15)} ${number} ${path.padEnd(10)} ${r.status} ${r.bytes}B script=${r.has_script} tag=${r.has_tag}`);
}

const missing = rows.filter((r) => r.verdict === 'no_login_entry');
const summary = {
  measured_at: new Date().toISOString(),
  source: 'production HTML over the network — not the source tree',
  total: rows.length,
  has_login: rows.filter((r) => r.verdict === 'has_login').length,
  no_login_entry: missing.length,
  not_200: rows.filter((r) => r.verdict === 'not_200').length,
  unreachable: rows.filter((r) => r.verdict === 'unreachable').length,
  missing_list: missing.map((r) => `${r.number} ${r.path}`),
  rows,
};

mkdirSync('QA/platform/auth-entry-0812', { recursive: true });
writeFileSync('QA/platform/auth-entry-0812/_results.json', JSON.stringify(summary, null, 2) + '\n');
console.log('\n' + JSON.stringify({ total: summary.total, has_login: summary.has_login, no_login_entry: summary.no_login_entry, missing: summary.missing_list }, null, 2));
