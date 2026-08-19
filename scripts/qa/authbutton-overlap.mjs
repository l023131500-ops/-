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
// ⚠️ רוחבי המדידה אינם קישוט. עד 06/08 נמדדו כאן **שני** רוחבים בלבד, 390
// ו-1440, והם דווקא שני הרוחבים שבהם התקלה הזו לא מופיעה: במובייל הנווט
// מתקפל לתפריט, וברוחב גדול מיכל הנווט חסום ב-`max-width` ולכן הפקד האחרון
// שלו יושב פנימה מהקצה. החפיפה חיה **בין** שני אלה — בדיוק סביב רוחב המיכל.
// /kiosk נמדד "clear" בשניהם, ובפועל הכדור כיסה 72×32 פיקסל מ"כניסת לקוחות"
// ברוחב 1100 ו-22×32 ברוחב 1280. מכאן הרוחבים הבינוניים, ואין להוריד אותם
// בלי מדידה שמצדיקה את זה.
//
// Usage:  node authbutton-overlap.mjs [routeKey ...]

import { chromium } from 'playwright-core';
import { settle } from './lib/settle.mjs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';
const ONLY = process.argv.slice(2);

const WIDTHS = [390, 834, 1100, 1280, 1440];

const ROUTES = [
  ['kesef', '/kesef'], ['kiosk', '/kiosk/'],
  ['home', '/'], ['torah', '/torah'], ['tamlul', '/tamlul'], ['modaot', '/modaot'],
  ['imud', '/imud'], ['briut', '/briut'], ['bkalot', '/bkalot'], ['smel', '/smel'],
  ['smachot', '/smachot'], ['egod', '/egod'], ['chatzor', '/chatzor'], ['chatzor-app', '/chatzor/'],
  ['chizukim', '/chizukim'], ['chizukim-app', '/chizukim/'], ['orech', '/orech'],
  ['mthbram', '/mthbram'], ['zchuyot', '/zchuyot'], ['galil', '/galil'], ['studio', '/studio'],
  ['design', '/design'],
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

let covered = 0;
for (const [key, p] of targets) {
  const clear = [];
  const bad = [];
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width, height: width <= 500 ? 844 : 900 },
      locale: 'he-IL', isMobile: width <= 500, hasTouch: width <= 500,
    });
    const page = await ctx.newPage();
    try {
      await page.goto(ORIGIN + p, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await settle(page, { minChars: 40 });
      const r = await page.evaluate(PROBE);
      if (!r.pill) bad.push(`${width}: no pill`);
      else if (!r.hit.length) clear.push(width);
      // רק חפיפה שהכדור **מצויר מעליה** היא פקד שאי אפשר ללחוץ עליו. חיתוך
      // מלבנים שבו האתר עצמו למעלה הוא חפיפה בקואורדינטות בלבד.
      else if (r.hit.every((h) => h.coveredBy !== 'auth-pill')) clear.push(width);
      else bad.push(`${width}: OVERLAP ${r.hit.filter((h) => h.coveredBy === 'auth-pill').map((h) => `${h.tag}"${h.label}" ${h.overlap}`).join(' ; ')}`);
    } catch (e) {
      bad.push(`${width}: ERR ${String(e.message).slice(0, 40)}`);
    }
    await ctx.close();
  }
  if (bad.length) covered++;
  console.log(`${key.padEnd(13)} ${bad.length ? bad.join('  |  ') : `clear @ ${clear.join(',')}`}`);
}
console.log(`\n${targets.length - covered}/${targets.length} routes clear at ${WIDTHS.join('/')}`);
await browser.close();
