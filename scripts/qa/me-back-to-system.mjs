/**
 * §1 asks that a customer who signs in "enters the product itself, not the
 * brochure". `customer-journey.mjs` proves the way *in*. This proves the way
 * *back* — the step after it, which nothing walked.
 *
 * A logged-in customer standing inside /bkalot opens the account menu and picks
 * "האזור האישי". /me has a button for exactly this — `#backTo`, labelled
 * "חזרה למערכת" — and it never appeared, for two independent reasons:
 *
 *   · the shared pill sent the current address with the **login** items and
 *     with nothing else, so /me was opened bare;
 *   · /me still required `more30-return-to` to start with `https://more30.com/`,
 *     the third copy of a comparison that /login and /auth/callback both stopped
 *     making once the pill switched to sending a path. And /auth/callback
 *     deletes that key the moment it uses it, so sessionStorage alone could
 *     never have carried the answer anyway.
 *
 * Nothing errors and nothing 404s — the button is simply absent — which is why
 * it survived. The only way to see it is to walk to /me the way a customer does
 * and ask whether the way back is on the screen.
 *
 *   node scripts/qa/me-back-to-system.mjs                    # production
 *   node scripts/qa/me-back-to-system.mjs --local            # this working tree
 *   node scripts/qa/me-back-to-system.mjs --local --from=/torah
 *
 * Creates one real row in auth.users, identifiable by the qa.customer+ prefix.
 * No mail is sent and no password is shared.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const SUPABASE = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

const args = process.argv.slice(2);
const LOCAL = args.includes('--local');
const FROM = (args.find((a) => a.startsWith('--from=')) ?? '--from=/bkalot').slice(7);

const PUBLIC_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../portal/public',
);

let pass = 0;
let fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

/**
 * Production is a deploy behind the working tree whenever the Vercel quota is
 * spent (core.issues #83), so `--local` serves portal/public as-is. Same files
 * the deploy would upload, same assertions — the only difference is the origin.
 */
function serveLocal() {
  const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
  const server = http.createServer((req, res) => {
    let p = new URL(req.url, 'http://x').pathname;
    if (p === '/me') p = '/me.html';
    if (p === '/') p = '/showcase.html';
    const file = path.join(PUBLIC_DIR, p);
    if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'text/plain' });
    res.end(fs.readFileSync(file));
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

async function newCustomer() {
  const email = `qa.customer+${Date.now()}${Math.floor(Math.random() * 1000)}@more30.com`;
  const password = `Qa!${Math.random().toString(36).slice(2, 10)}A9`;
  const r = await fetch(`${SUPABASE}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, data: { full_name: 'לקוח בדיקה' } }),
  });
  if (!r.ok) throw new Error(`signup failed: HTTP ${r.status} ${await r.text()}`);
  const s = await r.json();
  if (!s.access_token) throw new Error('signup returned no session (email confirmation on?)');
  return s;
}

const server = LOCAL ? await serveLocal() : null;
const BASE = LOCAL ? `http://127.0.0.1:${server.address().port}` : 'https://more30.com';
console.log(`=== /me — is there a way back into the system? ===\nbase: ${BASE}\n`);

const browser = await chromium.launch({ executablePath: EXE, headless: true });

// ── half one: does the pill even send the address? ─────────────────────────
// Read as text rather than driven in a page: the menu is built inside a shadow
// root only after the server answers who you are, and the question here is
// about the href the file constructs, which the source states outright.
try {
  const js = await (await fetch(`${BASE}/auth-button.js`)).text();
  const me = /item\(\s*ME_URL([^,]*),\s*USER_ICON/.exec(js)?.[1]?.trim() ?? '(not found)';
  ok(
    'the account menu sends the current address to /me',
    /\?from=['"]?\s*\+\s*back/.test(me),
    `"האזור האישי" href is ME_URL${me}`,
  );
} catch (e) {
  ok('auth-button.js is readable', false, e.message);
}

// ── half two: standing on /me, is the button on the screen? ────────────────
try {
  const session = await newCustomer();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' });
  // supabase-js reads the session from this key on load; seeding it is the same
  // state a real login leaves behind, without driving the form a second time.
  await ctx.addInitScript(
    ([key, value]) => { try { localStorage.setItem(key, value); } catch {} },
    ['more30-auth', JSON.stringify(session)],
  );
  const page = await ctx.newPage();

  await page.goto(`${BASE}/me?from=${encodeURIComponent(FROM)}`, {
    waitUntil: 'domcontentloaded', timeout: 90000,
  });
  await page.waitForSelector('#content:not([hidden])', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const signedIn = !!(await page.$('#content:not([hidden])'));
  ok('the personal area loaded as a signed-in customer', signedIn, 'still on the anonymous view');

  const back = await page.$('#backTo:not([hidden])');
  const href = back ? await back.getAttribute('href') : null;
  ok(
    `"חזרה למערכת" is on the screen after arriving from ${FROM}`,
    !!back,
    'the button exists in the page and stayed hidden',
  );
  ok(
    `and it points at ${FROM}`,
    !!href && new URL(href, BASE).pathname === FROM,
    `href = ${href}`,
  );

  await page.screenshot({ path: `QA/platform/me-back-${LOCAL ? 'local' : 'prod'}.png`, fullPage: true });
  await ctx.close();
} catch (e) {
  ok('the walk to /me completes', false, String(e.message).slice(0, 160));
}

await browser.close();
server?.close();
console.log(`\n${pass} pass · ${fail} fail`);
process.exit(fail ? 1 : 0);
