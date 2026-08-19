/**
 * Does simply arriving at a system, already signed in, make you a customer of it?
 *
 * There are two places membership is written, and only one of them was ever
 * tested. `/auth/callback` writes it for the system you logged in *from*, and it
 * runs on more30.com where nothing is in its way — that is the path
 * customer-journey.mjs walks. The other is `auth-button.js` itself: on every
 * page it mounts it calls `more30_join_app` with `location.href`, and the answer
 * to that one call is also what decides whether the pill grows a "ניהול" item
 * (more30-priority.md §2). Nobody logs in from every system; they log in once
 * and then follow links. So this second path is the one most visits actually
 * use, and it had no test at all.
 *
 * It fails silently by design — membership is a record, not a gate, so the call
 * sits in a catch that swallows everything. On /kiosk a Content-Security-Policy
 * refused it before it left the page and the pill still rendered the user's
 * name, which is precisely why nothing noticed for as long as it existed.
 *
 * The customer is therefore signed in from a DIFFERENT system on purpose: that
 * makes the callback write a membership that is not the one under test, so a
 * pass here can only have come from the pill.
 *
 *   node scripts/qa/pill-joins-on-arrival.mjs                 # all live mounts
 *   node scripts/qa/pill-joins-on-arrival.mjs /kiosk/
 */
import { chromium } from 'playwright-core';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';
const SUPABASE = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

// Where the customer logs in from. Anything but the mount under test; /torah is
// used because customer-journey.mjs already proves that journey works, so a
// failure here cannot be blamed on the login itself.
const LOGIN_FROM = '/torah';

const MOUNTS = process.argv.slice(2).length ? process.argv.slice(2) : ['/kiosk/'];

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

async function newCustomer() {
  const email = `qa.customer+${Date.now()}${Math.floor(Math.random() * 1000)}@more30.com`;
  const password = `Qa!${Math.random().toString(36).slice(2, 10)}A9`;
  const r = await fetch(`${SUPABASE}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`signup failed: HTTP ${r.status}`);
  return { email, password };
}

// Asked as the user, not as the service key: the question is what this customer
// can see about themselves, which is what the product shows them.
const myApps = (page) =>
  page.evaluate(async ([url, anon]) => {
    try {
      const s = JSON.parse(localStorage.getItem('more30-auth') || 'null');
      if (!s?.access_token) return null;
      const r = await fetch(url + '/rest/v1/rpc/more30_my_apps', {
        method: 'POST',
        headers: { apikey: anon, Authorization: 'Bearer ' + s.access_token, 'content-type': 'application/json' },
        body: '{}',
      });
      if (!r.ok) return null;
      return (await r.json()).map((a) => a.app_key);
    } catch { return null; }
  }, [SUPABASE, ANON]);

const browser = await chromium.launch({ executablePath: EXE, headless: true });
console.log('=== does arriving at a system record you as its customer? ===');

for (const mount of MOUNTS) {
  const wanted = mount.replace(/^\/|\/$/g, '');
  let creds;
  try {
    creds = await newCustomer();
  } catch (e) {
    ok(`${mount}: could create a customer`, false, e.message);
    continue;
  }

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' });
  const page = await ctx.newPage();

  try {
    await page.goto(`${ORIGIN}/login?from=${encodeURIComponent(LOGIN_FROM)}`, {
      waitUntil: 'domcontentloaded', timeout: 90000,
    });
    await page.waitForTimeout(2500);
    await (await page.$('input[autocomplete="username"]')).fill(creds.email);
    await (await page.$('input[type=password]')).fill(creds.password);
    await (await page.$('button[type=submit], form button')).click();
    await page.waitForTimeout(8000);
    if (await page.$('#onboard:not([hidden])')) {
      await (await page.$('#fullName')).fill('לקוח בדיקה');
      await (await page.$('#saveName')).click();
      await page.waitForTimeout(8000);
    }

    // The control: this customer must NOT be a member of the mount under test
    // yet. Without it, a pass proves nothing — the membership could have come
    // from the login.
    const before = await myApps(page);
    ok(
      `${mount}: not a customer of it before arriving`,
      Array.isArray(before) && !before.includes(wanted),
      before === null ? 'more30_my_apps did not answer' : `already had: ${before.join(', ')}`,
    );

    // Now the only thing that happens is the visit.
    const refused = [];
    page.on('console', (m) => {
      const t = m.text();
      if (/Content Security Policy|Refused to/i.test(t)) refused.push(t.slice(0, 160));
    });
    await page.goto(ORIGIN + mount, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(6000);

    ok(`${mount}: the pill is on the page`, !!(await page.$('more30-auth')), 'no <more30-auth> element');
    await page.screenshot({ path: `QA/platform/pill-join-${wanted}.png` });
    ok(`${mount}: nothing on the page is refused by policy`, refused.length === 0, refused[0]);

    const after = await myApps(page);
    ok(
      `${mount}: the visit alone recorded the membership`,
      Array.isArray(after) && after.includes(wanted),
      after === null ? 'more30_my_apps did not answer' : `memberships: ${after.join(', ') || 'none'}`,
    );

    // The same one call carries §2's decision back — is_admin and where "ניהול"
    // should point. A test customer is correctly not an admin, so what is
    // asserted is that the decision *arrives*: that is what a blocked page
    // loses, and losing it looks exactly like "this user is not an admin".
    const ctxAnswer = await page.evaluate(async ([url, anon, href]) => {
      try {
        const s = JSON.parse(localStorage.getItem('more30-auth') || 'null');
        const r = await fetch(url + '/rest/v1/rpc/more30_join_app', {
          method: 'POST',
          headers: { apikey: anon, Authorization: 'Bearer ' + s.access_token, 'content-type': 'application/json' },
          body: JSON.stringify({ p_app: href }),
        });
        return r.ok ? await r.json() : null;
      } catch (e) { return { error: String(e.message || e).slice(0, 120) }; }
    }, [SUPABASE, ANON, ORIGIN + mount]);

    ok(
      `${mount}: the answer carries the admin decision`,
      !!ctxAnswer && ctxAnswer.ok === true && typeof ctxAnswer.is_admin === 'boolean'
        && typeof ctxAnswer.admin_href === 'string' && ctxAnswer.app_key === wanted,
      ctxAnswer ? JSON.stringify(ctxAnswer).slice(0, 160) : 'no answer',
    );
  } catch (e) {
    ok(`${mount}: run completes`, false, String(e.message).slice(0, 140));
  }
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail ? 1 : 0);
