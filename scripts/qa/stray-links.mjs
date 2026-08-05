/**
 * Where do the public sites actually send people?
 *
 * Written after finding that the rights site's "ניהול" link pointed at a
 * perplexity.ai sandbox URL — live, in production, on a public consumer site.
 * Nothing failed and nothing 404'd: the link worked perfectly and led somewhere
 * it should never have led. No existing check looked at destinations, only at
 * whether pages loaded.
 *
 * That is a class of defect, not a one-off, so this looks for the whole class:
 *
 *   · links to AI tools and build sandboxes — perplexity, lovable, bolt, v0,
 *     replit, chatgpt. These arrive when a scaffold's placeholder is never
 *     replaced, and they are the ones that embarrass on a live site.
 *   · links to a raw *.vercel.app or *.railway.app deployment rather than the
 *     more30.com route, which bypasses the portal and breaks under NetFree.
 *   · href="#", href="" and javascript:void(0) — a control that looks
 *     actionable and does nothing.
 *   · localhost and 127.0.0.1, which cannot work for any visitor.
 *
 * Ordinary outbound links (gov.il, health funds, maps, fonts) are expected on
 * these sites and are reported as a count only, not as findings.
 *
 *   node scripts/qa/stray-links.mjs
 *   node scripts/qa/stray-links.mjs /bkalot /galil
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

const SANDBOX = /(perplexity\.ai|lovable\.(dev|app)|bolt\.new|v0\.dev|replit\.(com|dev)|chatgpt\.com|claude\.ai|codesandbox|stackblitz)/i;
const RAW_DEPLOY = /^https?:\/\/[^/]+\.(vercel\.app|up\.railway\.app|netlify\.app)/i;
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i;

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const out = {};
let findings = 0;

for (const [key, route] of targets) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' });
  const rec = { route, sandbox: [], rawDeploy: [], local: [], dead: 0, outbound: 0, error: null };

  try {
    await page.goto('https://more30.com' + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(5000);

    const links = await page.evaluate(() =>
      [...document.querySelectorAll('a')].map((a) => ({
        href: a.getAttribute('href') || '',
        text: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      })),
    );

    for (const l of links) {
      const h = l.href.trim();
      if (SANDBOX.test(h)) rec.sandbox.push(l);
      else if (RAW_DEPLOY.test(h)) rec.rawDeploy.push(l);
      else if (LOCAL.test(h)) rec.local.push(l);
      // A dead control is one that looks clickable and goes nowhere. Anchors
      // used purely as scroll targets ("#section") are legitimate, so only the
      // empty forms count.
      else if (h === '' || h === '#' || /^javascript:\s*void/i.test(h)) rec.dead++;
      else if (/^https?:\/\//i.test(h) && !h.includes('more30.com')) rec.outbound++;
    }
  } catch (e) {
    rec.error = String(e.message).slice(0, 100);
  }
  await page.close();
  out[key] = rec;

  const bad = rec.sandbox.length + rec.rawDeploy.length + rec.local.length;
  findings += bad;
  console.log(
    key.padEnd(10) +
      (rec.error
        ? 'ERROR ' + rec.error
        : `sandbox=${rec.sandbox.length} rawDeploy=${rec.rawDeploy.length} ` +
          `local=${rec.local.length} dead=${rec.dead} outbound=${rec.outbound}`) +
      (bad ? '   <<< ' + [...rec.sandbox, ...rec.rawDeploy, ...rec.local]
        .map((l) => `"${l.text}" -> ${l.href.slice(0, 60)}`).join(' | ') : ''),
  );
}

await browser.close();
fs.mkdirSync('QA/platform', { recursive: true });
fs.writeFileSync('QA/platform/_links.json', JSON.stringify(out, null, 2), 'utf8');

console.log(`\n${Object.keys(out).length} routes · ${findings} links that should not be there`);
console.log('-> QA/platform/_links.json');
process.exit(findings ? 1 : 0);
