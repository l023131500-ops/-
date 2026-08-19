/**
 * /admin/credits — what the card draws for the providers that were missing.
 *
 * credits-coverage.mjs proves the API now has a row for every service in
 * `core.secrets`, and probes Google and data.gov.il for real. It cannot prove the
 * page draws those rows correctly, and two of them are the first of their kind:
 *
 *   · **data.gov.il has no key and no balance.** The card's call to action was a
 *     single expression — "הוספת קרדיט אצל הספק" for anything not marked missing.
 *     On a free public catalogue that sentence is simply false, so the provider
 *     now carries `topUpLabel` and the page has to prefer it.
 *   · **Green Invoice is missing in a specific way.** The provider was already
 *     chosen (INVOICE_PROVIDER=greeninvoice sits in the vault); what is missing is
 *     the key pair of a real account (core.issues #14). `whenMissing` says that
 *     instead of the generic "צריך לפתוח חשבון", and the card has to show it.
 *
 * The fixture below is the real shape /api/credits returns, with the states the
 * live probes actually produced on 07/08: Google's pair is accepted by the token
 * endpoint (400 invalid_grant), data.gov.il answers with 10,148 polling-station
 * rows, and the two clearing accounts plus Green Invoice have no key deployed to
 * the portal. No number here is invented — see credits-coverage-0807/_results.json.
 *
 * Served from the working tree, not production: the deploy queue is blocked on the
 * Vercel quota (core.issues #83).
 *
 *   node scripts/qa/admin-credits-render.mjs
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const PORT = 5212;
const OUT = 'QA/platform/admin-credits-render-0807';

let pass = 0, fail = 0;
const results = [];
const ok = (n, c, d) => {
  results.push({ check: n, pass: !!c, detail: d ?? null });
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

const P = (o) => ({ inVault: true, deployed: true, ...o });

const PAYLOAD = {
  checkedAt: '2026-08-07T04:10:00.000Z',
  providers: [
    P({
      key: 'google-oauth', label: 'Google — כניסה עם חשבון', state: 'ok',
      usedBy: 'המסלול החינמי בכל המערכות — כניסה עם Google (§8ב)',
      detail: 'זיהוי הלקוח והסוד התקבלו על ידי גוגל. ל-OAuth אין יתרה — הוא חינמי.',
      topUp: 'https://console.cloud.google.com/apis/credentials',
      topUpLabel: 'עמוד ההרשאות אצל גוגל',
    }),
    P({
      key: 'gov-il', label: 'data.gov.il — מאגרים ציבוריים', state: 'ok', keyless: true,
      deployed: false,
      usedBy: 'נדל״ן ברגע · סמל נדל״ן — קלפיות, תחבורה, תב״ע ומדד מחירי הדיור',
      detail: 'הממשק הציבורי עונה · 1,198 מאגרים בקטלוג. מזהי המאגרים שלנו יושבים בכספת בהיקף nadlan ואינם משתני סביבה כאן, ולכן נמדד השרת ולא המאגר עצמו.',
      topUp: 'https://data.gov.il/dataset',
      topUpLabel: 'קטלוג המאגרים',
    }),
    P({
      key: 'greeninvoice', label: 'Green Invoice — חשבוניות', state: 'missing',
      inVault: false, deployed: false,
      usedBy: 'חשבונית על כל מנוי ועל כל תשלום — §8ג',
      detail: 'הספק כבר נבחר — INVOICE_PROVIDER=greeninvoice יושב בכספת, ו-iCount הוא החלופה המאושרת. מה שחסר הוא זוג המפתחות של חשבון אמיתי (core.issues #14), ובלעדיו אין חשבונית על אף תשלום.',
      topUp: 'https://app.greeninvoice.co.il/settings/api',
      topUpLabel: 'מפתחות ה-API אצל Green Invoice',
    }),
    P({
      key: 'nedarim-platform', label: 'נדרים פלוס — חשבון הפלטפורמה', state: 'not-deployed',
      deployed: false,
      usedBy: 'המנויים של more30 עצמם — חשבון נפרד מזה של הלקוח',
      detail: 'PLATFORM_NEDARIM_MOSAD, PLATFORM_NEDARIM_API_VALID — קיים ב-core.secrets אבל אינו משתנה סביבה בפריסה הזאת, ולכן אי אפשר לבדוק אותו מכאן. זה תיקון של העתקת ערך קיים, לא של פתיחת חשבון.',
      topUp: 'https://matara.pro/nedarimplus/Reports/',
      topUpLabel: 'לוח נדרים פלוס',
    }),
    // ספק ותיק בלי topUpLabel — כדי שהברירה הזאת תיבדק ולא רק החדשה.
    P({
      key: 'apify', label: 'Apify', state: 'ok',
      usedBy: 'נדל״ן ברגע — דירות שמוצעות כרגע (יד2 / מדלן)',
      usage: { used: 0.42, limit: 5, percent: 8, unit: 'USD', cycleEnds: '2026-08-28T00:00:00.000Z' },
      detail: 'יתרה חודשית אמיתית, נמדדת מול הספק.',
      topUp: 'https://console.apify.com/billing',
    }),
    P({
      key: 'elevenlabs', label: 'ElevenLabs', state: 'missing', inVault: false, deployed: false,
      usedBy: 'הקראות קוליות — אוטומציית בקלות ושלוחות ימות',
      detail: 'אין מפתח לספק הזה — לא בכספת ולא בפריסה. צריך לפתוח חשבון ולהוסיף מפתח.',
      topUp: 'https://elevenlabs.io/app/subscription',
    }),
  ],
  summary: { ok: 3, needsKey: 2, needsDeploy: 1, broken: 0 },
};

await mkdir(OUT, { recursive: true });

const server = spawn(process.execPath, ['scripts/qa/_serve-static.mjs', 'portal/public', String(PORT)],
  { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ locale: 'he-IL', viewport: { width: 1280, height: 1500 } });
const page = await ctx.newPage();

// העמוד יוצא מוקדם בלי סשן. רק הצורה חשובה כאן — התשובה של /api/credits מוחלפת
// למטה, והשער האמיתי הוא בצד השרת (more30_is_admin).
await page.addInitScript(() => {
  localStorage.setItem('more30-auth', JSON.stringify({
    access_token: 'qa.fixture.token', refresh_token: 'qa.fixture.refresh',
    token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: '00000000-0000-0000-0000-000000000000', email: 'qa.fixture@more30.com' },
  }));
});

await page.route('**/api/credits', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PAYLOAD) }));

console.log('\n/admin/credits — the four providers that had no row, and the CTA that was wrong\n');

await page.goto(`http://127.0.0.1:${PORT}/admin-credits.html`, { waitUntil: 'networkidle' });
await page.waitForSelector('.p', { timeout: 15000 }).catch(() => {});

const cards = await page.$$eval('.p', (els) => els.map((e) => ({
  label: e.querySelector('h2')?.innerText.trim(),
  tag: e.querySelector('.tag')?.innerText.trim(),
  detail: e.querySelector('.detail')?.innerText.replace(/\s+/g, ' ').trim(),
  cta: e.querySelector('.act')?.innerText.replace(/\s+/g, ' ').trim(),
  href: e.querySelector('.act')?.getAttribute('href'),
})));
const card = (n) => cards.find((c) => c.label === n) ?? { label: '(no card)', cta: null, detail: null };

ok('every provider in the answer is drawn', cards.length === PAYLOAD.providers.length,
   `${cards.length} of ${PAYLOAD.providers.length}`);

ok('Google OAuth appears at all — it had no row before',
   !!card('Google — כניסה עם חשבון').label && card('Google — כניסה עם חשבון').tag === 'פועל',
   card('Google — כניסה עם חשבון').tag);

ok('the free public catalogue is NOT offered as a place to add credit',
   card('data.gov.il — מאגרים ציבוריים').cta === 'קטלוג המאגרים ↗',
   card('data.gov.il — מאגרים ציבוריים').cta);

ok('and it points at the catalogue itself',
   card('data.gov.il — מאגרים ציבוריים').href === 'https://data.gov.il/dataset',
   card('data.gov.il — מאגרים ציבוריים').href);

ok('Green Invoice says the provider is already chosen and the key pair is what is missing',
   card('Green Invoice — חשבוניות').detail?.includes('INVOICE_PROVIDER=greeninvoice') &&
   card('Green Invoice — חשבוניות').detail?.includes('#14'),
   card('Green Invoice — חשבוניות').detail);

ok('the platform clearing account is drawn as a second, separate account',
   card('נדרים פלוס — חשבון הפלטפורמה').tag === 'לא נפרס' &&
   card('נדרים פלוס — חשבון הפלטפורמה').detail?.includes('PLATFORM_NEDARIM_API_VALID'),
   `${card('נדרים פלוס — חשבון הפלטפורמה').tag} · ${card('נדרים פלוס — חשבון הפלטפורמה').detail}`);

ok('a provider without topUpLabel keeps the old wording — the default was not lost',
   card('Apify').cta === 'הוספת קרדיט אצל הספק ↗' &&
   card('ElevenLabs').cta === 'פתיחת חשבון והוספת מפתח ↗',
   `apify="${card('Apify').cta}" · elevenlabs="${card('ElevenLabs').cta}"`);

const legend = (await page.textContent('#legend')) ?? '';
ok('the legend explains the keyless provider and the multi-key provider',
   legend.includes('ספק ציבורי בלי מפתח') && legend.includes('יותר ממפתח אחד'),
   legend.replace(/\s+/g, ' ').slice(0, 120));

await page.screenshot({ path: `${OUT}/credits-light.png`, fullPage: true });
await ctx.close();

const dark = await browser.newContext({
  locale: 'he-IL', viewport: { width: 1280, height: 1500 }, colorScheme: 'dark',
});
const p2 = await dark.newPage();
await p2.addInitScript(() => {
  localStorage.setItem('more30-auth', JSON.stringify({
    access_token: 'qa.fixture.token', refresh_token: 'qa.fixture.refresh',
    token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: '00000000-0000-0000-0000-000000000000', email: 'qa.fixture@more30.com' },
  }));
});
await p2.route('**/api/credits', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PAYLOAD) }));
await p2.goto(`http://127.0.0.1:${PORT}/admin-credits.html`, { waitUntil: 'networkidle' });
await p2.waitForSelector('.p', { timeout: 15000 }).catch(() => {});
await p2.screenshot({ path: `${OUT}/credits-dark.png`, fullPage: true });

await browser.close();
server.kill();

await writeFile(`${OUT}/_results.json`,
  JSON.stringify({ ran: 'scripts/qa/admin-credits-render.mjs', page: 'portal/public/admin-credits.html',
    served: 'working tree', cards, summary: { pass, fail }, checks: results }, null, 2) + '\n', 'utf8');

console.log(`\n${pass} passed · ${fail} failed  →  ${OUT}`);
process.exit(fail ? 1 : 0);
