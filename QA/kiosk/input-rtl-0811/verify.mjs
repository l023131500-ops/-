// The console's `<input>` values, read for painted order. 2026-08-11.
//
// `apps/35-kioskfleet/STATUS.md` item 7 ends on this, and it is stated as a
// limit of the previous harness rather than as a defect:
//
//   "a `Range` cannot enter an `<input>`, so `#e-url`, `#l-url` and `#c-code`
//    are right by declaration (`dir="ltr"`) and not by measurement."
//
// Three runs have now found the same class of bug — `06:00–04:00` in the OTA
// window, `4:40:00 ,11.8.2026` on the device card, and both times the string,
// the DOM and `innerText` were correct and only the painted line was wrong. In
// every one of those the fix was `dir="ltr"`, i.e. exactly the declaration this
// item says the inputs are trusted on. Trusting a declaration that has been the
// *fix* three times, on the one class of element no probe can see into, is the
// weakest thing left under item 7.
//
// **The measurement.** A `Range` cannot span an input's value, so the painted
// position of a character inside one cannot be read from the DOM at all. What
// can: the **selection highlight is painted by the browser at the character's
// real position**. So `setSelectionRange(i, i+1)` plus a `::selection` colour
// nothing else on the page uses turns one character into a band of known pixels,
// and a screenshot says where it landed. That is the Range rect, obtained the
// only way this element allows.
//
//   - the marker sets `background` **and** `color` to the same value, so the
//     band is uniform and its extent is the character's box rather than the
//     inked part of a glyph.
//   - the input must be **focused** or Chromium paints the selection grey, and
//     grey is a colour the console already uses.
//   - the grade is `first character left of last character`, not a per-token
//     sweep. Every value here is one logical left-to-right string, so that one
//     comparison catches the whole class: a run that swaps, a trailing neutral
//     that jumps to the far end, or a whole value painted backwards. It is also
//     the only comparison that survives not knowing where the browser broke the
//     string, which inside an input cannot be inspected.
//
// The values are what someone actually pastes, and the URLs deliberately end in
// `/` — a **trailing neutral** takes the paragraph's direction (UAX #9 rule N2),
// which is the shape that moves a character to the opposite end of the field.
//
// Stub is `../warn-ink-0811/stub-server.mjs`, reused not copied, the same one
// `console-rtl-0811` drove.
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8863;
const BASE = `http://127.0.0.1:${PORT}`;

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };
const add = (r) => { rows.push(r); if (!r.ok) fail(`${r.field} ${r.mode}: ${r.what} (${r.value})`); };

// Two characters in one line of text are never a fraction of a pixel apart.
const EPS = 0.5;

// A colour nothing in `css/style.css` uses, so a stray pixel cannot be mistaken
// for the highlight.
const MARK = [255, 0, 208];
const MARK_CSS = `input::selection{background:rgb(255,0,208) !important;color:rgb(255,0,208) !important}`;

// ── the probe ───────────────────────────────────────────────────────────────
// Selects one character, screenshots, and returns where the highlight was
// painted. `sampleBox`'s decode-in-the-page shape (screens-approvals-code-0811),
// narrowed to the input's own box and to one colour.
async function charRect(page, sel, index) {
  const rect = await page.evaluate(({ sel, index }) => {
    const e = document.querySelector(sel);
    if (!e) return null;
    e.focus();
    e.setSelectionRange(index, index + 1);
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, { sel, index });
  if (!rect) return null;
  const b64 = (await page.screenshot()).toString('base64');
  return page.evaluate(async ({ b64, rect, mark }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    const k = img.width / window.innerWidth;
    const w = Math.max(1, Math.round(rect.w * k));
    const h = Math.max(1, Math.round(rect.h * k));
    const d = c.getContext('2d').getImageData(Math.round(rect.x * k), Math.round(rect.y * k), w, h).data;
    let min = Infinity, max = -Infinity, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      // Exact, not a tolerance: the band is a flat fill, and a tolerance wide
      // enough to be safe would start catching the console's own accent.
      if (d[i] === mark[0] && d[i + 1] === mark[1] && d[i + 2] === mark[2]) {
        const col = (i / 4) % w;
        if (col < min) min = col;
        if (col > max) max = col;
        n++;
      }
    }
    if (!n) return { n: 0 };
    return { n, x0: rect.x + min / k, x1: rect.x + max / k, mid: rect.x + (min + max) / (2 * k) };
  }, { b64, rect, mark: MARK });
}

// One field: put the value in, measure its first and last character, and grade
// the order. Returns the two rects so a control row can reuse them.
async function grade(page, { field, sel, value, mode, note }) {
  await page.evaluate(({ sel, value }) => {
    const e = document.querySelector(sel);
    e.value = value;
    e.dispatchEvent(new Event('input', { bubbles: true }));
    e.scrollIntoView({ block: 'center' });
  }, { sel, value });
  const first = await charRect(page, sel, 0);
  const last = await charRect(page, sel, value.length - 1);
  const painted = first?.n && last?.n;
  add({
    field, mode, sel,
    what: `first character is painted left of the last (${JSON.stringify(value)})`,
    ok: !!painted && last.mid - first.mid > EPS,
    value: painted
      ? `dir=${await page.evaluate((s) => getComputedStyle(document.querySelector(s)).direction, sel)} · first x=${first.mid.toFixed(1)} last x=${last.mid.toFixed(1)} dx=${(last.mid - first.mid).toFixed(1)}`
      : 'no highlight painted — the selection was not measured',
  });
  if (note) rows[rows.length - 1].what += ` — ${note}`;
  return { first, last };
}

// ── the driver ──────────────────────────────────────────────────────────────
const stub = spawn(process.execPath, [STUB, String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });
stub.stderr.on('data', (d) => process.stderr.write('[stub] ' + d));
await new Promise((r) => stub.stdout.once('data', r));

const URL_VALUE = 'https://hadar.example.com/event/12/';
const browser = await chromium.launch();
let shot = 0;
try {
  for (const mode of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 1000 }, colorScheme: mode, locale: 'he-IL' });
    const page = await ctx.newPage();
    await page.route('**://*.googleapis.com/**', (r) => r.abort());
    await page.route('**://*.gstatic.com/**', (r) => r.abort());
    await page.route('**://more30.com/**', (r) => r.abort());
    await page.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));

    await page.goto(`${BASE}/console`);
    await page.waitForSelector('.device .actions .btn', { timeout: 15000 });
    await page.addStyleTag({ content: MARK_CSS });
    await page.waitForTimeout(260);

    const close = async () => {
      await page.keyboard.press('Escape');
      await page.waitForSelector('.modal-bg', { state: 'detached', timeout: 15000 });
    };
    const openDialog = async (text, ready) => {
      await page.locator('.device .actions button', { hasText: text }).first().click();
      await page.waitForSelector(ready, { timeout: 15000 });
      await page.waitForTimeout(150);
    };
    const goto = async (view, ready) => {
      await page.locator(`.side nav [data-view=${view}]`).click();
      await page.waitForSelector(ready, { timeout: 15000 });
      await page.waitForTimeout(120);
    };

    // ── 1. החלפת אתר — the one URL field with no `dir` of its own ───────
    await openDialog('החלף אתר', '.modal #u');
    await grade(page, { field: 'promptUrl #u', sel: '.modal #u', value: URL_VALUE, mode });
    // The "before" row, on the defect itself: this field shipped with no `dir`
    // at all, so it inherited the page's `rtl` and the trailing `/` of a pasted
    // URL was painted at the far end. Rebuilt in the same live page rather than
    // quoted, so the measurement that found it is the one recorded.
    await page.evaluate(() => document.querySelector('.modal #u').setAttribute('dir', 'rtl'));
    const was = { first: await charRect(page, '.modal #u', 0), last: await charRect(page, '.modal #u', URL_VALUE.length - 1) };
    add({
      field: 'promptUrl #u (before)', mode, sel: '.modal #u[dir=rtl]',
      what: 'the shipped shape — no `dir`, so the page\'s rtl — paints the value backwards',
      ok: !!(was.first?.n && was.last?.n) && was.last.mid - was.first.mid < -EPS,
      value: was.first?.n && was.last?.n
        ? `first x=${was.first.mid.toFixed(1)} last x=${was.last.mid.toFixed(1)} dx=${(was.last.mid - was.first.mid).toFixed(1)}`
        : 'no highlight painted',
    });
    await page.evaluate(() => document.querySelector('.modal #u').setAttribute('dir', 'ltr'));
    await page.screenshot({ path: `${HERE}${String(++shot).padStart(2, '0')}-set-url-${mode}.png`, clip: await page.evaluate(() => { const r = document.querySelector('.modal').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }) });
    await close();

    // ── 2. עריכת מכשיר — the same value, in the field that declares ltr ──
    await openDialog('עריכה', '.modal #h');
    await grade(page, { field: 'editDevice #h', sel: '.modal #h', value: URL_VALUE, mode });
    await grade(page, { field: 'editDevice #disp', sel: '.modal #disp', value: URL_VALUE, mode });

    // ── C. the control ────────────────────────────────────────────────────
    // Every row above passes by describing a correct declaration, which is
    // indistinguishable from a probe that measured nothing. So the shipped
    // `dir="ltr"` is removed from a field that has one, in the same live page,
    // and the same measurement has to come back reversed.
    await page.evaluate(() => document.querySelector('.modal #h').setAttribute('dir', 'rtl'));
    const ctl = await (async () => {
      const first = await charRect(page, '.modal #h', 0);
      const last = await charRect(page, '.modal #h', URL_VALUE.length - 1);
      return { first, last };
    })();
    add({
      field: 'control', mode, sel: '.modal #h[dir=rtl]',
      what: 'dropping `dir="ltr"` reverses the painted order (this row proves the check can fail)',
      ok: !!(ctl.first?.n && ctl.last?.n) && ctl.last.mid - ctl.first.mid < -EPS,
      value: ctl.first?.n && ctl.last?.n
        ? `first x=${ctl.first.mid.toFixed(1)} last x=${ctl.last.mid.toFixed(1)} dx=${(ctl.last.mid - ctl.first.mid).toFixed(1)}`
        : 'no highlight painted',
    });
    await page.screenshot({ path: `${HERE}${String(++shot).padStart(2, '0')}-edit-control-${mode}.png`, clip: await page.evaluate(() => { const r = document.querySelector('.modal').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }) });
    await close();

    // ── 3. קוד יציאה — a passphrase, letters then digits ─────────────────
    await openDialog('קוד יציאה', '.modal #ex-val');
    await grade(page, { field: 'exitCode #ex-val', sel: '.modal #ex-val', value: 'keter7291', mode });
    await close();

    // ── 4-6. the screens ─────────────────────────────────────────────────
    await goto('links', '#l-url');
    await grade(page, { field: 'links #l-url', sel: '#l-url', value: URL_VALUE, mode });

    await goto('clients', '#c-code');
    await grade(page, { field: 'clients #c-code', sel: '#c-code', value: '1234', mode });
    await grade(page, { field: 'clients #c-url', sel: '#c-url', value: URL_VALUE, mode });

    await goto('enroll', '#e-url');
    await grade(page, { field: 'enroll #e-url', sel: '#e-url', value: URL_VALUE, mode });

    await ctx.close();
  }
} finally {
  await browser.close();
  stub.kill();
}

const bad = rows.filter((r) => !r.ok);
await writeFile(`${HERE}_table.md`, [
  '| field | selector | mode | what | value | ok |',
  '|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.field} | \`${r.sel}\` | ${r.mode} | ${r.what} | ${r.value} | ${r.ok ? '✅' : '❌'} |`),
].join('\n') + '\n');
console.log(`${rows.length - bad.length}/${rows.length} pass`);
if (bad.length) console.log(bad.map((r) => `  ${r.field} ${r.mode}: ${r.what} → ${r.value}`).join('\n'));
