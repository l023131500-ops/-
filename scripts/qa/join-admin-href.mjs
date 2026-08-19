/**
 * Where does the account menu's "ניהול" item actually point?
 *
 * more30-priority.md §2 asks for a "כניסה לניהול" button, and §3 asks every
 * system card for a "נהל מערכת זו" link. Four functions have an opinion on that
 * address. Three of them agree on one rule, written out separately in each:
 *
 *     admin_auth in ('own','hub')  AND  admin_url ~ '^(/|https?://)\S*$'
 *
 * and whatever fails it gets **null, not a substitute link** —
 * more30_admin_systems_report even says so inside its own field dictionary.
 *
 * The fourth, more30_join_app, is the only one that runs on every page load of
 * every system (auth-button.js calls it with location.href), and it was the one
 * that never got the rule: no admin_auth check, no shape check, and instead of
 * null it returned 'https://more30.com/admin'. So on seven live public systems
 * the menu drew two items at the same address — "ניהול · ניהול <system>" and
 * "מרכז השליטה · כל המערכות במקום אחד" — the first carrying the name of a
 * system it does not open. On kupot it built an href out of a Hebrew note.
 *
 * Migration 0037 gives join_app the same rule via core.app_admin_href(), and
 * auth-button.js drops its own `|| ADMIN_URL` fallback. This measures both
 * halves, because either one alone still produces the wrong menu:
 *
 *   1. the live RPC, with a real signed-in account, over every live public
 *      mount — the href it hands back, against core.projects itself.
 *   2. the menu that this commit's auth-button.js draws from that answer, with
 *      the RPC stubbed to a super-admin on a system with a screen and on one
 *      without. A test customer is never a super-admin, so the item cannot be
 *      reached any other way, and it is the item under test.
 *
 *   node scripts/qa/join-admin-href.mjs
 *
 * Creates real rows in auth.users (prefix qa.adminhref+) and real memberships
 * in core.app_memberships — the same rows any visitor creates by arriving.
 * Reads only. Nothing here can charge or send.
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const SUPABASE = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

const PORT = 5219;
const OUT = 'QA/platform/join-admin-href-0807';

// The eight measured on 07/08 against core.projects: seven with no admin screen
// at all, and kupot whose admin_url is a prose note about an API header.
const NO_SCREEN = ['briut', 'chizukim', 'imud', 'kesef', 'orech', 'smel', 'studio', 'kupot'];

let pass = 0, fail = 0;
const results = [];
const ok = (n, c, d) => {
  results.push({ name: n, pass: !!c, detail: c ? null : (d ?? null) });
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

async function signup() {
  const email = `qa.adminhref+${Date.now()}${Math.floor(Math.random() * 1000)}@more30.com`;
  const password = `Qa!${Math.random().toString(36).slice(2, 10)}A9`;
  const r = await fetch(`${SUPABASE}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`signup failed: HTTP ${r.status}`);
  const d = await r.json();
  if (d.access_token) return { email, session: d };
  const t = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!t.ok) throw new Error(`login failed: HTTP ${t.status}`);
  return { email, session: await t.json() };
}

async function rpc(fn, body, token) {
  const r = await fetch(`${SUPABASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${token || ANON}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* left null on purpose */ }
  return { status: r.status, json, text };
}

console.log('=== the account menu\'s "ניהול" — does it open this system, or the control center? ===');

await mkdir(OUT, { recursive: true });

// ── the register itself, so the assertions below are measured and not listed.
// more30_public_systems is the same view the home page and the sitemap read —
// the mounts a visitor can actually arrive at, and therefore the exact set on
// which the pill calls join_app.
const listRes = await fetch(
  `${SUPABASE}/rest/v1/more30_public_systems?select=path,live&order=number`,
  { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
const publicList = (await listRes.json())
  .filter((s) => s.path && s.live !== false)
  .map((s) => s.path);

ok('the live public mounts are readable', publicList.length >= 15,
   `${publicList.length} mounts`);

const me = await signup();
const token = me.session.access_token;
console.log(`        customer: ${me.email}  ·  ${publicList.length} mounts`);

const rows = [];
for (const path of publicList) {
  const j = (await rpc('more30_join_app', { p_app: `https://more30.com/${path}/` }, token)).json;
  rows.push({ path, app_key: j?.app_key, admin_href: j?.admin_href ?? null,
              has_system_admin: j?.has_system_admin ?? null,
              admin_reason: j?.admin_reason ?? null, ok: j?.ok });
}

ok('every mount answers', rows.every((r) => r.ok === true && r.app_key === r.path),
   rows.filter((r) => r.ok !== true || r.app_key !== r.path).map((r) => r.path).join(', '));

// ── 1. no system is ever handed the control center as if it were its own.
const substituted = rows.filter((r) => r.admin_href === 'https://more30.com/admin');
ok('no system is handed https://more30.com/admin as its own admin screen',
   substituted.length === 0, substituted.map((r) => r.path).join(', '));

// ── 2. the eight measured as having none get null, and say why.
const wrongNulls = rows.filter((r) => NO_SCREEN.includes(r.path) && r.admin_href !== null);
ok(`the ${NO_SCREEN.length} systems with no reachable admin screen get null`,
   wrongNulls.length === 0,
   wrongNulls.map((r) => `${r.path}=${r.admin_href}`).join(' · '));

const kupot = rows.find((r) => r.path === 'kupot');
ok('kupot — an API endpoint behind a header — is not dressed up as a page',
   kupot ? kupot.admin_href === null && kupot.admin_reason === 'api_only' : false,
   kupot ? `${kupot.admin_href} / ${kupot.admin_reason}` : 'kupot not in the list');

const silent = rows.filter((r) => r.admin_href === null && !r.admin_reason);
ok('a null href always carries the reason it is null', silent.length === 0,
   silent.map((r) => r.path).join(', '));

ok('has_system_admin agrees with the href on every row',
   rows.every((r) => r.has_system_admin === (r.admin_href !== null)),
   rows.filter((r) => r.has_system_admin !== (r.admin_href !== null)).map((r) => r.path).join(', '));

// ── 3. what is returned is a URL, and it belongs to the system that was asked.
const shaped = rows.filter((r) => r.admin_href !== null);
const malformed = shaped.filter((r) => {
  try { const u = new URL(r.admin_href); return u.protocol !== 'https:' || /\s/.test(r.admin_href); }
  catch { return true; }
});
ok('every href that is returned is a well-formed https URL without spaces',
   malformed.length === 0, malformed.map((r) => `${r.path}=${r.admin_href}`).join(' · '));
ok('and it is the address of the system that was asked about',
   shaped.every((r) => r.admin_href.includes('/' + r.path + '/') || r.admin_href.includes('/admin/rights')),
   shaped.filter((r) => !r.admin_href.includes('/' + r.path + '/')
                     && !r.admin_href.includes('/admin/rights'))
         .map((r) => `${r.path}=${r.admin_href}`).join(' · '));
ok('the systems that do have a screen still get one', shaped.length >= 10,
   `${shaped.length} with an admin screen`);

// ── 4. the menu this commit draws from that answer.
const host = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<title>QA — תפריט החשבון</title>
<style>body{margin:0;background:#0e1220;color:#e8ecf5;font:16px system-ui;min-height:100vh}
h1{font-size:17px;padding:18px 22px 0;margin:0;font-weight:600;opacity:.85}</style>
</head><body><h1>QA — פריטי הניהול בתפריט החשבון</h1>
<script src="/auth-button.js" defer></script></body></html>`;
await writeFile('portal/public/_qa-authmenu.html', host, 'utf8');

const server = spawn(process.execPath, ['scripts/qa/_serve-static.mjs', 'portal/public', String(PORT)],
  { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch({ executablePath: EXE });

async function menuFor(ctx, shot) {
  const c = await browser.newContext({ locale: 'he-IL', viewport: { width: 900, height: 700 } });
  const page = await c.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('more30-auth', JSON.stringify({
      access_token: 'qa', refresh_token: 'qa', token_type: 'bearer',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { email: 'l023131500@gmail.com', user_metadata: { full_name: 'מנהל בדיקה' } },
    }));
  });
  // The answer is stubbed on purpose: a test account can never be a super-admin,
  // and the item under test is only drawn for one.
  await page.route('**/rest/v1/rpc/more30_join_app', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ctx) }));
  await page.goto(`http://127.0.0.1:${PORT}/_qa-authmenu.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.click('more30-auth >> .pill');
  await page.waitForTimeout(250);
  const items = await page.evaluate(() =>
    [...document.querySelector('more30-auth').shadowRoot.querySelectorAll('.menu a')]
      .map((a) => ({ href: a.getAttribute('href'), text: a.textContent.replace(/\s+/g, ' ').trim() })));
  await page.screenshot({ path: `${OUT}/${shot}` });
  await c.close();
  return items;
}

const base = { ok: true, is_admin: true, is_super_admin: true, plan: 'free', full_name: 'מנהל בדיקה' };

const withScreen = await menuFor(
  { ...base, app_key: 'torah', app_name: 'פלטפורמת איגוד השיעורים',
    admin_href: 'https://more30.com/torah/admin', has_system_admin: true, admin_reason: 'own' },
  'menu-with-screen.png');
const noScreen = await menuFor(
  { ...base, app_key: 'kesef', app_name: 'כסף — שקיפות תקציבית',
    admin_href: null, has_system_admin: false, admin_reason: 'no_admin_screen' },
  'menu-no-screen.png');

const manageItem = (items) => items.find((i) => /^ניהול(?!\s*המערכות)/.test(i.text));
const hubItems = (items) => items.filter((i) => i.href === 'https://more30.com/admin');

ok('a system with a screen still draws "ניהול", at its own address',
   manageItem(withScreen)?.href === 'https://more30.com/torah/admin',
   JSON.stringify(manageItem(withScreen)));
ok('and that menu names the system it opens',
   /פלטפורמת איגוד השיעורים/.test(manageItem(withScreen)?.text || ''),
   manageItem(withScreen)?.text);

ok('a system with no screen draws no "ניהול" item at all',
   !manageItem(noScreen),
   JSON.stringify(manageItem(noScreen)));
ok('so the control center appears once in that menu, not twice',
   hubItems(noScreen).length === 1,
   hubItems(noScreen).map((i) => i.text).join(' | '));
ok('and the one that remains is the one that says what it is',
   /מרכז השליטה/.test(hubItems(noScreen)[0]?.text || ''),
   hubItems(noScreen)[0]?.text);
ok('the super-admin still reaches every board from there',
   noScreen.filter((i) => (i.href || '').startsWith('https://more30.com/admin')).length >= 8,
   `${noScreen.filter((i) => (i.href || '').startsWith('https://more30.com/admin')).length} board links`);

await browser.close();
server.kill();
// portal/public is what gets deployed — the host page is scaffolding and must
// not survive the run.
await rm('portal/public/_qa-authmenu.html', { force: true });

await writeFile(`${OUT}/_results.json`, JSON.stringify({
  measured_at: new Date().toISOString(),
  customer: me.email,
  mounts: publicList.length,
  rows,
  menu_with_screen: withScreen,
  menu_no_screen: noScreen,
  checks: results,
  passed: pass, failed: fail,
}, null, 2), 'utf8');

console.log(`\n${pass} passed · ${fail} failed   (${OUT}/)`);
process.exit(fail ? 1 : 0);
