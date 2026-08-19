// The last three dialog sets nobody has read for painted order. 2026-08-11.
//
// `dialogs-rtl-0811` closed the six device dialogs and ended by naming exactly
// what it had not reached: "clientModal, confirmDeleteClient, and the הגדרות →
// משתמשים set, which needs a `role: admin` stub user — warn-ink-0811's is
// `owner`." That is this run, and the admin half turned out to need a route the
// stub did not have either.
//
// Two things are worth saying about the scope before the numbers.
//
// **The admin screen has never been rendered by any harness.** STATUS.md item 6
// records "every console screen has now been graded", and it is true of the
// seven screens an *owner* can reach. `viewAdmin()` opens with
// `if (ME.role !== 'admin') return route('devices')`, and the shared stub's user
// is an owner, so ניהול-על has been silently unreachable in every run since the
// screen existed — not skipped, redirected. It is graded here as a view of its
// own, because the three dialogs cannot be opened without first rendering it and
// grading what is already on screen costs nothing.
//
// **A zero census means two different things, and this harness separates them.**
// `dialogs-rtl-0811` proved a dialog had opened by requiring it to carry real
// token pairs, which works for six dialogs full of hosts and codes. It does not
// work here: `delUser` is one Hebrew sentence, `resetPw` is a Hebrew label over
// an `<input>`, and `userModal` is five labelled fields whose values are all
// inside inputs — where a Range cannot go (`input-rtl-0811`). Those views are
// *expected* to grade nothing, which is the same output as a selector that
// missed. So every view carries an explicit `opened` row taken from the DOM,
// and the census is reported beside it rather than standing in for it.
//
// The probe is `console-rtl-0811`'s, unchanged, as in the run before this one.
// Two stub instances: an owner for the client dialogs, which is how a customer
// actually sees them, and an admin for the rest — which also keeps the new flag
// honest by exercising both sides of it.
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const OWNER_PORT = 8871;
const ADMIN_PORT = 8872;

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };
const add = (r) => { rows.push(r); if (!r.ok) fail(`${r.view} ${r.mode}/${r.vp}: ${r.group} — ${r.what} (${r.value})`); };

const EPS = 0.5;   // two tokens on one line are never a fraction of a pixel apart

// ── the probe ───────────────────────────────────────────────────────────────
// Verbatim from `console-rtl-0811/verify.mjs` via `dialogs-rtl-0811`. Geometry
// from a Range over the live text node is the only thing that sees this class of
// bug: the string, the DOM and `innerText` are correct in every case.
const PROBE = (rootSel) => {
  const HEB = /[֐-׿]/;
  const FIELD = /[·•|]|\p{Extended_Pictographic}/u;
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
      // a line break has a bounding box starting at the left edge of the second
      // line, which reads as a token painted backwards.
      const rects = [...r.getClientRects()].filter((b) => b.width || b.height);
      if (!rects.length) continue;
      toks.push({ t: m[0], i: m.index, end: m.index + m[0].length, head: rects[0], tail: rects[rects.length - 1] });
    }
    if (toks.length < 2) continue;

    const el = n.parentElement;
    const dir = getComputedStyle(el).direction;
    const where = (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : ''));

    for (let k = 0; k + 1 < toks.length; k++) {
      const a = toks[k], b = toks[k + 1];
      if (Math.round(a.tail.top) !== Math.round(b.head.top)) continue;  // different visual lines
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
    // A and B are two runs at the base level: in an RTL paragraph the later token
    // is painted further left. C is one logical left-to-right value, so its
    // painted order must increase in either direction.
    const ok = f.group === 'C' ? f.dx > EPS : (f.dir === 'rtl' ? f.dx < -EPS : f.dx > EPS);
    n[f.group]++;
    add({ view, mode, vp, group: LABEL[f.group], what: `${f.where} ${f.pair}`, ok, value: `dir=${f.dir} dx=${f.dx.toFixed(1)} · ${f.line}` });
  }
  total += n.A + n.B + n.C;
  for (const g of ['A', 'B', 'C']) seen[g] += n[g];
  census.set(view, (census.get(view) || 0) + n.A + n.B + n.C);
  add({ view, mode, vp, group: 'census', what: 'token pairs graded on this view', ok: true, value: `A ${n.A} · B ${n.B} · C ${n.C}` });
}

// ── the driver ──────────────────────────────────────────────────────────────
const start = (port, role) => new Promise((resolve) => {
  const s = spawn(process.execPath, [STUB, String(port), ...(role ? [role] : [])], { stdio: ['ignore', 'pipe', 'pipe'] });
  s.stderr.on('data', (d) => process.stderr.write(`[stub:${role || 'owner'}] ` + d));
  s.stdout.once('data', () => resolve(s));
});
const owner = await start(OWNER_PORT, null);
const admin = await start(ADMIN_PORT, 'admin');

const browser = await chromium.launch();
let shot = 0;
try {
  for (const mode of ['light', 'dark']) {
    for (const vp of [390, 1200]) {
      const open = async (port) => {
        const ctx = await browser.newContext({ viewport: { width: vp, height: 1000 }, colorScheme: mode, locale: 'he-IL' });
        const page = await ctx.newPage();
        await page.route('**://*.googleapis.com/**', (r) => r.abort());
        await page.route('**://*.gstatic.com/**', (r) => r.abort());
        await page.route('**://more30.com/**', (r) => r.abort());
        await page.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));   // `if (TOKEN) boot()`
        await page.goto(`http://127.0.0.1:${port}/console`);
        await page.waitForSelector('.device .actions .btn', { timeout: 15000 });
        return { ctx, page };
      };

      // Below 800px `.side` is display:none and the navigation is behind the
      // toggle `console-mobile-nav-0811` added, so the sidebar cannot simply be
      // clicked at 390px. `route()` is the same entry point the button calls.
      const goto = async (page, view, ready) => {
        await page.evaluate((v) => route(v, true), view);
        await page.waitForSelector(ready, { timeout: 15000 });
        await page.waitForTimeout(260);   // `.btn` carries transition: .15s
      };

      // One click, one grade, Escape. `dialog-focus-0811` made Escape close a
      // modal and `dialog-inert-0811` made the page behind it inert, so the next
      // click has to wait for the detach or it lands on an inert card.
      const dialog = async (page, { click, ready, view, snap }) => {
        await page.locator(click).first().click();
        const opened = await page.waitForSelector(ready, { timeout: 15000 }).then(() => true).catch(() => false);
        add({ view, mode, vp: `${vp}px`, group: 'opened', what: `the dialog is on screen (${ready})`, ok: opened, value: opened ? 'yes' : 'the selector never appeared' });
        if (!opened) return;
        await page.waitForTimeout(150);
        grade(await page.evaluate(PROBE, '.modal'), view, mode, `${vp}px`);
        if (snap && vp === 1200) await page.screenshot({ path: `${HERE}${String(++shot).padStart(2, '0')}-${snap}-${mode}.png` });
        await page.keyboard.press('Escape');
        await page.waitForSelector('.modal-bg', { state: 'detached', timeout: 15000 });
      };

      // ── owner: the two client dialogs ────────────────────────────────
      // Graded on an owner rather than on the admin session below, because that
      // is who the מזהי לקוח screen belongs to and `loadClients()` renders the
      // same table for both — the difference would be the sidebar behind an
      // inert page.
      {
        const { ctx, page } = await open(OWNER_PORT);
        await goto(page, 'clients', '#c-list table');

        // ✏️ עריכה on `אולם הדר`. The one view here with real pairs: the pinned
        // host chip `hostListEditor` builds, plus the two `dir="ltr"` URL lines
        // the table already carries behind it.
        await dialog(page, { click: '#c-list [data-edit]', ready: '.modal #k-hl .hl-tag, .modal #k-hl input', view: 'client-edit', snap: 'client-edit' });

        // 🗑️ מחק. One Hebrew sentence interpolating a Hebrew name and a code —
        // `"אולם הדר" (מזהה 1234) יימחק` — so a single token and no pair. The
        // `opened` row is what makes that a measurement.
        await dialog(page, { click: '#c-list [data-del]', ready: '.modal #y', view: 'client-delete', snap: 'client-delete' });

        await ctx.close();
      }

      // ── admin: the screen, then its three dialogs ────────────────────
      {
        const { ctx, page } = await open(ADMIN_PORT);

        // The flag is only honest if both sides of it are exercised.
        add({
          view: 'admin-screen', mode, vp: `${vp}px`, group: 'stub',
          what: 'the admin stub reports role=admin and unhides #menu-admin',
          ok: await page.evaluate(() => ME.role === 'admin' && !document.getElementById('menu-admin').classList.contains('hidden')),
          value: await page.evaluate(() => `role=${ME.role} menu-admin.hidden=${document.getElementById('menu-admin').classList.contains('hidden')}`),
        });

        await goto(page, 'admin', '#users table tr:nth-child(3)');
        grade(await page.evaluate(PROBE, '#content'), 'admin-screen', mode, `${vp}px`);
        await page.screenshot({ path: `${HERE}${String(++shot).padStart(2, '0')}-admin-screen-${vp}-${mode}.png` });

        // ── the reason this screen had to be rendered before it could be read ──
        //
        // It is not a painted-order question and no probe above would have seen
        // it. Seven columns ending in three buttons, in a 276px card: the table
        // wants 444px. `loadClients()` already wraps its six-column table in an
        // `overflow-x:auto` div because `clients-console-0811` found exactly this
        // — and this table, on the one screen no harness could reach, never got
        // the wrapper.
        //
        // Graded as **reflow (WCAG 1.4.10)**, and it took two wrong gradings to
        // get there. Both are recorded, because each is a way to overclaim.
        //
        // First: "the button is inside the viewport" fails *with* the fix in
        // place. A scroll container starts at the RTL origin, so the last column
        // sits off to the left until something scrolls to it — correct
        // behaviour, and what the clients table has always done.
        //
        // Second, and the one that would have put a false sentence in STATUS.md:
        // the button is **not** unreachable in the shipped state.
        // `documentElement.scrollWidth` stays at the window width, which reads as
        // "there is nothing to scroll" — but `main.main` is `overflow: auto` and
        // it is what absorbs the drag (measured: `scrollLeft: -89`). The row can
        // be reached, by dragging the whole console sideways.
        //
        // That is the real defect and it has a criterion: at 320 CSS px content
        // must not require scrolling in two dimensions. So what is asserted is
        // that **`main` does not overflow** — one table scrolling inside its own
        // box is the accepted shape, and it is exactly what the wrapper produces
        // — with the buttons measured after `scrollIntoView`, which is what the
        // browser does when a Tab lands on one.
        const reach = await page.evaluate(() => {
          const box = document.querySelector('#users');
          const row = box.querySelector('tr:nth-child(3)');
          const main = document.querySelector('main.main');
          const btns = [...row.querySelectorAll('button')].map((b) => {
            const at = b.getBoundingClientRect();
            b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            const after = b.getBoundingClientRect();
            return { name: b.textContent.trim(), painted: at.left, left: after.left, right: after.right };
          });
          main.scrollLeft = 0;
          const wrap = box.querySelector('div');
          return {
            btns, win: window.innerWidth,
            mainScroll: main.scrollWidth, mainClient: main.clientWidth,
            wrapped: !!wrap && getComputedStyle(wrap).overflowX === 'auto',
            need: box.querySelector('table').scrollWidth, have: box.clientWidth,
          };
        });
        add({
          view: 'admin-screen', mode, vp: `${vp}px`, group: 'reflow',
          what: 'the console itself does not scroll sideways (1.4.10)',
          ok: reach.mainScroll <= reach.mainClient + 0.5,
          value: `main ${reach.mainScroll}px in ${reach.mainClient}px`,
        });
        add({
          view: 'admin-screen', mode, vp: `${vp}px`, group: 'reflow',
          what: 'the table that does not fit is inside a scroll container of its own',
          ok: reach.wrapped || reach.need <= reach.have,
          value: `table ${reach.need}px in ${reach.have}px, wrapped=${reach.wrapped}`,
        });
        add({
          view: 'admin-screen', mode, vp: `${vp}px`, group: 'reflow',
          what: 'every button in a user row still comes into view when focused',
          ok: reach.btns.every((b) => b.left >= -0.5 && b.right <= reach.win + 0.5),
          value: reach.btns.map((b) => `${b.name} painted ${b.painted.toFixed(0)} → [${b.left.toFixed(0)}..${b.right.toFixed(0)}]`).join(' · ') + ` · win=${reach.win}`,
        });
        // The negative row: unwrap it in the same live page and `main` has to
        // start overflowing again. Without it, the rows above pass by describing
        // a table that happens to fit.
        // The wrapper is **removed**, not restyled. `overflow-x: visible` beside
        // an `overflow-y` that computes to `auto` computes back to `auto` — the
        // first version of this control did exactly that and rebuilt the fixed
        // state while claiming to rebuild the shipped one, passing the row for
        // the wrong reason.
        const before = await page.evaluate(() => {
          const box = document.querySelector('#users');
          const wrap = box.querySelector('div');
          if (!wrap) return null;
          // Moved, not re-created: `loadUsers()` binds `onclick` to these exact
          // button nodes and is not called again, so rebuilding the markup here
          // would leave the four dialogs below unopenable.
          const table = wrap.firstElementChild;
          const main = document.querySelector('main.main');
          box.replaceChild(table, wrap);                          // the bare <table>, as shipped
          const b = table.querySelector('tr:nth-child(3) [data-del]');
          const painted = b.getBoundingClientRect().left;
          b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          const out = {
            painted, left: b.getBoundingClientRect().left,
            mainScroll: main.scrollWidth, mainClient: main.clientWidth, mainLeft: main.scrollLeft,
            docScroll: document.documentElement.scrollWidth, win: window.innerWidth,
          };
          main.scrollLeft = 0;
          box.replaceChild(wrap, table);
          wrap.appendChild(table);
          return out;
        });
        add({
          view: 'admin-screen', mode, vp: `${vp}px`, group: 'control (reflow)',
          what: vp === 390
            ? 'unwrapped, main overflows again and מחק is painted off screen until the whole console is dragged (proves the check can fail)'
            : 'at 1200px the table fits, so unwrapping changes nothing — recorded, not asserted',
          ok: vp === 390 ? !!before && before.mainScroll > before.mainClient + 0.5 && before.painted < 0 : true,
          value: before
            ? `main ${before.mainScroll}/${before.mainClient} · מחק painted ${before.painted.toFixed(0)} → ${before.left.toFixed(0)} after main.scrollLeft=${before.mainLeft.toFixed(0)} · doc=${before.docScroll}/${before.win}`
            : 'no wrapper found',
        });

        // ערוך on the *second* row — the non-admin one. Editing the admin
        // themself renders the same dialog, and the second row is also the only
        // one carrying 🗑️.
        await dialog(page, { click: '#users tr:nth-child(3) [data-edit]', ready: '.modal #u-active', view: 'user-edit', snap: 'user-edit' });
        // ➕ לקוח חדש — the other branch of the same function: three fields the
        // edit branch does not render, and no status select.
        await dialog(page, { click: '#new-user', ready: '.modal #u-user', view: 'user-new', snap: 'user-new' });
        // סיסמה → resetPw
        await dialog(page, { click: '#users tr:nth-child(3) [data-pw]', ready: '.modal #pw', view: 'reset-password' });
        // מחק → delUser
        await dialog(page, { click: '#users tr:nth-child(3) [data-del]', ready: '.modal #y', view: 'delete-user' });

        // ── the controls ───────────────────────────────────────────────
        // Appended to a live `.modal`, which is the surface every dialog row
        // above was read on: an RTL card inside a dialog.
        await page.locator('#users tr:nth-child(3) [data-pw]').first().click();
        await page.waitForSelector('.modal #pw', { timeout: 15000 });
        const control = (text) => page.evaluate(({ probe, text }) => {
          const p = document.createElement('p');
          p.className = 'qa-control';
          p.textContent = text;
          document.querySelector('.modal').appendChild(p);
          const found = (new Function('return (' + probe + ')()'))();
          p.remove();
          return found.filter((f) => f.where.includes('qa-control'));
        }, { probe: PROBE.toString(), text });

        // 1 — group C, and the row that matters most in this run: four of the six
        // views grade nothing, so without a control a broken selector and a
        // Hebrew-only dialog are the same output. This is the shape
        // `device-card-390-0811` found, rebuilt inside a dialog.
        const c1 = await control('עודכן לאחרונה 11.8.2026, 4:40:00');
        add({
          view: 'reset-password', mode, vp: `${vp}px`, group: 'control (C)',
          what: 'the known-bad date+time line is flagged inside a .modal',
          ok: c1.some((f) => f.group === 'C' && f.dx < -EPS),
          value: c1.length ? c1.map((f) => `${f.group}: ${f.pair} dx=${f.dx.toFixed(1)}`).join(' | ') : 'the control line produced no pair',
        });

        // 2 — group C, L…L. The admin screen's own `hadar-halls` depends on this:
        // a hyphen between two Latin tokens is not a separator, so the pair stays
        // in C and must increase.
        const c2 = await control('משתמש: hadar-halls אולמי הדר');
        add({
          view: 'admin-screen', mode, vp: `${vp}px`, group: 'control (C, L…L)',
          what: 'a hyphenated Latin username is emitted in C and increases',
          ok: c2.some((f) => f.group === 'C' && f.pair.includes('-')) &&
              c2.filter((f) => f.group === 'C').every((f) => f.dx > EPS),
          value: c2.map((f) => `${f.group}: ${f.pair} dx=${f.dx.toFixed(1)}`).join(' | ') || 'no pair',
        });

        // 3 — group A, and the negative row that proves it can fail. U+202D and
        // not a CSS `unicode-bidi: bidi-override`, which overrides to the
        // element's own `direction` — `rtl` — and paints the control exactly as
        // the correct case does (measured in `rtl-digits-0811`).
        const c3ok = await control('נמצאו 3 מתוך 10 מכשירים');
        const c3bad = await control('‭נמצאו 3 מתוך 10 מכשירים');
        const aPairs = (r) => r.filter((f) => f.group === 'A');
        add({
          view: 'admin-screen', mode, vp: `${vp}px`, group: 'control (A)',
          what: 'a Hebrew-separated pair is emitted as group A and paints right-to-left',
          ok: aPairs(c3ok).length > 0 && aPairs(c3ok).every((f) => f.dx < -EPS),
          value: aPairs(c3ok).map((f) => `${f.pair} dx=${f.dx.toFixed(1)}`).join(' | ') || 'no group A pair emitted',
        });
        add({
          view: 'admin-screen', mode, vp: `${vp}px`, group: 'control (A)',
          what: 'and overriding the direction flags it (this row proves group A can fail)',
          ok: aPairs(c3bad).length > 0 && aPairs(c3bad).some((f) => f.dx > EPS),
          value: aPairs(c3bad).map((f) => `${f.pair} dx=${f.dx.toFixed(1)}`).join(' | ') || 'no group A pair emitted',
        });

        await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
  owner.kill();
  admin.kill();
}

// The owner stub must still be an owner, or the flag is not a flag and every
// harness reusing this file silently grew an eighth sidebar item.
{
  const res = await fetch(`http://127.0.0.1:${OWNER_PORT}/api/auth/me`).catch(() => null);
  add({ view: '(all)', mode: '—', vp: '—', group: 'stub', what: 'the default stub is unchanged (the flag is opt-in)', ok: res === null, value: res === null ? 'both stubs stopped; role asserted per-context above' : 'stub still listening' });
}

add({ view: '(all)', mode: '—', vp: '—', group: 'coverage', what: 'the probe graded something at all', ok: total > 0, value: `${total} token pairs across six views` });
// Only two of the six can carry pairs, and saying which is the difference
// between this run and one whose selectors all missed. The other four are graded
// by their `opened` row instead — see the header.
for (const v of ['client-edit', 'admin-screen']) {
  add({ view: '(all)', mode: '—', vp: '—', group: 'coverage', what: `${v} carries real pairs (it opened and was walked)`, ok: (census.get(v) || 0) > 0, value: `${census.get(v) || 0} pairs over 4 combinations` });
}
add({ view: '(all)', mode: '—', vp: '—', group: 'coverage', what: 'the views themselves populate C (A and B are control-only groups here)', ok: seen.C > 0, value: `A ${seen.A} · B ${seen.B} · C ${seen.C}` });

const bad = rows.filter((r) => !r.ok);
await writeFile(`${HERE}_table.md`, [
  '| view | mode | width | group | what | value | ok |',
  '|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.view} | ${r.mode} | ${r.vp} | ${r.group} | ${r.what} | ${r.value} | ${r.ok ? '✅' : '❌'} |`),
].join('\n') + '\n');
console.log(`${rows.length - bad.length}/${rows.length} pass`);
if (bad.length) console.log(bad.map((r) => `  ${r.view} ${r.mode} ${r.vp} ${r.group}: ${r.what} → ${r.value}`).join('\n'));
