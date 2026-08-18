/**
 * סיבוב תמונה לא יפיל יותר את ההעלאה.
 *
 * הבאג: `bakeTransform` ב-app/htr/page.tsx צורב את הסיבוב לבייטים ומקודד
 * מחדש כ-PNG. PNG הוא ללא-אובדן, ולכן צילום טלפון רגיל של עמוד יוצא ממנו
 * בעשרות מגה-בייט, והשרת (app/api/htr/upload/route.ts) חוסם ב-15MB. התוצאה:
 * אותה תמונה בדיוק עלתה בהצלחה בלי סיבוב (יציאה מוקדמת ב-rotation===0)
 * ונכשלה ב-413 אחרי סיבוב — כלומר בדיוק מה שהממשק מבקש מהמשתמש לעשות
 * ("סובבו עד שהשורות ישרות") הוא מה ששבר לו את הפעולה.
 *
 * הבדיקה רצה מול העמוד האמיתי שנבנה, לא מול העתק של הלוגיקה. היא מזריקה
 * קובץ לשדה הקובץ האמיתי, לוחצת על כפתור הסיבוב האמיתי ושולחת את הטופס
 * האמיתי, ומיירטת את /orech/api/htr/upload כדי לקרוא מה נשלח בפועל. אין צורך
 * ב-Supabase — הבדיקה נעצרת בגבול הרשת.
 *
 *   node scripts/qa/htr-rotate-upload-size.mjs [baseUrl]
 *
 * ברירת מחדל: http://127.0.0.1:3000/orech
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const EXE = 'C:\\Users\\USER\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe';
const BASE = (process.argv[2] || 'http://127.0.0.1:3000/orech').replace(/\/$/, '');
const CAP = 15 * 1024 * 1024;

const checks = [];
const ok = (name, pass, detail) => {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, locale: 'he-IL' });
page.on('pageerror', (e) => console.log('  [pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('  [console] ' + m.text().slice(0, 200)); });

// מה שנשלח בפועל אל שרת ההעלאה. מיירטים ומחזירים 201 מזויף כדי שהבדיקה
// תמדוד את הלקוח בלבד, בלי Supabase ובלי לכתוב שורה אמיתית לשום מקום.
let sent = null;
await page.route('**/api/htr/upload', async (route) => {
  const req = route.request();
  const buf = req.postDataBuffer();
  const raw = buf ? buf.toString('latin1') : '';
  const m = raw.match(/filename="([^"]*)"[\r\n]+Content-Type:\s*([^\r\n]+)/i);
  sent = {
    bytes: buf ? buf.length : 0,
    filename: m ? m[1] : null,
    contentType: m ? m[2].trim() : null,
  };
  await route.fulfill({
    status: 201,
    contentType: 'application/json',
    body: JSON.stringify({ job: { id: '00000000-0000-0000-0000-000000000000' } }),
  });
});
// העיבוד אינו חלק מהנבדק כאן — 503 הוא המסלול שהעמוד כבר מטפל בו בחן.
await page.route('**/api/htr/process', (route) =>
  route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'not connected' }) }),
);
await page.route('**/api/htr/jobs**', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ jobs: [] }) }),
);

await page.goto(BASE + '/htr', { waitUntil: 'domcontentloaded', timeout: 60000 });
// Playwright יודע לצלם דף ריק שאינו ריק עד שמשנים מידה פעם אחת.
await page.setViewportSize({ width: 1281, height: 1000 });
await page.waitForSelector('input[type="file"]', { timeout: 30000 });
ok('עמוד ה-HTR נטען ושדה הקובץ קיים', true);

/**
 * מזריק קובץ אמיתי לשדה הקובץ.
 *  noisy=true  -> פיקסלים אקראיים, שאינם ניתנים לדחיסה: PNG ענק, JPEG קטן.
 *                 זו הצורה של צילום עמוד אמיתי, ולא של ריבוע בצבע אחד.
 *  noisy=false -> תמונה קטנה ורגילה, שה-PNG שלה נכנס בתקרה.
 */
async function loadImage(size, noisy) {
  await page.evaluate(async ({ size, noisy }) => {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = noisy ? (Math.random() * 256) | 0 : 240;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92));
    const file = new File([blob], 'page.jpg', { type: 'image/jpeg' });
    const dt = new DataTransfer();
    dt.items.add(file);
    const input = document.querySelector('input[type="file"]');
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, { size, noisy });
  await page.waitForSelector('.upload-preview img', { timeout: 20000 });
}

async function rotateAndSubmit() {
  sent = null;
  await page.getByRole('button', { name: /סיבוב ימינה/ }).click();
  await page.getByRole('button', { name: /העלה והרץ זיהוי/ }).click();
  // הטקסט נקרא בתוך ה-waitForFunction ולא בשאילתה נפרדת אחריו: אחרי שליחה
  // מוצלחת הטופס מתאפס, ו-locator שנקרא רגע אחר כך תופס את הרכיב באמצע
  // הרינדור מחדש ומחכה לאלמנט שכבר הוחלף.
  const handle = await page.waitForFunction(
    () => {
      const el = document.querySelector('.upload-actions .status-match, .upload-actions .status-missing');
      return el ? el.textContent.trim() : null;
    },
    // ‏240 ולא 120: קידוד PNG של קנבס 3600² בכרומיום חסר-ראש לוקח עשרות
    // שניות ותלוי בעומס המכונה — ריצה אחת כאן נחתכה ב-120 ועברה ב-120 הבא.
    null, { timeout: 240000 },
  );
  return await handle.jsonValue();
}

// ── 1. מקרה הרגרסיה: תמונה קטנה חייבת להישאר PNG, כמו לפני התיקון.
await loadImage(300, false);
let msg = await rotateAndSubmit();
ok('תמונה קטנה אחרי סיבוב עדיין נשלחת', sent !== null, msg);
ok('ונשלחת כ-PNG — ההעדפה המקורית לא ויתרה', sent?.contentType === 'image/png',
   `contentType=${sent?.contentType} filename=${sent?.filename}`);
ok('ונכנסת בתקרה', (sent?.bytes || 0) <= CAP, `${((sent?.bytes || 0) / 1048576).toFixed(2)}MB`);
const smallCase = { ...sent, msg };

// ── 2. הבאג עצמו: תמונה שה-PNG שלה חורג מהתקרה.
// 3600² של רעש הוא מקרה קצה מכוון ולא "תמונה ממוצעת": רעש אינו נדחס, ולכן
// הוא מייצר את התנאי בוודאות ובמהירות. צילום טלפון אמיתי של עמוד (12MP)
// יושב בדיוק על הגבול הזה — לפעמים מעליו, לפעמים מתחתיו — וזו בדיוק הסיבה
// שהבאג נראה אקראי למי שנתקל בו.
await loadImage(3600, true);
// כמה היה ה-PNG שקל לפני התיקון — המספר שגרם ל-413.
const pngBytes = await page.evaluate(async () => {
  const input = document.querySelector('input[type="file"]');
  const bitmap = await createImageBitmap(input.files[0]);
  const c = document.createElement('canvas');
  c.width = bitmap.height; c.height = bitmap.width; // סיבוב 90°
  const ctx = c.getContext('2d');
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  const b = await new Promise((r) => c.toBlob(r, 'image/png'));
  return b.size;
});
ok('שוחזר תנאי הבאג: ה-PNG של התמונה המסובבת חורג מ-15MB',
   pngBytes > CAP, `${(pngBytes / 1048576).toFixed(1)}MB`);

msg = await rotateAndSubmit();
ok('התמונה הגדולה אחרי סיבוב נשלחת ואינה נופלת', sent !== null, msg);
ok('נשלחה מתחת לתקרה שהשרת אוכף', (sent?.bytes || 0) <= CAP,
   `${((sent?.bytes || 0) / 1048576).toFixed(2)}MB מתוך 15MB`);
ok('הנפילה היא ל-JPEG באיכות גבוהה, ולא כישלון', sent?.contentType === 'image/jpeg',
   `contentType=${sent?.contentType} filename=${sent?.filename}`);
ok('אין הודעת שגיאה למשתמש', !/גדול מדי|נכשל/.test(msg), msg);

fs.mkdirSync('QA/platform/htr-rotate-size-0818', { recursive: true });
await page.screenshot({ path: 'QA/platform/htr-rotate-size-0818/after-large-rotate.png', fullPage: false });

await browser.close();

const failed = checks.filter((c) => !c.pass);
fs.writeFileSync(
  'QA/platform/htr-rotate-size-0818/_results.json',
  JSON.stringify({ base: BASE, cap: CAP, pngBytesBeforeFallback: pngBytes, smallCase, largeCase: sent, checks }, null, 2),
  'utf8',
);
console.log(`\n${checks.length - failed.length}/${checks.length} עברו`);
process.exit(failed.length ? 1 : 0);
