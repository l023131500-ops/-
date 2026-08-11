// The focus ring on the console's own controls. 2026-08-11.
//
// STATUS.md item 7 ends with the one thing left open under the keyboard
// heading, and it says in as many words that it was *read* and not measured:
// "the console's buttons, links and checkboxes inside `#content` declare no
// focus style and fall back to the UA ring."
//
// Everything else under that heading is closed by a run that measured it — the
// fields (`focus-ring-0811`), the sidebar (`nav-keyboard-0811`), the dialogs
// (`dialog-focus-0811`, `dialog-inert-0811`), the screen redraw
// (`screen-focus-0811`). Those five runs between them gave an explicit ring to
// exactly three things: `.field input`, `.side nav button`, `.topbar h1`. Every
// other control in the console — every ✏️ עריכה, every 🗑️, every save button in
// every dialog, the guide's link, the wizard's twelve checkboxes — had no
// `:focus-visible` rule at all.
//
// Why "falls back to the UA ring" is not the same as "is fine":
//
//   1. `outline-style: auto` is **not a colour you can read**. `getComputedStyle`
//      returns the *style*, and the ring Chromium paints for `auto` is its own
//      two-tone construction — so every harness under item 6 and item 7 that
//      graded a colour off computed style was structurally unable to see this
//      one. That is why this run samples pixels (`screens-approvals-code-0811`'s
//      lesson, and its `sampleBox`), and samples the band *outside* the control
//      rather than the control itself: an outline at `outline-offset` is painted
//      on the surface behind, not on the button.
//   2. the UA ring follows **`color-scheme`**, which this console sets on
//      `:root` — so its colour is the browser's answer to a question we already
//      answered ourselves with `--focus-ring`, and the two need not agree.
//
// What is measured, on four controls × two colour schemes:
//   `.btn-light` (`#refresh`), `.btn-primary` (`#add`), `.btn-danger` (the 🗑️ on
//   a device card), the guide screen's in-text link, and the wizard's checkbox
//   inside a `.modal`. For each: that the ring is now ours (`solid`, ≥2px,
//   `--focus-ring`), and that the pixels actually painted around the control
//   reach 3:1 against the surface behind it (WCAG 1.4.11 / 2.4.11).
//
// The control rows are the shipped behaviour, produced in the same live page:
// `outline: revert` restores the UA stylesheet's `auto`, which is byte-for-byte
// what every one of these controls had before this change. Those rows assert
// `auto` — if they fail there was no defect and nothing to fix — and *record*
// the ratio the UA ring gives rather than demanding it fail, because the point
// here is that the value was unmeasurable and unowned, not that it was low.
//
// Stub is `../warn-ink-0811/stub-server.mjs`, reused not copied: the real
// `server/public/`, canned API only, and the wizard answered through the real
// `setupsteps.js` so the checkbox is the one the console really renders.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8839;
const BASE = `http://127.0.0.1:${PORT}`;

// `--focus-ring`, both values. Read from the page rather than quoted, so a
// token change cannot leave this file asserting a colour nothing uses.
const RING_TOKEN = (page) => page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--focus-ring').trim());

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };
const add = (r) => { rows.push(r); if (!r.ok) fail(`${r.mode}: ${r.group} — ${r.what} (${r.value})`); };

const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
const rgb = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const hex = (s) => { const [r, g, b] = rgb(s); return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join(''); };

// Press Tab **until** the target is focused, never a fixed count — the tab
// order is a ring, and an index into a recorded list is not a number of
// presses. `nav-keyboard-0811` paid for that one.
async function tabTo(page, sel, max = 80) {
  for (let i = 1; i <= max; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((s) => !!document.activeElement && document.activeElement.matches(s), sel)) return i;
  }
  return 0;
}

// `.btn` declares `transition: .15s` — **all** properties, `outline-width` and
// `outline-offset` included. A computed read in the tick the focus lands
// returns where the transition started, which is `0px`, i.e. "there is no
// ring" on a control that is growing one. `button-boundary-0811` paid for this
// once on `color`; it costs the same here and the first run of this file hit
// it on all six button rows.
const SETTLE = 260;

// The surface actually painted behind the control — walked up from its
// **parent**, not from the control itself. Every one of these buttons has a
// fill of its own, so starting at the element returns `#eef3ff` / `#2a61e8`:
// the ring would then be graded against the thing it is drawn outside of. The
// walk itself is `button-boundary-0811`'s, because these controls sit on
// `.card`, `.device`, `.modal` and the page in turn and one quoted value would
// be right for some and wrong for the rest.
const surfaceBehind = (page, sel) => page.evaluate((s) => {
  let n = document.querySelector(s);
  n = n && n.parentElement;
  while (n && n !== document.documentElement) {
    const c = getComputedStyle(n).backgroundColor;
    if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c;
    n = n.parentElement;
  }
  return getComputedStyle(document.body).backgroundColor;
}, sel);

// The band **outside** the control, where an `outline-offset` ring is painted.
// PAD reaches past offset 2px + width 2px with room to spare; the control's own
// rect is excluded, so a button's fill can never be mistaken for its ring.
const PAD = 8;
async function sampleRing(page, sel) {
  const rect = await page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    e.scrollIntoView({ block: 'center' });
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, sel);
  if (!rect) return null;
  const b64 = (await page.screenshot()).toString('base64');
  return page.evaluate(async ({ b64, rect, PAD }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const k = img.width / window.innerWidth;
    const X = Math.max(0, Math.round((rect.x - PAD) * k));
    const Y = Math.max(0, Math.round((rect.y - PAD) * k));
    const W = Math.min(img.width - X, Math.round((rect.w + PAD * 2) * k));
    const H = Math.min(img.height - Y, Math.round((rect.h + PAD * 2) * k));
    const d = g.getImageData(X, Y, W, H).data;
    const inX0 = Math.round(PAD * k), inY0 = Math.round(PAD * k);
    const inX1 = inX0 + Math.round(rect.w * k), inY1 = inY0 + Math.round(rect.h * k);
    const px = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (x >= inX0 && x < inX1 && y >= inY0 && y < inY1) continue; // the control itself
        const i = (y * W + x) * 4;
        px.push(`rgb(${d[i]}, ${d[i + 1]}, ${d[i + 2]})`);
      }
    }
    return px;
  }, { b64, rect, PAD });
}

// The strongest pixel in that band against the surface — the ring, if there is
// one. Reported with its colour, because "3.1:1 of something grey" and "3.1:1
// of our blue" are different answers and only one of them is the fix.
async function ringAgainst(page, sel, surface) {
  const px = await sampleRing(page, sel);
  if (!px) return null;
  let best = null, r = 0;
  for (const p of px) { const q = ratio(p, surface); if (q > r) { r = q; best = p; } }
  return { color: best, ratio: r };
}

const outlineOf = (page, sel) => page.evaluate((s) => {
  const cs = getComputedStyle(document.querySelector(s));
  return { style: cs.outlineStyle, width: cs.outlineWidth, color: cs.outlineColor, offset: cs.outlineOffset };
}, sel);

const server = spawn(process.execPath, [STUB, String(PORT)], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 700));

let shot = 0;
const shotName = () => `${HERE}0${++shot}`;

const browser = await chromium.launch();
try {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 1280, height: 1000 } });
    await ctx.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));
    const page = await ctx.newPage();
    await page.goto(BASE + '/console');
    await page.waitForSelector('.device');
    await page.evaluate(() => document.fonts.ready);
    const RING = await RING_TOKEN(page);

    // The five controls, each reached by Tab so `:focus-visible` matches the
    // way it does for a person on a keyboard. `.modal` ones are opened first.
    const CASES = [
      { sel: '#refresh', label: '‎.btn-light‎ (רענון)', screen: 'devices' },
      { sel: '#add', label: '‎.btn-primary‎ (הוספת מכשיר)', screen: 'devices' },
      { sel: '.device .btn-danger', label: '‎.btn-danger‎ (🗑️ בכרטיס מכשיר)', screen: 'devices' },
      { sel: '#content p a', label: 'קישור בתוך טקסט (מדריך המשתמש)', screen: 'guide' },
      { sel: '.modal .wz-step input[type="checkbox"]', label: 'תיבת סימון (שלב באשף)', screen: 'wizard' },
    ];

    let screen = 'devices';
    for (const c of CASES) {
      if (c.screen !== screen) {
        if (c.screen === 'guide') {
          await page.click('#menu button[data-view="guide"]');
          await page.waitForSelector('#content p a');
        } else if (c.screen === 'wizard') {
          await page.click('#menu button[data-view="devices"]');
          await page.waitForSelector('.device');
          await page.click('.device .btn-primary'); // 🚀 הפעל — the card's first button
          await page.waitForSelector('.modal .wz-step input[type="checkbox"]');
        }
        screen = c.screen;
      }
      const presses = await tabTo(page, c.sel);
      if (!presses) { add({ mode, group: c.label, what: 'הגעה במקלדת', kind: 'בסיס', value: 'לא נמצא', ok: false }); continue; }

      await page.waitForTimeout(SETTLE);
      const o = await outlineOf(page, c.sel);
      add({
        mode, group: c.label, what: 'הטבעת מוצהרת אצלנו ולא של הדפדפן', kind: 'תיקון',
        value: `${o.style} ${o.width} ${hex(o.color)} · offset ${o.offset}`,
        ok: o.style === 'solid' && parseFloat(o.width) >= 2 && hex(o.color) === RING,
        note: `הגעה ב-${presses} הקשות`,
      });

      const surface = await surfaceBehind(page, c.sel);
      const ring = await ringAgainst(page, c.sel, surface);
      add({
        mode, group: c.label, what: 'ניגודיות הטבעת מול המשטח מאחוריה (1.4.11 ⇐ 3:1)', kind: 'תיקון',
        value: `${ring.ratio.toFixed(2)}:1 · ${hex(ring.color)} מול ${hex(surface)}`,
        ok: ring.ratio >= 3, note: 'דגימת פיקסלים ברצועה שמחוץ לפקד',
      });

      // ── the control: the shipped behaviour, in the same live page ──
      await page.addStyleTag({ content: `${c.sel}:focus-visible { outline: revert !important; outline-offset: 0 !important; }` });
      await page.waitForTimeout(SETTLE);
      const wasO = await outlineOf(page, c.sel);
      add({
        mode, group: c.label, what: '**לפני** — טבעת ברירת המחדל של הדפדפן', kind: 'לפני',
        value: `${wasO.style} ${wasO.width}`, ok: wasO.style === 'auto',
        note: 'חייב לעבור, אחרת לא היה כאן באג',
      });
      const wasRing = await ringAgainst(page, c.sel, surface);
      add({
        mode, group: c.label, what: '**לפני** — מה הדפדפן צייר בפועל', kind: 'ממצא',
        value: `${wasRing.ratio.toFixed(2)}:1 · ${hex(wasRing.color)}`, ok: true,
        note: 'נמדד ולא נדרש: הבעיה היא שהערך אינו שלנו ואינו נקרא מ-getComputedStyle',
      });
      await page.evaluate(() => [...document.querySelectorAll('style')].pop().remove());
      await page.waitForTimeout(80);
    }

    // Screenshots: the devices screen with `#add` focused, and the wizard's
    // checkbox focused inside the dialog.
    await page.keyboard.press('Escape');
    await page.click('#menu button[data-view="devices"]');
    await page.waitForSelector('#add');
    await tabTo(page, '#add');
    await page.screenshot({ path: `${shotName()}-buttons-focus-${mode}.png`, clip: { x: 0, y: 0, width: 1280, height: 420 } });

    await page.click('.device .btn-primary');
    await page.waitForSelector('.modal .wz-step input[type="checkbox"]');
    await tabTo(page, '.modal .wz-step input[type="checkbox"]');
    await page.locator('.modal').screenshot({ path: `${shotName()}-wizard-checkbox-focus-${mode}.png` });

    await page.close();
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log('\n| מצב | פקד | מה נבדק | סוג | הנמדד | הערה | |');
console.log('|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.mode} | ${r.group} | ${r.what} | ${r.kind} | ${r.value} | ${r.note || ''} | ${r.ok ? '✅' : '❌'} |`);
}
const ctrl = rows.filter((r) => r.kind === 'לפני');
console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} עוברים. ${ctrl.length} שורות בקרה: ${ctrl.filter((r) => r.ok).length} אישרו שהפקד אכן נפל לטבעת ברירת המחדל של הדפדפן.`);
