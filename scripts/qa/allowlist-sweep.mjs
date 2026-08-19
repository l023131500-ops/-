// allowlist-sweep — קורא את uri_allow_list של כל פרויקט Supabase חי, בלי דשבורד ובלי מפתח.
//
// למה זה קיים. ארבע פעימות רצופות פתחו כל אחת כרטיס «uri_allow_list של פרויקט X
// אינו מכיל את more30.com» — #202 (30 crm), #205 (31 גשר), #206 (22 זכויות),
// #207 (21 מתחברים) — כל אחד owner=user, כל אחד אותה פעולה בדיוק בדשבורד אחר.
// כל אחד מהם נמדד בנפרד, פרויקט אחד לפעימה. הסקריפט הזה מודד את **כולם** בבת אחת,
// כדי שהרשימה שמגיעה למשתמש תהיה שלמה ולא תגיע בטפטוף.
//
// השיטה, ומה שהופך אותה למדידה ולא לניחוש:
//   GET {url}/auth/v1/verify?token=<לא-תקף>&type=recovery&redirect_to=<מועמד>
// מחזיר 303, ו-Location שלו נקבע לפי הכרעת ה-redirect: אם המועמד ברשימת ההרשאות,
// GoTrue חוזר אליו עם שגיאת otp_expired בהאש; אם לא — הוא נופל ל-Site URL.
// כלומר Location עצמו הוא התשובה. **אין צורך ב-apikey ואין צורך ב-Authorization**
// (נמדד: הקריאה עונה 303 בלי שום כותרת), ולכן זה עובד גם על חמשת הפרויקטים
// שה-SUPABASE_ACCESS_TOKEN אינו מכסה ושהחזירו 403 על /v1/projects/{ref}/config/auth.
//
// שתי בקרות, ובלעדיהן המדידה חסרת משמעות:
//   שלילית — https://example.com/_probe: חייב להיות מוחלף. אם הוא **כן** מוחזר,
//            הרשימה פתוחה לכל דומיין והמדידה כולה אינה אומרת דבר.
//   חיובית — ה-Site URL עצמו: חייב לחזור כפי שהוא. אם גם הוא מוחלף, הנקודה
//            הזאת אינה מבחינה בין מותר לאסור וצריך לפסול את הפרויקט מהדוח.
//
// שלוש שאלות נפרדות נשאלות לכל מערכת, וזה מה שהסקריפט מוסיף מעבר לארבעת הכרטיסים:
//   1. האם הנתיב המדויק שהמייל שולח אליו מורשה (למשל /crm/reset-password)
//   2. האם /mount/ מורשה (כלומר יש כלל ** על התיקייה)
//   3. האם https://more30.com/ מורשה בכלל (כלומר הדומיין קיים ברשימה)
// ההבדל בין 1 ל-3 הוא ההבדל בין «להוסיף שורה» ל«הדומיין אינו שם» — שתי הנחיות
// שונות למשתמש, ועד היום הן לא הופרדו.
//
// קריאה בלבד: GET על נקודת קצה ציבורית עם טוקן לא-תקף. לא נוצר משתמש, לא נשלח
// מייל, לא נכתבת שורה, לא משתנה שום הגדרה. מערכות מוגנות (08, 09, zr_*, NEDARIM3873)
// אינן ברשימה כלל.
//
// שימוש:  node scripts/qa/allowlist-sweep.mjs [תיקיית-פלט]
// פלט:    QA/platform/allowlist-sweep-0813/_results.json — או הנתיב שנמסר בארגומנט.
//
// ⚠️ הארגומנט נוסף כדי שהרצה חוזרת לא תדרוס את המדידה של 13/08. הסקריפט הזה
// נכתב כדי שיריצו אותו שוב ושוב (השורה הופכת ל-✅ ברגע שהמשתמש משנה את ההגדרה),
// אבל הוא כתב לנתיב קבוע — כלומר כל בדיקה חוזרת מחקה את הבסיס שאליו משווים.
// בלי ברירת המחדל אין תאימות לאחור, ולכן היא נשמרה כפי שהייתה.

import { writeFileSync, mkdirSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

const ARG = process.argv[2];
const OUT = ARG
  ? (isAbsolute(ARG) ? ARG : join(process.cwd(), ARG))
  : join(process.cwd(), 'QA', 'platform', 'allowlist-sweep-0813');

// הרפים ציבוריים (הם חלק מכתובת ה-API שכל דפדפן רואה) ולכן אין כאן שום סוד.
// reset = הנתיב שהקישור במייל אמור לנחות עליו, כפי שנבנה בפועל בקומיטים
// ad74652 (פורטל) · 4b7627e (16) · 6679a31 (30) · e3c970f (01) · 44dcf35 (31)
// · e80acec (22) · 978684e (21).
const PROJECTS = [
  {
    ref: 'uhnrgujbdxhhmoxcjria',
    label: 'ההאב — הפורטל ו-16 מערכות (כולל 16 חצור)',
    systems: '00 פורטל · 16 chatzor · +14',
    reset: 'https://more30.com/auth/reset',
    mount: 'https://more30.com/',
  },
  {
    ref: 'bieebmnmkffwbqlsfozh',
    label: '01 איגוד השיעורים',
    systems: '01 torah',
    reset: 'https://more30.com/torah/auth/reset',
    mount: 'https://more30.com/torah/',
  },
  {
    ref: 'csjekrvukbdznetsrodj',
    label: '06 בריאות · 12 סמל · 17 חיזוקים',
    systems: '06 briut · 12 smel · 17 chizukim',
    reset: 'https://more30.com/briut/',
    mount: 'https://more30.com/briut/',
  },
  {
    ref: 'hkkkynyoigzlttpynoeo',
    label: '15 עגוד',
    systems: '15 egod',
    reset: 'https://more30.com/egod/auth/reset',
    mount: 'https://more30.com/egod/',
  },
  {
    ref: 'aypsqqvfohekxxuqsmrw',
    label: '21 מתחברים',
    systems: '21 mthbram',
    reset: 'https://more30.com/mthbram/auth/reset',
    mount: 'https://more30.com/mthbram/',
    issue: 207,
  },
  {
    ref: 'trerolyveytzgksawrme',
    label: '22 מימוש זכויות',
    systems: '22 zchuyot',
    reset: 'https://more30.com/zchuyot/auth/reset',
    mount: 'https://more30.com/zchuyot/',
    issue: 206,
  },
  {
    ref: 'mwljkonwdeuaahsigjdp',
    label: '24 גליל קונקט',
    systems: '24 galil',
    reset: 'https://more30.com/galil/',
    mount: 'https://more30.com/galil/',
  },
  {
    ref: 'jhbeelzvjvhnkxldqvxx',
    label: '30 CRM זכויות',
    systems: '30 crm',
    reset: 'https://more30.com/crm/reset-password',
    mount: 'https://more30.com/crm/',
    issue: 202,
  },
  {
    ref: 'ygaqqnuyfnumezxxmtbh',
    label: '31 גשר',
    systems: '31 gesher',
    reset: 'https://more30.com/gesher/reset-password',
    mount: 'https://more30.com/gesher/',
    issue: 205,
  },
];

const NEGATIVE = 'https://example.com/_probe';
const ROOT = 'https://more30.com/';

// GET עם טוקן לא-תקף. מחזיר את ה-Location של ה-303 (או null אם לא היה כזה).
async function probe(ref, redirectTo) {
  const u =
    `https://${ref}.supabase.co/auth/v1/verify` +
    `?token=invalid-probe-token&type=recovery&redirect_to=${encodeURIComponent(redirectTo)}`;
  let res;
  try {
    res = await fetch(u, { redirect: 'manual' });
  } catch (e) {
    return { status: null, location: null, error: String(e) };
  }
  return {
    status: res.status,
    location: res.headers.get('location'),
  };
}

// GoTrue מחזיר את היעד עם השגיאה בהאש. מסירים אותה כדי להשוות כתובות.
function bare(loc) {
  if (!loc) return null;
  return loc.split('#')[0].split('?')[0];
}

// "האם היעד הוחזר כפי שהוא" — כלומר האם הוא ברשימת ההרשאות.
function echoed(loc, target) {
  const b = bare(loc);
  if (!b) return false;
  // GoTrue משמיט לעיתים / סופי; משווים בלי הבדל בו.
  const norm = (s) => s.replace(/\/+$/, '');
  return norm(b) === norm(target);
}

const results = [];

for (const p of PROJECTS) {
  const row = { ...p, probes: {} };

  // בקרה שלילית תחילה — אם היא נכשלת, שאר המדידה על הפרויקט הזה חסרת משמעות.
  const neg = await probe(p.ref, NEGATIVE);
  row.probes.negative_control = neg;
  row.site_url = bare(neg.location); // ה-Location של יעד לא-מורשה הוא ה-Site URL
  row.negative_control_ok = neg.status === 303 && !echoed(neg.location, NEGATIVE);

  // בקרה חיובית — ה-Site URL עצמו חייב לחזור כפי שהוא.
  let pos = null;
  if (row.site_url) {
    pos = await probe(p.ref, row.site_url);
    row.probes.positive_control = pos;
  }
  row.positive_control_ok = !!(pos && pos.status === 303 && echoed(pos.location, row.site_url));

  // שלוש השאלות.
  const reset = await probe(p.ref, p.reset);
  const mount = await probe(p.ref, p.mount);
  const root = await probe(p.ref, ROOT);
  row.probes.reset = reset;
  row.probes.mount = mount;
  row.probes.root = root;

  row.reset_allowed = echoed(reset.location, p.reset);
  row.mount_allowed = echoed(mount.location, p.mount);
  row.root_allowed = echoed(root.location, ROOT);

  row.measurement_valid = row.negative_control_ok && row.positive_control_ok;
  row.verdict = !row.measurement_valid
    ? 'לא נמדד — בקרה נכשלה'
    : row.reset_allowed
      ? 'תקין — הקישור מהמייל ינחת על more30.com'
      : row.root_allowed || row.mount_allowed
        ? 'חלקי — הדומיין ברשימה אבל הנתיב המדויק אינו'
        : 'חסר — more30.com אינו ברשימה כלל';

  results.push(row);
  console.log(
    `${p.ref}  ${p.systems.padEnd(28)}  site_url=${row.site_url}  ` +
      `reset=${row.reset_allowed}  mount=${row.mount_allowed}  root=${row.root_allowed}  ` +
      `[${row.verdict}]`,
  );
}

mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, '_results.json'),
  JSON.stringify(
    {
      measured_at: new Date().toISOString(),
      method:
        'GET /auth/v1/verify עם טוקן לא-תקף, redirect: manual. הכרעת ה-redirect של GoTrue ' +
        'חושפת אם היעד ברשימת ההרשאות. בלי apikey, בלי Authorization, בלי כתיבה.',
      negative_control: NEGATIVE,
      projects: results,
    },
    null,
    2,
  ),
  'utf8',
);
console.log(`\n→ ${join(OUT, '_results.json')}`);
