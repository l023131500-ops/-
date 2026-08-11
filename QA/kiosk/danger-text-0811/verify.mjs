// QA for the `--danger-text` step (WCAG 1.4.3, normal text, 4.5:1), 2026-08-11.
//
// The defect class is the one `index-contrast-0811` named and did not close: a
// hard-coded colour sitting beside a token that inverts. Three red sentences in
// the console were written `#b91c1c` / `#b45309` — two of them **inline in
// `app.js`**, which beats every stylesheet rule including the `:root.dark` one
// right underneath them — and the surface they sit on does invert. So they are
// readable in the mode anyone was looking at and not in the other.
//
// Method is `warn-ink-0811`'s, and its stub is **reused rather than copied**: it
// already serves the real `server/public/` with `console.html` at `/console`.
// Every number is read out of `getComputedStyle` in a real Chromium, and the
// background is the surface **actually painted** behind the text (walking up to
// the first opaque background) rather than the token that was assumed.
//
// Both modes are driven with `emulateMedia({colorScheme})` — the OS preference,
// not a class toggled by hand — because that is how a person arrives at the dark
// console. The "before" declaration is re-injected into the same DOM in the same
// run, so the improvement is not quoted from memory and the check is proved able
// to fail.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;

const OLD_ERR = '#b91c1c';   // was inline on `.hl-err`, and is `--danger-ink`
const OLD_EMPTY = '#b45309'; // was inline on `.hl-empty`

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
  return { color: s.color, bg, text: e.textContent.trim().slice(0, 44), size: s.fontSize };
};

// Re-inject the declaration that was replaced and read the colour back in a
// later tick. `<p>` carries no `transition`, unlike `.btn` — but the read is
// deferred anyway, because that is what bit `nontext-contrast-0811`.
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
try {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));
    await page.goto(BASE + '/console');
    await page.waitForSelector('.device', { timeout: 8000 });

    const tok = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return { text: s.getPropertyValue('--danger-text').trim(), ink: s.getPropertyValue('--danger-ink').trim() };
    });
    console.log(`[${mode}] --danger-text = ${tok.text} · --danger-ink = ${tok.ink}`);
    if (!tok.text) { console.error('--danger-text does not resolve'); process.exitCode = 1; }
    // The whole point of the split: one inverts and one does not.
    if (mode === 'dark' && tok.text === tok.ink) { console.error('--danger-text did not invert'); process.exitCode = 1; }
    if (tok.ink !== OLD_ERR) { console.error('--danger-ink moved: ' + tok.ink); process.exitCode = 1; }

    // --- sites 1+2: the links screen. `hostListEditor` is mounted there with no
    // locked host, so the empty-list warning renders on load — the one place in
    // the console where it does, since every other mount pins a host.
    await page.click('a[data-view="links"]');
    await page.waitForSelector('.hl-empty');

    const empty = await page.evaluate(PAINTED, '.hl-empty');
    check(mode, `אזהרת רשימה ריקה — "${empty.text}…"`, empty.color, empty.bg, 4.5, empty.size);
    const emptyBefore = await page.evaluate(BEFORE, ['.hl-empty', `.hl-empty { color: ${OLD_EMPTY} !important; }`]);
    push(mode, `אזהרת רשימה ריקה — לפני (הוזרק מחדש)${mode === 'light' ? ' — ללא שינוי בכוונה' : ''}`, emptyBefore, empty.bg, 4.5);

    await page.locator('#l-hl').screenshot({ path: `${name()}-empty-list-${mode}.png` });

    // A duplicate is the deterministic route into `fail()`: add a host, add it
    // again. Driving the invalid-domain branch would depend on what
    // `normalizeHost` rejects, which is a different module's business.
    await page.fill('#l-hl .hl-new', 'example.com');
    await page.click('#l-hl .hl-add');
    await page.fill('#l-hl .hl-new', 'example.com');
    await page.click('#l-hl .hl-add');
    await page.waitForSelector('.hl-err:visible');

    const err = await page.evaluate(PAINTED, '.hl-err');
    check(mode, `שגיאת הוספת דומיין — "${err.text}"`, err.color, err.bg, 4.5, err.size);
    const errBefore = await page.evaluate(BEFORE, ['.hl-err', `.hl-err { color: ${OLD_ERR} !important; }`]);
    push(mode, `שגיאת הוספת דומיין — לפני (הוזרק מחדש)${mode === 'light' ? ' — ללא שינוי בכוונה' : ''}`, errBefore, err.bg, 4.5);

    await page.locator('#l-hl').screenshot({ path: `${name()}-host-error-${mode}.png` });

    // --- site 3: the guide screen's load error. It is the third consumer, and
    // the only one reached by a failure rather than by typing — so the fault is
    // injected at the network, and the console's own catch renders it.
    await page.route('**/api/devices', (r) => r.fulfill({
      status: 500, contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ error: 'השרת אינו זמין כרגע' }),
    }));
    await page.click('a[data-view="guide"]');
    await page.waitForSelector('#gd-list p[style*="danger-text"]');

    const guide = await page.evaluate(PAINTED, '#gd-list p');
    check(mode, `שגיאה במסך ההוראות — "${guide.text}"`, guide.color, guide.bg, 4.5, guide.size);
    const guideBefore = await page.evaluate(BEFORE, ['#gd-list p', `#gd-list p { color: var(--danger-ink) !important; }`]);
    push(mode, `שגיאה במסך ההוראות — לפני (הוזרק מחדש)${mode === 'light' ? ' — ללא שינוי בכוונה' : ''}`, guideBefore, guide.bg, 4.5);

    await page.locator('#content .card').screenshot({ path: `${name()}-guide-error-${mode}.png` });
    await page.unroute('**/api/devices');

    // --- regression: `--danger-ink` is still right where it was chosen, on the
    // pink fill that does *not* invert. If this moved, the split was wrong.
    await page.click('a[data-view="devices"]');
    await page.waitForSelector('.device .btn-danger');
    const del = await page.evaluate(PAINTED, '.device .btn-danger');
    check(mode, '.btn-danger (רגרסיה — ‎--danger-ink‎ על מילוי ורוד)', del.color, del.bg, 4.5, del.size);

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
// The defect was **dark-mode only**: in light the "before" colour and the new
// token are the same value, deliberately, so the light page does not move a
// byte. Demanding those rows fail would be a harness asserting a bug that never
// existed — the correction `button-boundary-0811`'s run forced.
const before = rows.filter((r) => /לפני/.test(r.what) && r.mode === 'dark');
console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} עוברים. ${before.length} שורות "לפני" כהות (אמורות ליפול): ${before.filter((r) => !r.ok).length} נפלו.`);
if (before.some((r) => r.ok)) { console.error('שורת "לפני" עברה — הבדיקה אינה מסוגלת ליפול.'); process.exitCode = 1; }
