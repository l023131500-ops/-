// The console, read for painted order. 2026-08-11.
//
// `apps/35-kioskfleet/STATUS.md` item 7 ends on this, and it is stated as scope
// rather than as a defect: "a `Range` cannot reach an `<input>`'s value, and
// **`console.html` has never been swept this way** — it is the page with the
// most numbers interpolated into Hebrew sentences, so it is the only place the
// Hebrew-between-tokens group is likely to have real matches at all. On these
// two pages it matched nothing."
//
// So this is `rtl-digits-0811`'s probe pointed at the third page, for the same
// bug class — the one that has now shipped three times (`06:00–04:00` in the OTA
// window, `4:40:00 ,11.8.2026` on the device card, both caught by a screenshot
// and by nothing else). But that run's **two** groups do not survive the move,
// and finding that out is most of what this one did.
//
// There, "separated only by neutrals" meant "one logical left-to-right value",
// because on the installer pages it always was. Here the very first line the
// probe reached was the device card's
//
//     🔋 84% · 📱 Lenovo TB-X306F · v1.4.0
//
// where `84` and `Lenovo` are also separated only by neutrals — and are two
// different **fields**, so RTL order is the correct painting and that run's
// group B calls it a defect. It is not one. The same line then produced the
// second correction: `TB-X306F · v1.4.0` has the *same* bullet between it and is
// painted the other way, correctly, because **both sides are strong L** and N1
// hands the neutrals to L rather than to the paragraph. A bullet does not decide
// anything on its own; it decides only when one side is a bare digit run.
//
// So three groups, and the split is the bidi algorithm's own:
//
//   A. **Hebrew between them.** A Hebrew letter puts the two tokens in separate
//      runs at the base level, so in an RTL paragraph the later one is painted
//      further **left**, always. This is the group the console was predicted to
//      populate and the installer pages did not: `0 מתוך 12 שלבים`,
//      `1 מתוך 2 מאושרים` are this shape.
//   B. **a bare digit run on one side and a field mark between** — a bullet or
//      an emoji, i.e. a visible sign that these are two different values.
//      EN is treated as R by N1, so the two are separate runs and RTL order is
//      both what the algorithm produces and what a reader wants.
//   C. **everything else** — `11.8.2026, 4:40:00`, `hadar.example.com`,
//      `SN-QA-0001`, `v1.4.0`, `06:00–04:00`, and every L…L pair whatever stands
//      between. One run, so the painted order has to be **increasing** left, in
//      either paragraph direction. Both shipped defects sit here: a
//      comma-and-space between two digit runs takes the paragraph's direction
//      (N2) and the runs swap.
//
// The field mark is deliberately `·`, `•`, `|` and emoji only — **not** `–` or
// `/`. `06:00–04:00` is the OTA defect, and a dash there separates nothing.
//
// The controls matter more here than they did there: nine views passing is
// indistinguishable from a probe that walked an empty page.
//
// Two things this run does that `rtl-digits-0811` did not have to:
//   - it takes a **root selector**. The console opens dialogs as `.modal-bg`
//     siblings of `#app-view`, so a body-wide walk with a dialog open re-grades
//     the whole screen behind it and the census stops meaning anything. Each
//     dialog is graded against its own `.modal`.
//   - it drives the sidebar through `#side-toggle` below 801px, because
//     `console-mobile-nav-0811` put the navigation behind a disclosure there and
//     `.side nav` is `display: none` until it is opened.
//
// Stub is `../warn-ink-0811/stub-server.mjs`, reused not copied: it serves the
// real `server/public/` and its two devices differ in exactly the way a painted
// -order sweep wants — device 1 has a timestamp, an access-code chip and a
// `setupTrack`, device 2 has none of them and renders the `—` fallbacks.
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8861;
const BASE = `http://127.0.0.1:${PORT}`;

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };
const add = (r) => { rows.push(r); if (!r.ok) fail(`${r.view} ${r.mode}/${r.vp}: ${r.group} — ${r.what} (${r.value})`); };

// Sub-pixel: two tokens on one line are never a fraction of a pixel apart, and
// a Range rect on a wrapped line can land on a fractional x.
const EPS = 0.5;

// ── the probe ───────────────────────────────────────────────────────────────
// Runs in the page. Everything it returns is geometry read from a Range over
// the live text node, because that is the only thing that sees this class of
// bug: the string, the DOM and `innerText` are all correct in every case.
const PROBE = (rootSel) => {
  const HEB = /[֐-׿]/;
  // A *field* mark: a visible sign that the two tokens are different values.
  // `–` and `/` are deliberately absent — the OTA window's `06:00–04:00` is one
  // value with a dash in it, and a dash in the field-mark set would grade that
  // defect as correct.
  const FIELD = /[·•|]|\p{Extended_Pictographic}/u;
  // A token carrying a Latin letter is strong L. Two of them with only neutrals
  // between are **one** run by N1, whatever those neutrals are — which is why a
  // bullet only separates when one side is a bare digit run (EN, which N1 treats
  // as R). `TB-X306F · v1.4.0` is the case that forced this.
  const LATIN = /[A-Za-z]/;
  const TOKEN = /[A-Za-z0-9]+/g;
  const out = [];
  const root = rootSel ? document.querySelector(rootSel) : document.body;
  if (!root) return out;

  const visible = (el) => {
    if (!el) return false;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      if (n.classList && (n.classList.contains('hidden') || n.classList.contains('hide'))) return false;
    }
    return true;
  };

  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const text = n.data;
    if (!/[A-Za-z0-9]/.test(text) || !visible(n.parentElement)) continue;

    const toks = [];
    TOKEN.lastIndex = 0;
    for (let m; (m = TOKEN.exec(text));) {
      const r = document.createRange();
      r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
      // `getClientRects()`, not `getBoundingClientRect()` — a token split across
      // a line break has a bounding box starting at the left edge of the
      // *second* line, which reads as a token painted backwards. That false
      // positive cost `rtl-digits-0811` a run; a token is compared from where it
      // ends (its last rect) to where the next begins (its first rect).
      const rects = [...r.getClientRects()].filter((b) => b.width || b.height);
      if (!rects.length) continue;                 // collapsed whitespace / off-canvas
      toks.push({ t: m[0], i: m.index, end: m.index + m[0].length, head: rects[0], tail: rects[rects.length - 1] });
    }
    if (toks.length < 2) continue;

    const el = n.parentElement;
    const dir = getComputedStyle(el).direction;
    const where = (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : ''));

    for (let k = 0; k + 1 < toks.length; k++) {
      const a = toks[k], b = toks[k + 1];
      if (Math.round(a.tail.top) !== Math.round(b.head.top)) continue;  // different visual lines: x resets
      const between = text.slice(a.end, b.i);
      const bothL = LATIN.test(a.t) && LATIN.test(b.t);
      out.push({
        where, dir,
        group: HEB.test(between) ? 'A' : (!bothL && FIELD.test(between)) ? 'B' : 'C',
        pair: `${a.t} ⟨${between.replace(/\s+/g, '␠')}⟩ ${b.t}`,
        line: text.trim().replace(/\s+/g, ' ').slice(0, 72),
        dx: b.head.left - a.tail.left,
      });
    }
  }
  return out;
};

const LABEL = { A: 'A Hebrew-separated', B: 'B digit + field mark', C: 'C one run' };

let total = 0;
const seen = { A: 0, B: 0, C: 0 };
function grade(found, view, mode, vp) {
  const n = { A: 0, B: 0, C: 0 };
  for (const f of found) {
    // A and B are both "two runs at the base level": in an RTL paragraph the
    // later token is painted further left, in an LTR one further right. C is one
    // logical left-to-right value, so its painted order must increase in either.
    const ok = f.group === 'C' ? f.dx > EPS : (f.dir === 'rtl' ? f.dx < -EPS : f.dx > EPS);
    n[f.group]++;
    add({ view, mode, vp, group: LABEL[f.group], what: `${f.where} ${f.pair}`, ok, value: `dir=${f.dir} dx=${f.dx.toFixed(1)} · ${f.line}` });
  }
  // A census, not an assertion — a screen may legitimately carry no line with
  // two tokens on it. What proves the probe is live are the control rows plus
  // the totals asserted once at the end.
  total += n.A + n.B + n.C;
  for (const g of ['A', 'B', 'C']) seen[g] += n[g];
  add({ view, mode, vp, group: 'census', what: 'token pairs graded on this view', ok: true, value: `A ${n.A} · B ${n.B} · C ${n.C}` });
}

// ── the driver ──────────────────────────────────────────────────────────────
const stub = spawn(process.execPath, [STUB, String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });
stub.stderr.on('data', (d) => process.stderr.write('[stub] ' + d));
await new Promise((r) => stub.stdout.once('data', r));

const browser = await chromium.launch();
let shot = 0;
try {
  for (const mode of ['light', 'dark']) {
    for (const vp of [390, 1200]) {
      const ctx = await browser.newContext({ viewport: { width: vp, height: 1000 }, colorScheme: mode, locale: 'he-IL' });
      const page = await ctx.newPage();
      await page.route('**://*.googleapis.com/**', (r) => r.abort());
      await page.route('**://*.gstatic.com/**', (r) => r.abort());
      await page.route('**://more30.com/**', (r) => r.abort());
      // `app.js` boots only when a token is in storage (`if (TOKEN) boot()`),
      // so without this the login card renders and there is no console at all.
      await page.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));

      // Below 801px the sidebar is a disclosure (`console-mobile-nav-0811`), so
      // a nav click has to open it first. Choosing a screen closes it again.
      const goto = async (view, ready) => {
        if (vp < 801) await page.locator('#side-toggle').click();
        await page.locator(`.side nav [data-view=${view}]`).click();
        await page.waitForSelector(ready, { timeout: 15000 });
        await page.waitForTimeout(120);
      };

      await page.goto(`${BASE}/console`);
      await page.waitForSelector('.device .actions .btn', { timeout: 15000 });
      // `.btn` carries `transition: .15s` on all properties (button-boundary-0811).
      await page.waitForTimeout(260);

      // ── 1. המכשירים שלי — the card the timestamp defect was found on ──
      grade(await page.evaluate(PROBE, null), 'devices', mode, `${vp}px`);
      if (vp === 390) await page.screenshot({ path: `${HERE}${String(++shot).padStart(2, '0')}-devices-${mode}.png`, fullPage: true });

      // ── 2. the setup wizard — `N מתוך M שלבים`, the shape group A exists for
      await page.locator('.device .actions .btn-primary').first().click();
      await page.waitForSelector('#wz-count', { timeout: 15000 });
      await page.waitForFunction(() => document.querySelector('#wz-count').textContent.trim().length > 0);
      await page.waitForTimeout(150);
      grade(await page.evaluate(PROBE, '.modal'), 'wizard', mode, `${vp}px`);
      if (vp === 1200) await page.screenshot({ path: `${HERE}${String(++shot).padStart(2, '0')}-wizard-${mode}.png` });
      await page.keyboard.press('Escape');
      await page.waitForSelector('.modal-bg', { state: 'detached', timeout: 15000 });

      // ── 3. the approvals picker — `N מתוך M מאושרים`, built in JS ──────
      await page.locator('.device .actions button', { hasText: 'מזהי לקוח' }).first().click();
      await page.waitForSelector('.modal #cnt', { timeout: 15000 });
      await page.waitForTimeout(150);
      grade(await page.evaluate(PROBE, '.modal'), 'approvals', mode, `${vp}px`);
      await page.keyboard.press('Escape');
      await page.waitForSelector('.modal-bg', { state: 'detached', timeout: 15000 });

      // ── 4. the access-code dialog — a six-character code beside Hebrew ─
      await page.locator('.device .actions button', { hasText: 'קוד גישה' }).first().click();
      await page.waitForSelector('.modal', { timeout: 15000 });
      await page.waitForTimeout(150);
      grade(await page.evaluate(PROBE, '.modal'), 'access-code', mode, `${vp}px`);
      await page.keyboard.press('Escape');
      await page.waitForSelector('.modal-bg', { state: 'detached', timeout: 15000 });

      // ── 5-9. every remaining screen in the sidebar ─────────────────────
      await goto('links', '#l-url');
      grade(await page.evaluate(PROBE, null), 'links', mode, `${vp}px`);

      await goto('clients', '#c-code');
      grade(await page.evaluate(PROBE, null), 'clients', mode, `${vp}px`);

      await goto('enroll', '#e-list table');
      grade(await page.evaluate(PROBE, null), 'enroll', mode, `${vp}px`);

      // The answer block, which only exists after a POST — an install URL and a
      // six-character code interpolated into Hebrew sentences.
      await page.fill('#e-url', 'https://hadar.example.com/event/12');
      await page.locator('#e-create').click();
      await page.waitForSelector('#e-result .alert-ok', { timeout: 15000 });
      await page.waitForTimeout(120);
      grade(await page.evaluate(PROBE, '#e-result'), 'enroll(created)', mode, `${vp}px`);
      if (vp === 1200) await page.screenshot({ path: `${HERE}${String(++shot).padStart(2, '0')}-enroll-created-${mode}.png` });

      await goto('guide', '#gd-list');
      grade(await page.evaluate(PROBE, null), 'guide', mode, `${vp}px`);

      await goto('settings', '#chp');
      grade(await page.evaluate(PROBE, null), 'settings', mode, `${vp}px`);

      // ── C. the controls ───────────────────────────────────────────────
      // Appended to the live `#content` of whichever screen is open, so they are
      // graded on the console's own RTL card rather than on a synthetic page.
      const control = (text) => page.evaluate(({ probe, text }) => {
        const p = document.createElement('p');
        p.className = 'qa-control';   // first class: `where` names the first one
        p.textContent = text;
        document.querySelector('#content .card').appendChild(p);
        const found = (new Function('return (' + probe + ')()'))();
        p.remove();
        return found.filter((f) => f.where.includes('qa-control'));
      }, { probe: PROBE.toString(), text });

      // 1 — group C. The shape `device-card-390-0811` found, rebuilt here: the
      // comma between the date and the time is a neutral, takes the paragraph's
      // direction (N2), and the two digit runs swap.
      const c1 = await control('עודכן לאחרונה 11.8.2026, 4:40:00');
      add({
        view: 'settings', mode, vp: `${vp}px`, group: 'control (C)',
        what: 'the known-bad date+time line is flagged',
        ok: c1.some((f) => f.group === 'C' && f.dx < -EPS),
        value: c1.length ? c1.map((f) => `${f.group}: ${f.pair} dx=${f.dx.toFixed(1)}`).join(' | ') : 'the control line produced no pair',
      });

      // 1b — and the field mark is what tells the two apart, so the same two
      // digit runs with a bullet between them have to leave group C. Without
      // this row the classifier that this run exists to correct is untested.
      const c1b = await control('סטטוס: 12 · 4 שלבים');
      add({
        view: 'settings', mode, vp: `${vp}px`, group: 'control (B)',
        what: 'a bullet between the same two runs moves the pair to group B and it passes',
        ok: c1b.some((f) => f.group === 'B') && !c1b.some((f) => f.group === 'C') &&
            c1b.filter((f) => f.group === 'B').every((f) => f.dx < -EPS),
        value: c1b.map((f) => `${f.group}: ${f.pair} dx=${f.dx.toFixed(1)}`).join(' | ') || 'no pair',
      });

      // 1c — and the other half of that correction: the **same bullet** between
      // two Latin tokens is not a separator at all (N1 hands the neutrals to L),
      // so the pair has to stay in C and increase. This is the row the device
      // card's `TB-X306F · v1.4.0` failed before the classifier grew this case.
      const c1c = await control('דגם: Lenovo TB-X306F · v1.4.0');
      add({
        view: 'settings', mode, vp: `${vp}px`, group: 'control (C, L…L)',
        what: 'the same bullet between two Latin tokens keeps the pair in C and it increases',
        ok: c1c.some((f) => f.group === 'C' && f.pair.includes('·')) &&
            c1c.filter((f) => f.group === 'C').every((f) => f.dx > EPS) &&
            !c1c.some((f) => f.group === 'B'),
        value: c1c.map((f) => `${f.group}: ${f.pair} dx=${f.dx.toFixed(1)}`).join(' | ') || 'no pair',
      });

      // 2 — group A. Unlike on the two installer pages this group has real
      // matches here, but the negative row is still needed: a group that only
      // ever passes has not been shown to be able to fail. U+202D and not a CSS
      // `unicode-bidi: bidi-override`, which overrides to the element's own
      // `direction` — `rtl` — and paints the control exactly as the correct case
      // does (measured in `rtl-digits-0811`).
      const c2ok = await control('שלב 3 מתוך 12 הושלם');
      const c2bad = await control('‭שלב 3 מתוך 12 הושלם');
      const aPairs = (r) => r.filter((f) => f.group === 'A');
      add({
        view: 'settings', mode, vp: `${vp}px`, group: 'C control (A)',
        what: 'a Hebrew-separated pair is emitted as group A and paints right-to-left',
        ok: aPairs(c2ok).length > 0 && aPairs(c2ok).every((f) => f.dx < -EPS),
        value: aPairs(c2ok).map((f) => `${f.pair} dx=${f.dx.toFixed(1)}`).join(' | ') || 'no group A pair emitted',
      });
      add({
        view: 'settings', mode, vp: `${vp}px`, group: 'C control (A)',
        what: 'and overriding the direction flags it (this row proves group A can fail)',
        ok: aPairs(c2bad).length > 0 && aPairs(c2bad).some((f) => f.dx > EPS),
        value: aPairs(c2bad).map((f) => `${f.pair} dx=${f.dx.toFixed(1)}`).join(' | ') || 'no group A pair emitted',
      });

      await ctx.close();
    }
  }
} finally {
  await browser.close();
  stub.kill();
}

add({ view: '(all)', mode: '—', vp: '—', group: 'coverage', what: 'the probe graded something at all', ok: total > 0, value: `${total} token pairs across every view` });
// The reason this page was singled out: group A matched **nothing** on the two
// installer pages, so on the page that was predicted to populate it, an empty
// group A is a harness failure and not a clean result.
add({ view: '(all)', mode: '—', vp: '—', group: 'coverage', what: 'group A has real matches here (the prediction under test)', ok: seen.A > 0, value: `${seen.A} Hebrew-separated pairs` });
// The classifier this run introduced is only worth anything if the page carries
// both of the classes it added; if group B were empty, three groups would be an
// unexercised claim rather than a correction.
add({ view: '(all)', mode: '—', vp: '—', group: 'coverage', what: 'and so do B and C', ok: seen.B > 0 && seen.C > 0, value: `B ${seen.B} · C ${seen.C}` });

const bad = rows.filter((r) => !r.ok);
await writeFile(`${HERE}_table.md`, [
  '| view | mode | width | group | what | value | ok |',
  '|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.view} | ${r.mode} | ${r.vp} | ${r.group} | ${r.what} | ${r.value} | ${r.ok ? '✅' : '❌'} |`),
].join('\n') + '\n');
console.log(`${rows.length - bad.length}/${rows.length} pass`);
if (bad.length) console.log(bad.map((r) => `  ${r.view} ${r.mode} ${r.vp} ${r.group}: ${r.what} → ${r.value}`).join('\n'));
