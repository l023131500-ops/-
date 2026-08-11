/**
 * `--line` in one pass — #35 KioskFleet, 2026-08-11.
 *
 * Three earlier steps (`dark-inputs-0811`, `nontext-contrast-0811`,
 * `button-boundary-0811`) each found something drawn with `--line`, split it
 * out into its own token, and recorded that `--line` itself was still open:
 * 1.29:1 in dark, ~1.2:1 in light, and it draws the wizard's step rows, the
 * table rules and every card edge. `setup-wizard-console-0811` named the step
 * row specifically and left it. The note each of them left was the same — it
 * wants **measuring in one pass** rather than another token guessed at.
 *
 * So this run measures *every* `--line` consumer that renders in the console,
 * in both colour schemes, against the surface actually painted behind it, and
 * splits them into the two kinds WCAG 1.4.11 distinguishes:
 *
 *   - a **control's own boundary** — 3:1 required. There is exactly one:
 *     `.wz-step`, which is a `<label>` wrapping a checkbox with the whole row
 *     clickable. Its sibling in the same dialog, `.wz-track label`, is the same
 *     shape and already uses `--field-border`; the two disagreed.
 *   - **separators between surfaces** — card edges, table rules, the sunken
 *     `.hl-row`. 1.4.11 exempts these, and none of them is the only thing
 *     marking its boundary (cards carry `--shadow` and a fill; `.hl-row` and
 *     `.wz-step.wz-ticked` carry `--sunken`). They are measured and printed
 *     anyway, as `ℹ️` rows, so the decision to leave them is a number rather
 *     than an assumption — and so the next person can see what changing
 *     `--line` would cost.
 *
 * Every value is read from `getComputedStyle` in a real Chromium against a stub
 * that serves the actual `server/public/`. The stub is
 * `setup-wizard-console-0811/stub-server.mjs` rather than a copy: it already
 * answers the four setup routes through the real `setupsteps.js` /
 * `setupprogress.js` over the production DDL on `node:sqlite`, and the screen
 * under test is the one it was built to open.
 *
 * Run: node QA/kiosk/line-contrast-0811/verify.mjs
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../setup-wizard-console-0811/stub-server.mjs', import.meta.url));
const PORT = 4187;
const BASE = `http://127.0.0.1:${PORT}`;

// The value `.wz-step` was drawn with before this change, per mode — re-injected
// in the same run so the "before" row is measured rather than quoted.
const OLD_LINE = { light: '#e4e9f2', dark: '#23304a' };

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const rgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);
const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const f = (n) => n.toFixed(2) + ':1';

const rows = [];
/** min = 0 marks a separator: measured and printed, never failed. */
const check = (mode, what, fg, bg, min) => {
  const r = ratio(fg, bg);
  const ok = min === 0 ? null : r >= min;
  rows.push({ mode, what, fg, bg, ratio: f(r), min: min === 0 ? '—' : min + ':1', ok });
  if (ok === false) process.exitCode = 1;
  return r;
};

// The surface actually painted behind an element: these rows sit on `.modal`,
// `.card`, `.device` and the page itself, and one quoted token would be right
// for some and wrong for the rest. Same walk `button-boundary-0811` used.
const PAINTED = `(el) => {
  let n = el.parentElement;
  while (n) {
    const bg = getComputedStyle(n).backgroundColor;
    const a = bg.match(/[\\d.]+/g);
    if (a && (a.length < 4 || Number(a[3]) > 0.5)) return bg;
    n = n.parentElement;
  }
  return getComputedStyle(document.body).backgroundColor;
}`;

const server = spawn(process.execPath, [STUB, String(PORT)], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 900));

const browser = await chromium.launch();
try {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 1280, height: 980 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));
    await page.goto(BASE + '/console');
    await page.waitForSelector('.device', { timeout: 10000 });

    // --- the separators, on the devices screen ---
    const sep = await page.evaluate((paintedSrc) => {
      const painted = eval(paintedSrc);
      const of = (sel) => {
        const e = document.querySelector(sel);
        if (!e) return null;
        const s = getComputedStyle(e);
        return { border: s.borderBottomColor, fill: s.backgroundColor, behind: painted(e) };
      };
      return { device: of('.device'), card: of('.card'), page: getComputedStyle(document.body).backgroundColor };
    }, PAINTED);
    if (sep.device) {
      check(mode, '`.device` — מסגרת הכרטיס מול המשטח שמאחוריו', sep.device.border, sep.device.behind, 0);
      check(mode, '`.device` — מילוי הכרטיס מול המשטח שמאחוריו', sep.device.fill, sep.device.behind, 0);
    }
    if (sep.card) check(mode, '`.card` — מסגרת מול המשטח שמאחוריה', sep.card.border, sep.card.behind, 0);

    // --- the wizard: the one control drawn with --line ---
    await page.locator('.device').first().getByRole('button', { name: /הפעל/ }).click();
    await page.waitForSelector('.wz-step', { timeout: 8000 });

    const wz = await page.evaluate((paintedSrc) => {
      const painted = eval(paintedSrc);
      const read = (e) => {
        const s = getComputedStyle(e);
        return { border: s.borderTopColor, fill: s.backgroundColor, behind: painted(e) };
      };
      const plain = [...document.querySelectorAll('.wz-step')].find((e) => !e.classList.contains('wz-next') && !e.classList.contains('wz-ticked'));
      const next = document.querySelector('.wz-step.wz-next');
      const trackLabel = document.querySelector('.wz-track label');
      return {
        plain: plain && read(plain),
        next: next && read(next),
        track: trackLabel && read(trackLabel),
        steps: document.querySelectorAll('.wz-step').length,
      };
    }, PAINTED);

    // A control's boundary has to hold against *both* surfaces it touches: the
    // card outside it and the row's own fill inside it. A border that vanishes
    // on one side has vanished.
    check(mode, '`.wz-step` — מסגרת מול המשטח שמאחוריה (פקד)', wz.plain.border, wz.plain.behind, 3);
    check(mode, '`.wz-step` — מסגרת מול מילוי השורה (פקד)', wz.plain.border, wz.plain.fill, 3);
    // The same shape one dialog-section up, already on --field-border. This row
    // is the reason the step row is the odd one out rather than a design choice.
    check(mode, '`.wz-track label` — אותה צורה, כבר על ‎--field-border‎', wz.track.border, wz.track.behind, 3);
    // The "next step" ring is --accent, not --line; re-measured so this change
    // is not claimed to have fixed something that was already right.
    check(mode, '`.wz-step.wz-next` — טבעת ‎--accent‎ (רגרסיה)', wz.next.border, wz.next.behind, 3);

    // "before", same DOM, same run: --line put back on this one rule.
    const before = await page.evaluate((old) => {
      const style = document.createElement('style');
      style.id = 'qa-before';
      style.textContent = `.wz-step:not(.wz-next) { border-color: ${old} !important; }`;
      document.head.appendChild(style);
      const e = [...document.querySelectorAll('.wz-step')].find((x) => !x.classList.contains('wz-next') && !x.classList.contains('wz-ticked'));
      const s = getComputedStyle(e);
      const c = { border: s.borderTopColor, fill: s.backgroundColor };
      style.remove();
      return c;
    }, OLD_LINE[mode]);
    check(mode, '`.wz-step` — **לפני** (‎--line‎ הוזרק מחדש)', before.border, before.behind ?? wz.plain.behind, 3);

    // Tick a box: the ticked row's fill is --sunken, so the border meets a
    // different surface there and the same 3:1 has to hold.
    await page.locator('.wz-step input').nth(1).check();
    await page.waitForTimeout(400);
    const ticked = await page.evaluate((paintedSrc) => {
      const painted = eval(paintedSrc);
      const e = document.querySelector('.wz-step.wz-ticked');
      if (!e) return null;
      const s = getComputedStyle(e);
      return { border: s.borderTopColor, fill: s.backgroundColor, behind: painted(e) };
    }, PAINTED);
    if (ticked) {
      check(mode, '`.wz-step.wz-ticked` — מסגרת מול המילוי השקוע (פקד)', ticked.border, ticked.fill, 3);
      check(mode, '`.wz-step.wz-ticked` — מסגרת מול המשטח שמאחוריה (פקד)', ticked.border, ticked.behind, 0);
    }

    console.log(`[${mode}] ${wz.steps} שלבים · wz-step border=${wz.plain.border} · לפני=${before.border}`);
    await page.locator('.modal').screenshot({ path: `${HERE}0${mode === 'light' ? 1 : 2}-wizard-${mode}.png` });
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log('\n| מצב | מה נמדד | קדמת | רקע | יחס | סף | |');
console.log('|---|---|---|---|---|---|---|');
for (const r of rows) {
  const mark = r.ok === null ? 'ℹ️' : r.ok ? '✅' : '❌';
  console.log(`| ${r.mode} | ${r.what} | \`${r.fg}\` | \`${r.bg}\` | **${r.ratio}** | ${r.min} | ${mark} |`);
}
const graded = rows.filter((r) => r.ok !== null);
console.log(`\n${graded.filter((r) => r.ok).length}/${graded.length} עוברים (שורות ה"לפני" אמורות ליפול), ${rows.length - graded.length} שורות מידע.`);
