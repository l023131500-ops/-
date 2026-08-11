// QA for the `--chip-*` step (WCAG 1.4.3, 4.5:1 / 3:1 for large text), 2026-08-11.
//
// This is **not** the class the previous three steps closed. `danger-text-0811`
// and `label-ink-0811` chased a hard-coded colour sitting beside a token that
// inverts — a defect visible in exactly one mode, and invisible in the mode you
// happen to be looking at. The five light chips (`.pill.on`, `.pill.off`,
// `.alert-ok`, `.hl-tag`, `.code-chip`) are the opposite: their fill is a light
// literal that deliberately does **not** invert, so it sits on a dark card
// unchanged and the ratio is identical in both modes. They fail, or pass,
// equally everywhere. That is why they are one decision and move together, and
// why this harness asserts the two modes agree rather than asserting one of them
// is the broken one.
//
// One of the five is under: `.pill.off` is `#64748b` on `#f1f5f9` — the
// `מנותק` chip, i.e. the word that says a tablet in another room has stopped
// answering. The other four pass on thin margins, so they are tokenised without
// moving and their numbers are asserted here rather than left as a claim.
//
// Method and stub are `warn-ink-0811`'s, reused rather than copied: it serves
// the real `server/public/`. Two routes were added to it for this run — the
// console paints `.alert-ok` in exactly one place, the answer to a successful
// `POST /api/enrollments`, and it was unreachable without them.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8802;
const BASE = `http://127.0.0.1:${PORT}`;

const OLD_OFF = '#64748b'; // what `.pill.off` was, in both modes

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const rgb = (s) => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const f = (n) => n.toFixed(2) + ':1';

// 1.4.3's own rule, not a quoted constant: 18.66px bold or 24px is large text.
// It matters here because `.code-chip` is declared at 20px and `app.js` renders
// it at 14px and 15px, i.e. the same class lands on both sides of the line.
const threshold = (px, weight) => (px >= 24 || (px >= 18.66 && Number(weight) >= 700) ? 3 : 4.5);

const rows = [];
const push = (mode, what, fg, bg, min, note = '') => {
  for (const c of [fg, bg]) if (/rgba\(/.test(c) && !/,\s*1\)$/.test(c)) throw new Error('non-opaque colour reached the grader: ' + c);
  const r = ratio(fg, bg);
  rows.push({ mode, what, fg, bg, ratio: f(r), raw: r, min: min + ':1', ok: r >= min, note });
  return r;
};
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };
const check = (...a) => { const before = rows.length; push(...a); if (!rows[before].ok) process.exitCode = 1; return rows[before]; };

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
  return { color: s.color, bg, text: e.textContent.trim().slice(0, 40), size: parseFloat(s.fontSize), weight: s.fontWeight };
};

// Re-inject the declaration that was replaced and read it back in a later tick —
// `nontext-contrast-0811` was bitten by reading inside the injection's own tick,
// where a `transition` returns the colour it started from.
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
const tokensByMode = {};
const offRatioByMode = {};

try {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 1280, height: 950 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));
    await page.goto(BASE + '/console');
    await page.waitForSelector('.device');

    const tok = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      const g = (n) => s.getPropertyValue(n).trim();
      return {
        okBg: g('--chip-ok-bg'), okInk: g('--chip-ok-ink'),
        offBg: g('--chip-off-bg'), offInk: g('--chip-off-ink'),
        accBg: g('--chip-accent-bg'), accInk: g('--chip-accent-ink'),
        accent: g('--accent'), muted: g('--muted'), ink: g('--ink'),
      };
    });
    tokensByMode[mode] = tok;
    console.log(`[${mode}] ok ${tok.okInk} on ${tok.okBg} · off ${tok.offInk} on ${tok.offBg} · accent ${tok.accInk} on ${tok.accBg}`);
    for (const [k, v] of Object.entries(tok)) if (!v) fail(`--${k} does not resolve`);
    // The ink of a chip is chosen against the chip's own fill. Riding an
    // inverting token would move it the moment the theme does — and `--muted`
    // is the near-miss here, since `.pill.off` is the console's quiet chip.
    if (tok.offInk === tok.muted) fail('--chip-off-ink collapsed onto --muted, which inverts');
    if (tok.offInk === tok.ink) fail('--chip-off-ink collapsed onto --ink, which inverts');
    if (tok.offInk.toLowerCase() === OLD_OFF) fail('--chip-off-ink is still the failing value');

    // --- site 1+2: the two pills on the devices screen. Device 1 is online,
    // device 2 is not, so both states are real DOM rather than a class added by
    // hand.
    for (const [sel, who] of [['.device .pill.on', 'מחובר'], ['.device .pill.off', 'מנותק']]) {
      const el = await page.evaluate(PAINTED, sel);
      if (!el) { fail(`${sel} did not render — the stub's fleet changed`); continue; }
      const r = check(mode, `כרטיס מכשיר — תג "${el.text}" (${who})`, el.color, el.bg, threshold(el.size, el.weight), `${el.size}px/${el.weight}`);
      if (who === 'מנותק') offRatioByMode[mode] = r.raw;
    }

    // --- site 3: the access code chip on the device card. `.code-chip` is
    // declared at 20px and rendered here at 14px, which is the size that
    // decides the threshold.
    const cardCode = await page.evaluate(PAINTED, '.device .code-chip');
    if (!cardCode) fail('.code-chip did not render on a device card');
    else check(mode, `כרטיס מכשיר — קוד גישה (${cardCode.text})`, cardCode.color, cardCode.bg, threshold(cardCode.size, cardCode.weight), `${cardCode.size}px/${cardCode.weight}`);

    await page.locator('.device').first().screenshot({ path: `${name()}-device-card-${mode}.png` });

    // The "before" row: injected into this same DOM, in this same run, and
    // asserted to fail in **both** modes. That is the class's defining property
    // — the chip does not invert, so the defect was never mode-specific, and a
    // harness demanding a dark-only failure here would be describing the
    // previous step's bug rather than this one's.
    const offBefore = await page.evaluate(BEFORE, ['.device .pill.off', `.pill.off { color: ${OLD_OFF} !important; }`]);
    const offBg = (await page.evaluate(PAINTED, '.device .pill.off')).bg;
    push(mode, 'כרטיס מכשיר — תג "מנותק" לפני (הוזרק מחדש)', offBefore, offBg, 4.5);

    // --- site 4: `.hl-tag`, in the device edit dialog, where the device's own
    // host is pinned to the allow-list and carries the tag.
    await page.getByRole('button', { name: '✏️ עריכה' }).first().click();
    await page.waitForSelector('.modal #h');
    const tag = await page.evaluate(PAINTED, '.modal .hl-tag');
    if (!tag) fail('.hl-tag did not render in the edit dialog');
    else check(mode, `חלון עריכת מכשיר — תג "${tag.text}"`, tag.color, tag.bg, threshold(tag.size, tag.weight), `${tag.size}px/${tag.weight}`);

    // The claim the token exists for: the chip's ink must not follow a brand
    // token. `more30-priority.md` §6 asks for a different palette per system,
    // so `--accent` moving is a thing that will happen — and it used to take
    // `.hl-tag` and `.code-chip` with it, onto a fill that stays `#eef3ff`.
    const drift = await page.evaluate((tagSel) => new Promise((done) => {
      const s = document.createElement('style');
      s.textContent = ':root, :root.dark { --accent: #ff0000 !important; }';
      document.head.appendChild(s);
      requestAnimationFrame(() => setTimeout(() => {
        const c = getComputedStyle(document.querySelector(tagSel)).color;
        s.remove();
        done(c);
      }, 60));
    }), '.modal .hl-tag');
    if (!tag) { /* already failed above */ }
    else if (drift !== tag.color) fail(`.hl-tag followed --accent (${drift}) — the chip ink is still riding the brand token`);
    else console.log(`[${mode}] --accent forced to red; .hl-tag stayed ${tag.color} ✅`);

    await page.locator('.modal').screenshot({ path: `${name()}-edit-dialog-${mode}.png` });
    await page.keyboard.press('Escape');
    await page.locator('.modal-bg').waitFor({ state: 'detached' }).catch(() => page.evaluate(() => document.querySelector('.modal-bg')?.remove()));

    // --- site 5: `.alert-ok`, the one place in the console it is painted, plus
    // the 20px `.code-chip` inside it and the 15px one in the table under it.
    await page.click('a[data-view="enroll"]');
    await page.waitForSelector('#e-create');
    // The link `<select>` opens on its empty placeholder, so the manual-address
    // field is what makes this a valid create — the same route an owner takes
    // when the event link is not in the library yet.
    await page.fill('#e-url', 'https://hadar.example.com/event/12');
    await page.fill('#e-name', 'כניסה ראשית');
    await page.click('#e-create');
    await page.waitForSelector('#e-result .alert-ok');

    const alert = await page.evaluate(PAINTED, '#e-result .alert-ok');
    check(mode, `מסך הוספת מכשיר — הודעת ההצלחה`, alert.color, alert.bg, threshold(alert.size, alert.weight), `${alert.size}px/${alert.weight}`);
    const bigCode = await page.evaluate(PAINTED, '#e-result .code-chip');
    check(mode, `מסך הוספת מכשיר — קוד הרישום (${bigCode.text})`, bigCode.color, bigCode.bg, threshold(bigCode.size, bigCode.weight), `${bigCode.size}px/${bigCode.weight}`);
    const tblCode = await page.evaluate(PAINTED, '#e-list .code-chip');
    if (!tblCode) fail('#e-list .code-chip did not render');
    else check(mode, `טבלת קודים פתוחים — קוד (${tblCode.text})`, tblCode.color, tblCode.bg, threshold(tblCode.size, tblCode.weight), `${tblCode.size}px/${tblCode.weight}`);

    await page.locator('#content').screenshot({ path: `${name()}-enroll-${mode}.png` });
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}

// The six tokens must be byte-identical across the two modes. That is the whole
// premise: these chips are light fills that do not invert, so an override of any
// of them inside `:root.dark` would be a second, unmeasured design.
for (const k of ['okBg', 'okInk', 'offBg', 'offInk', 'accBg', 'accInk']) {
  if (tokensByMode.light[k] !== tokensByMode.dark[k]) fail(`--chip ${k} differs between modes (${tokensByMode.light[k]} vs ${tokensByMode.dark[k]}) — a light chip that inverts is a different decision`);
}
// …and so the measured ratio has to agree too. This is what makes the
// "one decision, both modes" claim a measurement rather than an assertion about
// the CSS text.
if (Math.abs(offRatioByMode.light - offRatioByMode.dark) > 0.01) fail(`.pill.off graded differently per mode (${f(offRatioByMode.light)} vs ${f(offRatioByMode.dark)})`);

console.log('\n| מצב | מה נמדד | קדמת | רקע | יחס | סף | גודל/משקל | |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.mode} | ${r.what} | \`${r.fg}\` | \`${r.bg}\` | **${r.ratio}** | ${r.min} | ${r.note} | ${r.ok ? '✅' : '❌'} |`);
}
const before = rows.filter((r) => /לפני/.test(r.what));
console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} עוברים. ${before.length} שורות "לפני" (אמורות ליפול בשני המצבים): ${before.filter((r) => !r.ok).length} נפלו.`);
if (before.some((r) => r.ok)) fail('שורת "לפני" עברה — הבדיקה אינה מסוגלת ליפול.');
