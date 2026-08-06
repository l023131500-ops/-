// authpill-inset-formula.mjs — למדוד תיקון של --more30-auth-inset לפני שהוא נפרס.
//
// שלושת הכלים בשרשרת: `authbutton-overlap` שואל "האם פקד כלשהו מכוסה",
// `authpill-diagnose` עונה "מיהו האב שצריך לזוז ומה יש לו כרגע", והכלי הזה
// עונה על השאלה השלישית — "האם הביטוי שכתבתי באמת מפנה את הפקד, בכל הרוחבים".
//
// למה זה לא בדיקה על העתק מקומי: הרוחב שהכדור תופס נקבע בזמן ריצה — הוא
// תלוי בשם המשתמש המחובר, בפונט שנטען בפועל ובערך ש-auth-button.js מפרסם
// ל---more30-auth-inset. העתק מקומי לא יודע אף אחד מהשלושה. לכן העמוד נטען
// מהייצור, ובדפדפן מוחלפת **הצהרה אחת בלבד**; כל השאר — ה-HTML, הכדור,
// גיליונות הסגנון והמדידה — הוא הייצור עצמו.
//
// נולד כ-_briut-formula-check.mjs חד-פעמי ב-06/08. הפעם השנייה שנדרש אותו
// דבר (smachot) היא הסיבה להוציא אותו לכלי, לפי הכלל שכבר נכתב כאן: כשאותה
// מדידה חוזרת, היא עוברת למקום משותף ולא מועתקת.
//
// Usage:
//   node authpill-inset-formula.mjs <route> <container-selector> <property> <value>
// Example:
//   node authpill-inset-formula.mjs /smachot .topbar padding-inline-end \
//     "max(22px, var(--more30-auth-inset, 124px))"

import { chromium } from 'playwright-core';
import { settle } from './lib/settle.mjs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const ORIGIN = 'https://more30.com';
const WIDTHS = [390, 834, 1100, 1280, 1440];

const [route, selector, prop, value] = process.argv.slice(2);
if (!route || !selector || !prop || !value) {
  console.error('usage: authpill-inset-formula.mjs <route> <selector> <property> <value>');
  process.exit(2);
}

// מודד את הפקד המכוסה בפועל — לא "הקישור השמאלי ביותר", שהוא ניחוש שנכון
// באתר אחד ולא באחר. מקור האמת הוא elementFromPoint על החיתוך עם הכדור,
// בדיוק כמו ב-authbutton-overlap, כדי ששתי הבדיקות יסכימו על אותה הגדרה.
const PROBE = (args) => {
  const host = document.querySelector('more30-auth');
  const pill = host && host.shadowRoot && host.shadowRoot.querySelector('.pill');
  const p = pill && pill.getBoundingClientRect();
  if (!p) return { error: 'no pill' };

  const covered = () => {
    const out = [];
    for (const el of document.querySelectorAll('a[href], button, [role="button"], input, select, summary')) {
      if (host.contains(el)) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.top > 80) continue;
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none' || s.opacity === '0') continue;
      const ox = Math.min(p.right, r.right) - Math.max(p.left, r.left);
      const oy = Math.min(p.bottom, r.bottom) - Math.max(p.top, r.top);
      if (ox <= 0 || oy <= 0) continue;
      const top = document.elementFromPoint(Math.max(p.left, r.left) + ox / 2, Math.max(p.top, r.top) + oy / 2);
      if (top !== host) continue; // חיתוך שהאתר מצויר מעליו אינו פקד חסום
      out.push({
        label: (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30),
        overlap: `${Math.round(ox)}x${Math.round(oy)}`,
      });
    }
    return out;
  };

  const box = document.querySelector(args.selector);
  if (!box) return { error: `selector not found: ${args.selector}` };

  const before = covered();
  const beforePad = getComputedStyle(box)[args.prop];
  box.style.setProperty(args.prop, args.value);
  const afterPad = getComputedStyle(box)[args.prop];
  const after = covered();

  return {
    inset: getComputedStyle(document.documentElement).getPropertyValue('--more30-auth-inset').trim(),
    pill: `${Math.round(p.left)}..${Math.round(p.right)}`,
    beforePad,
    afterPad,
    before,
    after,
  };
};

const browser = await chromium.launch({ executablePath: EXE, headless: true });
let bad = 0;
for (const width of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width, height: width <= 500 ? 844 : 900 },
    locale: 'he-IL', isMobile: width <= 500, hasTouch: width <= 500,
  });
  const page = await ctx.newPage();
  await page.goto(ORIGIN + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle(page, { minChars: 40 });
  const r = await page.evaluate(PROBE, { selector, prop, value });
  if (r.error) {
    bad++;
    console.log(`@${width}  ERROR ${r.error}`);
  } else {
    const ok = r.after.length === 0;
    if (!ok) bad++;
    const fmt = (list) => (list.length ? list.map((h) => `"${h.label}" ${h.overlap}`).join(' ; ') : 'none');
    console.log(
      `@${width}  inset=${r.inset}  pill ${r.pill}\n` +
      `   live   ${prop}=${String(r.beforePad).padEnd(8)} covered: ${fmt(r.before)}\n` +
      `   fixed  ${prop}=${String(r.afterPad).padEnd(8)} covered: ${fmt(r.after)}   ${ok ? 'CLEAR' : 'STILL COVERED'}`
    );
    // צילום של הכותרת אחרי ההחלפה — כדי שגם הפריסה תיראה, לא רק המספרים.
    await page.screenshot({
      path: `QA/platform/authpill-0806/formula-${route.replace(/\W+/g, '') || 'home'}-${width}.png`,
      clip: { x: 0, y: 0, width, height: 90 },
    });
  }
  await ctx.close();
}
console.log(`\n${WIDTHS.length - bad}/${WIDTHS.length} widths clear with ${prop}: ${value}`);
await browser.close();
process.exit(bad ? 1 : 0);
