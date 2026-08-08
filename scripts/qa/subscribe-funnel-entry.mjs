/**
 * §8 — "מוכן להכנסה". מאיזה עמוד באתר מגיעים אל בחירת המסלול?
 *
 * `core.plans` מלא, `/subscribe` בנוי, `system.html` מצייר את כרטיסי המסלול —
 * וכל זה לא שווה כלום אם אין קישור אחד שמוביל לשם. הבדיקה הזו שואלת את השאלה
 * הזו בלבד, ומודדת אותה משני צדדים בלתי-תלויים:
 *
 *  1. **גרף הקישורים**, על עץ הקבצים כולו (כולל untracked — מקורות של אפליקציות
 *     נמצאים ב-.gitignore, ו-`git grep` מחזיר עליהם "אין התאמות" גם כשיש).
 *     מי מפנה אל `/subscribe`, ומי מפנה אל `system.html`.
 *  2. **הייצור**, אנונימית. האם שני העמודים בכלל מוגשים תחת more30.com, או
 *     שהם נופלים ל-catch-all של הפורטל ומחזירים את דף הבית עם 200.
 *
 * למה שני הצדדים: עמוד שאין אליו קישור ועמוד שאינו מוגש נראים אותו דבר ללקוח,
 * והתיקון שלהם הפוך לגמרי. השאלה "מה חסר" נענית רק כששניהם נמדדו.
 *
 * הרקע לניתוב: `portal/vercel.dist.json` מרכיב את `/<שם>` על הפריסה של המערכת
 * עצמה, ולכן `system.html` — שנכתב להיות מוגש דווקא שם (הוא גוזר את מזהה
 * המערכת מ-`location.pathname`, שורה 190, ומכריז canonical על
 * `more30.com/<שם>`) — אינו מקבל אף כתובת נקייה. `/subscribe` כן מקבל rewrite,
 * אבל הקישור היחיד אליו בכל הריפו יושב בתוך `system.html` עצמו.
 *
 * זהו בדיוק החצי שאינו הכרעת מוצר ב-`core.issues #92`: מה כולל כל מסלול — זו
 * הכרעה שלך; שאין דרך להגיע אל המסלולים בכלל — זה באג.
 *
 *   node scripts/qa/subscribe-funnel-entry.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const HOME = 'https://more30.com';
const ROOT = process.cwd();

// עצי מקור בלבד. QA/ ו-docs נושאים את שמות העמודים בתוך דוחות, וספירה שלהם
// כ"קישור" הייתה הופכת את הבדיקה הזו לירוקה בזכות התיעוד של עצמה.
const ROOTS = ['portal', 'apps', 'sites', 'packages'];
const SKIP = /(^|[\\/])(node_modules|\.git|dist|build|\.next|\.nuxt|\.output|\.vercel|coverage)([\\/]|$)/;
const TEXT = /\.(ts|tsx|js|jsx|mjs|cjs|html|htm|json|vue|svelte|astro)$/i;

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e);
    if (SKIP.test(full)) continue;
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) yield* walk(full);
    else if (TEXT.test(full)) yield full;
  }
}

// קישור, ולא אזכור: href/src/action, ניווט ב-JS, או מחרוזת נתיב מפורשת.
//
// ⚠️ החלופה השלישית דורשת את הלוכסן. בלעדיו היא תפסה את המחרוזת `subscribe`
// ברשימת PORTAL_PATHS ב-App.tsx (שם היא שם של נתיב, לא קישור אליו) ואת
// `.subscribe(` בחבילות מוקטנות — ושתיהן היו צובעות את הבדיקה ירוק לשווא.
const LINK = (target) =>
  new RegExp(
    `(?:href|src|action)\\s*=\\s*["'\`][^"'\`]*${target}` +
      `|(?:location\\.(?:href|assign|replace)|window\\.open|router\\.(?:push|replace))\\s*[=(]\\s*[\`"'][^"'\`]*${target}` +
      `|[\`"']\\/${target}`,
    'i',
  );

const TARGETS = [
  { name: '/subscribe', re: LINK('subscribe(?:\\.html)?[?"\'`]'), self: /portal[\\/]public[\\/]subscribe\.html$/ },
  { name: 'system.html', re: LINK('system\\.html'), self: /portal[\\/]public[\\/]system\.html$/ },
];

const files = [];
for (const r of ROOTS) for (const f of walk(path.join(ROOT, r))) files.push(f);

console.log('=== §8 · יש דרך להגיע אל בחירת המסלול? ===\n');
console.log(`— גרף הקישורים · ${files.length} קבצי מקור (כולל untracked) —\n`);

const referrers = new Map(TARGETS.map((t) => [t.name, []]));
for (const f of files) {
  let text;
  try { text = readFileSync(f, 'utf8'); } catch { continue; }
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  for (const t of TARGETS) {
    if (t.self.test(f)) continue; // עמוד שמקשר לעצמו אינו כניסה אליו
    const line = text.split(/\r?\n/).findIndex((l) => t.re.test(l));
    if (line >= 0) referrers.get(t.name).push(`${rel}:${line + 1}`);
  }
}

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

for (const t of TARGETS) {
  const r = referrers.get(t.name);
  console.log(`  ${t.name} — ${r.length} מפנים${r.length ? ': ' + r.join(' · ') : ''}`);
}
console.log('');

// ⚠️ "יש מפנה" אינו מספיק. `vercel.dist.json` הוא קובץ ניתוב ולא עמוד, ולכן
// מפנה שיושב בו אינו דלת. וגם מפנה שיושב ב-`system.html` נחשב רק אם מגיעים אל
// `system.html` עצמו — זו הסיבה שהבדיקה הזו נכשלה עד עכשיו. לכן הגעה נמדדת
// בשני צעדים: כרטיס בדף הבית → עמוד המסלולים → /subscribe.
const systemPageLinked = referrers.get('system.html').length > 0;
const reachable = referrers
  .get('/subscribe')
  .filter((r) => !/\.json:/.test(r))
  .filter((r) => systemPageLinked || !/^portal\/public\/system\.html:/.test(r));
console.log(`  מתוכם ניתנים להגעה על ידי לקוח: ${reachable.length ? reachable.join(' · ') : 'אף אחד'}`);
if (systemPageLinked) {
  console.log(`  (system.html נחשב נגיש — מפנים אליו: ${referrers.get('system.html').join(' · ')})`);
}
console.log('');

ok('קיים עמוד שלקוח יכול להגיע אליו ומקשר אל /subscribe', reachable.length > 0,
   'המפנים היחידים הם קובץ ניתוב ועמוד שאין אליו קישור — אין דרך ללקוח להגיע לבחירת מסלול');
ok('קיים עמוד אחד לפחות שמקשר אל system.html', systemPageLinked,
   'עמוד המסלולים של כל מערכת יתום — אין אליו קישור');

// ── הייצור: האם העמודים בכלל מוגשים
console.log('\n— הייצור, אנונימית —\n');
async function get(url) {
  const r = await fetch(url, { redirect: 'follow' });
  const text = await r.text();
  return { status: r.status, text, len: text.length };
}

const home = await get(HOME + '/');
console.log(`  /  →  ${home.status}, ${home.len} בייט — חתום ה-catch-all\n`);

// סימן זיהוי ייחודי לכל עמוד: שם ה-RPC שהוא קורא. index.html אינו מכיל אותם.
const SERVED = [
  { url: '/subscribe', marker: 'more30_subscribe' },
  { url: '/system.html?app=nadlan', marker: 'more30_system_page' },
];
for (const s of SERVED) {
  const r = await get(HOME + s.url);
  const isHome = r.text === home.text;
  console.log(`  ${s.url}  →  ${r.status}, ${r.len} בייט`);
  ok(`${s.url} מוגש (מכיל ${s.marker}, ואינו דף הבית)`,
     r.status === 200 && r.text.includes(s.marker) && !isHome,
     isHome ? 'בייט-בבייט דף הבית — נפל ל-catch-all' : `סטטוס ${r.status}, בלי הסימן`);
}

// הרגרסיה ההפוכה: /<שם> חייב להמשיך להגיש את המערכת ולא את עמוד המסלולים.
// אם מישהו יתקן את היתמות על ידי הפניית /<שם> אל system.html, 20 מערכות חיות
// ייעלמו מאחורי עמוד שיווקי. זה נתפס כאן.
const nadlan = await get(HOME + '/nadlan');
ok('/nadlan עדיין מגיש את המערכת ולא את עמוד המסלולים',
   nadlan.status === 200 && !nadlan.text.includes('more30_system_page'),
   'הכתובת החיה הוחלפה בעמוד שיווקי');

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail ? 1 : 0);
