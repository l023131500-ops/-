/**
 * Does signing in from a system actually put you inside that system?
 *
 * more30-priority.md §1 is blunt about this: whoever registers or logs in
 * "enters the product itself as a full customer — not the brochure". It was not
 * true. The login pill sends `?from=/bkalot`, a path, while both /login and
 * /auth/callback only accepted a value starting with `https://more30.com/`. The
 * condition never held, `more30-return-to` was never stored, and every customer
 * who signed in from a product landed on /me instead.
 *
 * Nothing errored, nothing 404'd, and the login itself worked perfectly — which
 * is why it survived. Only walking the whole journey catches it, so this walks
 * it: a brand-new account per system, created through the public signup
 * endpoint like any real customer, then the real login form, then the real
 * onboarding step, and finally the question that matters — where did we end up.
 *
 *   node scripts/qa/customer-journey.mjs                # default systems
 *   node scripts/qa/customer-journey.mjs /kupot /torah
 *
 * Creates real rows in auth.users. They are harmless (no password shared, no
 * mail sent) and identifiable by the qa.customer+ prefix.
 */
import { chromium } from 'playwright-core';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const SUPABASE = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

/**
 * §1 says "אמת בכל מערכת עם משתמש בדיקה" — verify in EVERY system. The default
 * used to be three mounts, so eighteen systems were never walked at all and the
 * report still read as a pass. These are the live, public_visible mounts from
 * core.projects; the list is written out rather than queried because every other
 * QA script here does the same (see probe-all.mjs) and because a list that reads
 * itself from the database cannot fail loudly when the database is the thing
 * that drifted.
 */
const PUBLIC_MOUNTS = [
  '/torah', '/tamlul', '/modaot', '/imud', '/briut', '/bkalot', '/smel',
  '/egod', '/chatzor', '/chizukim', '/orech', '/zchuyot', '/galil', '/studio',
  '/mechiron', '/kupot', '/nadlan', '/kesef', '/kiosk', '/tivuch',
];

const TARGETS = process.argv.slice(2).length ? process.argv.slice(2) : PUBLIC_MOUNTS;

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

/**
 * The other half of the requirement: "Google **or** immediate registration
 * (name · phone · email · password) → straight into the product".
 *
 * The API signup above skips the form entirely, so it proves the login path but
 * says nothing about registration. This drives the actual sign-up form, which
 * is the only way to catch a missing field or a validation that rejects a real
 * number — and the phone field did not exist at all until this was written.
 */
async function registerThroughForm(browser, target) {
  const email = `qa.customer+${Date.now()}${Math.floor(Math.random() * 1000)}@more30.com`;
  const password = `Qa!${Math.random().toString(36).slice(2, 10)}A9`;
  const page = await (await browser.newContext({
    viewport: { width: 1280, height: 900 }, locale: 'he-IL',
  })).newPage();

  await page.goto(
    `https://more30.com/login?mode=signup&from=${encodeURIComponent(target)}`,
    { waitUntil: 'domcontentloaded', timeout: 90000 },
  );
  await page.waitForTimeout(2500);

  const phoneField = await page.$('#phone');
  ok('signup form asks for a phone', !!phoneField, 'no #phone field on the form');
  if (!phoneField) { await page.close(); return null; }

  await (await page.$('#fullName')).fill('לקוח בדיקה');
  await phoneField.fill('0501234567');
  await (await page.$('#ident')).fill(email);
  await (await page.$('#password')).fill(password);
  await (await page.$('button[type=submit]')).click();
  await page.waitForTimeout(9000);

  // No intermediate step may ask again for what was just typed.
  const askedAgain = !!(await page.$('#onboard:not([hidden])'));
  ok('no second screen asks for the name again', !askedAgain, 'onboarding shown after full signup');
  if (askedAgain) {
    await (await page.$('#fullName')).fill('לקוח בדיקה');
    await (await page.$('#saveName')).click();
    await page.waitForTimeout(7000);
  }

  const landed = new URL(page.url()).pathname;
  ok(`registration lands in ${target}`, landed.startsWith(target), `landed on ${landed}`);
  await page.close();
  return email;
}

const browser = await chromium.launch({ executablePath: EXE, headless: true });
console.log('=== customer journey — does login land inside the product? ===');

for (const target of TARGETS) {
  let creds;
  try {
    creds = await newCustomer();
  } catch (e) {
    ok(`${target}: could create a customer`, false, e.message);
    continue;
  }

  const page = await (await browser.newContext({
    viewport: { width: 1280, height: 900 }, locale: 'he-IL',
  })).newPage();

  try {
    await page.goto(`https://more30.com/login?from=${encodeURIComponent(target)}`, {
      waitUntil: 'domcontentloaded', timeout: 90000,
    });
    await page.waitForTimeout(2500);

    // The username field is type=text with autocomplete=username on purpose —
    // the platform allows a username as well as an email, so looking for
    // input[type=email] finds nothing and fails a page that is correct.
    await (await page.$('input[autocomplete="username"]')).fill(creds.email);
    await (await page.$('input[type=password]')).fill(creds.password);
    await (await page.$('button[type=submit], form button')).click();
    await page.waitForTimeout(8000);

    // First-time customers are asked for a full name before continuing. That is
    // part of the journey, not an obstacle to route around.
    if (await page.$('#onboard:not([hidden])')) {
      await (await page.$('#fullName')).fill('לקוח בדיקה');
      await (await page.$('#saveName')).click();
      await page.waitForTimeout(8000);
    }

    const landed = new URL(page.url()).pathname;
    ok(`${target}: lands back in the product`, landed.startsWith(target), `landed on ${landed}`);

    // Being returned is half of it; being a member of *this* system is the
    // other half, and it is what stops one signup granting every product.
    const authed = await page.evaluate(() => {
      try { return !!localStorage.getItem('more30-auth'); } catch { return false; }
    });
    ok(`${target}: session survives the round trip`, authed, 'no session in storage');

    // …and until now nothing checked that the membership was actually written.
    // callback.html calls more30_join_app inside a try/catch that swallows every
    // failure on purpose — membership is a record, not a gate — so a customer
    // can land in the product, look completely signed in, and not be a customer
    // of it. That failure is silent by design, which is exactly why it needs an
    // assertion. Asked as the user, through more30_my_apps.
    const joined = await page.evaluate(async ([url, anon]) => {
      try {
        const s = JSON.parse(localStorage.getItem('more30-auth') || 'null');
        if (!s?.access_token) return null;
        const r = await fetch(url + '/rest/v1/rpc/more30_my_apps', {
          method: 'POST',
          headers: {
            apikey: anon,
            Authorization: 'Bearer ' + s.access_token,
            'content-type': 'application/json',
          },
          body: '{}',
        });
        if (!r.ok) return null;
        return (await r.json()).map((a) => a.app_key);
      } catch { return null; }
    }, [SUPABASE, ANON]);

    const wanted = target.replace(/^\/|\/$/g, '');
    ok(
      `${target}: recorded as a customer of this system`,
      Array.isArray(joined) && joined.includes(wanted),
      joined === null ? 'more30_my_apps did not answer' : `memberships: ${joined.join(', ') || 'none'}`,
    );
  } catch (e) {
    ok(`${target}: journey completes`, false, String(e.message).slice(0, 120));
  }
  await page.close();
}

console.log('\n=== immediate registration through the real form ===');
await registerThroughForm(browser, TARGETS[0]);

await browser.close();
console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail ? 1 : 0);
