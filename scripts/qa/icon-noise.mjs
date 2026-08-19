/**
 * Which icons on a page are decoration, and which are data?
 *
 * QA/platform/DESIGN_SAMENESS.md ends with an instruction and not a fix:
 * galil led the §6 work order on raw icon count (104 SVGs) and then turned out
 * to be the wrong place to start, because 70 of those 104 live inside one
 * synagogue directory — MapPin for the address, Clock for the hours, Phone for
 * the number, repeated once per record. In the source each of those appears
 * **once**. The multiplicity is the number of rows, not the number of design
 * decisions, and removing them would have deleted information from a directory
 * rather than noise from a template.
 *
 * So raw count cannot pick the next system. This measures the distinction the
 * work order actually asks for:
 *
 *   per-record   an icon whose exact ancestor chain repeats 3+ times on the
 *                page — a list rendering a row per record
 *   authored     everything else: an icon someone placed by hand, once
 *
 * "Authored" is the number that maps to work: it is roughly how many icon
 * decisions a person would have to look at. A page with 80 per-record icons
 * and 6 authored ones is a directory. A page with 30 authored ones is a
 * template wearing a sticker on every heading.
 *
 * Three repeats, not two: a two-column layout legitimately mirrors a pair of
 * cards, and calling that "a record set" would hide real decoration.
 *
 *   node scripts/qa/icon-noise.mjs                 # the 9 full-kit systems
 *   node scripts/qa/icon-noise.mjs /galil /orech   # named routes
 *   node scripts/qa/icon-noise.mjs /zchuyot --detail   # list every authored icon
 *
 * --detail is what you run before editing a file: a count tells you which
 * system to open, but only the glyph plus the text beside it tells you whether
 * an icon is carrying meaning or sitting on a heading as jewellery.
 *
 * galil and orech are the controls and are worth keeping in a run: galil is
 * the directory that raw count got wrong, orech is a system DESIGN_SAMENESS
 * lists as already having its own identity (0/4 kit, zero lucide icons). If a
 * metric calls either of those noisy, the metric is wrong — that check is the
 * whole reason this file exists.
 */
import { chromium } from 'playwright-core';
import { settle } from './lib/settle.mjs';
import { writeRecord } from './lib/records.mjs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';

/** The 9 systems DESIGN_SAMENESS.md measured at 4/4 on the shared kit, plus controls. */
const ROUTES = {
  imud: '/imud', smel: '/smel', egod: '/egod', chatzor: '/chatzor/',
  chizukim: '/chizukim/', zchuyot: '/zchuyot', mthbram: '/mthbram',
  galil: '/galil', gesher: '/gesher',
  orech: '/orech',
};

const argv = process.argv.slice(2);
const DETAIL = argv.includes('--detail');
const only = argv.filter((a) => !a.startsWith('--'))
  .map((s) => s.replace(/^\//, '').replace(/\/$/, ''));
const targets = Object.entries(ROUTES).filter(([k]) => !only.length || only.includes(k));

/**
 * A filtered run updates the file, it does not replace it — the trap that cost
 * design-fingerprint.mjs 408 lines of _design.json and is documented there.
 * The merge now lives in lib/records.mjs, because the same guard was written
 * out by hand here and in system-facts.mjs while placeholder-leak.mjs and
 * dead-controls.mjs never got it and were still destroying their records.
 */
const OUT = 'QA/platform/_icon-noise.json';
const out = {};

const browser = await chromium.launch({ executablePath: EXE, headless: true });

for (const [key, route] of targets) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' });
  try {
    await page.goto('https://more30.com' + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await settle(page, { minChars: 200 });

    out[key] = await page.evaluate(() => {
      const svgs = [...document.querySelectorAll('svg')];

      /** The chain that identifies "the same slot in the same kind of box". */
      const chain = (el) => {
        const parts = [];
        let node = el;
        for (let i = 0; i < 5 && node && node !== document.body; i++) {
          const cls = String(node.getAttribute?.('class') ?? '')
            .split(/\s+/)
            .filter((c) => c && !/^lucide-/.test(c))   // glyph name is not structure
            .sort()
            .join('.');
          parts.push(node.tagName.toLowerCase() + (cls ? '.' + cls : ''));
          node = node.parentElement;
        }
        return parts.join('>');
      };

      /** lucide puts the glyph in the class: `lucide lucide-map-pin`. */
      const glyph = (el) => {
        const m = String(el.getAttribute('class') ?? '').match(/lucide-([a-z0-9-]+)/);
        return m ? m[1] : null;
      };

      const counts = new Map();
      for (const s of svgs) counts.set(chain(s), (counts.get(chain(s)) ?? 0) + 1);

      const authored = svgs.filter((s) => counts.get(chain(s)) < 3);
      const perRecord = svgs.length - authored.length;

      // Where the authored ones sit, so the next person can find them without
      // opening every file: the section heading above each icon.
      const where = {};
      for (const s of authored) {
        const sec = s.closest('section,header,footer,main,nav,article') ?? document.body;
        const label =
          (sec.querySelector('h1,h2,h3')?.innerText ?? sec.tagName.toLowerCase())
            .trim().slice(0, 40);
        where[label] = (where[label] ?? 0) + 1;
      }

      return {
        icons: svgs.length,
        perRecord,
        authored: authored.length,
        authoredGlyphs: new Set(authored.map(glyph).filter(Boolean)).size,
        // The kit markers DESIGN_SAMENESS counts, kept here so one run answers
        // "how much work is this" without cross-referencing two files.
        backdropBlur: [...document.querySelectorAll('*')]
          .filter((e) => String(e.className).includes('backdrop-blur')).length,
        surfaceRadii: [...new Set(
          [...document.querySelectorAll('div,section,article,a,button')]
            .map((e) => getComputedStyle(e).borderTopLeftRadius)
            .filter((r) => parseFloat(r) >= 6),
        )].length,
        authoredBySection: Object.fromEntries(
          Object.entries(where).sort((a, b) => b[1] - a[1]).slice(0, 6),
        ),
        chars: document.body.innerText.length,

        // Each authored icon with the words next to it. An icon whose
        // neighbouring text already says the same thing is jewellery; an icon
        // that is the only thing in its control is carrying the meaning.
        authoredList: authored.map((s) => {
          const host = s.parentElement?.closest('a,button,h1,h2,h3,h4,li,div') ?? s.parentElement;
          const text = (host?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 50);
          return {
            glyph: glyph(s) ?? 'inline-svg',
            near: text,
            alone: text.length === 0,
            size: Math.round(s.getBoundingClientRect().width),
          };
        }),
      };
    });
  } catch (e) {
    out[key] = { error: String(e.message).slice(0, 120) };
  }
  await page.close();

  const f = out[key];
  console.log(
    key.padEnd(10) +
      (f.error
        ? 'ERROR ' + f.error
        : `icons=${String(f.icons).padStart(3)}  per-record=${String(f.perRecord).padStart(3)}` +
          `  authored=${String(f.authored).padStart(3)}  glyphs=${String(f.authoredGlyphs).padStart(2)}` +
          `  blur=${String(f.backdropBlur).padStart(2)}  radii=${String(f.surfaceRadii).padStart(2)}` +
          `  chars=${f.chars}`),
  );
}

await browser.close();

if (DETAIL) {
  for (const [k, f] of Object.entries(out)) {
    if (f.error || !f.authoredList) continue;
    console.log(`\n=== ${k}: every authored icon ===`);
    for (const a of f.authoredList) {
      console.log(
        `  ${String(a.size).padStart(2)}px ${a.glyph.padEnd(18)}` +
          (a.alone ? '(no text beside it)' : a.near),
      );
    }
  }
}

console.log('\n=== authored icon decisions, most first ===');
for (const [k, f] of Object.entries(out).filter(([, f]) => !f.error)
  .sort((a, b) => b[1].authored - a[1].authored)) {
  const secs = Object.entries(f.authoredBySection)
    .map(([s, n]) => `${s}=${n}`).join(' · ');
  console.log(`  ${String(f.authored).padStart(3)}  ${k.padEnd(9)} ${secs}`);
}

// The table above now lists what this run measured rather than the whole
// record. On a full sweep those are the same set; on a filtered run the old
// behaviour printed carried-over numbers from an earlier run in the same table
// as fresh ones, with nothing marking which was which.
writeRecord(OUT, out, { filtered: only.length > 0 });
