/**
 * One measured fact sheet per system, from the probes that already ran.
 *
 * The run docs ask for QA/<name>.md per system. Writing those from memory
 * would produce thirteen plausible files, which is worse than none — the point
 * of a QA record is that someone can trust it later. This collects what was
 * actually measured, so the documents quote numbers instead of impressions.
 *
 *   node scripts/qa/system-facts.mjs            # all live routes
 *   node scripts/qa/system-facts.mjs tamlul imud
 *
 * Writes QA/platform/_facts.json and prints a summary.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';

const ROUTES = {
  tamlul: '/tamlul', modaot: '/modaot', imud: '/imud', briut: '/briut',
  bkalot: '/bkalot', smel: '/smel', smachot: '/smachot', egod: '/egod',
  mthbram: '/mthbram', galil: '/galil', mechiron: '/mechiron',
  crm: '/crm', gesher: '/gesher',
};

const only = process.argv.slice(2);
const targets = Object.entries(ROUTES).filter(([k]) => !only.length || only.includes(k));

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const out = {};

for (const [key, route] of targets) {
  const facts = { route, url: ORIGIN + route };
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, locale: 'he-IL', isMobile: true, hasTouch: true,
  });
  const errors = [];
  const bad = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
  page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url().slice(0, 90)}`); });

  try {
    const res = await page.goto(facts.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    facts.status = res?.status() ?? null;
    await page.waitForTimeout(4500);

    Object.assign(facts, await page.evaluate(() => {
      const txt = document.body.innerText.replace(/\s+/g, ' ').trim();
      const small = [];
      const unnamed = [];
      for (const el of document.querySelectorAll('a[href],button,[role="button"],input,select,summary')) {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        if (!r.width || !r.height || s.visibility === 'hidden' || s.display === 'none') continue;
        const name = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim();
        if (r.width < 24 || r.height < 24) small.push({ tag: el.tagName.toLowerCase(), name: name.slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) });
        if (!name && !el.getAttribute('title')) unnamed.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 40) });
      }
      return {
        textLen: txt.length,
        links: document.querySelectorAll('a[href]').length,
        forms: document.querySelectorAll('form').length,
        inputs: document.querySelectorAll('input,select,textarea').length,
        images: document.querySelectorAll('img').length,
        imagesNoAlt: [...document.querySelectorAll('img')].filter((i) => !i.getAttribute('alt')).length,
        h1: document.querySelectorAll('h1').length,
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        baseHref: document.querySelector('base')?.getAttribute('href') ?? null,
        hasAuthButton: !!document.querySelector('more30-auth'),
        darkVar: getComputedStyle(document.documentElement).getPropertyValue('--more30-auth-inset').trim(),
        smallTargets: small.slice(0, 6),
        unnamedControls: unnamed.slice(0, 6),
      };
    }));

    // does the dark theme actually respond?
    const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor + '|' + getComputedStyle(document.body).backgroundImage.slice(0, 60));
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(700);
    const after = await page.evaluate(() => getComputedStyle(document.body).backgroundColor + '|' + getComputedStyle(document.body).backgroundImage.slice(0, 60));
    facts.darkResponds = before !== after;
  } catch (e) {
    facts.error = String(e.message).slice(0, 120);
  }
  facts.consoleErrors = [...new Set(errors)].slice(0, 5);
  facts.badResponses = [...new Set(bad)].slice(0, 5);
  await page.close();

  out[key] = facts;
  console.log(
    `${key.padEnd(10)} ${String(facts.status).padEnd(4)} text=${String(facts.textLen ?? '?').padEnd(6)}` +
      ` links=${String(facts.links ?? '?').padEnd(4)} forms=${facts.forms ?? '?'}` +
      ` dark=${facts.darkResponds ? 'yes' : 'NO '} auth=${facts.hasAuthButton ? 'yes' : 'NO '}` +
      ` small=${facts.smallTargets?.length ?? '?'} unnamed=${facts.unnamedControls?.length ?? '?'}` +
      ` err=${facts.consoleErrors.length}`,
  );
}

await browser.close();
fs.mkdirSync('QA/platform', { recursive: true });
fs.writeFileSync('QA/platform/_facts.json', JSON.stringify(out, null, 2), 'utf8');
console.log('\n-> QA/platform/_facts.json');
