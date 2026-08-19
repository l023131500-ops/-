// מריץ את חלוקת-הרשימות של /admin/issues כפי שהיא כתובה בקובץ שנשלח לייצור,
// מול שורות core.issues האמיתיות, ומוודא שהמונים שבאריחים והרשימות שמתחתיהם
// סופרים את אותו דבר. עד 07/08 הם לא: האריח קרא status in ('open','in_progress')
// והרשימה קראה status <> 'fixed', ולכן wont_fix נפל לתוך "אצלי".
//
// שימוש:  node scripts/qa/admin-issues-partition.mjs <payload.json>
// ה-payload הוא בדיוק מה ש-more30_admin_issues מחזיר ({totals, issues}).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const page = resolve(here, '../../portal/public/admin-issues.html');
const payloadPath = process.argv[2] || resolve(here, '../../QA/admin/issues-payload.json');

const src = readFileSync(page, 'utf8');
const data = JSON.parse(readFileSync(payloadPath, 'utf8'));

// חילוץ הבלוק מהקובץ עצמו — לא העתק שלו — כדי שהבדיקה תיפול אם הקובץ ישתנה.
const start = src.indexOf('const all = data.issues || [];');
const end = src.indexOf("$('user').innerHTML");
if (start < 0 || end < 0 || end < start) {
  console.error('לא נמצא בלוק החלוקה ב-admin-issues.html');
  process.exit(2);
}
const block = src.slice(start, end);

const { pending, declined, other, all } = new Function(
  'data',
  `${block}\nreturn { pending, declined, other, all };`,
)(data);

const t = data.totals || {};
const checks = [
  ['דורש אותך',            t.needs_user,  pending('user').length],
  ['פתוח או בטיפול אצלי',  t.mine,        pending('agent').length],
  ['תוקן',                 t.fixed,       all.filter((x) => x.status === 'fixed').length],
];

let bad = 0;
for (const [label, tile, list] of checks) {
  const ok = Number(tile) === list;
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: אריח=${tile} רשימה=${list}`);
}

// אף שורה לא נופלת בין הכיסאות: כל תקלה מצוירת בדיוק פעם אחת.
// בעלים שאינו user/agent אינו מצויר בשום רשימה — נספר בנפרד כדי שייראה.
const orphan = all.filter(
  (x) => ['open', 'in_progress'].includes(x.status) && !['user', 'agent'].includes(x.owner));
const drawn =
  pending('user').length + pending('agent').length +
  all.filter((x) => x.status === 'fixed').length +
  declined.length + other.length;
const coverOk = drawn === all.length && orphan.length === 0;
if (!coverOk) bad++;
console.log(`${coverOk ? 'PASS' : 'FAIL'}  כיסוי: מצוירות=${drawn} מתוך ${all.length}` +
  (orphan.length ? ` · ${orphan.length} בלי בעלים מוכר` : ''));
console.log(`        בטיפול=${t.in_progress} · אינו-ליקוי=${declined.length} · מצב-לא-מוכר=${other.length}`);

process.exit(bad ? 1 : 0);
