/**
 * §6 (core.issues #5) — the `search` ×2 that DESIGN_SAMENESS left "requires reading".
 *
 * `_icon-decisions.json` reports for mthbram:
 *
 *   "0 שיעורים · search ×2 — 16px \"הוספת שיעור למאגר\" + 40px \"לא נמצאו שיעורים מתאימים\""
 *
 * The doc's estimate was that neither is a removal candidate. Reading the page
 * confirms it, and turns up two things the sheet could not show:
 *
 *   1. The tool's label for the 16px slot is WRONG. It reads "הוספת שיעור למאגר",
 *      but that button draws `Plus` (LessonsDashboard.tsx:190). The 16px `search`
 *      is the search input's own glyph (:172); the tool walked to the nearest
 *      text node and crossed a control boundary to reach the button's label.
 *      The two are siblings in one flex row, so "the text beside it" picked the
 *      wrong one. That makes the glyph a field marker on an input, which is the
 *      one case the sheet's own header calls un-removable.
 *
 *   2. The band heading the tool recorded — "0 שיעורים" — is not a label. It is
 *      `${filtered.length} שיעורים` (:217). Production renders ZERO lessons, and
 *      the 40px `search` is that empty state (:226). The glyph is a symptom.
 *
 * What is asserted here — all measured, none assumed:
 *
 *   A. Production /mthbram renders the directory with a count of 0.
 *   B. There are THREE search glyphs on the page, not the two the tool paired.
 *      The third is a nav link that carries its own words ("חיפוש שיעור"); it
 *      sits in another band, which is why `repeatInBand` never saw it. Listing
 *      it here so the next round does not rediscover it as new.
 *   B2. The 16px search the tool DID pair marks the search input — aria-label
 *      "חיפוש שיעורים", a placeholder, and no visible text label. Un-removable.
 *   B3. Every "הוספת שיעור למאגר" control on the page draws `Plus` and no
 *      search glyph at all — the tool's label for that slot is wrong.
 *   C. The 40px search is the empty-state illustration, not a control.
 *   D. The anon REST count for `lessons` is 0, so the page's 0 is true. The
 *      empty directory is real data, not a failed fetch: `Public can view
 *      approved lessons` is a live policy (migration 20260712192546).
 *   E. The empty-state copy is the defect. With NO filter applied it says
 *      "לא נמצאו שיעורים מתאימים" — "no MATCHING lessons" — which tells a first
 *      visitor their search came up empty when nothing was searched for. The
 *      same repo already has the honest string: LessonDirectory.tsx:213 says
 *      "עדיין אין שיעורים במאגר" when the set is empty and keeps the
 *      "no results" wording for when a filter is on.
 *
 * Both sides are read in one run: production for the "before", and the API for
 * the count that explains it.
 *
 *   node scripts/qa/mthbram-empty-directory.mjs
 */
import { chromium } from 'playwright-core';
import { mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, extname, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const URL = 'https://more30.com/mthbram/';
const OUT = 'QA/platform/mthbram-empty-0810';
const ENV = 'apps/21-mthbram/.env';
const PORT = 8147;
const STAGE = join(tmpdir(), 'm30-mthbram-check');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

/**
 * dist is served under /mthbram/ (the base vite.config.ts compiles in) from a
 * temp copy — the absolute /mthbram/assets references cannot resolve at root.
 * The built page talks to the SAME production Supabase, so the empty dataset
 * driving the new string is the live one and not a fixture.
 */
const serveDist = async () => {
  await rm(STAGE, { recursive: true, force: true });
  await cp('apps/21-mthbram/dist', join(STAGE, 'mthbram'), { recursive: true });
  const server = createServer(async (req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    const file = resolve(STAGE, rel === '' ? 'index.html' : rel);
    if (file !== STAGE && !file.startsWith(STAGE + sep)) { res.writeHead(404); return res.end(); }
    const spa = () => readFile(join(STAGE, 'mthbram', 'index.html'));
    try {
      const body = extname(file) ? await readFile(file) : await spa();
      res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] || 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); }
  });
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  return server;
};

const read = (t, k) => {
  const line = t.split(/\r?\n/).find(l => l.startsWith(k + '='));
  return line ? line.slice(k.length + 1).trim().replace(/^"|"$/g, '') : null;
};

/** The count a visitor's browser gets, with the same key the bundle ships. */
async function anonCount() {
  const env = await readFile(ENV, 'utf8');
  const url = read(env, 'VITE_SUPABASE_URL');
  const key = read(env, 'VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!url || !key) return { ok: false, why: 'no env' };
  const hit = async q => {
    const r = await fetch(`${url}/rest/v1/lessons?${q}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' },
    });
    const range = r.headers.get('content-range');
    return { status: r.status, count: range ? Number(range.split('/')[1]) : null };
  };
  return {
    ok: true,
    all: await hit('select=id&limit=1'),
    approved: await hit('select=id&is_approved=eq.true&limit=1'),
  };
}

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const run = async () => {
  await mkdir(OUT, { recursive: true });
  const api = await anonCount();

  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const settle = async () => {
    // the dashboard flips out of "טוען..." only after the fetch settles
    await page.waitForFunction(
      () => !/טוען/.test(document.body.innerText) || performance.now() > 15000,
      null, { timeout: 20000 },
    ).catch(() => {});
    await page.waitForTimeout(1500);
  };
  const intoView = async () => page.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find(e => /שיעורים$/.test(e.textContent.trim()));
    h?.scrollIntoView({ block: 'center' });
  });

  await page.goto(`${URL}?cb=${process.pid}`, { waitUntil: 'networkidle', timeout: 60000 });
  await settle();
  await intoView();
  await page.screenshot({ path: `${OUT}/production-before.png` });

  const seen = await page.evaluate(() => {
    const norm = s => (s || '').replace(/\s+/g, ' ').trim();
    const glyph = el => [...el.classList].find(c => c.startsWith('lucide-') && c !== 'lucide') || null;

    const heading = [...document.querySelectorAll('h2')]
      .map(h => norm(h.innerText)).find(t => /שיעורים$/.test(t)) || null;

    const searches = [...document.querySelectorAll('svg')]
      .filter(s => glyph(s) === 'lucide-search')
      .map(s => {
        const r = s.getBoundingClientRect();
        // the nearest ancestor that is itself a control, if any
        const control = s.closest('input,button,a,[role="button"]');
        const field = s.closest('div')?.querySelector('input');
        return {
          size: Math.round(r.width),
          inControl: control ? control.tagName.toLowerCase() : null,
          controlText: control ? norm(control.innerText) : null,
          fieldAriaLabel: field ? field.getAttribute('aria-label') : null,
          fieldPlaceholder: field ? field.getAttribute('placeholder') : null,
          // what the tool would have picked: nearest text in the parent chain
          nearestText: norm(s.parentElement?.parentElement?.innerText).slice(0, 40),
        };
      });

    const plusOnAdd = [...document.querySelectorAll('button,a')]
      .filter(b => /הוספת שיעור למאגר/.test(norm(b.innerText)))
      .map(b => [...b.querySelectorAll('svg')].map(glyph));

    return {
      heading,
      searches,
      plusOnAdd,
      emptyText: /לא נמצאו שיעורים מתאימים/.test(document.body.innerText),
      honestText: /עדיין אין שיעורים במאגר/.test(document.body.innerText),
      lessonCards: document.querySelectorAll('[class*="grid"] > div').length,
      bodyHasLoading: /טוען/.test(document.body.innerText),
    };
  });

  // ---- the built artifact, same live (empty) dataset
  const server = await serveDist();
  await page.goto(`http://127.0.0.1:${PORT}/mthbram/`, { waitUntil: 'networkidle', timeout: 60000 });
  await settle();
  await intoView();
  await page.screenshot({ path: `${OUT}/built-after.png` });
  const built = await page.evaluate(() => {
    const norm = s => (s || '').replace(/\s+/g, ' ').trim();
    const heading = [...document.querySelectorAll('h2')]
      .map(h => norm(h.innerText)).find(t => /שיעורים$/.test(t)) || null;
    return {
      heading,
      honestText: /עדיין אין שיעורים במאגר/.test(document.body.innerText),
      matchingText: /לא נמצאו שיעורים מתאימים/.test(document.body.innerText),
      searchGlyphs: [...document.querySelectorAll('svg')]
        .filter(s => [...s.classList].includes('lucide-search')).length,
      bodyHasLoading: /טוען/.test(document.body.innerText),
    };
  });
  await browser.close();
  server.close();

  // ---- A: production renders a zero count
  check('A. directory heading reports 0', seen.heading === '0 שיעורים',
    `heading=${JSON.stringify(seen.heading)}`);
  check('A2. nothing is still loading', !seen.bodyHasLoading,
    seen.bodyHasLoading ? 'page still says טוען' : 'fetch settled');

  // ---- B/C: the glyphs, read rather than inferred
  const onField = seen.searches.find(s => s.fieldAriaLabel);
  const inLink = seen.searches.find(s => s.inControl === 'a');
  const s40 = seen.searches.find(s => s.size >= 32);
  check('B. three search glyphs — the tool paired two and never saw the nav one',
    seen.searches.length === 3,
    `found ${seen.searches.length}: ${seen.searches.map(s => `${s.size}px${s.inControl ? `/${s.inControl}` : ''}`).join(' + ')}`);
  check('B1. the third is a nav link carrying its own words',
    !!inLink && /חיפוש/.test(inLink.controlText || ''),
    inLink ? `link text=${JSON.stringify(inLink.controlText)}` : 'absent');
  check('B2. the paired 16px search marks an input with no visible text label',
    !!onField && !onField.inControl && !!onField.fieldPlaceholder,
    onField ? `aria-label=${JSON.stringify(onField.fieldAriaLabel)} placeholder present=${!!onField.fieldPlaceholder} inControl=${onField.inControl}` : 'absent');
  check('B3. every add-lesson control draws Plus and no search — slot 1 mislabelled',
    seen.plusOnAdd.length > 0 && seen.plusOnAdd.every(g => g.includes('lucide-plus') && !g.includes('lucide-search')),
    `add-lesson controls=${JSON.stringify(seen.plusOnAdd)}`);
  check('C. the 40px search is not inside any control', !!s40 && !s40.inControl,
    s40 ? `size=${s40.size}px inControl=${s40.inControl}` : 'absent');

  // ---- D: the zero is true
  check('D. anon REST count for lessons is 0',
    api.ok && api.all.status === 200 && api.all.count === 0,
    api.ok ? `all=${api.all.count} (HTTP ${api.all.status}) approved=${api.approved.count}` : api.why);

  // ---- E: the defect
  check('E. empty state says "no MATCHING lessons" with no filter applied',
    seen.emptyText === true, 'this is the finding, not a regression');
  check('E2. the honest string is absent from the live page',
    seen.honestText === false, 'LessonDirectory.tsx:213 already has it');

  // ---- F: the fix, in the built artifact, against the same empty dataset
  check('F. built page says "עדיין אין שיעורים במאגר"', built.honestText === true,
    `heading=${JSON.stringify(built.heading)}`);
  check('F2. the "no matching" wording is gone', built.matchingText === false,
    'it returns only when a filter is on and the store is not empty');
  check('F3. the count did not move — copy changed, data did not',
    built.heading === seen.heading, `${seen.heading} → ${built.heading}`);
  check('F4. the glyphs did not move — this fix removes no icon',
    built.searchGlyphs === seen.searches.length,
    `${seen.searches.length} → ${built.searchGlyphs}`);
  check('F5. the built page is not stuck loading', built.bodyHasLoading === false);

  const passed = results.filter(r => r.pass).length;
  console.log(`\n${passed}/${results.length}`);
  await writeFile(`${OUT}/_results.json`,
    JSON.stringify({ url: URL, api, seen, built, results, passed, total: results.length }, null, 2));
};

run().catch(e => { console.error(e); process.exit(1); });
