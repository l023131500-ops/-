// QA for the `--label-ink` step (WCAG 1.4.3, normal text, 4.5:1), 2026-08-11.
//
// Same defect class `danger-text-0811` closed in `console.html` / `js/app.js`: a
// hard-coded colour sitting beside tokens that invert. That step swept the two
// files it named and said so; it did not sweep `css/style.css` itself, and the
// one literal there that sits on an **inverting** surface is `.field label`
// (`#33455f`), between `--field-bg` and `--ink` which both invert. On the dark
// card that is 1.75:1 — every label in the console, including `שם משתמש` and
// `סיסמה` on the login screen, where nothing else on screen says what the box is
// for.
//
// Method is `warn-ink-0811`'s and its stub is **reused rather than copied**: it
// already serves the real `server/public/`. Every number is read out of
// `getComputedStyle` in a real Chromium, and the background is the surface
// **actually painted** behind the label (walking up to the first opaque
// background) rather than the token that was assumed — the labels here sit on
// three different elements (`.auth-card`, `.card`, `.modal`) and one quoted
// value would be right for some and wrong for the rest.
//
// Both modes are driven with `emulateMedia({colorScheme})` — the OS preference,
// not a class toggled by hand. The "before" declaration is re-injected into the
// same DOM in the same run, so the improvement is not quoted from memory and the
// check is proved able to fail.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8801;
const BASE = `http://127.0.0.1:${PORT}`;

const OLD = '#33455f'; // was hard-coded on `.field label`, and is the light value

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const rgb = (s) => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const f = (n) => n.toFixed(2) + ':1';

const rows = [];
const push = (mode, what, fg, bg, min, note = '') => {
  // Every foreground here is opaque; a translucent one would be graded
  // flatteringly by lum(), which reads three channels and ignores alpha.
  for (const c of [fg, bg]) if (/rgba\(/.test(c) && !/,\s*1\)$/.test(c)) throw new Error('non-opaque colour reached the grader: ' + c);
  const r = ratio(fg, bg);
  rows.push({ mode, what, fg, bg, ratio: f(r), min: min + ':1', ok: r >= min, note });
  return r;
};
const check = (...a) => { const before = rows.length; push(...a); if (!rows[before].ok) process.exitCode = 1; };

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
  return { color: s.color, bg, text: e.textContent.trim().slice(0, 40), size: s.fontSize, weight: s.fontWeight };
};

// Re-inject the declaration that was replaced and read the colour back in a
// later tick. A `<label>` carries no `transition`, unlike `.btn` — but the read
// is deferred anyway, because that is what bit `nontext-contrast-0811`.
const BEFORE = ([sel, css]) => {
  const s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
  const c = getComputedStyle(document.querySelector(sel)).color;
  s.remove();
  return c;
};

const server = spawn(process.execPath, [STUB, String(PORT)], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 700));

const browser = await chromium.launch();
let shot = 0;
const name = () => `${HERE}${++shot < 10 ? '0' : ''}${shot}`;
const injectBefore = `.field label { color: ${OLD} !important; }`;

try {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 1280, height: 900 } });

    // --- site 1: the login screen. No token, so `app.js` falls to the else on
    // its last line and shows `#login-view`. This is the site that matters
    // most — the two labels there are the only thing saying which box is the
    // username and which is the password, and the field's own text is masked.
    const login = await ctx.newPage();
    await login.goto(BASE + '/console');
    await login.waitForSelector('#login-view:not(.hidden) .field label');

    const tok = await login.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return {
        label: s.getPropertyValue('--label-ink').trim(),
        ink: s.getPropertyValue('--ink').trim(),
        muted: s.getPropertyValue('--muted').trim(),
      };
    });
    console.log(`[${mode}] --label-ink = ${tok.label} · --ink = ${tok.ink} · --muted = ${tok.muted}`);
    if (!tok.label) { console.error('--label-ink does not resolve'); process.exitCode = 1; }
    // A label that is --ink or --muted is not a label: in light it sits between
    // them on purpose, and collapsing onto either in dark would make the label
    // and the hint under it the same text.
    if (tok.label === tok.ink || tok.label === tok.muted) { console.error('--label-ink collapsed onto --ink/--muted'); process.exitCode = 1; }
    // The light console must not move a byte. This is the whole claim that the
    // change is dark-only.
    if (mode === 'light' && tok.label !== OLD) { console.error('the light value moved: ' + tok.label); process.exitCode = 1; }

    for (const [sel, who] of [['#login-user', 'שם משתמש'], ['#login-pass', 'סיסמה']]) {
      const l = await login.evaluate(PAINTED, `label:has(+ ${sel}), .field:has(${sel}) label`);
      check(mode, `מסך כניסה — תווית "${l.text}" (${who})`, l.color, l.bg, 4.5, `${l.size}/${l.weight}`);
    }
    const loginBefore = await login.evaluate(BEFORE, ['#login-view .field label', injectBefore]);
    const loginBg = (await login.evaluate(PAINTED, '#login-view .field label')).bg;
    push(mode, `מסך כניסה — לפני (הוזרק מחדש)${mode === 'light' ? ' — ללא שינוי בכוונה' : ''}`, loginBefore, loginBg, 4.5);

    await login.locator('.auth-card').screenshot({ path: `${name()}-login-${mode}.png` });
    await login.close();

    // --- sites 2+3: inside the console. A fresh page, because the token is read
    // once at load and the login screen above must not have one.
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));
    await page.goto(BASE + '/console');
    await page.waitForSelector('.device');

    // site 2: the enroll screen — labels on `.card`, which is the surface most
    // of the console's labels sit on.
    await page.click('a[data-view="enroll"]');
    await page.waitForSelector('#e-name');
    const enroll = await page.evaluate(PAINTED, '.field:has(#e-name) label');
    check(mode, `מסך הוספת מכשיר — תווית "${enroll.text}"`, enroll.color, enroll.bg, 4.5, `${enroll.size}/${enroll.weight}`);
    const enrollBefore = await page.evaluate(BEFORE, ['.field:has(#e-name) label', injectBefore]);
    push(mode, `מסך הוספת מכשיר — לפני (הוזרק מחדש)${mode === 'light' ? ' — ללא שינוי בכוונה' : ''}`, enrollBefore, enroll.bg, 4.5);
    await page.locator('#content .card').first().screenshot({ path: `${name()}-enroll-${mode}.png` });

    // site 3: the device edit dialog — labels on `.modal`, the third surface.
    // It is also the dialog holding both of §2★א's fields, where the two labels
    // are the only thing distinguishing the link that locks from the link that
    // shows.
    await page.click('a[data-view="devices"]');
    await page.waitForSelector('.device');
    await page.getByRole('button', { name: '✏️ עריכה' }).first().click();
    await page.waitForSelector('.modal #h');
    const dlg = await page.evaluate(PAINTED, '.modal .field:has(#h) label');
    check(mode, `חלון עריכת מכשיר — תווית "${dlg.text}"`, dlg.color, dlg.bg, 4.5, `${dlg.size}/${dlg.weight}`);
    const dlgBefore = await page.evaluate(BEFORE, ['.modal .field:has(#h) label', injectBefore]);
    push(mode, `חלון עריכת מכשיר — לפני (הוזרק מחדש)${mode === 'light' ? ' — ללא שינוי בכוונה' : ''}`, dlgBefore, dlg.bg, 4.5);

    // The label has to stay distinguishable from the `--muted` hint printed
    // directly under this same field — passing 4.5:1 is not enough if the two
    // read as one block of text, which is the reason the dark value was chosen
    // to hold the light ratio rather than merely to clear the threshold.
    const hint = await page.evaluate(PAINTED, '.modal .field:has(#h) > div');
    if (!hint) { console.error('the hint under אתר ראשי was not found — selector rotted'); process.exitCode = 1; }
    else if (hint.color === dlg.color) { console.error('the label and the hint under it are the same colour'); process.exitCode = 1; }
    else check(mode, `חלון עריכת מכשיר — ההסבר המושתק מתחת לאותה תווית`, hint.color, hint.bg, 4.5, `${hint.size}/${hint.weight}`);

    await page.locator('.modal').screenshot({ path: `${name()}-edit-dialog-${mode}.png` });

    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

console.log('\n| מצב | מה נמדד | קדמת | רקע | יחס | סף | גודל/משקל | |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.mode} | ${r.what} | \`${r.fg}\` | \`${r.bg}\` | **${r.ratio}** | ${r.min} | ${r.note} | ${r.ok ? '✅' : '❌'} |`);
}
// The defect is **dark-mode only**: in light the "before" colour and the new
// token are the same value, deliberately, so the light console does not move a
// byte. Demanding those rows fail would be a harness asserting a bug that never
// existed — the correction `button-boundary-0811`'s run forced.
const before = rows.filter((r) => /לפני/.test(r.what) && r.mode === 'dark');
console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} עוברים. ${before.length} שורות "לפני" כהות (אמורות ליפול): ${before.filter((r) => !r.ok).length} נפלו.`);
if (before.some((r) => r.ok)) { console.error('שורת "לפני" עברה — הבדיקה אינה מסוגלת ליפול.'); process.exitCode = 1; }
