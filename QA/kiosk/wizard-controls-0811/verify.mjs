// QA for the obligation `screens-approvals-code-0811` left behind: that run put
// `accent-color: var(--accent-control)` on `:root`, which is a **global**
// declaration, and measured it on exactly one screen — the approvals picker,
// where the checkbox sits on the modal's own `--card`. 2026-08-11.
//
// The wizard is the other place in the console the browser draws a control, and
// its controls do **not** sit on `--card`:
//
//   * `.wz-step.wz-ticked { background: var(--sunken) }` — so the checkbox of a
//     step someone has already ticked, the one carrying the accent fill, is on a
//     different surface from the one that was measured;
//   * `.wz-track label { background: var(--sunken) }` — the two §2★ו track
//     radios, which had never been measured at all, in any run;
//   * and `--sunken` moves the other way in dark (`#0d1626`, *below* `--card`
//     `#131c2e`) from the way it moves in light (`#f7f9fc`, below `#ffffff`),
//     so the two modes are not one question.
//
// A token chosen against one surface and applied to every surface is the same
// shape of mistake as a colour written beside an inverting token — passing where
// it was measured says nothing about where it was not. So this is a
// re-measurement, and the wizard's own text rows are graded in the same pass
// since item 6's screen-by-screen sweep never covered them either.
//
// Harness is `screens-approvals-code-0811/verify.mjs` — its `sampleBox()`, its
// per-mode injected control row, its scoped selectors, its hierarchy check.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8811;
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
const threshold = (px, weight) => (px >= 24 || (px >= 18.66 && Number(weight) >= 700) ? 3 : 4.5);

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };
const push = (mode, screen, what, fg, bg, min, note = '') => {
  const r = ratio(fg, bg);
  rows.push({ mode, screen, what, fg, bg, ratio: f(r), raw: r, min: min + ':1', ok: r >= min, note });
  return rows[rows.length - 1];
};
const check = (...a) => { const row = push(...a); if (!row.ok) process.exitCode = 1; return row; };

// The surface actually painted behind the node, with every ancestor `opacity`
// folded into the foreground's alpha. Load-bearing here: the wizard stacks three
// surfaces inside one dialog — the modal, `.wz-step`'s `--card`, and the
// `--sunken` of a ticked row — and a walk that stopped at the modal would grade
// every row against the wrong one.
const PAINTED = (sel) => {
  const e = typeof sel === 'string' ? document.querySelector(sel) : sel;
  if (!e) return null;
  const s = getComputedStyle(e);
  let n = e, bg = 'rgb(255, 255, 255)', alpha = 1;
  for (let p = e; p; p = p.parentElement) alpha *= Number(getComputedStyle(p).opacity);
  while (n) {
    const c = getComputedStyle(n).backgroundColor;
    if (c && !/rgba\(.*,\s*0\)$/.test(c) && c !== 'transparent') { bg = c; break; }
    n = n.parentElement;
  }
  const fg = s.color.match(/[\d.]+/g).map(Number);
  const a = (fg.length > 3 ? fg[3] : 1) * alpha;
  return {
    color: `rgba(${fg[0]}, ${fg[1]}, ${fg[2]}, ${a})`, bg,
    text: (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 34),
    size: parseFloat(s.fontSize), weight: s.fontWeight,
  };
};

/**
 * Every pixel Chromium actually painted inside one element's box — the only way
 * to read a control the UA draws, which has no `border-color` and no
 * `background-color` of its own. The caller takes the extreme, which is a
 * one-sided test: an upper bound on the boundary, so it can miss a failure but
 * cannot invent one.
 *
 * Two additions the approvals run did not need and this one does, both because
 * the wizard is the first screen taller than the viewport: the element is
 * scrolled into view first (the ticked step is the 7th of 12), and the read is
 * refused if the box still falls outside the shot. `getImageData` outside the
 * canvas returns **transparent black** rather than an error, and transparent
 * black is `rgb(0, 0, 0)` once alpha is dropped — which scores 19.91:1 on a
 * light surface and 1.16:1 on a dark one. That is not a near miss in one mode
 * and a pass in the other; it is the same non-measurement twice, and it is
 * exactly the shape of thing that would have been written down as a finding.
 */
async function sampleBox(page, sel, nth = 0) {
  const rect = await page.evaluate(([s, i]) => {
    const e = document.querySelectorAll(s)[i];
    if (!e) return null;
    e.scrollIntoView({ block: 'center', inline: 'center' });
    const r = e.getBoundingClientRect();
    return {
      x: r.x, y: r.y, w: r.width, h: r.height,
      inside: r.x >= 0 && r.y >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
    };
  }, [sel, nth]);
  if (!rect || rect.w < 1 || rect.h < 1) return null;
  if (!rect.inside) throw new Error(`${sel}[${nth}] מחוץ לחלון הנראה (${JSON.stringify(rect)}) — דגימה כזו מחזירה שחור שקוף, לא צבע`);
  await page.waitForTimeout(120); // smooth scrolling is off by default, but the modal repaints
  const b64 = (await page.screenshot()).toString('base64');
  const px = await page.evaluate(async ({ b64, rect }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const k = img.width / window.innerWidth;
    const d = g.getImageData(Math.round(rect.x * k), Math.round(rect.y * k),
      Math.max(1, Math.round(rect.w * k)), Math.max(1, Math.round(rect.h * k))).data;
    const out = [];
    for (let i = 0; i < d.length; i += 4) out.push([d[i], d[i + 1], d[i + 2], d[i + 3]]);
    return out;
  }, { b64, rect });
  if (px.some((p) => p[3] !== 255)) throw new Error(`${sel}[${nth}] הוחזרו פיקסלים שקופים — הדגימה חרגה מהצילום`);
  return px.map((p) => `rgb(${p[0]}, ${p[1]}, ${p[2]})`);
}

// The extreme pixel in a control's box against the surface it sits on.
const controlRow = async (page, mode, screen, sel, nth, what, surface, min = 3, note = '1.4.11, דגימה') => {
  const px = await sampleBox(page, sel, nth);
  if (!px) { fail(`${screen}: ${sel}[${nth}] לא נמצא`); return null; }
  let best = null, r = 0;
  for (const p of px) { const q = ratio(p, surface); if (q > r) { r = q; best = p; } }
  check(mode, screen, what, best, surface, min, note);
  return best;
};

const BEFORE = ([sel, css]) => new Promise((done) => {
  const s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
  requestAnimationFrame(() => setTimeout(() => {
    const c = getComputedStyle(document.querySelector(sel)).color;
    s.remove();
    done(c);
  }, 60));
});

const server = spawn(process.execPath, [STUB, String(PORT)], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch();
let shot = 0;
const name = () => `${HERE}${++shot < 10 ? '0' : ''}${shot}`;

const grade = async (page, mode, screen, list) => {
  const out = {};
  for (const [key, sel, what] of list) {
    const el = await page.evaluate(PAINTED, `.modal-bg ${sel}`);
    if (!el) { fail(`${screen}: ${sel} לא נמצא`); continue; }
    out[key] = el;
    check(mode, screen, `${what} — "${el.text}"`, el.color, el.bg, threshold(el.size, el.weight), `${el.size}px/${el.weight}`);
  }
  return out;
};

// A line meant to read as subordinate to the one above it must differ from it in
// colour or in size; same colour *and* same size means the two read as one block.
const hierarchy = (mode, screen, label, primary, secondary) => {
  if (!primary || !secondary) return;
  if (primary.color === secondary.color && primary.size === secondary.size) {
    fail(`${screen}: ${label} — ${secondary.color} ${secondary.size}px, זהה לשורה שמעליה; שתיהן נקראות כטקסט אחד`);
  } else {
    console.log(`[${mode}] ${screen} · ${label}: ${primary.color} ${primary.size}px מול ${secondary.color} ${secondary.size}px ✅`);
  }
};

const WANT = { light: 'rgb(42, 97, 232)', dark: 'rgb(126, 166, 255)' };

try {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 1280, height: 1100 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));
    await page.goto(BASE + '/console');
    await page.waitForSelector('.device');

    // Device 1 is the one the stub gives a track (`gms`) and one ticked step
    // (`no-accounts`) — i.e. the only one that renders a checked radio, a checked
    // checkbox on `--sunken`, and unchecked ones, which is the whole matrix.
    await page.locator('.device').first().getByRole('button', { name: '🚀 הפעל' }).click();
    await page.waitForSelector('#wz-list .wz-step');

    const W = 'אשף התקנה';

    // ── the text of the screen ────────────────────────────────────
    const t = await grade(page, mode, W, [
      ['h3', 'h3', 'כותרת האשף'],
      ['sub', '.wz-sub', 'שורת ההסבר (--muted, 13px)'],
      ['trk', '#wz-track label b', 'שם המסלול (14px/700)'],
      ['hint', '#wz-track label span span', 'ההסבר של המסלול (--muted, 12px)'],
      ['cnt', '#wz-count', 'מונה "כמה מתוך כמה" (--muted, 13px)'],
      ['title', '.wz-step .wz-title', 'כותרת השלב (15px/700)'],
      ['do', '.wz-step .wz-do', 'מה לעשות (13px)'],
      ['expect', '.wz-step .wz-expect', 'מה אמור להופיע (--muted, 13px)'],
      ['warn', '.wz-step .wz-warn', 'אזהרת השלב (13px)'],
      ['cmd', '.wz-cmd code', 'הפקודה להעתקה (monospace, 13px)'],
      ['copy', '.wz-cmd .btn', 'כפתור "העתקה"'],
      ['close', '#wz-close', 'כפתור "סגירה"'],
      ['reset', '#wz-reset', 'כפתור "התחל מחדש"'],
    ]);
    hierarchy(mode, W, 'מה לעשות מול כותרת השלב', t.title, t.do);
    hierarchy(mode, W, '"אמור להופיע" מול "מה לעשות"', t.do, t.expect);
    hierarchy(mode, W, 'ההסבר מול שם המסלול', t.trk, t.hint);

    // The "all steps ticked" banner never renders on the way in — the stub's
    // device is one tick of twelve — so it is unhidden to be graded rather than
    // left as the one line in the dialog nobody has measured. It is the sentence
    // that says the device is locked and how to get out.
    await page.evaluate(() => document.querySelector('.modal-bg #wz-complete').classList.remove('hidden'));
    const done = await page.evaluate(PAINTED, '.modal-bg #wz-complete');
    check(mode, W, `הודעת "כל השלבים סומנו" (הוסתרה, נחשפה למדידה) — "${done.text}"`, done.color, done.bg, threshold(done.size, done.weight), `${done.size}px/${done.weight}`);
    await page.evaluate(() => document.querySelector('.modal-bg #wz-complete').classList.add('hidden'));

    // ── the controls, which is why this run exists ────────────────
    // Indices resolved from the DOM rather than assumed: which track is checked
    // is the stub's `setupTrack`, and which step is ticked is `TICKED`, and both
    // are things a future edit to the stub would move silently.
    const idx = await page.evaluate(() => {
      const box = [...document.querySelectorAll('.modal-bg #wz-list input[type=checkbox]')];
      const radio = [...document.querySelectorAll('.modal-bg #wz-track input[type=radio]')];
      return {
        boxOn: box.findIndex((b) => b.checked), boxOff: box.findIndex((b) => !b.checked),
        radioOn: radio.findIndex((r) => r.checked), radioOff: radio.findIndex((r) => !r.checked),
      };
    });
    for (const [k, v] of Object.entries(idx)) if (v < 0) fail(`${W}: אין פקד במצב ${k} — המטריצה חסרה`);

    // Each control against the surface it is actually on, read from the painted
    // pixels of its own row. Three different surfaces in one dialog.
    const tickedBg = (await page.evaluate(PAINTED, '.modal-bg .wz-step.wz-ticked')).bg;
    const plainBg = (await page.evaluate(PAINTED, '.modal-bg .wz-step:not(.wz-ticked)')).bg;
    const trackBg = (await page.evaluate(PAINTED, '.modal-bg #wz-track label')).bg;
    console.log(`[${mode}] משטחים — שורה מסומנת ${tickedBg} · שורה רגילה ${plainBg} · מסלול ${trackBg}`);
    if (tickedBg === plainBg) fail(`${W}: --sunken ו---card זהים (${tickedBg}); השאלה שהריצה הזו נועדה לענות עליה אינה קיימת`);

    const onBox = await controlRow(page, mode, W, '#wz-list input[type=checkbox]', idx.boxOn,
      'גבול תיבת הסימון (מסומנת) — על **--sunken** של שורה שסומנה', tickedBg);
    await controlRow(page, mode, W, '#wz-list input[type=checkbox]', idx.boxOff,
      'גבול תיבת הסימון (לא מסומנת) — על --card', plainBg);
    const onRadio = await controlRow(page, mode, W, '#wz-track input[type=radio]', idx.radioOn,
      'גבול כפתור הרדיו (נבחר) — על --sunken של שורת המסלול', trackBg);
    await controlRow(page, mode, W, '#wz-track input[type=radio]', idx.radioOff,
      'גבול כפתור הרדיו (לא נבחר) — על --sunken', trackBg);

    // The hue, not only the ratio: that is what the approvals run found, and a
    // global `accent-color` has to reach here too or the console has two blues.
    for (const [what, got] of [['תיבת סימון', onBox], ['כפתור רדיו', onRadio]]) {
      if (!got) continue;
      if (got !== WANT[mode]) fail(`${W}: ${what} מסומן נצבע ${got}, לא ‎--accent-control‎ (${WANT[mode]})`);
      else console.log(`[${mode}] ${what} מסומן — ‎--accent-control‎ ${got} ✅`);
    }

    await page.locator('.modal').screenshot({ path: `${name()}-wizard-${mode}.png` });

    // The "before": the UA default this replaced, on the surfaces above rather
    // than on the modal. Recorded, not asserted to fail — the point of the fix
    // was the hue, which a ratio cannot say.
    await page.addStyleTag({ content: ':root { accent-color: auto !important; }' });
    await page.waitForTimeout(120);
    const wasPx = await sampleBox(page, '#wz-list input[type=checkbox]', idx.boxOn);
    let was = null, wr = 0;
    for (const p of wasPx) { const q = ratio(p, tickedBg); if (q > wr) { wr = q; was = p; } }
    push(mode, W, 'גבול תיבת הסימון (מסומנת) — **לפני**, ברירת המחדל של הדפדפן', was, tickedBg, 3, 'עבר גם לפני — הבעיה היא הגוון');
    await page.evaluate(() => [...document.querySelectorAll('style')].pop().remove());

    // The injected control row: without it the table above is a list of numbers
    // that cannot fail. Per mode — one grey cannot be a near-miss on both a white
    // card and a near-black one.
    const BAD = { light: '#b9c3d4', dark: '#2a3550' }[mode];
    const badBg = (await page.evaluate(PAINTED, '.modal-bg h3')).bg;
    const bad = await page.evaluate(BEFORE, ['.modal-bg h3', '.modal h3 { color: ' + BAD + ' !important; }']);
    push(mode, W, 'כותרת האשף — ערך פסול שהוזרק (בקרת שפיות)', bad, badBg, 4.5);

    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log('\n| מצב | מסך | מה נמדד | קדמת | רקע | יחס | סף | גודל/משקל | |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.mode} | ${r.screen} | ${r.what} | \`${r.fg}\` | \`${r.bg}\` | **${r.ratio}** | ${r.min} | ${r.note} | ${r.ok ? '✅' : '❌'} |`);
}
const before = rows.filter((r) => /בקרת שפיות/.test(r.what));
console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} עוברים. ${before.length} שורות בקרה (אמורות ליפול): ${before.filter((r) => !r.ok).length} נפלו.`);
if (before.some((r) => r.ok)) fail('שורת הבקרה עברה — הבדיקה אינה מסוגלת ליפול.');
