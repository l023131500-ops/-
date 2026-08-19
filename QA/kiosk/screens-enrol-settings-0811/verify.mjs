// The last two screens item 6 of apps/35-kioskfleet/STATUS.md names and no run
// has graded: **הוספת מכשיר** (`viewEnroll`) and **הגדרות** (`viewSettings`).
// 2026-08-11.
//
// Harness is `wizard-controls-0811/verify.mjs` — the approvals one plus its
// off-canvas guard — because the enrol screen is the other one taller than the
// window: two cards, four fields, an answer block and a table.
//
// Three differences from every screen-by-screen run before this one:
//
//   * the rows are scoped to `#content`, not to `.modal-bg`. These two are
//     screens and not dialogs, and `console.html` keeps the login card mounted
//     and hidden — an unscoped `.field label` grades that instead.
//   * the enrol screen is graded in **two** states. `.alert-ok` and the install
//     link only exist after a successful POST, and that block is the one thing
//     on the screen a person is meant to read and copy off.
//   * `<a>` is graded on **both** surfaces it lands on. `a { color:
//     var(--accent) }` is a global declaration and `--accent` does not invert:
//     the enrol screen's own link sits on `--chip-ok-bg`, a light chip that does
//     not invert either, so the two move together there — but the same
//     declaration on a `--card` is the `--label-ink` pattern exactly. The guide
//     screen carries that one, and it is measured here rather than asserted from
//     the token, since a number read off a screen is the only kind this run
//     trusts.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8813;
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
// folded into the foreground's alpha. Load-bearing on the enrol screen, where
// three surfaces stack: the page `--bg`, the `--card`, and `.alert-ok`'s own
// non-inverting fill inside it.
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

// A placeholder is not decoration on this screen: three of the four fields carry
// the only example of the format they want (`https://example.com/event/123`),
// and 1.4.3 makes no exception for it.
const PLACEHOLDER = (sel) => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const ph = getComputedStyle(e, '::placeholder');
  const s = getComputedStyle(e);
  let n = e, bg = 'rgb(255, 255, 255)';
  while (n) {
    const c = getComputedStyle(n).backgroundColor;
    if (c && !/rgba\(.*,\s*0\)$/.test(c) && c !== 'transparent') { bg = c; break; }
    n = n.parentElement;
  }
  return { color: ph.color, bg, text: e.placeholder.slice(0, 34), size: parseFloat(ph.fontSize || s.fontSize), weight: ph.fontWeight || s.fontWeight };
};

// A non-text boundary read from the box model: `border-color` against the two
// surfaces it touches, the card outside it and the field fill inside it. A
// border that vanishes on one side has vanished.
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
  return { color: s.borderTopColor, outside: bg, inside: s.backgroundColor };
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

const grade = async (page, mode, screen, list, scope = '#content') => {
  const out = {};
  for (const [key, sel, what] of list) {
    const el = await page.evaluate(PAINTED, `${scope} ${sel}`);
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

try {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 1280, height: 1100 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));
    await page.goto(BASE + '/console');
    await page.waitForSelector('.device');

    // ── הוספת מכשיר, before anything is created ───────────────────
    const E = 'הוספת מכשיר';
    await page.locator('.side nav [data-view=enroll]').click();
    await page.waitForSelector('#e-create');
    await page.waitForSelector('#e-list table');

    const e1 = await grade(page, mode, E, [
      ['h1', '.topbar h1', 'כותרת המסך (26px)'],
      ['h3', '.card h3', 'כותרת הכרטיס'],
      ['lead', '.card p', 'הפסקה המסבירה (--muted)'],
      ['label', '.field label', 'תווית שדה (--label-ink)'],
      ['input', '#e-url', 'הטקסט שמוקלד בשדה'],
      ['select', '#e-link', 'הטקסט ב-select של הספרייה'],
      ['num', '#e-idle', 'שדה המספר (חזרה אוטומטית)'],
      ['create', '#e-create', 'כפתור "צור קוד רישום"'],
      ['th', '#e-list th', 'כותרת עמודה בטבלה (--muted, 13px/600)'],
      ['td', '#e-list td[dir=ltr]', 'תא הכתובת בטבלה'],
      ['chip', '#e-list .code-chip', 'קוד הרישום בטבלה (--chip-accent)'],
      ['tlink', '#e-list .btn-light', 'כפתור "קישור התקנה" בשורה'],
      ['tdel', '#e-list .btn-danger', 'כפתור "מחק" בשורה'],
    ]);
    hierarchy(mode, E, 'הפסקה מול כותרת הכרטיס', e1.h3, e1.lead);
    hierarchy(mode, E, 'תא הטבלה מול כותרת העמודה', e1.td, e1.th);

    // The placeholders — the only place the format is stated.
    for (const [sel, what] of [['#e-name', 'שם המכשיר'], ['#e-url', 'כתובת האתר']]) {
      const ph = await page.evaluate(PLACEHOLDER, `#content ${sel}`);
      if (!ph) { fail(`${E}: placeholder ${sel} לא נמצא`); continue; }
      check(mode, E, `placeholder של ${what} — "${ph.text}"`, ph.color, ph.bg, threshold(ph.size, ph.weight), `${ph.size}px/${ph.weight}`);
    }

    // The field boundary, on both sides, on a screen that is four fields.
    for (const [sel, what] of [['#e-url', 'שדה טקסט'], ['#e-link', 'select'], ['#e-idle', 'שדה מספר']]) {
      const b = await page.evaluate(BORDER, `#content ${sel}`);
      if (!b) { fail(`${E}: border ${sel} לא נמצא`); continue; }
      check(mode, E, `מסגרת ${what} מול הכרטיס (1.4.11)`, b.color, b.outside, 3, 'לא-טקסט');
      check(mode, E, `מסגרת ${what} מול מילוי השדה (1.4.11)`, b.color, b.inside, 3, 'לא-טקסט');
    }

    await page.locator('#content').screenshot({ path: `${name()}-enroll-${mode}.png` });

    // ── the answer block, which only exists after a POST ──────────
    await page.fill('#e-url', 'https://hadar.example.com/event/12');
    await page.locator('#e-create').click();
    await page.waitForSelector('#e-result .alert-ok');

    const e2 = await grade(page, mode, E, [
      ['ok', '#e-result .alert-ok', 'גוף הודעת ההצלחה (--chip-ok)'],
      ['code', '#e-result .code-chip', 'קוד הרישום שנוצר (--chip-accent)'],
      ['b', '#e-result b', 'הכותרת "קישור ההתקנה"'],
      ['a', '#e-result a', '**קישור ההתקנה** — ‎--chip-link-ink‎ על צ\'יפ שאינו מתהפך'],
      ['copy', '#e-result .btn-light', 'כפתור "העתקת הקישור"'],
    ]);
    hierarchy(mode, E, 'הקישור מול הטקסט סביבו', e2.ok, e2.a);
    await page.locator('#e-result').screenshot({ path: `${name()}-enroll-created-${mode}.png` });

    // ── the same `a` declaration on the surface that *does* invert ─
    // Not this screen's own row, and recorded as its own screen name so the
    // table cannot be read as if the enrol link failed. `--accent` is one value
    // for both modes, so this is the `--label-ink` shape: a fixed colour beside
    // an inverting surface.
    await page.locator('.side nav [data-view=guide]').click();
    await page.waitForSelector('#gd-list .device-row, #gd-list p');
    const g = await page.evaluate(PAINTED, '#content .card p > a');
    if (!g) fail('הוראות הפעלה: הקישור למדריך לא נמצא');
    else check(mode, 'הוראות הפעלה', `קישור על **--card** (אותה הצהרת a) — "${g.text}"`, g.color, g.bg, threshold(g.size, g.weight), `${g.size}px/${g.weight}`);

    // The "before" — the declaration that was replaced, re-injected and measured
    // in the same run rather than quoted, so the number the fix claims to have
    // moved is one this harness produced twice.
    const wasBg = g ? g.bg : 'rgb(19, 28, 46)';
    const was = await page.evaluate(BEFORE, ['#content .card p > a', '#content .card p > a { color: #2a61e8 !important; }']);
    push(mode, 'הוראות הפעלה', 'קישור על --card — **לפני** (a{color:var(--accent)})', was, wasBg, 4.5, 'אמור ליפול בכהה');

    // The third site of the same declaration, and the one nobody can reach while
    // signed in: `.auth-card p.hint > a` on the login screen. `console.html`
    // keeps that card mounted and hidden, so it is unhidden to be measured the
    // way `#wz-complete` was — a row of its own rather than an assumption that
    // `--card` behaves the same there. It does: `:root.dark .auth-card` is
    // `var(--card)`.
    await page.evaluate(() => document.querySelector('#login-view').classList.remove('hidden'));
    const lg = await page.evaluate(PAINTED, '#login-view .auth-card p.hint > a');
    if (!lg) fail('מסך הכניסה: הקישור "חזרה לאתר" לא נמצא');
    else check(mode, 'מסך הכניסה', `קישור על כרטיס הכניסה (אותה הצהרה) — "${lg.text}"`, lg.color, lg.bg, threshold(lg.size, lg.weight), `${lg.size}px/${lg.weight}`);
    await page.evaluate(() => document.querySelector('#login-view').classList.add('hidden'));

    // ── הגדרות ────────────────────────────────────────────────────
    const S = 'הגדרות';
    await page.locator('.side nav [data-view=settings]').click();
    await page.waitForSelector('#chp');
    // Something has to be typed, or the two password fields are graded empty —
    // and what a password field renders is the one thing on that screen nobody
    // can check by looking.
    await page.fill('#cp', 'kiosk-current');
    await page.fill('#np', 'kiosk-new-2026');

    const s1 = await grade(page, mode, S, [
      ['h1', '.topbar h1', 'כותרת המסך (26px)'],
      ['h3', '.card h3', 'כותרת הכרטיס'],
      ['label', '.field label', 'תווית "סיסמה נוכחית"'],
      ['label2', '.field:nth-of-type(2) label', 'תווית "סיסמה חדשה"'],
      ['cp', '#cp', 'הטקסט בשדה הסיסמה הנוכחית'],
      ['np', '#np', 'הטקסט בשדה הסיסמה החדשה'],
      ['btn', '#chp', 'כפתור "עדכן סיסמה"'],
    ]);
    hierarchy(mode, S, 'התווית מול כותרת הכרטיס', s1.h3, s1.label);
    // Blurred first: `page.fill` leaves the last field focused, and `.field
    // input:focus` swaps the border to `--accent`. Measuring there grades the
    // focus ring and calls it the resting border — the state every other field
    // on the screen is in. Both are rows here, because both are real.
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    for (const sel of ['#cp', '#np']) {
      const b = await page.evaluate(BORDER, `#content ${sel}`);
      check(mode, S, `מסגרת ${sel} במנוחה מול הכרטיס (1.4.11)`, b.color, b.outside, 3, 'לא-טקסט');
    }
    await page.locator('#np').focus();
    const bf = await page.evaluate(BORDER, '#content #np');
    check(mode, S, 'מסגרת #np **בפוקוס** מול הכרטיס (1.4.11)', bf.color, bf.outside, 3, 'לא-טקסט');
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.locator('#content').screenshot({ path: `${name()}-settings-${mode}.png` });

    // The injected control row: without it the table above is a list of numbers
    // that cannot fail. Per mode — one grey cannot be a near-miss on both a
    // white card and a near-black one.
    const BAD = { light: '#b9c3d4', dark: '#2a3550' }[mode];
    const badBg = (await page.evaluate(PAINTED, '#content .card h3')).bg;
    const bad = await page.evaluate(BEFORE, ['#content .card h3', '#content .card h3 { color: ' + BAD + ' !important; }']);
    push(mode, S, 'כותרת הכרטיס — ערך פסול שהוזרק (בקרת שפיות)', bad, badBg, 4.5);

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
