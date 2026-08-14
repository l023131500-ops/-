// 0078 — האם הקובץ הוא הפונקציה החיה בתוספת השורות החדשות, או גרסה מקבילה?
// אותה בדיקה כמו ב-0077: מפרקים את גוף הפונקציה מהקובץ, מסירים את התוספות,
// ומשווים md5 לגוף החי. אם הקובץ נכתב מעל עץ ישן — ה-md5 לא יתאים, ו-create or
// replace היה מחזיר אחורה שדות קיימים בלי ששום דבר ידווח שגיאה.
//
// שני כללי ההסרה הם ASCII בלבד בכוונה: הגוף החי אינו מכיל ולו שורת הערה אחת,
// ולכן כל שורה שמתחילה ב-`--` היא תוספת; וכל התוספות האחרות נושאות `decided_`.
// (בונים כך ולא לפי טקסט עברי — .ps1 בלי BOM נקרא כ-cp1255 והתבנית נהרסת.)
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const LIVE_MD5 = '284e0cbcedb8f59229fb488e56af6545';
const LIVE_LEN = 3654;

const md5 = (s) => createHash('md5').update(s, 'utf8').digest('hex');
const file = readFileSync(process.argv[2], 'utf8');

const open = 'as $function$';
const close = '$function$;';
const body = file.slice(file.indexOf(open) + open.length, file.indexOf(close));

const lines = body.split('\n');
const kept = lines.filter(
  (l) => !l.trim().startsWith('--') && !l.includes('decided_')
);
const stripped = kept.join('\n');

const added = lines.length - kept.length;
console.log('body_len_with_additions =', body.length);
console.log('body_md5_with_additions =', md5(body));
// (נמדד דרך קובץ ולא דרך node -e: ב-PowerShell מחרוזת במרכאות כפולות מרחיבה
//  את $function$ ומחזירה מפריד אחר, כלומר מודדת קטע אחר של הקובץ.)
console.log('lines_removed           =', added, '(expected 9)');
console.log('stripped_len            =', stripped.length, '| live', LIVE_LEN);
console.log('stripped_md5            =', md5(stripped));
console.log('live_md5                =', LIVE_MD5);
console.log(
  'IDENTICAL_TO_LIVE       =',
  md5(stripped) === LIVE_MD5 && stripped.length === LIVE_LEN
);

// הפוך: השדות באמת נמצאים בקובץ, ופעם אחת כל אחד.
for (const m of ["'decided_by',", "'decided_at',", "'decided_by_name',", 'admin_users au']) {
  const n = body.split(m).length - 1;
  console.log(`present ${JSON.stringify(m)} = ${n}`);
}
// ברירת המחדל בחתימה נשמרה (הכרעה (6)).
console.log("signature_keeps_default =", file.includes("p jsonb default '{}'::jsonb"));
// שאילתת ה-count לא קיבלה JOIN (הכרעה (3)).
const countQ = body.slice(body.indexOf('select count(*)'), body.indexOf('select coalesce('));
console.log('count_query_has_admin_join =', countQ.includes('admin_users'));
