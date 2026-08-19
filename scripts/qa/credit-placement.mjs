// credit-placement.mjs — האם שורת הקרדיט של §7 נוחתת איפה שהתכוונו.
//
// brand-audit.mjs שואל רק **האם** הקרדיט קיים ב-DOM, ועונה 25/25. זו שאלה
// אחרת מ"איפה הוא". auth-button.js מוסיף אותו כ-`document.body.appendChild`,
// והנחת היסוד שם היא ש-body הוא מיכל בלוקי — כלומר שילד אחרון נופל לתחתית
// העמוד. באתר שבו ה-body עצמו הוא `display:flex` (מעטפת אפליקציה: סרגל צד +
// אזור תוכן) ההנחה נשברת: הקרדיט הופך לפריט flex שלישי בשורה ונוחת בקצה
// העליון. ב-/smachot נמדד ב-06/08 שהוא יושב ב-y 8..47 ומכסה את כדור הכניסה
// בכל חמשת רוחבי הבדיקה — כלומר גם הקרדיט במקום הלא נכון וגם הכדור חסום.
//
// הבדיקה: display של ה-body, המלבן של הקרדיט, והאם הוא בשליש העליון של
// המסמך במקום בתחתיתו.
//
// Usage:  node credit-placement.mjs [routeKey ...]

import { chromium } from 'playwright-core';
import { settle } from './lib/settle.mjs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';
const ONLY = process.argv.slice(2);

const ROUTES = [
  ['kesef', '/kesef'], ['kiosk', '/kiosk/'],
  ['torah', '/torah'], ['tamlul', '/tamlul'], ['modaot', '/modaot'],
  ['imud', '/imud'], ['briut', '/briut'], ['bkalot', '/bkalot'], ['smel', '/smel'],
  ['smachot', '/smachot'], ['egod', '/egod'], ['chatzor', '/chatzor'], ['chatzor-app', '/chatzor/'],
  ['chizukim', '/chizukim'], ['chizukim-app', '/chizukim/'], ['orech', '/orech'],
  ['mthbram', '/mthbram'], ['zchuyot', '/zchuyot'], ['galil', '/galil'], ['studio', '/studio'],
  ['mechiron', '/mechiron'], ['kupot', '/kupot'], ['crm', '/crm'], ['gesher', '/gesher'],
  ['nadlan', '/nadlan'], ['tivuch', '/tivuch'],
];

// ⚠️ הקריטריון נבדק פעם אחת והיה שגוי, ולכן הוא כתוב כאן במפורש. הגרסה
// הראשונה שאלה "האם הקרדיט בשליש התחתון של גובה המסמך", ו-/orech נכשל בה:
// זה עמוד קצר שגובה המסמך שלו נצמד לגובה החלון (900), התוכן מסתיים ב-557
// והקרדיט יושב מיד אחריו — כלומר בדיוק במקום הנכון, ובכל זאת ב-62% מהגובה.
// השאלה האמיתית אינה חלק מהגובה אלא סדר: האם משהו בזרימה הרגילה מצויר
// **מתחת** לקרדיט. ב-/smachot התשובה כן, ובגדול — כל מעטפת האפליקציה.
const PROBE = () => {
  const link = document.querySelector('.more30-credit');
  const bodyDisplay = getComputedStyle(document.body).display;
  if (!link) return { bodyDisplay, credit: null };
  const box = link.closest('[data-more30-credit]') || link;
  const cs = getComputedStyle(box);
  const r = box.getBoundingClientRect();
  const top = r.top + window.scrollY;

  let below = null;
  for (const el of document.body.children) {
    if (el === box || el.contains(box)) continue;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.position === 'fixed' || s.position === 'absolute') continue;
    const er = el.getBoundingClientRect();
    if (!er.width || !er.height) continue;
    const bottom = er.bottom + window.scrollY;
    if (bottom > top + 1 && (!below || bottom > below.bottom)) {
      below = { tag: el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''), bottom: Math.round(bottom) };
    }
  }

  return {
    bodyDisplay,
    position: cs.position,
    credit: {
      x: `${Math.round(r.left)}..${Math.round(r.right)}`,
      docTop: Math.round(top),
      docH: Math.round(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)),
      below,
      // תקין = יוצא מהזרימה ונצמד לחלון, או שאין אחריו שום דבר בזרימה.
      atBottom: cs.position === 'fixed' ? true : !below,
    },
  };
};

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const targets = ONLY.length ? ROUTES.filter(([k]) => ONLY.includes(k)) : ROUTES;
let bad = 0;

for (const [key, p] of targets) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' });
  const page = await ctx.newPage();
  let line;
  try {
    await page.goto(ORIGIN + p, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await settle(page, { minChars: 40 });
    const r = await page.evaluate(PROBE);
    if (!r.credit) { line = `body:${r.bodyDisplay.padEnd(6)} NO CREDIT`; bad++; }
    else if (!r.credit.atBottom) {
      line = `body:${r.bodyDisplay.padEnd(6)} MISPLACED y=${r.credit.docTop} — ${r.credit.below.tag} renders below it (to ${r.credit.below.bottom})`;
      bad++;
    } else line = `body:${r.bodyDisplay.padEnd(6)} ok  y=${r.credit.docTop} of ${r.credit.docH} (${r.position})`;
  } catch (e) {
    line = `ERR ${String(e.message).slice(0, 50)}`;
    bad++;
  }
  console.log(`${key.padEnd(13)} ${line}`);
  await ctx.close();
}

console.log(`\n${targets.length - bad}/${targets.length} routes place the credit at the foot of the page`);
await browser.close();
if (bad) process.exitCode = 1;
