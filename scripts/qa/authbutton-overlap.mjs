// authbutton-overlap.mjs — האם כפתור הכניסה המשותף מסתיר פקד בנווט.
//
// למה זה קיים: `auth-button.js` מוזרק בכל מערכת כ-`position: fixed` עם
// `inset-inline-end: 16px; inset-block-start: 12px`. ב-RTL זו הפינה
// השמאלית העליונה — בדיוק המקום שבו נווט עם `justify-between` מניח את הפקד
// האחרון שלו. במערכת 22 נמדד שהוא כיסה את כפתור התפריט במובייל לגמרי,
// כלומר **התפריט לא היה ניתן ללחיצה**. זו אינה בעיה של מערכת אחת: היא
// נובעת מהגיאומטריה של הרכיב המשותף, ולכן היא נבדקת כאן על כל הנתיבים.
//
// הבדיקה גיאומטרית ולא ויזואלית: חיתוך מלבנים בין הכדור לבין כל פקד
// אינטראקטיבי גלוי ב-80 הפיקסלים העליונים.
//
// Usage:  node authbutton-overlap.mjs [routeKey ...]

import { chromium } from 'playwright-core';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';
const ONLY = process.argv.slice(2);

const ROUTES = [
  ['kesef', '/kesef'], ['kiosk', '/kiosk/'],
  ['home', '/'], ['torah', '/torah'], ['tamlul', '/tamlul'], ['modaot', '/modaot'],
  ['imud', '/imud'], ['briut', '/briut'], ['bkalot', '/bkalot'], ['smel', '/smel'],
  ['smachot', '/smachot'], ['egod', '/egod'], ['chatzor', '/chatzor'], ['chatzor-app', '/chatzor/'],
  ['chizukim', '/chizukim'], ['chizukim-app', '/chizukim/'], ['orech', '/orech'],
  ['mthbram', '/mthbram'], ['zchuyot', '/zchuyot'], ['galil', '/galil'], ['studio', '/studio'],
  ['mechiron', '/mechiron'], ['kupot', '/kupot'], ['crm', '/crm'], ['gesher', '/gesher'],
  ['nadlan', '/nadlan'],
];

const PROBE = () => {
  const host = document.querySelector('more30-auth');
  const pill = host && host.shadowRoot && host.shadowRoot.querySelector('.pill');
  if (!pill) return { pill: null };
  const p = pill.getBoundingClientRect();
  const hit = [];
  for (const el of document.querySelectorAll('a[href], button, [role="button"], input, select, summary')) {
    if (host.contains(el)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.top > 80) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || s.opacity === '0') continue;
    const ox = Math.min(p.right, r.right) - Math.max(p.left, r.left);
    const oy = Math.min(p.bottom, r.bottom) - Math.max(p.top, r.top);
    if (ox > 0 && oy > 0) {
      // האם הכדור הוא באמת מה שמצויר למעלה בנקודת החפיפה
      const cx = Math.max(p.left, r.left) + ox / 2;
      const cy = Math.max(p.top, r.top) + oy / 2;
      const top = document.elementFromPoint(cx, cy);
      hit.push({
        tag: el.tagName.toLowerCase(),
        label: (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 26),
        rect: `${Math.round(r.left)}..${Math.round(r.right)}`,
        overlap: `${Math.round(ox)}x${Math.round(oy)}`,
        coveredBy: top === host ? 'auth-pill' : (top ? top.tagName.toLowerCase() : '?'),
      });
    }
  }
  return { pill: `${Math.round(p.left)}..${Math.round(p.right)}`, hit };
};

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const targets = ONLY.length ? ROUTES.filter(([k]) => ONLY.includes(k)) : ROUTES;

for (const [key, p] of targets) {
  const line = [];
  for (const width of [390, 1440]) {
    const ctx = await browser.newContext({
      viewport: { width, height: width <= 500 ? 844 : 900 },
      locale: 'he-IL', isMobile: width <= 500, hasTouch: width <= 500,
    });
    const page = await ctx.newPage();
    try {
      await page.goto(ORIGIN + p, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(4500);
      const r = await page.evaluate(PROBE);
      if (!r.pill) line.push(`${width}: no pill`);
      else if (!r.hit.length) line.push(`${width}: clear`);
      else line.push(`${width}: OVERLAP ${r.hit.map((h) => `${h.tag}"${h.label}" ${h.overlap} covered-by:${h.coveredBy}`).join(' ; ')}`);
    } catch (e) {
      line.push(`${width}: ERR ${String(e.message).slice(0, 40)}`);
    }
    await ctx.close();
  }
  console.log(`${key.padEnd(13)} ${line.join('  |  ')}`);
}
await browser.close();
