/**
 * ‏0050 — ההצטרפות שלא זיהתה מערכת החזירה סיבה, וכתבה אותה לשום מקום.
 *
 * ‏`public.more30_join_app` הוא מי שהופך "נרשמתי" ל"אני משתמש של המערכת הזו",
 * והוא נקרא בכל טעינת עמוד (auth-button.js:353) ובכל כניסה
 * (auth/callback.html:158). כשהזיהוי נכשל הוא החזיר `unknown_app` — וכתב לשום
 * מקום. כך #121 ו-#122 שרדו חודשיים: שום מונה לא זז ושום מסך לא השתנה.
 *
 * מ-0050 הענף הזה כותב שורה ל-`core.join_rejects`.
 *
 * מה שאפשר למדוד אנונימית, וזה מה שנבדק כאן:
 *
 *  1. **תנאי ההפעלה זהה לשער.** `more30_app_access` מריץ את אותה
 *     `core.app_key_normalize` בלי לכתוב שורת חברות, ולכן כל קלט שהוא מחזיר
 *     עליו null הוא בדיוק קלט שהיה נרשם ב-join_rejects. הרשימה מכסה את שלוש
 *     המשפחות: מארח זר, מארח שלנו עם נתיב שאינו מערכת, וקלט בלי מארח כלל.
 *  2. **הכיוון ההפוך.** מערכת חיה ממשיכה להיפתר, ולכן אינה נכתבת. שער שדוחה
 *     הכל היה "עובר" את הבדיקה הראשונה ומפיל את המוצר.
 *  3. **הכתיבה סגורה לאנונימי.** `more30_join_app` מחזיר 28000 בלי הזדהות,
 *     ולכן אי אפשר לנפח את הטבלה בלי חשבון.
 *  4. **הקריאה סגורה למי שאינו סופר-אדמין.** `more30_admin_join_rejects`
 *     מחזיר 42501.
 *
 * מה שהבדיקה הזאת **אינה** מודדת, ונמדד ידנית בשאילתה על המסד (התוצאה
 * ב-QA/platform/join-reject-trace-0809/_results.json): הכתיבה עצמה — הסרת
 * ה-userinfo, שמירת קטע הנתיב בלבד בלי ה-query string, ותקרת 200 המארחים.
 * לשלושתם דרוש session, ובדיקה אנונימית אינה יכולה להגיע לענף.
 *
 *   node scripts/qa/join-reject-leaves-a-trace.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SUPABASE_URL = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
// מפתח anon — ציבורי במכוון, אותו אחד ש-portal/public/login.html נושא.
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

const OUT = 'QA/platform/join-reject-trace-0809';

let pass = 0,
  fail = 0;
const results = [];
const ok = (n, c, d) => {
  results.push({ check: n, pass: !!c, detail: d ?? null });
  if (c) {
    pass++;
    console.log('  PASS  ' + n);
  } else {
    fail++;
    console.log('  FAIL  ' + n + (d ? `  << ${d}` : ''));
  }
};

async function rpc(name, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

const appKey = async (url) => (await rpc('more30_app_access', { p_app: url }))?.body?.app_key ?? null;

// שלוש המשפחות שהענף תופס. כל אחת חייבת להחזיר null — אחרת אין מה לרשום.
const RECORDED = [
  ['מארח זר', 'https://evil.com/bkalot'],
  ['תת-דומיין מזויף', 'https://more30.com.evil.com/bkalot'],
  ['userinfo לפני ה-@', 'https://more30.com@evil.com/bkalot'],
  ['המארח שלנו, נתיב שאינו מערכת', 'https://more30.com/no-such-system-at-all'],
  ['מפתח חשוף שאינו מערכת', 'totally-bogus-key'],
];

// הכיוון ההפוך: אלה חייבים להיפתר, ולכן לעולם אינם נרשמים.
const NOT_RECORDED = [
  ['מערכת חיה', 'https://more30.com/bkalot', 'bkalot'],
  ['הרכבה', 'https://nadlan-more30.vercel.app/nadlan/', 'nadlan'],
  ['הקיוסק על Railway', 'https://kioskfleet-production.up.railway.app/kiosk/', 'kiosk'],
  ['עמוד המסלולים', 'https://more30.com/system.html?app=torah', 'torah'],
  ['עמוד פורטל', 'https://more30.com/subscribe', 'more30'],
];

(async function () {
  console.log('\n‏#0050 — ההצטרפות שנשמטה משאירה עקבה\n');

  for (const [label, url] of RECORDED) {
    const k = await appKey(url);
    ok(`נרשם: ${label}`, k === null, k === null ? null : `החזיר ${k} במקום null`);
  }

  for (const [label, url, want] of NOT_RECORDED) {
    const k = await appKey(url);
    ok(`לא נרשם: ${label}`, k === want, k === want ? null : `החזיר ${k} במקום ${want}`);
  }

  const join = await rpc('more30_join_app', { p_app: 'https://evil.com/bkalot' });
  ok(
    'הכתיבה סגורה לאנונימי — more30_join_app דורש הזדהות',
    join.status >= 400 && /not authenticated/i.test(JSON.stringify(join.body ?? '')),
    `status=${join.status} body=${JSON.stringify(join.body)}`,
  );

  const read = await rpc('more30_admin_join_rejects', {});
  ok(
    'הקריאה סגורה למי שאינו סופר-אדמין',
    read.status >= 400 && /forbidden/i.test(JSON.stringify(read.body ?? '')),
    `status=${read.status} body=${JSON.stringify(read.body)}`,
  );

  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    path.join(OUT, '_anon-checks.json'),
    JSON.stringify({ at: new Date().toISOString(), pass, fail, results }, null, 2),
  );

  console.log(`\n  ${pass} passed · ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
