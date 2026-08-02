// Name the console errors Lighthouse counted, instead of guessing at them.
import { chromium } from 'playwright-core';
const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const url = process.argv[2];
const b = await chromium.launch({ executablePath: EXE, headless: true });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const seen = [];
p.on('console', (m) => { if (m.type() === 'error') seen.push(`console.error: ${m.text()}`); });
p.on('pageerror', (e) => seen.push(`pageerror: ${e.message}`));
p.on('requestfailed', (r) => seen.push(`requestfailed: ${r.url()} — ${r.failure()?.errorText}`));
p.on('response', (r) => { if (r.status() >= 400) seen.push(`http ${r.status()}: ${r.url()}`); });
await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => seen.push(`goto: ${e.message}`));
await p.waitForTimeout(4000);
console.log(seen.length ? seen.join('\n') : '(no console errors, failed requests or 4xx/5xx)');
await b.close();
