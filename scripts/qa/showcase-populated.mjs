/**
 * /showcase — הדף הציבורי שנושא את שם המותג, ואין עליו אף מערכת.
 *
 * §7 קובע שם מותג אחד — "עולם הסטארטאפים" — ומבקש שבפוטר של כל אתר יהיה קישור
 * "פותח ע"י עולם הסטארטאפים" שמוביל לאתר התדמית שלנו. §4 קובע עמודה אחת למה
 * שהציבור רואה, core.projects.public_visible, ו-f737ee1 (מיגרציה 0040) חיברה
 * את שער ה-showcase לאותה עמודה בדיוק.
 *
 * מה שאף ריצה לא שאלה עד היום: כמה מערכות באמת מצוירות שם.
 * admin-pricing-showcase-settable.mjs כבר רשם את המספר בשדה
 * measured_on_live_db.rows_with_show_in_showcase_true — 0 — ולא קרא לו ממצא.
 *
 * הריצה הזאת מודדת את שני העמודים הציבוריים זה מול זה, שניהם כאנונימי, בדיוק
 * כפי שמבקר רואה אותם:
 *
 *   דף הבית   GET /rest/v1/more30_public_systems   (התצוגה ש-§4 מכתיבה)
 *   /showcase POST /rest/v1/rpc/more30_showcase    (מה שהדף באמת מצייר)
 *
 * ובודקת שבעה דברים על מה שמצויר בפועל בדפדפן, מול הייצור:
 *
 *   1. הקטלוג אינו ריק
 *   2. לכל כרטיס יש שם
 *   3. לכל כרטיס יש קישור אמיתי, ולא נפילת ה-'/' של showcase.html:166
 *   4. לכל כרטיס יש משפט משלו, ולא נפילת ה-'לא זמין' של showcase.html:169
 *   5. אף כרטיס אינו מערכת שדף הבית מסתיר — showcase ⊆ home (core.issues #107)
 *   6. שורת הספירה מסכימה עם מספר הכרטיסים
 *   7. מצב הריק אינו מצויר
 *
 *   node scripts/qa/showcase-populated.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const PORT = 5227;
const OUT = 'QA/platform/showcase-populated-0807';

const SUPABASE_URL = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

let pass = 0, fail = 0;
const results = [];
const ok = (n, c, d) => {
  results.push({ check: n, pass: !!c, detail: d ?? null });
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

const H = { apikey: ANON, Authorization: `Bearer ${ANON}` };

/** דף הבית, כאנונימי: התצוגה ש-§4 מכתיבה עליה את public_visible. */
const home = await fetch(
  `${SUPABASE_URL}/rest/v1/more30_public_systems?select=number,path,title,live_url`,
  { headers: H },
).then((r) => r.json());

/** /showcase, כאנונימי: אותו RPC שהדף עצמו קורא בדפדפן. */
const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/more30_showcase`, {
  method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: '{}',
}).then((r) => r.json());

const homeNumbers = new Set(home.map((s) => s.number));
const rpcSystems = rpc.systems ?? [];

console.log(`\n/showcase — ${rpcSystems.length} מוצגות · דף הבית ${home.length} מערכות\n`);

await mkdir(OUT, { recursive: true });

const server = spawn(process.execPath, ['scripts/qa/_serve-static.mjs', 'portal/public', String(PORT)],
  { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({ executablePath: EXE });

/** מצייר את showcase.html מול ה-RPC החי — בלי route ובלי fixture. */
async function draw({ dark = false, shot = null } = {}) {
  const ctx = await browser.newContext({
    locale: 'he-IL', viewport: { width: 1280, height: 1400 },
    ...(dark ? { colorScheme: 'dark' } : {}),
  });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/showcase.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => document.getElementById('count').textContent !== 'טוען…',
    { timeout: 20000 },
  ).catch(() => {});
  const drawn = await page.evaluate(() => ({
    count: document.getElementById('count').textContent.trim(),
    empty: document.querySelector('#grid .empty')?.innerText.replace(/\s+/g, ' ').trim() ?? null,
    cards: [...document.querySelectorAll('#grid a.card')].map((a) => ({
      name: a.querySelector('h2')?.textContent.trim() ?? '',
      blurb: a.querySelector('p')?.textContent.trim() ?? '',
      href: a.getAttribute('href'),
      live: !!a.querySelector('.tag'),
    })),
  }));
  if (shot) await page.screenshot({ path: `${OUT}/${shot}.png`, fullPage: true });
  await ctx.close();
  return drawn;
}

const light = await draw({ shot: 'showcase-light' });
const dark = await draw({ dark: true, shot: 'showcase-dark' });

ok('the catalogue is not empty',
   light.cards.length > 0,
   `${light.cards.length} cards, empty-state=${light.empty ?? '(none)'}`);

const nameless = light.cards.filter((c) => !c.name);
ok('every card carries a name',
   nameless.length === 0, `${nameless.length} without one`);

// showcase.html:166 — href="${esc(s.url || '/')}" — כרטיס בלי live_url מחזיר לדף הבית
const deadHref = light.cards.filter((c) => !c.href || c.href === '/' || !/^https?:\/\//.test(c.href));
ok('every card links somewhere real, not the "/" fallback',
   deadHref.length === 0,
   deadHref.map((c) => `${c.name}→${c.href}`).join(', ') || 'none');

// showcase.html:169 — ${esc(s.tagline || s.what || 'לא זמין')}
const blurbless = light.cards.filter((c) => !c.blurb || c.blurb === 'לא זמין');
ok('every card says what the system is, not "לא זמין"',
   blurbless.length === 0, blurbless.map((c) => c.name).join(', ') || 'none');

// core.issues #107: הקטלוג לעולם לא רחב מדף הבית
const overreach = rpcSystems.filter((s) => !homeNumbers.has(s.number));
ok('no card is a system the home page hides — showcase ⊆ home',
   overreach.length === 0,
   overreach.map((s) => `#${s.number} ${s.name}`).join(', ') || 'none');

const expected = light.cards.length === 1 ? 'מערכת אחת מוצגת' : `${light.cards.length} מערכות מוצגות`;
ok('the count line agrees with the cards under it',
   light.count === expected, `"${light.count}" vs "${expected}"`);

ok('the empty state is not drawn',
   light.empty === null, light.empty ?? 'none');

ok('dark mode draws the same catalogue',
   dark.cards.length === light.cards.length && dark.count === light.count,
   `${dark.cards.length} cards · "${dark.count}"`);

await browser.close();
server.kill();

await writeFile(`${OUT}/_results.json`,
  JSON.stringify({
    ran: 'scripts/qa/showcase-populated.mjs',
    page: 'portal/public/showcase.html (working tree, live RPC)',
    read_as: 'anon',
    measured: {
      home_page_systems: home.length,
      showcase_systems: rpcSystems.length,
      home_only: home.filter((s) => !rpcSystems.some((r) => r.number === s.number))
                     .map((s) => `#${s.number} ${s.path ?? '(no path)'}`),
      showcase_only: overreach.map((s) => `#${s.number} ${s.name}`),
    },
    drawn: { light, dark },
    summary: { pass, fail },
    checks: results,
  }, null, 2) + '\n', 'utf8');

console.log(`\n${pass} passed · ${fail} failed  →  ${OUT}`);
process.exit(fail ? 1 : 0);
