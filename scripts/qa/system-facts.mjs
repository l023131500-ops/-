/**
 * One measured fact sheet per system, from the probes that already ran.
 *
 * The run docs ask for QA/<name>.md per system. Writing those from memory
 * would produce thirteen plausible files, which is worse than none — the point
 * of a QA record is that someone can trust it later. This collects what was
 * actually measured, so the documents quote numbers instead of impressions.
 *
 *   node scripts/qa/system-facts.mjs            # all live routes
 *   node scripts/qa/system-facts.mjs tamlul imud
 *
 * Writes QA/platform/_facts.json and prints a summary.
 */
import { chromium } from 'playwright-core';
import { settle } from './lib/settle.mjs';
import { writeRecord } from './lib/records.mjs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';

/**
 * Every path-mounted system, not just the thirteen that had no QA record.
 *
 * The reason it grew: core.projects still marked briut, smachot, mthbram, galil,
 * crm and gesher as `live=false` while all six were serving 200 with real
 * content, and marked others visible without anything having checked lately.
 * Deciding what appears on the home page from stale flags is how a dead system
 * gets advertised and a working one stays hidden — so the flags get set from
 * this file, and this file gets set from a browser.
 */
const ROUTES = {
  torah: '/torah', tamlul: '/tamlul', modaot: '/modaot', imud: '/imud',
  briut: '/briut', bkalot: '/bkalot', smel: '/smel', smachot: '/smachot',
  egod: '/egod', chatzor: '/chatzor/', chizukim: '/chizukim/',
  orech: '/orech', zchuyot: '/zchuyot', mthbram: '/mthbram', galil: '/galil',
  studio: '/studio', mechiron: '/mechiron', kupot: '/kupot',
  nadlan: '/nadlan/', crm: '/crm', gesher: '/gesher', kesef: '/kesef',
  kiosk: '/kiosk/', tivuch: '/tivuch', portal: '/',
};

const only = process.argv.slice(2);
const targets = Object.entries(ROUTES).filter(([k]) => !only.length || only.includes(k));

const browser = await chromium.launch({ executablePath: EXE, headless: true });

/**
 * Start from whatever was measured before, so a filtered run updates one system
 * instead of replacing the file with one system.
 *
 * It did the latter: `node system-facts.mjs mthbram` left _facts.json holding a
 * single entry, and write-records.mjs — which trusts this file — promptly
 * deleted the other twelve QA records. A filtered re-measure after a fix is the
 * normal way to use this script, so the destructive shape was on the happy path.
 */
const OUT = 'QA/platform/_facts.json';
// The merge itself now lives in lib/records.mjs — see the note there for why it
// had to be shared rather than copied a third time.
const out = {};

for (const [key, route] of targets) {
  const facts = { route, url: ORIGIN + route };
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, locale: 'he-IL', isMobile: true, hasTouch: true,
  });
  const errors = [];
  const bad = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
  page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url().slice(0, 90)}`); });

  try {
    const res = await page.goto(facts.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    facts.status = res?.status() ?? null;

    /**
     * ⚠️ Was a flat 4.5 second sleep, and these readings get written to the QA
     * records — so a page still loading was persisted as that system's facts.
     * kupot reads 908 characters at two seconds and 3,164 at five; at 4.5 the
     * answer depends on the network that minute. Now waits for the page to stop
     * changing. See lib/settle.mjs for why three samples and a floor.
     */
    await settle(page, { minChars: 60 });

    Object.assign(facts, await page.evaluate(() => {
      const txt = document.body.innerText.replace(/\s+/g, ' ').trim();
      const small = [];
      const unnamed = [];

      /**
       * The accessible name, the way a screen reader computes it — not the way
       * that is easy to write.
       *
       * The first version of this used `aria-label || textContent`, which is
       * fine for a link or a button and simply wrong for a form field: an
       * <input> has no text content, ever. It reported eleven "unnamed
       * controls" across smel, mechiron, crm and gesher that were all the same
       * shadcn <Input> sitting under a correct <label for>. Filing those as
       * accessibility defects would have sent me editing four healthy pages.
       */
      const nameOf = (el) => {
        const by = el.getAttribute('aria-labelledby');
        if (by) {
          const t = by.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim();
          if (t) return t;
        }
        const al = el.getAttribute('aria-label');
        if (al?.trim()) return al.trim();

        if (el.id) {
          const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
          if (lab?.textContent?.trim()) return lab.textContent.trim();
        }
        const wrap = el.closest('label');
        if (wrap?.textContent?.trim()) return wrap.textContent.trim();

        // A placeholder is a weak name — it vanishes on typing — but it is a
        // name, so it is not a "no name at all" defect. Tracked separately.
        const ph = el.getAttribute('placeholder');
        if (ph?.trim()) return `placeholder:${ph.trim()}`;

        // Text content names a link, a button or a summary. It does NOT name a
        // form control, and for <select> it is actively misleading: the text
        // content of a select is every option concatenated, so bkalot's two
        // unlabelled filters read as "all sources rights fund government ngo"
        // and passed. Form controls get their name from a label or nothing.
        const isFormControl = ['SELECT', 'TEXTAREA', 'INPUT'].includes(el.tagName);
        if (!isFormControl) {
          const t = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
          if (t) return t;
        }
        if (el.getAttribute('title')?.trim()) return el.getAttribute('title').trim();

        // `value` names a push button and nothing else. Using it as a general
        // fallback hid every unlabelled <select> on the platform, because a
        // select's value is whichever option happens to be chosen — bkalot's
        // two filters and mthbram's three read as "named" while a screen reader
        // announces them as nothing at all.
        if (el.tagName === 'INPUT' && ['submit', 'button', 'reset'].includes(el.type)) {
          return el.value?.trim() ?? '';
        }
        return '';
      };

      /**
       * WCAG 2.5.8 exempts a target that sits inline in a sentence — a footer
       * link inherits its line-height and cannot be enlarged without breaking
       * the paragraph. Flagging those produced two "violations" that are not
       * violations, so inline links are excluded and counted separately.
       */
      const isInlineText = (el) => {
        if (el.tagName !== 'A') return false;
        const d = getComputedStyle(el).display;
        if (d !== 'inline' && d !== 'inline-block') return false;
        const p = el.parentElement;
        if (!p) return false;
        const own = (el.textContent ?? '').trim();
        const around = (p.textContent ?? '').trim();
        return around.length > own.length;
      };

      /**
       * Visually hidden until focused — a skip link, not an undersized target.
       *
       * chatzor's one "violation" was its "skip to content" link at 1×1px,
       * which is the correct implementation of that pattern: clipped away for
       * pointer users, revealed at full size when a keyboard focuses it.
       * WCAG 2.5.8 governs targets that are visually presented; a clipped 1×1
       * affordance is not one, and enlarging it would put a stray link in the
       * corner of every page. Fifth instrument gap that read as a defect.
       */
      const isVisuallyHidden = (el, r, s) => {
        if (r.width <= 4 && r.height <= 4) return true;
        const clip = s.clipPath && s.clipPath !== 'none';
        const legacyClip = s.clip && s.clip !== 'auto';
        return clip || legacyClip;
      };

      let inlineExempt = 0;
      let hiddenExempt = 0;
      for (const el of document.querySelectorAll('a[href],button,[role="button"],input,select,summary')) {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        if (!r.width || !r.height || s.visibility === 'hidden' || s.display === 'none') continue;
        if (el.type === 'hidden') continue;
        if (isVisuallyHidden(el, r, s)) { hiddenExempt++; continue; }

        const name = nameOf(el);
        if (r.width < 24 || r.height < 24) {
          if (isInlineText(el)) inlineExempt++;
          else small.push({ tag: el.tagName.toLowerCase(), name: name.slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) });
        }
        if (!name) unnamed.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 40) });
      }
      return {
        textLen: txt.length,
        links: document.querySelectorAll('a[href]').length,
        forms: document.querySelectorAll('form').length,
        inputs: document.querySelectorAll('input,select,textarea').length,
        images: document.querySelectorAll('img').length,
        imagesNoAlt: [...document.querySelectorAll('img')].filter((i) => !i.getAttribute('alt')).length,
        h1: document.querySelectorAll('h1').length,
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        baseHref: document.querySelector('base')?.getAttribute('href') ?? null,
        hasAuthButton: !!document.querySelector('more30-auth'),
        // הכפתור והקרדיט נמדדים בנפרד כי הם יכולים להיעלם משתי סיבות שונות:
        // אי-טעינה של הקובץ המשותף, או מסגרת שמרנדרת מחדש ומוחקת מה שהוזרק
        // (React #418 מחק את שניהם ב-/nadlan). מדד אחד היה מסתיר את השני.
        hasCredit: !!document.querySelector('.more30-credit'),
        creditInFooter: !!document.querySelector('footer .more30-credit'),
        darkVar: getComputedStyle(document.documentElement).getPropertyValue('--more30-auth-inset').trim(),
        smallTargets: small.slice(0, 6),
        unnamedControls: unnamed.slice(0, 6),
        inlineExemptTargets: inlineExempt,
        hiddenExemptTargets: hiddenExempt,
        placeholderOnlyNames: [...document.querySelectorAll('input,select,textarea')].filter(
          (el) => nameOf(el).startsWith('placeholder:'),
        ).length,
      };
    }));

    // Does the dark theme actually respond?
    //
    // Two mechanisms are in use across the platform and testing only one
    // produces confident false negatives: the Tailwind sites key off `.dark` on
    // <html>, while smachot keys off `[data-theme="dark"]` and ships its own
    // toggle. Asserting the class alone reported smachot as having no dark mode
    // at all, and it has a complete one — 40-odd rules and a sun/moon button.
    //
    // A site that is dark to begin with (mthbram: rgb(9,26,32) by brand) is
    // recorded as `already-dark`, not as a failure. "Doesn't flip" and "has no
    // dark theme" are different facts and the QA record should not merge them.
    const swatch = () =>
      page.evaluate(
        () =>
          getComputedStyle(document.body).backgroundColor +
          '|' +
          getComputedStyle(document.body).backgroundImage.slice(0, 60),
      );

    const before = await swatch();
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(700);
    const viaClass = await swatch();

    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.dataset.theme = 'dark';
    });
    await page.waitForTimeout(700);
    const viaAttr = await swatch();

    // Third mechanism: follow the operating system and nothing else.
    //
    // orech was reported as the one system on the platform with no dark mode.
    // It has a complete one — a full token palette under
    // `@media (prefers-color-scheme: dark)`, with a comment explaining why the
    // warm paper hue is kept rather than going neutral grey. It simply has no
    // class and no attribute to toggle, so testing only those two found
    // nothing. Fourth time an instrument gap has masqueraded as a defect here.
    await page.evaluate(() => { delete document.documentElement.dataset.theme; });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(700);
    const viaMedia = await swatch();
    await page.emulateMedia({ colorScheme: 'light' });

    facts.darkMechanism =
      viaClass !== before ? 'class'
      : viaAttr !== before ? 'data-theme'
      : viaMedia !== before ? 'prefers-color-scheme'
      : null;
    facts.darkResponds = facts.darkMechanism !== null;

    // luminance of the default background, to tell brand-dark from broken
    const lum = Number(/rgb\((\d+)/.exec(before)?.[1] ?? NaN);
    if (!facts.darkResponds && Number.isFinite(lum) && lum < 60) {
      facts.darkMechanism = 'already-dark';
    }
    facts.defaultBg = before.split('|')[0];
  } catch (e) {
    facts.error = String(e.message).slice(0, 120);
  }
  facts.consoleErrors = [...new Set(errors)].slice(0, 5);
  facts.badResponses = [...new Set(bad)].slice(0, 5);
  await page.close();

  out[key] = facts;
  console.log(
    `${key.padEnd(10)} ${String(facts.status).padEnd(4)} text=${String(facts.textLen ?? '?').padEnd(6)}` +
      ` links=${String(facts.links ?? '?').padEnd(4)} forms=${facts.forms ?? '?'}` +
      ` dark=${String(facts.darkMechanism ?? 'NONE').padEnd(12)} auth=${facts.hasAuthButton ? 'yes' : 'NO '}` +
      ` credit=${facts.hasCredit ? 'yes' : 'NO '}` +
      ` small=${facts.smallTargets?.length ?? '?'} unnamed=${facts.unnamedControls?.length ?? '?'}` +
      ` ph=${facts.placeholderOnlyNames ?? '?'}` +
      ` err=${facts.consoleErrors.length}`,
  );
}

await browser.close();
writeRecord(OUT, out, { filtered: only.length > 0 });
