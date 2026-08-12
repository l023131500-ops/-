// notconfirmed-message-sweep — §1א: מה המסך באמת אומר כשהשרת מחזיר email_not_confirmed
//
// הצעד הקודם (QA/platform/autoconfirm-0812) מדד שתשע מערכות חיות דורשות אישור
// מייל: 01, 06, 12, 15, 17, 21, 24, 30, 31. כיבוי ההגדרה עצמה הוא של המשתמש
// (לוח הבקרה של Supabase, פר-פרויקט). מה שכן שלנו: **ההודעה שהמשתמש רואה**.
// §1א מתלונן מילה במילה על "נרשמתי ואז 'סיסמה שגויה'" — כלומר על ההודעה, לא
// על ההגדרה. אם המסך אומר "המייל עדיין לא אומת", הבאג כפי שהוא מתואר נעלם
// גם אם האישור נשאר דלוק.
//
// זה נמדד עד היום רק ב-01 (יש מיפוי עברי חי בייצור) וב-15. לשבע האחרות זה
// נרשם במפורש כ"לא נמדד". הסקריפט הזה מודד אותן.
//
// שיטה: קוראים את מה ש**הייצור מגיש** — ה-HTML, חבילות ה-JS שלו, וגם
// החבילות שהן טוענות דינמית (מסך הכניסה הוא כמעט תמיד chunk נפרד; זו בדיוק
// הסיבה שב-01 נרשם בטעות "אין הודעה בעברית" — היא ישבה ב-chunk אחר).
// לכל מערכת: האם יש ענף שמזהה email_not_confirmed, ואילו הודעות-שגיאה
// בעברית קיימות בחבילות.
//
// קריאה בלבד: GET בלבד על כתובות ציבוריות. אין הרשמה, אין התחברות, אין
// כתיבה לשום מסד. המערכות המוגנות אינן ברשימה.
//
// שימוש:  node scripts/qa/notconfirmed-message-sweep.mjs
// פלט:    QA/platform/notconfirmed-message-0812/_results.json

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'QA', 'platform', 'notconfirmed-message-0812');

// תשע המערכות שדורשות אישור מייל לפי QA/platform/autoconfirm-0812/_results.json.
// 01 ו-15 נכללות כבקרה — הן נמדדו בצעד הקודם, ואם הסקריפט לא ימצא בהן את מה
// שכבר ידוע עליהן, הסקריפט שגוי ולא המערכות.
const TARGETS = [
  { num: '01', slug: 'torah', url: 'https://more30.com/torah/', control: 'has Hebrew mapping (measured 12/08)' },
  { num: '06', slug: 'briut', url: 'https://more30.com/briut/' },
  { num: '12', slug: 'smel', url: 'https://more30.com/smel/' },
  { num: '15', slug: 'egod', url: 'https://more30.com/egod/', control: 'measured 12/08' },
  { num: '17', slug: 'chizukim', url: 'https://more30.com/chizukim/' },
  { num: '21', slug: 'mthbram', url: 'https://more30.com/mthbram/' },
  { num: '24', slug: 'galil', url: 'https://more30.com/galil/' },
  { num: '30', slug: 'crm', url: 'https://more30.com/crm/' },
  { num: '31', slug: 'gesher', url: 'https://more30.com/gesher/' },
];

// הענף שמזהה את השגיאה. supabase-js מחזיר code='email_not_confirmed'
// ו-message='Email not confirmed'; קוד לקוח בודק את אחד מהם.
const CONFIRM_MARKERS = [/email_not_confirmed/i, /Email not confirmed/i, /email.{0,3}confirm/i];

// מה שהמשתמש רואה כשאין ענף כזה: הודעה גורפת אחת לכל כישלון כניסה.
// אלה הניסוחים שנמצאו בפועל במערכות של המאגר.
const GENERIC_HE = [
  'אימייל או סיסמה שגויים',
  'שם משתמש או סיסמה',
  'סיסמה שגויה',
  'סיסמא שגויה',
  'פרטי ההתחברות שגויים',
  'פרטי התחברות שגויים',
  'האימייל או הסיסמה שגויים',
  'Invalid login credentials',
];

// ניסוח שאומר את האמת — קיומו הוא התיקון.
const TRUTHFUL_HE = ['לא אומת', 'לא אושר', 'אימות המייל', 'אשר את המייל', 'אישור המייל', 'לאמת את המייל'];

// האם למערכת יש בכלל מסך כניסה משלה. בלי זה השאלה "מה המסך אומר" ריקה:
// הלקוח נכנס דרך הווידג'ט המשותף של הפורטל, שיושב על פרויקט אחר.
// type:"password" הוא מה ש-React מייצר אחרי מיניפיקציה; type="password" הוא HTML.
const PASSWORD_FIELD = [/type:\s*["']password["']/, /type="password"/];

const seen = new Map();
async function get(url) {
  if (seen.has(url)) return seen.get(url);
  let out;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    out = { status: res.status, body: res.status === 200 ? await res.text() : '' };
  } catch (e) {
    out = { status: 0, body: '', error: e.message };
  }
  seen.set(url, out);
  return out;
}

// אוסף את כל קובצי ה-JS שהייצור מגיש למערכת אחת, כולל chunks שנטענים דינמית.
// שתי מלכודות שנדרסו כאן, שתיהן נמדדו ולא שוערו:
//   1. מסך הכניסה הוא chunk נפרד שלא מופיע ב-HTML כלל — לכן BFS ולא רק
//      <script src>.
//   2. תקרה קטנה מדי משקרת. הריצה הראשונה עצרה את 01 torah על 87 קבצים,
//      פספסה את authErrors-*.js, וקבעה "אין ענף" על מערכת שהענף שלה חי
//      בייצור. התקרה עלתה, וקבצים ששמם רומז על אימות נבדקים ראשונים.
const MAX_FILES = 400;
const CONCURRENCY = 8;
const AUTHY = /auth|login|sign|register|error/i;

async function servedBundles(target) {
  const page = await get(target.url);
  if (page.status !== 200) return { error: `page ${page.status}${page.error ? ` (${page.error})` : ''}`, files: [] };

  const files = [{ href: target.url, body: page.body, depth: 0 }];
  const queue = [...page.body.matchAll(/<script[^>]+src="([^"]+)"/g)]
    .map((m) => ({ href: new URL(m[1], target.url).href, depth: 1 }));
  const enqueued = new Set(queue.map((q) => q.href));

  while (queue.length && files.length < MAX_FILES) {
    // קבצים שנראים כמו אימות קודמים — כדי שתקרה, אם תיפגע, תיפגע בשוליים.
    queue.sort((a, b) => Number(AUTHY.test(b.href)) - Number(AUTHY.test(a.href)));
    const batch = queue.splice(0, CONCURRENCY);
    const fetched = await Promise.all(batch.map(async (q) => ({ ...q, r: await get(q.href) })));
    for (const { href, depth, r } of fetched) {
      if (r.status !== 200) continue;
      files.push({ href, body: r.body, depth });
      if (depth >= 3) continue;
      // הפניות ל-chunks בתוך החבילה: "./Login-abc.js" או "/slug/assets/Login-abc.js"
      for (const m of r.body.matchAll(/["'`](\.{0,2}\/[\w./-]*assets\/[\w.-]+\.js|\.\/[\w.-]+\.js)["'`]/g)) {
        let abs;
        try {
          abs = new URL(m[1], href).href;
        } catch {
          continue;
        }
        if (enqueued.has(abs) || enqueued.size > MAX_FILES * 3) continue;
        enqueued.add(abs);
        queue.push({ href: abs, depth: depth + 1 });
      }
    }
  }
  return { files, discovered: enqueued.size, truncated: queue.length > 0 };
}

function contextAround(body, index, span = 220) {
  return body.slice(Math.max(0, index - span), index + span).replace(/\s+/g, ' ');
}

const results = [];
for (const t of TARGETS) {
  const row = { number: t.num, slug: t.slug, live_url: t.url, control: t.control ?? null };
  const { files, error, discovered, truncated } = await servedBundles(t);
  if (error) {
    row.verdict = `not-measurable (${error})`;
    results.push(row);
    console.log(`${t.num} ${t.slug}: ${row.verdict}`);
    continue;
  }
  row.files_read = files.length;
  row.files_discovered = discovered;
  row.crawl_truncated = truncated;

  const confirmHits = [];
  const genericHits = [];
  const truthfulHits = [];
  const passwordFields = [];
  for (const f of files) {
    const short = f.href.replace('https://more30.com', '');
    if (PASSWORD_FIELD.some((re) => re.test(f.body)) && !passwordFields.includes(short)) passwordFields.push(short);
    for (const re of CONFIRM_MARKERS) {
      const m = f.body.match(re);
      if (m && !confirmHits.some((h) => h.file === short && h.pattern === re.source)) {
        confirmHits.push({ file: short, pattern: re.source, context: contextAround(f.body, m.index) });
      }
    }
    for (const s of GENERIC_HE) {
      const i = f.body.indexOf(s);
      if (i !== -1) genericHits.push({ file: short, phrase: s, context: contextAround(f.body, i, 160) });
    }
    for (const s of TRUTHFUL_HE) {
      const i = f.body.indexOf(s);
      if (i !== -1) truthfulHits.push({ file: short, phrase: s, context: contextAround(f.body, i, 160) });
    }
  }
  row.confirmation_branch = confirmHits;
  row.generic_failure_messages = genericHits;
  row.truthful_messages = truthfulHits;
  row.password_fields_in_bundles = passwordFields;

  // המסקנה. מה שנמדד כאן הוא מה שהחבילה **מכילה**, לא מה שהיא מציגה בריצה —
  // זה מספיק כדי להפריד "אין ענף בכלל" מ"יש ענף", ולא יותר מזה.
  if (truthfulHits.length && confirmHits.length) {
    row.verdict = 'OK — recognises email_not_confirmed and says so in Hebrew';
  } else if (confirmHits.length) {
    row.verdict = 'partial — recognises the error, no Hebrew wording found in the served bundles';
  } else if (genericHits.length) {
    row.verdict = 'generic-only login failure message — check whether that screen is Supabase Auth at all';
  } else if (!passwordFields.length) {
    row.verdict = 'no login form of its own — the customer enters through the shared portal widget';
  } else {
    row.verdict = 'has a password field, no login-error strings — screen not reached by this crawl';
  }
  results.push(row);
  console.log(`${t.num} ${t.slug}: ${files.length} files — ${row.verdict}`);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, '_results.json'),
  JSON.stringify({ at: new Date().toISOString(), targets: TARGETS.length, results }, null, 2),
  'utf8',
);
console.log(`\nwrote ${join(OUT, '_results.json')}`);
