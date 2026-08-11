// `:visited` — the one thing `link-underline-0811` left open rather than closed,
// and the last open item under STATUS.md's item 6. 2026-08-11.
//
// Every kiosk contrast run so far read colours with `getComputedStyle`, which
// returns the UNVISITED style no matter what is on the screen — that is a privacy
// guarantee, not a bug, and it is why nine screen-by-screen runs could grade
// every link in the console without any of them measuring what a person who has
// already clicked one actually sees. STATUS.md recorded a *reading* in place of a
// number: `a { color: var(--link-ink) }` is an author rule and the UA's `:visited`
// purple cannot beat it. This run replaces that reading with pixels.
//
// The method is not "sample the glyph and name the colour". Antialiasing, the 📄
// in the guide link and the emoji in the sidebar all make a single extremal pixel
// a shaky thing to assert on. What is compared instead is the **rendered PNG of
// the link element**, byte for byte, in three states:
//
//   U — sampled on a FRESH profile, before the href has ever been opened.
//   V — sampled after genuinely following that same link and coming back.
//   M — sampled again with `a:visited { color: #ff00ff }` injected.
//
// `V === U` is the finding: the visited state changes nothing on screen.
// `M !== V` is the control, and it is the part that makes the finding mean
// anything — it proves the link really is in the visited state at the moment U
// and V were compared. Without it, `V === U` is equally consistent with "nothing
// was ever recorded in history", which is exactly what `_probe.mjs` in this
// directory found to be the case in every headless configuration.
//
// So this harness runs **headed**, on a real profile directory, which is the only
// configuration of the five in `_probe.mjs` where Chromium paints `:visited` at
// all. That is itself a finding worth the run: a headless a11y suite cannot see
// this property, and any future check of it has to be written this way.
//
// Stub is `../warn-ink-0811/stub-server.mjs`, reused not copied — the real
// `server/public/`, canned API only.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const STUB = fileURLToPath(new URL('../warn-ink-0811/stub-server.mjs', import.meta.url));
const PROFILE = fileURLToPath(new URL('./_profile', import.meta.url));
const PORT = 8821;
const BASE = `http://127.0.0.1:${PORT}`;

const rows = [];
const fail = (m) => { console.error('❌ ' + m); process.exitCode = 1; };
const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 12);

// The extremal pixel, reported beside every hash and asserted on nothing. It is
// the pixel furthest from the most common colour in the element's box — the core
// of a glyph stem, in a box that is mostly the surface behind it. Useful to read;
// too fragile to grade, which is the whole reason the grade is on the hash.
const inkOf = (page, png) => page.evaluate(async (url) => {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const tally = new Map();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] !== 255) throw new Error('non-opaque pixel in screenshot');
    const k = `${d[i]},${d[i + 1]},${d[i + 2]}`;
    tally.set(k, (tally.get(k) || 0) + 1);
  }
  let bg = null, best = -1;
  for (const [k, n] of tally) if (n > best) { best = n; bg = k.split(',').map(Number); }
  let ink = bg, far = -1;
  for (const k of tally.keys()) {
    const q = k.split(',').map(Number);
    const dist = (q[0] - bg[0]) ** 2 + (q[1] - bg[1]) ** 2 + (q[2] - bg[2]) ** 2;
    if (dist > far) { far = dist; ink = q; }
  }
  return `rgb(${ink.join(', ')})`;
}, 'data:image/png;base64,' + png.toString('base64'));

// When two hashes disagree, a hash says only that. This says what moved: how many
// pixels differ and which colour became which, most common first. Added after the
// first full run came back with all three dark rows mismatched — a bare hash
// mismatch there is equally consistent with "`:visited` repainted the link" and
// with "the two screenshots are not of the same thing", and those are opposite
// findings.
const diff = (page, a, b) => page.evaluate(async ([ua, ub]) => {
  const load = async (u) => {
    const img = new Image();
    img.src = u;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    return { d: g.getImageData(0, 0, c.width, c.height).data, w: img.width, h: img.height };
  };
  const A = await load(ua), B = await load(ub);
  if (A.w !== B.w || A.h !== B.h) return `מידות שונות: ${A.w}×${A.h} מול ${B.w}×${B.h}`;
  const moves = new Map();
  let n = 0;
  for (let i = 0; i < A.d.length; i += 4) {
    if (A.d[i] === B.d[i] && A.d[i + 1] === B.d[i + 1] && A.d[i + 2] === B.d[i + 2]) continue;
    n++;
    const k = `${A.d[i]},${A.d[i + 1]},${A.d[i + 2]} → ${B.d[i]},${B.d[i + 1]},${B.d[i + 2]}`;
    moves.set(k, (moves.get(k) || 0) + 1);
  }
  const top = [...moves].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, c]) => `${k} (${c})`);
  return `${n}/${A.w * A.h} פיקסלים; ${top.join(' · ')}`;
}, [`data:image/png;base64,${a.toString('base64')}`, `data:image/png;base64,${b.toString('base64')}`]);

// Screenshot the element itself rather than a clip of the page: a clip is in page
// coordinates and the enrol screen scrolls, so the same link would be a different
// crop between U and V and every comparison would fail for the wrong reason.
const shot = async (page, sel) => {
  const el = page.locator(sel);
  await el.scrollIntoViewIfNeeded();
  // `document.fonts.ready` before the shot, and a warm-up load before the U pass
  // below, because the two samples are taken minutes and several navigations
  // apart: the U sample would otherwise be the only one taken on a cold profile
  // with an empty font cache, and a link rendered in the fallback face has a
  // different hash for a reason that has nothing to do with `:visited`. The first
  // full run failed all three dark rows exactly this way.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(120); // `.15s` transitions live on `.btn` here
  const png = await el.screenshot({ animations: 'disabled' });
  return { png, hash: sha(png), ink: await inkOf(page, png) };
};

// The three in-text links, which are all of them — `link-underline-0811` settled
// that. Each one is `open()`ed onto its screen, and `visit()` is the act that puts
// its href into history: a real click, from this page, because Chromium keys a
// visited entry by the page the link was followed from.
const LINKS = [
  {
    key: 'guide',
    what: 'הקישור למדריך המשתמש',
    screen: 'הוראות הפעלה',
    sel: '#content .card p > a',
    // Its label opens with 📄, so the extremal pixel in this box is the emoji and
    // not the ink — black in light, white in dark. Reported as measured rather
    // than filtered; it is the clearest illustration of why the grade in this run
    // is on the hash of the whole element and not on one pixel.
    inkNote: 'הפיקסל הקיצוני כאן הוא ה-📄, לא הדיו',
    open: async (page) => {
      await page.locator('.side nav [data-view=guide]').click();
      await page.waitForSelector('#gd-list .device-row, #gd-list p');
    },
    blank: true,
  },
  {
    key: 'install',
    what: 'קישור ההתקנה בתוך .alert-ok',
    screen: 'הוספת מכשיר',
    sel: '#e-result a',
    open: async (page) => {
      await page.locator('.side nav [data-view=enroll]').click();
      await page.waitForSelector('#e-create');
      await page.fill('#e-url', 'https://hadar.example.com/event/12');
      await page.locator('#e-create').click();
      await page.waitForSelector('#e-result .alert-ok');
    },
    blank: true,
  },
  {
    key: 'login',
    what: 'הקישור "חזרה לאתר"',
    screen: 'מסך הכניסה',
    sel: '#login-view .auth-card p.hint > a',
    open: async (page) => {
      await page.locator('.side nav [data-view=devices]').click();
      await page.waitForSelector('.device');
      await page.evaluate(() => document.querySelector('#login-view').classList.remove('hidden'));
    },
    blank: false,
  },
];

const MAGENTA = 'a:visited { color: #ff00ff !important; }';

const server = spawn(process.execPath, [STUB, String(PORT)], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 700));

let n = 0;
const name = () => `${HERE}${++n < 10 ? '0' : ''}${n}`;

try {
  for (const mode of ['light', 'dark']) {
    // A fresh profile per mode, and the reason is the whole design: the U
    // sample has to be taken by a browser that has never opened these hrefs.
    await rm(PROFILE, { recursive: true, force: true });
    const ctx = await chromium.launchPersistentContext(PROFILE, {
      headless: false,
      colorScheme: mode,
      viewport: { width: 1280, height: 1000 },
    });
    await ctx.addInitScript(() => localStorage.setItem('kf_token', 'qa-token'));
    // The install link points at the real product host, which is not reachable
    // from here and is not the point — what has to be real is that a navigation
    // to that exact href commits and is recorded. Fulfilled, not blocked: an
    // aborted navigation records nothing.
    await ctx.route('https://kiosk.more30.com/**', (route) => route.fulfill({
      status: 200, contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><meta charset=utf-8><title>install</title><h1>install</h1>',
    }));
    const page = ctx.pages()[0] || await ctx.newPage();

    const goConsole = async () => {
      await page.goto(BASE + '/console');
      await page.waitForSelector('.device');
    };

    // ── U: never opened ───────────────────────────────────────────
    // Loaded twice on purpose — see `shot()`. The second load is the one the U
    // sample is taken from, so U and V are both non-first paints.
    await goConsole();
    await goConsole();
    const before = {};
    for (const L of LINKS) {
      await L.open(page);
      before[L.key] = await shot(page, L.sel);
    }

    // ── the visits ────────────────────────────────────────────────
    for (const L of LINKS) {
      await goConsole();
      await L.open(page);
      const href = await page.locator(L.sel).getAttribute('href');
      if (L.blank) {
        const [popup] = await Promise.all([ctx.waitForEvent('page'), page.locator(L.sel).click()]);
        await popup.waitForLoadState('domcontentloaded').catch(() => {});
        await popup.close();
      } else {
        await page.locator(L.sel).click();
        await page.waitForLoadState('domcontentloaded');
      }
      console.log(`[${mode}] ${L.key} · נפתח: ${href}`);
      // The History write is asynchronous and the visited-link table is fed from
      // it — a read in the same tick can hit a store that has not been told yet.
      await page.waitForTimeout(900);
    }

    // ── V and M ───────────────────────────────────────────────────
    await goConsole();
    for (const L of LINKS) {
      await L.open(page);
      const v = await shot(page, L.sel);
      rows.push({
        mode, screen: L.screen, what: L.what, kind: 'הפריט עצמו',
        a: before[L.key].hash, b: v.hash, ink: v.ink,
        want: 'זהה', ok: v.hash === before[L.key].hash,
        note: ['לפני ביקור מול אחרי ביקור', L.inkNote].filter(Boolean).join(' · '),
      });
      if (v.hash !== before[L.key].hash) {
        fail(`${L.key} (${mode}): הצבע השתנה אחרי ביקור — ${await diff(page, before[L.key].png, v.png)}`);
      }

      const handle = await page.evaluate((css) => {
        const s = document.createElement('style');
        s.id = 'qa-visited-control';
        s.textContent = css;
        document.head.appendChild(s);
      }, MAGENTA);
      void handle;
      const m = await shot(page, L.sel);
      rows.push({
        mode, screen: L.screen, what: `${L.what} — **בקרה** (‎a:visited{color:#ff00ff}‎)`,
        kind: 'בקרת שפיות', a: v.hash, b: m.hash, ink: m.ink,
        want: 'שונה', ok: m.hash !== v.hash,
        note: 'מוכיחה שהקישור אכן במצב visited',
      });
      if (m.hash === v.hash) fail(`${L.key} (${mode}): הבקרה לא זזה — הקישור אינו במצב visited, והשורה שמעליה אינה מדידה`);
      await page.evaluate(() => document.querySelector('#qa-visited-control')?.remove());

      // Also worth having on the record: what `getComputedStyle` says while the
      // control is proving the paint is magenta. This is the lie, in-run.
      const computed = await page.evaluate((s) => getComputedStyle(document.querySelector(s)).color, L.sel);
      console.log(`[${mode}] ${L.key} · getComputedStyle בזמן שהבקרה צובעת: ${computed}`);

      await page.locator(L.sel).screenshot({ path: `${name()}-${L.key}-${mode}.png` });
    }

    await ctx.close();
  }
} finally {
  server.kill();
  await rm(PROFILE, { recursive: true, force: true });
}

console.log('\n| מצב | מסך | מה נמדד | סוג | ‎hash‎ א׳ | ‎hash‎ ב׳ | נדרש | הצבע שנצבע | הערה | |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.mode} | ${r.screen} | ${r.what} | ${r.kind} | \`${r.a}\` | \`${r.b}\` | ${r.want} | \`${r.ink}\` | ${r.note} | ${r.ok ? '✅' : '❌'} |`);
}
const ctrl = rows.filter((r) => r.kind === 'בקרת שפיות');
console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} עוברים. ${ctrl.length} שורות בקרה: ${ctrl.filter((r) => r.ok).length} זיהו את מצב ה-visited.`);
if (ctrl.some((r) => !r.ok)) fail('בקרה שלא זזה — הבדיקה אינה מסוגלת להבחין במצב visited, ולכן אינה מסוגלת ליפול.');
