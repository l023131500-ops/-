// lighthouse-run.mjs — the measurement STATUS.md says was never taken.
//
// DESIGN_STANDARD requires Lighthouse >= 90. Until now that line was aspirational
// because nobody had run it. This runs the real thing (mobile profile, the strict
// one) against production and writes one JSON with the four category scores per
// route, plus the specific audits that failed, so the fix list is concrete.
//
// Run it from a directory whose node_modules has `lighthouse` installed:
//   node <this> <outDir> [routeKey ...]

import fs from 'node:fs';
import path from 'node:path';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const CHROME = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';
const OUT = process.argv[2] || 'C:\\Users\\USER\\Downloads\\more30\\QA\\platform';
const ONLY = process.argv.slice(3);

const ROUTES = [
  ['home', '/'], ['login', '/login'], ['me', '/me'], ['subscribe', '/subscribe'],
  ['torah', '/torah'], ['tamlul', '/tamlul'], ['modaot', '/modaot'], ['imud', '/imud'],
  ['briut', '/briut'], ['bkalot', '/bkalot'], ['smel', '/smel'], ['smachot', '/smachot'],
  ['egod', '/egod'], ['chatzor', '/chatzor'], ['chatzor-app', '/chatzor/'],
  ['chizukim', '/chizukim'], ['chizukim-app', '/chizukim/'], ['orech', '/orech'],
  ['mthbram', '/mthbram'], ['zchuyot', '/zchuyot'], ['galil', '/galil'],
  ['studio', '/studio'], ['mechiron', '/mechiron'], ['kupot', '/kupot'],
  ['crm', '/crm'], ['gesher', '/gesher'], ['nadlan', '/nadlan'],
  ['kesef', '/kesef'], ['kiosk', '/kiosk/'],
];

fs.mkdirSync(OUT, { recursive: true });
const outFile = path.join(OUT, '_lighthouse.json');
const all = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};

const chrome = await chromeLauncher.launch({
  chromePath: CHROME,
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--lang=he-IL'],
});

const targets = ONLY.length ? ROUTES.filter(([k]) => ONLY.includes(k)) : ROUTES;

for (const [key, p] of targets) {
  const url = ORIGIN + p;
  process.stdout.write(`${key} ... `);
  try {
    const runner = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      locale: 'en-US',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      // one pass is enough to rank the fix list; three would triple an already long night
      maxWaitForLoad: 60000,
    });
    const lhr = runner.lhr;
    const cat = (c) => Math.round((lhr.categories[c]?.score ?? 0) * 100);
    const failed = Object.values(lhr.audits)
      .filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'notApplicable')
      .map((a) => ({ id: a.id, title: a.title, score: a.score, display: a.displayValue || '' }));

    all[key] = {
      url,
      measuredAt: new Date().toISOString(),
      performance: cat('performance'),
      accessibility: cat('accessibility'),
      bestPractices: cat('best-practices'),
      seo: cat('seo'),
      metrics: {
        fcp: lhr.audits['first-contentful-paint']?.displayValue,
        lcp: lhr.audits['largest-contentful-paint']?.displayValue,
        tbt: lhr.audits['total-blocking-time']?.displayValue,
        cls: lhr.audits['cumulative-layout-shift']?.displayValue,
        si: lhr.audits['speed-index']?.displayValue,
      },
      failedAudits: failed,
    };
    console.log(`perf ${all[key].performance} · a11y ${all[key].accessibility} · bp ${all[key].bestPractices} · seo ${all[key].seo}`);
  } catch (e) {
    all[key] = { url, error: String(e).slice(0, 300) };
    console.log(`ERROR ${String(e).slice(0, 120)}`);
  }
  fs.writeFileSync(outFile, JSON.stringify(all, null, 2), 'utf8');
}

// On Windows chrome-launcher's temp cleanup throws EPERM while the browser is
// still releasing its profile directory. The measurement is already written;
// letting that throw would fail the whole run for nothing.
try {
  await chrome.kill();
} catch (e) {
  console.log(`(chrome cleanup: ${String(e).slice(0, 80)})`);
}
console.log(`\nDone -> ${outFile}`);
