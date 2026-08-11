// The **customer console's** mobile navigation. 2026-08-11.
//
// `apps/35-kioskfleet/STATUS.md` item 7 ends on this, and states it as a scope
// line rather than a keyboard question: "`console.html` has its own navigation,
// `.side`, and it is `display: none` below 800px with nothing behind it either
// — so the customer console has no mobile navigation for exactly the reason the
// marketing page did not, and nobody has measured what that leaves reachable on
// a phone."
//
// This run measures that and closes it. What was behind `display: none` is more
// than the marketing page had behind its own: the seven view buttons, the signed
// in name, the device quota **and התנתקות**. So on a phone whoever logged in
// landed on המכשירים שלי and could not change screen or sign out at all — the
// controls were absent from the layout, from the tab order and from the
// accessibility tree.
//
// What each group is here for, rather than assumed:
//
//   1. **the defect existed** — the shipped-before rule is re-injected into the
//      same live page and all eight controls are asserted gone. Every "before"
//      row has to pass or there was no bug.
//   2. **closed means gone** — `display: none` and not opacity, so the closed
//      panel is asserted un-tab-reachable and not merely invisible.
//   3. **the disclosure is one state** — `aria-expanded` and the painted
//      `data-open` are read separately and compared. One function writes both
//      precisely so they cannot disagree; a test that reads one cannot see them
//      disagree.
//   4. **choosing a screen closes the panel — and does not fight `route()`**.
//      This is the console's own case and the marketing page had nothing like
//      it: `focusNewScreen()` moves focus to the new screen's `<h1>`, so the
//      panel must close *without* pulling focus back to the toggle. Both halves
//      are asserted.
//   5. **the login pill** — the console reserves no room for it anywhere, and
//      the toggle now sits in the RTL top-left corner the pill is fixed to. The
//      pill is simulated at the geometry `auth-button.js` writes before its own
//      measurement (96×36, `--more30-auth-inset: 118px`), because the real
//      script is blocked from this machine; the control row removes the
//      reservation and asserts the click lands on the pill.
//   6. **the width crossing** — the open state is held on the element and the
//      rule that paints it lives inside the `max-width: 800px` block, so a page
//      resized while open has to come back to the sidebar column with the ARIA
//      cleared.
//
// Stub is `../warn-ink-0811/stub-server.mjs`, reused not copied: it already
// serves the real `server/public/` and answers `/console` with the real
// `console.html`, the real `css/style.css` and the real `js/app.js`.
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8851;
const BASE = `http://127.0.0.1:${PORT}`;

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };
const add = (r) => { rows.push(r); if (!r.ok) fail(`${r.mode} ${r.vp}: ${r.group} — ${r.what} (${r.value})`); };

const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const rgb = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
const lum = (s) => { const [r, g, b] = rgb(s); return 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// `rgb()` reads decimal runs, so it parses `#7ea6ff` as [7, 6] and every ratio
// against a token comes out NaN (landing-focus-0811).
const unhex = (h) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(h).trim());
  if (!m) return h;
  const n = parseInt(m[1], 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

// `.btn` carries `transition: .15s` on all properties, `outline-width`
// included, so a computed read in the tick focus lands returns where the
// transition started (button-boundary-0811, then content-focus-0811).
const SETTLE = 260;

// The eight controls that were behind `display: none`.
const PANEL = [
  '#menu button[data-view="devices"]',
  '#menu button[data-view="links"]',
  '#menu button[data-view="clients"]',
  '#menu button[data-view="enroll"]',
  '#menu button[data-view="guide"]',
  '#menu button[data-view="settings"]',
  '#logout-btn',
];

// Reachability, not visibility: a control that is painted but out of the tab
// order is still unusable by keyboard, and one that is in the DOM but
// `display: none` is in neither.
const reachable = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return { exists: false, box: false, tabbable: false };
  const r = el.getBoundingClientRect();
  el.focus();
  return { exists: true, box: r.width > 0 && r.height > 0, tabbable: document.activeElement === el };
}, sel);

const state = (page) => page.evaluate(() => ({
  expanded: document.getElementById('side-toggle').getAttribute('aria-expanded'),
  open: document.getElementById('side-panel').dataset.open,
  painted: getComputedStyle(document.getElementById('side-panel')).display,
  toggleShown: getComputedStyle(document.getElementById('side-toggle')).display,
}));

// Press Tab until the target is focused, never a fixed count: a tab order is a
// ring and an index into a list of stops is not a number of key presses
// (nav-keyboard-0811).
async function tabTo(page, sel, max = 40) {
  for (let i = 1; i <= max; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((s) => !!document.activeElement && document.activeElement.matches(s), sel)) return i;
  }
  return 0;
}
// `blur()` alone does not move the sequential focus navigation starting point
// (screen-focus-0811, then mobile-nav-0811 from the other direction). Focusing
// the body is what does; the tabindex is taken off again so the page under test
// is left as it was, and `-1` was never a tab stop.
const resetTab = (page) => page.evaluate(() => {
  window.scrollTo(0, 0);
  document.body.setAttribute('tabindex', '-1');
  document.body.focus();
  document.body.removeAttribute('tabindex');
});

// The shared more30 pill, at the size and position `auth-button.js` writes
// before its own measurement lands: `setVars(96, 36)` with `edgeInset()` = 10
// and `GAP` = 12 below 480px, i.e. `--more30-auth-inset: 118px`.
const PILL = (page) => page.evaluate(() => {
  const d = document.createElement('div');
  d.id = 'qa-pill';
  d.style.cssText = 'position:fixed;inset-inline-end:10px;inset-block-start:8px;'
    + 'width:96px;height:36px;border-radius:999px;background:#123;z-index:2147483000';
  document.body.appendChild(d);
  document.documentElement.style.setProperty('--more30-auth-inset', '118px');
});

const hitAt = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  const r = el.getBoundingClientRect();
  const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return { hit: hit ? (hit.id || hit.className || hit.tagName) : null, isTarget: !!hit && (hit === el || el.contains(hit)) };
}, sel);

const stub = spawn(process.execPath, [STUB, String(PORT)], { stdio: 'inherit' });
const stop = () => { try { stub.kill(); } catch {} };
process.on('exit', stop);

await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch();
let n = 0;
// The tab sweeps scroll the page — `clip` is in page coordinates, so without
// this the "open panel" shot came back showing התנתקות at the top and the
// device card under it, i.e. the bottom of the panel and none of the navigation
// the shot exists to show.
const shot = async (page, name, clip) => {
  n += 1;
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(60);
  await page.screenshot({ path: `${HERE}${String(n).padStart(2, '0')}-${name}.png`, clip });
};

for (const mode of ['light', 'dark']) {
  const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 390, height: 780 }, locale: 'he-IL' });
  const page = await ctx.newPage();
  // The two off-site requests (the font, the real auth pill) are blocked from
  // this machine anyway; aborting them is the page's own fallback state and the
  // pill is injected above so its geometry is stated rather than guessed.
  await page.route('**://*.googleapis.com/**', (r) => r.abort());
  await page.route('**://*.gstatic.com/**', (r) => r.abort());
  await page.route('**://more30.com/**', (r) => r.abort());

  // `app.js` boots only when a token is in storage (`if (TOKEN) boot()`), so
  // without this the login card is what renders and the sidebar never exists.
  await page.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));
  await page.goto(`${BASE}/console`);
  await page.waitForSelector('.device', { timeout: 15000 });
  await page.waitForTimeout(SETTLE);

  const M = (group, what, value, ok, note) => add({ mode, vp: '390', group, what, value, ok, note });

  // ── 1. the defect existed ────────────────────────────────────────
  // The shipped-before rule, put back into the same live page.
  await page.addStyleTag({ content: '@media (max-width: 800px){ .side { display: none !important; } }' });
  await page.waitForTimeout(80);
  for (const sel of PANEL) {
    const r = await reachable(page, sel);
    M('before', `${sel} נעלם`, `box=${r.box} tabbable=${r.tabbable}`, r.exists && !r.box && !r.tabbable);
  }
  const beforeToggle = await reachable(page, '#side-toggle');
  M('before', 'גם הלחצן עצמו לא היה קיים', `box=${beforeToggle.box}`, !beforeToggle.box);
  await page.evaluate(() => [...document.querySelectorAll('style')].pop().remove());
  await page.waitForTimeout(80);

  // ── 2. closed ────────────────────────────────────────────────────
  let s = await state(page);
  // The declared value is `inline-flex` and the computed one is `flex`: the
  // toggle is a flex item of `.side-head`, and a flex item's `display` is
  // blockified. Reading it back as `inline-flex` is what the first version of
  // this row did, and it failed on correct CSS.
  M('closed', 'הלחצן מוצג', s.toggleShown, s.toggleShown !== 'none');
  M('closed', 'הלוח אינו מצויר', s.painted, s.painted === 'none');
  M('closed', 'ARIA וציור מסכימים', `aria-expanded=${s.expanded} data-open=${s.open}`, s.expanded === 'false' && s.open === 'false');
  const closedNav = await reachable(page, PANEL[0]);
  M('closed', 'פריט ניווט אינו נגיש בטאב', `tabbable=${closedNav.tabbable}`, !closedNav.tabbable);
  const tsize = await page.evaluate(() => {
    const r = document.getElementById('side-toggle').getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  M('closed', 'יעד מגע 44px (2.5.8)', `${tsize.w}×${tsize.h}`, tsize.h >= 44);

  // the focus ring on the toggle, against the navy it sits on
  await resetTab(page);
  const stops = await tabTo(page, '#side-toggle');
  M('closed', 'הלחצן נמצא במסלול הטאב', `stop #${stops}`, stops > 0);
  await page.waitForTimeout(SETTLE);
  const ring = await page.evaluate(() => {
    const cs = getComputedStyle(document.getElementById('side-toggle'));
    return { color: cs.outlineColor, style: cs.outlineStyle, width: cs.outlineWidth, bg: getComputedStyle(document.querySelector('.side')).backgroundColor };
  });
  const rr = ratio(ring.color, ring.bg);
  M('closed', 'טבעת מיקוד על ה-navy', `${ring.style} ${ring.width} ${ring.color} → ${rr.toFixed(2)}:1`,
    ring.style === 'solid' && parseFloat(ring.width) >= 2 && rr >= 3);
  await shot(page, `closed-focus-${mode}`, { x: 0, y: 0, width: 390, height: 120 });

  // ── 3. open ──────────────────────────────────────────────────────
  await page.click('#side-toggle');
  await page.waitForTimeout(120);
  s = await state(page);
  M('open', 'ARIA וציור מסכימים', `aria-expanded=${s.expanded} data-open=${s.open} display=${s.painted}`,
    s.expanded === 'true' && s.open === 'true' && s.painted === 'block');
  for (const sel of PANEL) {
    const r = await reachable(page, sel);
    M('open', `${sel} נגיש`, `box=${r.box} tabbable=${r.tabbable}`, r.box && r.tabbable);
  }
  const navSize = await page.evaluate(() => Math.round(document.querySelector('#menu button').getBoundingClientRect().height));
  M('open', 'יעד מגע של פריט ניווט', `${navSize}px`, navSize >= 44);
  await shot(page, `open-${mode}`, { x: 0, y: 0, width: 390, height: 520 });
  // order: the toggle first, then the panel's items — DOM order is tab order.
  await resetTab(page);
  const seq = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    const k = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a) return null;
      return a.id ? '#' + a.id : (a.dataset && a.dataset.view ? '[' + a.dataset.view + ']' : a.tagName);
    });
    if (seq.includes(k)) break;
    seq.push(k);
  }
  M('open', 'הלחצן לפני פריטי הלוח בסדר הטאבים', seq.slice(0, 4).join(' → '),
    seq.indexOf('#side-toggle') === 0 && seq.indexOf('[devices]') === 1);

  // ── 4. Escape ────────────────────────────────────────────────────
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
  s = await state(page);
  const back = await page.evaluate(() => document.activeElement && document.activeElement.id);
  M('escape', 'נסגר', `data-open=${s.open} aria-expanded=${s.expanded}`, s.open === 'false' && s.expanded === 'false');
  M('escape', 'הפוקוס חזר ללחצן', `activeElement=#${back}`, back === 'side-toggle');

  // ── 5. choosing a screen ─────────────────────────────────────────
  await page.click('#side-toggle');
  await page.waitForTimeout(80);
  await page.click('#menu button[data-view="links"]');
  await page.waitForTimeout(320);
  s = await state(page);
  const after = await page.evaluate(() => ({
    h1: (document.querySelector('#content h1') || {}).textContent || '',
    active: document.activeElement ? document.activeElement.tagName + (document.activeElement.id ? '#' + document.activeElement.id : '') : null,
  }));
  M('route', 'המסך אכן התחלף', after.h1.trim(), after.h1.includes('קישורים'));
  M('route', 'הלוח נסגר', `data-open=${s.open} aria-expanded=${s.expanded}`, s.open === 'false' && s.expanded === 'false');
  M('route', 'הפוקוס על כותרת המסך, לא על הלחצן', after.active, after.active === 'H1');

  // ── 6. the login pill ────────────────────────────────────────────
  await PILL(page);
  await page.waitForTimeout(120);
  const hit = await hitAt(page, '#side-toggle');
  M('pill', 'הלחצן מקבל את הלחיצה', `elementFromPoint → ${hit.hit}`, hit.isTarget);
  await shot(page, `pill-${mode}`, { x: 0, y: 0, width: 390, height: 120 });
  // control: without the reservation the pill takes the click, which is what
  // would have shipped.
  await page.addStyleTag({ content: '@media (max-width: 800px){ .side-head { padding-inline-end: 0 !important; } }' });
  await page.waitForTimeout(120);
  const hitWas = await hitAt(page, '#side-toggle');
  M('pill', 'ובלי השמירה — הגלולה לוקחת אותה', `elementFromPoint → ${hitWas.hit}`, !hitWas.isTarget,
    'הקונסולה לא שמרה מקום לגלולה בשום מקום, והלחצן יושב בדיוק בפינה שלה');
  await page.evaluate(() => { [...document.querySelectorAll('style')].pop().remove(); document.getElementById('qa-pill').remove(); });

  // ── 7. resized while open ────────────────────────────────────────
  await page.click('#side-toggle');
  await page.waitForTimeout(80);
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.waitForTimeout(160);
  s = await state(page);
  const wideCols = await page.evaluate(() => getComputedStyle(document.querySelector('.app')).gridTemplateColumns);
  add({ mode, vp: '1200', group: 'wide', what: 'הסרגל חזר לעמודה', value: `${wideCols} / panel=${s.painted}`, ok: s.painted === 'block' && /^250px/.test(wideCols) });
  add({ mode, vp: '1200', group: 'wide', what: 'הלחצן נעלם וה-ARIA התאפס', value: `display=${s.toggleShown} aria-expanded=${s.expanded}`, ok: s.toggleShown === 'none' && s.expanded === 'false' });
  const wideNav = await reachable(page, PANEL[0]);
  add({ mode, vp: '1200', group: 'wide', what: 'הניווט נגיש כרגיל', value: `box=${wideNav.box} tabbable=${wideNav.tabbable}`, ok: wideNav.box && wideNav.tabbable });
  await shot(page, `wide-${mode}`, { x: 0, y: 0, width: 700, height: 460 });

  await ctx.close();
}

await browser.close();
stop();

const ok = rows.filter((r) => r.ok).length;
const lines = [
  `# console-mobile-nav-0811 — ${ok}/${rows.length}`,
  '',
  '| מצב | רוחב | קבוצה | מה נבדק | ערך | תוצאה |',
  '|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.mode} | ${r.vp} | ${r.group} | ${r.what} | \`${r.value}\` | ${r.ok ? '✅' : '❌'} |`),
];
await writeFile(`${HERE}_results.md`, lines.join('\n') + '\n', 'utf8');
console.log(lines.join('\n'));
