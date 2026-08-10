/**
 * How many icons on a page are DECISIONS, and how many are just records?
 *
 * QA/platform/DESIGN_SAMENESS.md ends with an instruction to whoever continues
 * §6, and this script is that instruction executed:
 *
 *   "מי שממשיך צריך למדוד קודם כמה מהאייקונים בעמוד הם לכל-רשומה ולא
 *    לכל-החלטה, ולהתחיל ממערכת שבה הריבוי נובע מהתבנית עצמה."
 *
 * The work order for §6 was ranked by design-fingerprint.mjs's raw `lucideIcons`
 * count, which put `galil` first at 104. Reading the page showed 70 of those sit
 * in the synagogue directory: MapPin for the address, Clock for the hours, Phone
 * for the phone — one icon per data field, repeated across dozens of records. In
 * the source each appears ONCE. Removing them removes information from a
 * directory, not noise from a template, so the number that led the list was
 * measuring the size of a dataset.
 *
 * The number that answers §6 is the one this script produces: how many distinct
 * icon *placements* a designer chose. An icon rendered 40 times inside a repeated
 * card is one decision. Forty different icons scattered across a landing page is
 * forty — and that is what reads as generated.
 *
 * The grouping is structural, not visual. For every SVG we build a signature from
 * its own name plus its ancestor chain (tag + classes, five levels up). Instances
 * of one component in a list share the chain exactly and collapse to one entry;
 * a hand-placed icon in a hero has a chain nothing else shares and stands alone.
 *
 *   node scripts/qa/icon-decisions.mjs             # the 9 full-kit systems
 *   node scripts/qa/icon-decisions.mjs /galil      # one
 *   node scripts/qa/icon-decisions.mjs --all       # every route
 *
 * Writes QA/platform/_icon-decisions.json and prints the corrected work order.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { settle } from './lib/settle.mjs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';

const ROUTES = {
  torah: '/torah', tamlul: '/tamlul', modaot: '/modaot', imud: '/imud',
  briut: '/briut', bkalot: '/bkalot', smel: '/smel', smachot: '/smachot',
  egod: '/egod', chatzor: '/chatzor/', chizukim: '/chizukim/',
  orech: '/orech', zchuyot: '/zchuyot', mthbram: '/mthbram', galil: '/galil',
  studio: '/studio', mechiron: '/mechiron', kupot: '/kupot',
  nadlan: '/nadlan/', crm: '/crm', gesher: '/gesher', kesef: '/kesef',
  kiosk: '/kiosk/', tivuch: '/tivuch', portal: '/',
};

// The 9 systems DESIGN_SAMENESS.md measured at 4/4 on the shared kit. They are
// the whole of the §6 work list; the other 16 are either partial or already
// carry an identity of their own, and §6 says explicitly not to touch those.
const FULL_KIT = ['imud', 'smel', 'egod', 'chatzor', 'chizukim', 'zchuyot',
                  'mthbram', 'galil', 'gesher'];

const args = process.argv.slice(2);
const all = args.includes('--all');
const only = args.filter((a) => !a.startsWith('--')).map((s) => s.replace(/^\//, '').replace(/\/$/, ''));
const targets = Object.entries(ROUTES).filter(([k]) =>
  only.length ? only.includes(k) : all ? true : FULL_KIT.includes(k));

/**
 * A filtered run updates the file, it does not replace it — the same trap that
 * cost _design.json 408 lines when design-fingerprint.mjs was run for one system.
 */
const OUT = 'QA/platform/_icon-decisions.json';
let out = {};
if (fs.existsSync(OUT)) {
  try { out = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { out = {}; }
}

const browser = await chromium.launch({ executablePath: EXE, headless: true });

for (const [key, route] of targets) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' });
  try {
    await page.goto('https://more30.com' + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await settle(page, { minChars: 200 });

    out[key] = await page.evaluate(() => {
      const cls = (el) => (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean);

      // lucide writes its component name into the class list (lucide-map-pin).
      // Without a name we fall back to the path data, which is stable per glyph.
      const nameOf = (svg) => {
        const named = cls(svg).find((c) => c.startsWith('lucide-'));
        if (named) return named.replace('lucide-', '');
        const d = svg.querySelector('path')?.getAttribute('d') || '';
        return d ? 'path:' + d.slice(0, 24) : 'svg';
      };

      // Five levels is enough to separate two different cards and not so deep
      // that it reaches the page shell, where everything shares ancestors.
      const chain = (svg) => {
        const parts = [];
        let el = svg.parentElement;
        for (let i = 0; i < 5 && el && el !== document.body; i++) {
          parts.push(el.tagName.toLowerCase() + '.' + cls(el).join('.'));
          el = el.parentElement;
        }
        return parts.join('>');
      };

      const svgs = [...document.querySelectorAll('svg')];
      const groups = new Map();
      for (const svg of svgs) {
        const r = svg.getBoundingClientRect();
        // Zero-size SVGs are sprite definitions and defs, not marks on a page.
        if (r.width < 4 || r.height < 4) continue;
        const k = nameOf(svg) + '@' + chain(svg);
        const g = groups.get(k) || { icon: nameOf(svg), n: 0 };
        g.n++;
        groups.set(k, g);
      }

      const list = [...groups.values()].sort((a, b) => b.n - a.n);
      const rendered = list.reduce((s, g) => s + g.n, 0);
      return {
        rendered,                                     // every icon the visitor sees
        decisions: list.length,                       // distinct placements a person chose
        perRecord: rendered - list.length,            // repetition owed to the data
        lucide: document.querySelectorAll('svg.lucide, svg[class*="lucide"]').length,
        // The heaviest repeats, so the ranking can be checked by eye rather than
        // trusted — the last two §6 findings were measurement errors.
        top: list.filter((g) => g.n > 1).slice(0, 5).map((g) => `${g.icon}×${g.n}`),
      };
    });
  } catch (e) {
    out[key] = { error: String(e.message).slice(0, 100) };
  }
  await page.close();

  const f = out[key];
  console.log(
    key.padEnd(10) +
      (f.error
        ? 'ERROR ' + f.error
        : `rendered=${String(f.rendered).padStart(3)}  decisions=${String(f.decisions).padStart(3)}` +
          `  per-record=${String(f.perRecord).padStart(3)}  ${f.top.join(' ')}`),
  );
}

await browser.close();

fs.mkdirSync('QA/platform', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');

// The corrected work order: by decisions, not by rendered icons. A system whose
// two numbers are far apart is a directory and belongs at the bottom; a system
// where they are nearly equal is carrying that many separate choices, and that
// is the one to start on.
const good = Object.entries(out).filter(([, f]) => !f.error);
console.log('\n=== §6 work order, ranked by icon DECISIONS ===');
for (const [k, f] of good.sort((a, b) => b[1].decisions - a[1].decisions)) {
  const share = f.rendered ? Math.round((f.perRecord / f.rendered) * 100) : 0;
  console.log(
    `  ${String(f.decisions).padStart(3)} decisions  ${String(f.rendered).padStart(3)} rendered` +
      `  ${String(share).padStart(3)}% from records   ${k}`,
  );
}
console.log(`-> ${OUT} (${Object.keys(out).length} systems)`);
