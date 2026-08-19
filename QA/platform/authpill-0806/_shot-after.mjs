// צילומי "אחרי" לארבעת הנתיבים שתוקנו, ברוחב שבו החפיפה נמדדה.
//
// הצילום אינו הראיה — הראיה היא elementFromPoint על מרכז הפקד שהכדור כיסה.
// לכן כל צילום נשמר יחד עם התשובה לשאלה "מי באמת מקבל את הלחיצה כאן".
import { chromium } from 'playwright-core';
import { settle } from '../../../scripts/qa/lib/settle.mjs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';

// [key, url, width, טקסט הפקד שנחסם לפני התיקון]
const CASES = [
  ['briut', 'https://more30.com/briut', 834, 'איך עוברים'],
  ['briut', 'https://more30.com/briut', 1100, 'איך עוברים'],
  ['egod', 'https://more30.com/egod', 834, 'הצטרף כמגיד שיעור'],
  ['mthbram', 'https://more30.com/mthbram', 834, 'הצטרפות כרב'],
  ['smachot', 'https://more30.com/smachot', 1280, 'פותח ע״י עולם הסטארטאפים'],
];

const b = await chromium.launch({ executablePath: EXE, headless: true });
for (const [key, url, width, label] of CASES) {
  const ctx = await b.newContext({ viewport: { width, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle(p, { minChars: 40 });

  const r = await p.evaluate((wanted) => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const el = [...document.querySelectorAll('a,button')].find((n) => norm(n.textContent).includes(wanted));
    if (!el) return { found: false };
    const box = el.getBoundingClientRect();
    // ב-egod וב-mthbram התיקון הוא שברוחב הזה הפקד עבר לתפריט המקופל, ולכן
    // אין לו מלבן כלל. בלי הענף הזה elementFromPoint(0,0) מחזיר איזשהו div
    // שמכיל את הקישור המוסתר, ו-`reaches` יוצא true בלי שום משמעות.
    if (!box.width && !box.height) return { found: true, collapsed: true };
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    // הכדור הוא web component עם Shadow DOM — elementFromPoint מחזיר את
    // המארח שלו, ולכן די בשם התג כדי לזהות שהלחיצה נבלעה.
    const hitTag = hit ? hit.tagName.toLowerCase() : null;
    return {
      found: true,
      rect: `y ${Math.round(box.top)}..${Math.round(box.bottom)} x ${Math.round(box.left)}..${Math.round(box.right)}`,
      hitTag,
      reachesControl: !!hit && (hit === el || el.contains(hit) || hit.contains(el)),
    };
  }, label);

  const verdict = !r.found
    ? 'CONTROL NOT FOUND'
    : r.collapsed
      ? 'moved into the collapsed menu at this width — no rect to cover'
      : `${r.rect}  click-lands-on:${r.hitTag}  reaches:${r.reachesControl}`;
  console.log(`${key} @${width}  "${label}"  ${verdict}`);
  await p.screenshot({ path: `QA/platform/authpill-0806/${key}-${width}-after.png`, clip: { x: 0, y: 0, width, height: 140 } });
  await ctx.close();
}
await b.close();
