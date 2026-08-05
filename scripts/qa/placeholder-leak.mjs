/**
 * Is any system showing a value it does not have?
 *
 * "נתוני אמת בלבד. אין נתון → 'לא זמין'" is stated as a platform rule in
 * more30-priority.md, not a property-system rule. It had only ever been checked
 * on one system, by report-integrity.mjs, and only for the property report.
 * This asks the same question of every public route.
 *
 * What it looks for is narrow on purpose — the things that can only be a bug:
 *
 *   · undefined / NaN / [object Object] / Infinity rendered as text. These are
 *     a variable that was not there, printed anyway.
 *   · "null" standing alone as a value.
 *   · a definition label with nothing after it, which is the quiet version of
 *     the same thing: a field that promised a value and has none.
 *
 * What it deliberately does not flag: an empty state written in words, a zero
 * that is genuinely zero, or the phrase "לא זמין" itself. Those are the system
 * keeping its promise, and a check that punished them would push whoever is
 * fixing it toward inventing numbers — the exact outcome the rule exists to
 * prevent.
 *
 *   node scripts/qa/placeholder-leak.mjs
 *   node scripts/qa/placeholder-leak.mjs /kupot /torah
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';

const ROUTES = {
  torah: '/torah', tamlul: '/tamlul', modaot: '/modaot', imud: '/imud',
  briut: '/briut', bkalot: '/bkalot', smel: '/smel', smachot: '/smachot',
  egod: '/egod', chatzor: '/chatzor/', chizukim: '/chizukim/',
  orech: '/orech', zchuyot: '/zchuyot', mthbram: '/mthbram', galil: '/galil',
  studio: '/studio', mechiron: '/mechiron', kupot: '/kupot',
  nadlan: '/nadlan/', crm: '/crm', gesher: '/gesher', kesef: '/kesef',
  kiosk: '/kiosk/', tivuch: '/tivuch', portal: '/',
};

const only = process.argv.slice(2).map((s) => s.replace(/^\//, '').replace(/\/$/, ''));
const targets = Object.entries(ROUTES).filter(([k]) => !only.length || only.includes(k));

// Word-boundary matched, so "undefined" inside a longer word does not count.
const LEAK_PATTERNS = [
  { name: 'undefined', re: /\bundefined\b/ },
  { name: 'NaN', re: /\bNaN\b/ },
  { name: '[object Object]', re: /\[object Object\]/ },
  { name: 'Infinity', re: /\bInfinity\b/ },
  { name: 'bare null', re: /(^|[\s:>,])null([\s<,.]|$)/ },
];

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const out = {};
let leaks = 0;

for (const [key, route] of targets) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, locale: 'he-IL' });
  const rec = { route, found: [], emptyLabels: 0, chars: 0, error: null };
  try {
    await page.goto('https://more30.com' + route, { waitUntil: 'domcontentloaded', timeout: 90000 });

    // Same lesson as report-integrity: wait for content to exist and then
    // settle, rather than sleeping a fixed time. A page measured mid-load looks
    // broken, and a check that reports working systems as broken gets ignored.
    // See report-integrity.mjs: options go third, not second. Harmless here
    // because the catch swallows it and landing pages are fast, but wrong is
    // wrong and the next person would copy it.
    await page.waitForFunction(() => document.body.innerText.length > 60, undefined, { timeout: 30000 })
      .catch(() => {});
    let last = -1, stable = 0;
    for (let i = 0; i < 14 && stable < 2; i++) {
      await page.waitForTimeout(1200);
      const n = await page.evaluate(() => document.body.innerText.length);
      stable = n === last ? stable + 1 : 0;
      last = n;
    }

    const seen = await page.evaluate(() => ({
      text: document.body.innerText,
      emptyLabels: [...document.querySelectorAll('dt')].filter((dt) => {
        const dd = dt.nextElementSibling;
        return dd && dd.tagName === 'DD' && !(dd.textContent || '').trim();
      }).length,
    }));

    rec.chars = seen.text.length;
    rec.emptyLabels = seen.emptyLabels;
    for (const p of LEAK_PATTERNS) {
      if (p.re.test(seen.text)) {
        const m = new RegExp(`.{0,40}${p.re.source}.{0,40}`).exec(seen.text);
        rec.found.push({ what: p.name, context: (m?.[0] || '').replace(/\s+/g, ' ').trim() });
      }
    }
  } catch (e) {
    rec.error = String(e.message).slice(0, 90);
  }
  await page.close();
  out[key] = rec;
  leaks += rec.found.length + rec.emptyLabels;

  console.log(
    key.padEnd(10) +
      (rec.error
        ? 'ERROR ' + rec.error
        : `chars=${String(rec.chars).padEnd(6)} leaks=${rec.found.length} emptyLabels=${rec.emptyLabels}`) +
      (rec.found.length ? '   <<< ' + rec.found.map((f) => `${f.what}: ${f.context}`).join(' | ') : ''),
  );
}

await browser.close();
fs.mkdirSync('QA/platform', { recursive: true });
fs.writeFileSync('QA/platform/_leaks.json', JSON.stringify(out, null, 2), 'utf8');

console.log(`\n${Object.keys(out).length} routes · ${leaks} values shown that do not exist`);
console.log('-> QA/platform/_leaks.json');
process.exit(leaks ? 1 : 0);
