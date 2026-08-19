/**
 * The board hands out an address per system. Does the address serve an admin
 * screen?
 *
 * §3 asks the super-admin board for a "נהל מערכת זו" link per system, and
 * 0025 + admin-systems-entry.mjs settled where that link points: the recorded
 * core.projects.admin_url, resolved under the system's own mount for a relative
 * address. Both of those measure the href. Neither one opens it.
 *
 * That gap matters here specifically, because every system on more30.com is
 * path-mounted behind a rewrite: an address that leads nowhere still answers
 * 200 with the system's landing page, so a status-code probe passes on a link
 * that never reaches an admin screen.
 *
 * So this measures two things per entry, against production:
 *   1. HTTP — status, redirect chain, byte length, and whether the body is
 *      byte-identical to the system's public root.
 *   2. Render — the page is opened in a browser alongside the system root, and
 *      the visible text of both is compared. An SPA that routes on the client
 *      legitimately serves the same bytes at both addresses and still renders
 *      two different screens; only the render tells those apart.
 *
 * An entry that renders exactly what the system's public root renders is not
 * automatically broken, and the first pass of this script called it broken:
 * /gesher/auth matched /gesher/ because gesher's root IS its sign-in gate, so
 * the link arrives exactly where it should. What separates that from a link
 * that landed on a marketing page is whether the screen asks anyone to sign in.
 * So an identical render is split in two, and only one half is a finding:
 *
 *   distinct_screen        the entry reaches a screen the root does not show
 *   same_render_but_gated  identical to the root, and the root is itself the gate
 *   same_render_no_gate    identical to the root, and nothing there asks to sign in
 *
 *
 *   node scripts/qa/admin-entry-resolves.mjs
 */
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const OUT = 'QA/platform/admin-entry-resolves-0807';
const ORIGIN = 'https://more30.com';

/**
 * The rows core.projects records with a clickable entry and an own/hub gate —
 * exactly the set more30_admin_systems_report hands to the board (0038 lines
 * 131-136). Read from the database on 07/08/2026; not invented.
 */
const ENTRIES = [
  { app: 'bkalot',   admin_url: 'https://more30.com/admin/rights',      auth: 'hub' },
  { app: 'chatzor',  admin_url: '/admin',                              auth: 'hub' },
  { app: 'egod',     admin_url: '/admin',                              auth: 'hub' },
  { app: 'galil',    admin_url: '/gabai',                              auth: 'own' },
  { app: 'gesher',   admin_url: '/auth',                               auth: 'own' },
  { app: 'kiosk',    admin_url: 'https://more30.com/kiosk/console',    auth: 'own' },
  { app: 'mechiron', admin_url: '/admin',                              auth: 'own' },
  { app: 'modaot',   admin_url: '/admin',                              auth: 'own' },
  { app: 'nadlan',   admin_url: '/admin',                              auth: 'hub' },
  { app: 'tamlul',   admin_url: '/admin',                              auth: 'own' },
  { app: 'tivuch',   admin_url: '/app',                                auth: 'own' },
  { app: 'torah',    admin_url: '/admin',                              auth: 'own' },
  { app: 'zchuyot',  admin_url: '/admin/login',                        auth: 'own' },
];

// The same resolution the board applies (portal/public/admin-systems.html,
// adminEntry): absolute is left alone, relative hangs under the system's mount.
const resolve = (e) =>
  e.admin_url.startsWith('http') ? e.admin_url : `${ORIGIN}/${e.app}${e.admin_url}`;

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);
const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();

/**
 * Does this screen ask anyone to identify themselves?
 *
 * The first version of this test accepted the bare word "ניהול", and mechiron
 * passed on it: its entry renders the bkalot marketing page, whose nav carries
 * "ניהול פיננסי", and a link that lands on another system's marketing page was
 * reported as a working gate. So the marker has to be something only a sign-in
 * asks for — a credential prompt — and not a word a nav bar can supply.
 */
const GATE = /סיסמה|התחברות|התחבר עם|password|sign ?in|log ?in/i;

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ locale: 'he-IL', viewport: { width: 1280, height: 900 } });

/** Fetch once and report both what the wire said and what the browser drew. */
const look = async (url) => {
  const page = await ctx.newPage();
  const wire = { url, status: null, final_url: null, bytes: null, body_sha: null };
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    wire.status = resp ? resp.status() : null;
    wire.final_url = page.url();
    const body = resp ? await resp.text() : '';
    wire.bytes = body.length;
    wire.body_sha = sha(body);
  } catch (err) {
    wire.error = String(err.message || err).slice(0, 160);
    await page.close();
    return { wire, render: null, page: null };
  }
  // Client-side routers need a beat before the screen they route to exists.
  await page.waitForTimeout(2500);
  const render = await page.evaluate(() => ({
    title: document.title,
    h1: (document.querySelector('h1')?.innerText || '').trim().slice(0, 120),
    text: (document.body?.innerText || '').replace(/\s+/g, ' ').trim(),
  })).catch(() => null);
  return { wire, render, page };
};

console.log('\nthe recorded admin entry, opened against production\n');

const rows = [];
for (const e of ENTRIES) {
  const entryUrl = resolve(e);
  const rootUrl = `${ORIGIN}/${e.app}/`;

  const entry = await look(entryUrl);
  const root = await look(rootUrl);

  const sameBytes = !!entry.wire.body_sha && entry.wire.body_sha === root.wire.body_sha;
  const entryText = norm(entry.render?.text);
  const rootText = norm(root.render?.text);
  const sameRender = !!entryText && entryText === rootText;

  const gated = GATE.test(entryText);

  let verdict;
  if (entry.wire.error) verdict = 'unreachable';
  else if (entry.wire.status >= 400) verdict = `http_${entry.wire.status}`;
  else if (!entryText) verdict = 'renders_nothing';
  else if (sameRender) verdict = gated ? 'same_render_but_gated' : 'same_render_no_gate';
  else verdict = 'distinct_screen';

  if (entry.page) {
    await entry.page.screenshot({ path: `${OUT}/${e.app}-entry.png`, fullPage: false })
      .catch(() => {});
    await entry.page.close();
  }
  if (root.page) await root.page.close();

  const row = {
    app: e.app, admin_auth: e.auth, recorded: e.admin_url,
    entry_url: entryUrl, root_url: rootUrl,
    status: entry.wire.status, final_url: entry.wire.final_url,
    entry_bytes: entry.wire.bytes, root_bytes: root.wire.bytes,
    same_bytes: sameBytes,
    entry_h1: entry.render?.h1 ?? null, root_h1: root.render?.h1 ?? null,
    entry_text_len: entryText.length, root_text_len: rootText.length,
    same_render: sameRender,
    asks_to_sign_in: gated,
    entry_text: entryText.slice(0, 400),
    verdict,
    error: entry.wire.error ?? null,
  };
  rows.push(row);
  console.log(
    `  ${verdict.padEnd(16)} ${e.app.padEnd(10)} ${entryUrl}` +
    (sameBytes ? '  [same bytes as root]' : ''));
}

// Only same_render_no_gate is a finding. An entry whose screen asks to sign in
// has done its job whether or not the root shows the same thing.
const findings = rows.filter((r) => r.verdict === 'same_render_no_gate'
                                 || r.verdict === 'unreachable'
                                 || r.verdict === 'renders_nothing'
                                 || r.verdict.startsWith('http_'));

await writeFile(`${OUT}/_results.json`, JSON.stringify({
  at: new Date().toISOString(),
  origin: ORIGIN,
  measured: 'production, logged out',
  entries: rows.length,
  by_verdict: rows.reduce((a, r) => ({ ...a, [r.verdict]: (a[r.verdict] || 0) + 1 }), {}),
  findings: findings.map((r) => ({ app: r.app, entry_url: r.entry_url, verdict: r.verdict })),
  rows,
}, null, 2));

await browser.close();
console.log(`\n  ${rows.length - findings.length} of ${rows.length} entries arrive somewhere that asks to sign in or differs from the root`);
console.log(`  ${findings.length} do not: ${findings.map((r) => r.app).join(', ') || '—'}`);
console.log(`  results: ${OUT}/_results.json\n`);
