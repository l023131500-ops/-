/**
 * Does the property report ever show a number it does not have?
 *
 * The house rule for this system, written in its own CLAUDE.md and repeated in
 * every plan file, is one sentence: no invented data — a source that did not
 * load says "לא זמין". Everything else is negotiable; this is not.
 *
 * Auditing the fixes list against the code showed all thirteen data layers are
 * built: valuation, comparable deals, building age, interactive map, permits,
 * neighbourhood, planning sites, urban renewal, tax area, violations,
 * licensing, blueprints. So the useful question stopped being "is it built"
 * and became "does it tell the truth when a source is missing".
 *
 * That failure is invisible from the outside and always has been here. The
 * project's own notes record three sources that returned HTTP 200 with HTML,
 * so `res.ok` passed and the break only surfaced at parse time. The same shape
 * on the page is a field that renders empty, or "undefined", or a confident 0 —
 * none of which look like an error to anyone reading the report.
 *
 * So this loads real reports for real addresses and reads what a customer would
 * read, looking for the tells that a value is missing while pretending not to be.
 *
 *   node scripts/qa/report-integrity.mjs
 *   node scripts/qa/report-integrity.mjs "גוש 7091 חלקה 203"
 */
import { chromium } from 'playwright-core';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';

/**
 * Addresses chosen because the project already knows what they should do:
 * Dizengoff is the case its notes record as verified end to end, and the Hatzor
 * address is the one that used to resolve to the wrong block. The parcel query
 * is the path added for structured input.
 */
const QUERIES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['דיזנגוף 100 תל אביב', 'גוש 7091 חלקה 203'];

// Strings that mean "a value was supposed to be here". A report may legitimately
// contain the word "לא זמין" — that is the system working — but never these.
const LEAKS = ['undefined', 'NaN', '[object Object]', 'null,', ', null', 'Infinity'];

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? `  << ${d}` : '')); }
};

const browser = await chromium.launch({ executablePath: EXE, headless: true });
console.log('=== property report — does it admit what it does not know? ===');

for (const q of QUERIES) {
  console.log(`\n--- ${q}`);
  const page = await browser.newPage({ viewport: { width: 1280, height: 1200 }, locale: 'he-IL' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 100)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 100)); });

  try {
    await page.goto(`https://more30.com/nadlan/report?q=${encodeURIComponent(q)}`, {
      waitUntil: 'domcontentloaded', timeout: 120000,
    });

    // ⚠️ Wait for the page to stop growing, not for a fixed number of seconds.
    //
    // The first version slept 15s and then measured, and reported that the
    // report "renders only 575 characters" for both addresses — which reads
    // exactly like a broken product. It was not: the report fans out to a dozen
    // sources and was still filling in. A second look with a longer wait showed
    // a complete report. A fixed sleep does not measure a page, it measures the
    // network on the day, and it fails in the direction that invents alarming
    // findings about a system that is working.
    // Two stages, because stability alone is not enough either: the shell sits
    // at ~575 characters for several seconds while the sources are in flight,
    // and a stability check started too early mistakes that plateau for the
    // finished article — which is how the second version of this still reported
    // a broken report. So first wait for a report to exist at all, then wait
    // for it to stop changing.
    await page.waitForFunction(() => document.body.innerText.length > 1200, { timeout: 90000 });

    let last = -1, stable = 0;
    for (let i = 0; i < 40 && stable < 3; i++) {
      await page.waitForTimeout(1500);
      const n = await page.evaluate(() => document.body.innerText.length);
      stable = n === last ? stable + 1 : 0;
      last = n;
    }

    const seen = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        length: text.length,
        notAvailable: (text.match(/לא זמין/g) || []).length,
        text,
        // A label with nothing after it is the quiet version of a lie.
        emptyRows: [...document.querySelectorAll('dt')].filter((dt) => {
          const dd = dt.nextElementSibling;
          return dd && dd.tagName === 'DD' && !(dd.textContent || '').trim();
        }).length,
      };
    });

    ok(`${q}: report renders`, seen.length > 1200, `only ${seen.length} characters`);
    ok(`${q}: no console errors`, errors.length === 0, errors.slice(0, 2).join(' | '));

    const leaked = LEAKS.filter((s) => seen.text.includes(s));
    ok(`${q}: no raw placeholder values on the page`, leaked.length === 0, leaked.join(', '));

    ok(`${q}: no label left with an empty value`, seen.emptyRows === 0,
       `${seen.emptyRows} labels with nothing after them`);

    // "לא זמין" appearing is the system keeping its promise, not a failure. It
    // is reported rather than asserted, because the right count depends on which
    // sources answered today and pinning a number would make this test lie.
    console.log(`        "לא זמין" appears ${seen.notAvailable} time(s) — honest gaps, not failures`);
  } catch (e) {
    ok(`${q}: report loads`, false, String(e.message).slice(0, 120));
  }
  await page.close();
}

await browser.close();
console.log(`\n${pass} passed · ${fail} failed`);
console.log(
  '\nWhat this cannot see: whether a number that rendered is the *correct*\n' +
    'number. That needs a second source to compare against, and for several\n' +
    'layers — title deeds, quantified building rights, permits — no public one\n' +
    'exists, which the project already records.',
);
process.exit(fail ? 1 : 0);
