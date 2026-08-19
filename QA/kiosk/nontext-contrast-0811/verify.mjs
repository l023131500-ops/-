// QA for the non-text contrast step (WCAG 1.4.11 / 1.4.3), 2026-08-11.
//
// The change is CSS only, so what has to be real is the stylesheet and the DOM
// it lands on: `stub-server.mjs` serves the actual `server/public/` and cans
// only the API, and every number below is read out of `getComputedStyle` in a
// real Chromium rather than from the file.
//
// Both modes are driven with `emulateMedia({colorScheme})` — the OS preference,
// not a hand-toggled class — because that is how a person arrives at the dark
// console.
//
// The "before" row of each table is measured in the same run by re-injecting
// the declaration that was replaced, so the improvement is not quoted from
// memory.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PORT = 8794;
const BASE = `http://127.0.0.1:${PORT}`;

const OLD = { light: '#e4e9f2', dark: '#2f3f60', dangerInk: '#ef4444' };

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const rgb = (s) => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const f = (n) => n.toFixed(2) + ':1';

const rows = [];
const check = (mode, what, fg, bg, min) => {
  const r = ratio(fg, bg);
  const ok = r >= min;
  rows.push({ mode, what, fg, bg, ratio: f(r), min: min + ':1', ok });
  if (!ok) process.exitCode = 1;
  return r;
};

const server = spawn(process.execPath, [HERE + 'stub-server.mjs', String(PORT)], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch();
try {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    // The console shows the login card until `kf_token` is in localStorage; the
    // stub answers /api/auth/me regardless of the value, so any token gets us
    // to the screen under test.
    await page.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));
    await page.goto(BASE + '/console');
    await page.waitForSelector('.device', { timeout: 8000 });

    // --- the delete button: text on its own fill (1.4.3, normal text, 4.5:1) ---
    // The device card's own delete control is the 🗑️ glyph, so the button
    // carrying real text is measured where one exists: the confirmation dialog
    // it opens ("כן, בצע" / "מחק"). Same declaration, but 1.4.3 is about text.
    await page.locator('.device').first().getByRole('button', { name: '🗑️' }).click();
    await page.waitForSelector('.modal .btn-danger');
    const del = page.locator('.modal .btn-danger').first();
    const btn = await del.evaluate((e) => {
      const s = getComputedStyle(e);
      return { color: s.color, bg: s.backgroundColor, text: e.textContent.trim() };
    });
    check(mode, `.btn-danger ("${btn.text}") על הרקע שלו`, btn.color, btn.bg, 4.5);

    // `.btn` carries `transition: .15s`, i.e. *all* properties including
    // `color`, so reading the computed value in the same tick as the injection
    // returns the value the transition started from — which here is the new
    // colour, and would have quietly reported the old one as already fixed.
    // The wait is what makes this row a measurement rather than an echo.
    const before = await del.evaluate(async (e, old) => {
      const style = document.createElement('style');
      style.textContent = `.modal .btn-danger { color: ${old} !important; }`;
      document.head.appendChild(style);
      await new Promise((r) => setTimeout(r, 300));
      const c = getComputedStyle(e).color;
      style.remove();
      return c;
    }, OLD.dangerInk);
    rows.push({ mode, what: '.btn-danger — לפני (הוזרק מחדש)', fg: before, bg: btn.bg, ratio: f(ratio(before, btn.bg)), min: '4.5:1', ok: ratio(before, btn.bg) >= 4.5 });
    await page.screenshot({ path: `${HERE}0${mode === 'light' ? 5 : 6}-danger-${mode}.png` });
    await page.locator('.modal .btn-light').first().click();
    await page.waitForTimeout(150);

    // --- the field border, against both surfaces it touches (1.4.11, 3:1) ---
    await page.locator('.device').first().getByRole('button', { name: /עריכה/ }).click();
    await page.waitForSelector('.modal #h');

    const m = await page.evaluate(() => {
      const g = (sel) => getComputedStyle(document.querySelector(sel));
      const modal = g('.modal');
      const field = g('.modal #h');
      const hlnew = document.querySelector('.modal .hl-new') ? g('.modal .hl-new') : null;
      const hlrow = document.querySelector('.modal .hl-row') ? g('.modal .hl-row') : null;
      return {
        card: modal.backgroundColor,
        border: field.borderTopColor,
        fill: field.backgroundColor,
        text: field.color,
        hlNewBorder: hlnew && hlnew.borderTopColor,
        hlRowBg: hlrow && hlrow.backgroundColor,
        scheme: getComputedStyle(document.documentElement).colorScheme,
      };
    });

    check(mode, 'מסגרת השדה מול הכרטיס', m.border, m.card, 3);
    check(mode, 'מסגרת השדה מול מילוי השדה', m.border, m.fill, 3);
    if (m.hlNewBorder) check(mode, 'מסגרת .hl-new מול הכרטיס', m.hlNewBorder, m.card, 3);

    // focus: the border becomes --accent over the focus fill.
    await page.locator('.modal #h').focus();
    const fc = await page.evaluate(() => {
      const s = getComputedStyle(document.querySelector('.modal #h'));
      return { border: s.borderTopColor, fill: s.backgroundColor };
    });
    check(mode, 'מסגרת בפוקוס מול מילוי הפוקוס', fc.border, fc.fill, 3);
    await page.locator('.modal h3').click();

    // "before", same run, same DOM.
    const beforeBorder = await page.evaluate((old) => {
      const style = document.createElement('style');
      style.textContent = `:root, :root.dark { --field-border: ${old} !important; }`;
      document.head.appendChild(style);
      const c = getComputedStyle(document.querySelector('.modal #h')).borderTopColor;
      style.remove();
      return c;
    }, OLD[mode]);
    rows.push({
      mode, what: 'מסגרת השדה — לפני (הוזרקה מחדש)', fg: beforeBorder, bg: m.card,
      ratio: f(ratio(beforeBorder, m.card)), min: '3:1', ok: ratio(beforeBorder, m.card) >= 3,
    });

    // the text contrast that the previous step fixed, re-measured: this step
    // must not have moved it.
    check(mode, 'טקסט השדה מול מילוי השדה (רגרסיה)', m.text, m.fill, 4.5);
    if (m.hlRowBg) check(mode, 'טקסט על .hl-row (רגרסיה)', m.text, m.hlRowBg, 4.5);

    console.log(`[${mode}] color-scheme=${m.scheme} border=${m.border} fill=${m.fill} card=${m.card}`);

    await page.screenshot({ path: `${HERE}0${mode === 'light' ? 1 : 2}-device-edit-${mode}.png`, fullPage: false });
    await page.keyboard.press('Escape');
    await page.locator('.modal .btn-light').last().click().catch(() => {});
    await page.waitForTimeout(200);
    await page.locator('.device').first().screenshot({ path: `${HERE}0${mode === 'light' ? 3 : 4}-device-card-${mode}.png` });
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - String(s).length));
console.log('\n| מצב | מה נמדד | קדמת | רקע | יחס | סף | |');
console.log('|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.mode} | ${r.what} | \`${r.fg}\` | \`${r.bg}\` | **${r.ratio}** | ${r.min} | ${r.ok ? '✅' : '❌'} |`);
}
console.log(pad('', 0) + `\n${rows.filter((r) => r.ok).length}/${rows.length} עוברים (שורות ה"לפני" אמורות ליפול).`);
