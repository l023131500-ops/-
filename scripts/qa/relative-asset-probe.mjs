/**
 * Does a path-mounted static site actually load its own assets?
 *
 * The failure this catches is specific and it has now bitten twice. A site
 * served at `more30.com/<name>` whose HTML references assets relatively
 * ("style.css", "app.js") resolves them against the *document* URL. With no
 * trailing slash and no `<base href="/<name>/">`, "style.css" resolves to
 * `more30.com/style.css` — the portal root — and the portal's catch-all
 * rewrite answers **200 with index.html**. Nothing 404s. The console stays
 * quiet. The stylesheet simply parses as zero rules and the page renders
 * unstyled, or the script parses as HTML and never runs.
 *
 * That is why probe-assets.mjs passes on these: it checks the URLs it can see
 * resolve, and they do — to the wrong document. This asks the browser what it
 * actually fetched and whether the answer was usable.
 *
 *   node scripts/qa/relative-asset-probe.mjs /bkalot /briut /smachot
 */
import { chromium } from 'playwright-core';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';
const routes = process.argv.slice(2);
if (!routes.length) {
  console.error('usage: node scripts/qa/relative-asset-probe.mjs <route> [route ...]');
  process.exit(2);
}

const browser = await chromium.launch({ executablePath: EXE, headless: true });
let bad = 0;

for (const route of routes) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' });
  const seen = [];
  page.on('response', async (r) => {
    const url = r.url();
    if (!url.startsWith(ORIGIN)) return;
    const type = (r.headers()['content-type'] || '').split(';')[0];
    if (!/\.(css|js|mjs|json)(\?|$)/.test(url)) return;
    let body = '';
    try { body = (await r.text()).slice(0, 400); } catch { /* binary or aborted */ }
    seen.push({ url, status: r.status(), type, html: body.trimStart().startsWith('<') });
  });

  await page.goto(ORIGIN + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5000);

  // A stylesheet that answered with HTML parses to zero rules. Ask the page.
  const sheets = await page.evaluate(() =>
    [...document.styleSheets].map((s) => {
      let n = null;
      try { n = s.cssRules ? s.cssRules.length : null; } catch { n = 'cross-origin'; }
      return { href: s.href, rules: n };
    }),
  );

  console.log(`\n=== ${route} ===`);
  const wrong = seen.filter((s) => s.html);
  for (const s of seen) {
    const emptySheet = sheets.find((x) => x.href === s.url && x.rules === 0);
    const flag = s.html ? 'HTML-NOT-ASSET' : emptySheet ? 'PARSED-EMPTY' : 'ok';
    if (flag !== 'ok') bad++;
    console.log(`  ${String(s.status).padEnd(4)} ${flag.padEnd(15)} ${s.url.replace(ORIGIN, '')}`);
  }
  if (!wrong.length) console.log('  (every css/js request returned a real asset)');

  const base = await page.evaluate(() => document.querySelector('base')?.getAttribute('href') ?? null);
  console.log(`  <base href>: ${base ?? '(none)'}`);
  await page.close();
}

await browser.close();
console.log(`\n${bad} bad asset response(s)`);
process.exit(bad ? 1 : 0);
