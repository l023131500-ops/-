// The two console tables that never got the scroll wrapper. 2026-08-11.
//
// `clients-console-0811` found a table dragging the whole console sideways at
// 390px and wrapped `loadClients()`'s in `overflow-x:auto`.
// `dialogs-rtl-admin-0811` found the same shape on `loadUsers()`, on a screen no
// harness had ever rendered, and wrapped that one too. Both were found by
// walking onto the screen for another reason — neither run asked the obvious
// follow-up, which is a grep and not a rendering: **`js/app.js` builds four
// tables and only two of them are wrapped.**
//
// The unwrapped two are `loadEnrollments()`'s `#e-list` (הוספת מכשיר) and
// `loadLinks()`'s `#l-list` (ספריית קישורים). Neither has ever been rendered at
// a phone width by anything — `console-mobile-nav-0811` drove the sidebar,
// `device-card-390-0811` drove the device grid, and the RTL sweeps opened these
// screens at 390px but graded painted order, which is blind to a box that
// overflows its parent.
//
// What is asserted is `clients-console-0811`'s criterion, not a looser one:
// **`main` must not overflow** (WCAG 1.4.10 — at 320 CSS px content must not
// require scrolling in two dimensions). One table scrolling inside its own box
// is the accepted shape. Two gradings that runs before this one recorded as
// wrong are deliberately not used: "the last button is inside the viewport"
// fails *with* the fix, because a scroll container starts at the RTL origin;
// and `documentElement.scrollWidth` reads as "nothing to scroll" even in the
// broken state, because `main.main` is `overflow: auto` and absorbs the drag.
//
// The negative control removes the wrapper **from the DOM** rather than setting
// `overflow-x: visible` on it — `dialogs-rtl-admin-0811` recorded that the
// latter computes back to `auto` beside an `overflow-y` that is `auto`, so it
// rebuilds the fixed state while claiming to rebuild the shipped one and passes
// for the wrong reason. Children are moved, not re-created, so the `onclick`
// bindings `loadEnrollments()`/`loadLinks()` attached survive the control.
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PORT = 8873;

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };
const add = (r) => { rows.push(r); if (!r.ok) fail(`${r.screen} ${r.mode}/${r.vp}: ${r.group} — ${r.what} (${r.value})`); };

// The two screens under test, plus the two already-wrapped tables as positive
// controls: if the harness cannot see a defect on the unwrapped pair it must at
// least be shown passing on the pair that carries the fix, or a green run means
// nothing.
const SCREENS = [
  { key: 'enroll',  view: 'enroll',  box: '#e-list', ready: '#e-list table', title: 'הוספת מכשיר' },
  { key: 'links',   view: 'links',   box: '#l-list', ready: '#l-list table', title: 'ספריית קישורים' },
  { key: 'clients', view: 'clients', box: '#c-list', ready: '#c-list table', title: 'מזהי לקוח (נקבע ב-clients-console-0811)' },
];

// Read inside the page: the box the table is rendered into, the table itself,
// and `main`. `scrollWidth` on `main` is the graded number; the rest is what
// makes a failure readable without opening the screenshot.
const MEASURE = (boxSel) => {
  const main = document.querySelector('main.main');
  const box = document.querySelector(boxSel);
  const table = box && box.querySelector('table');
  const wrap = table && table.parentElement !== box ? table.parentElement : null;
  return {
    mainScroll: main.scrollWidth, mainClient: main.clientWidth, mainScrollLeft: main.scrollLeft,
    boxClient: box ? box.clientWidth : -1,
    tableScroll: table ? table.scrollWidth : -1,
    wrapped: !!wrap && getComputedStyle(wrap).overflowX === 'auto',
    docScroll: document.documentElement.scrollWidth,
  };
};

// Move the table out of its wrapper and drop the wrapper. Returns false when
// there was no wrapper to remove, so the control cannot silently grade nothing.
const UNWRAP = (boxSel) => {
  const box = document.querySelector(boxSel);
  const table = box && box.querySelector('table');
  if (!table || table.parentElement === box) return false;
  const wrap = table.parentElement;
  box.insertBefore(table, wrap);
  wrap.remove();
  return true;
};

const start = (port) => new Promise((resolve) => {
  const s = spawn(process.execPath, [STUB, String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
  s.stderr.on('data', (d) => process.stderr.write('[stub] ' + d));
  s.stdout.once('data', () => resolve(s));
});
const stub = await start(PORT);

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
      await page.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));   // `if (TOKEN) boot()`
      await page.goto(`http://127.0.0.1:${PORT}/console`);
      await page.waitForSelector('.device .actions .btn', { timeout: 15000 });

      for (const s of SCREENS) {
        // Below 800px `.side` is display:none and the navigation is behind the
        // toggle `console-mobile-nav-0811` added, so the sidebar cannot be
        // clicked at 390px. `route()` is the same entry point the button calls.
        await page.evaluate((v) => route(v, true), s.view);
        const opened = await page.waitForSelector(s.ready, { timeout: 15000 }).then(() => true).catch(() => false);
        add({ screen: s.key, mode, vp: `${vp}px`, group: 'opened', what: `${s.title} — the table is on screen (${s.ready})`, ok: opened, value: opened ? 'yes' : 'the selector never appeared' });
        if (!opened) continue;
        await page.waitForTimeout(200);

        const m = await page.evaluate(MEASURE, s.box);
        const detail = `main ${m.mainScroll}px in ${m.mainClient}px · table ${m.tableScroll}px in box ${m.boxClient}px · wrapped=${m.wrapped}`;

        add({
          screen: s.key, mode, vp: `${vp}px`, group: 'reflow',
          what: 'main does not overflow (WCAG 1.4.10 — no second scroll axis on the page)',
          ok: m.mainScroll <= m.mainClient + 1, value: detail,
        });

        // Recorded rather than graded: a table wider than its box is fine, that
        // is what the wrapper is for. It is the number that says whether the
        // screen is even a test of anything at this width.
        add({
          screen: s.key, mode, vp: `${vp}px`, group: 'census',
          what: 'is the table wider than the box it renders into',
          ok: true, value: m.tableScroll > m.boxClient + 1 ? `yes, by ${m.tableScroll - m.boxClient}px` : 'no — fits',
        });

        // The wrong grading, kept as a row so nobody re-derives it: in the
        // shipped state the page reports nothing to scroll while `main` holds
        // the overflow. It is informational in both directions.
        add({
          screen: s.key, mode, vp: `${vp}px`, group: 'method',
          what: 'documentElement.scrollWidth is the wrong read (main.main absorbs the drag)',
          ok: true, value: `doc ${m.docScroll}px vs window ${vp}px`,
        });

        if (vp === 390) {
          await page.screenshot({ path: `${HERE}${String(++shot).padStart(2, '0')}-${s.key}-390-${mode}.png`, fullPage: true });
        }

        // ── negative control ────────────────────────────────────────────────
        // Only where the table is actually wider than its box: below that width
        // removing the wrapper changes nothing and a control that cannot fail
        // is not a control.
        if (vp === 390 && m.tableScroll > m.boxClient + 1) {
          const removed = await page.evaluate(UNWRAP, s.box);
          add({ screen: s.key, mode, vp: '390px', group: 'control', what: 'the wrapper was found and removed from the DOM (not overflow-x:visible, which computes back to auto)', ok: removed, value: removed ? 'removed' : 'there was no wrapper' });
          if (removed) {
            await page.waitForTimeout(120);
            const c = await page.evaluate(MEASURE, s.box);
            add({
              screen: s.key, mode, vp: '390px', group: 'control',
              what: 'without the wrapper main DOES overflow — the check would have caught it',
              ok: c.mainScroll > c.mainClient + 1,
              value: `main ${c.mainScroll}px in ${c.mainClient}px`,
            });
          }
          // Re-render rather than trusting the mutated DOM for the next screen.
          await page.evaluate((v) => route(v, true), 'devices');
          await page.waitForSelector('.device .actions .btn', { timeout: 15000 });
        }
      }

      await ctx.close();
    }
  }
} finally {
  await browser.close();
  stub.kill();
}

const bad = rows.filter((r) => !r.ok);
const head = `# narrow-tables-0811 — the two console tables that never got the scroll wrapper\n\n` +
  `${rows.length - bad.length}/${rows.length} rows.\n\n` +
  `| screen | mode | vp | group | what | value | ok |\n|---|---|---|---|---|---|---|\n`;
await writeFile(HERE + '_table.md', head + rows.map((r) =>
  `| ${r.screen} | ${r.mode} | ${r.vp} | ${r.group} | ${r.what} | ${r.value} | ${r.ok ? '✅' : '❌'} |`).join('\n') + '\n');

console.log(`${rows.length - bad.length}/${rows.length} rows`);
for (const r of bad) console.log(`  ❌ ${r.screen} ${r.mode}/${r.vp} ${r.group}: ${r.what} — ${r.value}`);
