// אימות "אחרי הפריסה" לפקד היחיד שנשאר חסום ב-/smachot.
//
// ההבדל מ-_shot-after.mjs: שם נבדק קישור הקרדיט, שהוא טקסט. כאן נבדק
// **כפתור החלפת מצב התצוגה** — פקד אמיתי שנמדד מכוסה 38×36 בכל חמשת
// הרוחבים, כלומר לא היה ניתן ללחיצה בשום מסך. הראיה אינה הצילום אלא
// elementFromPoint על מרכז הכפתור.
import { chromium } from 'playwright-core';
import { settle } from '../../../scripts/qa/lib/settle.mjs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const WIDTHS = [390, 834, 1100, 1280, 1440];

const b = await chromium.launch({ executablePath: EXE, headless: true });
for (const width of WIDTHS) {
  const ctx = await b.newContext({ viewport: { width, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage();
  await p.goto('https://more30.com/smachot', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle(p, { minChars: 40 });

  const r = await p.evaluate(() => {
    const el = document.querySelector('button[aria-label="החלף מצב תצוגה"], .theme-toggle');
    if (!el) return { found: false };
    const box = el.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    return {
      found: true,
      rect: `y ${Math.round(box.top)}..${Math.round(box.bottom)} x ${Math.round(box.left)}..${Math.round(box.right)}`,
      // הכדור הוא web component עם Shadow DOM — elementFromPoint מחזיר את
      // המארח שלו, ולכן שם התג מספיק כדי לזהות שהלחיצה נבלעה.
      hitTag: hit ? hit.tagName.toLowerCase() : null,
      reaches: !!hit && (hit === el || el.contains(hit) || hit.contains(el)),
    };
  });

  console.log(
    `smachot @${width}  "החלף מצב תצוגה"  ${r.found ? `${r.rect}  click-lands-on:${r.hitTag}  reaches:${r.reaches}` : 'CONTROL NOT FOUND'}`,
  );
  await p.screenshot({
    path: `QA/platform/authpill-0806/smachot-toggle-${width}-after.png`,
    clip: { x: 0, y: 0, width, height: 140 },
  });
  await ctx.close();
}
await b.close();
