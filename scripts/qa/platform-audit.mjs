// platform-audit.mjs — one measurement pass over every live route on more30.com.
//
// Why this exists: STATUS.md says the same three items block all 33 systems at
// once (uniform login, QA evidence, design standard). Measuring them one system
// at a time is 33 rounds; measuring them all in one pass is one round, and the
// output is the raw material for every QA/<name>.md file.
//
// Nothing here trusts a page's own claims — every check reads the rendered DOM.
//
// Pitfalls already paid for elsewhere in this project, encoded here:
//  - the playwright npm version must match the installed browser -> executablePath.
//  - NetFree blocks *.vercel.app; every request must go through more30.com.
//  - Hebrew comparisons happen in Node, never through a PowerShell pipe.
//
// Usage:  node platform-audit.mjs <outDir> [routeKey ...]

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';
const OUT = process.argv[2] || 'C:\\Users\\USER\\Downloads\\more30\\QA\\platform';
const ONLY = process.argv.slice(3);

// Every route the portal serves. `key` is the QA file name, `sys` the registry number.
const ROUTES = [
  { key: 'home',      sys: '33', path: '/',          name: 'אתר התדמית' },
  { key: 'login',     sys: '--', path: '/login',     name: 'כניסה אחידה' },
  { key: 'me',        sys: '--', path: '/me',        name: 'אזור אישי' },
  { key: 'subscribe', sys: '--', path: '/subscribe', name: 'מסלולים' },
  { key: 'torah',     sys: '01', path: '/torah',     name: 'פלטפורמת איגוד השיעורים' },
  { key: 'tamlul',    sys: '02', path: '/tamlul',    name: 'תמלול איגוד' },
  { key: 'modaot',    sys: '03', path: '/modaot',    name: 'מודעות איגוד' },
  { key: 'imud',      sys: '04', path: '/imud',      name: 'עימוד תורני' },
  { key: 'briut',     sys: '06', path: '/briut',     name: 'לידים קופות חולים' },
  { key: 'bkalot',    sys: '10', path: '/bkalot',    name: 'מימוש זכויות בקלות' },
  { key: 'smel',      sys: '12', path: '/smel',      name: 'נדל"ן Smel' },
  { key: 'smachot',   sys: '14', path: '/smachot',   name: 'שמחות פלוס' },
  { key: 'egod',      sys: '15', path: '/egod',      name: 'איגוד' },
  { key: 'chatzor',   sys: '16', path: '/chatzor',   name: 'חצור קונקט — תדמית' },
  { key: 'chatzor-app', sys: '16', path: '/chatzor/', name: 'חצור קונקט — המערכת' },
  { key: 'chizukim',  sys: '17', path: '/chizukim',  name: 'תמלול חיזוקים — תדמית' },
  { key: 'chizukim-app', sys: '17', path: '/chizukim/', name: 'תמלול חיזוקים — המערכת' },
  { key: 'orech',     sys: '18', path: '/orech',     name: 'עורך תורני' },
  { key: 'mthbram',   sys: '21', path: '/mthbram',   name: 'Mthbram' },
  { key: 'zchuyot',   sys: '22', path: '/zchuyot',   name: 'מימוש זכויות' },
  { key: 'galil',     sys: '24', path: '/galil',     name: 'גליל קונקט' },
  { key: 'studio',    sys: '26', path: '/studio',    name: 'סטודיו מודעות' },
  { key: 'mechiron',  sys: '27', path: '/mechiron',  name: 'השוואת מחירים' },
  { key: 'kupot',     sys: '28', path: '/kupot',     name: 'השוואת קופות חולים' },
  { key: 'crm',       sys: '30', path: '/crm',       name: 'CRM זכויות' },
  { key: 'gesher',    sys: '31', path: '/gesher',    name: 'גשר עברית CRM' },
  { key: 'nadlan',    sys: '32', path: '/nadlan',    name: 'נדל"ן ברגע' },
  { key: 'kesef',     sys: '34', path: '/kesef',     name: 'כסף — שקיפות תקציבית' },
  { key: 'kiosk',     sys: '35', path: '/kiosk/',    name: 'KioskFleet' },
  { key: 'tivuch',    sys: '36', path: '/tivuch',    name: 'נדל"ן פרו — ניהול למתווכים' },
];

fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- in-page probe
// Runs inside the browser. Returns only serialisable data.
const PROBE = () => {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
  };
  const text = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();

  // accessible name, good enough for an audit: label / aria / title / text
  const accName = (el) => {
    const aria = el.getAttribute('aria-label');
    if (aria && aria.trim()) return aria.trim();
    const by = el.getAttribute('aria-labelledby');
    if (by) {
      const t = by.split(/\s+/).map((id) => document.getElementById(id)).filter(Boolean).map(text).join(' ');
      if (t) return t;
    }
    if (el.id) {
      const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lab && text(lab)) return text(lab);
    }
    const wrap = el.closest('label');
    if (wrap && text(wrap)) return text(wrap);
    const ttl = el.getAttribute('title');
    if (ttl && ttl.trim()) return ttl.trim();
    const ph = el.getAttribute('placeholder');
    if (ph && ph.trim()) return ph.trim();
    if (el.tagName === 'IMG') return (el.getAttribute('alt') || '').trim();
    return text(el);
  };

  const interactive = [...document.querySelectorAll('a[href], button, input, select, textarea, [role="button"], [role="link"], [role="tab"], summary')].filter(vis);

  const small = [];
  const srOnly = [];
  const active = document.activeElement;
  for (const el of interactive) {
    const r = el.getBoundingClientRect();
    // an inline link inside a paragraph is measured by its line box, which is
    // what a finger actually gets; height below 24px is the failure mode.
    const h = Math.round(r.height), w = Math.round(r.width);
    if (h >= 24 && w >= 24) continue;

    // ⚠️ A "skip to content" link is 1x1 on purpose — `sr-only` with
    // `focus:not-sr-only`, invisible to the eye and reachable by keyboard.
    // Counting it as an undersized touch target was a false positive: it is
    // not a touch target at all. But it must still be usable once focused, so
    // rather than skip it silently, focus it and measure again.
    if (w <= 1 && h <= 1) {
      let fw = w, fh = h;
      try {
        el.focus({ preventScroll: true });
        const fr = el.getBoundingClientRect();
        fw = Math.round(fr.width); fh = Math.round(fr.height);
      } catch { /* not focusable; falls through as a real failure below */ }
      srOnly.push({ tag: el.tagName.toLowerCase(), name: accName(el).slice(0, 60), focusW: fw, focusH: fh, ok: fw >= 24 && fh >= 24 });
      if (fw >= 24 && fh >= 24) continue; // reveals itself properly — not a defect
    }

    small.push({ tag: el.tagName.toLowerCase(), w, h, name: accName(el).slice(0, 60) });
  }
  try { if (active && active.focus) active.focus({ preventScroll: true }); } catch {}

  const unnamed = [];
  for (const el of interactive) {
    if (el.tagName === 'INPUT' && ['hidden'].includes(el.type)) continue;
    if (!accName(el)) {
      unnamed.push({ tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || '', cls: (el.className || '').toString().slice(0, 40) });
    }
  }

  const imgsNoAlt = [...document.querySelectorAll('img')].filter(vis).filter((i) => i.getAttribute('alt') === null)
    .map((i) => (i.currentSrc || i.src || '').slice(-70));

  const de = document.documentElement;
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  const bodyFg = getComputedStyle(document.body).color;

  // ⚠️ ‎backgroundColor‎ של ‎body‎ לבדו הוא מדד שקרי, ופסל כאן דף שיש לו מצב
  // כהה אמיתי: ‎/login‎ צובע את הרקע ב-‎radial-gradient‎, ולכן ה-color שלו
  // שקוף בשני המצבים והשוואה ביניהם תמיד יוצאת "זהה". מה שהעין רואה הוא
  // הצבע האטום הראשון בשרשרת ‎body → html‎, ביחד עם תמונת הרקע.
  const parseRgb = (s) => {
    const m = String(s).match(/-?[\d.]+/g);
    if (!m) return null;
    const [r, g, b, a] = m.map(Number);
    return { r, g, b, a: a === undefined ? 1 : a };
  };
  let effBg = 'transparent';
  for (const el of [document.body, de]) {
    const c = parseRgb(getComputedStyle(el).backgroundColor);
    if (c && c.a > 0) { effBg = getComputedStyle(el).backgroundColor; break; }
  }
  const bgImages = [document.body, de]
    .map((el) => getComputedStyle(el).backgroundImage)
    .filter((v) => v && v !== 'none')
    .join(' | ');
  // בהירות נתפסת (sRGB relative luminance). דף שכבר כהה מלכתחילה עומד
  // בדרישה של §3 גם אם אינו משתנה בין המצבים — זו בדיוק הכוונה שם.
  const lum = (() => {
    const c = parseRgb(effBg);
    if (!c) return null;
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return +(0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)).toFixed(4);
  })();
  const colorScheme = getComputedStyle(de).colorScheme || '';

  return {
    title: document.title,
    lang: de.getAttribute('lang') || '',
    dir: de.getAttribute('dir') || getComputedStyle(de).direction || '',
    metaDescription: (document.querySelector('meta[name="description"]')?.content || '').trim(),
    metaViewport: (document.querySelector('meta[name="viewport"]')?.content || '').trim(),
    metaRobots: (document.querySelector('meta[name="robots"]')?.content || '').trim(),
    canonical: (document.querySelector('link[rel="canonical"]')?.href || ''),
    ogUrl: (document.querySelector('meta[property="og:url"]')?.content || ''),
    h1Count: document.querySelectorAll('h1').length,
    h1: text(document.querySelector('h1') || document.createElement('i')).slice(0, 120),
    headings: [...document.querySelectorAll('h1,h2,h3')].filter(vis).slice(0, 12).map((h) => `${h.tagName}: ${text(h).slice(0, 60)}`),
    textLen: (document.body.innerText || '').length,
    interactiveCount: interactive.length,
    smallTargets: small,
    srOnlyTargets: srOnly,
    unnamedControls: unnamed,
    imgsNoAlt,
    // the shared login button injects this script and renders #more30-auth-btn
    hasAuthScript: [...document.querySelectorAll('script[src]')].some((s) => s.src.includes('auth-button')),
    authBtnText: text(document.querySelector('#more30-auth-btn, [data-more30-auth]') || document.createElement('i')).slice(0, 40),
    bodyBg,
    bodyFg,
    effBg,
    bgImages,
    bgLuminance: lum,
    colorScheme,
    // vercel.app must never leak into the browser's view of the page
    vercelLeak: [...document.querySelectorAll('a[href]')].map((a) => a.href).filter((h) => h.includes('vercel.app')).slice(0, 5),
    scrollW: de.scrollWidth,
    clientW: de.clientWidth,
  };
};

// ---------------------------------------------------------------- runner
const browser = await chromium.launch({ executablePath: EXE, headless: true });

// ⚠️ ריצה חלקית **מתמזגת** לתוך התוצאות הקיימות ואינה מוחקת אותן. הגרסה
// הראשונה פתחה אובייקט ריק בכל ריצה, ולכן בדיקה חוזרת של ארבעה נתיבים אחרי
// תיקון מחקה את המדידה של עשרים ושלושה האחרים — בלי אזהרה, ובקובץ שכל דוחות
// ה-QA נכתבים ממנו. אין סיבה שריצה ממוקדת תעלה בכל מה שכבר נמדד.
const OUTFILE = path.join(OUT, '_results.json');
const prior = fs.existsSync(OUTFILE) ? JSON.parse(fs.readFileSync(OUTFILE, 'utf8')) : null;
const results = {
  startedAt: prior?.startedAt || new Date().toISOString(),
  origin: ORIGIN,
  routes: prior?.routes || {},
};
const targets = ONLY.length ? ROUTES.filter((r) => ONLY.includes(r.key)) : ROUTES;
if (ONLY.length && prior) console.log(`merging ${targets.length} route(s) into ${Object.keys(results.routes).length} already measured`);

for (const route of targets) {
  const url = ORIGIN + route.path;
  const rec = { ...route, url };
  console.log(`\n=== ${route.key}  ${url}`);

  for (const mode of ['desktop', 'mobile', 'dark']) {
    const viewport = mode === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
    const ctx = await browser.newContext({
      viewport,
      locale: 'he-IL',
      colorScheme: mode === 'dark' ? 'dark' : 'light',
      isMobile: mode === 'mobile',
      hasTouch: mode === 'mobile',
      deviceScaleFactor: mode === 'mobile' ? 2 : 1,
      userAgent: mode === 'mobile'
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        : undefined,
    });
    const page = await ctx.newPage();
    const consoleErrors = [];
    const failedRequests = [];
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 200)));
    page.on('pageerror', (e) => consoleErrors.push(String(e).slice(0, 200)));
    page.on('requestfailed', (r) => failedRequests.push(`${r.method()} ${r.url().slice(0, 90)} — ${r.failure()?.errorText || ''}`));

    const t0 = Date.now();
    let status = 0;
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      status = resp ? resp.status() : 0;
      // client-rendered apps need a beat; 3s is enough for every route measured so far
      await page.waitForTimeout(3500);
    } catch (e) {
      rec[mode] = { error: String(e).slice(0, 200) };
      await ctx.close();
      continue;
    }
    const loadMs = Date.now() - t0;

    let probe;
    try {
      probe = await page.evaluate(PROBE);
    } catch (e) {
      probe = { probeError: String(e).slice(0, 200) };
    }

    const shotName = `${route.key}-${mode}.png`;
    try {
      await page.screenshot({ path: path.join(OUT, shotName), fullPage: mode !== 'mobile' });
    } catch { /* a very tall page can refuse fullPage; the record still stands */ }

    rec[mode] = { status, loadMs, consoleErrors, failedRequests, screenshot: shotName, ...probe };
    console.log(`  ${mode}: ${status} ${loadMs}ms · text ${probe.textLen ?? '?'} · small ${probe.smallTargets?.length ?? '?'} · unnamed ${probe.unnamedControls?.length ?? '?'} · errs ${consoleErrors.length}`);
    await ctx.close();
  }

  // DESIGN_STANDARD §3 asks one question: can a reader who arrives from the
  // dark portal at 2am get a white page in the face? Two ways to answer no —
  //   (a) the page repaints under prefers-color-scheme: dark, or
  //   (b) it was already dark to begin with, and says so via color-scheme.
  // Only (a) was checked before, which failed pages that are dark by design
  // and pages that paint their background with a gradient instead of a colour.
  if (rec.desktop?.effBg && rec.dark?.effBg) {
    const l = rec.desktop;
    const d = rec.dark;
    const responds =
      l.effBg !== d.effBg || l.bodyFg !== d.bodyFg || l.bgImages !== d.bgImages;
    const alreadyDark =
      l.bgLuminance !== null && l.bgLuminance < 0.06 &&
      /dark/.test(l.colorScheme || '');
    rec.darkModeImplemented = responds || alreadyDark;
    rec.darkModeBasis = responds ? 'responds' : alreadyDark ? 'dark-by-design' : 'none';
  }
  if (rec.mobile) {
    rec.horizontalOverflow = (rec.mobile.scrollW || 0) > (rec.mobile.clientW || 0) + 1;
  }

  results.routes[route.key] = rec;
  fs.writeFileSync(path.join(OUT, '_results.json'), JSON.stringify(results, null, 2), 'utf8');
}

await browser.close();
results.finishedAt = new Date().toISOString();
fs.writeFileSync(path.join(OUT, '_results.json'), JSON.stringify(results, null, 2), 'utf8');
console.log(`\nDone. ${Object.keys(results.routes).length} routes -> ${OUT}`);
