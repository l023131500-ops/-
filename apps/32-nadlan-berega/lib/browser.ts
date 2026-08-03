// ==== דפדפן ללא ממשק — להפקת PDF ====
//
// למה דפדפן ולא ספריית PDF: הדוח הוא עברית עם RTL, טבלאות וגרפים. ספריות PDF
// דורשות עיצוב ידני של כיווניות ושל שבירת שורות, ומייצרות מסמך שנראה אחרת
// מהדוח. דפדפן מרנדר בדיוק את מה שהלקוח רואה, כולל גיליון ההדפסה שכבר קיים.
//
// ⚠️ שני סביבות, שני מקורות לדפדפן:
//   בענן   — @sparticuz/chromium (בינארי שמתאים ל-lambda)
//   מקומי  — Chrome/Edge שמותקן במחשב. הבינארי של sparticuz הוא ללינוקס
//            בלבד ולא ירוץ ב-Windows, ולכן פיתוח מקומי היה נשבר בלעדיו.
//
// ⚠️⚠️ תלות סמויה בפרודקשן: משתנה הסביבה `AWS_LAMBDA_JS_RUNTIME=nodejs20.x`
// מוגדר בפרויקט `nadlan-more30` ב-Vercel, ובלעדיו מסלולי ה-PDF וה-deck
// מחזירים 500 עם `libnss3.so: cannot open shared object file`.
//
// הסיבה: `@sparticuz/chromium@131` מחליט אילו ספריות משותפות לחלץ לפי זיהוי
// גרסת ה-runtime, ושתי הבדיקות שלו אינן מכסות את Node 24 —
// `isRunningInAwsLambda()` מוציא רק 20.x ו-22.x, ו-`isRunningInAwsLambdaNode20()`
// **דורש** 20.x או 22.x. הפרויקט רץ על Node 24, ולכן שתיהן מחזירות false,
// אף חבילת ספריות אינה מחולצת, ו-`LD_LIBRARY_PATH` כלל אינו נקבע. הבינארי
// של Chromium כן מגיע — הוא פשוט לא מוצא את הספריות שהוא צריך.
//
// החבילה בודקת גם את `AWS_LAMBDA_JS_RUNTIME` (מסלול Netlify), ולכן הגדרתו
// מפעילה את מסלול AL2023 — הנכון ל-Node 20 ומעלה — בלי להוריד את גרסת ה-Node
// של כל האפליקציה. אם משדרגים את החבילה, לבדוק אם הזיהוי תוקן ואפשר להסיר.

import type { Browser } from 'puppeteer-core';

const LOCAL_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean) as string[];

function isServerless(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export async function launchBrowser(): Promise<Browser> {
  const puppeteer = await import('puppeteer-core');

  if (isServerless()) {
    const chromium = (await import('@sparticuz/chromium')).default;
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1200, height: 1600 },
      executablePath: await chromium.executablePath(),
      headless: true,
    }) as unknown as Promise<Browser>;
  }

  const fs = await import('node:fs');
  const local = LOCAL_CANDIDATES.find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });
  if (!local) {
    throw new Error(
      'לא נמצא דפדפן מקומי להפקת PDF. אפשר להגדיר PUPPETEER_EXECUTABLE_PATH לנתיב Chrome.',
    );
  }

  return puppeteer.launch({
    executablePath: local,
    defaultViewport: { width: 1200, height: 1600 },
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  }) as unknown as Promise<Browser>;
}
