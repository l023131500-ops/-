// The one screen item 6 of apps/35-kioskfleet/STATUS.md believed it had covered
// and never saw: **ניהול-על** (`viewAdmin`), plus its four dialog views.
// 2026-08-11.
//
// `dialogs-rtl-admin-0811` was the first run ever to render this screen —
// `viewAdmin()` opens with `if (ME.role !== 'admin') return route('devices')`
// and every stub user before it was an owner — and it graded the screen for
// painted order and reflow only. It ended by saying so: "the admin screen is
// graded here for painted order and reflow only. Its **contrast** is ungraded."
// That is this run.
//
// Harness is `screens-enrol-settings-0811/verify.mjs` — PAINTED / BORDER /
// BEFORE and the same thresholds — with two differences forced by the screen:
//
//   * the stub is started with the `admin` flag `dialogs-rtl-admin-0811` added,
//     or the route redirects and this file grades the devices screen while
//     reporting the admin one. A row asserts `ME.role` rather than assuming the
//     flag took.
//   * this screen is the only one in the console carrying a **`.stat-row`**, and
//     its four numbers are the first 32px text anywhere in the console. Two of
//     the four carry an *inline* `style="color:var(--…)"` written into
//     `viewAdmin()`'s template, which is the one place no stylesheet sweep under
//     item 6 could have looked even if the screen had rendered.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8874;
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
// 1.4.3's large-text carve-out. `.stat .v` is 32px/800 and lands on the 3:1 side
// of it — which is why 2.28:1 is a failure and not a near miss.
const threshold = (px, weight) => (px >= 24 || (px >= 18.66 && Number(weight) >= 700) ? 3 : 4.5);

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };
const push = (mode, screen, what, fg, bg, min, note = '') => {
  const r = ratio(fg, bg);
  rows.push({ mode, screen, what, fg, bg, ratio: f(r), raw: r, min: min + ':1', ok: r >= min, note });
  return rows[rows.length - 1];
};
const check = (...a) => { const row = push(...a); if (!row.ok) process.exitCode = 1; return row; };
// A row that is a fact rather than a ratio — "the dialog opened", "the stub is
// an admin". `dialogs-rtl-admin-0811` had to add these because a view that
// grades nothing and a selector that missed produce the same output; the same
// is true here of a dialog that never opened.
const assert = (mode, screen, what, ok, value) => {
  rows.push({ mode, screen, what, fg: '—', bg: '—', ratio: value, raw: 0, min: '—', ok, note: 'עובדה' });
  if (!ok) fail(`${screen}: ${what} — ${value}`);
};

// The surface actually painted behind the node, with every ancestor `opacity`
// folded into the foreground's alpha. Verbatim from `screens-enrol-settings-0811`.
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

// A non-text boundary read from the box model, against both surfaces it touches.
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

// `.btn` carries `transition: .15s` on all properties, so a computed read in the
// injection's own tick returns where the transition started — the bug
// `nontext-contrast-0811` found in its own harness. Two frames and 60ms.
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

const server = spawn(process.execPath, [STUB, String(PORT), 'admin'], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 900));

const browser = await chromium.launch();
let shot = 0;
const name = () => `${HERE}${String(++shot).padStart(2, '0')}`;

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

try {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 1280, height: 1000 } });
    const page = await ctx.newPage();
    await page.route('**://more30.com/**', (r) => r.abort());   // the shared login pill
    await page.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));
    await page.goto(BASE + '/console');
    await page.waitForSelector('.device');

    // The flag, asserted rather than assumed: without it `viewAdmin()` returns
    // `route('devices')` and every row below would describe the wrong screen
    // while carrying the right name.
    assert(mode, 'ניהול-על', 'ה-stub מדווח role=admin ופותח את #menu-admin',
      await page.evaluate(() => ME.role === 'admin' && !document.getElementById('menu-admin').classList.contains('hidden')),
      await page.evaluate(() => `role=${ME.role}`));

    const A = 'ניהול-על';
    await page.evaluate(() => route('admin', true));
    await page.waitForSelector('#users table tr:nth-child(3)');
    await page.waitForSelector('.stat-row .stat');
    await page.waitForTimeout(260);   // `.btn` carries transition: .15s

    // ── the screen itself ─────────────────────────────────────────
    await grade(page, mode, A, [
      ['h1', '.topbar h1', 'כותרת המסך (26px)'],
      ['new', '#new-user', 'כפתור "לקוח חדש" (btn-primary)'],
      ['v1', '.stat:nth-child(1) .v', 'מספר "לקוחות" (32px/800, --ink)'],
      ['l1', '.stat:nth-child(1) .l', 'התווית "לקוחות" (--muted)'],
      ['v2', '.stat:nth-child(2) .v', 'מספר "מכשירים" (32px/800, --ink)'],
      ['v3', '.stat:nth-child(3) .v', '**"מחוברים כעת"** — ‎style="color:var(--ok-ink)"‎ בתבנית'],
      ['l3', '.stat:nth-child(3) .l', 'התווית "מחוברים כעת"'],
      ['v4', '.stat:nth-child(4) .v', '"מנותקים" — ‎style="color:var(--muted)"‎ בתבנית'],
      ['l4', '.stat:nth-child(4) .l', 'התווית "מנותקים"'],
      ['h3', '.card h3', 'כותרת הכרטיס "לקוחות"'],
      ['th', '#users th', 'כותרת עמודה בטבלה'],
      ['user', '#users tr:nth-child(2) td b', 'שם המשתמש בשורה (b)'],
      ['role', '#users tr:nth-child(2) td:nth-child(3)', 'תא התפקיד ("👑 מנהל-על")'],
      ['num', '#users tr:nth-child(2) td:nth-child(4)', 'תא המכסה (מספר)'],
      ['edit', '#users tr:nth-child(3) [data-edit]', 'כפתור "ערוך" בשורה (btn-light)'],
      ['pw', '#users tr:nth-child(3) [data-pw]', 'כפתור "סיסמה" בשורה (btn-light)'],
      ['del', '#users tr:nth-child(3) [data-del]', 'כפתור "מחק" בשורה (btn-danger)'],
    ]);

    // The `.stat` box is a `--card` on the page `--bg` with a `--line` border,
    // and unlike a table row it is what marks where one number ends and the next
    // begins. Recorded, not asserted: `--line` is the console-wide question the
    // earlier contrast steps left open on purpose, and four boxes on this screen
    // are not where it gets decided.
    const sb = await page.evaluate(BORDER, '#content .stat:nth-child(1)');
    push(mode, A, 'מסגרת ה-.stat מול רקע העמוד (--line, מדווח בלבד)', sb.color, sb.outside, 3, 'לא-טקסט');

    await page.locator('#content').screenshot({ path: `${name()}-admin-screen-${mode}.png` });

    // ── the four dialog views ─────────────────────────────────────
    // `slug` is passed rather than derived from `view`: every view name here is
    // Hebrew, and stripping it to `[a-z]` leaves the empty string on all four —
    // four files called `dialog`, which is what the first run of this wrote.
    const dialog = async (click, ready, view, slug, list) => {
      await page.locator(click).first().click();
      const opened = await page.waitForSelector(ready, { timeout: 15000 }).then(() => true).catch(() => false);
      assert(mode, view, `הדיאלוג נפתח (${ready})`, opened, opened ? 'כן' : 'הסלקטור לא הופיע');
      if (!opened) return;
      await page.waitForTimeout(200);
      await grade(page, mode, view, list, '.modal');
      await page.locator('.modal').screenshot({ path: `${name()}-${slug}-${mode}.png` });
      await page.keyboard.press('Escape');
      await page.waitForSelector('.modal-bg', { state: 'detached', timeout: 15000 });
    };

    // `userModal(u)` — the edit branch drops the two create-only fields, so the
    // two branches are two different views and both are opened.
    await dialog('#users tr:nth-child(3) [data-edit]', '.modal #u-name', 'עריכת לקוח', 'user-edit', [
      ['h3', 'h3', 'כותרת הדיאלוג'],
      ['label', '.field label', 'תווית "שם מלא"'],
      ['name', '#u-name', 'הערך בשדה "שם מלא"'],
      ['limit', '#u-limit', 'הערך בשדה "מכסת מכשירים"'],
      ['sel', '#u-active', 'הטקסט ב-select הסטטוס'],
      ['save', '#u-save', 'כפתור "שמירה"'],
      ['cancel', '#u-cancel', 'כפתור "ביטול"'],
    ]);

    await dialog('#new-user', '.modal #u-user', 'לקוח חדש', 'user-new', [
      ['h3', 'h3', 'כותרת הדיאלוג'],
      ['label', '.field label', 'תווית "שם משתמש"'],
      // `:nth-of-type` over the `div`s, not Playwright's `:has-text` — this probe
      // runs inside `querySelector`, where that is a SyntaxError. The create
      // branch is four fields then `.row`.
      ['pass', '.field:nth-of-type(3) label', 'תווית "סיסמה (8+ תווים)"'],
      ['save', '#u-save', 'כפתור "שמירה"'],
    ]);

    await dialog('#users tr:nth-child(3) [data-pw]', '.modal #pw', 'איפוס סיסמה', 'reset-pw', [
      ['h3', 'h3', 'כותרת הדיאלוג'],
      ['label', '.field label', 'תווית "סיסמה חדשה"'],
      ['ok', '#ok', 'כפתור "אפס"'],
      ['c', '#c', 'כפתור "ביטול"'],
    ]);

    // The one dialog whose body is a sentence rather than fields — and the only
    // `--muted` paragraph on a `.modal` anywhere in the console.
    await dialog('#users tr:nth-child(3) [data-del]', '.modal #y', 'מחיקת לקוח', 'del-user', [
      ['h3', 'h3', 'כותרת הדיאלוג'],
      ['p', 'p', 'המשפט המזהיר (--muted על .modal)'],
      ['y', '#y', 'כפתור "מחק" (btn-danger)'],
      ['n', '#n', 'כפתור "ביטול"'],
    ]);

    // ── the "before", re-measured rather than quoted ───────────────
    // `--accent-2` is one value for both modes, so the row is expected to fail in
    // **light** and pass in dark: 2.28:1 on a white card, 7.47:1 on a near-black
    // one. That asymmetry is the defect's shape, and stating it here is what
    // stops the dark row from reading as a second bug.
    await page.evaluate(() => route('admin', true));
    await page.waitForSelector('.stat-row .stat');
    const wasBg = (await page.evaluate(PAINTED, '#content .stat:nth-child(3) .v')).bg;
    const was = await page.evaluate(BEFORE, ['#content .stat:nth-child(3) .v', '#content .stat:nth-child(3) .v { color: #22c55e !important; }']);
    push(mode, A, '"מחוברים כעת" — **לפני** (var(--accent-2) ‎#22c55e‎)', was, wasBg, 3, mode === 'light' ? 'אמור ליפול' : 'עבר גם לפני');

    // The injected control row: without it the table above is a list of numbers
    // that cannot fail. Per mode — one grey cannot be a near-miss on both a white
    // card and a near-black one.
    const BAD = { light: '#b9c3d4', dark: '#2a3550' }[mode];
    const badBg = (await page.evaluate(PAINTED, '#content .card h3')).bg;
    const bad = await page.evaluate(BEFORE, ['#content .card h3', '#content .card h3 { color: ' + BAD + ' !important; }']);
    push(mode, A, 'כותרת הכרטיס — ערך פסול שהוזרק (בקרת שפיות)', bad, badBg, 4.5);

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
const graded = rows.filter((r) => !/בקרת שפיות|\*\*לפני\*\*|מדווח בלבד/.test(r.what));
const controls = rows.filter((r) => /בקרת שפיות|\*\*לפני\*\*/.test(r.what));
console.log(`\n${graded.filter((r) => r.ok).length}/${graded.length} שורות נמדדות עוברות.`);
console.log(`${controls.length} שורות בקרה: ${controls.filter((r) => !r.ok).length} נפלו (צפוי: 3 — בקרת שפיות ×2, ו"לפני" בבהיר בלבד).`);
if (!controls.some((r) => !r.ok)) fail('אף שורת בקרה לא נפלה — הבדיקה אינה מסוגלת ליפול.');
