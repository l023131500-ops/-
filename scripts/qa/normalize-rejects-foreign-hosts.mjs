/**
 * ‏#122 — הנורמליזציה חתכה את הדומיין בלי לשאול של מי הוא.
 *
 * ‏`core.app_key_normalize` מקבלת **כתובת**, לא מפתח, ושני הקוראים בייצור
 * שולחים לה כתובת שהדפדפן נתן:
 *
 *     portal/public/auth-button.js:353   more30_join_app({ p_app: location.href })
 *     portal/public/auth/callback.html:158
 *         more30_join_app({ p_app: returnTo() || document.referrer || 'more30' })
 *
 * עד 0049 השורה הראשונה מחקה את הפרוטוקול ואת הדומיין בלי לבדוק אותם, ולכן
 * `https://evil.com/bkalot` החזיר `bkalot` — כלומר referrer מאתר זר יכול היה
 * לרשום שורת חברות במערכת אמיתית.
 *
 * הבדיקה מודדת את שני הכיוונים, ושניהם חייבים להחזיק יחד — כי שער שדוחה הכל
 * "עובר" את מבחן האבטחה ומפיל את המוצר:
 *
 *  1. **נדחה** — מארח שאיננו מגישים ממנו מחזיר null, ובכלל זה הצורות שנראות
 *     כמו שלנו: תת-דומיין מזויף, סיומת אחרת, ו-userinfo שמכניס את more30.com
 *     לפני ה-‎@‎.
 *  2. **מתקבל** — כל מארח שהניתוב באמת מפנה אליו ממשיך לענות בדיוק כמו
 *     הכתובת הקנונית. הרשימה נגזרת מ-`portal/vercel.dist.json` בכל ריצה ולא
 *     מוקלדת: הרכבה שתיווסף לניתוב ולא ל-`core.trusted_origins` תיתפס כאן.
 *
 * התשובה מגיעה מהמסד החי, אנונימית, דרך `more30_app_access` — אותה שורה
 * ראשונה שגם `more30_join_app` מריץ, בלי לכתוב שורת חברות.
 *
 *   node scripts/qa/normalize-rejects-foreign-hosts.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SUPABASE_URL = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
// מפתח anon — ציבורי במכוון, אותו אחד ש-portal/public/login.html נושא.
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

const OUT = 'QA/platform/foreign-host-gate-0809';
const ROUTES = 'portal/vercel.dist.json';

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

async function appKey(url) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/more30_app_access`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'content-type': 'application/json' },
    body: JSON.stringify({ p_app: url }),
  });
  if (!r.ok) throw new Error(`more30_app_access ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json())?.app_key ?? null;
}

console.log('=== #122 · מארח זר אינו רושם חברות, ומארח שלנו ממשיך לרשום ===\n');

// ── 1. נדחה ───────────────────────────────────────────────────────────────
// כל אחת מהצורות האלה נראית כמו שלנו בקריאה מהירה, ואף אחת אינה שלנו.
// ‏`/bkalot` נבחר בכוונה: הוא path רשום, ולכן זו הכתובת שהחור באמת פתח.
const foreign = [
  { url: 'https://evil.com/bkalot', why: 'הממצא של #122 כלשונו' },
  { url: 'http://evil.com/bkalot', why: 'גם בלי TLS' },
  { url: 'https://more30.com.evil.com/bkalot', why: 'הדומיין שלנו כתחילית של דומיין זר' },
  { url: 'https://evil-more30.vercel.app/bkalot', why: 'שם פרויקט שאיננו מכירים במרחב vercel.app' },
  { url: 'https://more30.co/bkalot', why: 'סיומת אחרת' },
  { url: 'https://notmore30.com/bkalot', why: 'הדומיין שלנו כסיומת של דומיין זר' },
  { url: 'https://more30.com@evil.com/bkalot', why: 'userinfo — המארח האמיתי הוא מה שאחרי ה-@' },
  { url: '//evil.com/bkalot', why: 'כתובת ללא פרוטוקול' },
  { url: 'https://evil.com?x=/bkalot', why: 'הדומיין מוברח כחלק מה-query' },
  { url: 'https://evil.com/system.html?app=nadlan', why: 'הדלת של 0048 אינה עוקפת את השער' },
];
const leaked = [];
for (const f of foreign) {
  f.app_key = await appKey(f.url);
  console.log(`  ${(f.app_key === null ? 'null  ' : f.app_key.padEnd(6))} ← ${f.url}`);
  if (f.app_key !== null) leaked.push(`${f.url} → ${f.app_key}`);
}
console.log('');
ok(`${foreign.length} כתובות ממארח שאיננו מגישים ממנו — כולן null`, leaked.length === 0, leaked.join(' · '));

// ── 2. מתקבל — הרכבות, מהניתוב עצמו ──────────────────────────────────────
// לכל rewrite שיעדו חיצוני: הכתובת שהדפדפן מציג כשגולשים ישירות להרכבה
// (`location.href` ש-auth-button.js שולח) חייבת לענות בדיוק כמו הכתובת
// הקנונית תחת more30.com. ההשוואה היא בין שתי תשובות מהמסד — לא מול ערך
// מוקלד — ולכן היא נשארת נכונה גם כשההרכבות משתנות.
const routes = JSON.parse(readFileSync(ROUTES, 'utf8'));
const external = routes.rewrites.filter((r) => /^https?:\/\//.test(r.destination));
const byHost = new Map();
for (const r of external) {
  const host = new URL(r.destination).host;
  if (!byHost.has(host)) byHost.set(host, r); // ההרכבה הראשונה של אותו מארח מספיקה
}
const hostRows = [];
for (const [host, r] of byHost) {
  const canonical = 'https://more30.com' + r.source.replace('/:path*', '/x');
  const direct = r.destination.replace('/:path*', '/x');
  const expected = await appKey(canonical);
  const got = await appKey(direct);
  hostRows.push({ host, canonical, direct, expected, got, same: expected === got });
}
for (const h of hostRows) {
  console.log(`  ${h.same ? 'ok  ' : 'BAD '} ${h.host.padEnd(38)} ${h.got ?? 'null'} (קנוני: ${h.expected ?? 'null'})`);
}
console.log('');
const hostBad = hostRows.filter((h) => !h.same);
ok(`${byHost.size} מארחי ההרכבה שהניתוב מפנה אליהם עונים כמו הכתובת הקנונית`,
   hostBad.length === 0,
   hostBad.length ? JSON.stringify(hostBad) : null);

// אף אחד מהם לא נענה ב-null — שער שדוחה הכל היה עובר את הטענה שמעליה.
const nulls = hostRows.filter((h) => h.got === null);
ok('אף מארח הרכבה אינו נדחה', nulls.length === 0, nulls.map((h) => h.host).join(' · '));

// ── 3. מתקבל — הקנוני והפיתוח ────────────────────────────────────────────
const allowed = [
  { url: 'https://more30.com/bkalot', expect: 'bkalot' },
  { url: 'https://www.more30.com/bkalot', expect: 'bkalot' },
  { url: 'https://more30.com/', expect: 'more30' },
  { url: 'https://more30.com/system.html?app=nadlan', expect: 'nadlan' },
  { url: 'https://evil.com@more30.com/bkalot', expect: 'bkalot' }, // המארח כאן באמת שלנו
  { url: 'http://localhost:5173/nadlan/', expect: 'nadlan' },
  { url: 'http://127.0.0.1:3000/torah', expect: 'torah' },
  { url: '/bkalot', expect: 'bkalot' }, // נתיב יחסי — אין מארח, אין מה לבדוק
  { url: 'more30', expect: 'more30' },
];
const wrong = [];
for (const a of allowed) {
  a.app_key = await appKey(a.url);
  if (a.app_key !== a.expect) wrong.push(`${a.url} → ${a.app_key} (ציפינו ${a.expect})`);
}
ok(`${allowed.length} כתובות מהמקור הקנוני ומפיתוח מקומי ממשיכות להיענות`,
   wrong.length === 0, wrong.join(' · '));

mkdirSync(OUT, { recursive: true });
writeFileSync(
  path.join(OUT, '_results.json'),
  JSON.stringify(
    {
      measured_at: new Date().toISOString(),
      issue: 122,
      source: { routes: ROUTES },
      rejected: foreign,
      assembly_hosts: hostRows,
      allowed,
      passed: pass,
      failed: fail,
      checks: results,
    },
    null,
    2,
  ),
  'utf8',
);

console.log(`\n${pass} passed · ${fail} failed   → ${OUT}/_results.json`);
process.exit(fail ? 1 : 0);
