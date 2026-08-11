// The one line `admin-contrast-0811` found and deliberately did not fix:
// "`--accent-2` is text in one more place, `.plan li::before` on the **marketing**
// page, which is a different screen and untouched here." 2026-08-11.
//
// Same shape for the fifth time — a brand token beside a surface that inverts —
// and the second time it was somewhere a stylesheet sweep would not look: not an
// inline `style=` in a JS template this time, but **generated content**.
// `getComputedStyle(el)` does not return a pseudo-element's colour; every colour
// harness under item 6 read the element form, so `::before` was never in reach of
// any of them regardless of which page they ran on.
//
// Scope is the pricing section of `index.html` and nothing else: the ✓ that
// carries the defect, and the eight things painted beside it on the same three
// cards, so a fix cannot pass by moving the neighbours out from under the probe.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8879;
const BASE = `http://127.0.0.1:${PORT}`;

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const parse = (s) => { const n = s.match(/[\d.]+/g).map(Number); return { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? n[3] : 1 }; };
const over = (fg, bg) => [fg.r * fg.a + bg.r * (1 - fg.a), fg.g * fg.a + bg.g * (1 - fg.a), fg.b * fg.a + bg.b * (1 - fg.a)];
const ratio = (fgs, bgs) => {
  const bg = parse(bgs), fg = parse(fgs);
  const [x, y] = [lum(over(fg, bg)), lum([bg.r, bg.g, bg.b])].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const f = (n) => n.toFixed(2) + ':1';
// 1.4.3's large-text carve-out. It matters on this page in a way it did not on
// the admin screen: `.price` is 40px and lands on the 3:1 side, while the ✓ is
// `font-weight: 800` at the body's 16px and does **not** — 800 is only large
// text from 18.66px up. The defect is graded at 4.5:1 for that reason.
const threshold = (px, weight) => (px >= 24 || (px >= 18.66 && Number(weight) >= 700) ? 3 : 4.5);

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };
const push = (mode, screen, what, fg, bg, min, note = '') => {
  const r = ratio(fg, bg);
  rows.push({ mode, screen, what, fg, bg, ratio: f(r), raw: r, min: min + ':1', ok: r >= min, note });
  return rows[rows.length - 1];
};
const check = (...a) => { const row = push(...a); if (!row.ok) process.exitCode = 1; return row; };
const assert = (mode, screen, what, ok, value) => {
  rows.push({ mode, screen, what, fg: '—', bg: '—', ratio: value, raw: 0, min: '—', ok, note: 'עובדה' });
  if (!ok) fail(`${screen}: ${what} — ${value}`);
};

// `PAINTED` from `screens-enrol-settings-0811`, with the one change this run
// needs: an optional pseudo-element. `getComputedStyle(e, '::before')` returns
// the pseudo's own `color`/`font-*`, and the painted surface is still walked from
// the **originating** element upward — a `::before` has no box of its own in that
// walk and cannot carry a background here (`.plan li::before` sets none).
const PAINTED = ([sel, pseudo]) => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const s = getComputedStyle(e, pseudo || null);
  let n = e, bg = 'rgb(255, 255, 255)', alpha = 1;
  for (let p = e; p; p = p.parentElement) alpha *= Number(getComputedStyle(p).opacity);
  while (n) {
    const c = getComputedStyle(n).backgroundColor;
    if (c && !/rgba\(.*,\s*0\)$/.test(c) && c !== 'transparent') { bg = c; break; }
    n = n.parentElement;
  }
  const fg = s.color.match(/[\d.]+/g).map(Number);
  const a = (fg.length > 3 ? fg[3] : 1) * alpha;
  // For a pseudo, `textContent` is the parent's — report `content` instead, which
  // is the string actually painted. A probe that missed the pseudo and silently
  // fell back to the element would otherwise be unreadable in the table.
  return {
    color: `rgba(${fg[0]}, ${fg[1]}, ${fg[2]}, ${a})`, bg,
    text: pseudo ? s.content.replace(/^"|"$/g, '') : (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 34),
    size: parseFloat(s.fontSize), weight: s.fontWeight,
  };
};

const BORDER = (sel) => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const s = getComputedStyle(e);
  let n = e.parentElement, bg = 'rgb(255, 255, 255)';
  while (n) {
    const c = getComputedStyle(n).backgroundColor;
    if (c && !/rgba\(.*,\s*0\)$/.test(c) && c !== 'transparent') { bg = c; break; }
    n = n.parentElement;
  }
  return { color: s.borderBottomColor, outside: bg, inside: s.backgroundColor };
};

// Injected-value read, two frames + 60ms after the rule lands — `.btn` carries
// `transition: .15s`, the bug `nontext-contrast-0811` found in its own harness.
// Takes a pseudo for the same reason `PAINTED` does.
const BEFORE = ([sel, css, pseudo]) => new Promise((done) => {
  const s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
  requestAnimationFrame(() => setTimeout(() => {
    const c = getComputedStyle(document.querySelector(sel), pseudo || null).color;
    s.remove();
    done(c);
  }, 60));
});

const server = spawn(process.execPath, [STUB, String(PORT)], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 900));

const browser = await chromium.launch();
let shot = 0;
const name = () => `${HERE}${String(++shot).padStart(2, '0')}`;

const P = 'מחירים (index.html)';

try {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 1280, height: 1000 } });
    const page = await ctx.newPage();
    // The shared login pill and the webfont, both third-party: the pill is
    // `auth-button.js` from more30.com and the font is Google's. Neither is under
    // test and both make the run depend on the network.
    await page.route('**://more30.com/**', (r) => r.abort());
    await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
    await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
    await page.goto(BASE + '/');
    await page.waitForSelector('#pricing .plan');

    // The head script toggles `:root.dark` off `matchMedia` rather than off a
    // media query in the stylesheet. Asserted, not assumed: if it did not run,
    // both passes below would grade the light page and the dark rows would be a
    // copy of the light ones wearing the wrong label.
    assert(mode, P, 'מצב הצבע החיל את :root.dark כצפוי',
      await page.evaluate((m) => document.documentElement.classList.contains('dark') === (m === 'dark'), mode),
      await page.evaluate(() => 'html.class=' + (document.documentElement.className || '(ריק)')));

    // The pseudo is the reason this file exists — asserted before it is graded,
    // because a `::before` that never generated and one that is the right colour
    // both read as "no failure" from the ratio alone.
    assert(mode, P, '‎.plan li::before‎ מייצר תוכן (content: "✓")',
      await page.evaluate(() => getComputedStyle(document.querySelector('#pricing .plan li'), '::before').content.includes('✓')),
      await page.evaluate(() => getComputedStyle(document.querySelector('#pricing .plan li'), '::before').content));

    const grade = async (list) => {
      for (const [sel, what, pseudo] of list) {
        const el = await page.evaluate(PAINTED, [sel, pseudo]);
        if (!el) { fail(`${P}: ${sel} לא נמצא`); continue; }
        check(mode, P, `${what} — "${el.text}"`, el.color, el.bg, threshold(el.size, el.weight), `${el.size}px/${el.weight}`);
      }
    };

    await grade([
      // The defect. Graded on the first card and on `.featured` — same rule, but
      // `.featured` is the only `.plan` with a 2px `--accent` border and the one a
      // reader looks at first.
      ['#pricing .plan:nth-child(1) li', '**ה-✓ של הפריט** — ‎.plan li::before‎', '::before'],
      ['#pricing .plan.featured li', '**ה-✓ בכרטיס המודגש** — ‎.plan li::before‎', '::before'],
      ['#pricing .plan:nth-child(3) li:last-child', '**ה-✓ בפריט האחרון** — ‎.plan li::before‎', '::before'],
      // The eight things painted beside it on the same cards.
      ['#pricing h2', 'כותרת המקטע'],
      ['#pricing .plan:nth-child(1) h3', 'שם המסלול ("Starter")'],
      ['#pricing .plan:nth-child(1) .price', 'המחיר (40px/800)'],
      ['#pricing .plan:nth-child(1) .price small', 'ה-"/חודש" שליד המחיר (--muted)'],
      ['#pricing .plan:nth-child(1) li', 'טקסט הפריט עצמו'],
      ['#pricing .plan:nth-child(1) .btn-light', 'כפתור "התחלה" (btn-light)'],
      ['#pricing .plan.featured .btn-primary', 'כפתור "הנפוץ ביותר" (btn-primary)'],
      ['#pricing .plan:nth-child(3) h3', 'שם המסלול ("Enterprise")'],
      ['#pricing .plan:nth-child(3) .price', 'המחיר "מותאם" (40px/800)'],
    ]);

    // Reported, not asserted — `--line` is the console-wide decision every
    // contrast step so far has left open on purpose, and the dashed rule between
    // two list items is not where it gets decided either.
    const lb = await page.evaluate(BORDER, '#pricing .plan:nth-child(1) li');
    push(mode, P, 'הקו המקווקו בין הפריטים מול הכרטיס (--line, מדווח בלבד)', lb.color, lb.outside, 3, 'לא-טקסט');

    await page.locator('#pricing').screenshot({ path: `${name()}-pricing-${mode}.png` });
    await page.locator('#pricing .plan.featured').screenshot({ path: `${name()}-featured-${mode}.png` });

    // ── the "before", re-measured rather than quoted ───────────────────
    // `--accent-2` is one value for both modes, so this row is expected to fail in
    // **light** and pass in dark — 2.28:1 on a white card, 7.47:1 on a near-black
    // one. Saying so here is what stops the dark row from reading as a second bug.
    const wasBg = (await page.evaluate(PAINTED, ['#pricing .plan:nth-child(1) li', '::before'])).bg;
    const was = await page.evaluate(BEFORE, ['#pricing .plan:nth-child(1) li',
      '#pricing .plan li::before { color: #22c55e !important; }', '::before']);
    push(mode, P, 'ה-✓ — **לפני** (var(--accent-2) ‎#22c55e‎)', was, wasBg, 4.5,
      mode === 'light' ? 'אמור ליפול' : 'עבר גם לפני');

    // Sanity: an injected value that must fail, per mode — one grey cannot be a
    // near-miss on both a white card and a near-black one.
    const BAD = { light: '#b9c3d4', dark: '#2a3550' }[mode];
    const badBg = (await page.evaluate(PAINTED, ['#pricing .plan:nth-child(1) h3'])).bg;
    const bad = await page.evaluate(BEFORE, ['#pricing .plan:nth-child(1) h3',
      '#pricing .plan h3 { color: ' + BAD + ' !important; }']);
    push(mode, P, 'שם המסלול — ערך פסול שהוזרק (בקרת שפיות)', bad, badBg, 4.5);

    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log('\n| מצב | מסך | מה נמדד | קדמת | רקע | יחס | סף | הערה | |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.mode} | ${r.screen} | ${r.what} | \`${r.fg}\` | \`${r.bg}\` | **${r.ratio}** | ${r.min} | ${r.note} | ${r.ok ? '✅' : '❌'} |`);
}
const graded = rows.filter((r) => !/בקרת שפיות|\*\*לפני\*\*|מדווח בלבד|עובדה/.test(r.what + r.note));
const controls = rows.filter((r) => /בקרת שפיות|\*\*לפני\*\*/.test(r.what));
console.log(`\n${graded.filter((r) => r.ok).length}/${graded.length} שורות נמדדות עוברות.`);
console.log(`${controls.length} שורות בקרה: ${controls.filter((r) => !r.ok).length} נפלו (צפוי: 3 — בקרת שפיות ×2, ו"לפני" בבהיר בלבד).`);
if (!controls.some((r) => !r.ok)) fail('אף שורת בקרה לא נפלה — הבדיקה אינה מסוגלת ליפול.');
