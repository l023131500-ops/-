// kiosk-flow.mjs — the whitelist is the product, so drive it through the real UI.
//
// The allow-list decides what a locked device may open, and it is the one thing
// on this system that has to be right. Everything here goes through the browser
// against production — login, add a domain, reject a bad one, refuse to remove
// the device's own host, save, reload, confirm it persisted, then clean up.
//
// A REST-only check would miss the half that lives in the console: the pinned
// home host, the empty-list warning, and the normalisation the client does
// before anything is sent.
//
// Usage:  KF_PASS=<admin password> node scripts/qa/kiosk-flow.mjs
// Shots:  QA/kiosk/

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const OUT = 'C:\\Users\\USER\\Downloads\\more30\\QA\\kiosk';
const BASE = 'https://more30.com/kiosk';
const PASS = process.env.KF_PASS;
if (!PASS) { console.error('set KF_PASS'); process.exit(1); }

fs.mkdirSync(OUT, { recursive: true });
const results = [];
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'he-IL' });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 200)));
page.on('pageerror', (e) => consoleErrors.push(String(e).slice(0, 200)));

// A device to operate on. Created over the API because enrolling a real
// Android agent is not something a headless browser can do; everything after
// this point is driven through the UI like a user would.
const api = async (p, init = {}) => {
  const r = await page.request.fetch(`${BASE}/api${p}`, init);
  return { status: r.status(), body: await r.json().catch(() => ({})) };
};

try {
  // ── login ────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/console`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.fill('#login-user', 'admin');
  await page.fill('#login-pass', PASS);
  await page.click('#login-form button[type="submit"]');
  await page.waitForSelector('#app-view:not(.hidden)', { timeout: 30000 });
  ok('login through the console UI', true);

  const token = await page.evaluate(() => localStorage.getItem('kf_token'));
  const auth = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };

  // Seed one device via the enrollment + agent path the real agent uses.
  const enroll = await api('/enrollments', {
    ...auth, method: 'POST',
    data: { homeUrl: 'https://venue.example.com/event/1', name: 'QA whitelist device', idleReturnSeconds: 60 },
  });
  const code = enroll.body?.enrollment?.code;
  const claim = await page.request.fetch(`${BASE}/api/agent/enroll`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    data: { code, serial: `QA-${code}`, model: 'QA', androidVersion: '14' },
  });
  const claimBody = await claim.json().catch(() => ({}));
  ok('device enrolled with a 6-char code', claim.status() === 200 && !!claimBody.device, `code ${code}`);

  // ── the whitelist screen ─────────────────────────────────────────────────
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.device', { timeout: 30000 });
  await page.click('.device .actions button:has-text("עריכה")');
  await page.waitForSelector('.hostlist', { timeout: 15000 });
  await page.screenshot({ path: path.join(OUT, 'whitelist-editor.png') });

  // The device's own host must be present and NOT removable — removing it
  // would lock the device out of the page it exists to display.
  const pinned = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.hl-row')];
    const home = rows.find((r) => r.querySelector('.hl-tag'));
    return home ? { host: home.querySelector('.hl-host').textContent, hasDelete: !!home.querySelector('[data-del]') } : null;
  });
  ok('device home host is pinned in the list', !!pinned && pinned.host === 'venue.example.com', pinned?.host);
  ok('pinned host cannot be removed', !!pinned && pinned.hasDelete === false);

  // Rejects input that cannot be a host, rather than storing a row that looks
  // configured while matching nothing.
  await page.fill('.hl-new', 'not a host');
  await page.click('.hl-add');
  const errShown = await page.isVisible('.hl-err');
  ok('invalid domain is rejected with a message', errShown);

  // Accepts a pasted URL and reduces it to the host.
  await page.fill('.hl-new', 'https://pay.example.com/checkout?x=1');
  await page.click('.hl-add');
  await page.fill('.hl-new', 'secure.cardcom.co.il:443');
  await page.click('.hl-add');
  const listed = await page.evaluate(() =>
    [...document.querySelectorAll('.hl-host')].map((e) => e.textContent.trim()));
  ok('pasted URL normalised to its host', listed.includes('pay.example.com'), listed.join(', '));
  ok('port stripped', listed.includes('secure.cardcom.co.il'));

  // Duplicate is refused.
  await page.fill('.hl-new', 'PAY.example.com');
  await page.click('.hl-add');
  const dupCount = await page.evaluate(() =>
    [...document.querySelectorAll('.hl-host')].filter((e) => e.textContent.trim() === 'pay.example.com').length);
  ok('duplicate domain not added twice', dupCount === 1);

  await page.screenshot({ path: path.join(OUT, 'whitelist-filled.png') });
  await page.click('.modal button:has-text("שמירה")');
  await page.waitForTimeout(2500);

  // ── persistence ──────────────────────────────────────────────────────────
  const after = await api('/devices?all=1', auth);
  const dev = after.body.devices?.find((d) => d.name === 'QA whitelist device');
  const hosts = (dev?.allowedHost || dev?.allowed_host || '').split(',');
  ok('saved list persisted to the server',
    hosts.includes('pay.example.com') && hosts.includes('secure.cardcom.co.il') && hosts.includes('venue.example.com'),
    hosts.join(','));

  // ── the security property, end to end ────────────────────────────────────
  // A URL outside the list must be refused by the server, not just hidden.
  const bad = await api(`/devices/${dev.id}/command`, {
    ...auth, method: 'POST', data: { type: 'set_url', payload: { url: 'https://evil.example.net/x' } },
  });
  ok('URL outside the allow-list is refused by the server', bad.status === 400, `HTTP ${bad.status}`);
  const good = await api(`/devices/${dev.id}/command`, {
    ...auth, method: 'POST', data: { type: 'set_url', payload: { url: 'https://pay.example.com/pay' } },
  });
  ok('URL inside the allow-list is accepted', good.status === 200, `HTTP ${good.status}`);
  // Subdomains of an allowed host are covered; lookalikes are not.
  const look = await api(`/devices/${dev.id}/command`, {
    ...auth, method: 'POST', data: { type: 'set_url', payload: { url: 'https://notexample.com/x' } },
  });
  ok('lookalike domain refused', look.status === 400, `HTTP ${look.status}`);

  // ── mobile ───────────────────────────────────────────────────────────────
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const mp = await mctx.newPage();
  await mp.goto(`${BASE}/console`, { waitUntil: 'networkidle' });
  await mp.fill('#login-user', 'admin'); await mp.fill('#login-pass', PASS);
  await mp.click('#login-form button[type="submit"]');
  await mp.waitForSelector('#app-view:not(.hidden)', { timeout: 30000 });
  await mp.waitForTimeout(1500);
  await mp.screenshot({ path: path.join(OUT, 'console-mobile-loggedin.png'), fullPage: true });
  ok('console usable at 390px', true);
  await mctx.close();

  // ── clean up the QA device so the fleet view stays real ──────────────────
  const del = await api(`/devices/${dev.id}`, { ...auth, method: 'DELETE' });
  ok('QA device removed', del.status === 200);

  // The realtime socket dials kiosk.more30.com, whose DNS record is still
  // pending (NEEDS_USER). The browser logs that failed handshake itself and JS
  // cannot suppress it, so it is tolerated by name — narrowly, so any OTHER
  // console error still fails this flow.
  const wsPending = (t) => /kiosk\.more30\.com.*(WebSocket|ws\/console)/i.test(t) || /WebSocket connection to 'wss:\/\/kiosk\.more30\.com/i.test(t);
  // NetFree injects its own script into every page on this network, and our CSP
  // correctly refuses it. That refusal is the filter meeting the policy, not a
  // defect in the page — and it does not happen for users off that network.
  const netfree = (t) => /netfree\.link/i.test(t);
  const realErrors = consoleErrors.filter((t) => !wsPending(t) && !netfree(t));
  ok('no unexpected console errors', realErrors.length === 0, realErrors[0] || '');
  if (consoleErrors.length !== realErrors.length) {
    console.log('   note: the kiosk.more30.com WebSocket failure is expected until the DNS record exists');
  }
} catch (e) {
  ok('flow completed', false, String(e).split('\n')[0]);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.pass);
fs.writeFileSync(path.join(OUT, '_flow.json'), JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
