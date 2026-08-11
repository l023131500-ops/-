// The marketing page's **mobile navigation**. 2026-08-11.
//
// `apps/35-kioskfleet/STATUS.md` item 7 closes on this and states it as not a
// focus question: "below 901px `.nav-links` is `display: none` with no
// hamburger behind it, so on a phone the four nav links and כניסת לקוחות do
// not exist at all — the marketing page has no mobile navigation."
//
// So this is 2.1.1 territory only in the sense that there was nothing to
// operate. The five controls were absent from the layout, from the tab order
// and from the accessibility tree, on the page `more30.com/kiosk` opens — and
// one of the five, כניסת לקוחות, is the only route from this page into the
// customer console.
//
// What this run grades, and why each row is here rather than assumed:
//
//   1. **the defect existed** — the shipped-before rule is re-injected in the
//      same live page and the five controls are asserted unreachable. Every
//      "before" row in this file has to pass or there was no bug.
//   2. **the panel is a disclosure, not a decoration** — `aria-expanded` and
//      the painted state are read separately and compared, because they are
//      written by one function precisely so they cannot disagree, and a test
//      that reads only one of them cannot see them disagree.
//   3. **closed means gone** — `display: none` and not opacity, so the rows
//      assert the links are not tab-reachable while closed rather than merely
//      not visible.
//   4. **the width crossing** — the open state is held on the element, and the
//      rule that opens it lives inside the `max-width: 900px` block. A page
//      resized while open must come back to the horizontal row.
//   5. **the login pill** — this is the one row that is not about the menu.
//      `.nav .container`'s reservation for the shared more30 pill was bounded
//      to `min-width: 901px`, and that bound rested on there being nothing at
//      the inline-end below it. The toggle now sits exactly there. The pill is
//      simulated at the size and position `auth-button.js` writes before its
//      own measurement (96×36 at 10px/8px, `--more30-auth-inset: 118px`),
//      because the real script is blocked from this machine — and the control
//      row puts the old `20px` padding back and asserts the click lands on the
//      pill, which is what would ship without the change.
//
// Stub is `../warn-ink-0811/stub-server.mjs`, reused not copied: it already
// serves the real `server/public/` and answers `/` with `index.html`. The two
// off-site requests are aborted (NetFree blocks both from here anyway) — that
// is the page's own fallback state, and the pill is injected by this file
// instead so its geometry is stated rather than guessed.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8843;
const BASE = `http://127.0.0.1:${PORT}`;

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };
const add = (r) => { rows.push(r); if (!r.ok) fail(`${r.mode} ${r.vp}: ${r.group} — ${r.what} (${r.value})`); };

const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const rgb = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
const lum = (s) => { const [r, g, b] = rgb(s); return 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const hex = (s) => { const [r, g, b] = rgb(s); return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join(''); };
// `rgb()` above pulls decimal runs out of a string, so it reads `#7ea6ff` as
// `[7, 6]` and every ratio against a token comes out NaN (landing-focus-0811).
const unhex = (h) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(h).trim());
  if (!m) return h;
  const n = parseInt(m[1], 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

// `.btn` declares `transition: .15s` on all properties, `outline-width`
// included, so a computed read in the tick focus lands returns where the
// transition started (button-boundary-0811, then content-focus-0811).
const SETTLE = 260;

const NAV = ['#what', '#features', '#how', '#pricing'].map((h) => `.nav-links a[href="${h}"]`)
  .concat(['.nav-links .btn-ghost']);

// Press Tab **until** the target is focused, never a fixed count: the tab order
// is a ring, and an index into a list of stops is not a number of key presses
// (nav-keyboard-0811).
async function tabTo(page, sel, max = 60) {
  for (let i = 1; i <= max; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((s) => !!document.activeElement && document.activeElement.matches(s), sel)) return i;
  }
  return 0;
}
// `blur()` alone does **not** send the next Tab back to the top of the
// document. `screen-focus-0811` recorded the fact from the other direction —
// removing the focused node leaves the sequential focus navigation starting
// point where it was — and this run paid for it: the first sweep here opened
// at `a.btn btn-light` in the pricing section, i.e. two thirds down the page,
// and reported a three-stop ring with the nav in none of it. Focusing the body
// is what moves the starting point, and the body is not focusable without a
// tabindex; it is taken off again immediately so the page under test is left
// as it was, and `-1` was never a tab stop anyway.
const resetTab = (page) => page.evaluate(() => {
  window.scrollTo(0, 0);
  document.body.setAttribute('tabindex', '-1');
  document.body.focus();
  document.body.removeAttribute('tabindex');
});

// One sweep of the whole ring, and the positions are read out of it. The first
// version of this file called `tabTo()` once per control in a loop and reported
// the *five* stops as `1, 1, 1, 1, 1` — which is true and says nothing: each
// call resumes where the previous one stopped, so it measures the gap to the
// next control and not the position of any of them. Order is a property of the
// sequence, so the sequence is what gets recorded.
//
// The stop is the **wrap**, not a count: `seq` grows until a key repeats
// (nav-keyboard-0811's finding, that a tab order is a ring).
const KEYS = [...NAV, '#nav-toggle'];
async function sweep(page, max = 40) {
  await resetTab(page);
  const seq = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    // The fallback key carries the element's position in the document, or the
    // two `.btn-light` buttons in the pricing table share one key and the sweep
    // "wraps" there — which is a break in the middle of the ring reported as a
    // complete one.
    const key = await page.evaluate((sels) => {
      const e = document.activeElement;
      if (!e || e === document.body || e === document.documentElement) return null;
      const m = sels.find((s) => e.matches(s));
      return m || `${e.tagName.toLowerCase()}.${e.className || ''}@${[...document.querySelectorAll('*')].indexOf(e)}`;
    }, KEYS);
    if (key === null || seq.includes(key)) break;
    seq.push(key);
  }
  return seq;
}
const positions = (seq) => NAV.map((s) => seq.indexOf(s));

const state = (page) => page.evaluate(() => {
  const t = document.getElementById('nav-toggle');
  const p = document.getElementById('nav-links');
  return {
    expanded: t.getAttribute('aria-expanded'),
    open: p.dataset.open,
    panelDisplay: getComputedStyle(p).display,
    panelDir: getComputedStyle(p).flexDirection,
    toggleDisplay: getComputedStyle(t).display,
    controls: t.getAttribute('aria-controls'),
    navBottom: document.querySelector('.nav').getBoundingClientRect().bottom,
    panelTop: p.getBoundingClientRect().top,
    focused: document.activeElement ? document.activeElement.id || document.activeElement.className : null,
  };
});

// The surface behind a control, **composited**: `.nav` is `rgba(7,26,51,.85)`
// over a page background that inverts, so a computed read returns a colour
// painted nowhere. Layers are collected front to back until one is opaque.
const surfaceCss = (page, sel) => page.evaluate((s) => {
  const layers = [];
  let n = document.querySelector(s);
  n = n && n.parentElement;
  while (n) {
    const m = (getComputedStyle(n).backgroundColor || '').match(/[\d.]+/g);
    if (m) {
      const a = m.length > 3 ? Number(m[3]) : 1;
      if (a > 0) { layers.push([Number(m[0]), Number(m[1]), Number(m[2]), a]); if (a >= 1) break; }
    }
    n = n.parentElement;
  }
  if (!layers.length || layers[layers.length - 1][3] < 1) layers.push([255, 255, 255, 1]);
  let out = layers[layers.length - 1].slice(0, 3);
  for (let i = layers.length - 2; i >= 0; i--) {
    const [r, g, b, a] = layers[i];
    out = [r * a + out[0] * (1 - a), g * a + out[1] * (1 - a), b * a + out[2] * (1 - a)];
  }
  return `rgb(${out.map((v) => Math.round(v)).join(', ')})`;
}, sel);

// The ring is identified **by its own colour** in a band just outside the
// control, not as the strongest pixel there: landing-focus-0811 passed a row
// for the wrong reason when the brightest pixel within 5px turned out to be a
// letter of the brand wordmark.
const RING_BAND = [1, 5];
async function ringPixels(page, sel, want) {
  const rect = await page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, sel);
  if (!rect) return 0;
  const b64 = (await page.screenshot()).toString('base64');
  return page.evaluate(async ({ b64, rect, RING_BAND, want }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const k = img.width / window.innerWidth;
    const PAD = RING_BAND[1] + 2;
    const X = Math.max(0, Math.round((rect.x - PAD) * k));
    const Y = Math.max(0, Math.round((rect.y - PAD) * k));
    const W = Math.min(img.width - X, Math.round((rect.w + PAD * 2) * k));
    const H = Math.min(img.height - Y, Math.round((rect.h + PAD * 2) * k));
    if (W <= 0 || H <= 0) return 0;
    const d = g.getImageData(X, Y, W, H).data;
    const x0 = Math.round((rect.x - X / k) * k), y0 = Math.round((rect.y - Y / k) * k);
    const x1 = x0 + Math.round(rect.w * k), y1 = y0 + Math.round(rect.h * k);
    const m = /^#?([0-9a-f]{6})$/i.exec(want.trim());
    const n = m ? parseInt(m[1], 16) : -1;
    const R = (n >> 16) & 255, G = (n >> 8) & 255, B = n & 255;
    let hits = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dist = Math.max(Math.max(0, x0 - x, x - (x1 - 1)), Math.max(0, y0 - y, y - (y1 - 1)));
        if (dist < RING_BAND[0] || dist > RING_BAND[1]) continue;
        const i = (y * W + x) * 4;
        if (d[i] === R && d[i + 1] === G && d[i + 2] === B) hits++;
      }
    }
    return hits;
  }, { b64, rect, RING_BAND, want });
}
// Eight pixels of a 2px ring is a floor against a stray antialiased match, not
// a coverage measure.
const RING_MIN_PX = 8;

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
  const e = document.querySelector(s);
  const r = e.getBoundingClientRect();
  const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return { hit: hit ? (hit.id || hit.className || hit.tagName) : null, isTarget: !!hit && (hit === e || e.contains(hit)) };
}, sel);

const server = spawn(process.execPath, [STUB, String(PORT)], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 700));

let shot = 0;
const shotName = () => `${HERE}0${++shot}`;

const browser = await chromium.launch();
try {
  for (const mode of ['light', 'dark']) {
    // ── phone ────────────────────────────────────────────────────────────
    const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 390, height: 844 } });
    await ctx.route(/^https:\/\/(more30\.com|fonts\.(googleapis|gstatic)\.com)\//, (r) => r.abort());
    const page = await ctx.newPage();
    await page.goto(BASE + '/');
    await page.waitForSelector('#nav-toggle');
    const vp = '390';
    const navyToken = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--focus-ring-navy'))).trim();

    // 1 — the defect, rebuilt in the live page
    await page.addStyleTag({ content: '@media (max-width:900px){#nav-toggle{display:none!important}#nav-links{display:none!important}}' });
    const seqWas = await sweep(page);
    add({
      mode, vp, group: 'לפני', what: 'חמשת הפקדים אינם קיימים בטלפון', kind: 'לפני',
      value: `${positions(seqWas).filter((i) => i >= 0).length}/5 בסבב הטאבים · לחצן תפריט: ${seqWas.includes('#nav-toggle') ? 'קיים' : 'אין'}`,
      ok: positions(seqWas).every((i) => i < 0) && !seqWas.includes('#nav-toggle'),
      note: `הכלל שנשלח קודם, מוזרק חזרה לאותו דף חי. חייב לעבור, אחרת לא היה כאן באג. הסבב כולו: ${seqWas.length} עצירות`,
    });
    await page.evaluate(() => [...document.querySelectorAll('style')].pop().remove());

    // 2 — closed: the toggle exists, the panel does not
    let s0 = await state(page);
    const seqClosed = await sweep(page);
    add({
      mode, vp, group: 'סגור', what: 'לחצן התפריט מוצג ונגיש במקלדת', kind: 'תיקון',
      value: `display: ${s0.toggleDisplay} · עצירה #${seqClosed.indexOf('#nav-toggle') + 1} מתוך ${seqClosed.length} [${seqClosed.join(' › ')}]`,
      ok: s0.toggleDisplay !== 'none' && seqClosed.includes('#nav-toggle'),
      // `inline-flex` on a flex child blockifies to `flex`, so the computed
      // value is `flex` and asserting the declared one fails on a correct page.
      note: 'הצהרנו ‎inline-flex‎; הוא ילד של flex ולכן הערך המחושב הוא ‎flex‎ — הנבדק הוא שאינו ‎none‎',
    });
    add({
      mode, vp, group: 'סגור', what: 'הלוח מוסתר, וה-ARIA אומר את אותו הדבר', kind: 'תיקון',
      value: `display: ${s0.panelDisplay} · aria-expanded="${s0.expanded}" · data-open="${s0.open}"`,
      ok: s0.panelDisplay === 'none' && s0.expanded === 'false' && s0.open === 'false',
    });
    add({
      mode, vp, group: 'סגור', what: 'הלחצן מצביע על הלוח (aria-controls)', kind: 'תיקון',
      value: `aria-controls="${s0.controls}"`, ok: s0.controls === 'nav-links',
    });
    add({
      mode, vp, group: 'סגור', what: 'לוח סגור יוצא מסדר הטאבים ולא רק מהעין', kind: 'תיקון',
      value: `${positions(seqClosed).filter((i) => i >= 0).length}/5 בסבב הטאבים`,
      ok: positions(seqClosed).every((i) => i < 0),
      note: 'display:none ולא שקיפות — אחרת חמש עצירות טאב על פקדים בלתי נראים',
    });

    // 3 — the ring on the toggle, before anything is opened
    await resetTab(page);
    await tabTo(page, '#nav-toggle', 25);
    await page.waitForTimeout(SETTLE);
    const o = await page.evaluate(() => {
      const cs = getComputedStyle(document.getElementById('nav-toggle'));
      return { style: cs.outlineStyle, width: cs.outlineWidth, color: cs.outlineColor };
    });
    add({
      mode, vp, group: 'סגור', what: 'טבעת המיקוד מוצהרת אצלנו ולא של הדפדפן', kind: 'תיקון',
      value: `${o.style} ${o.width} ${hex(o.color)}`,
      ok: o.style === 'solid' && parseFloat(o.width) >= 2 && hex(o.color) === navyToken,
      note: `צפוי ${navyToken} — ‎.nav a‎ אינו תופס ‎<button>‎`,
    });
    const surf = await surfaceCss(page, '#nav-toggle');
    const px = await ringPixels(page, '#nav-toggle', navyToken);
    add({
      mode, vp, group: 'סגור', what: 'הטבעת נצבעת בפועל, וניגודיותה מול הסרגל (1.4.11 ⇐ 3:1)', kind: 'תיקון',
      value: `${ratio(unhex(navyToken), surf).toFixed(2)}:1 · ${px} פיקסלים בצבע הטוקן`,
      ok: ratio(unhex(navyToken), surf) >= 3 && px >= RING_MIN_PX,
      note: `משטח מורכב: ${hex(surf)} · התאמת צבע מדויקת, לא הפיקסל החזק ברצועה`,
    });
    await page.screenshot({ path: `${shotName()}-closed-focus-${mode}.png`, clip: { x: 0, y: 0, width: 390, height: 300 } });

    // 4 — open by keyboard
    await page.keyboard.press('Enter');
    await page.waitForTimeout(120);
    let s1 = await state(page);
    add({
      mode, vp, group: 'פתוח', what: 'Enter על הלחצן פותח, וה-ARIA זז איתו', kind: 'תיקון',
      value: `display: ${s1.panelDisplay}/${s1.panelDir} · aria-expanded="${s1.expanded}"`,
      ok: s1.panelDisplay === 'flex' && s1.panelDir === 'column' && s1.expanded === 'true' && s1.open === 'true',
    });
    add({
      mode, vp, group: 'פתוח', what: 'הלוח נפרש מתחת לסרגל ואינו דוחף אותו', kind: 'תיקון',
      value: `תחתית הסרגל ${Math.round(s1.navBottom)}px · ראש הלוח ${Math.round(s1.panelTop)}px`,
      ok: Math.abs(s1.panelTop - s1.navBottom) < 2,
    });
    const seqOpen = await sweep(page);
    const posOpen = positions(seqOpen);
    add({
      mode, vp, group: 'פתוח', what: 'חמשת הפקדים נגישים במקלדת, בסדר ה-DOM ואחרי הלחצן', kind: 'תיקון',
      value: `עצירות #${posOpen.map((i) => i + 1).join(', #')} מתוך ${seqOpen.length} · הלחצן #${seqOpen.indexOf('#nav-toggle') + 1}`,
      ok: posOpen.every((i) => i >= 0) && posOpen.every((n, i) => i === 0 || n > posOpen[i - 1])
        && seqOpen.indexOf('#nav-toggle') >= 0 && seqOpen.indexOf('#nav-toggle') < posOpen[0],
      note: 'הלחצן לפני הלוח ב-DOM ולכן גם בסבב: מגיעים, פותחים, וממשיכים אל מה שנחשף',
    });
    // The sweep left focus mid-ring; the Escape row below needs it on the
    // toggle, and re-opening from a stale focus would grade the wrong control.
    await resetTab(page);
    await tabTo(page, '#nav-toggle', 25);
    const sizes = await page.evaluate((sels) => sels.map((s) => Math.round(document.querySelector(s).getBoundingClientRect().height)), NAV);
    const tgl = await page.evaluate(() => Math.round(document.getElementById('nav-toggle').getBoundingClientRect().height));
    add({
      mode, vp, group: 'פתוח', what: 'יעד המגע של פריטי הלוח (2.5.8 ⇐ 24px, יעד 44px)', kind: 'תיקון',
      value: `${sizes.join(', ')}px · הלחצן ${tgl}px`, ok: sizes.every((h) => h >= 44) && tgl >= 44,
      note: 'הלחצן היה 33px בריצה הראשונה — עובר את 24px של 2.5.8 ולא את יעד ה-44px של הפריטים שהוא פותח',
    });
    await page.screenshot({ path: `${shotName()}-open-${mode}.png`, clip: { x: 0, y: 0, width: 390, height: 420 } });

    // 5 — Escape closes and hands focus back
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
    let s2 = await state(page);
    add({
      mode, vp, group: 'סגירה', what: 'Escape סוגר ומחזיר את המיקוד ללחצן', kind: 'תיקון',
      value: `aria-expanded="${s2.expanded}" · המיקוד על ${s2.focused}`,
      ok: s2.expanded === 'false' && s2.focused === 'nav-toggle',
      note: 'בלי ההחזרה המיקוד יושב על קישור שהרגע נעשה display:none, כלומר על body',
    });

    // 6 — a link closes the panel it was jumped through
    await page.click('#nav-toggle');
    await page.click('.nav-links a[href="#pricing"]');
    await page.waitForTimeout(120);
    add({
      mode, vp, group: 'סגירה', what: 'הקשה על עוגן פנימי סוגרת את הלוח', kind: 'תיקון',
      value: `aria-expanded="${(await state(page)).expanded}"`, ok: (await state(page)).expanded === 'false',
      note: 'אחרת הלוח נשאר פרוש מעל המקטע שאליו קפצנו',
    });

    // 7 — a tap outside closes it. By coordinate and not by selector: the open
    // panel is absolutely positioned **over** the top of the hero, so
    // `click('.hero h1')` is a click on the panel — playwright's actionability
    // check said so, in as many words, and this row would otherwise be testing
    // the in-panel handler a second time.
    await page.click('#nav-toggle');
    await page.mouse.click(195, 760);
    await page.waitForTimeout(120);
    add({
      mode, vp, group: 'סגירה', what: 'הקשה מחוץ לסרגל סוגרת את הלוח', kind: 'תיקון',
      value: `aria-expanded="${(await state(page)).expanded}"`, ok: (await state(page)).expanded === 'false',
    });

    // 8 — the login pill
    await PILL(page);
    await page.waitForTimeout(80);
    const hit = await hitAt(page, '#nav-toggle');
    add({
      mode, vp, group: 'כדור ההתחברות', what: 'הלחיצה על לחצן התפריט מגיעה אליו ולא לכדור', kind: 'תיקון',
      value: `elementFromPoint → ${hit.hit}`, ok: hit.isTarget,
      note: 'כדור מדומה 96×36 ב-10/8, ‎--more30-auth-inset: 118px‎ — בדיוק מה ש-auth-button.js כותב מתחת ל-480px',
    });
    await page.addStyleTag({ content: '.nav .container{padding-inline-end:20px!important}' });
    await page.waitForTimeout(80);
    const hitWas = await hitAt(page, '#nav-toggle');
    add({
      mode, vp, group: 'כדור ההתחברות', what: '**לפני** — בלי ההזזה הלחיצה נופלת על הכדור', kind: 'לפני',
      value: `elementFromPoint → ${hitWas.hit}`, ok: !hitWas.isTarget,
      note: 'הגבול ‎min-width: 901px‎ ששרד עד כאן היה נשען על כך שאין דבר בקצה הזה בטלפון',
    });
    await page.screenshot({ path: `${shotName()}-pill-${mode}.png`, clip: { x: 0, y: 0, width: 390, height: 160 } });
    await page.evaluate(() => { [...document.querySelectorAll('style')].pop().remove(); document.getElementById('qa-pill').remove(); });

    // 9 — resized while open
    await page.click('#nav-toggle');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(160);
    const s3 = await state(page);
    add({
      mode, vp: '390→1280', group: 'שינוי רוחב', what: 'מעבר לפריסה הרחבה בזמן שהלוח פתוח', kind: 'תיקון',
      value: `display: ${s3.panelDisplay}/${s3.panelDir} · aria-expanded="${s3.expanded}" · הלחצן ${s3.toggleDisplay}`,
      ok: s3.panelDisplay === 'flex' && s3.panelDir === 'row' && s3.expanded === 'false' && s3.toggleDisplay === 'none',
      note: 'הכלל הפותח יושב בתוך ה-media query, ולכן גם תכונה שנשארה אינה שוברת את הרחב',
    });

    // 10 — the wide layout is where it was
    const seqWide = await sweep(page);
    const posWide = positions(seqWide);
    add({
      mode, vp: '1280', group: 'רגרסיה — רחב', what: 'חמשת הפקדים נגישים כשהיו, והלחצן מדולג', kind: 'תיקון',
      value: `עצירות #${posWide.map((i) => i + 1).join(', #')} מתוך ${seqWide.length} · לחצן: ${seqWide.includes('#nav-toggle') ? 'נתפס' : 'מדולג'}`,
      ok: posWide.every((i) => i >= 0) && posWide.every((n, i) => i === 0 || n > posWide[i - 1]) && !seqWide.includes('#nav-toggle'),
    });
    const pad = await page.evaluate(() => getComputedStyle(document.querySelector('.nav .container')).paddingInlineEnd);
    add({
      mode, vp: '1280', group: 'רגרסיה — רחב', what: 'ההזזה של הכדור ברוחב 1280 לא זזה', kind: 'תיקון',
      value: pad, ok: parseFloat(pad) > 20,
      note: 'הכלל אינו עוד בתוך media query, והערך ברוחב הזה חייב להישאר מה שהיה',
    });
    await page.screenshot({ path: `${shotName()}-wide-${mode}.png`, clip: { x: 0, y: 0, width: 1280, height: 220 } });

    await page.close();
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log('\n| מצב | רוחב | קבוצה | מה נבדק | סוג | הנמדד | הערה | |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.mode} | ${r.vp} | ${r.group} | ${r.what} | ${r.kind} | ${r.value} | ${r.note || ''} | ${r.ok ? '✅' : '❌'} |`);
}
const ctrl = rows.filter((r) => r.kind === 'לפני');
console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} עוברים. ${ctrl.length} שורות "לפני": ${ctrl.filter((r) => r.ok).length} אישרו שהבאג אכן היה שם.`);
