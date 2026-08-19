// QA for the `--warn-ink` step (WCAG 1.4.3, normal text, 4.5:1), 2026-08-11.
//
// Every number below is read out of `getComputedStyle` in a real Chromium
// against the real `server/public/`, not computed from the hex in the file — and
// the **background is read from the surface actually painted behind the text**
// (walking up the DOM to the first opaque background) rather than assumed from
// the token, because these five sites sit on `.modal`, `.device` and the page,
// and one quoted value would be right for some and wrong for the rest.
//
// Both modes are driven with `emulateMedia({colorScheme})` — the OS preference,
// not a class toggled by hand — because that is how a person arrives at the dark
// console.
//
// The "before" row of each site is measured in the same run by re-injecting the
// declaration that was replaced, so the improvement is not quoted from memory
// and the check is proved able to fail.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PORT = 8797;
const BASE = `http://127.0.0.1:${PORT}`;
const OLD_WARN = '#f59e0b';

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const rgb = (s) => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const f = (n) => n.toFixed(2) + ':1';

const rows = [];
const push = (mode, what, fg, bg, min, note = '') => {
  const r = ratio(fg, bg);
  rows.push({ mode, what, fg, bg, ratio: f(r), min: min + ':1', ok: r >= min, note });
  return r;
};
const check = (...a) => { const before = rows.length; push(...a); if (!rows[before].ok) process.exitCode = 1; };

// The painted surface, not the declared one: `.modal`'s paragraphs and the
// device card's meta line inherit `background: transparent` from their own box.
const PAINTED = (sel) => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const s = getComputedStyle(e);
  let n = e, bg = 'rgba(0, 0, 0, 0)';
  while (n) {
    const c = getComputedStyle(n).backgroundColor;
    if (c && !/rgba\(.*,\s*0\)$/.test(c) && c !== 'transparent') { bg = c; break; }
    n = n.parentElement;
  }
  return { color: s.color, bg, text: e.textContent.trim().slice(0, 40), size: s.fontSize };
};

const server = spawn(process.execPath, [HERE + 'stub-server.mjs', String(PORT)], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch();
let shot = 0;
try {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 1280, height: 980 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));
    await page.goto(BASE + '/console');
    await page.waitForSelector('.device', { timeout: 8000 });

    // The token itself, before anything else: it must resolve, and it must be a
    // different value in the two modes (the dark card keeps the amber).
    const tok = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--warn-ink').trim());
    console.log(`[${mode}] --warn-ink = ${tok}`);
    if (!tok) { console.error('--warn-ink does not resolve'); process.exitCode = 1; }

    // --- site 1: `טרם הונפק` on the device card (device 2 has no code) ---
    const card = await page.evaluate(PAINTED, '.device:nth-of-type(2) .meta span[style*="warn-ink"]');
    if (!card) { console.error('no `טרם הונפק` span found'); process.exitCode = 1; }
    else check(mode, `כרטיס המכשיר — "${card.text}"`, card.color, card.bg, 4.5, card.size);

    await page.locator('.device').nth(1).screenshot({ path: `${HERE}0${++shot}-card-${mode}.png` });

    // --- site 2: the access-code re-issue warning ---
    await page.locator('.device').first().getByRole('button', { name: /קוד גישה/ }).click();
    await page.waitForSelector('#new');
    await page.locator('#new').click();
    await page.waitForSelector('#ac-confirm p');
    const reissue = await page.evaluate(PAINTED, '#ac-confirm p');
    check(mode, `אזהרת הנפקה מחדש — "${reissue.text}…"`, reissue.color, reissue.bg, 4.5, reissue.size);

    // "before", same DOM, same run. `<p>` carries no transition, unlike `.btn`.
    const beforeReissue = await page.evaluate((old) => {
      const s = document.createElement('style');
      s.textContent = `:root, :root.dark { --warn-ink: ${old} !important; }`;
      document.head.appendChild(s);
      const c = getComputedStyle(document.querySelector('#ac-confirm p')).color;
      s.remove();
      return c;
    }, OLD_WARN);
    push(mode, `אזהרת הנפקה מחדש — לפני (הוזרק מחדש)${mode === 'dark' ? ' — ללא שינוי בכוונה' : ''}`, beforeReissue, reissue.bg, 4.5);

    await page.screenshot({ path: `${HERE}0${++shot}-reissue-${mode}.png` });
    await page.locator('#n').click();
    await page.locator('.modal .btn-light').last().click();
    await page.waitForTimeout(150);

    // --- site 3: the exit-code clear warning (empty the field, then save) ---
    await page.locator('.device').first().getByRole('button', { name: /קוד יציאה/ }).click();
    await page.waitForSelector('#ex-val');
    await page.locator('#ex-val').fill('');
    await page.locator('#ex-save').click();
    await page.waitForSelector('#ex-confirm p');
    const clear = await page.evaluate(PAINTED, '#ex-confirm p');
    check(mode, `אזהרת ביטול קוד היציאה — "${clear.text}…"`, clear.color, clear.bg, 4.5, clear.size);
    await page.screenshot({ path: `${HERE}0${++shot}-exit-clear-${mode}.png` });
    await page.locator('#ex-n').click();
    await page.locator('.modal .btn-light').last().click();
    await page.waitForTimeout(150);

    // --- site 4: the disabled-client line in the approvals picker ---
    await page.locator('.device').first().getByRole('button', { name: /מזהי לקוח/ }).click();
    await page.waitForSelector('.modal input[type=checkbox]');
    const disabled = await page.evaluate(PAINTED, '.modal label span[style*="warn-ink"]');
    if (!disabled) { console.error('no disabled-client line found'); process.exitCode = 1; }
    else check(mode, `שורת לקוח מושבת — "${disabled.text}…"`, disabled.color, disabled.bg, 4.5, disabled.size);
    await page.screenshot({ path: `${HERE}0${++shot}-disabled-client-${mode}.png` });
    await page.locator('.modal .btn-light').last().click();
    await page.waitForTimeout(150);

    // --- site 5: the wizard's "start over" warning ---
    await page.locator('.device').first().getByRole('button', { name: /הפעל/ }).click();
    await page.waitForSelector('#wz-reset');
    await page.locator('#wz-reset').click();
    await page.waitForSelector('#wz-reset-confirm p');
    const reset = await page.evaluate(PAINTED, '#wz-reset-confirm p');
    check(mode, `אזהרת איפוס האשף — "${reset.text}…"`, reset.color, reset.bg, 4.5, reset.size);

    const beforeReset = await page.evaluate((old) => {
      const s = document.createElement('style');
      s.textContent = `:root, :root.dark { --warn-ink: ${old} !important; }`;
      document.head.appendChild(s);
      const c = getComputedStyle(document.querySelector('#wz-reset-confirm p')).color;
      s.remove();
      return c;
    }, OLD_WARN);
    // The dark "before" is the *same* value as the after: `--warn-ink` is
    // `--warn` in dark on purpose, because the amber already passed there at
    // 7.93:1. So only the light rows can fail, and demanding both would be a
    // harness asserting a bug that never existed — the same correction the
    // button-boundary step's run forced.
    push(mode, `אזהרת איפוס האשף — לפני (הוזרק מחדש)${mode === 'dark' ? ' — ללא שינוי בכוונה' : ''}`, beforeReset, reset.bg, 4.5);
    await page.screenshot({ path: `${HERE}${shot + 1 < 10 ? '0' : ''}${++shot}-wizard-reset-${mode}.png` });

    // regression: `--warn` itself is untouched, and `.wz-warn` — the one amber
    // *surface* in the console — must not have moved with it.
    const wz = await page.evaluate(PAINTED, '.wz-warn');
    if (wz) check(mode, '.wz-warn (רגרסיה — משטח ענבר, לא ‎--warn-ink‎)', wz.color, wz.bg, 4.5, wz.size);

    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log('\n| מצב | מה נמדד | קדמת | רקע | יחס | סף | גודל | |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.mode} | ${r.what} | \`${r.fg}\` | \`${r.bg}\` | **${r.ratio}** | ${r.min} | ${r.note} | ${r.ok ? '✅' : '❌'} |`);
}
const before = rows.filter((r) => /לפני/.test(r.what) && r.mode === 'light');
console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} עוברים. ${before.length} שורות "לפני" בהיר (אמורות ליפול): ${before.filter((r) => !r.ok).length} נפלו.`);
if (before.some((r) => r.ok)) { console.error('שורת "לפני" עברה — הבדיקה אינה מסוגלת ליפול.'); process.exitCode = 1; }
