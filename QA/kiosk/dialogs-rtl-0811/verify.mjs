// The six device dialogs nobody has read for painted order. 2026-08-11.
//
// `console-rtl-0811` swept nine views and `input-rtl-0811` ended on what it left:
// "`promptUrl`'s own **label** interpolates a host into a Hebrew sentence, which
// is `console-rtl-0811`'s sweep on a tenth view rather than an input question."
//
// A tenth view is the smallest honest scope, and it is also the wrong one. The
// devices screen opens **eleven** dialogs; that run opened three (the wizard, the
// 🆔 approvals picker, the 🔑 access-code dialog). The other six — 🔗 החלף אתר,
// ✏️ עריכה, 🚪 קוד יציאה, 📚 קישורים מאושרים, ♻️ אתחל and 🗑️ — cost one click
// each and are the same mechanism as the tenth, so opening one and not the rest
// would leave five views unread for no reason other than which sentence the last
// commit happened to name.
//
// The probe is `console-rtl-0811`'s, unchanged, including its three groups and
// the two corrections that run made (a bullet separates only when one side is a
// bare digit run; `–` and `/` are not field marks). What changes is the driver:
// a dialog is graded against its own `.modal`, because a `.modal-bg` is a sibling
// of `#app-view` and a body-wide walk would re-grade the screen behind it.
//
// Device 2 is driven as well as device 1 on the two dialogs whose text has a
// second branch: `promptUrl`'s label falls back to `הדומיין המורשה` when the
// device has no allowed host, and `linkApprovals`' hint says the opposite thing.
// Those are the branches an owner with an unconfigured device sees, and no run
// has rendered either.
//
// Stub is `../warn-ink-0811/stub-server.mjs`, reused not copied.
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
const add = (r) => { rows.push(r); if (!r.ok) fail(`${r.view} ${r.mode}/${r.vp}: ${r.group} — ${r.what} (${r.value})`); };

// Sub-pixel: two tokens on one line are never a fraction of a pixel apart, and
// a Range rect on a wrapped line can land on a fractional x.
const EPS = 0.5;

// ── the probe ───────────────────────────────────────────────────────────────
// Verbatim from `console-rtl-0811/verify.mjs`. Everything it returns is geometry
// read from a Range over the live text node, because that is the only thing that
// sees this class of bug: the string, the DOM and `innerText` are all correct in
// every case.
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
      // *second* line, which reads as a token painted backwards.
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
const census = new Map();
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
  total += n.A + n.B + n.C;
  for (const g of ['A', 'B', 'C']) seen[g] += n[g];
  census.set(view, (census.get(view) || 0) + n.A + n.B + n.C);
  // A census, not an assertion — `♻️ אתחל` and `🗑️` interpolate a Hebrew device
  // name into Hebrew prose and legitimately carry no gradable pair at all. What
  // proves the probe is live are the control rows and the per-dialog coverage
  // assertion at the end, which names the four dialogs that must have matches.
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
      // `app.js` boots only when a token is in storage (`if (TOKEN) boot()`).
      await page.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));

      await page.goto(`${BASE}/console`);
      await page.waitForSelector('.device .actions .btn', { timeout: 15000 });
      // `.btn` carries `transition: .15s` on all properties (button-boundary-0811).
      await page.waitForTimeout(260);

      // One click, one grade, Escape. `dialog-focus-0811` made Escape close a
      // modal and `dialog-inert-0811` made the page behind it `inert`, so the
      // next click has to wait for the detach or it lands on an inert card.
      const dialog = async ({ label, nth, ready, view, snap }) => {
        await page.locator('.device').nth(nth).locator('.actions button', { hasText: label }).first().click();
        await page.waitForSelector(ready, { timeout: 15000 });
        await page.waitForTimeout(150);
        grade(await page.evaluate(PROBE, '.modal'), view, mode, `${vp}px`);
        if (snap && vp === 1200) await page.screenshot({ path: `${HERE}${String(++shot).padStart(2, '0')}-${snap}-${mode}.png` });
        await page.keyboard.press('Escape');
        await page.waitForSelector('.modal-bg', { state: 'detached', timeout: 15000 });
      };

      // ── 1. 🔗 החלף אתר — the dialog `input-rtl-0811` named. Its label
      // interpolates `d.allowedHost` into a Hebrew sentence; `#u` itself is an
      // input and out of a Range's reach, which is what that run measured
      // instead and is not re-measured here.
      await dialog({ label: 'החלף אתר', nth: 0, ready: '.modal #u', view: 'set-url', snap: 'set-url' });
      // and the other branch of that same label: device 2 has no allowed host,
      // so the sentence ends in `הדומיין המורשה` and carries no Latin token at
      // all. Graded to record that, not to find something in it.
      await dialog({ label: 'החלף אתר', nth: 1, ready: '.modal #u', view: 'set-url(no host)' });

      // ── 2. ✏️ עריכה — five fields, a select of link names, and the host
      // chips `hostListEditor` builds. The densest of the six.
      await dialog({ label: 'עריכה', nth: 0, ready: '.modal #disp-hint', view: 'edit', snap: 'edit' });

      // ── 3. 🚪 קוד יציאה — `מכשיר: … · S/N SN-QA-0001` is a bullet with a
      // Latin token on both sides, the exact shape that forced
      // `console-rtl-0811`'s second correction; and the hint line carries two
      // explicit isolates (U+2066/U+2069) that nothing else in the console uses.
      await dialog({ label: 'קוד יציאה', nth: 0, ready: '.modal #ex-val', view: 'exit-code', snap: 'exit-code' });

      // ── 4. 📚 קישורים מאושרים — `N מתוך M מאושרים` (group A) beside a link
      // name ending in `12/8` and a URL. `/` is deliberately not a field mark.
      await dialog({ label: 'קישורים מאושרים', nth: 0, ready: '.modal #lk-list label', view: 'link-approvals' });
      await dialog({ label: 'קישורים מאושרים', nth: 1, ready: '.modal #lk-list label', view: 'link-approvals(no host)' });

      // ── 5-6. the two confirmations. Hebrew prose around a Hebrew device name,
      // so a zero census is the expected result and is recorded as one.
      await dialog({ label: 'אתחל', nth: 0, ready: '.modal #y', view: 'confirm-reboot' });
      await dialog({ label: '🗑️', nth: 0, ready: '.modal #y', view: 'confirm-delete' });

      // ── C. the controls ───────────────────────────────────────────────
      // Appended to a live `.modal` rather than to `#content`, because that is
      // the surface every row above was read on: an RTL card inside a dialog.
      await page.locator('.device').first().locator('.actions button', { hasText: 'החלף אתר' }).click();
      await page.waitForSelector('.modal #u', { timeout: 15000 });
      const control = (text) => page.evaluate(({ probe, text }) => {
        const p = document.createElement('p');
        p.className = 'qa-control';   // first class: `where` names the first one
        p.textContent = text;
        document.querySelector('.modal').appendChild(p);
        const found = (new Function('return (' + probe + ')()'))();
        p.remove();
        return found.filter((f) => f.where.includes('qa-control'));
      }, { probe: PROBE.toString(), text });

      // 1 — group C. The shape `device-card-390-0811` found, rebuilt inside a
      // dialog: the comma between the date and the time is a neutral, takes the
      // paragraph's direction (N2), and the two digit runs swap.
      const c1 = await control('עודכן לאחרונה 11.8.2026, 4:40:00');
      add({
        view: 'set-url', mode, vp: `${vp}px`, group: 'control (C)',
        what: 'the known-bad date+time line is flagged inside a .modal',
        ok: c1.some((f) => f.group === 'C' && f.dx < -EPS),
        value: c1.length ? c1.map((f) => `${f.group}: ${f.pair} dx=${f.dx.toFixed(1)}`).join(' | ') : 'the control line produced no pair',
      });

      // 2 — group C, L…L. The row the exit-code dialog's `S/N` depends on: a
      // slash between two Latin tokens is not a separator, so the pair stays in
      // C and increases. Without it, `S ⟨/⟩ N` passing proves nothing.
      const c2 = await control('מכשיר: כניסה ראשית · S/N SN-QA-0001');
      add({
        view: 'exit-code', mode, vp: `${vp}px`, group: 'control (C, L…L)',
        what: 'the exit-code dialog\'s own S/N line is emitted in C and increases',
        ok: c2.some((f) => f.group === 'C' && f.pair.includes('/')) &&
            c2.filter((f) => f.group === 'C').every((f) => f.dx > EPS),
        value: c2.map((f) => `${f.group}: ${f.pair} dx=${f.dx.toFixed(1)}`).join(' | ') || 'no pair',
      });

      // 2b — group B, which has **no real match anywhere in these six dialogs**
      // (measured: A 12 · B 0 · C 100). That is a fact about the dialogs — a
      // bare digit run beside a field mark is the device *card*'s `🔋 84% · 📱`
      // shape and no dialog carries it — but a group with zero rows is also
      // exactly what a broken classifier looks like, so it is exercised here
      // instead of being quietly absent. Same two digit runs as the control
      // above; the bullet is the only difference and it has to move the pair
      // out of C.
      const c2b = await control('סטטוס: 12 · 4 שלבים');
      add({
        view: 'exit-code', mode, vp: `${vp}px`, group: 'control (B)',
        what: 'a bullet between two bare digit runs still moves the pair to group B and it passes',
        ok: c2b.some((f) => f.group === 'B') && !c2b.some((f) => f.group === 'C') &&
            c2b.filter((f) => f.group === 'B').every((f) => f.dx < -EPS),
        value: c2b.map((f) => `${f.group}: ${f.pair} dx=${f.dx.toFixed(1)}`).join(' | ') || 'no pair',
      });

      // 3 — group A, and the negative row that proves it can fail. U+202D and
      // not a CSS `unicode-bidi: bidi-override`, which overrides to the
      // element's own `direction` — `rtl` — and paints the control exactly as
      // the correct case does (measured in `rtl-digits-0811`).
      const c3ok = await control('אושרו 1 מתוך 2 קישורים');
      const c3bad = await control('‭אושרו 1 מתוך 2 קישורים');
      const aPairs = (r) => r.filter((f) => f.group === 'A');
      add({
        view: 'link-approvals', mode, vp: `${vp}px`, group: 'control (A)',
        what: 'a Hebrew-separated pair is emitted as group A and paints right-to-left',
        ok: aPairs(c3ok).length > 0 && aPairs(c3ok).every((f) => f.dx < -EPS),
        value: aPairs(c3ok).map((f) => `${f.pair} dx=${f.dx.toFixed(1)}`).join(' | ') || 'no group A pair emitted',
      });
      add({
        view: 'link-approvals', mode, vp: `${vp}px`, group: 'control (A)',
        what: 'and overriding the direction flags it (this row proves group A can fail)',
        ok: aPairs(c3bad).length > 0 && aPairs(c3bad).some((f) => f.dx > EPS),
        value: aPairs(c3bad).map((f) => `${f.pair} dx=${f.dx.toFixed(1)}`).join(' | ') || 'no group A pair emitted',
      });

      await ctx.close();
    }
  }
} finally {
  await browser.close();
  stub.kill();
}

add({ view: '(all)', mode: '—', vp: '—', group: 'coverage', what: 'the probe graded something at all', ok: total > 0, value: `${total} token pairs across eight dialog views` });
// Four of the eight views must have matches, and naming them is the difference
// between this run and one whose selectors all missed: a dialog that failed to
// open produces an empty `.modal` walk and a silent zero census.
for (const v of ['set-url', 'edit', 'exit-code', 'link-approvals']) {
  add({ view: '(all)', mode: '—', vp: '—', group: 'coverage', what: `${v} carries real pairs (it opened and was walked)`, ok: (census.get(v) || 0) > 0, value: `${census.get(v) || 0} pairs over 4 combinations` });
}
// A and C only. `console-rtl-0811` could assert all three because the device
// card is on its first view; **B is empty here and that is the measurement** —
// no dialog puts a bare digit run beside a bullet or an emoji. Asserting B > 0
// would be asserting something about the console that is not true, so the
// classifier's third group is proven live by the control row instead.
add({ view: '(all)', mode: '—', vp: '—', group: 'coverage', what: 'the dialogs themselves populate A and C (B is a control-only group here)', ok: seen.A > 0 && seen.C > 0, value: `A ${seen.A} · B ${seen.B} · C ${seen.C}` });

const bad = rows.filter((r) => !r.ok);
await writeFile(`${HERE}_table.md`, [
  '| view | mode | width | group | what | value | ok |',
  '|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.view} | ${r.mode} | ${r.vp} | ${r.group} | ${r.what} | ${r.value} | ${r.ok ? '✅' : '❌'} |`),
].join('\n') + '\n');
console.log(`${rows.length - bad.length}/${rows.length} pass`);
if (bad.length) console.log(bad.map((r) => `  ${r.view} ${r.mode} ${r.vp} ${r.group}: ${r.what} → ${r.value}`).join('\n'));
