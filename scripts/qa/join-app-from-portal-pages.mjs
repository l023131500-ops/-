/**
 * §1 — מי שנרשם נכנס לתוך המוצר **כלקוח של המערכת**. מה שהופך "נרשמתי"
 * ל"אני משתמש של המערכת הזו" הוא שורה אחת ב-core.app_memberships, ומי שכותב
 * אותה הוא `more30_join_app` — ש-`portal/public/auth/callback.html` קורא לו
 * מיד אחרי כל כניסה (Google, הרשמה מיידית, סיסמה כאחד):
 *
 *     const app = returnTo() || document.referrer || 'more30';
 *     await sb.rpc('more30_join_app', { p_app: app });
 *
 * כלומר הקלט הוא **כתובת**, לא מפתח. `core.app_key_normalize` מתרגמת, וכש-
 * היא מחזירה null הפונקציה מחזירה `unknown_app` ו**אינה כותבת שורה** —
 * ו-callback.html בולע את זה בכוונה, כך שהחברות נשמטת בשקט.
 *
 * הבדיקה שואלת שאלה אחת: **האם יש כתובת שהפורטל באמת מגיש, שממנה הרשמה
 * אינה נרשמת לשום מקום?**
 *
 * שני צדדים בלתי-תלויים, ושניהם נגזרים ולא מוקלדים:
 *
 *  1. **רשימת הכתובות** — מ-`portal/vercel.dist.json` ומקבצי
 *     `portal/public/`. אלה בדיוק המסלולים שהייצור מגיש; רשימה מוקלדת ביד
 *     הייתה מתיישנת בדיוק כמו הרשימה שבתוך הפונקציה עצמה, וזה הבאג.
 *  2. **התשובה** — מהמסד החי, אנונימית, דרך `more30_app_access`. היא קוראת
 *     ל-`core.app_key_normalize` באותה שורה ראשונה שגם `more30_join_app`
 *     קורא לה, ולכן היא מודדת את אותה הכרעה בלי לכתוב שורת חברות.
 *
 * שים לב לכיוון השני: כתובת שאינה מערכת ואינה דף פורטל **חייבת** להמשיך
 * להחזיר null. זה השער שמונע כתיבת חברות לאתר זר, ולכן הוא נבדק במפורש.
 *
 *   node scripts/qa/join-app-from-portal-pages.mjs
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SUPABASE_URL = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
// מפתח anon — ציבורי במכוון, אותו אחד ש-portal/public/login.html נושא.
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

const OUT = 'QA/platform/join-app-portal-pages-0809';
const ROUTES = 'portal/vercel.dist.json';
const PUBLIC = 'portal/public';

let pass = 0, fail = 0;
const results = [];
const ok = (n, c, d) => {
  results.push({ check: n, pass: !!c, detail: d ?? null });
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

/** אותה שורה ראשונה שגם more30_join_app מריץ, בלי לכתוב חברות. */
async function appKey(url) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/more30_app_access`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'content-type': 'application/json' },
    body: JSON.stringify({ p_app: url }),
  });
  if (!r.ok) throw new Error(`more30_app_access ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json())?.app_key ?? null;
}

// ── 1. הכתובות שהפורטל מגיש, מהניתוב עצמו ────────────────────────────────
const routes = JSON.parse(readFileSync(ROUTES, 'utf8'));

// דף של הפורטל: rewrite שהיעד שלו הוא קובץ מקומי. ‏:path* אינו כתובת אמיתית.
const portalRoutes = routes.rewrites
  .filter((r) => r.destination.startsWith('/') && r.destination !== '/index.html')
  .map((r) => r.source)
  .filter((s) => !s.includes(':'));

// ‏/nihul → /admin וכו' — redirects הם גם כתובות שלקוח עומד בהן.
for (const r of routes.redirects ?? []) {
  if (!r.source.includes(':')) portalRoutes.push(r.source);
}

// וגם שם הקובץ עצמו: system.html אין לו rewrite כלל, הוא מוגש כמו שהוא —
// וזו הכתובת שכרטיס בדף הבית מקשר אליה מאז f04e71d.
for (const f of readdirSync(PUBLIC)) {
  if (f.endsWith('.html')) portalRoutes.push('/' + f);
}
portalRoutes.push('/', '/auth/callback.html');

// מערכת מורכבת: rewrite של /<שם> אל פריסה חיצונית.
const mounts = [
  ...new Set(
    routes.rewrites
      .filter((r) => /^https?:\/\//.test(r.destination))
      .map((r) => /^\/([a-z0-9_-]+)/i.exec(r.source)?.[1])
      .filter(Boolean),
  ),
].filter((m) => m !== 'admin' && m !== 'api'); // מרכז השליטה הוא הפורטל, לא מערכת

const seen = [...new Set(portalRoutes)].sort();
console.log('=== §1 · מאיזו כתובת הרשמה נרשמת לאף מערכת? ===\n');
console.log(`— ${seen.length} כתובות של הפורטל · ${mounts.length} הרכבות של מערכות —\n`);

// ── 2. התשובה מהמסד החי ──────────────────────────────────────────────────
const table = [];
const orphans = [];
for (const url of seen) {
  const key = await appKey(url);
  table.push({ url, app_key: key });
  if (key === null) orphans.push(url);
}
for (const row of table) console.log(`  ${row.url.padEnd(26)} → ${row.app_key ?? 'null'}`);
console.log('');

ok('אין אף כתובת של הפורטל שממנה הרשמה אינה נרשמת לשום מקום',
   orphans.length === 0,
   orphans.length ? `${orphans.length} יתומות: ${orphans.join(' · ')}` : null);

// ── 3. ההרכבות — /<שם> ו-/<שם>/ חייבות להצביע על אותה מערכת ─────────────
const mountRows = [];
for (const m of mounts) {
  const bare = await appKey('/' + m);
  const slash = await appKey('/' + m + '/');
  const deep = await appKey('/' + m + '/some/inner/page');
  const full = await appKey('https://more30.com/' + m);
  mountRows.push({ mount: m, bare, slash, deep, full });
}
const mountBad = mountRows.filter(
  (r) => !(r.bare === r.mount && r.slash === r.mount && r.deep === r.mount && r.full === r.mount),
);
for (const r of mountRows) {
  console.log(`  /${r.mount.padEnd(12)} bare=${r.bare} slash=${r.slash} deep=${r.deep} full=${r.full}`);
}
console.log('');
ok(`כל ${mounts.length} ההרכבות מזוהות בארבע צורות הכתובת`,
   mountBad.length === 0,
   mountBad.length ? JSON.stringify(mountBad) : null);

// ── 4. עמוד המסלולים — הכתובת שהכרטיס בדף הבית מוביל אליה ────────────────
// ‏SystemCard מצייר /system.html?app=<שם>. שם המערכת יושב שם **רק** ב-query,
// ולכן נורמליזציה שמוחקת את ה-query לפני שקראה אותו מאבדת אותו לגמרי.
const planRows = [];
for (const m of mounts) {
  planRows.push({
    mount: m,
    plans: await appKey(`/system.html?app=${m}`),
    subscribe: await appKey(`/subscribe?app=${m}&plan=basic`),
  });
}
const planBad = planRows.filter((r) => r.plans !== r.mount || r.subscribe !== r.mount);
console.log(`  /system.html?app=<שם>  →  ${planRows.filter((r) => r.plans === r.mount).length}/${mounts.length} מזוהות`);
console.log(`  /subscribe?app=<שם>    →  ${planRows.filter((r) => r.subscribe === r.mount).length}/${mounts.length} מזוהות\n`);
ok('כניסה מעמוד המסלולים נרשמת למערכת שהעמוד מציג, ולא לפלטפורמה',
   planBad.length === 0,
   planBad.length ? JSON.stringify(planBad) : null);

// ── 5. הכיוון ההפוך: השער שמונע כתיבת חברות לכתובת שאינה שלנו ───────────
const mustBeNull = ['/wat', '//evil.com', '/evil.example.com', '/notasystem', '/bkalot-x'];
const leaked = [];
for (const u of mustBeNull) {
  const k = await appKey(u);
  if (k !== null) leaked.push(`${u} → ${k}`);
}
ok('כתובת שאינה מערכת ואינה דף פורטל ממשיכה להחזיר null',
   leaked.length === 0,
   leaked.join(' · '));

// זו הטענה שבאמת מגינה, ולכן היא נמדדת ולא מונחת: כל ערך שיוצא מהנורמליזציה
// הוא path שרשום ב-core.projects, או 'more30'. אין דרך להמציא ממנה מפתח.
// ⚠️ בלי חתימות של WAF. נטפרי/Cloudflare חוסמות את גוף הבקשה על מחרוזות
// כמו 'javascript:' או '../../etc/passwd' ומחזירות 403 עם עמוד HTML —
// כלומר הבדיקה הייתה נופלת על החוסם ולא על המסד, ולא מודדת דבר.
const wild = ['https://evil.com/bkalot', 'ftp://x/y/torah', '?app=torah',
              'טקסט בעברית', '', '/BKALOT', '/bkalot#frag', '/torah?x=1&app='];
const wildRows = [];
for (const u of wild) wildRows.push({ input: u, app_key: await appKey(u) });
const known = new Set([...mounts, 'more30']);
const invented = wildRows.filter((r) => r.app_key !== null && !known.has(r.app_key));
ok('כל ערך שיוצא מהנורמליזציה הוא מערכת רשומה או more30 — אף פעם מפתח מומצא',
   invented.length === 0, JSON.stringify(invented));

// ‏#122, שנפתח כאן ונסגר ב-0049: עד אז הדומיין נחתך בלי להיבדק (התנהגות של
// 0015), ולכן `https://evil.com/bkalot` החזיר `bkalot` — referrer זר שרושם
// חברות במערכת קיימת. השורה נשארת כאן כגלאי רגרסיה; המדידה המלאה של השער,
// על עשר צורות ועל 25 מארחי ההרכבה, יושבת ב-
// scripts/qa/normalize-rejects-foreign-hosts.mjs.
const foreignHost = await appKey('https://evil.com/bkalot');
ok('מארח שאיננו מגישים ממנו אינו רושם חברות (#122)',
   foreignHost === null, `got=${foreignHost}`);

// ‏?app= לא הופך לדלת אחורית: ערך שאינו מערכת רשומה אינו מתקבל.
const bogus = await appKey('/system.html?app=notasystem');
ok('?app= עם ערך שאינו מערכת רשומה נופל חזרה לנתיב ואינו מומצא',
   bogus === 'more30', `got=${bogus}`);

mkdirSync(OUT, { recursive: true });
writeFileSync(
  path.join(OUT, '_results.json'),
  JSON.stringify(
    { measured_at: new Date().toISOString(), source: { routes: ROUTES, public: PUBLIC },
      portal_routes: table, mounts: mountRows, plans_page: planRows, wild: wildRows,
      foreign_host: { issue: 122, input: 'https://evil.com/bkalot', app_key: foreignHost,
                      note: 'נסגר ב-0049 — השער יושב ב-core.trusted_origins' },
      passed: pass, failed: fail, checks: results },
    null, 2,
  ),
  'utf8',
);

console.log(`\n${pass} passed · ${fail} failed   → ${OUT}/_results.json`);
process.exit(fail ? 1 : 0);
