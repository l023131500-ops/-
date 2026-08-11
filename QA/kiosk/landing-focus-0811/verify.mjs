// The focus ring on the **marketing page**. 2026-08-11.
//
// STATUS.md item 7 ends with the one thing `content-focus-0811` left, and it
// names it as a scope line rather than a defect: "the rule stops at the
// console. `index.html`'s `.btn-ghost` sits on a navy bar — the exact case
// `--focus-ring-navy` exists for — and the marketing page's focus has never
// been measured."
//
// So every control on `index.html` — the skip link, the four nav links, כניסת
// לקוחות, both hero calls to action, the three pricing buttons, the closing
// band's button and the footer link — had no `:focus-visible` rule and fell
// back to the UA ring. That page is what `more30.com/kiosk` opens, i.e. the
// first thing a keyboard user meets in this system.
//
// Why the UA fallback is not the same as "fine" is `content-focus-0811`'s
// finding and is not re-argued here: `outline-style: auto` cannot be read as a
// colour, and what Chromium paints for it follows `color-scheme` rather than
// our own token. Hence pixel sampling, and hence the control rows below.
//
// Two things this run does that no harness before it needed, both forced by
// this page rather than chosen:
//
//   1. **the surface is composited, not read.** `.nav` is
//      `rgba(7,26,51,.85)` over the page background — which inverts — so a
//      computed-style read returns a colour that is painted nowhere. Every
//      console surface graded so far was opaque. `surfaceCss()` now walks up
//      collecting translucent layers and composites them.
//   2. **the surface is also sampled.** `.hero` declares a solid
//      `background-color` *and* three gradients over it (the reason the solid
//      is declared separately is in `style.css`, for axe's benefit), and
//      `.cta-band` is a gradient with no honest single value at all. So the
//      ratio is graded against the pixels actually painted in a band just
//      outside the ring, and the composited value is printed beside it as a
//      cross-check.
//
// Stub is `../warn-ink-0811/stub-server.mjs`, reused not copied — it already
// serves the real `server/public/` verbatim and answers `/` with `index.html`.
// The two off-site requests the page makes (`more30.com/auth-button.js`, Google
// Fonts) are aborted: NetFree blocks them from this machine anyway, and this is
// the page's own fallback state — `--more30-auth-inset` falls back to its 104px
// default, which is what `.nav` already handles.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8841;
const BASE = `http://127.0.0.1:${PORT}`;

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };
const add = (r) => { rows.push(r); if (!r.ok) fail(`${r.mode}: ${r.group} — ${r.what} (${r.value})`); };

const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const rgb = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
const lum = (s) => { const [r, g, b] = rgb(s); return 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const hex = (s) => { const [r, g, b] = rgb(s); return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join(''); };
// The tokens come out of the stylesheet as `#rrggbb`, and everything else here
// is `rgb(...)`. `rgb()` above pulls **decimal** runs out of a string, so it
// reads `#7ea6ff` as `[7, 6]` and every ratio against a token was NaN.
const unhex = (h) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  if (!m) return h;
  const n = parseInt(m[1], 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

// The three ring tokens, read from the page rather than quoted — a token
// change must not leave this file asserting a colour nothing uses.
const TOKENS = (page) => page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  const g = (n) => cs.getPropertyValue(n).trim();
  return { ring: g('--focus-ring'), navy: g('--focus-ring-navy'), band: g('--focus-ring-band') };
});

// Press Tab **until** the target is focused, never a fixed count — the tab
// order is a ring and an index into a list is not a number of presses
// (`nav-keyboard-0811`).
async function tabTo(page, sel, max = 80) {
  for (let i = 1; i <= max; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((s) => !!document.activeElement && document.activeElement.matches(s), sel)) return i;
  }
  return 0;
}

// `.btn` declares `transition: .15s` — all properties, `outline-width`
// included. A read in the tick focus lands returns `0px`, i.e. "no ring" on a
// control that is growing one (`button-boundary-0811`, then
// `content-focus-0811`).
const SETTLE = 260;

// The surface behind the control, **composited**. Walked from the parent, not
// the element: every button here has a fill of its own. Layers are collected
// front to back until one is opaque, then blended in that order.
const surfaceCss = (page, sel) => page.evaluate((s) => {
  const layers = [];
  let n = document.querySelector(s);
  n = n && n.parentElement;
  while (n) {
    const c = getComputedStyle(n).backgroundColor;
    const m = (c || '').match(/[\d.]+/g);
    if (m) {
      const a = m.length > 3 ? Number(m[3]) : 1;
      if (a > 0) {
        layers.push([Number(m[0]), Number(m[1]), Number(m[2]), a]);
        if (a >= 1) break;
      }
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

// Two bands of real pixels around the control: the ring sits 2–4px out at
// `outline-offset: 2px` + 2px width, so RING covers it with a pixel of slack on
// each side, and SURF starts clear of it. SURF stops at 10px because
// `.hero-cta` puts the next button 14px away.
const RING_BAND = [1, 5];
const SURF_BAND = [6, 10];
async function bands(page, sel) {
  const rect = await page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    e.scrollIntoView({ block: 'center' });
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, sel);
  if (!rect) return null;
  const b64 = (await page.screenshot()).toString('base64');
  return page.evaluate(async ({ b64, rect, RING_BAND, SURF_BAND }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const k = img.width / window.innerWidth;
    const PAD = SURF_BAND[1];
    const X = Math.max(0, Math.round((rect.x - PAD) * k));
    const Y = Math.max(0, Math.round((rect.y - PAD) * k));
    const W = Math.min(img.width - X, Math.round((rect.w + PAD * 2) * k));
    const H = Math.min(img.height - Y, Math.round((rect.h + PAD * 2) * k));
    if (W <= 0 || H <= 0) return { ring: [], surf: [] };
    const d = g.getImageData(X, Y, W, H).data;
    // the control's own rect inside the crop, in image pixels
    const x0 = Math.round((rect.x - X / k) * k), y0 = Math.round((rect.y - Y / k) * k);
    const x1 = x0 + Math.round(rect.w * k), y1 = y0 + Math.round(rect.h * k);
    const ring = [], surf = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = Math.max(0, x0 - x, x - (x1 - 1));
        const dy = Math.max(0, y0 - y, y - (y1 - 1));
        const dist = Math.max(dx, dy);
        if (dist === 0) continue; // the control itself
        const i = (y * W + x) * 4;
        const px = `rgb(${d[i]}, ${d[i + 1]}, ${d[i + 2]})`;
        if (dist >= RING_BAND[0] && dist <= RING_BAND[1]) ring.push(px);
        else if (dist >= SURF_BAND[0] && dist <= SURF_BAND[1]) surf.push(px);
      }
    }
    return { ring, surf };
  }, { b64, rect, RING_BAND, SURF_BAND });
}

// The surface is the **median** of the outer band, not its mean: a neighbouring
// card edge or a letter of the next control skews a mean and cannot move a
// median.
//
// Inside the band the ring is found by **its own colour**, and the strongest
// pixel is recorded beside it rather than graded. The first run of this file
// graded the strongest and passed for the wrong reason on the skip link: it
// opens at `inset-inline-start: 0`, which in RTL is the top *right* corner,
// where the white ‎◈ KioskFleet‎ wordmark sits — so the brightest pixel within
// 5px of the control was a letter of the brand, at 11.40:1, and the row would
// have passed with no ring painted at all. `content-focus-0811` recorded the
// same hazard ("a max-over-band sample can be satisfied by a neighbouring dark
// pixel rather than by the ring") and this is that hazard arriving.
//
// The match is exact rather than tolerant: the interior of a 2px solid outline
// is the declared colour, and the antialiased edge pixels are what a tolerance
// would let in.
async function measure(page, sel, want) {
  const b = await bands(page, sel);
  if (!b || !b.ring.length || !b.surf.length) return null;
  const sorted = b.surf.slice().sort((p, q) => lum(p) - lum(q));
  const surface = sorted[Math.floor(sorted.length / 2)];
  let best = null, r = 0;
  for (const p of b.ring) { const q = ratio(p, surface); if (q > r) { r = q; best = p; } }
  const wantPx = want ? b.ring.filter((p) => hex(p) === want) : [];
  return {
    surface, color: best, ratio: r,
    count: wantPx.length, wantRatio: want ? ratio(unhex(want), surface) : 0,
  };
}

// Eight pixels of a 2px ring is a quarter of one short side of the smallest
// control here (the footer link, 84px wide → ~340 ring pixels). It is a floor
// against a stray antialiased match, not a coverage measure.
const RING_MIN_PX = 8;

const outlineOf = (page, sel) => page.evaluate((s) => {
  const cs = getComputedStyle(document.querySelector(s));
  return { style: cs.outlineStyle, width: cs.outlineWidth, color: cs.outlineColor, offset: cs.outlineOffset };
}, sel);

const CASES = [
  { sel: '.skip', label: 'קישור הדילוג', want: 'navy' },
  { sel: '.nav-links a[href="#what"]', label: 'קישור ניווט (מה זה עושה)', want: 'navy' },
  { sel: '.nav-links .btn-ghost', label: '‎.btn-ghost‎ בסרגל (כניסת לקוחות)', want: 'navy' },
  { sel: '.hero .btn-primary', label: '‎.btn-primary‎ ב-hero', want: 'navy' },
  { sel: '.hero .btn-ghost', label: '‎.btn-ghost‎ ב-hero', want: 'navy' },
  { sel: '.plan:not(.featured) .btn-light', label: '‎.btn-light‎ בכרטיס מחירון', want: 'ring' },
  { sel: '.plan.featured .btn-primary', label: '‎.btn-primary‎ בכרטיס המודגש', want: 'ring' },
  { sel: '.cta-band .btn-ghost', label: '‎.btn-ghost‎ ברצועת הסיום', want: 'band' },
  { sel: '.footer a', label: 'קישור בפוטר', want: 'navy' },
];

const server = spawn(process.execPath, [STUB, String(PORT)], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 700));

let shot = 0;
const shotName = () => `${HERE}0${++shot}`;

const browser = await chromium.launch();
try {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 1280, height: 900 } });
    // Off-site requests. See the header: this is the page's own fallback state.
    await ctx.route(/^https:\/\/(more30\.com|fonts\.(googleapis|gstatic)\.com)\//, (r) => r.abort());
    const page = await ctx.newPage();
    await page.goto(BASE + '/');
    await page.waitForSelector('.cta-band .btn-ghost');
    const T = await TOKENS(page);

    for (const c of CASES) {
      const want = T[c.want];
      const presses = await tabTo(page, c.sel);
      if (!presses) { add({ mode, group: c.label, what: 'הגעה במקלדת', kind: 'בסיס', value: 'לא נמצא', ok: false }); continue; }

      await page.waitForTimeout(SETTLE);
      const o = await outlineOf(page, c.sel);
      add({
        mode, group: c.label, what: 'הטבעת מוצהרת אצלנו ולא של הדפדפן', kind: 'תיקון',
        value: `${o.style} ${o.width} ${hex(o.color)} · offset ${o.offset}`,
        ok: o.style === 'solid' && parseFloat(o.width) >= 2 && hex(o.color) === want,
        note: `הגעה ב-${presses} הקשות · צפוי ${want}`,
      });

      const css = await surfaceCss(page, c.sel);
      const m = await measure(page, c.sel, want);
      add({
        mode, group: c.label, what: 'הטבעת אכן נצבעת ברצועה שמחוץ לפקד', kind: 'תיקון',
        value: `${m.count} פיקסלים בצבע ${want}`, ok: m.count >= RING_MIN_PX,
        note: 'התאמה מדויקת לצבע הטוקן, לא הפיקסל החזק ברצועה',
      });
      add({
        mode, group: c.label, what: 'ניגודיות הטבעת מול המשטח מאחוריה (1.4.11 ⇐ 3:1)', kind: 'תיקון',
        value: `${m.wantRatio.toFixed(2)}:1 · ${want} מול ${hex(m.surface)}`,
        ok: m.wantRatio >= 3,
        note: `משטח מחושב (מורכב): ${hex(css)} · הפיקסל החזק ברצועה: ${hex(m.color)} ב-${m.ratio.toFixed(2)}:1`,
      });

      // ── the control: the shipped behaviour, in the same live page ──
      await page.addStyleTag({ content: `${c.sel}:focus-visible { outline: revert !important; outline-offset: 0 !important; }` });
      await page.waitForTimeout(SETTLE);
      const was = await outlineOf(page, c.sel);
      add({
        mode, group: c.label, what: '**לפני** — טבעת ברירת המחדל של הדפדפן', kind: 'לפני',
        value: `${was.style} ${was.width}`, ok: was.style === 'auto',
        note: 'חייב לעבור, אחרת לא היה כאן באג',
      });
      const wasM = await measure(page, c.sel, want);
      add({
        mode, group: c.label, what: '**לפני** — מה הדפדפן צייר בפועל', kind: 'ממצא',
        value: wasM ? `${wasM.ratio.toFixed(2)}:1 · ${hex(wasM.color)}` : '—', ok: true,
        note: `נמדד ולא נדרש: הערך אינו שלנו ואינו נקרא מ-getComputedStyle. פיקסלים בצבע הטוקן: ${wasM ? wasM.count : 0}`,
      });
      await page.evaluate(() => [...document.querySelectorAll('style')].pop().remove());
      await page.waitForTimeout(80);
    }

    // Screenshots: the three surfaces, each with a control focused on it.
    await page.evaluate(() => window.scrollTo(0, 0));
    await tabTo(page, '.nav-links .btn-ghost');
    await page.waitForTimeout(SETTLE);
    await page.screenshot({ path: `${shotName()}-nav-hero-${mode}.png`, clip: { x: 0, y: 0, width: 1280, height: 520 } });

    await tabTo(page, '.plan.featured .btn-primary');
    await page.waitForTimeout(SETTLE);
    await page.locator('.pricing').screenshot({ path: `${shotName()}-pricing-${mode}.png` });

    await tabTo(page, '.cta-band .btn-ghost');
    await page.waitForTimeout(SETTLE);
    await page.locator('.cta-band').screenshot({ path: `${shotName()}-cta-band-${mode}.png` });

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
