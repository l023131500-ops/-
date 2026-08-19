/**
 * Does any live mount block the shared login pill from talking to the platform?
 *
 * Found by customer-journey.mjs on 06/08: the exact same code, with the exact
 * same session, could ask `more30_my_apps` from /bkalot and could not from
 * /kiosk. Nothing 404'd and nothing threw — the request never left the page.
 *
 * The cause is a Content-Security-Policy header, and it matters far beyond one
 * assertion in a test. `auth-button.js` calls `more30_join_app` from whatever
 * page it is mounted on, and that single call is what records the visitor as a
 * customer of that system AND what asks the server whether to show "ניהול" —
 * §2's super-admin entry. Under a CSP without the Supabase origin in
 * `connect-src`, both silently do not happen: the pill still renders, still
 * says the user's name, and simply never grows an admin item.
 *
 * So this asks every mount the only question that decides it: from inside that
 * page, can a fetch to the platform's API complete? It is deliberately a
 * *behaviour* check and not a header parse — a header can look permissive and
 * still be overridden by a <meta> tag, and a header can look strict while the
 * host never enforces it.
 *
 *   node scripts/qa/csp-blocks-auth.mjs
 *   node scripts/qa/csp-blocks-auth.mjs /kiosk /bkalot
 */
import { chromium } from 'playwright-core';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';
const SUPABASE = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
// The anon/publishable key — the same one every page on the platform already
// ships to the browser.
const KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

const MOUNTS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['/', '/torah', '/tamlul', '/modaot', '/imud', '/briut', '/bkalot', '/smel',
     '/egod', '/chatzor', '/chizukim', '/orech', '/zchuyot', '/galil', '/studio',
     '/mechiron', '/kupot', '/nadlan', '/kesef', '/kiosk/', '/tivuch'];

const browser = await chromium.launch({ executablePath: EXE, headless: true });
let blocked = 0;

console.log('=== can the login pill reach the platform from each mount? ===');

for (const mount of MOUNTS) {
  const page = await (await browser.newContext({
    viewport: { width: 1280, height: 900 }, locale: 'he-IL',
  })).newPage();

  const violations = [];
  page.on('console', (m) => {
    const t = m.text();
    if (/Content Security Policy|Refused to connect/i.test(t)) violations.push(t.slice(0, 160));
  });

  try {
    await page.goto(ORIGIN + mount, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(3000);

    // An unauthenticated RPC is enough: the question is whether the request is
    // allowed to leave, not what it answers. 401 counts as reachable.
    const reach = await page.evaluate(async ([url, key]) => {
      try {
        const r = await fetch(url + '/rest/v1/rpc/more30_profile_get', {
          method: 'POST',
          headers: { apikey: key, 'content-type': 'application/json' },
          body: '{}',
        });
        return { ok: true, status: r.status };
      } catch (e) {
        return { ok: false, error: String(e.message || e).slice(0, 120) };
      }
    }, [SUPABASE, KEY]);

    if (reach.ok) {
      console.log(`  PASS  ${mount}  (HTTP ${reach.status})`);
    } else {
      blocked++;
      console.log(`  FAIL  ${mount}  << ${reach.error}`);
      if (violations.length) console.log(`        CSP: ${violations[0]}`);
    }
  } catch (e) {
    blocked++;
    console.log(`  FAIL  ${mount}  << ${String(e.message).slice(0, 120)}`);
  }
  await page.close();
}

await browser.close();
console.log(`\n${MOUNTS.length - blocked} reachable · ${blocked} blocked`);
process.exit(blocked ? 1 : 0);
