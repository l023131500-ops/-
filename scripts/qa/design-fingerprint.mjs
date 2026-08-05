/**
 * How much do the systems actually look alike?
 *
 * more30-priority.md §6 states the complaint plainly: "כל האתרים נראים אותו
 * סגנון של AI" — every site looks like the same AI made it. That is an
 * impression, and rebuilding 24 designs from an impression is how you spend a
 * week and change nothing that mattered. So measure it first.
 *
 * The fingerprint is deliberately made of the things that carry a house style
 * and would survive a superficial recolour:
 *
 *   · display + body font families           — the single loudest signal
 *   · the page's real background and ink     — not the token names, the pixels
 *   · the accent actually used on a primary button
 *   · corner radius and shadow of the primary surface
 *   · heading scale (h1 size / body size)
 *   · hero shape: is the first screen a centred slab with two buttons?
 *
 * Two systems sharing a font stack is a coincidence. Twelve sharing font,
 * radius, shadow and hero shape is a template, and that is what §6 is about.
 *
 *   node scripts/qa/design-fingerprint.mjs
 *   node scripts/qa/design-fingerprint.mjs /torah /kupot
 *
 * Writes QA/platform/_design.json and prints the clusters, biggest first.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

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

const only = process.argv.slice(2).map((s) => s.replace(/^\//, '').replace(/\/$/, ''));
const targets = Object.entries(ROUTES).filter(([k]) => !only.length || only.includes(k));

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const out = {};

for (const [key, route] of targets) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' });
  try {
    await page.goto('https://more30.com' + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(4500);

    out[key] = await page.evaluate(() => {
      const first = (v) => String(v || '').split(',')[0].replace(/["']/g, '').trim();
      const body = getComputedStyle(document.body);

      // The heading that actually opens the page, whatever its tag.
      const head =
        document.querySelector('h1') ||
        document.querySelector('h2') ||
        document.querySelector('header *');

      // A primary button: the loudest coloured control above the fold. Text
      // links are excluded — they inherit, so they say nothing about style.
      const candidates = [...document.querySelectorAll('a,button')].filter((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        const bg = s.backgroundColor;
        return (
          r.top < 900 && r.width > 60 && r.height > 28 &&
          bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent'
        );
      });
      const btn = candidates[0] ? getComputedStyle(candidates[0]) : null;

      // The primary surface: the first card-like box. Radius and shadow are
      // where template-ness hides once colours have been changed.
      const surf = [...document.querySelectorAll('div,article,section')].find((el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return (
          parseFloat(s.borderRadius) >= 6 && r.width > 180 && r.height > 90 &&
          s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)'
        );
      });
      const ss = surf ? getComputedStyle(surf) : null;

      const bodySize = parseFloat(body.fontSize) || 16;
      const headSize = head ? parseFloat(getComputedStyle(head).fontSize) : 0;

      return {
        displayFont: head ? first(getComputedStyle(head).fontFamily) : null,
        bodyFont: first(body.fontFamily),
        bg: body.backgroundColor,
        ink: body.color,
        accent: btn ? btn.backgroundColor : null,
        btnRadius: btn ? btn.borderRadius.split(' ')[0] : null,
        surfaceRadius: ss ? ss.borderRadius.split(' ')[0] : null,
        surfaceShadow: ss ? (ss.boxShadow === 'none' ? 'none' : 'yes') : null,
        headingScale: headSize ? Math.round((headSize / bodySize) * 10) / 10 : null,
        // Hero shape: centred text with two or more buttons stacked under it is
        // the shape that reads as "generated landing page".
        centredHero: head ? getComputedStyle(head).textAlign === 'center' : false,
        heroButtons: candidates.filter((el) => el.getBoundingClientRect().top < 700).length,

        // ── the component vocabulary, which is where the real sameness hides
        //
        // The first run of this script found 24 distinct signatures across 25
        // systems: different fonts, different palettes, radii from 12 to 24px.
        // By those measures they are not a template at all, which means "they
        // all look like the same AI" is not about colour or type — and
        // recolouring them would have changed nothing.
        //
        // What does repeat is the kit: the same shadcn token names, the same
        // lucide icon set, the same rounded-2xl-plus-backdrop-blur surface. A
        // house style you can recognise before you read a word, no matter which
        // palette is on top of it.
        shadcnTokens: ['bg-card', 'text-muted-foreground', 'border-border',
                       'bg-background', 'text-foreground']
          .filter((t) => document.body.innerHTML.includes(t)).length,
        lucideIcons: document.querySelectorAll('svg.lucide, svg[class*="lucide"]').length,
        roundedXl: (() => {
          const cls = [...document.querySelectorAll('*')].map((e) => String(e.className)).join(' ');
          return ['rounded-xl', 'rounded-2xl', 'rounded-3xl']
            .reduce((n, t) => n + (cls.split(t).length - 1), 0);
        })(),
        backdropBlur: [...document.querySelectorAll('*')]
          .filter((e) => String(e.className).includes('backdrop-blur')).length,

        // ── the sharpest signal of the lot, added after fixing galil
        //
        // The kit counts above said galil was 4/4 before the work and 4/4
        // after, because it still uses shadcn tokens, lucide and rounded
        // corners — and it should. What actually changed was that eight
        // service cards stopped wearing eight unrelated saturated gradients
        // (emerald, sky, amber, yellow, slate, indigo, rose, teal — every one
        // from Tailwind's default palette, none from the site's own tokens).
        //
        // That is the thing that reads as generated: a rainbow of chips that
        // carry no meaning, on a site whose brand is a single Galilee teal. So
        // count it directly. One distinct chip colour is a design decision;
        // eight is a template nobody revisited.
        iconChipColours: (() => {
          const chips = [...document.querySelectorAll('div,span,a')].filter((e) => {
            const r = e.getBoundingClientRect();
            return r.width >= 32 && r.width <= 60 && r.height >= 32 && r.height <= 60 &&
                   e.querySelector('svg');
          });
          return new Set(chips.map((e) => getComputedStyle(e).backgroundImage !== 'none'
            ? getComputedStyle(e).backgroundImage
            : getComputedStyle(e).backgroundColor)).size;
        })(),
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
        : `${String(f.displayFont).padEnd(16)} body=${String(f.bodyFont).padEnd(14)}` +
          ` r=${String(f.surfaceRadius).padEnd(6)} accent=${String(f.accent).padEnd(20)}` +
          ` scale=${f.headingScale}`),
  );
}

await browser.close();

// ── clustering: which systems are literally interchangeable?
const sig = (f) => [f.displayFont, f.bodyFont, f.surfaceRadius, f.btnRadius, f.surfaceShadow].join('|');
const groups = {};
for (const [k, f] of Object.entries(out)) {
  if (f.error) continue;
  (groups[sig(f)] ??= []).push(k);
}
const ranked = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);

console.log('\n=== systems sharing a font + radius + shadow signature ===');
for (const [s, members] of ranked) {
  const [disp, body, r] = s.split('|');
  console.log(
    `  ${String(members.length).padStart(2)}  ${disp} / ${body}, radius ${r}` +
      `\n      ${members.join(', ')}`,
  );
}

const good = Object.values(out).filter((f) => !f.error);
const fonts = new Set(good.map((f) => f.displayFont));
console.log(
  `\n${Object.keys(out).length} measured · ${ranked.length} distinct signatures · ` +
    `${fonts.size} distinct display fonts`,
);

// The kit, counted separately from the styling — see the note in the evaluate
// block. This is the number that answers §6, not the signature count above.
const pct = (n) => `${n}/${good.length}`;
console.log('\n=== the shared kit ===');
console.log(`  shadcn token names (3+):  ${pct(good.filter((f) => f.shadcnTokens >= 3).length)}`);
console.log(`  lucide icons:             ${pct(good.filter((f) => f.lucideIcons > 0).length)}`);
console.log(`  rounded-xl/2xl/3xl:       ${pct(good.filter((f) => f.roundedXl > 0).length)}`);
console.log(`  backdrop-blur surfaces:   ${pct(good.filter((f) => f.backdropBlur > 0).length)}`);

// Four or more distinct icon-chip colours means a rainbow nobody chose.
const rainbow = Object.entries(out)
  .filter(([, f]) => !f.error && f.iconChipColours >= 4)
  .sort((a, b) => b[1].iconChipColours - a[1].iconChipColours);
console.log(`\n=== icon-chip rainbows (4+ distinct colours) — ${rainbow.length} systems ===`);
for (const [k, f] of rainbow) console.log(`  ${String(f.iconChipColours).padStart(2)}  ${k}`);

fs.mkdirSync('QA/platform', { recursive: true });
fs.writeFileSync('QA/platform/_design.json', JSON.stringify(out, null, 2), 'utf8');
console.log('-> QA/platform/_design.json');
