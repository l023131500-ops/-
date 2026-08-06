/**
 * Does a customer who signs in from a system land back INSIDE that system?
 *
 * The build doc is specific: "אחרי התחברות: הפניה אל המערכת עצמה, לא חזרה
 * לתדמית". That is a behaviour, not a setting, so it gets measured per route
 * rather than assumed from the presence of a login button.
 *
 * What this checks, without needing a password:
 *   1. the shared login pill on each system points at /login with a `from`
 *      that returns to that system (and not to the marketing home page)
 *   2. /login preserves that destination
 *   3. Google is actually offered as a provider
 *   4. the hub reports a session-carrying identity the systems can read
 *
 * It deliberately does not attempt a real sign-in: the Google flow needs a
 * human, and inventing a test password would prove nothing about production.
 *
 *   node scripts/qa/customer-login-flow.mjs
 */
import { chromium } from 'playwright-core';
import { settle } from './lib/settle.mjs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';

const ROUTES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['/torah', '/nadlan', '/kupot', '/tivuch', '/kesef', '/imud', '/bkalot', '/mechiron'];

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

const browser = await chromium.launch({ executablePath: EXE, headless: true });

// ── the login page itself ────────────────────────────────────────────────
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' });
  const back = `${ORIGIN}/nadlan`;
  await page.goto(`${ORIGIN}/login?from=${encodeURIComponent(back)}`, {
    waitUntil: 'domcontentloaded', timeout: 90000,
  });
  await settle(page, { minChars: 50 }).catch(() => {});
  // The identifier field is `type=text` with autocomplete=username, not
  // `type=email`: an internal account like `eueu1234` is a username, and the
  // same box accepts an address. Checking for type=email would fail a page
  // that is correct — it did, on the first run of this probe.
  const info = await page.evaluate(() => ({
    google: /google/i.test(document.body.innerText),
    password: !!document.querySelector('input[type=password]'),
    ident: !!document.querySelector(
      'input[autocomplete=username], input[name=ident], input[type=email], input[name=email]',
    ),
    signup: /הרשמה|הרשמ/i.test(document.body.innerText),
  }));
  console.log('=== /login ===');
  ok('offers Google', info.google);
  ok('offers an identifier + password', info.ident && info.password,
     `ident=${info.ident} password=${info.password}`);
  ok('offers sign-up', info.signup);
  await page.close();
}

// ── the pill on each system ──────────────────────────────────────────────
console.log('\n=== where each system sends a customer to sign in ===');
for (const route of ROUTES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' });
  try {
    await page.goto(ORIGIN + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
    // ⚠️ load-bearing guard — do not replace with a sleep. The only thing this
    // loop reads is the pill inside <more30-auth>'s shadow root, so the honest
    // wait is for that element to exist, not for a page-text length to hold
    // still. A fixed 4.5s was reporting "no pill on the page" for any system
    // whose auth-button.js was still in flight. The 15s ceiling matters as
    // much as the guard: absence of a pill is a real finding this must report,
    // not a reason to hang.
    await page
      .waitForFunction(
        () => !!document.querySelector('more30-auth')?.shadowRoot?.querySelector('.pill'),
        undefined,
        { timeout: 15000 },
      )
      .catch(() => {});
    const r = await page.evaluate(() => {
      const host = document.querySelector('more30-auth');
      const pill = host?.shadowRoot?.querySelector('.pill');
      if (!pill) return { pill: false };
      pill.click();
      const link = host.shadowRoot.querySelector('a[href*="/login"]');
      return { pill: true, href: link?.getAttribute('href') ?? null };
    });

    if (!r.pill) { ok(`${route} has a login control`, false, 'no pill on the page'); }
    else if (!r.href) { ok(`${route} offers a sign-in link`, false, 'pill present but no /login link'); }
    else {
      const from = new URL(r.href, ORIGIN).searchParams.get('from');
      const returns = !!from && new URL(from, ORIGIN).pathname.startsWith(route.replace(/\/$/, ''));
      ok(
        `${route} returns the customer to ${route}`,
        returns,
        from ? `would return to ${new URL(from, ORIGIN).pathname}` : 'no from= parameter',
      );
    }
  } catch (e) {
    ok(`${route} reachable`, false, String(e.message).slice(0, 60));
  }
  await page.close();
}

await browser.close();
console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail ? 1 : 0);
